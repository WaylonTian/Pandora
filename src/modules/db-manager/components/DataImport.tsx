import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useT } from '@/i18n';
import { tauriCommands, type Value, type ColumnInfo } from "../store/index";

/**
 * DataImport Component
 * 
 * 批量数据导入组件，支持：
 * - CSV 文件解析
 * - JSON 文件解析
 * - 字段映射配置
 * - 数据预览
 * - 批量导入
 */

// ============================================================================
// Types
// ============================================================================

interface ImportRow {
  [key: string]: string | number | boolean | null;
}

interface FieldMapping {
  sourceField: string;
  targetColumn: string;
}

export interface DataImportProps {
  connectionId: string;
  tableName: string;
  columns: ColumnInfo[];
  onClose: () => void;
  onSuccess: (count: number) => void;
  className?: string;
}

// ============================================================================
// Icons
// ============================================================================

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
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
// Utility Functions
// ============================================================================

function parseCSV(content: string): ImportRow[] {
  const lines = content.trim().split("\n");
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows: ImportRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: ImportRow = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || null;
    });
    rows.push(row);
  }
  
  return rows;
}

function parseJSON(content: string): ImportRow[] {
  try {
    const data = JSON.parse(content);
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  } catch {
    return [];
  }
}

function convertToValue(val: string | number | boolean | null, dataType: string): Value {
  if (val === null || val === "") return null;
  
  const strVal = String(val);
  const lowerType = dataType.toLowerCase();
  
  if (lowerType.includes("int") || lowerType.includes("serial")) {
    const num = parseInt(strVal, 10);
    return isNaN(num) ? null : num;
  }
  
  if (lowerType.includes("float") || lowerType.includes("double") || lowerType.includes("decimal") || lowerType.includes("numeric")) {
    const num = parseFloat(strVal);
    return isNaN(num) ? null : num;
  }
  
  if (lowerType.includes("bool")) {
    return strVal.toLowerCase() === "true" || strVal === "1";
  }
  
  return strVal;
}

// ============================================================================
// Main Component
// ============================================================================

export function DataImport({
  connectionId,
  tableName,
  columns,
  onClose,
  onSuccess,
  className,
}: DataImportProps) {
  const t = useT();
  const [file, setFile] = React.useState<File | null>(null);
  const [parsedData, setParsedData] = React.useState<ImportRow[]>([]);
  const [sourceFields, setSourceFields] = React.useState<string[]>([]);
  const [mappings, setMappings] = React.useState<FieldMapping[]>([]);
  const [isImporting, setIsImporting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState(0);
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setError(null);
    
    const content = await selectedFile.text();
    let data: ImportRow[] = [];
    
    if (selectedFile.name.endsWith(".csv")) {
      data = parseCSV(content);
    } else if (selectedFile.name.endsWith(".json")) {
      data = parseJSON(content);
    } else {
      setError("Unsupported file format, please use CSV or JSON files");
      return;
    }
    
    if (data.length === 0) {
      setError("File is empty or format is incorrect");
      return;
    }
    
    setParsedData(data);
    
    // Extract source fields
    const fields = Object.keys(data[0]);
    setSourceFields(fields);
    
    // Auto-map fields with same names
    const autoMappings: FieldMapping[] = [];
    fields.forEach((field) => {
      const matchingColumn = columns.find(
        (col) => col.name.toLowerCase() === field.toLowerCase()
      );
      if (matchingColumn) {
        autoMappings.push({
          sourceField: field,
          targetColumn: matchingColumn.name,
        });
      }
    });
    setMappings(autoMappings);
  };

  // Update field mapping
  const updateMapping = (sourceField: string, targetColumn: string) => {
    setMappings((prev) => {
      const existing = prev.find((m) => m.sourceField === sourceField);
      if (existing) {
        if (targetColumn === "") {
          return prev.filter((m) => m.sourceField !== sourceField);
        }
        return prev.map((m) =>
          m.sourceField === sourceField ? { ...m, targetColumn } : m
        );
      }
      if (targetColumn !== "") {
        return [...prev, { sourceField, targetColumn }];
      }
      return prev;
    });
  };

  // Execute import
  const handleImport = async () => {
    if (mappings.length === 0) {
      setError("Please map at least one field");
      return;
    }
    
    setIsImporting(true);
    setError(null);
    setProgress(0);
    
    try {
      const targetColumns = mappings.map((m) => m.targetColumn);
      const rows: Value[][] = parsedData.map((row) => {
        return mappings.map((m) => {
          const col = columns.find((c) => c.name === m.targetColumn);
          return convertToValue(row[m.sourceField], col?.data_type || "text");
        });
      });
      
      const count = await tauriCommands.batchImport(
        connectionId,
        tableName,
        targetColumns,
        rows
      );
      
      setProgress(100);
      onSuccess(count);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className={cn("fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm", className)}>
      <div className="bg-card border border-border rounded-xl shadow-xl w-[700px] max-h-[80vh] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <h3 className="text-sm font-semibold">{t("dataImport.importDataTitle", { tableName })}</h3>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-md cursor-pointer transition-colors">
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* File Upload */}
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json"
              onChange={handleFileSelect}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <FileIcon className="h-6 w-6 text-primary" />
                <span className="font-medium">{file.name}</span>
                <span className="text-muted-foreground">({parsedData.length} {t('dataBrowser.rows')})</span>
              </div>
            ) : (
              <div
                className="cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadIcon className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {t("dataImport.uploadPrompt")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("dataImport.supportedFormats")}
                </p>
              </div>
            )}
          </div>
          
          {/* Field Mapping */}
          {sourceFields.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">{t("dataImport.fieldMappingTitle")}</h4>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left">{t("dataImport.sourceFieldHeader")}</th>
                      <th className="px-3 py-2 text-left">{t("dataImport.targetColumnHeader")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sourceFields.map((field) => (
                      <tr key={field} className="border-t border-border">
                        <td className="px-3 py-2">{field}</td>
                        <td className="px-3 py-2">
                          <select
                            value={mappings.find((m) => m.sourceField === field)?.targetColumn || ""}
                            onChange={(e) => updateMapping(field, e.target.value)}
                            className="w-full px-2 py-1 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            <option value="">{t("dataImport.noImportOption")}</option>
                            {columns.map((col) => (
                              <option key={col.name} value={col.name}>
                                {col.name} ({col.data_type})
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* Preview */}
          {parsedData.length > 0 && mappings.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">{t("dataImport.dataPreviewTitle")}</h4>
              <div className="border border-border rounded-lg overflow-auto max-h-40">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      {mappings.map((m) => (
                        <th key={m.targetColumn} className="px-3 py-2 text-left whitespace-nowrap">
                          {m.targetColumn}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-t border-border">
                        {mappings.map((m) => (
                          <td key={m.targetColumn} className="px-3 py-2 whitespace-nowrap">
                            {String(row[m.sourceField] ?? "NULL")}
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
          
          {/* Progress */}
          {isImporting && (
            <div className="space-y-1.5">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-center text-muted-foreground">
                {t("dataImport.importingMessage")}
              </p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-2.5 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isImporting} className="cursor-pointer">
            {t("dataImport.cancelButton")}
          </Button>
          <Button
            size="sm"
            onClick={handleImport}
            disabled={isImporting || mappings.length === 0}
            className="cursor-pointer"
          >
            {isImporting ? t("dataImport.importingMessage") : t("dataImport.importRowsButton", { count: parsedData.length })}
          </Button>
        </div>
      </div>
    </div>
  );
}
