import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from '@/i18n';
import type { ColumnDefinition, Value } from "../store/index";

/**
 * DataMasking Component
 * 
 * 数据脱敏配置组件，支持：
 * - 预设脱敏规则（手机号、邮箱、身份证等）
 * - 自定义脱敏函数
 * - 导出时自动应用
 */

// ============================================================================
// Types
// ============================================================================

export type MaskingType = 
  | "none"
  | "phone"
  | "email"
  | "idcard"
  | "name"
  | "address"
  | "bankcard"
  | "custom";

export interface MaskingRule {
  type: MaskingType;
  customPattern?: string;
  customReplacement?: string;
}

export interface ColumnMaskingConfig {
  columnName: string;
  rule: MaskingRule;
}

interface DataMaskingProps {
  columns: ColumnDefinition[];
  configs: ColumnMaskingConfig[];
  onChange: (configs: ColumnMaskingConfig[]) => void;
  className?: string;
}

// ============================================================================
// Icons
// ============================================================================

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

// ============================================================================
// Masking Functions
// ============================================================================

const maskingFunctions: Record<MaskingType, (value: string) => string> = {
  none: (v) => v,
  phone: (v) => {
    if (v.length >= 11) {
      return v.substring(0, 3) + "****" + v.substring(7);
    }
    return v.replace(/./g, "*");
  },
  email: (v) => {
    const atIndex = v.indexOf("@");
    if (atIndex > 2) {
      return v.substring(0, 2) + "***" + v.substring(atIndex);
    }
    return "***" + v.substring(atIndex);
  },
  idcard: (v) => {
    if (v.length >= 18) {
      return v.substring(0, 6) + "********" + v.substring(14);
    }
    return v.replace(/./g, "*");
  },
  name: (v) => {
    if (v.length <= 1) return "*";
    if (v.length === 2) return v[0] + "*";
    return v[0] + "*".repeat(v.length - 2) + v[v.length - 1];
  },
  address: (v) => {
    if (v.length <= 6) return "*".repeat(v.length);
    return v.substring(0, 6) + "*".repeat(Math.min(v.length - 6, 10));
  },
  bankcard: (v) => {
    if (v.length >= 16) {
      return v.substring(0, 4) + " **** **** " + v.substring(v.length - 4);
    }
    return "*".repeat(v.length);
  },
  custom: (v) => v,
};

function getMaskingLabels(t: (key: string) => string): Record<MaskingType, string> {
  return {
    none: t("dataMasking.noMasking"),
    phone: t("dataMasking.phoneMasking"),
    email: t("dataMasking.emailMasking"),
    idcard: t("dataMasking.idcardMasking"),
    name: t("dataMasking.nameMasking"),
    address: t("dataMasking.addressMasking"),
    bankcard: t("dataMasking.bankcardMasking"),
    custom: t("dataMasking.customMasking"),
  };
}

const maskingExamples: Record<MaskingType, { input: string; output: string }> = {
  none: { input: "原始数据", output: "原始数据" },
  phone: { input: "13812345678", output: "138****5678" },
  email: { input: "test@example.com", output: "te***@example.com" },
  idcard: { input: "110101199001011234", output: "110101********1234" },
  name: { input: "张三丰", output: "张*丰" },
  address: { input: "北京市朝阳区xxx路xxx号", output: "北京市朝阳区**********" },
  bankcard: { input: "6222021234567890123", output: "6222 **** **** 0123" },
  custom: { input: "自定义", output: "自定义" },
};

/**
 * 应用脱敏规则到值
 */
export function applyMasking(value: Value, rule: MaskingRule): Value {
  if (value === null) return null;
  
  const strValue = String(value);
  
  if (rule.type === "custom" && rule.customPattern && rule.customReplacement) {
    try {
      const regex = new RegExp(rule.customPattern, "g");
      return strValue.replace(regex, rule.customReplacement);
    } catch {
      return strValue;
    }
  }
  
  return maskingFunctions[rule.type](strValue);
}

/**
 * 批量应用脱敏规则到数据行
 */
