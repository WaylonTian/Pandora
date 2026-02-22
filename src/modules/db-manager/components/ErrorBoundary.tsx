import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { t } from '@/i18n';

/**
 * Error Boundary Component
 *
 * A React Error Boundary that catches JavaScript errors in child components
 * and displays a user-friendly error message with options to retry or reload.
 *
 * Requirements:
 * - 1.5: IF 连接失败，THEN THE Connection_Manager SHALL 显示详细的错误信息
 * - 3.4: WHEN 查询执行出错时，THE Query_Executor SHALL 显示错误信息和错误位置
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface ErrorBoundaryProps {
  /** Child components to wrap */
  children: React.ReactNode;
  /** Optional fallback component to render on error */
  fallback?: React.ReactNode;
  /** Optional callback when an error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Optional className for the error display */
  className?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

// ============================================================================
// Icon Components
// ============================================================================

/** Alert triangle icon for error state */
function AlertTriangleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-12 w-12", className)}
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

/** Refresh icon for retry button */
function RefreshIcon({ className }: { className?: string }) {
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
      <path d="M23 4v6h-6" />
      <path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

/** Home icon for reload button */
function HomeIcon({ className }: { className?: string }) {
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
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

/** Chevron icon for expandable details */
function ChevronDownIcon({ className }: { className?: string }) {
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
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ============================================================================
// Error Display Component
// ============================================================================

interface ErrorDisplayProps {
  error: Error;
  errorInfo: React.ErrorInfo | null;
  onRetry: () => void;
  onReload: () => void;
  className?: string;
}

function ErrorDisplay({
  error,
  errorInfo,
  onRetry,
  onReload,
  className,
}: ErrorDisplayProps) {
  const [showDetails, setShowDetails] = React.useState(false);

  React.useEffect(() => {
    console.error("ErrorBoundary caught an error:", error);
    if (errorInfo) {
      console.error("Component stack:", errorInfo.componentStack);
    }
  }, [error, errorInfo]);

  return (
    <div
      className={cn(
        "flex min-h-[400px] flex-col items-center justify-center p-8",
        className
      )}
      role="alert"
      aria-live="assertive"
    >
      <AlertTriangleIcon className="mb-4 text-destructive" />

      <h2 className="mb-2 text-lg font-semibold text-foreground">
        {t('errorBoundary.somethingWentWrong')}
      </h2>

      <p className="mb-6 max-w-md text-center text-sm text-muted-foreground">
        {t('errorBoundary.unexpectedError')}
      </p>

      <div className="mb-6 flex gap-3">
        <Button variant="outline" size="sm" onClick={onRetry} className="cursor-pointer">
          <RefreshIcon className="mr-2" />
          {t('errorBoundary.retry')}
        </Button>
        <Button size="sm" onClick={onReload} className="cursor-pointer">
          <HomeIcon className="mr-2" />
          {t('errorBoundary.reload')}
        </Button>
      </div>

      <div className="w-full max-w-lg">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          onClick={() => setShowDetails(!showDetails)}
          aria-expanded={showDetails}
        >
          <ChevronDownIcon
            className={cn(
              "transition-transform",
              showDetails && "rotate-180"
            )}
          />
          {showDetails ? t('errorBoundary.hideDetails') : t('errorBoundary.showDetails')}{t('errorBoundary.errorDetails')}
        </button>

        {showDetails && (
          <div className="mt-4 animate-fade-in rounded-lg border border-border bg-muted/50 p-4">
            <div className="mb-3">
              <p className="text-xs font-semibold text-destructive">
                {error.name}: {error.message}
              </p>
            </div>

            {error.stack && (
              <div className="mb-3">
                <p className="mb-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  {t('errorBoundary.stackTrace')}:
                </p>
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-md bg-background p-2 text-[10px] text-muted-foreground scrollbar-thin">
                  {error.stack}
                </pre>
              </div>
            )}

            {errorInfo?.componentStack && (
              <div>
                <p className="mb-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  {t('errorBoundary.componentStack')}:
                </p>
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-md bg-background p-2 text-[10px] text-muted-foreground scrollbar-thin">
                  {errorInfo.componentStack}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Error Boundary Class Component
// ============================================================================

/**
 * ErrorBoundary - React Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI.
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * Static method to update state when an error is caught
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Lifecycle method called after an error is caught
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Update state with error info
    this.setState({ errorInfo });

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error for debugging
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  /**
   * Reset the error state to retry rendering
   */
  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  /**
   * Reload the entire application
   */
  handleReload = (): void => {
    window.location.reload();
  };

  render(): React.ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, className } = this.props;

    if (hasError && error) {
      // Render custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Render default error display
      return (
        <ErrorDisplay
          error={error}
          errorInfo={errorInfo}
          onRetry={this.handleRetry}
          onReload={this.handleReload}
          className={className}
        />
      );
    }

    return children;
  }
}

export default ErrorBoundary;
