import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Confirm Dialog Component
 *
 * A modal dialog for confirming destructive operations like
 * delete connection, clear history, drop table, etc.
 *
 * Requirements:
 * - 1.5: IF 连接失败，THEN THE Connection_Manager SHALL 显示详细的错误信息
 * - 3.4: WHEN 查询执行出错时，THE Query_Executor SHALL 显示错误信息和错误位置
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface ConfirmDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when the dialog should close */
  onClose: () => void;
  /** Callback when the user confirms the action */
  onConfirm: () => void | Promise<void>;
  /** Dialog title */
  title: string;
  /** Dialog message/description */
  message: string;
  /** Label for the confirm button (default: "Confirm") */
  confirmLabel?: string;
  /** Label for the cancel button (default: "Cancel") */
  cancelLabel?: string;
  /** Variant for the confirm button (default: "destructive") */
  confirmVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  /** Optional icon to display */
  icon?: React.ReactNode;
  /** Whether the confirm action is loading */
  isLoading?: boolean;
  /** Optional className for the dialog */
  className?: string;
}

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

/** Alert triangle icon for warning/destructive actions */
function AlertTriangleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-6 w-6", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

/** Trash icon for delete actions */
export function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-6 w-6", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

/** Info icon for informational dialogs */
export function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-6 w-6", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

// ============================================================================
// Confirm Dialog Component
// ============================================================================

/**
 * ConfirmDialog - Modal confirmation dialog
 *
 * Displays a modal dialog asking the user to confirm or cancel an action.
 * Commonly used for destructive operations like delete, clear, or drop.
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "destructive",
  icon,
  isLoading = false,
  className,
}: ConfirmDialogProps) {
  // Dialog ref for focus management
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const cancelButtonRef = React.useRef<HTMLButtonElement>(null);

  // Focus cancel button when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        cancelButtonRef.current?.focus();
      }, 0);
    }
  }, [isOpen]);

  // Handle escape key to close dialog
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  // Handle click outside to close dialog
  const handleBackdropClick = React.useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && !isLoading) {
        onClose();
      }
    },
    [isLoading, onClose]
  );

  // Handle confirm action
  const handleConfirm = React.useCallback(async () => {
    try {
      await onConfirm();
    } catch (error) {
      console.error("Confirm action failed:", error);
    }
  }, [onConfirm]);

  // Don't render if not open
  if (!isOpen) {
    return null;
  }

  // Default icon based on variant
  const displayIcon = icon ?? (
    confirmVariant === "destructive" ? (
      <AlertTriangleIcon className="text-destructive" />
    ) : null
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
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
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            {displayIcon}
            <h2
              id="confirm-dialog-title"
              className="text-base font-semibold text-foreground"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50 cursor-pointer transition-colors"
            onClick={onClose}
            disabled={isLoading}
            aria-label="关闭对话框"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Message */}
        <p
          id="confirm-dialog-description"
          className="mb-6 text-sm text-muted-foreground"
        >
          {message}
        </p>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          <Button
            ref={cancelButtonRef}
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="cursor-pointer"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            onClick={handleConfirm}
            disabled={isLoading}
            className="cursor-pointer"
          >
            {isLoading ? (
              <>
                <LoadingSpinner className="mr-2 h-4 w-4" />
                处理中...
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// useConfirmDialog Hook
// ============================================================================

export interface UseConfirmDialogOptions {
  /** Dialog title */
  title: string;
  /** Dialog message */
  message: string;
  /** Confirm button label */
  confirmLabel?: string;
  /** Cancel button label */
  cancelLabel?: string;
  /** Confirm button variant */
  confirmVariant?: ConfirmDialogProps["confirmVariant"];
  /** Icon to display */
  icon?: React.ReactNode;
}

export interface UseConfirmDialogReturn {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Whether the confirm action is loading */
  isLoading: boolean;
  /** Open the dialog and return a promise that resolves when confirmed */
  confirm: () => Promise<boolean>;
  /** Close the dialog */
  close: () => void;
  /** Props to spread on ConfirmDialog component */
  dialogProps: Omit<ConfirmDialogProps, "className">;
}

/**
 * useConfirmDialog - Hook for managing confirm dialog state
 *
 * Provides a convenient way to show a confirmation dialog and
 * await the user's response.
 *
 * @example
 * ```tsx
 * const { confirm, dialogProps } = useConfirmDialog({
 *   title: "Delete Connection",
 *   message: "Are you sure you want to delete this connection?",
 *   confirmLabel: "Delete",
 * });
 *
 * const handleDelete = async () => {
 *   const confirmed = await confirm();
 *   if (confirmed) {
 *     // Perform delete action
 *   }
 * };
 *
 * return (
 *   <>
 *     <Button onClick={handleDelete}>Delete</Button>
 *     <ConfirmDialog {...dialogProps} />
 *   </>
 * );
 * ```
 */
export function useConfirmDialog(
  options: UseConfirmDialogOptions
): UseConfirmDialogReturn {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const resolveRef = React.useRef<((value: boolean) => void) | null>(null);

  const confirm = React.useCallback((): Promise<boolean> => {
    setIsOpen(true);
    return new Promise((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const close = React.useCallback(() => {
    setIsOpen(false);
    setIsLoading(false);
    if (resolveRef.current) {
      resolveRef.current(false);
      resolveRef.current = null;
    }
  }, []);

  const handleConfirm = React.useCallback(async () => {
    setIsLoading(true);
    try {
      if (resolveRef.current) {
        resolveRef.current(true);
        resolveRef.current = null;
      }
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const dialogProps: Omit<ConfirmDialogProps, "className"> = {
    isOpen,
    onClose: close,
    onConfirm: handleConfirm,
    title: options.title,
    message: options.message,
    confirmLabel: options.confirmLabel,
    cancelLabel: options.cancelLabel,
    confirmVariant: options.confirmVariant,
    icon: options.icon,
    isLoading,
  };

  return {
    isOpen,
    isLoading,
    confirm,
    close,
    dialogProps,
  };
}

export default ConfirmDialog;
