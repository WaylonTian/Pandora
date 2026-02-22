import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useT } from '@/i18n';
import type { TableInfo, ForeignKeyInfo } from "../store/index";

/**
 * ERDiagram Component
 * 
 * 实体关系图组件，支持：
 * - 自动分析表关系
 * - 可视化展示表和字段
 * - 显示外键关系连线
 * - 拖拽调整位置
 */

// ============================================================================
// Types
// ============================================================================

interface Position {
  x: number;
  y: number;
}

interface TableNode {
  table: TableInfo;
  position: Position;
}

interface ERDiagramProps {
  tables: TableInfo[];
  className?: string;
}

// ============================================================================
// Icons
// ============================================================================

function KeyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function ZoomInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}

function ZoomOutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}

// ============================================================================
// Layout Algorithm
// ============================================================================

function calculateLayout(tables: TableInfo[]): TableNode[] {
  const nodes: TableNode[] = [];
  const cols = Math.ceil(Math.sqrt(tables.length));
  const spacing = { x: 280, y: 300 };
  const padding = 50;

  tables.forEach((table, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    nodes.push({
      table,
      position: {
        x: padding + col * spacing.x,
        y: padding + row * spacing.y,
      },
    });
  });

  return nodes;
}

// ============================================================================
// Sub Components
// ============================================================================