export function applyMaskingToRows(
  rows: Value[][],
  columns: ColumnDefinition[],
  configs: ColumnMaskingConfig[]
): Value[][] {
  const configMap = new Map(configs.map((c) => [c.columnName, c.rule]));
  
  return rows.map((row) =>
    row.map((value, i) => {
      const rule = configMap.get(columns[i]?.name);
      if (rule && rule.type !== "none") {
        return applyMasking(value, rule);
      }
      return value;
    })
  );
}

// ============================================================================
// Sub Components
// ============================================================================

interface MaskingRuleRowProps {
  column: ColumnDefinition;
  config: ColumnMaskingConfig | undefined;
  onChange: (config: ColumnMaskingConfig) => void;
}

function MaskingRuleRow({ column, config, onChange }: MaskingRuleRowProps) {
  const t = useT();
  const rule = config?.rule || { type: "none" as MaskingType };
  const example = maskingExamples[rule.type];
  const maskingLabels = getMaskingLabels(t);

  return (
    <tr className="border-b border-border">
      <td className="px-3 py-2">
        <div className="font-medium">{column.name}</div>
        <div className="text-xs text-muted-foreground">{column.data_type}</div>
      </td>
      <td className="px-3 py-2">
        <select
          value={rule.type}
          onChange={(e) =>
            onChange({
              columnName: column.name,
              rule: { type: e.target.value as MaskingType },
            })
          }
          className="w-full px-2 py-1 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {Object.entries(maskingLabels).map(([type, label]) => (
            <option key={type} value={type}>
              {label}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2">
        {rule.type === "custom" ? (
          <div className="flex gap-2">
            <Input
              placeholder={t("dataMasking.regexPlaceholder")}
              value={rule.customPattern || ""}
              onChange={(e) =>
                onChange({
                  columnName: column.name,
                  rule: { ...rule, customPattern: e.target.value },
                })
              }
              className="h-8 text-sm flex-1"
            />
            <Input
              placeholder={t("dataMasking.replacementPlaceholder")}
              value={rule.customReplacement || ""}
              onChange={(e) =>
                onChange({
                  columnName: column.name,
                  rule: { ...rule, customReplacement: e.target.value },
                })
              }
              className="h-8 text-sm w-24"
            />
          </div>
        ) : rule.type !== "none" ? (
          <div className="text-sm text-muted-foreground">
            <span className="line-through">{example.input}</span>
            <span className="mx-2">→</span>
            <span className="text-primary">{example.output}</span>
          </div>
        ) : null}
      </td>
    </tr>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function DataMasking({ columns, configs, onChange, className }: DataMaskingProps) {
  const t = useT();
  const updateConfig = (config: ColumnMaskingConfig) => {
    const existing = configs.findIndex((c) => c.columnName === config.columnName);
    if (existing >= 0) {
      const next = [...configs];
      next[existing] = config;
      onChange(next);
    } else {
      onChange([...configs, config]);
    }
  };

  const activeCount = configs.filter((c) => c.rule.type !== "none").length;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldIcon className="h-5 w-5 text-primary" />
          <h4 className="font-semibold">{t("dataMasking.dataMaskingTitle")}</h4>
          {activeCount > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
              {t("dataMasking.fieldsConfiguredBadge", { count: activeCount })}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange([])}
          disabled={configs.length === 0}
        >
          {t("dataMasking.clearAllButton")}
        </Button>
      </div>

      {/* Info */}
      <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-sm">
        <EyeOffIcon className="h-4 w-4 text-muted-foreground mt-0.5" />
        <div className="text-muted-foreground">
          {t("dataMasking.infoMessage")}
        </div>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-3 py-2 text-left w-40">{t("dataMasking.columnNameHeader")}</th>
              <th className="px-3 py-2 text-left w-32">{t("dataMasking.maskingTypeHeader")}</th>
              <th className="px-3 py-2 text-left">{t("dataMasking.previewConfigHeader")}</th>
            </tr>
          </thead>
          <tbody>
            {columns.map((col) => (
              <MaskingRuleRow
                key={col.name}
                column={col}
                config={configs.find((c) => c.columnName === col.name)}
                onChange={updateConfig}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
