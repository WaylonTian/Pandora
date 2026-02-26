import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/i18n";
import { tauriCommands, type TableInfo, type ColumnDefinition } from "../store/index";

/**
 * TableDesigner Component
 *
 * A table structure editor for creating and modifying database tables.
 * Features:
 * - Table name input
 * - Column definition editing (add, remove, edit, reorder)
 * - Data type dropdown with common types
 * - SQL preview (CREATE TABLE or ALTER TABLE)
 * - Save and Cancel buttons
 * - Validation for required fields
 *
 * Requirements:
 * - 5.2: THE Schema_Manager SHALL 允许用户创建新表
 * - 5.3: THE Schema_Manager SHALL 允许用户添加、修改和删除列
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface TableDesignerProps {
  /** Connection ID for the database */
  connectionId: string;
  /** Database name for context switching */
  database?: string;
  /** Table name for editing existing table, undefined for new table */
  tableName?: string;
  /** Callback when table is saved */
  onSave: (tableInfo: TableInfo) => void;
  /** Callback when cancel is clicked */
  onCancel?: () => void;
  /** Optional className for the container */
  className?: string;
}

interface EditableColumn extends ColumnDefinition {
  /** Unique ID for React key */
  id: string;
  /** Whether this is a new column (for ALTER TABLE) */
  isNew?: boolean;
  /** Whether this column was modified (for ALTER TABLE) */
  isModified?: boolean;
  /** Whether this column should be deleted (for ALTER TABLE) */
  isDeleted?: boolean;
  /** Original column name (for ALTER TABLE rename) */
  originalName?: string;
}

interface FormErrors {
  tableName?: string;
  columns?: Record<string, string>;
}

// Common SQL data types
const DATA_TYPES = [
  // Numeric types
  "INT",
  "BIGINT",
  "SMALLINT",
  "TINYINT",
  "DECIMAL",
  "FLOAT",
  "DOUBLE",
  // String types
  "VARCHAR(255)",
  "VARCHAR(50)",
  "VARCHAR(100)",
  "CHAR(1)",
  "TEXT",
  "MEDIUMTEXT",
  "LONGTEXT",
  // Date/Time types
  "DATE",
  "DATETIME",
  "TIMESTAMP",
  "TIME",
  "YEAR",
  // Boolean
  "BOOLEAN",
  // Binary types
  "BLOB",
  "BINARY",
  // JSON
  "JSON",
];

// ============================================================================
// Icon Components
// ============================================================================

/**
 * Loading spinner icon
 */
function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin", className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/**
 * Plus icon for adding columns
 */
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

/**
 * Trash icon for deleting columns
 */
function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

/**
 * Arrow up icon for moving columns up
 */
function ArrowUpIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  );
}

/**
 * Arrow down icon for moving columns down
 */
function ArrowDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  );
}

/**
 * Key icon for primary key
 */
function KeyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}

/**
 * Lightning bolt icon for auto increment
 */
function BoltIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

/**
 * Code icon for SQL preview
 */
function CodeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

/**
 * Table icon
 */
function TableIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
    </svg>
  );
}

/**
 * Alert icon for errors
 */
function AlertIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generates a unique ID for columns
 */
function generateId(): string {
  return `col-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Creates a default column definition
 */
function createDefaultColumn(): EditableColumn {
  return {
    id: generateId(),
    name: "",
    data_type: "VARCHAR(255)",
    nullable: true,
    default_value: undefined,
    is_primary_key: false,
    is_auto_increment: false,
    isNew: true,
  };
}

/**
 * Converts TableInfo columns to EditableColumns
 */
function tableInfoToEditableColumns(tableInfo: TableInfo): EditableColumn[] {
  return tableInfo.columns.map((col) => ({
    ...col,
    id: generateId(),
    originalName: col.name,
    isNew: false,
    isModified: false,
    isDeleted: false,
  }));
}

/**
 * Escapes a SQL identifier (table/column name)
 */
function escapeIdentifier(name: string): string {
  // Use backticks for MySQL compatibility
  return `\`${name.replace(/`/g, "``")}\``;
}

