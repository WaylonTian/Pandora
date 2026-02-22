import { useEffect, useState, useRef, useCallback } from 'react';
import { useScriptRunnerStore } from './store';
import { useThemeStore } from '@/stores/theme';
import Editor from '@monaco-editor/react';
import { ScriptSidebar } from './components/ScriptSidebar';
import { ScriptToolbar } from './components/ScriptToolbar';
import { OutputPanel } from './components/OutputPanel';
import { useT } from '@/i18n';

function getLanguage(ext: string): string {
  switch (ext) {
    case 'js': case 'mjs': case 'cjs': return 'javascript';
    case 'ts': return 'typescript';
    case 'py': return 'python';
    case 'sh': return 'shell';
    case 'ps1': return 'powershell';
    case 'json': return 'json';
    default: return 'plaintext';
  }
}

export function ScriptRunner() {
  const t = useT();
  const store = useScriptRunnerStore();
  const { isDark } = useThemeStore();
  const [splitRatio, setSplitRatio] = useState(0.65);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { store.init(); }, []);

  // Keyboard shortcut: Ctrl+Enter to run
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        store.startScript();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const ratio = (ev.clientY - rect.top) / rect.height;
      setSplitRatio(Math.max(0.2, Math.min(0.85, ratio)));
    };
    const onUp = () => { dragging.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  const handleEditorChange = (value: string | undefined) => {
    const v = value || '';
    store.setOpenFileContent(v);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (store.activeFilePath) {
      const path = store.activeFilePath;
      saveTimer.current = setTimeout(() => store.saveFile(path, v), 500);
    }
  };

  const ext = store.activeFilePath?.split('.').pop() || '';

  return (
    <div className="flex h-full bg-background text-foreground">
      <ScriptSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {store.activeFilePath ? (
          <>
            <ScriptToolbar />
            <div ref={containerRef} className="flex-1 flex flex-col min-h-0">
              <div style={{ flex: splitRatio }} className="min-h-0">
                <Editor
                  height="100%"
                  language={getLanguage(ext)}
                  value={store.openFileContent || ''}
                  onChange={handleEditorChange}
                  theme={isDark ? 'vs-dark' : 'light'}
                  options={{ minimap: { enabled: false }, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", padding: { top: 12 } }}
                />
              </div>
              <div className="h-1 bg-border cursor-row-resize hover:bg-primary/50 transition-colors shrink-0"
                onMouseDown={handleDragStart}
                onDoubleClick={() => setSplitRatio(splitRatio > 0.5 ? 0.2 : 0.65)} />
              <div style={{ flex: 1 - splitRatio }} className="min-h-0">
                <OutputPanel />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <svg viewBox="0 0 24 24" className="w-12 h-12 opacity-20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
            </svg>
            <p className="text-sm">{t('scriptRunner.selectOrCreate')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
