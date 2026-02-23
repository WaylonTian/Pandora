import { useState, useRef } from 'react';
import { useT } from '@/i18n';
import { parseOpenAPI, parsePostmanCollection, ParsedCollection } from '../utils/openapi';
import yaml from 'js-yaml';
import '../styles/ImportApiModal.css';

const isTauri = !!(window as any).__TAURI_INTERNALS__;

interface Props {
  onClose: () => void;
  onImport: (collection: ParsedCollection) => void | Promise<void>;
}

type ImportMode = 'paste' | 'file' | 'url';

export function ImportApiModal({ onClose, onImport }: Props) {
  const t = useT();
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<ParsedCollection | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>('url');
  const [swaggerUrl, setSwaggerUrl] = useState('');
  const [fetching, setFetching] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleParse = (text?: string) => {
    const src = text ?? content;
    setError('');
    setPreview(null);
    try {
      let json: any;
      try { json = JSON.parse(src); } catch { json = yaml.load(src) as any; }
      let parsed: ParsedCollection;

      if (json.openapi || json.swagger) {
        parsed = parseOpenAPI(src);
      } else if (json.info?._postman_id || json.item) {
        parsed = parsePostmanCollection(src);
      } else {
        throw new Error(t('importApiModal.unrecognizedFormat'));
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
      reader.onload = () => {
        const text = reader.result as string;
        setContent(text);
        handleParse(text);
      };
      reader.readAsText(file);
    }
  };

  const handleFetchUrl = async () => {
    if (!swaggerUrl) return;
    setFetching(true);
    setError('');
    setPreview(null);
    try {
      let body: string;
      if (isTauri) {
        const { invoke } = await import('@tauri-apps/api/core');
        const resp = await invoke<{ body: string }>('send_http_request', {
          method: 'GET', url: swaggerUrl, headers: {}, body: null,
        });
        body = resp.body;
      } else {
        const resp = await fetch(swaggerUrl);
        body = await resp.text();
      }
      setContent(body);
      handleParse(body);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch');
    } finally {
      setFetching(false);
    }
  };

  const totalRequests = preview?.folders.reduce((sum, f) => sum + f.requests.length, 0) || 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="import-api-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{t('importApiModal.title')}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="import-hint">
            {t('importApiModal.supportedFormats')}
          </div>

          <div className="import-mode-tabs">
            <button className={`import-mode-tab ${importMode === 'url' ? 'active' : ''}`} onClick={() => setImportMode('url')}>
              {t('importApiModal.tabUrl')}
            </button>
            <button className={`import-mode-tab ${importMode === 'paste' ? 'active' : ''}`} onClick={() => setImportMode('paste')}>
              {t('importApiModal.tabPaste')}
            </button>
            <button className={`import-mode-tab ${importMode === 'file' ? 'active' : ''}`} onClick={() => setImportMode('file')}>
              {t('importApiModal.tabFile')}
            </button>
          </div>

          {importMode === 'url' && (
            <div className="url-import">
              <input
                className="url-input"
                placeholder="http://dev-centralapi.yamibuy.tech/so/v2/api-docs"
                value={swaggerUrl}
                onChange={e => setSwaggerUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleFetchUrl()}
              />
              <button className="parse-btn" onClick={handleFetchUrl} disabled={fetching || !swaggerUrl}>
                {fetching ? t('importApiModal.fetching') : t('importApiModal.fetchAndParse')}
              </button>
            </div>
          )}

          {importMode === 'paste' && (
            <>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder='{"openapi": "3.0.0", ...}'
                spellCheck={false}
              />
              {!preview && (
                <button className="parse-btn" onClick={() => handleParse()} disabled={!content}>
                  {t('importApiModal.parse')}
                </button>
              )}
            </>
          )}

          {importMode === 'file' && (
            <div className="import-actions">
              <input type="file" ref={fileRef} accept=".json,.yaml,.yml" onChange={handleFile} style={{ display: 'none' }} />
              <button onClick={() => fileRef.current?.click()}>{t('importApiModal.chooseFile')}</button>
            </div>
          )}

          {error && <div className="import-error">{error}</div>}

          {preview && (
            <div className="import-preview">
              <div className="preview-header">
                <span className="preview-title">{preview.name}</span>
                <span className="preview-stats">{preview.folders.length} {t('importApiModal.folders')} · {totalRequests} {t('importApiModal.requests')}</span>
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
                        <div className="more">{t('importApiModal.moreRequests', { count: folder.requests.length - 5 })}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="cancel-btn" onClick={onClose}>{t('importApiModal.cancel')}</button>
          <button
            className="import-btn"
            onClick={async () => {
              if (!preview) return;
              setImporting(true);
              try { await onImport(preview); } catch {} finally { setImporting(false); }
            }}
            disabled={!preview || importing}
          >
            {importing ? t('importApiModal.importing') : totalRequests > 0 ? t('importApiModal.importWithCount', { count: totalRequests }) : t('importApiModal.import')}
          </button>
        </div>
      </div>
    </div>
  );
}