/**
 * Generates CREATE TABLE SQL
 */
function generateCreateTableSql(tableName: string, columns: EditableColumn[]): string {
  const activeColumns = columns.filter((col) => !col.isDeleted && col.name.trim());
  
  if (!tableName.trim() || activeColumns.length === 0) {
    return "-- Please enter a table name and at least one column";
  }

  const columnDefs = activeColumns.map((col) => {
    let def = `  ${escapeIdentifier(col.name)} ${col.data_type}`;
    
    if (!col.nullable) {
      def += " NOT NULL";
    }
    
    if (col.default_value !== undefined && col.default_value !== "") {
      // Check if default value needs quotes
      const needsQuotes = !["NULL", "CURRENT_TIMESTAMP", "NOW()"].includes(col.default_value.toUpperCase()) 
        && isNaN(Number(col.default_value));
      def += needsQuotes 
        ? ` DEFAULT '${col.default_value.replace(/'/g, "''")}'`
        : ` DEFAULT ${col.default_value}`;
    }
    
    if (col.is_auto_increment) {
      def += " AUTO_INCREMENT";
    }
    
    if (col.is_primary_key) {
      def += " PRIMARY KEY";
    }
    
    return def;
  });

  return `CREATE TABLE ${escapeIdentifier(tableName)} (\n${columnDefs.join(",\n")}\n);`;
}

/**
 * Generates ALTER TABLE SQL for modifications
 */
function generateAlterTableSql(
  tableName: string,
  columns: EditableColumn[],
  originalColumns: EditableColumn[]
): string {
  const statements: string[] = [];
  const escapedTable = escapeIdentifier(tableName);

  // Find deleted columns
  const deletedColumns = columns.filter((col) => col.isDeleted && !col.isNew);
  deletedColumns.forEach((col) => {
    statements.push(`ALTER TABLE ${escapedTable} DROP COLUMN ${escapeIdentifier(col.originalName || col.name)};`);
  });

  // Find new columns
  const newColumns = columns.filter((col) => col.isNew && !col.isDeleted && col.name.trim());
  newColumns.forEach((col) => {
    let def = `ALTER TABLE ${escapedTable} ADD COLUMN ${escapeIdentifier(col.name)} ${col.data_type}`;
    
    if (!col.nullable) {
      def += " NOT NULL";
    }
    
    if (col.default_value !== undefined && col.default_value !== "") {
      const needsQuotes = !["NULL", "CURRENT_TIMESTAMP", "NOW()"].includes(col.default_value.toUpperCase()) 
        && isNaN(Number(col.default_value));
      def += needsQuotes 
        ? ` DEFAULT '${col.default_value.replace(/'/g, "''")}'`
        : ` DEFAULT ${col.default_value}`;
    }
    
    if (col.is_auto_increment) {
      def += " AUTO_INCREMENT";
    }
    
    if (col.is_primary_key) {
      def += " PRIMARY KEY";
    }
    
    statements.push(def + ";");
  });

  // Find modified columns
  const modifiedColumns = columns.filter((col) => col.isModified && !col.isNew && !col.isDeleted);
  modifiedColumns.forEach((col) => {
    const originalCol = originalColumns.find((oc) => oc.originalName === col.originalName);
    if (!originalCol) return;

    // Check if column was renamed
    if (col.name !== col.originalName) {
      statements.push(
        `ALTER TABLE ${escapedTable} RENAME COLUMN ${escapeIdentifier(col.originalName!)} TO ${escapeIdentifier(col.name)};`
      );
    }

    // Check if column definition changed
    const defChanged = 
      col.data_type !== originalCol.data_type ||
      col.nullable !== originalCol.nullable ||
      col.default_value !== originalCol.default_value ||
      col.is_auto_increment !== originalCol.is_auto_increment;

    if (defChanged) {
      let def = `ALTER TABLE ${escapedTable} MODIFY COLUMN ${escapeIdentifier(col.name)} ${col.data_type}`;
      
      if (!col.nullable) {
        def += " NOT NULL";
      }
      
      if (col.default_value !== undefined && col.default_value !== "") {
        const needsQuotes = !["NULL", "CURRENT_TIMESTAMP", "NOW()"].includes(col.default_value.toUpperCase()) 
          && isNaN(Number(col.default_value));
        def += needsQuotes 
          ? ` DEFAULT '${col.default_value.replace(/'/g, "''")}'`
          : ` DEFAULT ${col.default_value}`;
      }
      
      if (col.is_auto_increment) {
        def += " AUTO_INCREMENT";
      }
      
      statements.push(def + ";");
    }
  });

  if (statements.length === 0) {
    return "-- No changes to apply";
  }

  return statements.join("\n");
}

