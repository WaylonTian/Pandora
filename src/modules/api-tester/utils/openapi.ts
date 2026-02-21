// OpenAPI/Swagger 导入解析器

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
  folders: { name: string; requests: ParsedEndpoint[] }[];
}

export function parseOpenAPI(content: string): ParsedCollection {
  const spec = JSON.parse(content);
  const isV3 = spec.openapi?.startsWith('3.');
  const title = spec.info?.title || 'Imported API';
  const basePath = isV3 ? (spec.servers?.[0]?.url || '') : (spec.basePath || '');
  
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
          path: basePath + path,
          description: operation.description,
          params: [],
          headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
          body: '',
          bodyType: 'none',
        };

        // 解析参数
        const params = operation.parameters || [];
        for (const p of params) {
          if (p.in === 'query') {
            endpoint.params.push({ key: p.name, value: p.example || '', enabled: !p.required ? false : true });
          } else if (p.in === 'header') {
            endpoint.headers.push({ key: p.name, value: p.example || '', enabled: true });
          }
        }

        // 解析 requestBody (OpenAPI 3.0)
        if (isV3 && operation.requestBody) {
          const content = operation.requestBody.content;
          if (content?.['application/json']) {
            endpoint.bodyType = 'json';
            const schema = content['application/json'].schema;
            endpoint.body = schema?.example ? JSON.stringify(schema.example, null, 2) : '{}';
          }
        }

        folders.get(tag)!.push(endpoint);
      }
    }
  }

  return {
    name: title,
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

  return { name, folders };
}