interface TableCardProps {
  node: TableNode;
  onDrag: (position: Position) => void;
  isHighlighted: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

function TableCard({
  node,
  onDrag,
  isHighlighted,
  onMouseEnter,
  onMouseLeave,
}: TableCardProps) {
  const t = useT();
  const { table, position } = node;
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  React.useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      onDrag({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset, onDrag]);

  const pkColumns = table.columns.filter((c) => c.is_primary_key);
  const fkColumnNames = new Set(table.foreign_keys.flatMap((fk) => fk.columns));

  return (
    <div
      className={cn(
        "absolute bg-background border-2 rounded-lg shadow-lg min-w-[200px] select-none",
        isDragging ? "cursor-grabbing z-50" : "cursor-grab",
        isHighlighted ? "border-primary ring-2 ring-primary/30" : "border-border"
      )}
      style={{
        left: position.x,
        top: position.y,
      }}
      onMouseDown={handleMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Header */}
      <div className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-t-md">
        {table.name}
      </div>

      {/* Columns */}
      <div className="divide-y divide-border">
        {table.columns.map((col) => {
          const isPK = col.is_primary_key;
          const isFK = fkColumnNames.has(col.name);

          return (
            <div
              key={col.name}
              className={cn(
                "px-2.5 py-1 flex items-center gap-1.5 text-xs",
                isPK && "bg-warning/10",
                isFK && "bg-primary/10"
              )}
            >
              {isPK && <KeyIcon className="h-2.5 w-2.5 text-warning" />}
              {isFK && <LinkIcon className="h-2.5 w-2.5 text-primary" />}
              <span className={cn(isPK && "font-semibold")}>{col.name}</span>
              <span className="text-muted-foreground text-[10px] ml-auto">
                {col.data_type}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer with counts */}
      <div className="px-2.5 py-1 bg-muted/50 text-[10px] text-muted-foreground rounded-b-md flex gap-2">
        <span>{t('erDiagram.columnsCount', { count: table.columns.length })}</span>
        {pkColumns.length > 0 && <span>{pkColumns.length} PK</span>}
        {table.foreign_keys.length > 0 && <span>{table.foreign_keys.length} FK</span>}
      </div>
    </div>
  );
}

interface RelationLineProps {
  from: Position;
  to: Position;
  fk: ForeignKeyInfo;
  isHighlighted: boolean;
}

function RelationLine({ from, to, fk, isHighlighted }: RelationLineProps) {
  // 计算连线路径
  const midX = (from.x + to.x) / 2;
  const path = `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;

  return (
    <g>
      <path
        d={path}
        fill="none"
        stroke={isHighlighted ? "hsl(var(--primary))" : "hsl(var(--border))"}
        strokeWidth={isHighlighted ? 2 : 1}
        strokeDasharray={isHighlighted ? "none" : "4 2"}
      />
      {/* Arrow */}
      <circle
        cx={to.x}
        cy={to.y}
        r={4}
        fill={isHighlighted ? "hsl(var(--primary))" : "hsl(var(--border))"}
      />
      {/* Label */}
      {isHighlighted && (
        <text
          x={midX}
          y={(from.y + to.y) / 2 - 10}
          textAnchor="middle"
          className="text-xs fill-primary"
        >
          {fk.columns.join(", ")}
        </text>
      )}
    </g>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ERDiagram({ tables, className }: ERDiagramProps) {
  const t = useT();
  const [nodes, setNodes] = React.useState<TableNode[]>(() =>
    calculateLayout(tables)
  );
  const [scale, setScale] = React.useState(1);
  const [highlightedTable, setHighlightedTable] = React.useState<string | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // 更新节点位置
  const updateNodePosition = (index: number, position: Position) => {
    setNodes((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], position };
      return next;
    });
  };

  // 计算关系连线
  const relations = React.useMemo(() => {
    const result: Array<{
      from: Position;
      to: Position;
      fk: ForeignKeyInfo;
      sourceTable: string;
      targetTable: string;
    }> = [];

    nodes.forEach((node) => {
      node.table.foreign_keys.forEach((fk) => {
        const targetNode = nodes.find((n) => n.table.name === fk.referenced_table);
        if (targetNode) {
          result.push({
            from: {
              x: node.position.x + 200,
              y: node.position.y + 50,
            },
            to: {
              x: targetNode.position.x,
              y: targetNode.position.y + 50,
            },
            fk,
            sourceTable: node.table.name,
            targetTable: fk.referenced_table,
          });
        }
      });
    });

    return result;
  }, [nodes]);

  // 计算画布大小
  const canvasSize = React.useMemo(() => {
    let maxX = 800;
    let maxY = 600;
    nodes.forEach((node) => {
      maxX = Math.max(maxX, node.position.x + 300);
      maxY = Math.max(maxY, node.position.y + 300);
    });
    return { width: maxX, height: maxY };
  }, [nodes]);

  if (tables.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-full text-muted-foreground", className)}>
        <p>{t('erDiagram.noTableData')}</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-border bg-card/50">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold">{t('erDiagram.entityRelationshipDiagram')}</span>
          <span className="text-[10px] text-muted-foreground">
            {t('erDiagram.tablesAndRelations', { tableCount: tables.length, relationCount: relations.length })}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScale((s) => Math.min(s + 0.1, 2))}
            className="h-7 w-7 p-0 cursor-pointer"
          >
            <ZoomInIcon className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs w-10 text-center">{Math.round(scale * 100)}%</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScale((s) => Math.max(s - 0.1, 0.3))}
            className="h-7 w-7 p-0 cursor-pointer"
          >
            <ZoomOutIcon className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setNodes(calculateLayout(tables))}
            className="h-7 text-xs cursor-pointer"
          >
            {t('erDiagram.resetLayoutButton')}
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-muted/20"
        style={{ cursor: "default" }}
      >
        <div
          style={{
            width: canvasSize.width * scale,
            height: canvasSize.height * scale,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            position: "relative",
          }}
        >
          {/* Relation Lines */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={canvasSize.width}
            height={canvasSize.height}
          >
            {relations.map((rel, i) => (
              <RelationLine
                key={i}
                from={rel.from}
                to={rel.to}
                fk={rel.fk}
                isHighlighted={
                  highlightedTable === rel.sourceTable ||
                  highlightedTable === rel.targetTable
                }
              />
            ))}
          </svg>

          {/* Table Cards */}
          {nodes.map((node, i) => (
            <TableCard
              key={node.table.name}
              node={node}
              onDrag={(pos) => updateNodePosition(i, pos)}
              isHighlighted={highlightedTable === node.table.name}
              onMouseEnter={() => setHighlightedTable(node.table.name)}
              onMouseLeave={() => setHighlightedTable(null)}
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-1.5 border-t border-border text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <KeyIcon className="h-3 w-3 text-warning" />
          <span>{t('erDiagram.primaryKeyLegend')}</span>
        </div>
        <div className="flex items-center gap-1">
          <LinkIcon className="h-3 w-3 text-primary" />
          <span>{t('erDiagram.foreignKeyLegend')}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-0.5 border-t border-dashed border-border" />
          <span>{t('erDiagram.relationshipLegend')}</span>
        </div>
      </div>
    </div>
  );
}
