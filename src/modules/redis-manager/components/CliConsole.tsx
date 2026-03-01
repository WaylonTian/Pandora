import { useState, useRef, useEffect } from "react";
import { useRedisStore } from "../store";
import { useT } from "@/i18n";

export function CliConsole() {
  const t = useT();
  const { cliOutput, cliHistory, executeCommand, clearCliOutput } = useRedisStore();
  const [input, setInput] = useState('');
  const [historyIdx, setHistoryIdx] = useState(-1);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    outputRef.current?.scrollTo(0, outputRef.current.scrollHeight);
  }, [cliOutput]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim()) {
      executeCommand(input.trim());
      setInput('');
      setHistoryIdx(-1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newIdx = Math.min(historyIdx + 1, cliHistory.length - 1);
      setHistoryIdx(newIdx);
      if (newIdx >= 0) setInput(cliHistory[cliHistory.length - 1 - newIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIdx = historyIdx - 1;
      setHistoryIdx(newIdx);
      setInput(newIdx >= 0 ? cliHistory[cliHistory.length - 1 - newIdx] : '');
    }
  };

  return (
    <div className="h-full flex flex-col border-t border-border">
      <div className="flex items-center justify-between px-2 py-1 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground">{t('redisManager.cli')}</span>
        <button className="text-xs text-muted-foreground hover:text-foreground" onClick={clearCliOutput}>{t('redisManager.clear')}</button>
      </div>
      <div ref={outputRef} className="flex-1 overflow-auto p-2 font-mono text-xs whitespace-pre-wrap">
        {cliOutput.map((line, i) => (
          <div key={i} className={line.startsWith('>') ? 'text-primary' : 'text-foreground'}>{line}</div>
        ))}
      </div>
      <div className="flex items-center border-t border-border px-2">
        <span className="text-xs text-muted-foreground mr-1">&gt;</span>
        <input className="flex-1 bg-transparent text-xs font-mono py-1.5 focus:outline-none"
          value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
          placeholder={t('redisManager.executeCommand')} />
      </div>
    </div>
  );
}