/**
 * Validates the form and returns errors
 */
function validateForm(tableName: string, columns: EditableColumn[]): FormErrors {
  const errors: FormErrors = {};
  const columnErrors: Record<string, string> = {};

  // Validate table name
  if (!tableName.trim()) {
    errors.tableName = "Table name is required";
  } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
    errors.tableName = "Table name must start with a letter or underscore and contain only letters, numbers, and underscores";
  }

  // Validate columns
  const activeColumns = columns.filter((col) => !col.isDeleted);
  
  if (activeColumns.length === 0) {
    errors.tableName = errors.tableName || "At least one column is required";
  }

  const columnNames = new Set<string>();
  activeColumns.forEach((col) => {
    if (!col.name.trim()) {
      columnErrors[col.id] = "Column name is required";
    } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col.name)) {
      columnErrors[col.id] = "Invalid column name";
    } else if (columnNames.has(col.name.toLowerCase())) {
      columnErrors[col.id] = "Duplicate column name";
    } else {
      columnNames.add(col.name.toLowerCase());
    }
  });

  if (Object.keys(columnErrors).length > 0) {
    errors.columns = columnErrors;
  }

  return errors;
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Loading state component
 */
function LoadingState() {
  const t = useT();
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-muted-foreground">
      <LoadingSpinner className="h-8 w-8" />
      <p className="text-sm">{t('tableDesigner.loadingStructure')}</p>
    </div>
  );
}

/**
 * Error state component
 */
function ErrorState({ error }: { error: string }) {
  const t = useT();
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 p-4">
      <div className="flex items-center gap-2 text-destructive">
        <AlertIcon className="h-6 w-6" />
        <span className="font-medium">{t('tableDesigner.error')}</span>
      </div>
      <div className="max-w-full rounded-md border border-destructive/30 bg-destructive/10 p-4">
        <pre className="whitespace-pre-wrap break-words text-sm text-destructive">
          {error}
        </pre>
      </div>
    </div>
  );
}

/**
 * Column row editor component
 */
interface ColumnRowProps {
  column: EditableColumn;
  index: number;
  totalColumns: number;
  error?: string;
  t: (key: string, params?: Record<string, any>) => string;
  onUpdate: (id: string, updates: Partial<EditableColumn>) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}

