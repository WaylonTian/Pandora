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
}

export function KeyValueEditor({ items, onChange, placeholder }: Props) {
  // 确保至少有一行空行可以直接输入
  const displayItems = items.length === 0 || items.every(i => i.key || i.value) 
    ? [...items, { key: '', value: '', description: '', enabled: true }]
    : items;

  const updateItem = (index: number, field: keyof KVItem, value: string | boolean) => {
    const newItems = [...displayItems];
    newItems[index] = { ...newItems[index], [field]: value };
    // 过滤掉完全空的行（除了最后一行）
    const filtered = newItems.filter((item, i) => i === newItems.length - 1 || item.key || item.value);
    onChange(filtered);
  };

  const removeItem = (index: number) => {
    const newItems = displayItems.filter((_, i) => i !== index);
    onChange(newItems.length ? newItems : [{ key: '', value: '', description: '', enabled: true }]);
  };

  const bulkEdit = () => {
    const text = displayItems.filter(i => i.enabled && i.key).map(i => `${i.key}: ${i.value}`).join('\n');
    const result = prompt('Bulk Edit (format: key: value)', text);
    if (result !== null) {
      const newItems = result.split('\n').filter(l => l.includes(':')).map(line => {
        const [key, ...rest] = line.split(':');
        return { key: key.trim(), value: rest.join(':').trim(), description: '', enabled: true };
      });
      onChange(newItems.length ? newItems : [{ key: '', value: '', description: '', enabled: true }]);
    }
  };

  return (
    <div className="kv-editor-advanced">
      <div className="kv-toolbar">
        <button className="icon-btn" onClick={bulkEdit}>Bulk Edit</button>
      </div>
      <div className="kv-header">
        <span style={{ width: 30 }}></span>
        <span style={{ flex: 2 }}>Key</span>
        <span style={{ flex: 3 }}>Value</span>
        <span style={{ flex: 2 }}>Description</span>
        <span style={{ width: 30 }}></span>
      </div>
      {displayItems.map((item, i) => (
        <div key={i} className={`kv-row-advanced ${!item.enabled ? 'disabled' : ''}`}>
          <input type="checkbox" checked={item.enabled} onChange={e => updateItem(i, 'enabled', e.target.checked)} />
          <input className="kv-input" placeholder={placeholder?.key || 'Key'} value={item.key}
            onChange={e => updateItem(i, 'key', e.target.value)} />
          <input className="kv-input large" placeholder={placeholder?.value || 'Value'} value={item.value}
            onChange={e => updateItem(i, 'value', e.target.value)} />
          <input className="kv-input" placeholder="Description" value={item.description || ''}
            onChange={e => updateItem(i, 'description', e.target.value)} />
          <button className="kv-delete" onClick={() => removeItem(i)}>×</button>
        </div>
      ))}
    </div>
  );
}
