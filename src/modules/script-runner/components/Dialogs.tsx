import { useState, useRef, useEffect } from 'react';
import { useT } from '@/i18n';

export function ConfirmDialog({ message, onConfirm, onCancel }: {
  message: string; onConfirm: () => void; onCancel: () => void;
}) {
  const t = useT();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onCancel}>
      <div className="bg-card border border-border rounded-lg shadow-xl p-4 w-[320px]" onClick={e => e.stopPropagation()}>
        <p className="text-sm mb-4">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1 text-xs border border-border rounded cursor-pointer">{t('scriptRunner.cancel')}</button>
          <button onClick={onConfirm} className="px-3 py-1 text-xs bg-destructive text-white rounded cursor-pointer">{t('scriptRunner.delete')}</button>
        </div>
      </div>
    </div>
  );
}

export function PromptDialog({ title, defaultValue, onConfirm, onCancel }: {
  title: string; defaultValue?: string; onConfirm: (value: string) => void; onCancel: () => void;
}) {
  const t = useT();
  const [value, setValue] = useState(defaultValue || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.select(); }, []);

  const handleSubmit = () => { if (value.trim()) onConfirm(value.trim()); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onCancel}>
      <div className="bg-card border border-border rounded-lg shadow-xl p-4 w-[360px]" onClick={e => e.stopPropagation()}>
        <p className="text-sm mb-3">{title}</p>
        <input ref={inputRef} value={value} onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onCancel(); }}
          className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring mb-3" autoFocus />
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1 text-xs border border-border rounded cursor-pointer">{t('scriptRunner.cancel')}</button>
          <button onClick={handleSubmit} className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded cursor-pointer">{t('scriptRunner.save')}</button>
        </div>
      </div>
    </div>
  );
}
