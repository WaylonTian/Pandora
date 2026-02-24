import { useState, useRef, useEffect } from 'react';
import { useScriptRunnerStore, type FileEntry } from '../store';
import { templates } from '../templates';
import { useT } from '@/i18n';

function collectDirs(entries: FileEntry[], prefix: string): string[] {
  const dirs: string[] = [prefix];
  for (const e of entries) {
    if (e.is_dir) {
      dirs.push(e.path);
      if (e.children) dirs.push(...collectDirs(e.children, e.path));
    }
  }
  return dirs;
}

export function NewFileDialog({ onClose }: { onClose: () => void }) {
  const t = useT();
  const store = useScriptRunnerStore();
  const [name, setName] = useState('');
  const [targetDir, setTargetDir] = useState(store.scriptsDir);
  const [selectedTemplate, setSelectedTemplate] = useState<{ runtime: string; tpl: { label: string; ext: string; content: string } } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const dirs = collectDirs(store.fileTree, store.scriptsDir);

  const handleSelectTemplate = (runtime: string, tpl: { label: string; ext: string; content: string }) => {
    setSelectedTemplate({ runtime, tpl });
    if (!name || name === 'script.js' || /^script\.\w+$/.test(name)) {
      setName(`script${tpl.ext}`);
    } else {
      // Replace extension
      const base = name.replace(/\.[^.]+$/, '');
      setName(`${base}${tpl.ext}`);
    }
  };

  const handleCreate = () => {
    const finalName = name.trim();
    if (!finalName) return;
    store.createFile(targetDir, finalName, selectedTemplate?.tpl.content || '');
    onClose();
  };

  const preview = selectedTemplate?.tpl.content || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg shadow-xl w-[480px] max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <span className="text-sm font-medium">{t('scriptRunner.newFile')}</span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer">✕</button>
        </div>
        <div className="p-4 space-y-3 overflow-auto">
          {/* File name */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t('scriptRunner.fileName')}</label>
            <input ref={inputRef} value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') onClose(); }}
              placeholder="script.js"
              className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          {/* Target directory */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t('scriptRunner.targetDir')}</label>
            <select value={targetDir} onChange={e => setTargetDir(e.target.value)}
              className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
              {dirs.map(d => (
                <option key={d} value={d}>{d.replace(/\\/g, '/').replace(store.scriptsDir.replace(/\\/g, '/'), '.') || '.'}</option>
              ))}
            </select>
          </div>
          {/* Template selector */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t('scriptRunner.template')}</label>
            <div className="grid grid-cols-2 gap-1">
              {Object.entries(templates).map(([runtime, tpls]) =>
                tpls.map(tpl => (
                  <button key={`${runtime}-${tpl.label}`}
                    onClick={() => handleSelectTemplate(runtime, tpl)}
                    className={`text-left px-2 py-1.5 rounded text-xs border cursor-pointer ${
                      selectedTemplate?.runtime === runtime && selectedTemplate?.tpl.label === tpl.label
                        ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted/50'
                    }`}>
                    <span className="font-medium">{tpl.label}</span>
                    <span className="text-[10px] text-muted-foreground ml-1">{runtime}</span>
                  </button>
                ))
              )}
            </div>
          </div>
          {/* Preview */}
          {preview && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t('scriptRunner.preview')}</label>
              <pre className="bg-background border border-border rounded p-2 text-[11px] font-mono max-h-[120px] overflow-auto">{preview}</pre>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-4 py-2.5 border-t border-border">
          <button onClick={onClose} className="px-3 py-1 text-xs border border-border rounded cursor-pointer">{t('scriptRunner.cancel')}</button>
          <button onClick={handleCreate} disabled={!name.trim()}
            className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded cursor-pointer disabled:opacity-50">{t('scriptRunner.create')}</button>
        </div>
      </div>
    </div>
  );
}
