import { useEffect, useState } from 'react';

interface Cookie {
  id: number;
  domain: string;
  name: string;
  value: string;
  path: string;
  expires: string | null;
  http_only: boolean;
  secure: boolean;
}

const isTauri = !!(window as any).__TAURI_INTERNALS__;

async function safeInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isTauri) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<T>(cmd, args);
  }
  return [] as unknown as T;
}

export function CookieManager({ onClose }: { onClose: () => void }) {
  const [cookies, setCookies] = useState<Cookie[]>([]);
  const [filter, setFilter] = useState('');

  const load = () => safeInvoke<Cookie[]>('get_cookies', {}).then(setCookies);
  useEffect(() => { load(); }, []);

  const grouped = cookies.reduce((acc, c) => {
    (acc[c.domain] ??= []).push(c);
    return acc;
  }, {} as Record<string, Cookie[]>);

  const filtered = filter
    ? Object.fromEntries(Object.entries(grouped).filter(([d]) => d.toLowerCase().includes(filter.toLowerCase())))
    : grouped;

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ width: 560, maxHeight: '70vh' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span>🍪 Cookies</span>
          <button className="icon-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{ overflow: 'auto' }}>
          <input className="kv-input" style={{ width: '100%', marginBottom: 8 }} placeholder="Filter by domain..."
            value={filter} onChange={e => setFilter(e.target.value)} />
          {Object.keys(filtered).length === 0 && <div style={{ color: 'var(--text-secondary)', padding: 16, textAlign: 'center' }}>No cookies</div>}
          {Object.entries(filtered).map(([domain, list]) => (
            <div key={domain} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <strong style={{ fontSize: 13 }}>{domain}</strong>
                <button className="icon-btn" style={{ fontSize: 11, color: 'var(--danger)' }}
                  onClick={async () => { await safeInvoke('clear_domain_cookies', { domain }); load(); }}>Clear all</button>
              </div>
              {list.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', fontSize: 12, fontFamily: 'monospace', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <strong>{c.name}</strong>={c.value}
                    {c.path !== '/' && <span style={{ color: 'var(--text-secondary)' }}> path={c.path}</span>}
                  </span>
                  <button className="icon-btn" style={{ fontSize: 11, color: 'var(--danger)', marginLeft: 8 }}
                    onClick={async () => { await safeInvoke('delete_cookie', { id: c.id }); load(); }}>×</button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
