// cURL 解析器
export function parseCurl(curl: string): {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
} {
  const result = { method: 'GET', url: '', headers: {} as Record<string, string>, body: '' };
  
  // 移除换行和多余空格
  const normalized = curl.replace(/\\\n/g, ' ').replace(/\s+/g, ' ').trim();
  
  // 提取 URL
  const urlMatch = normalized.match(/curl\s+(?:['"]([^'"]+)['"]|(\S+))/i) ||
                   normalized.match(/['"]?(https?:\/\/[^\s'"]+)['"]?/);
  if (urlMatch) result.url = urlMatch[1] || urlMatch[2] || urlMatch[0];
  
  // 提取方法
  const methodMatch = normalized.match(/-X\s+['"]?(\w+)['"]?/i);
  if (methodMatch) result.method = methodMatch[1].toUpperCase();
  
  // 提取 headers
  const headerRegex = /-H\s+['"]([^'"]+)['"]/gi;
  let headerMatch;
  while ((headerMatch = headerRegex.exec(normalized)) !== null) {
    const [key, ...valueParts] = headerMatch[1].split(':');
    if (key) result.headers[key.trim()] = valueParts.join(':').trim();
  }
  
  // 提取 body
  const bodyMatch = normalized.match(/(?:-d|--data|--data-raw|--data-binary)\s+['"]([^'"]*)['"]/i) ||
                    normalized.match(/(?:-d|--data|--data-raw|--data-binary)\s+(\S+)/i);
  if (bodyMatch) {
    result.body = bodyMatch[1];
    if (result.method === 'GET') result.method = 'POST';
  }
  
  return result;
}

// cURL 生成器
export function generateCurl(
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: string
): string {
  let curl = `curl -X ${method}`;
  
  Object.entries(headers).forEach(([key, value]) => {
    curl += ` \\\n  -H '${key}: ${value}'`;
  });
  
  if (body) {
    curl += ` \\\n  -d '${body.replace(/'/g, "\\'")}'`;
  }
  
  curl += ` \\\n  '${url}'`;
  
  return curl;
}

// 代码生成器
export function generateCode(
  language: string,
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: string
): string {
  switch (language) {
    case 'javascript-fetch':
      return generateJsFetch(method, url, headers, body);
    case 'javascript-axios':
      return generateJsAxios(method, url, headers, body);
    case 'python':
      return generatePython(method, url, headers, body);
    case 'go':
      return generateGo(method, url, headers, body);
    case 'rust':
      return generateRust(method, url, headers, body);
    case 'java':
      return generateJava(method, url, headers, body);
    case 'php':
      return generatePhp(method, url, headers, body);
    case 'curl':
      return generateCurl(method, url, headers, body);
    default:
      return generateCurl(method, url, headers, body);
  }
}

function generateJsFetch(method: string, url: string, headers: Record<string, string>, body?: string): string {
  const opts: string[] = [`method: '${method}'`];
  if (Object.keys(headers).length) {
    opts.push(`headers: ${JSON.stringify(headers, null, 2)}`);
  }
  if (body) opts.push(`body: ${JSON.stringify(body)}`);
  
  return `fetch('${url}', {
  ${opts.join(',\n  ')}
})
.then(res => res.json())
.then(data => console.log(data));`;
}

function generateJsAxios(method: string, url: string, headers: Record<string, string>, body?: string): string {
  const config: string[] = [];
  if (Object.keys(headers).length) config.push(`headers: ${JSON.stringify(headers, null, 2)}`);
  
  if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
    return `axios.${method.toLowerCase()}('${url}', ${body}${config.length ? `, { ${config.join(', ')} }` : ''})
  .then(res => console.log(res.data));`;
  }
  
  return `axios.${method.toLowerCase()}('${url}'${config.length ? `, { ${config.join(', ')} }` : ''})
  .then(res => console.log(res.data));`;
}

function generatePython(method: string, url: string, headers: Record<string, string>, body?: string): string {
  let code = `import requests\n\n`;
  code += `response = requests.${method.toLowerCase()}(\n    '${url}'`;
  if (Object.keys(headers).length) {
    code += `,\n    headers=${JSON.stringify(headers, null, 4).replace(/"/g, "'")}`;
  }
  if (body) code += `,\n    json=${body}`;
  code += `\n)\nprint(response.json())`;
  return code;
}

function generateGo(method: string, url: string, headers: Record<string, string>, body?: string): string {
  let code = `package main

import (
    "fmt"
    "net/http"
    "io"${body ? '\n    "strings"' : ''}
)

func main() {
    ${body ? `body := strings.NewReader(\`${body}\`)
    req, _ := http.NewRequest("${method}", "${url}", body)` : `req, _ := http.NewRequest("${method}", "${url}", nil)`}
`;
  Object.entries(headers).forEach(([k, v]) => {
    code += `    req.Header.Set("${k}", "${v}")\n`;
  });
  code += `
    client := &http.Client{}
    resp, _ := client.Do(req)
    defer resp.Body.Close()
    
    data, _ := io.ReadAll(resp.Body)
    fmt.Println(string(data))
}`;
  return code;
}

function generateRust(method: string, url: string, headers: Record<string, string>, body?: string): string {
  let code = `use reqwest::header::{HeaderMap, HeaderValue};\n\n`;
  code += `#[tokio::main]\nasync fn main() -> Result<(), Box<dyn std::error::Error>> {\n`;
  code += `    let client = reqwest::Client::new();\n`;
  code += `    let response = client.${method.toLowerCase()}("${url}")\n`;
  Object.entries(headers).forEach(([k, v]) => {
    code += `        .header("${k}", "${v}")\n`;
  });
  if (body) code += `        .body(r#"${body}"#)\n`;
  code += `        .send().await?\n        .text().await?;\n`;
  code += `    println!("{}", response);\n    Ok(())\n}`;
  return code;
}

function generateJava(method: string, url: string, headers: Record<string, string>, body?: string): string {
  let code = `import java.net.http.*;\nimport java.net.URI;\n\n`;
  code += `public class Main {\n    public static void main(String[] args) throws Exception {\n`;
  code += `        HttpClient client = HttpClient.newHttpClient();\n`;
  code += `        HttpRequest request = HttpRequest.newBuilder()\n`;
  code += `            .uri(URI.create("${url}"))\n`;
  code += `            .method("${method}", ${body ? `HttpRequest.BodyPublishers.ofString("${body.replace(/"/g, '\\"')}")` : 'HttpRequest.BodyPublishers.noBody()'})\n`;
  Object.entries(headers).forEach(([k, v]) => {
    code += `            .header("${k}", "${v}")\n`;
  });
  code += `            .build();\n`;
  code += `        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());\n`;
  code += `        System.out.println(response.body());\n    }\n}`;
  return code;
}

function generatePhp(method: string, url: string, headers: Record<string, string>, body?: string): string {
  let code = `<?php\n$ch = curl_init();\n`;
  code += `curl_setopt($ch, CURLOPT_URL, '${url}');\n`;
  code += `curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\n`;
  code += `curl_setopt($ch, CURLOPT_CUSTOMREQUEST, '${method}');\n`;
  if (Object.keys(headers).length) {
    code += `curl_setopt($ch, CURLOPT_HTTPHEADER, [\n`;
    Object.entries(headers).forEach(([k, v]) => {
      code += `    '${k}: ${v}',\n`;
    });
    code += `]);\n`;
  }
  if (body) code += `curl_setopt($ch, CURLOPT_POSTFIELDS, '${body}');\n`;
  code += `$response = curl_exec($ch);\ncurl_close($ch);\necho $response;\n?>`;
  return code;
}
