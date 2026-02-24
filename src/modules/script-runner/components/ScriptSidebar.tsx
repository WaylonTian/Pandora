import { useState, useCallback, useRef } from 'react';
import { useScriptRunnerStore, type FileEntry } from '../store';
import { useT } from '@/i18n';
import { NewFileDialog } from './NewFileDialog';
import { ConfirmDialog } from './Dialogs';

function FileIcon({ ext, isDir }: { ext: string | null; isDir: boolean }) {
  if (isDir) return <span className="text-yellow-500 mr-1.5">📁</span>;
  const colors: Record<string, string> = { js: 'text-yellow-400', py: 'text-blue-400', sh: 'text-green-400', ps1: 'text-blue-300' };
  return <span className={`mr-1.5 ${colors[ext || ''] || 'text-muted-foreground'}`}>📄</span>;
}

// Drag state shared across tree nodes
let draggedPath: string | null = null;

function FileTreeNode({ entry, depth, activeFilePath, onOpen, onDelete, onRename, onRun }: {
  entry: FileEntry; depth: number; activeFilePath: string | null;
  onOpen: (path: string) => void; onDelete: (path: string) => void; onRename: (path: string) => void; onRun: (path: string) => void;
}) {
  const t = useT();
  const store = useScriptRunnerStore();
  const [expanded, setExpanded] = useState(true);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(entry.name);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCtx = (e: React.MouseEvent) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY });
  };

  const handleRenameStart = () => {
    setCtxMenu(null);
    setEditName(entry.name);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const handleRenameCommit = () => {
    setEditing(false);
    const newName = editName.trim();
    if (newName && newName !== entry.name) {
      const parts = entry.path.replace(/\\/g, '/').split('/');
      parts.pop();
      store.renameFile(entry.path, [...parts, newName].join('/'));
    }
  };

  // Drag handlers for internal move
  const handleDragStart = (e: React.DragEvent) => {
    draggedPath = entry.path;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!entry.is_dir || !draggedPath || draggedPath === entry.path) return;
    // Prevent dropping folder into itself
    if (draggedPath && entry.path.replace(/\\/g, '/').startsWith(draggedPath.replace(/\\/g, '/') + '/')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!draggedPath || !entry.is_dir) return;
    const fileName = draggedPath.replace(/\\/g, '/').split('/').pop() || '';
    store.renameFile(draggedPath, `${entry.path.replace(/\\/g, '/')}/${fileName}`);
    draggedPath = null;
  };

  return (
    <div>
      <div
        className={`flex items-center px-2 py-1 text-sm cursor-pointer rounded transition-colors group ${
          dragOver ? 'bg-primary/20 border border-primary/40' :
          !entry.is_dir && activeFilePath === entry.path ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => entry.is_dir ? setExpanded(!expanded) : onOpen(entry.path)}
        onContextMenu={handleCtx}
        onDoubleClick={() => !entry.is_dir && handleRenameStart()}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onDragEnd={() => { draggedPath = null; }}
      >
        {entry.is_dir && <span className="mr-1 text-xs">{expanded ? '▼' : '▶'}</span>}
        <FileIcon ext={entry.extension} isDir={entry.is_dir} />
        {editing ? (
          <input ref={inputRef} value={editName} onChange={e => setEditName(e.target.value)}
            onBlur={handleRenameCommit}
            onKeyDown={e => { if (e.key === 'Enter') handleRenameCommit(); if (e.key === 'Escape') setEditing(false); }}
            className="flex-1 bg-background border border-ring rounded px-1 text-sm focus:outline-none min-w-0"
            onClick={e => e.stopPropagation()} autoFocus />
        ) : (
          <>
            <span className="truncate flex-1">{entry.name}</span>
            {!entry.is_dir && (
              <button className="opacity-0 group-hover:opacity-100 text-green-500 hover:text-green-400 text-xs px-0.5 shrink-0 cursor-pointer"
                onClick={e => { e.stopPropagation(); onRun(entry.path); }} title="Run">▶</button>
            )}
          </>
        )}
      </div>
      {ctxMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setCtxMenu(null)} />
          <div className="fixed z-50 bg-card border border-border rounded-md shadow-lg py-1 text-sm min-w-[140px]"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}>
            {!entry.is_dir && (
              <button className="w-full px-3 py-1.5 text-left hover:bg-muted/50 cursor-pointer" onClick={() => { setCtxMenu(null); onRun(entry.path); }}>
                {t('scriptRunner.run')}
              </button>
            )}
            <button className="w-full px-3 py-1.5 text-left hover:bg-muted/50 cursor-pointer" onClick={handleRenameStart}>
              {t('scriptRunner.rename')}
            </button>
            <button className="w-full px-3 py-1.5 text-left hover:bg-muted/50 text-destructive cursor-pointer" onClick={() => { setCtxMenu(null); onDelete(entry.path); }}>
              {t('scriptRunner.delete')}
            </button>
          </div>
        </>
      )}
      {entry.is_dir && expanded && entry.children?.map(child => (
        <FileTreeNode key={child.path} entry={child} depth={depth + 1}
          activeFilePath={activeFilePath} onOpen={onOpen} onDelete={onDelete} onRename={onRename} onRun={onRun} />
      ))}
    </div>
  );
}

export function ScriptSidebar() {
  const t = useT();
  const store = useScriptRunnerStore();
  const [showNewFile, setShowNewFile] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [newFolderInput, setNewFolderInput] = useState(false);
  const [folderName, setFolderName] = useState('');
  const folderRef = useRef<HTMLInputElement>(null);

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

  const handleDelete = (path: string) => setConfirmDelete(path);

  const handleRename = (_path: string) => {
    // Inline rename is handled by FileTreeNode double-click / context menu
  };

  const handleRun = async (path: string) => {
    await store.openFile(path);
    store.startScript();
  };

  const handleNewFolder = () => {
    setNewFolderInput(true);
    setFolderName('');
    setTimeout(() => folderRef.current?.focus(), 0);
  };

  const handleFolderCreate = () => {
    setNewFolderInput(false);
    if (folderName.trim()) store.createFolder(`${store.scriptsDir}/${folderName.trim()}`);
  };

  const handleImport = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({ multiple: true, filters: [{ name: 'Scripts', extensions: ['js', 'mjs', 'cjs', 'py', 'sh', 'ps1', 'ts', 'json'] }] });
      if (!selected) return;
      const paths = Array.isArray(selected) ? selected : [selected];
      const { readTextFile } = await import('@tauri-apps/plugin-fs');
      for (const p of paths) {
        const name = (p as string).replace(/\\/g, '/').split('/').pop() || '';
        const content = await readTextFile(p as string);
        await store.createFile(store.scriptsDir, name, content);
      }
    } catch { /* ok */ }
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
          <button onClick={() => setShowNewFile(true)}
            className="flex-1 px-2 py-1 bg-primary text-primary-foreground rounded text-xs font-medium hover:opacity-90 cursor-pointer">
            {t('scriptRunner.newFile')}
          </button>
          <button onClick={handleNewFolder}
            className="px-2 py-1 border border-border rounded text-xs hover:bg-muted/50 cursor-pointer" title={t('scriptRunner.newFolder')}>
            📁+
          </button>
          <button onClick={handleImport}
            className="px-2 py-1 border border-border rounded text-xs hover:bg-muted/50 cursor-pointer" title={t('scriptRunner.import')}>
            📥
          </button>
        </div>
        {/* Inline new folder input */}
        {newFolderInput && (
          <input ref={folderRef} value={folderName} onChange={e => setFolderName(e.target.value)}
            onBlur={handleFolderCreate}
            onKeyDown={e => { if (e.key === 'Enter') handleFolderCreate(); if (e.key === 'Escape') setNewFolderInput(false); }}
            placeholder={t('scriptRunner.folderName')}
            className="w-full bg-background border border-ring rounded px-2 py-1 text-xs focus:outline-none" autoFocus />
        )}
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {tree.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-4">{t('scriptRunner.selectOrCreate')}</div>
        ) : (
          tree.map(entry => (
            <FileTreeNode key={entry.path} entry={entry} depth={0}
              activeFilePath={store.activeFilePath} onOpen={p => store.openFile(p)}
              onDelete={handleDelete} onRename={handleRename} onRun={handleRun} />
          ))
        )}
      </div>
      <div className="p-2 border-t border-border flex items-center gap-1 text-[10px] text-muted-foreground">
        <span className="truncate flex-1" title={store.scriptsDir}>{store.scriptsDir.split('/').pop()}</span>
        <button onClick={handleChangeDir} className="hover:text-foreground cursor-pointer" title={t('scriptRunner.changeDir')}>⚙</button>
      </div>

      {showNewFile && <NewFileDialog onClose={() => setShowNewFile(false)} />}
      {confirmDelete && (
        <ConfirmDialog
          message={t('scriptRunner.confirmDelete')}
          onConfirm={() => { store.deleteFile(confirmDelete); setConfirmDelete(null); }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
