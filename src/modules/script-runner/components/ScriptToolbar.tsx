import { useState, useEffect } from 'react';
import { useScriptRunnerStore } from '../store';
import { useT } from '@/i18n';
import { ConfirmDialog } from './Dialogs';

export function ScriptToolbar() {
  const t = useT();
  const store = useScriptRunnerStore();
  const { activeFilePath, meta, scriptsDir, runningProcess } = store;
  const [showEnv, setShowEnv] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!activeFilePath) return null;

  const fileName = activeFilePath.replace(/\\/g, '/').split('/').pop() || '';
  const relPath = activeFilePath.replace(/\\/g, '/').replace(scriptsDir.replace(/\\/g, '/'), '').replace(/^\//, '');
  const config = meta.scripts[relPath];
  const scriptDir = activeFilePath.replace(/\\/g, '/').split('/').slice(0, -1).join('/');
  const effectiveWorkDir = config?.working_dir || scriptDir;

  const handleChangeWorkDir = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({ directory: true });
      if (selected) store.updateMeta(activeFilePath, { working_dir: selected as string });
    } catch { /* ok */ }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-card text-sm">
      <span className="font-medium truncate max-w-[200px]" title={fileName}>{fileName}</span>
      <div className="flex-1" />

      <div className="flex items-center gap-0.5">
        <button onClick={handleChangeWorkDir} className="text-xs text-muted-foreground hover:text-foreground cursor-pointer truncate max-w-[120px]"
          title={effectiveWorkDir}>
          📂 {effectiveWorkDir.replace(/\\/g, '/').split('/').pop()}
        </button>
        {config?.working_dir && (
          <button onClick={() => store.updateMeta(activeFilePath, { working_dir: null })}
            className="text-[10px] text-muted-foreground hover:text-destructive cursor-pointer" title={t('scriptRunner.resetWorkDir')}>✕</button>
        )}
      </div>

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

      <button onClick={() => setShowDeleteConfirm(true)} className="text-destructive hover:bg-destructive/10 px-1.5 py-1 rounded text-xs cursor-pointer">🗑</button>

      {showEnv && <EnvVarsInline onClose={() => setShowEnv(false)} />}
      {showDeleteConfirm && (
        <ConfirmDialog message={t('scriptRunner.confirmDelete')}
          onConfirm={() => { store.deleteFile(activeFilePath); setShowDeleteConfirm(false); }}
          onCancel={() => setShowDeleteConfirm(false)} />
      )}
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
