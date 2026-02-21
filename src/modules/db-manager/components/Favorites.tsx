import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { tauriCommands, FavoriteItem, FavoriteType, useAppStore } from "../store/index";

/**
 * Favorites Component
 * 
 * 收藏夹面板，支持：
 * - 显示收藏的表和 SQL 查询
 * - 添加/删除收藏
 * - 快速打开收藏的表或执行收藏的 SQL
 */

// ============================================================================
// Icon Components
// ============================================================================

function StarIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function TableIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  );
}

function CodeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

// ============================================================================
// Sub Components
// ============================================================================

interface FavoriteItemRowProps {
  item: FavoriteItem;
  onOpen: () => void;
  onDelete: () => void;
}

function FavoriteItemRow({ item, onOpen, onDelete }: FavoriteItemRowProps) {
  const isTable = item.favorite_type === 'Table';
  
  return (
    <div className="group flex items-center gap-2 px-3 py-1.5 hover:bg-accent/50 rounded-md cursor-pointer transition-colors">
      {/* 图标 */}
      {isTable ? (
        <TableIcon className="h-3.5 w-3.5 text-success flex-shrink-0" />
      ) : (
        <CodeIcon className="h-3.5 w-3.5 text-primary flex-shrink-0" />
      )}
      
      {/* 名称和描述 */}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium truncate">{item.name}</div>
        <div className="text-[10px] text-muted-foreground truncate font-mono">
          {isTable ? `${item.database_name}.${item.table_name}` : item.sql?.substring(0, 50)}
        </div>
      </div>
      
      {/* 操作按钮 */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onOpen}
          className="p-1 rounded-md hover:bg-primary/15 text-primary cursor-pointer transition-colors"
          title={isTable ? "打开表" : "执行查询"}
        >
          <PlayIcon className="h-3 w-3" />
        </button>
        <button
          onClick={onDelete}
          className="p-1 rounded-md hover:bg-destructive/15 text-destructive cursor-pointer transition-colors"
          title="删除收藏"
        >
          <TrashIcon className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Add Favorite Dialog
// ============================================================================

interface AddFavoriteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, type: FavoriteType, sql?: string) => void;
  defaultSql?: string;
}

function AddFavoriteDialog({ isOpen, onClose, onSave, defaultSql }: AddFavoriteDialogProps) {
  const [name, setName] = React.useState("");
  const [sql, setSql] = React.useState(defaultSql || "");
  
  React.useEffect(() => {
    if (isOpen) {
      setName("");
      setSql(defaultSql || "");
    }
  }, [isOpen, defaultSql]);
  
  if (!isOpen) return null;
  
  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim(), 'Query', sql);
      onClose();
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border border-border rounded-lg shadow-lg w-96 p-4">
        <h3 className="text-lg font-semibold mb-4">添加到收藏夹</h3>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">名称</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入收藏名称"
              autoFocus
            />
          </div>
          
          <div>
            <label className="text-sm font-medium mb-1 block">SQL</label>
            <textarea
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              className="w-full h-24 px-3 py-2 text-sm border border-border rounded-md bg-background resize-none"
              placeholder="输入 SQL 语句"
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={onClose}>
            取消
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!name.trim()}>
            保存
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface FavoritesProps {
  className?: string;
  onOpenTable?: (tableName: string, databaseName: string) => void;
  onExecuteSql?: (sql: string) => void;
}

