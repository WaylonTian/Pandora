# Phase 4: Built-in Tools Enhancement

## Task 14: Common Tool Components

**Files:**
- Create: `src/modules/toolkit/components/ToolLayout.tsx`
- Create: `src/modules/toolkit/components/CopyButton.tsx`

**Step 1: Create ToolLayout wrapper**

```tsx
import { ReactNode } from 'react';

interface Props {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function ToolLayout({ title, actions, children }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
```

**Step 2: Create CopyButton**

```tsx
import { useState } from 'react';

export function CopyButton({ text, label = '📋' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="px-2 py-1 rounded text-xs bg-muted hover:bg-muted/80 transition-colors"
      title="Copy"
    >
      {copied ? '✓' : label}
    </button>
  );
}
```

**Step 3: Commit**
```bash
git add -A && git commit -m "feat(toolkit): add common ToolLayout and CopyButton components"
```

---

## Task 15: Refactor existing tools to use common components + add copy buttons

**Files:**
- Modify: `src/modules/toolkit/tools/json-tool.tsx`
- Modify: `src/modules/toolkit/tools/base64-tool.tsx`
- Modify: `src/modules/toolkit/tools/url-codec-tool.tsx`
- Modify: `src/modules/toolkit/tools/crypto-tool.tsx`
- Modify: `src/modules/toolkit/tools/uuid-tool.tsx`
- Modify: `src/modules/toolkit/tools/timestamp-tool.tsx`

**Step 1: Add CopyButton to each tool's output area**

For each tool, import `CopyButton` and add it next to the output textarea/display:

Example for json-tool.tsx — add after the output textarea:
```tsx
import { CopyButton } from '../components/CopyButton';
// ... in the JSX, wrap output area:
<div className="relative">
  <textarea ... value={output} readOnly ... />
  {output && <div className="absolute top-2 right-2"><CopyButton text={output} /></div>}
</div>
```

Apply the same pattern to all 6 tools that have output areas.

**Step 2: Commit**
```bash
git add -A && git commit -m "feat(toolkit): add copy buttons to all built-in tools"
```

---

## Task 16: New built-in tools — Regex Tester

**Files:**
- Create: `src/modules/toolkit/tools/regex-tool.tsx`
- Modify: `src/modules/toolkit/register.ts`

**Step 1: Implement regex tester**

```tsx
import { useState } from 'react';
import { useT } from '@/i18n';

export function RegexTool() {
  const t = useT();
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState('g');
  const [input, setInput] = useState('');

  let matches: { text: string; index: number }[] = [];
  let error = '';
  try {
    if (pattern) {
      const re = new RegExp(pattern, flags);
      let m;
      while ((m = re.exec(input)) !== null) {
        matches.push({ text: m[0], index: m.index });
        if (!re.global) break;
      }
    }
  } catch (e) {
    error = e instanceof Error ? e.message : 'Invalid regex';
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t('toolkit.regexTool.title') || 'Regex Tester'}</h2>
      <div className="flex gap-2">
        <span className="py-2 text-muted-foreground">/</span>
        <input className="flex-1 px-3 py-2 border rounded bg-background text-foreground font-mono text-sm"
          value={pattern} onChange={e => setPattern(e.target.value)} placeholder="pattern" />
        <span className="py-2 text-muted-foreground">/</span>
        <input className="w-16 px-2 py-2 border rounded bg-background text-foreground font-mono text-sm"
          value={flags} onChange={e => setFlags(e.target.value)} placeholder="flags" />
      </div>
      {error && <div className="text-destructive text-sm">{error}</div>}
      <textarea className="w-full h-32 p-2 border rounded bg-background text-foreground font-mono text-sm resize-y"
        value={input} onChange={e => setInput(e.target.value)} placeholder="Test string..." />
      <div className="space-y-1">
        <div className="text-sm font-medium">{matches.length} match{matches.length !== 1 ? 'es' : ''}</div>
        {matches.map((m, i) => (
          <div key={i} className="p-2 border rounded bg-muted font-mono text-sm">
            <span className="text-primary">{m.text}</span>
            <span className="text-muted-foreground ml-2">at index {m.index}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Register in register.ts**

Add import and registration:
```typescript
import { RegexTool } from './tools/regex-tool';
registerTool({ id: 'regex', name: '正则测试', icon: '.*', category: 'text', component: RegexTool });
```

**Step 3: Commit**
```bash
git add -A && git commit -m "feat(toolkit): add regex tester tool"
```

---

## Task 17: New built-in tools — JWT Decoder

**Files:**
- Create: `src/modules/toolkit/tools/jwt-tool.tsx`
- Modify: `src/modules/toolkit/register.ts`

**Step 1: Implement JWT decoder**

```tsx
import { useState } from 'react';
import { CopyButton } from '../components/CopyButton';

