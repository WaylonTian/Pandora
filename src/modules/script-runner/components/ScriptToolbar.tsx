import { useState, useRef, useEffect } from 'react';
import { useScriptRunnerStore } from '../store';
import { useT } from '@/i18n';

export function ScriptToolbar() {
  const t = useT();
  const store = useScriptRunnerStore();
  const { activeFilePath, meta, scriptsDir, runningProcess, runtimes } = store;
  const [showEnv, setShowEnv] = useState(false);
  const [showRuntimePicker, setShowRuntimePicker] = useState(false);
  const argsRef = useRef<HTMLInputElement>(null);

  if (!activeFilePath) return null;

  const fileName = activeFilePath.replace(/\\/g, '/').split('/').pop() || '';
  const ext = fileName.split('.').pop() || '';
  const relPath = activeFilePath.replace(/\\/g, '/').replace(scriptsDir.replace(/\\/g, '/'), '').replace(/^\//, '');
  const config = meta.scripts[relPath];
  const runtime = config?.runtime_override || inferRuntime(ext);

  const handleArgsBlur = () => {
    if (argsRef.current) {
      store.updateMeta(activeFilePath, { last_args: argsRef.current.value || null });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      store.startScript();
    }
  };

  const handleDelete = () => {
    if (window.confirm(t('scriptRunner.confirmDelete'))) store.deleteFile(activeFilePath);
  };

  const handleChangeWorkDir = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({ directory: true });
      if (selected) store.updateMeta(activeFilePath, { working_dir: selected as string });
    } catch { /* ok */ }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-card text-sm flex-wrap" onKeyDown={handleKeyDown}>
      <span className="font-medium truncate max-w-[140px]" title={fileName}>{fileName}</span>
      <div className="relative">
        <button onClick={() => setShowRuntimePicker(!showRuntimePicker)}
          className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted/50 hover:bg-muted cursor-pointer uppercase">
          {runtime}
        </button>
        {showRuntimePicker && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowRuntimePicker(false)} />
            <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded shadow-lg py-1 min-w-[100px]">
              {runtimes.filter(r => r.available).map(r => (
                <button key={r.command} className="w-full px-3 py-1 text-left text-xs hover:bg-muted/50 cursor-pointer"
                  onClick={() => { store.updateMeta(activeFilePath, { runtime_override: r.command }); setShowRuntimePicker(false); }}>
                  {r.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <input ref={argsRef} defaultValue={config?.last_args || ''} onBlur={handleArgsBlur}
        className="flex-1 min-w-[120px] bg-background border border-border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        placeholder={t('scriptRunner.args')} />
      <button onClick={handleChangeWorkDir} className="text-xs text-muted-foreground hover:text-foreground cursor-pointer truncate max-w-[100px]"
        title={config?.working_dir || t('scriptRunner.workingDir')}>
        📂 {config?.working_dir ? config.working_dir.split('/').pop() : t('scriptRunner.workingDir')}
      </button>
      <button onClick={() => setShowEnv(!showEnv)}
        className="px-2 py-1 text-xs border border-border rounded hover:bg-muted/50 cursor-pointer">
        {t('scriptRunner.envVars')}
      </button>
      {runningProcess ? (
        <button onClick={() => store.stopScript()}
          className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 cursor-pointer">
          {t('scriptRunner.stop')}
        </button>
      ) : (
        <button onClick={() => store.startScript()}
          className="px-3 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 cursor-pointer">
          {t('scriptRunner.run')}
        </button>
      )}
      <button onClick={handleDelete} className="text-destructive hover:bg-destructive/10 px-1.5 py-1 rounded text-xs cursor-pointer">🗑</button>
      {showEnv && <EnvVarsInline onClose={() => setShowEnv(false)} />}
    </div>
  );
}

function EnvVarsInline({ onClose }: { onClose: () => void }) {
  const t = useT();
  const store = useScriptRunnerStore();
  const { meta, activeFilePath, scriptsDir } = store;
  const [tab, setTab] = useState<'global' | 'script'>('global');
  const relPath = activeFilePath ? activeFilePath.replace(/\\/g, '/').replace(scriptsDir.replace(/\\/g, '/'), '').replace(/^\//, '') : '';
  const scriptEnv = meta.scripts[relPath]?.env || {};

  const [entries, setEntries] = useState<[string, string][]>(
    tab === 'global' ? Object.entries(meta.global_env) : Object.entries(scriptEnv)
  );

  useEffect(() => {
    setEntries(tab === 'global' ? Object.entries(meta.global_env) : Object.entries(scriptEnv));
  }, [tab]);

  const save = () => {
    const env = Object.fromEntries(entries.filter(([k]) => k.trim()));
    if (tab === 'global') store.setGlobalEnv(env);
    else if (activeFilePath) store.updateMeta(activeFilePath, { env });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg shadow-xl p-4 w-[400px] max-h-[60vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="flex gap-2 mb-3">
          <button onClick={() => setTab('global')} className={`px-3 py-1 text-xs rounded cursor-pointer ${tab === 'global' ? 'bg-primary text-primary-foreground' : 'bg-muted/50'}`}>
            {t('scriptRunner.globalEnv')}
          </button>
          {activeFilePath && (
            <button onClick={() => setTab('script')} className={`px-3 py-1 text-xs rounded cursor-pointer ${tab === 'script' ? 'bg-primary text-primary-foreground' : 'bg-muted/50'}`}>
              {t('scriptRunner.scriptEnv')}
            </button>
          )}
        </div>
        <div className="space-y-1">
          {entries.map(([k, v], i) => (
            <div key={i} className="flex gap-1">
              <input className="flex-1 bg-background border border-border rounded px-2 py-1 text-xs" placeholder="KEY" value={k}
                onChange={e => { const n = [...entries]; n[i] = [e.target.value, v]; setEntries(n); }} />
              <input className="flex-1 bg-background border border-border rounded px-2 py-1 text-xs" placeholder="VALUE" value={v}
                onChange={e => { const n = [...entries]; n[i] = [k, e.target.value]; setEntries(n); }} />
              <button onClick={() => setEntries(entries.filter((_, j) => j !== i))} className="text-destructive text-xs px-1 cursor-pointer">✕</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={() => setEntries([...entries, ['', '']])} className="text-xs text-primary cursor-pointer">{t('scriptRunner.addRow')}</button>
          <div className="flex-1" />
          <button onClick={onClose} className="px-3 py-1 text-xs border border-border rounded cursor-pointer">{t('scriptRunner.cancel')}</button>
          <button onClick={save} className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded cursor-pointer">{t('scriptRunner.save')}</button>
        </div>
      </div>
    </div>
  );
}

function inferRuntime(ext: string): string {
  switch (ext) {
    case 'js': case 'mjs': case 'cjs': return 'node';
    case 'py': return 'python';
    case 'sh': return 'bash';
    case 'ps1': return 'powershell';
    default: return 'node';
  }
}
