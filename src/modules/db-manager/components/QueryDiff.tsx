import * as React from "react";
import { cn } from "@/lib/utils";
import type { QueryResult, Value } from "../store/index";

/**
 * QueryDiff Component
 * 
 * 查询结果对比组件，支持：
 * - 对比两个查询结果
 * - 高亮新增/删除/修改的行
 * - 显示差异统计
 */

// ============================================================================
// Types
// ============================================================================

interface QueryDiffProps {
  result1: QueryResult | null;
  result2: QueryResult | null;
  label1?: string;
  label2?: string;
  className?: string;
}

type DiffType = "added" | "removed" | "modified" | "unchanged";

interface DiffRow {
  type: DiffType;
  row1?: Value[];
  row2?: Value[];
  rowIndex: number;
}

// ============================================================================
// Icons
// ============================================================================

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function MinusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatValue(value: Value): string {
  if (value === null) return "NULL";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) return `[${value.length} bytes]`;
  return String(value);
}

function rowToKey(row: Value[]): string {
  return row.map(formatValue).join("|");
}

function compareRows(row1: Value[], row2: Value[]): boolean {
  if (row1.length !== row2.length) return false;
  return row1.every((v, i) => formatValue(v) === formatValue(row2[i]));
}

function computeDiff(result1: QueryResult | null, result2: QueryResult | null): DiffRow[] {
  if (!result1 && !result2) return [];
  if (!result1) {
    return (result2?.rows || []).map((row, i) => ({
      type: "added" as DiffType,
      row2: row,
      rowIndex: i,
    }));
  }
  if (!result2) {
    return result1.rows.map((row, i) => ({
      type: "removed" as DiffType,
      row1: row,
      rowIndex: i,
    }));
  }

  const diff: DiffRow[] = [];
  const rows1Map = new Map<string, { row: Value[]; index: number }>();
  const rows2Map = new Map<string, { row: Value[]; index: number }>();

  result1.rows.forEach((row, i) => {
    rows1Map.set(rowToKey(row), { row, index: i });
  });
  result2.rows.forEach((row, i) => {
    rows2Map.set(rowToKey(row), { row, index: i });
  });

  // 找出删除和修改的行
  result1.rows.forEach((row1, i) => {
    const key = rowToKey(row1);
    if (!rows2Map.has(key)) {
      // 检查是否是修改（同位置不同值）
      if (i < result2.rows.length && !compareRows(row1, result2.rows[i])) {
        diff.push({
          type: "modified",
          row1,
          row2: result2.rows[i],
          rowIndex: i,
        });
      } else {
        diff.push({
          type: "removed",
          row1,
          rowIndex: i,
        });
      }
    } else {
      diff.push({
        type: "unchanged",
        row1,
        row2: row1,
        rowIndex: i,
      });
    }
  });

  // 找出新增的行
  result2.rows.forEach((row2, i) => {
    const key = rowToKey(row2);
    if (!rows1Map.has(key) && i >= result1.rows.length) {
      diff.push({
        type: "added",
        row2,
        rowIndex: i,
      });
    }
  });

  return diff;
}

// ============================================================================
// Sub Components
// ============================================================================

interface DiffStatsProps {
  diff: DiffRow[];
}

function DiffStats({ diff }: DiffStatsProps) {
  const stats = React.useMemo(() => {
    return diff.reduce(
      (acc, d) => {
        acc[d.type]++;
        return acc;
      },
      { added: 0, removed: 0, modified: 0, unchanged: 0 }
    );
  }, [diff]);

  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="flex items-center gap-1 text-success">
        <PlusIcon className="h-3.5 w-3.5" />
        <span>{stats.added} 新增</span>
      </div>
      <div className="flex items-center gap-1 text-destructive">
        <MinusIcon className="h-3.5 w-3.5" />
        <span>{stats.removed} 删除</span>
      </div>
      <div className="flex items-center gap-1 text-warning">
        <EditIcon className="h-3.5 w-3.5" />
        <span>{stats.modified} 修改</span>
      </div>
      <div className="text-muted-foreground">
        {stats.unchanged} 未变
      </div>
    </div>
  );
}

