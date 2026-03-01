import * as React from "react";
import Editor from "@monaco-editor/react";

import { useT } from '@/i18n';
import { Button } from "@/components/ui/button";

interface CellDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  columnName: string;
}

export function CellDetailModal({ isOpen, onClose, value, columnName }: CellDetailModalProps) {
  const t = useT();
  const [copied, setCopied] = React.useState(false);

  // Detect if JSON
  const isJson = React.useMemo(() => {
    try { JSON.parse(value); return true; } catch { return false; }
  }, [value]);

  const displayValue = React.useMemo(() => {
    if (isJson) {
      try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; }
    }
    return value;
  }, [value, isJson]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(displayValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Detect dark theme
  const isDark = document.documentElement.classList.contains('dark');

  React.useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-[700px] max-h-[80vh] flex flex-col rounded-lg border border-border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <span className="text-sm font-medium">{columnName}</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleCopy} className="h-7 text-xs cursor-pointer">
              {copied ? t('tableMetaPanel.copied') : t('tableMetaPanel.copyDdl')}
            </Button>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        </div>
        {/* Content */}
        <div className="flex-1 min-h-[300px] overflow-hidden">
          <Editor
            height="100%"
            defaultLanguage={isJson ? "json" : "plaintext"}
            value={displayValue}
            theme={isDark ? "vs-dark" : "vs"}
            options={{ readOnly: true, minimap: { enabled: false }, lineNumbers: "on", wordWrap: "on", scrollBeyondLastLine: false, fontSize: 13 }}
          />
        </div>
      </div>
    </div>
  );
}
