// Pre-request & Test 脚本执行引擎

export interface ScriptContext {
  request: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: string;
  };
  response?: {
    status: number;
    body: string;
    headers: Record<string, string>;
    time: number;
  };
  environment: Record<string, string>;
  variables: Record<string, string>;
}

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export interface ScriptResult {
  success: boolean;
  error?: string;
  tests: TestResult[];
  logs: string[];
  updatedEnv: Record<string, string>;
  updatedVars: Record<string, string>;
  collectionVars: Record<string, string>;
  modifiedRequest?: ScriptContext['request'];
}

export function executeScript(
  script: string,
  context: ScriptContext,
  isPreRequest: boolean
): ScriptResult {
  const tests: TestResult[] = [];
  const logs: string[] = [];
  const updatedEnv = { ...context.environment };
  const updatedVars = { ...context.variables };
  const collectionVars: Record<string, string> = {};
  let modifiedRequest = isPreRequest ? { ...context.request } : undefined;

  // pm 对象 - 兼容 Postman 语法
  const pm = {
    environment: {
      get: (key: string) => updatedEnv[key] || '',
      set: (key: string, value: string) => { updatedEnv[key] = value; },
    },
    variables: {
      get: (key: string) => updatedVars[key] || context.environment[key] || '',
      set: (key: string, value: string) => { updatedVars[key] = value; },
    },
    request: isPreRequest ? {
      url: context.request.url,
      method: context.request.method,
      headers: { ...context.request.headers },
      body: context.request.body,
      setHeader: (key: string, value: string) => {
        if (modifiedRequest) modifiedRequest.headers[key] = value;
      },
      setBody: (body: string) => {
        if (modifiedRequest) modifiedRequest.body = body;
      },
    } : context.request,
    response: context.response ? {
      code: context.response.status,
      status: context.response.status,
      body: context.response.body,
      json: () => {
        try { return JSON.parse(context.response!.body); }
        catch { return null; }
      },
      headers: context.response.headers,
      responseTime: context.response.time,
      to: {
        have: {
          status: (code: number) => {
            if (context.response!.status !== code)
              throw new Error(`Expected status ${code}, got ${context.response!.status}`);
          },
          header: (key: string, value?: string) => {
            const h = context.response!.headers[key] || context.response!.headers[key.toLowerCase()];
            if (!h) throw new Error(`Header "${key}" not found`);
            if (value !== undefined && h !== value)
              throw new Error(`Expected header "${key}" to be "${value}", got "${h}"`);
          },
          jsonBody: (path: string, expected?: any) => {
            const body = JSON.parse(context.response!.body);
            const val = path.split('.').reduce((o: any, k: string) => o?.[k], body);
            if (expected !== undefined && JSON.stringify(val) !== JSON.stringify(expected))
              throw new Error(`Expected ${path} = ${JSON.stringify(expected)}, got ${JSON.stringify(val)}`);
          },
        },
      },
    } : null,
    collectionVariables: {
      get: (key: string) => collectionVars[key] || '',
      set: (key: string, value: string) => { collectionVars[key] = value; },
    },
    test: (name: string, fn: () => void) => {
      try {
        fn();
        tests.push({ name, passed: true });
      } catch (e: any) {
        tests.push({ name, passed: false, error: e.message });
      }
    },
    expect: (value: any) => ({
      to: {
        equal: (expected: any) => {
          if (value !== expected) throw new Error(`Expected ${expected}, got ${value}`);
        },
        eql: (expected: any) => {
          if (JSON.stringify(value) !== JSON.stringify(expected))
            throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(value)}`);
        },
        be: {
          a: (type: string) => {
            if (typeof value !== type) throw new Error(`Expected type ${type}, got ${typeof value}`);
          },
          an: (type: string) => {
            if (typeof value !== type) throw new Error(`Expected type ${type}, got ${typeof value}`);
          },
          true: value === true ? undefined : (() => { throw new Error('Expected true'); })(),
          false: value === false ? undefined : (() => { throw new Error('Expected false'); })(),
          null: value === null ? undefined : (() => { throw new Error('Expected null'); })(),
          undefined: value === undefined ? undefined : (() => { throw new Error('Expected undefined'); })(),
          above: (n: number) => { if (value <= n) throw new Error(`Expected > ${n}, got ${value}`); },
          below: (n: number) => { if (value >= n) throw new Error(`Expected < ${n}, got ${value}`); },
        },
        have: {
          property: (prop: string) => {
            if (!(prop in value)) throw new Error(`Missing property: ${prop}`);
          },
          length: (len: number) => {
            if (value.length !== len) throw new Error(`Expected length ${len}, got ${value.length}`);
          },
        },
        include: (item: any) => {
          if (typeof value === 'string' && !value.includes(item))
            throw new Error(`String does not include "${item}"`);
          if (Array.isArray(value) && !value.includes(item))
            throw new Error(`Array does not include ${item}`);
        },
      },
    }),
  };

  const console = {
    log: (...args: any[]) => logs.push(args.map(a => 
      typeof a === 'object' ? JSON.stringify(a) : String(a)
    ).join(' ')),
  };

  try {
    const fn = new Function('pm', 'console', script);
    fn(pm, console);
    return { success: true, tests, logs, updatedEnv, updatedVars, collectionVars, modifiedRequest };
  } catch (e: any) {
    return { success: false, error: e.message, tests, logs, updatedEnv, updatedVars, collectionVars };
  }
}
