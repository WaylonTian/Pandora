import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useAppStore,
  type ConnectionConfig,
  type DatabaseType,
} from "../store/index";
import { useT } from '@/i18n';

/**
 * Connection Dialog Component
 *
 * A modal dialog for creating and configuring database connections.
 * Supports MySQL, PostgreSQL, and SQLite database types with dynamic
 * form fields based on the selected type.
 *
 * Requirements:
 * - 1.1: Allow users to input host, port, username, password, and database name
 * - 1.3: Test connection functionality
 * - 2.4: Show database type-specific connection parameters
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface ConnectionDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when the dialog should close */
  onClose: () => void;
  /** Optional existing connection to edit */
  editConnection?: ConnectionConfig;
  /** Optional className for the dialog */
  className?: string;
}

interface FormState {
  name: string;
  db_type: DatabaseType;
  host: string;
  port: string;
  username: string;
  password: string;
  database: string;
  file_path: string;
}

interface FormErrors {
  name?: string;
  host?: string;
  port?: string;
  database?: string;
  file_path?: string;
}

type TestConnectionStatus = "idle" | "testing" | "success" | "error";

// ============================================================================
// Constants
// ============================================================================

const DATABASE_TYPES: DatabaseType[] = ["MySQL", "PostgreSQL", "SQLite"];

const DEFAULT_PORTS: Record<DatabaseType, number> = {
  MySQL: 3306,
  PostgreSQL: 5432,
  SQLite: 0,
};

const INITIAL_FORM_STATE: FormState = {
  name: "",
  db_type: "MySQL",
  host: "localhost",
  port: "3306",
  username: "",
  password: "",
  database: "",
  file_path: "",
};

// ============================================================================
// Icon Components
// ============================================================================

/** Close icon (X) */
function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-4 w-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/** Loading spinner icon */
function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin", className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
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

/** Check icon for success state */
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-4 w-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/** Alert icon for error state */
function AlertIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-4 w-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
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
 * Generates a unique ID for new connections
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Validates the form state and returns any errors
 */
function validateForm(form: FormState): FormErrors {
  const errors: FormErrors = {};

  if (!form.name.trim()) {
    errors.name = "Connection name is required";
  }

  if (form.db_type === "SQLite") {
    if (!form.file_path.trim()) {
      errors.file_path = "Database file path is required";
    }
  } else {
    if (!form.host.trim()) {
      errors.host = "Host is required";
    }

    const port = parseInt(form.port, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      errors.port = "Port must be between 1 and 65535";
    }
  }

  if (!form.database.trim()) {
    errors.database = "Database name is required";
  }

  return errors;
}

/**
 * Converts form state to ConnectionConfig
 */
function formToConfig(form: FormState, existingId?: string): ConnectionConfig {
  const config: ConnectionConfig = {
    id: existingId || generateId(),
    name: form.name.trim(),
    db_type: form.db_type,
    database: form.database.trim(),
  };

  if (form.db_type === "SQLite") {
    config.file_path = form.file_path.trim();
  } else {
    config.host = form.host.trim();
    config.port = parseInt(form.port, 10);
    if (form.username.trim()) {
      config.username = form.username.trim();
    }
    if (form.password) {
      config.password = form.password;
    }
  }

  return config;
}

/**
 * Converts ConnectionConfig to form state
 */
function configToForm(config: ConnectionConfig): FormState {
  return {
    name: config.name,
    db_type: config.db_type,
    host: config.host || "localhost",
    port: config.port?.toString() || DEFAULT_PORTS[config.db_type].toString(),
    username: config.username || "",
    password: config.password || "",
    database: config.database,
    file_path: config.file_path || "",
  };
}

// ============================================================================
// Form Field Components
// ============================================================================

interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