export function JwtTool() {
  const [input, setInput] = useState('');

  let header = '', payload = '', signature = '', error = '';
  try {
    if (input.trim()) {
      const parts = input.trim().split('.');
      if (parts.length !== 3) throw new Error('JWT must have 3 parts');
      header = JSON.stringify(JSON.parse(atob(parts[0])), null, 2);
      payload = JSON.stringify(JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))), null, 2);
      signature = parts[2];
    }
  } catch (e) {
    error = e instanceof Error ? e.message : 'Invalid JWT';
  }

  const Section = ({ title, content }: { title: string; content: string }) => (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium">{title}</span>
        {content && <CopyButton text={content} />}
      </div>
      <pre className="p-2 border rounded bg-muted font-mono text-xs overflow-auto max-h-48">{content || '-'}</pre>
    </div>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">JWT Decoder</h2>
      <textarea className="w-full h-24 p-2 border rounded bg-background text-foreground font-mono text-sm resize-y"
        value={input} onChange={e => setInput(e.target.value)} placeholder="Paste JWT token..." />
      {error && <div className="text-destructive text-sm">{error}</div>}
      {!error && input && (
        <div className="space-y-3">
          <Section title="Header" content={header} />
          <Section title="Payload" content={payload} />
          <Section title="Signature" content={signature} />
        </div>
      )}
    </div>
  );
}
```

**Step 2: Register**
```typescript
import { JwtTool } from './tools/jwt-tool';
registerTool({ id: 'jwt', name: 'JWT', icon: 'JWT', category: 'crypto', component: JwtTool });
```

**Step 3: Commit**
```bash
git add -A && git commit -m "feat(toolkit): add JWT decoder tool"
```

---

## Task 18: New built-in tools — Color Converter

**Files:**
- Create: `src/modules/toolkit/tools/color-tool.tsx`
- Modify: `src/modules/toolkit/register.ts`

**Step 1: Implement color converter**

```tsx
import { useState } from 'react';
import { CopyButton } from '../components/CopyButton';

function hexToRgb(hex: string) {
  const m = hex.replace('#', '').match(/.{2}/g);
  if (!m || m.length < 3) return null;
  return { r: parseInt(m[0], 16), g: parseInt(m[1], 16), b: parseInt(m[2], 16) };
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) / 6
      : max === g ? ((b - r) / d + 2) / 6
      : ((r - g) / d + 4) / 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function ColorTool() {
  const [input, setInput] = useState('#3b82f6');
  const rgb = hexToRgb(input);
  const hsl = rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b) : null;

  const rgbStr = rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : '';
  const hslStr = hsl ? `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` : '';

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Color Converter</h2>
      <div className="flex gap-3 items-center">
        <input type="color" value={input} onChange={e => setInput(e.target.value)}
          className="w-12 h-12 rounded cursor-pointer border-0" />
        <input className="flex-1 px-3 py-2 border rounded bg-background text-foreground font-mono text-sm"
          value={input} onChange={e => setInput(e.target.value)} placeholder="#hex" />
      </div>
      {rgb && (
        <div className="space-y-2">
          <div className="w-full h-16 rounded-lg border" style={{ backgroundColor: input }} />
          <div className="flex items-center gap-2 p-2 border rounded bg-muted font-mono text-sm">
            <span className="flex-1">HEX: {input}</span><CopyButton text={input} />
          </div>
          <div className="flex items-center gap-2 p-2 border rounded bg-muted font-mono text-sm">
            <span className="flex-1">RGB: {rgbStr}</span><CopyButton text={rgbStr} />
          </div>
          <div className="flex items-center gap-2 p-2 border rounded bg-muted font-mono text-sm">
            <span className="flex-1">HSL: {hslStr}</span><CopyButton text={hslStr} />
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Register**
```typescript
import { ColorTool } from './tools/color-tool';
registerTool({ id: 'color', name: '颜色转换', icon: '🎨', category: 'other', component: ColorTool });
```

**Step 3: Commit**
```bash
git add -A && git commit -m "feat(toolkit): add color converter tool"
```

---

## Task 19: New built-in tools — Number Base Converter

**Files:**
- Create: `src/modules/toolkit/tools/base-converter-tool.tsx`
- Modify: `src/modules/toolkit/register.ts`

**Step 1: Implement base converter**

```tsx
import { useState } from 'react';
import { CopyButton } from '../components/CopyButton';

export function BaseConverterTool() {
  const [input, setInput] = useState('');
  const [fromBase, setFromBase] = useState(10);

  let dec = NaN;
  try { dec = parseInt(input, fromBase); } catch {}

  const bases = [
    { label: 'BIN (2)', base: 2 },
    { label: 'OCT (8)', base: 8 },
    { label: 'DEC (10)', base: 10 },
    { label: 'HEX (16)', base: 16 },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Base Converter</h2>
      <div className="flex gap-2 items-center">
        <select value={fromBase} onChange={e => setFromBase(Number(e.target.value))}
          className="px-2 py-2 border rounded bg-background text-foreground text-sm">
          {bases.map(b => <option key={b.base} value={b.base}>{b.label}</option>)}
        </select>
        <input className="flex-1 px-3 py-2 border rounded bg-background text-foreground font-mono text-sm"
          value={input} onChange={e => setInput(e.target.value)} placeholder="Enter number..." />
      </div>
      {!isNaN(dec) && input && (
        <div className="space-y-2">
          {bases.map(b => {
            const val = dec.toString(b.base).toUpperCase();
            return (
              <div key={b.base} className="flex items-center gap-2 p-2 border rounded bg-muted font-mono text-sm">
                <span className="w-16 text-muted-foreground text-xs">{b.label}</span>
                <span className="flex-1">{val}</span>
                <CopyButton text={val} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Register**
```typescript
import { BaseConverterTool } from './tools/base-converter-tool';
registerTool({ id: 'base-converter', name: '进制转换', icon: '0x', category: 'encoding', component: BaseConverterTool });
```

**Step 3: Commit**
```bash
git add -A && git commit -m "feat(toolkit): add number base converter tool"
```
