import { useState } from 'react';
import { parseJwt, base64Encode, base64Decode, urlEncode, urlDecode, timestampToDate, dateToTimestamp, generateUuid, formatJson, minifyJson, computeHash } from '../utils/tools';
import { useT } from '@/i18n';

type ToolType = 'jwt' | 'base64' | 'url' | 'timestamp' | 'uuid' | 'json' | 'hash';

export function ToolsPanel({ onClose }: { onClose: () => void }) {
  const t = useT();
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
      setOutput(t('toolsPanel.invalidJwt'));
    }
  };

  return (
    <div className="tools-panel">
      <div className="tools-header">
        <span>{t('toolsPanel.title')}</span>
        <button className="icon-btn" onClick={onClose}>×</button>
      </div>
      <div className="tools-body">
        <div className="tools-sidebar">
          {tools.map(tool => (
            <div key={tool.id} className={`tool-item ${activeTool === tool.id ? 'active' : ''}`} onClick={() => { setActiveTool(tool.id); setInput(''); setOutput(''); }}>
              {tool.name}
            </div>
          ))}
        </div>
        <div className="tools-content">
          {activeTool === 'jwt' && (
            <div className="tool-section">
              <label>{t('toolsPanel.jwtToken')}</label>
              <textarea className="tool-input" value={input} onChange={e => setInput(e.target.value)} placeholder={t('toolsPanel.pasteJwt')} />
              <button className="tool-btn" onClick={handleJwt}>{t('toolsPanel.decode')}</button>
              <label>{t('toolsPanel.result')}</label>
              <textarea className="tool-output" value={output} readOnly />
            </div>
          )}
          {activeTool === 'base64' && (
            <div className="tool-section">
              <label>{t('toolsPanel.input')}</label>
              <textarea className="tool-input" value={input} onChange={e => setInput(e.target.value)} placeholder={t('toolsPanel.enterText')} />
              <div className="tool-actions">
                <button className="tool-btn" onClick={() => setOutput(base64Encode(input))}>{t('toolsPanel.encode')}</button>
                <button className="tool-btn" onClick={() => setOutput(base64Decode(input))}>{t('toolsPanel.decode')}</button>
              </div>
              <label>{t('toolsPanel.output')}</label>
              <textarea className="tool-output" value={output} readOnly />
            </div>
          )}
          {activeTool === 'url' && (
            <div className="tool-section">
              <label>{t('toolsPanel.input')}</label>
              <textarea className="tool-input" value={input} onChange={e => setInput(e.target.value)} placeholder={t('toolsPanel.enterUrl')} />
              <div className="tool-actions">
                <button className="tool-btn" onClick={() => setOutput(urlEncode(input))}>{t('toolsPanel.encode')}</button>
                <button className="tool-btn" onClick={() => setOutput(urlDecode(input))}>{t('toolsPanel.decode')}</button>
              </div>
              <label>{t('toolsPanel.output')}</label>
              <textarea className="tool-output" value={output} readOnly />
            </div>
          )}
          {activeTool === 'timestamp' && (
            <div className="tool-section">
              <label>{t('toolsPanel.timestampOrDate')}</label>
              <input className="tool-input-single" value={input} onChange={e => setInput(e.target.value)} placeholder="e.g., 1704067200 or 2024-01-01" />
              <div className="tool-actions">
                <button className="tool-btn" onClick={() => setOutput(timestampToDate(Number(input)))}>{t('toolsPanel.toDate')}</button>
                <button className="tool-btn" onClick={() => { const r = dateToTimestamp(input); setOutput(`${t('toolsPanel.seconds')}: ${r.seconds}\n${t('toolsPanel.milliseconds')}: ${r.milliseconds}`); }}>{t('toolsPanel.toTimestamp')}</button>
                <button className="tool-btn" onClick={() => setOutput(`${t('toolsPanel.now')}: ${Math.floor(Date.now() / 1000)}`)}>{t('toolsPanel.current')}</button>
              </div>
              <label>{t('toolsPanel.output')}</label>
              <textarea className="tool-output" value={output} readOnly />
            </div>
          )}
          {activeTool === 'uuid' && (
            <div className="tool-section">
              <label>{t('toolsPanel.generatedUuid')}</label>
              <input className="tool-input-single" value={output} readOnly />
              <button className="tool-btn" onClick={() => setOutput(generateUuid())}>{t('toolsPanel.generate')}</button>
              <button className="tool-btn" onClick={() => navigator.clipboard.writeText(output)}>{t('toolsPanel.copy')}</button>
            </div>
          )}
          {activeTool === 'json' && (
            <div className="tool-section">
              <label>{t('toolsPanel.json')}</label>
              <textarea className="tool-input" value={input} onChange={e => setInput(e.target.value)} placeholder='{"key": "value"}' />
              <div className="tool-actions">
                <button className="tool-btn" onClick={() => setOutput(formatJson(input))}>{t('toolsPanel.format')}</button>
                <button className="tool-btn" onClick={() => setOutput(minifyJson(input))}>{t('toolsPanel.minify')}</button>
              </div>
              <label>{t('toolsPanel.output')}</label>
              <textarea className="tool-output" value={output} readOnly />
            </div>
          )}
          {activeTool === 'hash' && (
            <div className="tool-section">
              <label>{t('toolsPanel.input')}</label>
              <textarea className="tool-input" value={input} onChange={e => setInput(e.target.value)} placeholder={t('toolsPanel.enterTextToHash')} />
              <div className="tool-actions">
                <button className="tool-btn" onClick={async () => setOutput(await computeHash('SHA-256', input))}>SHA-256</button>
                <button className="tool-btn" onClick={async () => setOutput(await computeHash('SHA-1', input))}>SHA-1</button>
                <button className="tool-btn" onClick={async () => setOutput(await computeHash('SHA-512', input))}>SHA-512</button>
              </div>
              <label>{t('toolsPanel.output')}</label>
              <textarea className="tool-output" value={output} readOnly />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
