import { useState, useCallback } from 'react';
import { useScriptRunnerStore, type FileEntry } from '../store';
import { templates } from '../templates';
import { useT } from '@/i18n';

function FileIcon({ ext, isDir }: { ext: string | null; isDir: boolean }) {
  if (isDir) return <span className="text-yellow-500 mr-1.5">📁</span>;
  const colors: Record<string, string> = { js: 'text-yellow-400', py: 'text-blue-400', sh: 'text-green-400', ps1: 'text-blue-300' };
  return <span className={`mr-1.5 ${colors[ext || ''] || 'text-muted-foreground'}`}>📄</span>;
}

function FileTreeNode({ entry, depth, activeFilePath, onOpen, onDelete, onRename }: {
  entry: FileEntry; depth: number; activeFilePath: string | null;
  onOpen: (path: string) => void; onDelete: (path: string) => void; onRename: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);

  const handleCtx = (e: React.MouseEvent) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY });
  };

  return (
    <div>
      <div
        className={`flex items-center px-2 py-1 text-sm cursor-pointer rounded transition-colors ${
          !entry.is_dir && activeFilePath === entry.path ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => entry.is_dir ? setExpanded(!expanded) : onOpen(entry.path)}
        onContextMenu={handleCtx}
      >
        {entry.is_dir && <span className="mr-1 text-xs">{expanded ? '▼' : '▶'}</span>}
        <FileIcon ext={entry.extension} isDir={entry.is_dir} />
        <span className="truncate">{entry.name}</span>
      </div>
      {ctxMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setCtxMenu(null)} />
          <div className="fixed z-50 bg-card border border-border rounded-md shadow-lg py-1 text-sm min-w-[120px]"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}>
            <button className="w-full px-3 py-1.5 text-left hover:bg-muted/50" onClick={() => { setCtxMenu(null); onRename(entry.path); }}>Rename</button>
            <button className="w-full px-3 py-1.5 text-left hover:bg-muted/50 text-destructive" onClick={() => { setCtxMenu(null); onDelete(entry.path); }}>Delete</button>
          </div>
        </>
      )}
      {entry.is_dir && expanded && entry.children?.map(child => (
        <FileTreeNode key={child.path} entry={child} depth={depth + 1}
          activeFilePath={activeFilePath} onOpen={onOpen} onDelete={onDelete} onRename={onRename} />
      ))}
    </div>
  );
}

export function ScriptSidebar() {
  const t = useT();
  const store = useScriptRunnerStore();
  const [showTemplates, setShowTemplates] = useState(false);

  const filteredTree = useCallback((entries: FileEntry[]): FileEntry[] => {
    if (!store.searchQuery) return entries;
    const q = store.searchQuery.toLowerCase();
    return entries.reduce<FileEntry[]>((acc, e) => {
      if (e.is_dir) {
        const filtered = filteredTree(e.children || []);
        if (filtered.length) acc.push({ ...e, children: filtered });
      } else if (e.name.toLowerCase().includes(q)) {
        acc.push(e);
      }
      return acc;
    }, []);
  }, [store.searchQuery]);

  const handleNewFile = (_runtime: string, tpl: { ext: string; content: string }) => {
    setShowTemplates(false);
    const name = window.prompt(t('scriptRunner.fileName'), `script${tpl.ext}`);
    if (name) store.createFile(store.scriptsDir, name, tpl.content);
  };

  const handleNewFolder = () => {
    const name = window.prompt(t('scriptRunner.folderName'));
    if (name) store.createFolder(`${store.scriptsDir}/${name}`);
  };

  const handleDelete = (path: string) => {
    if (window.confirm(t('scriptRunner.confirmDelete'))) store.deleteFile(path);
  };

  const handleRename = (path: string) => {
    const parts = path.replace(/\\/g, '/').split('/');
    const oldName = parts.pop() || '';
    const newName = window.prompt(t('scriptRunner.rename'), oldName);
    if (newName && newName !== oldName) {
      store.renameFile(path, [...parts, newName].join('/'));
    }
  };

  const handleChangeDir = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({ directory: true });
      if (selected) store.setScriptsDir(selected as string);
    } catch { /* ok */ }
  };

  const tree = filteredTree(store.fileTree);

  return (
    <div className="w-52 border-r border-border bg-card flex flex-col shrink-0">
      <div className="p-2 border-b border-border space-y-1.5">
        <input
          className="w-full bg-background border border-border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder={t('scriptRunner.search')}
          value={store.searchQuery}
          onChange={e => store.setSearchQuery(e.target.value)}
        />
        <div className="flex gap-1">
          <button onClick={() => setShowTemplates(!showTemplates)}
            className="flex-1 px-2 py-1 bg-primary text-primary-foreground rounded text-xs font-medium hover:opacity-90 cursor-pointer">
            {t('scriptRunner.newFile')}
          </button>
          <button onClick={handleNewFolder}
            className="px-2 py-1 border border-border rounded text-xs hover:bg-muted/50 cursor-pointer">
            📁+
          </button>
        </div>
        {showTemplates && (
          <div className="bg-background border border-border rounded p-1.5 text-xs space-y-1">
            {Object.entries(templates).map(([runtime, tpls]) => (
              <div key={runtime}>
                <div className="font-medium text-muted-foreground uppercase text-[10px] px-1">{runtime}</div>
                {tpls.map(tpl => (
                  <button key={tpl.label} onClick={() => handleNewFile(runtime, tpl)}
                    className="w-full text-left px-2 py-0.5 rounded hover:bg-muted/50 cursor-pointer">
                    {tpl.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {tree.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-4">{t('scriptRunner.selectOrCreate')}</div>
        ) : (
          tree.map(entry => (
            <FileTreeNode key={entry.path} entry={entry} depth={0}
              activeFilePath={store.activeFilePath} onOpen={p => store.openFile(p)}
              onDelete={handleDelete} onRename={handleRename} />
          ))
        )}
      </div>
      <div className="p-2 border-t border-border flex items-center gap-1 text-[10px] text-muted-foreground">
        <span className="truncate flex-1" title={store.scriptsDir}>{store.scriptsDir.split('/').pop()}</span>
        <button onClick={handleChangeDir} className="hover:text-foreground cursor-pointer" title={t('scriptRunner.changeDir')}>⚙</button>
      </div>
    </div>
  );
}
