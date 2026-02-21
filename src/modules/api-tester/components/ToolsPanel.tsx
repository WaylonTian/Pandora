import { useState } from 'react';
import { parseJwt, base64Encode, base64Decode, urlEncode, urlDecode, timestampToDate, dateToTimestamp, generateUuid, formatJson, minifyJson, computeHash } from '../utils/tools';

type ToolType = 'jwt' | 'base64' | 'url' | 'timestamp' | 'uuid' | 'json' | 'hash';

export function ToolsPanel({ onClose }: { onClose: () => void }) {
  const [activeTool, setActiveTool] = useState<ToolType>('jwt');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');

  const tools: { id: ToolType; name: string }[] = [
    { id: 'jwt', name: 'JWT' },
    { id: 'base64', name: 'Base64' },
    { id: 'url', name: 'URL' },
    { id: 'timestamp', name: 'Timestamp' },
    { id: 'uuid', name: 'UUID' },
    { id: 'json', name: 'JSON' },
    { id: 'hash', name: 'Hash' },
  ];

  const handleJwt = () => {
    const result = parseJwt(input);
    if (result) {
      setOutput(JSON.stringify({ header: result.header, payload: result.payload, isExpired: result.isExpired }, null, 2));
    } else {
      setOutput('Invalid JWT token');
    }
  };

  return (
    <div className="tools-panel">
      <div className="tools-header">
        <span>Tools</span>
        <button className="icon-btn" onClick={onClose}>×</button>
      </div>
      <div className="tools-body">
        <div className="tools-sidebar">
          {tools.map(t => (
            <div key={t.id} className={`tool-item ${activeTool === t.id ? 'active' : ''}`} onClick={() => { setActiveTool(t.id); setInput(''); setOutput(''); }}>
              {t.name}
            </div>
          ))}
        </div>
        <div className="tools-content">
          {activeTool === 'jwt' && (
            <div className="tool-section">
              <label>JWT Token</label>
              <textarea className="tool-input" value={input} onChange={e => setInput(e.target.value)} placeholder="Paste JWT token..." />
              <button className="tool-btn" onClick={handleJwt}>Decode</button>
              <label>Result</label>
              <textarea className="tool-output" value={output} readOnly />
            </div>
          )}
          {activeTool === 'base64' && (
            <div className="tool-section">
              <label>Input</label>
              <textarea className="tool-input" value={input} onChange={e => setInput(e.target.value)} placeholder="Enter text..." />
              <div className="tool-actions">
                <button className="tool-btn" onClick={() => setOutput(base64Encode(input))}>Encode</button>
                <button className="tool-btn" onClick={() => setOutput(base64Decode(input))}>Decode</button>
              </div>
              <label>Output</label>
              <textarea className="tool-output" value={output} readOnly />
            </div>
          )}
          {activeTool === 'url' && (
            <div className="tool-section">
              <label>Input</label>
              <textarea className="tool-input" value={input} onChange={e => setInput(e.target.value)} placeholder="Enter URL or text..." />
              <div className="tool-actions">
                <button className="tool-btn" onClick={() => setOutput(urlEncode(input))}>Encode</button>
                <button className="tool-btn" onClick={() => setOutput(urlDecode(input))}>Decode</button>
              </div>
              <label>Output</label>
              <textarea className="tool-output" value={output} readOnly />
            </div>
          )}
          {activeTool === 'timestamp' && (
            <div className="tool-section">
              <label>Timestamp or Date</label>
              <input className="tool-input-single" value={input} onChange={e => setInput(e.target.value)} placeholder="e.g., 1704067200 or 2024-01-01" />
              <div className="tool-actions">
                <button className="tool-btn" onClick={() => setOutput(timestampToDate(Number(input)))}>To Date</button>
                <button className="tool-btn" onClick={() => { const r = dateToTimestamp(input); setOutput(`Seconds: ${r.seconds}\nMilliseconds: ${r.milliseconds}`); }}>To Timestamp</button>
                <button className="tool-btn" onClick={() => setOutput(`Now: ${Math.floor(Date.now() / 1000)}`)}>Current</button>
              </div>
              <label>Output</label>
              <textarea className="tool-output" value={output} readOnly />
            </div>
          )}
          {activeTool === 'uuid' && (
            <div className="tool-section">
              <label>Generated UUID</label>
              <input className="tool-input-single" value={output} readOnly />
              <button className="tool-btn" onClick={() => setOutput(generateUuid())}>Generate</button>
              <button className="tool-btn" onClick={() => navigator.clipboard.writeText(output)}>Copy</button>
            </div>
          )}
          {activeTool === 'json' && (
            <div className="tool-section">
              <label>JSON</label>
              <textarea className="tool-input" value={input} onChange={e => setInput(e.target.value)} placeholder='{"key": "value"}' />
              <div className="tool-actions">
                <button className="tool-btn" onClick={() => setOutput(formatJson(input))}>Format</button>
                <button className="tool-btn" onClick={() => setOutput(minifyJson(input))}>Minify</button>
              </div>
              <label>Output</label>
              <textarea className="tool-output" value={output} readOnly />
            </div>
          )}
          {activeTool === 'hash' && (
            <div className="tool-section">
              <label>Input</label>
              <textarea className="tool-input" value={input} onChange={e => setInput(e.target.value)} placeholder="Enter text to hash..." />
              <div className="tool-actions">
                <button className="tool-btn" onClick={async () => setOutput(await computeHash('SHA-256', input))}>SHA-256</button>
                <button className="tool-btn" onClick={async () => setOutput(await computeHash('SHA-1', input))}>SHA-1</button>
                <button className="tool-btn" onClick={async () => setOutput(await computeHash('SHA-512', input))}>SHA-512</button>
              </div>
              <label>Output</label>
              <textarea className="tool-output" value={output} readOnly />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
