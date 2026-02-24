export const templates: Record<string, { label: string; ext: string; content: string }[]> = {
  python: [
    { label: 'JSON Input', ext: '.py', content: 'import sys, json\n\ndata = json.load(sys.stdin)\nprint(json.dumps(data, indent=2, ensure_ascii=False))' },
    { label: 'Blank', ext: '.py', content: '' },
    { label: 'HTTP Request', ext: '.py', content: 'import urllib.request, json\nresp = urllib.request.urlopen("https://httpbin.org/get")\nprint(json.dumps(json.loads(resp.read()), indent=2))' },
  ],
  node: [
    { label: 'JSON Input', ext: '.js', content: 'let input = "";\nprocess.stdin.on("data", c => input += c);\nprocess.stdin.on("end", () => {\n  const data = JSON.parse(input);\n  console.log(JSON.stringify(data, null, 2));\n});' },
    { label: 'Blank', ext: '.js', content: '' },
    { label: 'HTTP Request', ext: '.js', content: 'const resp = await fetch("https://httpbin.org/get");\nconst data = await resp.json();\nconsole.log(JSON.stringify(data, null, 2));' },
  ],
};
