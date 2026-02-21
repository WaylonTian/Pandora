import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { TestResult } from '../utils/scripting';
import type { Collection, Request } from '../store';
import './CollectionRunner.css';

interface RunResult {
  request: Request;
  status: number;
  time: number;
  tests: TestResult[];
  error?: string;
}

interface Props {
  collections: Collection[];
  onClose: () => void;
  environment: Record<string, string>;
}

export function CollectionRunner({ collections, onClose, environment: _environment }: Props) {
  const validCollections = collections.filter(c => c.id !== undefined) as { id: number; name: string }[];
  const [selectedCol, setSelectedCol] = useState<number>(validCollections[0]?.id || 0);
  const [iterations, setIterations] = useState(1);
  const [delay, setDelay] = useState(0);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<RunResult[]>([]);

  const runCollection = async () => {
    if (!selectedCol) return;
    
    setRunning(true);
    setResults([]);
    
    try {
      const requests: Request[] = await invoke('get_requests', { collectionId: selectedCol });
      const total = requests.length * iterations;
      setProgress({ current: 0, total });

      const allResults: RunResult[] = [];
      
      for (let iter = 0; iter < iterations; iter++) {
        for (const req of requests) {
          try {
            // Send request
            const start = Date.now();
            const response: any = await invoke('send_request', {
              method: req.method,
              url: req.url,
              headers: req.headers,
              body: req.body,
            });
            const time = Date.now() - start;

            allResults.push({ request: req, status: response.status, time, tests: [] });
          } catch (e: any) {
            allResults.push({ request: req, status: 0, time: 0, tests: [], error: e.message });
          }

          setProgress(p => ({ ...p, current: p.current + 1 }));
          setResults([...allResults]);
          
          if (delay > 0) await new Promise(r => setTimeout(r, delay));
        }
      }
    } finally {
      setRunning(false);
    }
  };

  const passed = results.filter(r => r.status >= 200 && r.status < 400 && !r.error).length;
  const failed = results.length - passed;
  const avgTime = results.length ? Math.round(results.reduce((s, r) => s + r.time, 0) / results.length) : 0;
  const totalTests = results.reduce((s, r) => s + r.tests.length, 0);
  const passedTests = results.reduce((s, r) => s + r.tests.filter(t => t.passed).length, 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="runner-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Collection Runner</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="runner-config">
          <label>
            集合:
            <select value={selectedCol} onChange={e => setSelectedCol(Number(e.target.value))}>
              {validCollections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label>
            迭代:
            <input type="number" min={1} max={100} value={iterations} onChange={e => setIterations(Number(e.target.value))} />
          </label>
          <label>
            延迟 (ms):
            <input type="number" min={0} max={5000} step={100} value={delay} onChange={e => setDelay(Number(e.target.value))} />
          </label>
          <button className="run-btn" onClick={runCollection} disabled={running || !selectedCol}>
            {running ? '运行中...' : '开始运行'}
          </button>
        </div>

        {running && (
          <div className="runner-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
            </div>
            <div className="progress-text">
              <span>{progress.current} / {progress.total}</span>
              <span>{Math.round((progress.current / progress.total) * 100)}%</span>
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="runner-summary">
            <div className="summary-item">
              <div className="summary-value pass">{passed}</div>
              <div className="summary-label">通过</div>
            </div>
            <div className="summary-item">
              <div className="summary-value fail">{failed}</div>
              <div className="summary-label">失败</div>
            </div>
            <div className="summary-item">
              <div className="summary-value">{avgTime}ms</div>
              <div className="summary-label">平均耗时</div>
            </div>
            <div className="summary-item">
              <div className="summary-value">{passedTests}/{totalTests}</div>
              <div className="summary-label">测试通过</div>
            </div>
          </div>
        )}

        <div className="runner-results">
          {results.length === 0 && !running && (
            <div className="runner-empty">选择集合并点击"开始运行"</div>
          )}
          {results.map((r, i) => (
            <div key={i} className={`result-item ${r.error || r.status >= 400 ? 'fail' : 'pass'}`}>
              <span className={`result-status s${Math.floor(r.status / 100)}xx`}>
                {r.error ? 'ERR' : r.status}
              </span>
              <span className="result-method">{r.request.method}</span>
              <span className="result-name">{r.request.name}</span>
              <span className="result-time">{r.time}ms</span>
              {r.tests.length > 0 && (
                <span className="result-tests">
                  <span className="pass">{r.tests.filter(t => t.passed).length}</span>
                  /
                  <span className={r.tests.some(t => !t.passed) ? 'fail' : ''}>{r.tests.length}</span>
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
