import { useState, useRef, useEffect } from 'react';
import { useScriptRunnerStore } from '../store';
import { useT } from '@/i18n';

function stripAnsi(s: string) {
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}

export function OutputPanel() {
  const t = useT();
  const store = useScriptRunnerStore();
  const [tab, setTab] = useState<'output' | 'history'>('output');
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const outputRef = useRef<HTMLPreElement>(null);

  const { runningProcess, executionHistory } = store;

  // Current output: running process or last history entry
  const currentOutput = runningProcess
    ? { stdout: runningProcess.stdout, stderr: runningProcess.stderr, exitCode: null as number | null, durationMs: 0, timestamp: runningProcess.startTime }
    : executionHistory[0]
    ? { stdout: executionHistory[0].stdout, stderr: executionHistory[0].stderr, exitCode: executionHistory[0].exitCode, durationMs: executionHistory[0].durationMs, timestamp: executionHistory[0].timestamp }
    : null;

  const selectedHistory = selectedHistoryId ? executionHistory.find(h => h.id === selectedHistoryId) : null;

  useEffect(() => {
    if (autoScroll && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [runningProcess?.stdout, runningProcess?.stderr, autoScroll]);

  const handleCopy = () => {
    const text = tab === 'output'
      ? (currentOutput ? stripAnsi(currentOutput.stdout + currentOutput.stderr) : '')
      : (selectedHistory ? stripAnsi(selectedHistory.stdout + selectedHistory.stderr) : '');
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="flex items-center gap-1 px-2 py-1 border-b border-border text-xs">
        <button onClick={() => { setTab('output'); setSelectedHistoryId(null); }}
          className={`px-2 py-0.5 rounded cursor-pointer ${tab === 'output' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
          {t('scriptRunner.output')}
        </button>
        <button onClick={() => setTab('history')}
          className={`px-2 py-0.5 rounded cursor-pointer ${tab === 'history' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
          {t('scriptRunner.history')} ({executionHistory.length})
        </button>
        <div className="flex-1" />
        {tab === 'output' && (
          <>
            <button onClick={() => store.clearOutput()} className="px-1.5 hover:text-foreground text-muted-foreground cursor-pointer" title={t('scriptRunner.clearOutput')}>🗑</button>
            <button onClick={handleCopy} className="px-1.5 hover:text-foreground text-muted-foreground cursor-pointer" title={t('scriptRunner.copyOutput')}>📋</button>
            <button onClick={() => setAutoScroll(!autoScroll)}
              className={`px-1.5 cursor-pointer ${autoScroll ? 'text-primary' : 'text-muted-foreground'}`} title={t('scriptRunner.autoScroll')}>
              ↓
            </button>
          </>
        )}
      </div>

      {tab === 'output' ? (
        <div className="flex-1 flex flex-col min-h-0">
          <pre ref={outputRef} className="flex-1 overflow-auto p-2 font-mono text-xs whitespace-pre-wrap">
            {currentOutput ? (
              <>
                {stripAnsi(currentOutput.stdout)}
                {currentOutput.stderr && <span className="text-red-400">{stripAnsi(currentOutput.stderr)}</span>}
              </>
            ) : (
              <span className="text-muted-foreground">{t('scriptRunner.selectOrCreate')}</span>
            )}
          </pre>
          {currentOutput && !runningProcess && (
            <div className="flex items-center gap-3 px-2 py-1 border-t border-border text-[10px] text-muted-foreground">
              <span className={`px-1.5 py-0.5 rounded font-medium ${currentOutput.exitCode === 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                Exit: {currentOutput.exitCode}
              </span>
              <span>{currentOutput.durationMs}ms</span>
              <span>{new Date(currentOutput.timestamp).toLocaleTimeString()}</span>
            </div>
          )}
          {runningProcess && (
            <div className="flex items-center gap-2 px-2 py-1 border-t border-border text-[10px]">
              <span className="text-yellow-500 animate-pulse">● {t('scriptRunner.running')}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          {selectedHistory ? (
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 px-2 py-1 border-b border-border text-xs">
                <button onClick={() => setSelectedHistoryId(null)} className="text-primary cursor-pointer">← Back</button>
                <span className="font-medium">{selectedHistory.scriptName}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] ${selectedHistory.exitCode === 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                  Exit: {selectedHistory.exitCode}
                </span>
                <span className="text-muted-foreground text-[10px]">{selectedHistory.durationMs}ms</span>
              </div>
              <pre className="flex-1 overflow-auto p-2 font-mono text-xs whitespace-pre-wrap">
                {stripAnsi(selectedHistory.stdout)}
                {selectedHistory.stderr && <span className="text-red-400">{stripAnsi(selectedHistory.stderr)}</span>}
              </pre>
            </div>
          ) : executionHistory.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-8">{t('scriptRunner.noHistory')}</div>
          ) : (
            <div className="divide-y divide-border">
              {executionHistory.map(h => (
                <div key={h.id} onClick={() => setSelectedHistoryId(h.id)}
                  className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted/50 cursor-pointer">
                  <span className="font-medium truncate flex-1">{h.scriptName}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${h.exitCode === 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                    {h.exitCode}
                  </span>
                  <span className="text-muted-foreground text-[10px]">{h.durationMs}ms</span>
                  <span className="text-muted-foreground text-[10px]">{new Date(h.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