interface DiffRowViewProps {
  diffRow: DiffRow;
}

function DiffRowView({ diffRow }: DiffRowViewProps) {
  const bgColors = {
    added: "bg-green-500/10",
    removed: "bg-red-500/10",
    modified: "bg-yellow-500/10",
    unchanged: "",
  };

  const borderColors = {
    added: "border-l-green-500",
    removed: "border-l-red-500",
    modified: "border-l-yellow-500",
    unchanged: "border-l-transparent",
  };

  const row = diffRow.row2 || diffRow.row1 || [];

  return (
    <tr className={cn(bgColors[diffRow.type], "border-l-4", borderColors[diffRow.type])}>
      <td className="px-2 py-1 text-center text-xs text-muted-foreground w-8">
        {diffRow.type === "added" && <PlusIcon className="h-3 w-3 text-green-500 mx-auto" />}
        {diffRow.type === "removed" && <MinusIcon className="h-3 w-3 text-red-500 mx-auto" />}
        {diffRow.type === "modified" && <EditIcon className="h-3 w-3 text-yellow-500 mx-auto" />}
      </td>
      {row.map((value, i) => {
        const isChanged =
          diffRow.type === "modified" &&
          diffRow.row1 &&
          diffRow.row2 &&
          formatValue(diffRow.row1[i]) !== formatValue(diffRow.row2[i]);

        return (
          <td
            key={i}
            className={cn(
              "px-2 py-1 text-sm border-r border-border",
              isChanged && "font-medium"
            )}
          >
            {isChanged ? (
              <div className="space-y-0.5">
                <div className="text-red-500 line-through text-xs">
                  {formatValue(diffRow.row1![i])}
                </div>
                <div className="text-green-500">
                  {formatValue(diffRow.row2![i])}
                </div>
              </div>
            ) : (
              formatValue(value)
            )}
          </td>
        );
      })}
    </tr>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function QueryDiff({
  result1,
  result2,
  label1 = "查询 1",
  label2 = "查询 2",
  className,
}: QueryDiffProps) {
  const [showUnchanged, setShowUnchanged] = React.useState(true);

  const diff = React.useMemo(() => computeDiff(result1, result2), [result1, result2]);

  const filteredDiff = React.useMemo(() => {
    if (showUnchanged) return diff;
    return diff.filter((d) => d.type !== "unchanged");
  }, [diff, showUnchanged]);

  const columns = result1?.columns || result2?.columns || [];

  if (!result1 && !result2) {
    return (
      <div className={cn("flex items-center justify-center h-full text-muted-foreground", className)}>
        <p>请选择两个查询结果进行对比</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold">查询结果对比</h3>
          <DiffStats diff={diff} />
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={showUnchanged}
              onChange={(e) => setShowUnchanged(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            显示未变行
          </label>
        </div>
      </div>

      {/* Labels */}
      <div className="flex items-center gap-4 px-4 py-1.5 bg-muted/50 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded bg-destructive/50" />
          <span>{label1}</span>
          <span className="text-muted-foreground">({result1?.rows.length || 0} 行)</span>
        </div>
        <span className="text-muted-foreground">vs</span>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded bg-success/50" />
          <span>{label2}</span>
          <span className="text-muted-foreground">({result2?.rows.length || 0} 行)</span>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto scrollbar-thin">
        <table className="w-full text-xs">
          <thead className="bg-muted sticky top-0">
            <tr>
              <th className="px-2 py-2 w-8"></th>
              {columns.map((col) => (
                <th key={col.name} className="px-2 py-2 text-left font-medium border-r border-border">
                  {col.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredDiff.map((d, i) => (
              <DiffRowView
                key={`${d.type}-${d.rowIndex}-${i}`}
                diffRow={d}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
