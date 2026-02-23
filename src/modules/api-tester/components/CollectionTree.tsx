import { useState } from 'react';
import { useT } from '@/i18n';
import { useStore, Request, CollectionTreeNode, buildCollectionTree } from '../store';
import { Icons } from './Icons';

interface Props {
  onOpenRequest: (req: Request) => void;
  onContextMenu: (e: React.MouseEvent, type: 'collection' | 'request', id: number) => void;
}

function getMethodClass(method: string) {
  return `method-${method.toLowerCase()}`;
}

function CollectionNode({ node, onOpenRequest, onContextMenu, collapsedSet, toggleCollapse }: {
  node: CollectionTreeNode;
  onOpenRequest: (req: Request) => void;
  onContextMenu: (e: React.MouseEvent, type: 'collection' | 'request', id: number) => void;
  collapsedSet: Set<number>;
  toggleCollapse: (id: number) => void;
}) {
  const isCollapsed = node.collection.id ? collapsedSet.has(node.collection.id) : false;

  return (
    <div>
      <div className="tree-item collection-item"
        style={{ paddingLeft: 10 + node.depth * 16 }}
        onContextMenu={e => node.collection.id && onContextMenu(e, 'collection', node.collection.id)}
        onDoubleClick={() => node.collection.id && toggleCollapse(node.collection.id)}>
        <span className={`collapse-icon ${isCollapsed ? 'collapsed' : ''}`}
          onClick={() => node.collection.id && toggleCollapse(node.collection.id)}>▶</span>
        {Icons.folder}
        <span className="name">{node.collection.name}</span>
        <span className="collection-count">{node.requests.length}</span>
      </div>
      {!isCollapsed && (
        <>
          {node.children.map(child => (
            <CollectionNode key={child.collection.id} node={child}
              onOpenRequest={onOpenRequest} onContextMenu={onContextMenu}
              collapsedSet={collapsedSet} toggleCollapse={toggleCollapse} />
          ))}
          {node.requests.map(req => (
            <div key={req.id} className="tree-item"
              style={{ paddingLeft: 26 + node.depth * 16 }}
              onClick={() => onOpenRequest(req)}
              onContextMenu={e => req.id && onContextMenu(e, 'request', req.id)}>
              <span className={`method ${getMethodClass(req.method)}`}>{req.method}</span>
              <span className="name">{req.name}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export function CollectionTree({ onOpenRequest, onContextMenu }: Props) {
  const t = useT();
  const store = useStore();
  const [collapsedSet, setCollapsedSet] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');

  const tree = buildCollectionTree(store.collections, store.requests);
  const orphanRequests = store.requests.filter(r => !r.collection_id);

  const toggleCollapse = (id: number) => {
    setCollapsedSet(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const matchesSearch = (name: string) => !search || name.toLowerCase().includes(search.toLowerCase());

  const filterTree = (nodes: CollectionTreeNode[]): CollectionTreeNode[] => {
    if (!search) return nodes;
    return nodes.map(node => {
      const filteredChildren = filterTree(node.children);
      const filteredRequests = node.requests.filter(r => matchesSearch(r.name) || matchesSearch(r.url));
      if (filteredChildren.length || filteredRequests.length || matchesSearch(node.collection.name)) {
        return { ...node, children: filteredChildren, requests: filteredRequests.length || matchesSearch(node.collection.name) ? (filteredRequests.length ? filteredRequests : node.requests) : filteredRequests };
      }
      return null;
    }).filter(Boolean) as CollectionTreeNode[];
  };

  const filteredTree = filterTree(tree);
  const filteredOrphans = orphanRequests.filter(r => matchesSearch(r.name) || matchesSearch(r.url));

  const handleAddCollection = () => {
    const name = prompt(t('apiTester.newCollection'));
    if (name?.trim()) store.createCollection(name.trim());
  };

  return (
    <>
      <div className="sidebar-header">
        <span className="sidebar-title">{t('apiTester.collections')}</span>
        <button className="icon-btn" onClick={handleAddCollection} title={t('apiTester.newCollection')}>+</button>
      </div>
      <div style={{ marginBottom: 8 }}>
        <input className="kv-input" placeholder={t('apiTester.searchPlaceholder')} value={search}
          onChange={e => setSearch(e.target.value)} />
      </div>
      {filteredTree.map(node => (
        <CollectionNode key={node.collection.id} node={node}
          onOpenRequest={onOpenRequest} onContextMenu={onContextMenu}
          collapsedSet={collapsedSet} toggleCollapse={toggleCollapse} />
      ))}
      {filteredOrphans.map(req => (
        <div key={req.id} className="tree-item" onClick={() => onOpenRequest(req)}
          onContextMenu={e => req.id && onContextMenu(e, 'request', req.id)}>
          <span className={`method ${getMethodClass(req.method)}`}>{req.method}</span>
          <span className="name">{req.name}</span>
        </div>
      ))}
    </>
  );
}
