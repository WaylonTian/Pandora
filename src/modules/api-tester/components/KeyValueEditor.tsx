import { useState } from 'react';
import { useT } from '@/i18n';

interface KVItem {
  key: string;
  value: string;
  description?: string;
  enabled: boolean;
}

interface Props {
  items: KVItem[];
  onChange: (items: KVItem[]) => void;
  placeholder?: { key: string; value: string };
  showDescription?: boolean;
}

export function KeyValueEditor({ items, onChange, placeholder, showDescription = true }: Props) {
  const t = useT();
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const displayItems = items.length === 0 || items.every(i => i.key || i.value)
    ? [...items, { key: '', value: '', description: '', enabled: true }]
    : items;

  const updateItem = (index: number, field: keyof KVItem, value: string | boolean) => {
    const newItems = [...displayItems];
    newItems[index] = { ...newItems[index], [field]: value };
    const filtered = newItems.filter((item, i) => i === newItems.length - 1 || item.key || item.value);
    onChange(filtered);
  };

  const removeItem = (index: number) => {
    const newItems = displayItems.filter((_, i) => i !== index);
    onChange(newItems.length ? newItems : [{ key: '', value: '', description: '', enabled: true }]);
  };

  const switchToBulk = () => {
    const text = displayItems.filter(i => i.key).map(i => `${i.key}:${i.value}`).join('\n');
    setBulkText(text);
    setBulkMode(true);
  };

  const switchToTable = () => {
    const newItems = bulkText.split('\n').filter(l => l.includes(':')).map(line => {
      const [key, ...rest] = line.split(':');
      return { key: key.trim(), value: rest.join(':').trim(), description: '', enabled: true };
    });
    onChange(newItems.length ? newItems : [{ key: '', value: '', description: '', enabled: true }]);
    setBulkMode(false);
  };

  if (bulkMode) {
    return (
      <div className="kv-editor-advanced">
        <div className="kv-toolbar">
          <button className="kv-toggle-btn" onClick={switchToTable}>{t('kvEditor.keyValueEdit')}</button>
        </div>
        <textarea
          className="kv-bulk-textarea"
          value={bulkText}
          onChange={e => setBulkText(e.target.value)}
          placeholder="key:value"
          rows={8}
        />
      </div>
    );
  }

  return (
    <div className="kv-editor-advanced">
      <div className="kv-toolbar">
        <span className="kv-toolbar-dots">⋯</span>
        <button className="kv-toggle-btn" onClick={switchToBulk}>{t('kvEditor.bulkEdit')}</button>
      </div>
      <table className="kv-table">
        <thead>
          <tr>
            <th style={{ width: 32 }}></th>
            <th>{t('kvEditor.key')}</th>
            <th>{t('kvEditor.value')}</th>
            {showDescription && <th>{t('kvEditor.description')}</th>}
            <th style={{ width: 32 }}></th>
          </tr>
        </thead>
        <tbody>
          {displayItems.map((item, i) => (
            <tr key={i} className={!item.enabled ? 'kv-row-disabled' : ''}>
              <td>
                <input type="checkbox" checked={item.enabled} onChange={e => updateItem(i, 'enabled', e.target.checked)} />
              </td>
              <td>
                <input className="kv-cell-input" placeholder={placeholder?.key || 'Key'} value={item.key}
                  onChange={e => updateItem(i, 'key', e.target.value)} />
              </td>
              <td>
                <input className="kv-cell-input" placeholder={placeholder?.value || 'Value'} value={item.value}
                  onChange={e => updateItem(i, 'value', e.target.value)} />
              </td>
              {showDescription && (
                <td>
                  <input className="kv-cell-input" placeholder={t('kvEditor.description')} value={item.description || ''}
                    onChange={e => updateItem(i, 'description', e.target.value)} />
                </td>
              )}
              <td>
                {(item.key || item.value) && <button className="kv-delete" onClick={() => removeItem(i)}>×</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
