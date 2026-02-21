import * as React from "react";
import { cn } from "@/lib/utils";

export interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  className?: string;
  showBackdrop?: boolean;
  size?: "sm" | "md" | "lg";
}

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SPINNER_SIZES = {
  sm: "h-6 w-6",
  md: "h-10 w-10",
  lg: "h-14 w-14",
};

function Spinner({ size = "lg", className }: SpinnerProps) {
  return (
    <div className={cn("relative", SPINNER_SIZES[size], className)} role="status" aria-label="Loading">
      <div className={cn("absolute inset-0 rounded-full border-[3px] border-muted", SPINNER_SIZES[size])} />
      <div className={cn("absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-primary", SPINNER_SIZES[size])} />
    </div>
  );
}

function DatabaseIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("h-10 w-10", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

export function LoadingOverlay({
  isVisible,
  message,
  className,
  showBackdrop = true,
  size = "lg",
}: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center",
        showBackdrop && "bg-background/90 backdrop-blur-md",
        className
      )}
      role="dialog"
      aria-modal="true"
      aria-label={message || "Loading"}
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-5 animate-fade-in">
        {size === "lg" && (
          <DatabaseIcon className="text-primary opacity-60" />
        )}
        <Spinner size={size} />
        {message && (
          <p className={cn(
            "text-center text-muted-foreground font-medium",
            size === "sm" && "text-xs",
            size === "md" && "text-sm",
            size === "lg" && "text-sm"
          )}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

export interface InlineSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function InlineSpinner({ size = "sm", className }: InlineSpinnerProps) {
  return <Spinner size={size} className={className} />;
}

export interface UseLoadingStateOptions {
  initialLoading?: boolean;
  minLoadingTime?: number;
}

export interface UseLoadingStateReturn {
  isLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
  setLoading: (loading: boolean) => void;
}

export function useLoadingState(options: UseLoadingStateOptions = {}): UseLoadingStateReturn {
  const { initialLoading = false, minLoadingTime = 0 } = options;
  const [isLoading, setIsLoading] = React.useState(initialLoading);
  const loadingStartTime = React.useRef<number | null>(null);

  const startLoading = React.useCallback(() => {
    loadingStartTime.current = Date.now();
    setIsLoading(true);
  }, []);

  const stopLoading = React.useCallback(() => {
    if (minLoadingTime > 0 && loadingStartTime.current) {
      const elapsed = Date.now() - loadingStartTime.current;
      const remaining = minLoadingTime - elapsed;
      if (remaining > 0) {
        setTimeout(() => { setIsLoading(false); loadingStartTime.current = null; }, remaining);
        return;
      }
    }
    setIsLoading(false);
    loadingStartTime.current = null;
  }, [minLoadingTime]);

  const setLoading = React.useCallback((loading: boolean) => {
    if (loading) startLoading(); else stopLoading();
  }, [startLoading, stopLoading]);

  return { isLoading, startLoading, stopLoading, setLoading };
}

export default LoadingOverlay;
