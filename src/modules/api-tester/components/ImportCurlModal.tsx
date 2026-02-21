import { parseCurl } from '../utils/codegen';

interface Props {
  onImport: (data: { method: string; url: string; headers: Record<string, string>; body: string }) => void;
  onClose: () => void;
}

export function ImportCurlModal({ onImport, onClose }: Props) {
  const handleImport = (text: string) => {
    if (text.trim().toLowerCase().startsWith('curl')) {
      const parsed = parseCurl(text);
      onImport(parsed);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span>Import cURL</span>
          <button className="icon-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p style={{ marginBottom: 12, color: 'var(--text-secondary)' }}>Paste a cURL command to import</p>
          <textarea
            className="curl-input"
            placeholder="curl -X GET https://api.example.com..."
            onChange={e => handleImport(e.target.value)}
            autoFocus
          />
        </div>
        <div className="modal-footer">
          <button className="btn secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
