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

const DEFAULT_JSON = '{\n  "key1": "value1",\n  "key2": "value2"\n}';

export function ScriptRunner() {
  const t = useT();
  const store = useScriptRunnerStore();
  const { isDark } = useThemeStore();
  const [vRatio, setVRatio] = useState(0.55);
  const [hRatio, setHRatio] = useState(0.45);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { store.init(); }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); store.startScript(); }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'K') { e.preventDefault(); store.clearOutput(); }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') { e.preventDefault(); store.stopScript(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleVDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const onMove = (ev: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setVRatio(Math.max(0.2, Math.min(0.8, (ev.clientY - rect.top) / rect.height)));
    };
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  const handleHDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const onMove = (ev: MouseEvent) => {
      if (!bottomRef.current) return;
      const rect = bottomRef.current.getBoundingClientRect();
      setHRatio(Math.max(0.15, Math.min(0.85, (ev.clientX - rect.left) / rect.width)));
    };
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
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

  // JSON input value per script
  const relPath = store.activeFilePath
    ? store.activeFilePath.replace(/\\/g, '/').replace(store.scriptsDir.replace(/\\/g, '/'), '').replace(/^\//, '')
    : '';
  const config = store.meta.scripts[relPath];
  const jsonValue = config?.args_json || DEFAULT_JSON;

  const handleJsonChange = (value: string | undefined) => {
    if (store.activeFilePath) {
      store.updateMeta(store.activeFilePath, { args_json: value || '' });
    }
  };

  const handleEditorContext = (e: React.MouseEvent) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY });
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
              {/* Top: Code editor */}
              <div style={{ flex: vRatio }} className="min-h-0" onContextMenu={handleEditorContext}>
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
                onMouseDown={handleVDrag}
                onDoubleClick={() => setVRatio(vRatio > 0.5 ? 0.25 : 0.55)} />
              {/* Bottom: JSON input (left) | Output (right) */}
              <div ref={bottomRef} style={{ flex: 1 - vRatio }} className="min-h-0 flex">
                <div style={{ flex: hRatio }} className="min-w-0 flex flex-col border-r border-border">
                  <div className="px-2 py-1 border-b border-border text-[10px] text-muted-foreground font-medium">
                    JSON Input
                  </div>
                  <div className="flex-1 min-h-0">
                    <Editor
                      height="100%"
                      language="json"
                      value={jsonValue}
                      onChange={handleJsonChange}
                      theme={isDark ? 'vs-dark' : 'light'}
                      options={{ minimap: { enabled: false }, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", lineNumbers: 'off', scrollBeyondLastLine: false, padding: { top: 4 } }}
                    />
                  </div>
                </div>
                <div className="w-1 bg-border cursor-col-resize hover:bg-primary/50 transition-colors shrink-0"
                  onMouseDown={handleHDrag} />
                <div style={{ flex: 1 - hRatio }} className="min-w-0">
                  <OutputPanel />
                </div>
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
      {ctxMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setCtxMenu(null)} />
          <div className="fixed z-50 bg-card border border-border rounded-md shadow-lg py-1 text-sm min-w-[120px]"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}>
            <button className="w-full px-3 py-1.5 text-left hover:bg-muted/50 cursor-pointer"
              onClick={() => { setCtxMenu(null); store.startScript(); }}>
              {t('scriptRunner.run')}
            </button>
            <button className="w-full px-3 py-1.5 text-left hover:bg-muted/50 cursor-pointer"
              onClick={() => { setCtxMenu(null); store.stopScript(); }}>
              {t('scriptRunner.stop')}
            </button>
            <button className="w-full px-3 py-1.5 text-left hover:bg-muted/50 cursor-pointer"
              onClick={() => { setCtxMenu(null); store.clearOutput(); }}>
              {t('scriptRunner.clearOutput')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
