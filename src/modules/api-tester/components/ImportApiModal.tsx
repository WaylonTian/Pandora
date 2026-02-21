import { useState, useRef } from 'react';
import { parseOpenAPI, parsePostmanCollection, ParsedCollection } from '../utils/openapi';
import '../styles/ImportApiModal.css';

interface Props {
  onClose: () => void;
  onImport: (collection: ParsedCollection) => void;
}

export function ImportApiModal({ onClose, onImport }: Props) {
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<ParsedCollection | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleParse = () => {
    setError('');
    try {
      const json = JSON.parse(content);
      let parsed: ParsedCollection;
      
      if (json.openapi || json.swagger) {
        parsed = parseOpenAPI(content);
      } else if (json.info?._postman_id || json.item) {
        parsed = parsePostmanCollection(content);
      } else {
        throw new Error('无法识别格式，请使用 OpenAPI 3.0/Swagger 2.0 或 Postman Collection');
      }
      
      setPreview(parsed);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setContent(reader.result as string);
      reader.readAsText(file);
    }
  };

  const totalRequests = preview?.folders.reduce((sum, f) => sum + f.requests.length, 0) || 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="import-api-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>导入 API 文档</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="import-hint">
            支持 OpenAPI 3.0、Swagger 2.0、Postman Collection v2.1
          </div>

          <div className="import-actions">
            <input
              type="file"
              ref={fileRef}
              accept=".json,.yaml,.yml"
              onChange={handleFile}
              style={{ display: 'none' }}
            />
            <button onClick={() => fileRef.current?.click()}>选择文件</button>
            <span className="or">或粘贴 JSON 内容</span>
          </div>

          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder='{"openapi": "3.0.0", ...}'
            spellCheck={false}
          />

          {error && <div className="import-error">{error}</div>}

          {!preview && (
            <button className="parse-btn" onClick={handleParse} disabled={!content}>
              解析
            </button>
          )}

          {preview && (
            <div className="import-preview">
              <div className="preview-header">
                <span className="preview-title">{preview.name}</span>
                <span className="preview-stats">{preview.folders.length} 文件夹 · {totalRequests} 请求</span>
              </div>
              <div className="preview-folders">
                {preview.folders.map((folder, i) => (
                  <div key={i} className="preview-folder">
                    <div className="folder-name">📁 {folder.name} ({folder.requests.length})</div>
                    <div className="folder-requests">
                      {folder.requests.slice(0, 5).map((req, j) => (
                        <div key={j} className="preview-request">
                          <span className={`method ${req.method.toLowerCase()}`}>{req.method}</span>
                          <span className="path">{req.path}</span>
                        </div>
                      ))}
                      {folder.requests.length > 5 && (
                        <div className="more">...还有 {folder.requests.length - 5} 个请求</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="cancel-btn" onClick={onClose}>取消</button>
          <button 
            className="import-btn" 
            onClick={() => preview && onImport(preview)}
            disabled={!preview}
          >
            导入 {totalRequests > 0 && `(${totalRequests} 请求)`}
          </button>
        </div>
      </div>
    </div>
  );
}
