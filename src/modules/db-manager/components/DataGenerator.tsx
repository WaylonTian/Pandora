import * as React from "react";
import { cn } from "@/lib/utils";
import { useT } from '@/i18n';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { tauriCommands, type Value, type ColumnDefinition } from "../store/index";

/**
 * DataGenerator Component
 * 
 * 测试数据生成器，支持：
 * - 根据字段类型自动生成数据
 * - 自定义生成规则
 * - 批量生成指定行数
 */

// ============================================================================
// Types
// ============================================================================

interface GeneratorRule {
  type: "auto" | "sequence" | "random" | "fixed" | "pattern";
  min?: number;
  max?: number;
  prefix?: string;
  values?: string[];
  pattern?: string;
  fixedValue?: string;
}

interface ColumnConfig {
  column: ColumnDefinition;
  rule: GeneratorRule;
  enabled: boolean;
}

interface DataGeneratorProps {
  connectionId: string;
  tableName: string;
  columns: ColumnDefinition[];
  onClose: () => void;
  onSuccess: (count: number) => void;
  className?: string;
}

// ============================================================================
// Icons
// ============================================================================

function WandIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M15 4V2" />
      <path d="M15 16v-2" />
      <path d="M8 9h2" />
      <path d="M20 9h2" />
      <path d="M17.8 11.8L19 13" />
      <path d="M15 9h0" />
      <path d="M17.8 6.2L19 5" />
      <path d="m3 21 9-9" />
      <path d="M12.2 6.2L11 5" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ============================================================================
// Data Generation Functions
// ============================================================================

const firstNames = ["张", "李", "王", "刘", "陈", "杨", "黄", "赵", "周", "吴"];
const lastNames = ["伟", "芳", "娜", "敏", "静", "丽", "强", "磊", "军", "洋"];
const domains = ["gmail.com", "qq.com", "163.com", "outlook.com", "example.com"];

function generateValue(
  rule: GeneratorRule,
  dataType: string,
  index: number,
  t: (key: string) => string
): Value {
  const lowerType = dataType.toLowerCase();

  // 自动生成
  if (rule.type === "auto") {
    if (lowerType.includes("int") || lowerType.includes("serial")) {
      return index + 1;
    }
    if (lowerType.includes("float") || lowerType.includes("double") || lowerType.includes("decimal")) {
      return Math.round(Math.random() * 10000) / 100;
    }
    if (lowerType.includes("bool")) {
      return Math.random() > 0.5;
    }
    if (lowerType.includes("date") || lowerType.includes("time")) {
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 365));
      return date.toISOString().split("T")[0];
    }
    if (lowerType.includes("email") || dataType.toLowerCase().includes("email")) {
      const name = firstNames[Math.floor(Math.random() * firstNames.length)] +
        lastNames[Math.floor(Math.random() * lastNames.length)];
      const domain = domains[Math.floor(Math.random() * domains.length)];
      return `${name}${index}@${domain}`;
    }
    // 默认字符串
    return `${t('dataGenerator.testDataPrefix')}_${index + 1}`;
  }

  // 序列
  if (rule.type === "sequence") {
    const prefix = rule.prefix || "";
    return `${prefix}${index + 1}`;
  }

  // 随机数
  if (rule.type === "random") {
    const min = rule.min ?? 0;
    const max = rule.max ?? 100;
    if (lowerType.includes("int")) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    return Math.round((Math.random() * (max - min) + min) * 100) / 100;
  }

  // 固定值
  if (rule.type === "fixed") {
    return rule.fixedValue ?? null;
  }

  // 从列表随机选择
  if (rule.type === "pattern" && rule.values && rule.values.length > 0) {
    return rule.values[Math.floor(Math.random() * rule.values.length)];
  }

  return null;
}

