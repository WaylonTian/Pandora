export function resolveTemplate(text: string, variables: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => variables[key] !== undefined ? variables[key] : match);
}

export function resolveHeaders(headers: Record<string, string>, variables: Record<string, string>): Record<string, string> {
  const resolved: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    resolved[resolveTemplate(k, variables)] = resolveTemplate(v, variables);
  }
  return resolved;
}
