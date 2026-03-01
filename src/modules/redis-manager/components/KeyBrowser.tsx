import { useState, useMemo } from "react";
import { useRedisStore, type KeyInfo } from "../store";
import { useT } from "@/i18n";
import { Input } from "@/components/ui/input";

interface TreeNode {
  name: string;
  fullKey?: string;
  keyInfo?: KeyInfo;
  children: Record<string, TreeNode>;
}

function buildTree(keys: KeyInfo[]): TreeNode {
  const root: TreeNode = { name: '', children: {} };
  for (const k of keys) {
    const parts = k.key.split(':');
    let node = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!node.children[part]) {
        node.children[part] = { name: part, children: {} };
      }
      node = node.children[part];
    }
    node.fullKey = k.key;
    node.keyInfo = k;
  }
  return root;
}

const TYPE_COLORS: Record<string, string> = {
  string: 'text-green-500', hash: 'text-yellow-500', list: 'text-blue-500',
  set: 'text-purple-500', zset: 'text-orange-500',
};

function TreeItem({ node, depth, selectedKey, onSelect }: {
  node: TreeNode; depth: number; selectedKey: string | null; onSelect: (key: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const childEntries = Object.values(node.children);
  const isLeaf = node.fullKey !== undefined && childEntries.length === 0;
  const hasChildren = childEntries.length > 0;

  if (isLeaf && node.keyInfo) {
    return (
      <div className={`flex items-center gap-1 px-1 py-0.5 text-xs cursor-pointer rounded ${node.fullKey === selectedKey ? 'bg-accent/20' : 'hover:bg-muted'}`}
        style={{ paddingLeft: depth * 12 + 4 }} onClick={() => onSelect(node.fullKey!)}>
        <span className={`font-mono text-[10px] ${TYPE_COLORS[node.keyInfo.key_type] || ''}`}>
          {node.keyInfo.key_type[0]?.toUpperCase()}
        </span>
        <span className="truncate">{node.name}</span>
        {node.keyInfo.ttl >= 0 && <span className="text-muted-foreground ml-auto text-[10px]">{node.keyInfo.ttl}s</span>}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-1 px-1 py-0.5 text-xs cursor-pointer hover:bg-muted rounded"
        style={{ paddingLeft: depth * 12 + 4 }} onClick={() => setExpanded(!expanded)}>
        <svg viewBox="0 0 24 24" className={`w-3 h-3 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m9 18 6-6-6-6"/>
        </svg>
        <span className="truncate">{node.name}</span>
        <span className="text-muted-foreground ml-auto text-[10px]">{childEntries.length}</span>
      </div>
      {expanded && hasChildren && childEntries.map(child => (
        <TreeItem key={child.name} node={child} depth={depth + 1} selectedKey={selectedKey} onSelect={onSelect} />
      ))}
    </div>
  );
}

export function KeyBrowser() {
  const t = useT();
  const { keys, scanCursor, scanPattern, setScanPattern, scanKeys, selectKey, selectedKey } = useRedisStore();
  const [filterInput, setFilterInput] = useState(scanPattern);
  const tree = useMemo(() => buildTree(keys), [keys]);

  const handleFilter = () => {
    setScanPattern(filterInput || '*');
    scanKeys(true);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 border-t border-border">
      <div className="p-2 flex gap-1">
        <Input className="h-7 text-xs" placeholder={t('redisManager.filter')} value={filterInput}
          onChange={e => setFilterInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleFilter()} />
      </div>
      <div className="flex-1 overflow-auto px-1">
        {Object.values(tree.children).map(node => (
          <TreeItem key={node.name} node={node} depth={0} selectedKey={selectedKey} onSelect={selectKey} />
        ))}
        {keys.length === 0 && <div className="text-xs text-muted-foreground p-2">{t('redisManager.noKeys')}</div>}
      </div>
      {scanCursor !== 0 && (
        <button className="text-xs text-primary hover:underline p-2" onClick={() => scanKeys(false)}>
          {t('redisManager.loadMore')} ({keys.length} loaded)
        </button>
      )}
    </div>
  );
}
