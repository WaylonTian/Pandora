import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { TableInfo } from "../store/index";
import { useT } from '@/i18n';

/**
 * CodeGenerator Component
 * 
 * 代码生成器，支持：
 * - 生成 TypeScript 类型定义
 * - 生成 Rust 结构体
 * - 生成 Python 类
 * - 生成 Go 结构体
 */

// ============================================================================
// Types
// ============================================================================

type Language = "typescript" | "rust" | "python" | "go";

interface CodeGeneratorProps {
  table: TableInfo;
  className?: string;
}

// ============================================================================
// Icons
// ============================================================================

function CodeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ============================================================================
// Type Mapping
// ============================================================================

const typeMapping: Record<Language, Record<string, string>> = {
  typescript: {
    int: "number",
    integer: "number",
    bigint: "number",
    smallint: "number",
    tinyint: "number",
    float: "number",
    double: "number",
    decimal: "number",
    numeric: "number",
    real: "number",
    varchar: "string",
    char: "string",
    text: "string",
    longtext: "string",
    mediumtext: "string",
    boolean: "boolean",
    bool: "boolean",
    date: "string",
    datetime: "string",
    timestamp: "string",
    time: "string",
    json: "Record<string, unknown>",
    jsonb: "Record<string, unknown>",
    blob: "Uint8Array",
    binary: "Uint8Array",
    uuid: "string",
    serial: "number",
    bigserial: "number",
  },
  rust: {
    int: "i32",
    integer: "i32",
    bigint: "i64",
    smallint: "i16",
    tinyint: "i8",
    float: "f32",
    double: "f64",
    decimal: "f64",
    numeric: "f64",
    real: "f32",
    varchar: "String",
    char: "String",
    text: "String",
    longtext: "String",
    mediumtext: "String",
    boolean: "bool",
    bool: "bool",
    date: "chrono::NaiveDate",
    datetime: "chrono::NaiveDateTime",
    timestamp: "chrono::DateTime<chrono::Utc>",
    time: "chrono::NaiveTime",
    json: "serde_json::Value",
    jsonb: "serde_json::Value",
    blob: "Vec<u8>",
    binary: "Vec<u8>",
    uuid: "uuid::Uuid",
    serial: "i32",
    bigserial: "i64",
  },
  python: {
    int: "int",
    integer: "int",
    bigint: "int",
    smallint: "int",
    tinyint: "int",
    float: "float",
    double: "float",
    decimal: "Decimal",
    numeric: "Decimal",
    real: "float",
    varchar: "str",
    char: "str",
    text: "str",
    longtext: "str",
    mediumtext: "str",
    boolean: "bool",
    bool: "bool",
    date: "date",
    datetime: "datetime",
    timestamp: "datetime",
    time: "time",
    json: "dict",
    jsonb: "dict",
    blob: "bytes",
    binary: "bytes",
    uuid: "UUID",
    serial: "int",
    bigserial: "int",
  },
  go: {
    int: "int32",
    integer: "int32",
    bigint: "int64",
    smallint: "int16",
    tinyint: "int8",
    float: "float32",
    double: "float64",
    decimal: "float64",
    numeric: "float64",
    real: "float32",
    varchar: "string",
    char: "string",
    text: "string",
    longtext: "string",
    mediumtext: "string",
    boolean: "bool",
    bool: "bool",
    date: "time.Time",
    datetime: "time.Time",
    timestamp: "time.Time",
    time: "time.Time",
    json: "map[string]interface{}",
    jsonb: "map[string]interface{}",
    blob: "[]byte",
    binary: "[]byte",
    uuid: "uuid.UUID",
    serial: "int32",
    bigserial: "int64",
  },
};

// ============================================================================
// Code Generation Functions
// ============================================================================

