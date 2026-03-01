import { useState, useEffect } from "react";
import { useRedisStore, type RedisConnectionConfig } from "../store";
import { useT } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ConnectionDialog({ isOpen, onClose, editConfig }: {
  isOpen: boolean; onClose: () => void; editConfig?: RedisConnectionConfig;
}) {
  const t = useT();
  const { saveConfig, testConnection } = useRedisStore();
  const [form, setForm] = useState({ name: '', host: '127.0.0.1', port: 6379, password: '', database: 0 });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    if (editConfig) {
      setForm({ name: editConfig.name, host: editConfig.host, port: editConfig.port, password: editConfig.password || '', database: editConfig.database });
    } else {
      setForm({ name: '', host: '127.0.0.1', port: 6379, password: '', database: 0 });
    }
    setTestResult(null);
  }, [editConfig, isOpen]);

  if (!isOpen) return null;

  const handleTest = async () => {
    const config: RedisConnectionConfig = {
      id: editConfig?.id || crypto.randomUUID(),
      name: form.name || `${form.host}:${form.port}`,
      host: form.host, port: form.port,
      password: form.password || undefined,
      database: form.database,
    };
    setTesting(true); setTestResult(null);
    try { await testConnection(config); setTestResult('OK'); }
    catch (e: any) { setTestResult(String(e)); }
    finally { setTesting(false); }
  };

  const handleSave = async () => {
    const config: RedisConnectionConfig = {
      id: editConfig?.id || crypto.randomUUID(),
      name: form.name || `${form.host}:${form.port}`,
      host: form.host, port: form.port,
      password: form.password || undefined,
      database: form.database,
    };
    await saveConfig(config);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-popover border border-border rounded-lg p-4 w-96 space-y-3" onClick={e => e.stopPropagation()}>
        <h3 className="font-medium">{editConfig ? t('redisManager.editConnection') : t('redisManager.newConnection')}</h3>
        <div className="space-y-2">
          <div><Label>{t('redisManager.connectionName')}</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="My Redis" /></div>
          <div className="flex gap-2">
            <div className="flex-1"><Label>{t('redisManager.host')}</Label><Input value={form.host} onChange={e => setForm(f => ({ ...f, host: e.target.value }))} /></div>
            <div className="w-24"><Label>{t('redisManager.port')}</Label><Input type="number" value={form.port} onChange={e => setForm(f => ({ ...f, port: +e.target.value }))} /></div>
          </div>
          <div><Label>{t('redisManager.password')}</Label><Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></div>
          <div className="w-24"><Label>{t('redisManager.database')}</Label><Input type="number" min={0} max={15} value={form.database} onChange={e => setForm(f => ({ ...f, database: +e.target.value }))} /></div>
        </div>
        {testResult && <div className={`text-xs ${testResult === 'OK' ? 'text-green-500' : 'text-red-500'}`}>{testResult}</div>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={handleTest} disabled={testing}>{testing ? '...' : t('redisManager.testConnection')}</Button>
          <Button variant="outline" size="sm" onClick={onClose}>{t('redisManager.cancel')}</Button>
          <Button size="sm" onClick={handleSave}>{t('redisManager.save')}</Button>
        </div>
      </div>
    </div>
  );
}

export function ConnectionList() {
  const t = useT();
  const { configs, connectionStatus, activeConnectionId, loadConfigs, connect, disconnect, deleteConfig } = useRedisStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editConfig, setEditConfig] = useState<RedisConnectionConfig | undefined>();

  useEffect(() => { loadConfigs(); }, [loadConfigs]);

  return (
    <div className="p-2 space-y-1">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase">{t('redisManager.connections')}</span>
        <button className="text-muted-foreground hover:text-foreground" onClick={() => { setEditConfig(undefined); setDialogOpen(true); }} title={t('redisManager.newConnection')}>
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>
      {configs.map(c => {
        const status = connectionStatus[c.id] || 'disconnected';
        const isActive = activeConnectionId === c.id;
        return (
          <div key={c.id} className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-pointer group ${isActive ? 'bg-accent/20 text-foreground' : 'hover:bg-muted text-muted-foreground'}`}
            onClick={() => status === 'connected' ? useRedisStore.setState({ activeConnectionId: c.id }) : connect(c.id).catch(() => {})}>
            <span className={`w-2 h-2 rounded-full shrink-0 ${status === 'connected' ? 'bg-green-500' : status === 'connecting' ? 'bg-yellow-500' : 'bg-gray-400'}`} />
            <span className="truncate flex-1">{c.name || `${c.host}:${c.port}`}</span>
            <span className="hidden group-hover:flex gap-1">
              {status === 'connected' && (
                <button className="text-muted-foreground hover:text-foreground" onClick={e => { e.stopPropagation(); disconnect(c.id); }} title={t('redisManager.disconnect')}>
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              )}
              <button className="text-muted-foreground hover:text-foreground" onClick={e => { e.stopPropagation(); setEditConfig(c); setDialogOpen(true); }}>
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
              </button>
              <button className="text-muted-foreground hover:text-red-500" onClick={e => { e.stopPropagation(); deleteConfig(c.id); }}>
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
              </button>
            </span>
          </div>
        );
      })}
      <ConnectionDialog isOpen={dialogOpen} onClose={() => setDialogOpen(false)} editConfig={editConfig} />
    </div>
  );
}
