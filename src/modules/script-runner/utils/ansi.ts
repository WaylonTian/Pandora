// Lightweight ANSI 16-color to HTML converter
const ANSI_COLORS: Record<number, string> = {
  30: '#4e4e4e', 31: '#e06c75', 32: '#98c379', 33: '#e5c07b',
  34: '#61afef', 35: '#c678dd', 36: '#56b6c2', 37: '#dcdfe4',
  90: '#5c6370', 91: '#e06c75', 92: '#98c379', 93: '#e5c07b',
  94: '#61afef', 95: '#c678dd', 96: '#56b6c2', 97: '#ffffff',
};

export function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}

export function ansiToHtml(s: string): string {
  let result = '';
  let i = 0;
  let open = false;

  while (i < s.length) {
    if (s[i] === '\x1b' && s[i + 1] === '[') {
      const end = s.indexOf('m', i + 2);
      if (end === -1) { result += s[i]; i++; continue; }
      const codes = s.slice(i + 2, end).split(';').map(Number);
      i = end + 1;

      for (const code of codes) {
        if (code === 0 || code === 39) {
          if (open) { result += '</span>'; open = false; }
        } else if (code === 1) {
          if (open) result += '</span>';
          result += '<span style="font-weight:bold">';
          open = true;
        } else if (ANSI_COLORS[code]) {
          if (open) result += '</span>';
          result += `<span style="color:${ANSI_COLORS[code]}">`;
          open = true;
        }
      }
    } else {
      // Escape HTML
      const ch = s[i];
      result += ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '&' ? '&amp;' : ch;
      i++;
    }
  }
  if (open) result += '</span>';
  return result;
}