function toPascalCase(str: string): string {
  return str
    .split(/[_\s-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "");
}

function mapType(dataType: string, language: Language): string {
  const lowerType = dataType.toLowerCase();
  const mapping = typeMapping[language];
  
  for (const [key, value] of Object.entries(mapping)) {
    if (lowerType.includes(key)) {
      return value;
    }
  }
  
  // Default types
  switch (language) {
    case "typescript":
      return "unknown";
    case "rust":
      return "String";
    case "python":
      return "Any";
    case "go":
      return "interface{}";
  }
}

function generateTypeScript(table: TableInfo): string {
  const interfaceName = toPascalCase(table.name);
  const lines: string[] = [];
  
  lines.push(`export interface ${interfaceName} {`);
  
  table.columns.forEach((col) => {
    const fieldName = toCamelCase(col.name);
    const fieldType = mapType(col.data_type, "typescript");
    const optional = col.nullable ? "?" : "";
    const comment = col.is_primary_key ? " // Primary Key" : "";
    lines.push(`  ${fieldName}${optional}: ${fieldType};${comment}`);
  });
  
  lines.push("}");
  
  return lines.join("\n");
}

function generateRust(table: TableInfo): string {
  const structName = toPascalCase(table.name);
  const lines: string[] = [];
  
  lines.push("#[derive(Debug, Clone, Serialize, Deserialize)]");
  lines.push(`pub struct ${structName} {`);
  
  table.columns.forEach((col) => {
    const fieldName = toSnakeCase(col.name);
    let fieldType = mapType(col.data_type, "rust");
    if (col.nullable) {
      fieldType = `Option<${fieldType}>`;
    }
    const comment = col.is_primary_key ? " // Primary Key" : "";
    lines.push(`    pub ${fieldName}: ${fieldType},${comment}`);
  });
  
  lines.push("}");
  
  return lines.join("\n");
}

function generatePython(table: TableInfo): string {
  const className = toPascalCase(table.name);
  const lines: string[] = [];
  
  lines.push("from dataclasses import dataclass");
  lines.push("from typing import Optional");
  lines.push("from datetime import datetime, date, time");
  lines.push("from decimal import Decimal");
  lines.push("from uuid import UUID");
  lines.push("");
  lines.push("@dataclass");
  lines.push(`class ${className}:`);
  
  table.columns.forEach((col) => {
    const fieldName = toSnakeCase(col.name);
    let fieldType = mapType(col.data_type, "python");
    if (col.nullable) {
      fieldType = `Optional[${fieldType}]`;
    }
    const comment = col.is_primary_key ? "  # Primary Key" : "";
    lines.push(`    ${fieldName}: ${fieldType}${comment}`);
  });
  
  return lines.join("\n");
}

function generateGo(table: TableInfo): string {
  const structName = toPascalCase(table.name);
  const lines: string[] = [];
  
  lines.push(`type ${structName} struct {`);
  
  table.columns.forEach((col) => {
    const fieldName = toPascalCase(col.name);
    let fieldType = mapType(col.data_type, "go");
    if (col.nullable) {
      fieldType = `*${fieldType}`;
    }
    const jsonTag = `\`json:"${toSnakeCase(col.name)}"\``;
    const comment = col.is_primary_key ? " // Primary Key" : "";
    lines.push(`\t${fieldName} ${fieldType} ${jsonTag}${comment}`);
  });
  
  lines.push("}");
  
  return lines.join("\n");
}

const generators: Record<Language, (table: TableInfo) => string> = {
  typescript: generateTypeScript,
  rust: generateRust,
  python: generatePython,
  go: generateGo,
};

const languageLabels: Record<Language, string> = {
  typescript: "TypeScript",
  rust: "Rust",
  python: "Python",
  go: "Go",
};

// ============================================================================
// Main Component
// ============================================================================

export function CodeGenerator({ table, className }: CodeGeneratorProps) {
  const t = useT();
  const [language, setLanguage] = React.useState<Language>("typescript");
  const [copied, setCopied] = React.useState(false);

  const code = React.useMemo(() => {
    return generators[language](table);
  }, [table, language]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50">
        <div className="flex items-center gap-2">
          <CodeIcon className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">{t('codeGenerator.title')}</h3>
          <span className="text-xs text-muted-foreground">- {table.name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {(Object.keys(languageLabels) as Language[]).map((lang) => (
            <Button
              key={lang}
              variant={language === lang ? "default" : "outline"}
              size="sm"
              onClick={() => setLanguage(lang)}
              className="h-7 text-xs cursor-pointer"
            >
              {languageLabels[lang]}
            </Button>
          ))}
        </div>
      </div>

      {/* Code */}
      <div className="flex-1 overflow-auto p-3 bg-muted/30 scrollbar-thin">
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-7 text-xs cursor-pointer"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <CheckIcon className="h-3.5 w-3.5 mr-1 text-success" />
                {t('codeGenerator.copied')}
              </>
            ) : (
              <>
                <CopyIcon className="h-3.5 w-3.5 mr-1" />
                {t('codeGenerator.copy')}
              </>
            )}
          </Button>
          <pre className="text-xs font-mono bg-background p-3 rounded-lg border border-border overflow-x-auto scrollbar-thin">
            {code}
          </pre>
        </div>
      </div>

      {/* Info */}
      <div className="px-4 py-1.5 border-t border-border text-[10px] text-muted-foreground">
        {t('codeGenerator.generatedInfo', { tableName: table.name, columnCount: table.columns.length })}
      </div>
    </div>
  );
}