function FormField({
  label,
  htmlFor,
  error,
  required,
  children,
}: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className="flex items-center gap-1">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Database Type Selector Component
// ============================================================================

interface DatabaseTypeSelectorProps {
  value: DatabaseType;
  onChange: (type: DatabaseType) => void;
}

function DatabaseTypeSelector({ value, onChange }: DatabaseTypeSelectorProps) {
  const t = useT();
  return (
    <div className="space-y-2">
      <Label>{t('connectionDialog.databaseType')}</Label>
      <div className="flex gap-2">
        {DATABASE_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            className={cn(
              "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-200 cursor-pointer",
              value === type
                ? "border-primary bg-primary/10 text-primary shadow-glow-sm"
                : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
            )}
            onClick={() => onChange(type)}
          >
            {type}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Test Connection Result Component
// ============================================================================

interface TestConnectionResultProps {
  status: TestConnectionStatus;
  errorMessage?: string;
}

function TestConnectionResult({
  status,
  errorMessage,
}: TestConnectionResultProps) {
  const t = useT();
  if (status === "idle") return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm",
        status === "testing" && "bg-muted text-muted-foreground",
        status === "success" && "bg-success/10 text-success",
        status === "error" && "bg-destructive/10 text-destructive"
      )}
      role="status"
      aria-live="polite"
    >
      {status === "testing" && (
        <>
          <LoadingSpinner className="h-4 w-4" />
          <span>{t('connectionDialog.testingConnection')}</span>
        </>
      )}
      {status === "success" && (
        <>
          <CheckIcon className="h-4 w-4" />
          <span>{t('connectionDialog.connectionSuccessful')}</span>
        </>
      )}
      {status === "error" && (
        <>
          <AlertIcon className="h-4 w-4" />
          <span>{errorMessage || t('connectionDialog.connectionFailed')}</span>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Main ConnectionDialog Component
// ============================================================================

export function ConnectionDialog({
  isOpen,
  onClose,
  editConnection,
  className,
}: ConnectionDialogProps) {
  const t = useT();
  // Form state
  const [form, setForm] = React.useState<FormState>(INITIAL_FORM_STATE);
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [testStatus, setTestStatus] = React.useState<TestConnectionStatus>("idle");
  const [testError, setTestError] = React.useState<string>("");
  const [isSaving, setIsSaving] = React.useState(false);

  // Store actions
  const addConnection = useAppStore((state) => state.addConnection);
  const testConnection = useAppStore((state) => state.testConnection);

  // Dialog ref for focus management
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const firstInputRef = React.useRef<HTMLInputElement>(null);

  // Initialize form when dialog opens or editConnection changes
  React.useEffect(() => {
    if (isOpen) {
      if (editConnection) {
        setForm(configToForm(editConnection));
      } else {
        setForm(INITIAL_FORM_STATE);
      }
      setErrors({});
      setTestStatus("idle");
      setTestError("");
      setIsSaving(false);

      // Focus first input after dialog opens
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 0);
    }
  }, [isOpen, editConnection]);

  // Handle escape key to close dialog
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Handle click outside to close dialog
  const handleBackdropClick = React.useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  // Handle database type change
  const handleTypeChange = React.useCallback((type: DatabaseType) => {
    setForm((prev) => ({
      ...prev,
      db_type: type,
      port: DEFAULT_PORTS[type].toString(),
    }));
    setErrors({});
    setTestStatus("idle");
  }, []);

  // Handle form field change
  const handleFieldChange = React.useCallback(
    (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      // Clear error for this field when user starts typing
      if (errors[field as keyof FormErrors]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
      // Reset test status when form changes
      if (testStatus !== "idle") {
        setTestStatus("idle");
      }
    },
    [errors, testStatus]
  );

  // Handle test connection
  const handleTestConnection = React.useCallback(async () => {
    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setTestStatus("testing");
    setTestError("");

    try {
      const config = formToConfig(form, editConnection?.id);
      const success = await testConnection(config);
      setTestStatus(success ? "success" : "error");
      if (!success) {
        setTestError("Connection test failed");
      }
    } catch (error) {
      setTestStatus("error");
      setTestError(error instanceof Error ? error.message : "Connection test failed");
    }
  }, [form, editConnection?.id, testConnection]);

  // Handle save connection
  const handleSave = React.useCallback(async () => {
    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSaving(true);

    try {
      const config = formToConfig(form, editConnection?.id);
      await addConnection(config);
      onClose();
    } catch (error) {
      setTestStatus("error");
      setTestError(error instanceof Error ? error.message : "Failed to save connection");
    } finally {
      setIsSaving(false);
    }
  }, [form, editConnection?.id, addConnection, onClose]);

  // Don't render if not open
  if (!isOpen) return null;

  const isSQLite = form.db_type === "SQLite";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="connection-dialog-title"
    >
      <div
        ref={dialogRef}
        className={cn(
          "w-full max-w-md animate-fade-in rounded-xl border border-border bg-card p-6 shadow-xl",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 id="connection-dialog-title" className="text-lg font-semibold">
            {editConnection ? t('connectionDialog.editConnection') : t('connectionDialog.newConnection')}
          </h2>
          <button
            type="button"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
            onClick={onClose}
            aria-label={t('connectionDialog.closeDialog')}
          >
            <CloseIcon />
          </button>
        </div>

        {/* Form */}
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          {/* Connection Name */}
          <FormField
            label={t('connectionDialog.connectionName')}
            htmlFor="connection-name"
            error={errors.name}
            required
          >
            <Input
              ref={firstInputRef}
              id="connection-name"
              value={form.name}
              onChange={handleFieldChange("name")}
              placeholder="My Database"
              aria-invalid={!!errors.name}
            />
          </FormField>

          {/* Database Type Selector */}
          <DatabaseTypeSelector
            value={form.db_type}
            onChange={handleTypeChange}
          />

          {/* Dynamic Fields based on Database Type */}
          {isSQLite ? (
            <>
              {/* SQLite: File Path */}
              <FormField
                label={t('connectionDialog.databaseFilePath')}
                htmlFor="file-path"
                error={errors.file_path}
                required
              >
                <Input
                  id="file-path"
                  value={form.file_path}
                  onChange={handleFieldChange("file_path")}
                  placeholder="/path/to/database.db"
                  aria-invalid={!!errors.file_path}
                />
              </FormField>

              {/* SQLite: Database Name */}
              <FormField
                label={t('connectionDialog.databaseName')}
                htmlFor="database"
                error={errors.database}
                required
              >
                <Input
                  id="database"
                  value={form.database}
                  onChange={handleFieldChange("database")}
                  placeholder="main"
                  aria-invalid={!!errors.database}
                />
              </FormField>
            </>
          ) : (
            <>
              {/* MySQL/PostgreSQL: Host and Port */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <FormField
                    label={t('connectionDialog.host')}
                    htmlFor="host"
                    error={errors.host}
                    required
                  >
                    <Input
                      id="host"
                      value={form.host}
                      onChange={handleFieldChange("host")}
                      placeholder="localhost"
                      aria-invalid={!!errors.host}
                    />
                  </FormField>
                </div>
                <FormField
                  label={t('connectionDialog.port')}
                  htmlFor="port"
                  error={errors.port}
                  required
                >
                  <Input
                    id="port"
                    type="number"
                    value={form.port}
                    onChange={handleFieldChange("port")}
                    placeholder={DEFAULT_PORTS[form.db_type].toString()}
                    min={1}
                    max={65535}
                    aria-invalid={!!errors.port}
                  />
                </FormField>
              </div>

              {/* MySQL/PostgreSQL: Username and Password */}
              <div className="grid grid-cols-2 gap-4">
                <FormField label={t('connectionDialog.username')} htmlFor="username">
                  <Input
                    id="username"
                    value={form.username}
                    onChange={handleFieldChange("username")}
                    placeholder="root"
                  />
                </FormField>
                <FormField label={t('connectionDialog.password')} htmlFor="password">
                  <Input
                    id="password"
                    type="password"
                    value={form.password}
                    onChange={handleFieldChange("password")}
                    placeholder="••••••••"
                  />
                </FormField>
              </div>

              {/* MySQL/PostgreSQL: Database Name */}
              <FormField
                label={t('connectionDialog.database')}
                htmlFor="database"
                error={errors.database}
                required
              >
                <Input
                  id="database"
                  value={form.database}
                  onChange={handleFieldChange("database")}
                  placeholder="mydb"
                  aria-invalid={!!errors.database}
                />
              </FormField>
            </>
          )}

          {/* Test Connection Result */}
          <TestConnectionResult status={testStatus} errorMessage={testError} />

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer">
              {t('dbManager.cancel')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleTestConnection}
              disabled={testStatus === "testing" || isSaving}
              className="cursor-pointer"
            >
              {testStatus === "testing" ? (
                <>
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                  {t('connectionDialog.testing')}
                </>
              ) : (
                t('connectionDialog.testConnection')
              )}
            </Button>
            <Button type="submit" disabled={isSaving || testStatus === "testing"}>
              {isSaving ? (
                <>
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                  {t('connectionDialog.saving')}
                </>
              ) : (
                t('connectionDialog.save')
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ConnectionDialog;
