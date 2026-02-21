import { useState } from 'react';
import { TestResult } from '../utils/scripting';
import './ScriptEditor.css';

interface Props {
  preScript: string;
  testScript: string;
  onPreScriptChange: (s: string) => void;
  onTestScriptChange: (s: string) => void;
  lastTestResults?: TestResult[];
}

export function ScriptEditor({ preScript, testScript, onPreScriptChange, onTestScriptChange, lastTestResults }: Props) {
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
              在请求发送前执行。可用: pm.environment.set/get, pm.variables.set/get, pm.request.setHeader
            </div>
            <textarea
              value={preScript}
              onChange={e => onPreScriptChange(e.target.value)}
              placeholder={`// 示例: 添加时间戳\npm.request.setHeader('X-Timestamp', Date.now().toString());`}
              spellCheck={false}
            />
          </>
        ) : (
          <>
            <div className="script-hint">
              响应后执行断言。可用: pm.test(), pm.expect(), pm.response.json()
            </div>
            <textarea
              value={testScript}
              onChange={e => onTestScriptChange(e.target.value)}
              placeholder={`// 示例: 检查状态码\npm.test("Status is 200", () => {\n  pm.expect(pm.response.code).to.equal(200);\n});`}
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
          </>
        )}
      </div>
    </div>
  );
}
