// JWT 解析
export function parseJwt(token: string): { header: any; payload: any; signature: string; isExpired: boolean } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const header = JSON.parse(atob(parts[0]));
    const payload = JSON.parse(atob(parts[1]));
    const signature = parts[2];
    const isExpired = payload.exp ? Date.now() / 1000 > payload.exp : false;
    
    return { header, payload, signature, isExpired };
  } catch {
    return null;
  }
}

// Base64 编解码
export function base64Encode(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

export function base64Decode(str: string): string {
  try {
    return decodeURIComponent(escape(atob(str)));
  } catch {
    return atob(str);
  }
}

// URL 编解码
export function urlEncode(str: string): string {
  return encodeURIComponent(str);
}

export function urlDecode(str: string): string {
  return decodeURIComponent(str);
}

// 时间戳转换
export function timestampToDate(ts: number): string {
  const d = new Date(ts * (ts.toString().length <= 10 ? 1000 : 1));
  return d.toISOString();
}

export function dateToTimestamp(date: string): { seconds: number; milliseconds: number } {
  const d = new Date(date);
  return { seconds: Math.floor(d.getTime() / 1000), milliseconds: d.getTime() };
}

// UUID 生成
export function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// Hash 计算 (简单实现，生产环境应使用 crypto API)
export async function computeHash(algorithm: string, text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest(algorithm, data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// JSON 格式化
export function formatJson(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
}

export function minifyJson(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str));
  } catch {
    return str;
  }
}