function ColumnRow({
  column,
  index,
  totalColumns,
  error,
  t,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: ColumnRowProps) {
  const isFirst = index === 0;
  const isLast = index === totalColumns - 1;

  return (
    <div
      className={cn(
        "grid grid-cols-[1fr_150px_80px_120px_60px_60px_100px] gap-2 items-center p-2 rounded-md",
        column.isDeleted && "opacity-50 bg-destructive/10",
        column.isNew && !column.isDeleted && "bg-green-500/10",
        column.isModified && !column.isNew && !column.isDeleted && "bg-amber-500/10",
        error && "ring-1 ring-destructive"
      )}
    >
      {/* Column Name */}
      <div className="relative">
        <Input
          type="text"
          value={column.name}
          onChange={(e) => onUpdate(column.id, { name: e.target.value, isModified: true })}
          placeholder="column_name"
          disabled={column.isDeleted}
          className={cn("h-8 text-sm font-mono", error && "border-destructive")}
        />
        {error && (
          <span className="absolute -bottom-5 left-0 text-xs text-destructive">{error}</span>
        )}
      </div>

      {/* Data Type */}
      <select
        value={column.data_type}
        onChange={(e) => onUpdate(column.id, { data_type: e.target.value, isModified: true })}
        disabled={column.isDeleted}
        className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {DATA_TYPES.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>

      {/* Nullable */}
      <label className="flex items-center justify-center gap-1 cursor-pointer">
        <input
          type="checkbox"
          checked={column.nullable}
          onChange={(e) => onUpdate(column.id, { nullable: e.target.checked, isModified: true })}
          disabled={column.isDeleted}
          className="h-4 w-4 rounded border-input"
        />
        <span className="text-xs text-muted-foreground">NULL</span>
      </label>

      {/* Default Value */}
      <Input
        type="text"
        value={column.default_value || ""}
        onChange={(e) => onUpdate(column.id, { default_value: e.target.value || undefined, isModified: true })}
        placeholder="Default"
        disabled={column.isDeleted}
        className="h-8 text-sm"
      />

      {/* Primary Key */}
      <button
        type="button"
        onClick={() => onUpdate(column.id, { is_primary_key: !column.is_primary_key, isModified: true })}
        disabled={column.isDeleted}
        className={cn(
          "flex items-center justify-center h-8 w-8 mx-auto rounded-md transition-colors",
          column.is_primary_key
            ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
            : "bg-muted text-muted-foreground hover:bg-muted/80"
        )}
        title={t('tableDesigner.primaryKey')}
      >
        <KeyIcon className="h-4 w-4" />
      </button>

      {/* Auto Increment */}
      <button
        type="button"
        onClick={() => onUpdate(column.id, { is_auto_increment: !column.is_auto_increment, isModified: true })}
        disabled={column.isDeleted}
        className={cn(
          "flex items-center justify-center h-8 w-8 mx-auto rounded-md transition-colors",
          column.is_auto_increment
            ? "bg-blue-500/20 text-blue-600 dark:text-blue-400"
            : "bg-muted text-muted-foreground hover:bg-muted/80"
        )}
        title={t('tableDesigner.autoIncrement')}
      >
        <BoltIcon className="h-4 w-4" />
      </button>

      {/* Actions */}
      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          onClick={() => onMoveUp(column.id)}
          disabled={isFirst || column.isDeleted}
          className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
          title={t('tableDesigner.moveUp')}
        >
          <ArrowUpIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onMoveDown(column.id)}
          disabled={isLast || column.isDeleted}
          className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
          title={t('tableDesigner.moveDown')}
        >
          <ArrowDownIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(column.id)}
          className={cn(
            "p-1 rounded transition-colors",
            column.isDeleted
              ? "text-green-600 hover:bg-green-500/20"
              : "text-destructive hover:bg-destructive/20"
          )}
          title={column.isDeleted ? t('tableDesigner.restoreColumn') : t('tableDesigner.deleteColumn')}
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * SQL Preview component
 */
interface SqlPreviewProps {
  sql: string;
  t: (key: string, params?: Record<string, any>) => string;
}

function SqlPreview({ sql, t }: SqlPreviewProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  };

  return (
    <div className="rounded-md border border-border bg-muted/30">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <CodeIcon className="h-4 w-4" />
          <span>SQL Preview</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 text-xs"
        >
          {copied ? t('tableDesigner.copied') : t('tableDesigner.copy')}
        </Button>
      </div>
      <pre className="overflow-auto p-3 text-sm font-mono text-muted-foreground max-h-[200px]">
        {sql}
      </pre>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * TableDesigner component
 *
 * A comprehensive table structure editor for creating and modifying database tables.
 *
 * **Validates: Requirements 5.2, 5.3**
 */
export function TableDesigner({
  connectionId,
  database,
  tableName: existingTableName,
  onSave,
  onCancel,
  className,
}: TableDesignerProps) {
  const t = useT();
  
  // State
  const [tableName, setTableName] = React.useState(existingTableName || "");
  const [columns, setColumns] = React.useState<EditableColumn[]>([createDefaultColumn()]);
  const [originalColumns, setOriginalColumns] = React.useState<EditableColumn[]>([]);
  const [isLoading, setIsLoading] = React.useState(!!existingTableName);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<FormErrors>({});

  const isEditMode = !!existingTableName;

  // Load existing table structure
  React.useEffect(() => {
    if (existingTableName && connectionId) {
      setIsLoading(true);
      setError(null);

      tauriCommands
        .getTableInfo(connectionId, existingTableName, database)
        .then((tableInfo) => {
          const editableColumns = tableInfoToEditableColumns(tableInfo);
          setColumns(editableColumns);
          setOriginalColumns(JSON.parse(JSON.stringify(editableColumns)));
          setTableName(tableInfo.name);
          setIsLoading(false);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : String(err));
          setIsLoading(false);
        });
    }
  }, [existingTableName, connectionId]);

  // Generate SQL preview
  const sqlPreview = React.useMemo(() => {
    if (isEditMode) {
      return generateAlterTableSql(tableName, columns, originalColumns);
    }
    return generateCreateTableSql(tableName, columns);
  }, [tableName, columns, originalColumns, isEditMode]);

  // Column operations
  const handleAddColumn = () => {
    setColumns((prev) => [...prev, createDefaultColumn()]);
  };

  const handleUpdateColumn = (id: string, updates: Partial<EditableColumn>) => {
    setColumns((prev) =>
      prev.map((col) => (col.id === id ? { ...col, ...updates } : col))
    );
    // Clear column error when updating
    if (errors.columns?.[id]) {
      setErrors((prev) => {
        const newColumnErrors = { ...prev.columns };
        delete newColumnErrors[id];
        return {
          ...prev,
          columns: Object.keys(newColumnErrors).length > 0 ? newColumnErrors : undefined,
        };
      });
    }
  };

  const handleDeleteColumn = (id: string) => {
    setColumns((prev) =>
      prev.map((col) => {
        if (col.id !== id) return col;
        // Toggle delete state
        if (col.isNew) {
          // For new columns, actually remove them
          return { ...col, isDeleted: !col.isDeleted };
        }
        // For existing columns, mark as deleted
        return { ...col, isDeleted: !col.isDeleted };
      })
    );
  };

  const handleMoveUp = (id: string) => {
    setColumns((prev) => {
      const index = prev.findIndex((col) => col.id === id);
      if (index <= 0) return prev;
      const newColumns = [...prev];
      [newColumns[index - 1], newColumns[index]] = [newColumns[index], newColumns[index - 1]];
      return newColumns;
    });
  };

  const handleMoveDown = (id: string) => {
    setColumns((prev) => {
      const index = prev.findIndex((col) => col.id === id);
      if (index < 0 || index >= prev.length - 1) return prev;
      const newColumns = [...prev];
      [newColumns[index], newColumns[index + 1]] = [newColumns[index + 1], newColumns[index]];
      return newColumns;
    });
  };

  // Handle save
  const handleSave = async () => {
    // Validate form
    const validationErrors = validateForm(tableName, columns);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Execute the SQL
      const sql = isEditMode
        ? generateAlterTableSql(tableName, columns, originalColumns)
        : generateCreateTableSql(tableName, columns);

      // Skip if no changes
      if (sql.startsWith("-- ")) {
        setIsSaving(false);
        return;
      }

      // Execute each statement
      const statements = sql.split(";").filter((s) => s.trim());
      for (const statement of statements) {
        if (statement.trim()) {
          await tauriCommands.executeQuery(connectionId, statement + ";", database);
        }
      }

      // Build TableInfo for callback
      const activeColumns = columns.filter((col) => !col.isDeleted);
      const tableInfo: TableInfo = {
        name: tableName,
        columns: activeColumns.map((col) => ({
          name: col.name,
          data_type: col.data_type,
          nullable: col.nullable,
          default_value: col.default_value,
          is_primary_key: col.is_primary_key,
          is_auto_increment: col.is_auto_increment,
        })),
        indexes: [],
        foreign_keys: [],
      };

      onSave(tableInfo);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className={cn("flex h-full flex-col bg-background", className)}>
        <LoadingState />
      </div>
    );
  }

  // Filter out completely removed new columns for display
  const displayColumns = columns.filter((col) => !(col.isNew && col.isDeleted));

  return (
    <div className={cn("flex h-full flex-col bg-background", className)}>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-4 py-3">
        <TableIcon className="h-5 w-5 text-muted-foreground" />
        <h2 className="font-medium">
          {isEditMode ? t('tableDesigner.editTable', { name: existingTableName }) : t('tableDesigner.createNewTable')}
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Error display */}
        {error && <ErrorState error={error} />}

        {/* Table Name */}
        <div className="space-y-2">
          <Label htmlFor="table-name" className="flex items-center gap-1">
            Table Name
            <span className="text-destructive">*</span>
          </Label>
          <Input
            id="table-name"
            type="text"
            value={tableName}
            onChange={(e) => {
              setTableName(e.target.value);
              if (errors.tableName) {
                setErrors((prev) => ({ ...prev, tableName: undefined }));
              }
            }}
            placeholder="my_table"
            disabled={isEditMode || isSaving}
            className={cn("max-w-md font-mono", errors.tableName && "border-destructive")}
          />
          {errors.tableName && (
            <p className="text-sm text-destructive">{errors.tableName}</p>
          )}
        </div>

        {/* Columns Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">{t('tableDesigner.columns')}</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddColumn}
              disabled={isSaving}
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Column
            </Button>
          </div>

          {/* Column Headers */}
          <div className="grid grid-cols-[1fr_150px_80px_120px_60px_60px_100px] gap-2 px-2 text-xs font-medium text-muted-foreground">
            <span>{t('tableDesigner.name')}</span>
            <span>{t('tableDesigner.type')}</span>
            <span className="text-center">{t('tableDesigner.nullable')}</span>
            <span>{t('tableDesigner.default')}</span>
            <span className="text-center" title="Primary Key">PK</span>
            <span className="text-center" title="Auto Increment">AI</span>
            <span className="text-right">{t('tableDesigner.actions')}</span>
          </div>

          {/* Column Rows */}
          <div className="space-y-1">
            {displayColumns.map((column, index) => (
              <ColumnRow
                key={column.id}
                column={column}
                index={index}
                totalColumns={displayColumns.length}
                error={errors.columns?.[column.id]}
                t={t}
                onUpdate={handleUpdateColumn}
                onDelete={handleDeleteColumn}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
              />
            ))}
          </div>

          {displayColumns.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">{t('tableDesigner.noColumns')}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddColumn}
                className="mt-2"
              >
                <PlusIcon className="mr-2 h-4 w-4" />
                Add First Column
              </Button>
            </div>
          )}
        </div>

        {/* SQL Preview */}
        <SqlPreview sql={sqlPreview} t={t} />
      </div>

      {/* Footer with actions */}
      <div className="flex items-center justify-end gap-3 border-t border-border px-4 py-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
        )}
        <Button type="button" onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <LoadingSpinner className="mr-2 h-4 w-4" />
              {isEditMode ? t('tableDesigner.applyingChanges') : t('tableDesigner.creatingTable')}
            </>
          ) : (
            isEditMode ? t('tableDesigner.applyChanges') : t('tableDesigner.createTable')
          )}
        </Button>
      </div>
    </div>
  );
}

export default TableDesigner;