function getDefaultRule(dataType: string): GeneratorRule {
  const lowerType = dataType.toLowerCase();
  
  if (lowerType.includes("int") || lowerType.includes("serial")) {
    return { type: "sequence" };
  }
  if (lowerType.includes("float") || lowerType.includes("double") || lowerType.includes("decimal")) {
    return { type: "random", min: 0, max: 1000 };
  }
  if (lowerType.includes("bool")) {
    return { type: "auto" };
  }
  
  return { type: "auto" };
}

// ============================================================================
// Sub Components
// ============================================================================

interface ColumnConfigRowProps {
  config: ColumnConfig;
  onChange: (config: ColumnConfig) => void;
}

function ColumnConfigRow({ config, onChange }: ColumnConfigRowProps) {
  const t = useT();
  const { column, rule, enabled } = config;

  return (
    <tr className="border-b border-border">
      <td className="px-3 py-2">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange({ ...config, enabled: e.target.checked })}
          className="h-4 w-4 rounded border-input"
        />
      </td>
      <td className="px-3 py-2">
        <div className="font-medium">{column.name}</div>
        <div className="text-xs text-muted-foreground">{column.data_type}</div>
      </td>
      <td className="px-3 py-2">
        <select
          value={rule.type}
          onChange={(e) =>
            onChange({
              ...config,
              rule: { ...rule, type: e.target.value as GeneratorRule["type"] },
            })
          }
          disabled={!enabled}
          className="w-full px-2 py-1 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="auto">{t('dataGenerator.autoGeneration')}</option>
          <option value="sequence">{t('dataGenerator.sequenceGeneration')}</option>
          <option value="random">{t('dataGenerator.randomGeneration')}</option>
          <option value="fixed">{t('dataGenerator.fixedGeneration')}</option>
          <option value="pattern">{t('dataGenerator.patternGeneration')}</option>
        </select>
      </td>
      <td className="px-3 py-2">
        {rule.type === "sequence" && (
          <Input
            placeholder={t('dataGenerator.prefixPlaceholder')}
            value={rule.prefix || ""}
            onChange={(e) =>
              onChange({ ...config, rule: { ...rule, prefix: e.target.value } })
            }
            disabled={!enabled}
            className="h-8 text-sm"
          />
        )}
        {rule.type === "random" && (
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder={t('dataGenerator.minPlaceholder')}
              value={rule.min ?? ""}
              onChange={(e) =>
                onChange({
                  ...config,
                  rule: { ...rule, min: Number(e.target.value) },
                })
              }
              disabled={!enabled}
              className="h-8 text-sm w-20"
            />
            <Input
              type="number"
              placeholder={t('dataGenerator.maxPlaceholder')}
              value={rule.max ?? ""}
              onChange={(e) =>
                onChange({
                  ...config,
                  rule: { ...rule, max: Number(e.target.value) },
                })
              }
              disabled={!enabled}
              className="h-8 text-sm w-20"
            />
          </div>
        )}
        {rule.type === "fixed" && (
          <Input
            placeholder={t('dataGenerator.fixedValuePlaceholder')}
            value={rule.fixedValue || ""}
            onChange={(e) =>
              onChange({
                ...config,
                rule: { ...rule, fixedValue: e.target.value },
              })
            }
            disabled={!enabled}
            className="h-8 text-sm"
          />
        )}
        {rule.type === "pattern" && (
          <Input
            placeholder={t('dataGenerator.valuesPlaceholder')}
            value={rule.values?.join(",") || ""}
            onChange={(e) =>
              onChange({
                ...config,
                rule: { ...rule, values: e.target.value.split(",").map((s) => s.trim()) },
              })
            }
            disabled={!enabled}
            className="h-8 text-sm"
          />
        )}
      </td>
    </tr>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function DataGenerator({
  connectionId,
  tableName,
  columns,
  onClose,
  onSuccess,
  className,
}: DataGeneratorProps) {
  const t = useT();
  const [rowCount, setRowCount] = React.useState(100);
  const [configs, setConfigs] = React.useState<ColumnConfig[]>(() =>
    columns.map((col) => ({
      column: col,
      rule: getDefaultRule(col.data_type),
      enabled: !col.is_auto_increment,
    }))
  );
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<Value[][]>([]);

  // 更新配置
  const updateConfig = (index: number, config: ColumnConfig) => {
    setConfigs((prev) => {
      const next = [...prev];
      next[index] = config;
      return next;
    });
  };

  // 生成预览
  const generatePreview = () => {
    const enabledConfigs = configs.filter((c) => c.enabled);
    const rows: Value[][] = [];
    
    for (let i = 0; i < Math.min(5, rowCount); i++) {
      const row: Value[] = enabledConfigs.map((c) =>
        generateValue(c.rule, c.column.data_type, i, t)
      );
      rows.push(row);
    }
    
    setPreview(rows);
  };

  // 执行生成
  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const enabledConfigs = configs.filter((c) => c.enabled);
      const columnNames = enabledConfigs.map((c) => c.column.name);
      const rows: Value[][] = [];

      for (let i = 0; i < rowCount; i++) {
        const row: Value[] = enabledConfigs.map((c) =>
          generateValue(c.rule, c.column.data_type, i, t)
        );
        rows.push(row);
      }

      const count = await tauriCommands.batchImport(
        connectionId,
        tableName,
        columnNames,
        rows
      );

      onSuccess(count);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsGenerating(false);
    }
  };

  const enabledCount = configs.filter((c) => c.enabled).length;

  return (
    <div className={cn("fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm", className)}>
      <div className="bg-card border border-border rounded-xl shadow-xl w-[800px] max-h-[85vh] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <div className="flex items-center gap-2">
            <WandIcon className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">{t('dataGenerator.generateTestDataTitle')}</h3>
            <span className="text-xs text-muted-foreground">- {tableName}</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-md cursor-pointer transition-colors">
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Row Count */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">{t('dataGenerator.rowCountLabel')}</label>
            <Input
              type="number"
              value={rowCount}
              onChange={(e) => setRowCount(Math.max(1, Number(e.target.value)))}
              className="w-32"
              min={1}
              max={10000}
            />
            <Button variant="outline" size="sm" onClick={generatePreview}>
              {t('dataGenerator.previewButton')}
            </Button>
          </div>

          {/* Column Config */}
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 w-10"></th>
                  <th className="px-3 py-2 text-left">{t('dataGenerator.columnHeader')}</th>
                  <th className="px-3 py-2 text-left w-32">{t('dataGenerator.generationMethodHeader')}</th>
                  <th className="px-3 py-2 text-left">{t('dataGenerator.parametersHeader')}</th>
                </tr>
              </thead>
              <tbody>
                {configs.map((config, i) => (
                  <ColumnConfigRow
                    key={config.column.name}
                    config={config}
                    onChange={(c) => updateConfig(i, c)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">{t('dataGenerator.dataPreviewTitle')}</h4>
              <div className="border border-border rounded-lg overflow-auto max-h-40">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      {configs
                        .filter((c) => c.enabled)
                        .map((c) => (
                          <th key={c.column.name} className="px-3 py-2 text-left">
                            {c.column.name}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t border-border">
                        {row.map((val, j) => (
                          <td key={j} className="px-3 py-2">
                            {String(val ?? "NULL")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-xs">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border">
          <span className="text-xs text-muted-foreground">
            {t('dataGenerator.generateSummary', { rowCount, fieldCount: enabledCount })}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isGenerating} className="cursor-pointer">
              {t('dataGenerator.cancelButton')}
            </Button>
            <Button size="sm" onClick={handleGenerate} disabled={isGenerating || enabledCount === 0} className="cursor-pointer">
              {isGenerating ? t('dataGenerator.generatingMessage') : t('dataGenerator.generateRowsButton', { count: rowCount })}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
