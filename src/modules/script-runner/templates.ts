export const templates: Record<string, { label: string; ext: string; content: string }[]> = {
  node: [
    { label: 'Blank', ext: '.js', content: '' },
    { label: 'HTTP Request', ext: '.js', content: 'const resp = await fetch("https://httpbin.org/get");\nconst data = await resp.json();\nconsole.log(JSON.stringify(data, null, 2));' },
    { label: 'File Processing', ext: '.js', content: 'const fs = require("fs");\nconst files = fs.readdirSync(".");\nconsole.log("Files:", files);' },
  ],
  python: [
    { label: 'Blank', ext: '.py', content: '' },
    { label: 'HTTP Request', ext: '.py', content: 'import urllib.request, json\nresp = urllib.request.urlopen("https://httpbin.org/get")\nprint(json.dumps(json.loads(resp.read()), indent=2))' },
    { label: 'File Processing', ext: '.py', content: 'import os\nfor f in os.listdir("."):\n    print(f)' },
  ],
  bash: [
    { label: 'Blank', ext: '.sh', content: '#!/bin/bash\n' },
    { label: 'System Info', ext: '.sh', content: '#!/bin/bash\necho "Hostname: $(hostname)"\necho "OS: $(uname -s)"\necho "Uptime: $(uptime)"\ndf -h' },
  ],
  powershell: [
    { label: 'Blank', ext: '.ps1', content: '' },
    { label: 'System Info', ext: '.ps1', content: 'Write-Host "Computer: $env:COMPUTERNAME"\nGet-Process | Sort-Object CPU -Descending | Select-Object -First 10 Name, CPU' },
  ],
};
