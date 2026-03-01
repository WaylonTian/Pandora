// OpenAPI/Swagger 导入解析器
import yaml from 'js-yaml';

export interface ParsedEndpoint {
  name: string;
  method: string;
  path: string;
  description?: string;
  params: { key: string; value: string; enabled: boolean }[];
  headers: { key: string; value: string; enabled: boolean }[];
  body: string;
  bodyType: string;
}

export interface ParsedCollection {
  name: string;
  baseUrl: string;
  folders: { name: string; requests: ParsedEndpoint[] }[];
}

export function parseOpenAPI(content: string): ParsedCollection {
  let spec: any;
  try { spec = JSON.parse(content); } catch { spec = yaml.load(content) as any; }

  const isV3 = spec.openapi?.startsWith('3.');
  const title = spec.info?.title || 'Imported API';

  // Build baseUrl
  let baseUrl = '';
  if (isV3) {
    baseUrl = spec.servers?.[0]?.url || '';
  } else {
    const scheme = spec.schemes?.[0] || 'https';
    const host = spec.host || '';
    const basePath = spec.basePath || '';
    baseUrl = host ? `${scheme}://${host}${basePath}` : basePath;
  }

  // $ref resolver with circular reference protection
  function resolveRef(obj: any, seen = new Set<string>()): any {
    if (!obj || typeof obj !== 'object') return obj;
    if (obj.$ref) {
      if (seen.has(obj.$ref)) return {};
      seen.add(obj.$ref);
      const path = obj.$ref.replace('#/', '').split('/');
      let resolved = spec;
      for (const p of path) resolved = resolved?.[p];
      return resolveRef(resolved, seen);
    }
    if (Array.isArray(obj)) return obj.map(i => resolveRef(i, new Set(seen)));
    const result: any = {};
    for (const [k, v] of Object.entries(obj)) result[k] = resolveRef(v, new Set(seen));
    return result;
  }

  // Generate example from schema
  function generateExample(schema: any, depth = 0): any {
    if (!schema || depth > 5) return undefined;
    schema = resolveRef(schema);
    if (schema.example !== undefined) return schema.example;
    if (schema.type === 'object') {
      const obj: any = {};
      for (const [k, v] of Object.entries(schema.properties || {})) obj[k] = generateExample(v as any, depth + 1);
      return obj;
    }
    if (schema.type === 'array') return [generateExample(schema.items, depth + 1)];
    if (schema.type === 'string') return schema.enum?.[0] || 'string';
    if (schema.type === 'integer' || schema.type === 'number') return 0;
    if (schema.type === 'boolean') return false;
    return null;
  }

  const folders: Map<string, ParsedEndpoint[]> = new Map();
  const paths = spec.paths || {};

  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, op] of Object.entries(methods as any)) {
      if (['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(method)) {
        const operation = op as any;
        const tag = operation.tags?.[0] || 'Default';
        if (!folders.has(tag)) folders.set(tag, []);

        const endpoint: ParsedEndpoint = {
          name: operation.summary || operation.operationId || `${method.toUpperCase()} ${path}`,
          method: method.toUpperCase(),
          path: '{{baseUrl}}' + path,
          description: operation.description,
          params: [],
          headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
          body: '',
          bodyType: 'none',
        };

        const params = operation.parameters || [];
        for (const p of params) {
          const resolved = resolveRef(p);
          if (resolved.in === 'query') {
            endpoint.params.push({ key: resolved.name, value: resolved.example || '', enabled: !!resolved.required });
          } else if (resolved.in === 'header') {
            endpoint.headers.push({ key: resolved.name, value: resolved.example || '', enabled: true });
          }
        }

        // OpenAPI 3.0 requestBody
        if (isV3 && operation.requestBody) {
          const reqContent = resolveRef(operation.requestBody).content;
          if (reqContent?.['application/json']) {
            endpoint.bodyType = 'json';
            const schema = reqContent['application/json'].schema;
            const example = generateExample(schema);
            endpoint.body = example ? JSON.stringify(example, null, 2) : '{}';
          }
        }

        // Swagger 2.0 body parameter
        if (!isV3) {
          const bodyParam = params.find((p: any) => p.in === 'body');
          if (bodyParam) {
            endpoint.bodyType = 'json';
            const schema = resolveRef(bodyParam.schema);
            const example = generateExample(schema);
            endpoint.body = example ? JSON.stringify(example, null, 2) : '{}';
          }
        }

        folders.get(tag)!.push(endpoint);
      }
    }
  }

  // Normalize: strip trailing slash from baseUrl to avoid double slashes
  baseUrl = baseUrl.replace(/\/+$/, '');

  return {
    name: title,
    baseUrl,
    folders: Array.from(folders.entries()).map(([name, requests]) => ({ name, requests })),
  };
}

export function parsePostmanCollection(content: string): ParsedCollection {
  const col = JSON.parse(content);
  const name = col.info?.name || 'Imported Collection';
  
  const parseItems = (items: any[]): ParsedEndpoint[] => {
    const endpoints: ParsedEndpoint[] = [];
    for (const item of items) {
      if (item.request) {
        const req = item.request;
        endpoints.push({
          name: item.name,
          method: typeof req.method === 'string' ? req.method : 'GET',
          path: typeof req.url === 'string' ? req.url : req.url?.raw || '',
          params: (req.url?.query || []).map((q: any) => ({
            key: q.key, value: q.value || '', enabled: !q.disabled
          })),
          headers: (req.header || []).map((h: any) => ({
            key: h.key, value: h.value || '', enabled: !h.disabled
          })),
          body: req.body?.raw || '',
          bodyType: req.body?.mode === 'raw' ? 'json' : 'none',
        });
      }
    }
    return endpoints;
  };

  const folders: { name: string; requests: ParsedEndpoint[] }[] = [];
  for (const item of col.item || []) {
    if (item.item) {
      folders.push({ name: item.name, requests: parseItems(item.item) });
    } else if (item.request) {
      if (!folders.find(f => f.name === 'Requests')) {
        folders.push({ name: 'Requests', requests: [] });
      }
      folders.find(f => f.name === 'Requests')!.requests.push(...parseItems([item]));
    }
  }

  return { name, baseUrl: '', folders };
}