export function Favorites({ className, onOpenTable, onExecuteSql }: FavoritesProps) {
  const [favorites, setFavorites] = React.useState<FavoriteItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [showAddDialog, setShowAddDialog] = React.useState(false);
  const [filter, setFilter] = React.useState<'all' | 'table' | 'query'>('all');
  
  const activeConnectionId = useAppStore((state) => state.activeConnectionId);
  
  // 加载收藏夹
  const loadFavorites = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await tauriCommands.loadFavorites();
      setFavorites(items);
    } catch (error) {
      console.error("加载收藏夹失败:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  React.useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);
  
  // 删除收藏
  const handleDelete = async (id: string) => {
    try {
      await tauriCommands.deleteFavorite(id);
      setFavorites((prev) => prev.filter((f) => f.id !== id));
    } catch (error) {
      console.error("删除收藏失败:", error);
    }
  };
  
  // 打开收藏项
  const handleOpen = (item: FavoriteItem) => {
    if (item.favorite_type === 'Table' && item.table_name && item.database_name) {
      onOpenTable?.(item.table_name, item.database_name);
    } else if (item.favorite_type === 'Query' && item.sql) {
      onExecuteSql?.(item.sql);
    }
  };
  
  // 添加收藏
  const handleAddFavorite = async (name: string, type: FavoriteType, sql?: string) => {
    if (!activeConnectionId) return;
    
    const item: FavoriteItem = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      favorite_type: type,
      name,
      connection_id: activeConnectionId,
      sql,
      created_at: new Date().toISOString(),
    };
    
    try {
      await tauriCommands.saveFavorite(item);
      setFavorites((prev) => [...prev, item]);
    } catch (error) {
      console.error("保存收藏失败:", error);
    }
  };
  
  // 过滤收藏
  const filteredFavorites = favorites.filter((f) => {
    if (filter === 'all') return true;
    if (filter === 'table') return f.favorite_type === 'Table';
    if (filter === 'query') return f.favorite_type === 'Query';
    return true;
  });
  
  // 按连接分组
  const currentConnectionFavorites = filteredFavorites.filter(
    (f) => f.connection_id === activeConnectionId
  );
  const otherFavorites = filteredFavorites.filter(
    (f) => f.connection_id !== activeConnectionId
  );
  
  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* 操作栏 */}
      <div className="flex items-center justify-end px-2 py-1 border-b border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAddDialog(true)}
          disabled={!activeConnectionId}
          title="添加收藏"
        >
          <PlusIcon className="h-4 w-4" />
        </Button>
      </div>
      
      {/* 过滤器 */}
      <div className="flex gap-1 px-2 py-1.5 border-b border-border">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            "px-2 py-0.5 text-xs rounded",
            filter === 'all' ? "bg-primary text-primary-foreground" : "hover:bg-muted"
          )}
        >
          全部
        </button>
        <button
          onClick={() => setFilter('table')}
          className={cn(
            "px-2 py-0.5 text-xs rounded",
            filter === 'table' ? "bg-primary text-primary-foreground" : "hover:bg-muted"
          )}
        >
          表
        </button>
        <button
          onClick={() => setFilter('query')}
          className={cn(
            "px-2 py-0.5 text-xs rounded",
            filter === 'query' ? "bg-primary text-primary-foreground" : "hover:bg-muted"
          )}
        >
          查询
        </button>
      </div>
      
      {/* 收藏列表 */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
            加载中...
          </div>
        ) : filteredFavorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-20 text-muted-foreground text-sm">
            <StarIcon className="h-8 w-8 mb-2 opacity-30" />
            <span>暂无收藏</span>
          </div>
        ) : (
          <div className="p-1">
            {/* 当前连接的收藏 */}
            {currentConnectionFavorites.length > 0 && (
              <div className="mb-2">
                <div className="px-2 py-1 text-xs text-muted-foreground font-medium">
                  当前连接
                </div>
                {currentConnectionFavorites.map((item) => (
                  <FavoriteItemRow
                    key={item.id}
                    item={item}
                    onOpen={() => handleOpen(item)}
                    onDelete={() => handleDelete(item.id)}
                  />
                ))}
              </div>
            )}
            
            {/* 其他连接的收藏 */}
            {otherFavorites.length > 0 && (
              <div>
                <div className="px-2 py-1 text-xs text-muted-foreground font-medium">
                  其他连接
                </div>
                {otherFavorites.map((item) => (
                  <FavoriteItemRow
                    key={item.id}
                    item={item}
                    onOpen={() => handleOpen(item)}
                    onDelete={() => handleDelete(item.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* 添加收藏对话框 */}
      <AddFavoriteDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSave={handleAddFavorite}
      />
    </div>
  );
}

export default Favorites;
