import { useState } from 'react';

type BodyType = 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'binary';

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
}

export function BodyEditor({ bodyType, body, formData, onBodyTypeChange, onBodyChange, onFormDataChange }: Props) {
  const [rawType, setRawType] = useState('text');

  // 确保至少有一行空行
  const displayFormData = formData.length === 0 || formData.every(i => i.key || i.value)
    ? [...formData, { key: '', value: '', type: 'text' as const, enabled: true }]
    : formData;

  const updateFormItem = (index: number, field: keyof FormDataItem, value: string | boolean) => {
    const newData = [...displayFormData];
    newData[index] = { ...newData[index], [field]: value };
    const filtered = newData.filter((item, i) => i === newData.length - 1 || item.key || item.value);
    onFormDataChange(filtered);
  };

  const removeFormItem = (index: number) => {
    const newData = displayFormData.filter((_, i) => i !== index);
    onFormDataChange(newData.length ? newData : []);
  };

  const formatJson = () => {
    try {
      onBodyChange(JSON.stringify(JSON.parse(body), null, 2));
    } catch {}
  };

  return (
    <div className="body-editor-advanced">
      <div className="body-type-selector">
        {(['none', 'form-data', 'x-www-form-urlencoded', 'raw', 'json', 'binary'] as BodyType[]).map(type => (
          <label key={type} className={`body-type-option ${bodyType === type ? 'active' : ''}`}>
            <input type="radio" name="bodyType" checked={bodyType === type} onChange={() => onBodyTypeChange(type)} />
            {type === 'none' ? 'none' : type === 'x-www-form-urlencoded' ? 'x-www-form-urlencoded' : type}
          </label>
        ))}
      </div>

      {bodyType === 'none' && (
        <div className="body-none">This request does not have a body</div>
      )}

      {bodyType === 'json' && (
        <div className="body-json">
          <div className="body-json-toolbar">
            <button className="icon-btn" onClick={formatJson}>Format</button>
          </div>
          <textarea className="body-textarea json" placeholder='{"key": "value"}' value={body} onChange={e => onBodyChange(e.target.value)} />
        </div>
      )}

      {bodyType === 'raw' && (
        <div className="body-raw">
          <div className="body-raw-toolbar">
            <select className="raw-type-select" value={rawType} onChange={e => setRawType(e.target.value)}>
              <option value="text">Text</option>
              <option value="javascript">JavaScript</option>
              <option value="html">HTML</option>
              <option value="xml">XML</option>
            </select>
          </div>
          <textarea className="body-textarea" placeholder="Raw body content" value={body} onChange={e => onBodyChange(e.target.value)} />
        </div>
      )}

      {(bodyType === 'form-data' || bodyType === 'x-www-form-urlencoded') && (
        <div className="body-form">
          <div className="kv-header">
            <span style={{ width: 30 }}></span>
            <span style={{ flex: 2 }}>Key</span>
            {bodyType === 'form-data' && <span style={{ width: 80 }}>Type</span>}
            <span style={{ flex: 3 }}>Value</span>
            <span style={{ width: 30 }}></span>
          </div>
          {displayFormData.map((item, i) => (
            <div key={i} className={`kv-row-advanced ${!item.enabled ? 'disabled' : ''}`}>
              <input type="checkbox" checked={item.enabled} onChange={e => updateFormItem(i, 'enabled', e.target.checked)} />
              <input className="kv-input" placeholder="Key" value={item.key} onChange={e => updateFormItem(i, 'key', e.target.value)} />
              {bodyType === 'form-data' && (
                <select className="form-type-select" value={item.type} onChange={e => updateFormItem(i, 'type', e.target.value)}>
                  <option value="text">Text</option>
                  <option value="file">File</option>
                </select>
              )}
              {item.type === 'file' && bodyType === 'form-data' ? (
                <input type="file" className="kv-input file-input large" onChange={e => updateFormItem(i, 'value', e.target.files?.[0]?.name || '')} />
              ) : (
                <input className="kv-input large" placeholder="Value" value={item.value} onChange={e => updateFormItem(i, 'value', e.target.value)} />
              )}
              <button className="kv-delete" onClick={() => removeFormItem(i)}>×</button>
            </div>
          ))}
        </div>
      )}

      {bodyType === 'binary' && (
        <div className="body-binary">
          <input type="file" className="binary-input" />
          <p className="body-hint">Select a file to send as binary data</p>
        </div>
      )}
    </div>
  );
}
