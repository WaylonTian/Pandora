import { useState, useRef, useCallback } from 'react';
import { useT } from '@/i18n';
import { useThemeStore } from '@/stores/theme';
import Editor from '@monaco-editor/react';
import { KeyValueEditor } from './KeyValueEditor';

export type BodyType = 'none' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'binary' | 'graphql';
export type RawType = 'json' | 'text' | 'javascript' | 'html' | 'xml';

interface FormDataItem {
  key: string;
  value: string;
  type: 'text' | 'file';
  enabled: boolean;
}

interface Props {
  bodyType: BodyType;
  body: string;
  formData: FormDataItem[];
  onBodyTypeChange: (type: BodyType) => void;
  onBodyChange: (body: string) => void;
  onFormDataChange: (data: FormDataItem[]) => void;
  rawType?: RawType;
  onRawTypeChange?: (type: RawType) => void;
}

const RAW_TYPES: { value: RawType; label: string }[] = [
  { value: 'json', label: 'JSON' },
  { value: 'text', label: 'Text' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'html', label: 'HTML' },
  { value: 'xml', label: 'XML' },
];

const MONACO_LANG: Record<RawType, string> = {
  json: 'json', text: 'plaintext', javascript: 'javascript', html: 'html', xml: 'xml',
};

export function BodyEditor({ bodyType, body, formData, onBodyTypeChange, onBodyChange, onFormDataChange, rawType = 'json', onRawTypeChange }: Props) {
  const t = useT();
  const { isDark } = useThemeStore();
  const [editorHeight, setEditorHeight] = useState(250);
  const dragRef = useRef<{ startY: number; startH: number } | null>(null);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startY: e.clientY, startH: editorHeight };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const newH = Math.max(100, Math.min(600, dragRef.current.startH + ev.clientY - dragRef.current.startY));
      setEditorHeight(newH);
    };
    const onUp = () => {
      dragRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [editorHeight]);

  // Convert form data for KV editor
  const formKV = formData.map(f => ({ key: f.key, value: f.value, description: '', enabled: f.enabled }));
  const handleFormKVChange = (items: { key: string; value: string; description?: string; enabled: boolean }[]) => {
    onFormDataChange(items.map(i => ({ key: i.key, value: i.value, type: 'text' as const, enabled: i.enabled })));
  };

  return (
    <div className="body-editor-advanced">
      <div className="body-type-selector">
        {(['none', 'form-data', 'x-www-form-urlencoded', 'raw', 'binary', 'graphql'] as BodyType[]).map(type => (
          <label key={type} className={`body-type-option ${bodyType === type ? 'active' : ''}`}>
            <input type="radio" name="bodyType" checked={bodyType === type} onChange={() => onBodyTypeChange(type)} />
            {type}
          </label>
        ))}
        {bodyType === 'raw' && (
          <select className="raw-type-select" value={rawType} onChange={e => onRawTypeChange?.(e.target.value as RawType)}>
            {RAW_TYPES.map(rt => <option key={rt.value} value={rt.value}>{rt.label}</option>)}
          </select>
        )}
      </div>

      {bodyType === 'none' && (
        <div className="body-none">{t('bodyEditor.noBody')}</div>
      )}

      {bodyType === 'raw' && (
        <div className="body-monaco-wrap">
          <div style={{ height: editorHeight, border: '1px solid var(--border-color)', borderRadius: 4, overflow: 'hidden' }}>
            <Editor
              height="100%"
              language={MONACO_LANG[rawType]}
              theme={isDark ? 'vs-dark' : 'light'}
              value={body}
              onChange={v => onBodyChange(v || '')}
              options={{ minimap: { enabled: false }, fontSize: 12, lineNumbers: 'on', scrollBeyondLastLine: false, wordWrap: 'on', tabSize: 2 }}
            />
          </div>
          <div className="body-drag-handle" onMouseDown={onDragStart} />
        </div>
      )}

      {bodyType === 'graphql' && (
        <div className="body-monaco-wrap">
          <div style={{ height: editorHeight, border: '1px solid var(--border-color)', borderRadius: 4, overflow: 'hidden' }}>
            <Editor
              height="100%"
              language="graphql"
              theme={isDark ? 'vs-dark' : 'light'}
              value={body}
              onChange={v => onBodyChange(v || '')}
              options={{ minimap: { enabled: false }, fontSize: 12, lineNumbers: 'on', scrollBeyondLastLine: false, wordWrap: 'on', tabSize: 2 }}
            />
          </div>
          <div className="body-drag-handle" onMouseDown={onDragStart} />
        </div>
      )}

      {(bodyType === 'form-data' || bodyType === 'x-www-form-urlencoded') && (
        <KeyValueEditor items={formKV} onChange={handleFormKVChange} showDescription={false} />
      )}

      {bodyType === 'binary' && (
        <div className="body-binary">
          <input type="file" className="binary-input" />
          <p className="body-hint">{t('bodyEditor.selectBinaryFile')}</p>
        </div>
      )}
    </div>
  );
}
