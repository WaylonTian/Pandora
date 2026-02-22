import { useState } from 'react';
import { useT } from '@/i18n';
import { TestResult } from '../utils/scripting';
import '../styles/ScriptEditor.css';

interface Props {
  preScript: string;
  testScript: string;
  onPreScriptChange: (s: string) => void;
  onTestScriptChange: (s: string) => void;
  lastTestResults?: TestResult[];
  logs?: string[];
}

export function ScriptEditor({ preScript, testScript, onPreScriptChange, onTestScriptChange, lastTestResults, logs }: Props) {
  const t = useT();
  const [tab, setTab] = useState<'pre' | 'test'>('pre');

  return (
    <div className="script-editor">
      <div className="script-tabs">
        <button className={tab === 'pre' ? 'active' : ''} onClick={() => setTab('pre')}>
          Pre-request
        </button>
        <button className={tab === 'test' ? 'active' : ''} onClick={() => setTab('test')}>
          Tests {lastTestResults && `(${lastTestResults.filter(t => t.passed).length}/${lastTestResults.length})`}
        </button>
      </div>
      
      <div className="script-content">
        {tab === 'pre' ? (
          <>
            <div className="script-hint">
              {t('scriptEditor.preRequestHint')}
            </div>
            <textarea
              value={preScript}
              onChange={e => onPreScriptChange(e.target.value)}
              placeholder={t('scriptEditor.preRequestExample')}
              spellCheck={false}
            />
          </>
        ) : (
          <>
            <div className="script-hint">
              {t('scriptEditor.testsHint')}
            </div>
            <textarea
              value={testScript}
              onChange={e => onTestScriptChange(e.target.value)}
              placeholder={t('scriptEditor.testsExample')}
              spellCheck={false}
            />
            {lastTestResults && lastTestResults.length > 0 && (
              <div className="test-results">
                {lastTestResults.map((t, i) => (
                  <div key={i} className={`test-result ${t.passed ? 'pass' : 'fail'}`}>
                    <span className="test-icon">{t.passed ? '✓' : '✗'}</span>
                    <span className="test-name">{t.name}</span>
                    {t.error && <span className="test-error">{t.error}</span>}
                  </div>
                ))}
              </div>
            )}
            {logs && logs.length > 0 && (
              <div className="console-output">
                <div className="section-title">Console</div>
                {logs.map((log, i) => (
                  <div key={i} className="console-line">{log}</div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
