import { useState } from 'react';
import { useT } from '@/i18n';
import { generateCode } from '../utils/codegen';

interface Props {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  onClose: () => void;
}

const LANGUAGES = [
  { id: 'curl', name: 'cURL' },
  { id: 'javascript-fetch', name: 'JavaScript (fetch)' },
  { id: 'javascript-axios', name: 'JavaScript (axios)' },
  { id: 'python', name: 'Python (requests)' },
  { id: 'go', name: 'Go' },
  { id: 'rust', name: 'Rust (reqwest)' },
  { id: 'java', name: 'Java (HttpClient)' },
  { id: 'php', name: 'PHP (cURL)' },
];

export function CodeGenModal({ method, url, headers, body, onClose }: Props) {
  const t = useT();
  const [language, setLanguage] = useState('curl');
  const code = generateCode(language, method, url, headers, body);

  const copyCode = () => {
    navigator.clipboard.writeText(code);
  };

  return (
    <div className="modal-overlay">
      <div className="modal codegen-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span>{t('codeGenModal.title')}</span>
          <button className="icon-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="codegen-languages">
            {LANGUAGES.map(lang => (
              <button key={lang.id} className={`lang-btn ${language === lang.id ? 'active' : ''}`} onClick={() => setLanguage(lang.id)}>
                {lang.name}
              </button>
            ))}
          </div>
          <pre className="codegen-output">{code}</pre>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={copyCode}>{t('codeGenModal.copyToClipboard')}</button>
          <button className="btn secondary" onClick={onClose}>{t('codeGenModal.close')}</button>
        </div>
      </div>
    </div>
  );
}
