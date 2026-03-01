import * as React from "react";
import { cn } from "@/lib/utils";
import { useT } from '@/i18n';
import type { ColumnInfo } from "../store/index";

// ============================================================================
// Types
// ============================================================================

type Operator = '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'NOT LIKE' | 'IN' | 'NOT IN' | 'IS NULL' | 'IS NOT NULL' | 'BETWEEN';
type Logic = 'AND' | 'OR';

interface FilterCondition {
  id: string;
  column: string;
  operator: Operator;
  value: string;
  value2: string; // for BETWEEN
  logic: Logic;
}

const OPERATORS: Operator[] = ['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'NOT LIKE', 'IN', 'NOT IN', 'IS NULL', 'IS NOT NULL', 'BETWEEN'];
const NO_VALUE_OPS: Operator[] = ['IS NULL', 'IS NOT NULL'];

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

// ============================================================================
// Build WHERE clause from conditions
// ============================================================================

function buildWhereClause(conditions: FilterCondition[]): string {
  const active = conditions.filter(c => c.column);
  if (active.length === 0) return '';

  return active.map((c, i) => {
    let clause = '';
    if (NO_VALUE_OPS.includes(c.operator)) {
      clause = `${c.column} ${c.operator}`;
    } else if (c.operator === 'BETWEEN') {
      clause = `${c.column} BETWEEN '${c.value}' AND '${c.value2}'`;
    } else if (c.operator === 'IN' || c.operator === 'NOT IN') {
      const vals = c.value.split(',').map(v => `'${v.trim()}'`).join(', ');
      clause = `${c.column} ${c.operator} (${vals})`;
    } else if (c.operator === 'LIKE' || c.operator === 'NOT LIKE') {
      clause = `${c.column} ${c.operator} '${c.value}'`;
    } else {
      // Try numeric
      const num = Number(c.value);
      clause = isNaN(num) ? `${c.column} ${c.operator} '${c.value}'` : `${c.column} ${c.operator} ${c.value}`;
    }
    return i === 0 ? clause : `${c.logic} ${clause}`;
  }).join(' ');
}

// ============================================================================
// Icons
// ============================================================================

const PlusIcon = ({ className }: { className?: string }) => (
  <svg className={cn("h-3.5 w-3.5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
);
const XIcon = ({ className }: { className?: string }) => (
  <svg className={cn("h-3.5 w-3.5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);

// ============================================================================
// FilterBuilder Component
// ============================================================================

interface FilterBuilderProps {
  columns: ColumnInfo[];
  onApply: (where: string) => void;
  onClear: () => void;
  isLoading: boolean;
  className?: string;
}

export function FilterBuilder({ columns, onApply, onClear, isLoading, className }: FilterBuilderProps) {
  const t = useT();
  const [conditions, setConditions] = React.useState<FilterCondition[]>([
    { id: generateId(), column: '', operator: '=', value: '', value2: '', logic: 'AND' },
  ]);
  const [isAdvanced, setIsAdvanced] = React.useState(false);
  const [advancedWhere, setAdvancedWhere] = React.useState('');

  const updateCondition = (id: string, field: keyof FilterCondition, val: string) => {
    setConditions(prev => prev.map(c => c.id === id ? { ...c, [field]: val } : c));
  };

  const addCondition = () => {
    setConditions(prev => [...prev, { id: generateId(), column: '', operator: '=', value: '', value2: '', logic: 'AND' }]);
  };

  const removeCondition = (id: string) => {
    setConditions(prev => prev.length <= 1 ? prev : prev.filter(c => c.id !== id));
  };

  const handleApply = () => {
    if (isAdvanced) {
      onApply(advancedWhere);
    } else {
      const where = buildWhereClause(conditions);
      onApply(where);
    }
  };

  const handleClear = () => {
    setConditions([{ id: generateId(), column: '', operator: '=', value: '', value2: '', logic: 'AND' }]);
    setAdvancedWhere('');
    onClear();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleApply();
  };

  const selectClass = "h-7 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer";
  const inputClass = "h-7 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring flex-1 min-w-[80px]";

  return (
    <div className={cn("border-b border-border bg-card/30", className)}>
      {isAdvanced ? (
        /* Advanced mode: raw WHERE input */
        <div className="flex items-center gap-2 px-3 py-1.5">
          <span className="text-[11px] text-muted-foreground shrink-0">WHERE</span>
          <input
            type="text"
            value={advancedWhere}
            onChange={e => setAdvancedWhere(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('filterBuilder.whereCondition')}
            className={cn(inputClass, "flex-1")}
            disabled={isLoading}
          />
          <button onClick={handleApply} disabled={isLoading} className="h-7 px-3 rounded-md bg-primary text-primary-foreground text-xs hover:bg-primary/90 cursor-pointer disabled:opacity-50">{t('filterBuilder.apply')}</button>
          <button onClick={handleClear} disabled={isLoading} className="h-7 px-2 rounded-md text-xs text-muted-foreground hover:bg-accent cursor-pointer"><XIcon /></button>
          <button onClick={() => setIsAdvanced(false)} className="text-[10px] text-primary hover:underline cursor-pointer shrink-0">{t('filterBuilder.visualMode')}</button>
        </div>
      ) : (
        /* Visual mode: condition builder */
        <div className="px-3 py-1.5 space-y-1">
          {conditions.map((cond, index) => (
            <div key={cond.id} className="flex items-center gap-1.5" onKeyDown={handleKeyDown}>
              {/* Logic connector */}
              {index > 0 ? (
                <select value={cond.logic} onChange={e => updateCondition(cond.id, 'logic', e.target.value)} className={cn(selectClass, "w-16 shrink-0")}>
                  <option value="AND">AND</option>
                  <option value="OR">OR</option>
                </select>
              ) : (
                <span className="w-16 text-[11px] text-muted-foreground text-center shrink-0">WHERE</span>
              )}

              {/* Column */}
              <select value={cond.column} onChange={e => updateCondition(cond.id, 'column', e.target.value)} className={cn(selectClass, "w-28 shrink-0")}>
                <option value="">{t('filterBuilder.selectColumn')}</option>
                {columns.map(col => <option key={col.name} value={col.name}>{col.name}</option>)}
              </select>

              {/* Operator */}
              <select value={cond.operator} onChange={e => updateCondition(cond.id, 'operator', e.target.value as Operator)} className={cn(selectClass, "w-24 shrink-0")}>
                {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
              </select>

              {/* Value(s) */}
              {!NO_VALUE_OPS.includes(cond.operator) && (
                <>
                  <input
                    type="text"
                    value={cond.value}
                    onChange={e => updateCondition(cond.id, 'value', e.target.value)}
                    placeholder={cond.operator === 'IN' || cond.operator === 'NOT IN' ? 'val1, val2, ...' : t('filterBuilder.value')}
                    className={inputClass}
                    disabled={isLoading}
                  />
                  {cond.operator === 'BETWEEN' && (
                    <>
                      <span className="text-[11px] text-muted-foreground">AND</span>
                      <input
                        type="text"
                        value={cond.value2}
                        onChange={e => updateCondition(cond.id, 'value2', e.target.value)}
                        placeholder={t('filterBuilder.value')}
                        className={inputClass}
                        disabled={isLoading}
                      />
                    </>
                  )}
                </>
              )}

              {/* Remove */}
              <button onClick={() => removeCondition(cond.id)} className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer shrink-0" disabled={conditions.length <= 1}>
                <XIcon />
              </button>
            </div>
          ))}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-0.5">
            <button onClick={addCondition} className="flex items-center gap-1 text-[11px] text-primary hover:underline cursor-pointer">
              <PlusIcon /> {t('filterBuilder.addCondition')}
            </button>
            <div className="flex-1" />
            <button onClick={() => setIsAdvanced(true)} className="text-[10px] text-muted-foreground hover:underline cursor-pointer">{t('filterBuilder.advancedMode')}</button>
            <button onClick={handleClear} disabled={isLoading} className="h-6 px-2 rounded text-[11px] text-muted-foreground hover:bg-accent cursor-pointer">{t('filterBuilder.clear')}</button>
            <button onClick={handleApply} disabled={isLoading} className="h-6 px-3 rounded bg-primary text-primary-foreground text-[11px] hover:bg-primary/90 cursor-pointer disabled:opacity-50">{t('filterBuilder.apply')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
