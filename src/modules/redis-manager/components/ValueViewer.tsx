import { useState } from "react";
import { useRedisStore, cmd } from "../store";
import { useT } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function StringViewer({ data, keyName }: { data: number[]; keyName: string }) {
  const t = useT();
  const id = useRedisStore(s => s.activeConnectionId)!;
  const refreshSelectedKey = useRedisStore(s => s.refreshSelectedKey);
  const text = new TextDecoder().decode(new Uint8Array(data));
  const [value, setValue] = useState(text);
  const [format, setFormat] = useState<'text' | 'json'>('text');

  const display = format === 'json' ? (() => { try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; } })() : value;

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 p-2 border-b border-border items-center">
        <select className="text-xs bg-muted border border-border rounded px-2 py-1" value={format} onChange={e => setFormat(e.target.value as any)}>
          <option value="text">{t('redisManager.format.text')}</option>
          <option value="json">{t('redisManager.format.json')}</option>
        </select>
        <Button size="sm" className="ml-auto h-7" onClick={async () => { await cmd.setString(id, keyName, value); await refreshSelectedKey(); }}>
          {t('redisManager.save')}
        </Button>
      </div>
      <textarea className="flex-1 p-2 bg-transparent text-sm font-mono resize-none focus:outline-none"
        value={display} onChange={e => setValue(e.target.value)} />
    </div>
  );
}

function HashViewer({ data, keyName }: { data: [string, string][]; keyName: string }) {
  const id = useRedisStore(s => s.activeConnectionId)!;
  const refreshSelectedKey = useRedisStore(s => s.refreshSelectedKey);
  const [newField, setNewField] = useState('');
  const [newValue, setNewValue] = useState('');

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-1 p-2 border-b border-border">
        <Input className="h-7 text-xs" placeholder="field" value={newField} onChange={e => setNewField(e.target.value)} />
        <Input className="h-7 text-xs" placeholder="value" value={newValue} onChange={e => setNewValue(e.target.value)} />
        <Button size="sm" className="h-7" onClick={async () => { if (newField) { await cmd.hashSet(id, keyName, newField, newValue); setNewField(''); setNewValue(''); await refreshSelectedKey(); } }}>+</Button>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead><tr className="border-b border-border text-muted-foreground"><th className="text-left p-1.5">Field</th><th className="text-left p-1.5">Value</th><th className="w-8"></th></tr></thead>
          <tbody>
            {data.map(([f, v]) => (
              <tr key={f} className="border-b border-border/50 hover:bg-muted/50">
                <td className="p-1.5 font-mono">{f}</td>
                <td className="p-1.5 font-mono truncate max-w-xs">{v}</td>
                <td><button className="text-muted-foreground hover:text-red-500" onClick={async () => { await cmd.hashDel(id, keyName, f); await refreshSelectedKey(); }}>×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ListViewer({ data, keyName }: { data: string[]; keyName: string }) {
  const id = useRedisStore(s => s.activeConnectionId)!;
  const refreshSelectedKey = useRedisStore(s => s.refreshSelectedKey);
  const [newValue, setNewValue] = useState('');

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-1 p-2 border-b border-border">
        <Input className="h-7 text-xs flex-1" placeholder="value" value={newValue} onChange={e => setNewValue(e.target.value)} />
        <Button size="sm" className="h-7" onClick={async () => { if (newValue) { await cmd.listPush(id, keyName, newValue, false); setNewValue(''); await refreshSelectedKey(); } }}>Push</Button>
      </div>
      <div className="flex-1 overflow-auto">
        {data.map((v, i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-1 text-xs border-b border-border/50 hover:bg-muted/50">
            <span className="text-muted-foreground w-8">{i}</span>
            <span className="font-mono flex-1 truncate">{v}</span>
            <button className="text-muted-foreground hover:text-red-500" onClick={async () => { await cmd.listRemove(id, keyName, v, 1); await refreshSelectedKey(); }}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SetViewer({ data, keyName }: { data: string[]; keyName: string }) {
  const id = useRedisStore(s => s.activeConnectionId)!;
  const refreshSelectedKey = useRedisStore(s => s.refreshSelectedKey);
  const [newMember, setNewMember] = useState('');

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-1 p-2 border-b border-border">
        <Input className="h-7 text-xs flex-1" placeholder="member" value={newMember} onChange={e => setNewMember(e.target.value)} />
        <Button size="sm" className="h-7" onClick={async () => { if (newMember) { await cmd.setAdd(id, keyName, newMember); setNewMember(''); await refreshSelectedKey(); } }}>+</Button>
      </div>
      <div className="flex-1 overflow-auto">
        {data.map(m => (
          <div key={m} className="flex items-center gap-2 px-2 py-1 text-xs border-b border-border/50 hover:bg-muted/50">
            <span className="font-mono flex-1 truncate">{m}</span>
            <button className="text-muted-foreground hover:text-red-500" onClick={async () => { await cmd.setRemove(id, keyName, m); await refreshSelectedKey(); }}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ZSetViewer({ data, keyName }: { data: [string, number][]; keyName: string }) {
  const id = useRedisStore(s => s.activeConnectionId)!;
  const refreshSelectedKey = useRedisStore(s => s.refreshSelectedKey);
  const [newMember, setNewMember] = useState('');
  const [newScore, setNewScore] = useState('0');

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-1 p-2 border-b border-border">
        <Input className="h-7 text-xs flex-1" placeholder="member" value={newMember} onChange={e => setNewMember(e.target.value)} />
        <Input className="h-7 text-xs w-20" type="number" placeholder="score" value={newScore} onChange={e => setNewScore(e.target.value)} />
        <Button size="sm" className="h-7" onClick={async () => { if (newMember) { await cmd.zsetAdd(id, keyName, newMember, +newScore); setNewMember(''); setNewScore('0'); await refreshSelectedKey(); } }}>+</Button>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead><tr className="border-b border-border text-muted-foreground"><th className="text-left p-1.5">Score</th><th className="text-left p-1.5">Member</th><th className="w-8"></th></tr></thead>
          <tbody>
            {data.map(([m, s]) => (
              <tr key={m} className="border-b border-border/50 hover:bg-muted/50">
                <td className="p-1.5 font-mono">{s}</td>
                <td className="p-1.5 font-mono truncate max-w-xs">{m}</td>
                <td><button className="text-muted-foreground hover:text-red-500" onClick={async () => { await cmd.zsetRemove(id, keyName, m); await refreshSelectedKey(); }}>×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ValueViewer() {
  const t = useT();
  const { selectedKey, selectedKeyValue, keys } = useRedisStore();
  const keyInfo = keys.find(k => k.key === selectedKey);

  if (!selectedKey || !selectedKeyValue) {
    return <div className="h-full flex items-center justify-center text-sm text-muted-foreground">{t('redisManager.selectKey')}</div>;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border text-xs">
        <span className="font-mono font-medium truncate">{selectedKey}</span>
        {keyInfo && <>
          <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">{keyInfo.key_type}</span>
          <span className="text-muted-foreground">{t('redisManager.ttl')}: {keyInfo.ttl < 0 ? '∞' : `${keyInfo.ttl}s`}</span>
        </>}
      </div>
      <div className="flex-1 min-h-0">
        {selectedKeyValue.type === 'String' && <StringViewer key={selectedKey} data={selectedKeyValue.data} keyName={selectedKey} />}
        {selectedKeyValue.type === 'Hash' && <HashViewer key={selectedKey} data={selectedKeyValue.data} keyName={selectedKey} />}
        {selectedKeyValue.type === 'List' && <ListViewer key={selectedKey} data={selectedKeyValue.data} keyName={selectedKey} />}
        {selectedKeyValue.type === 'Set' && <SetViewer key={selectedKey} data={selectedKeyValue.data} keyName={selectedKey} />}
        {selectedKeyValue.type === 'ZSet' && <ZSetViewer key={selectedKey} data={selectedKeyValue.data} keyName={selectedKey} />}
        {selectedKeyValue.type === 'None' && <div className="p-4 text-sm text-muted-foreground">{t('redisManager.keyNotFound')}</div>}
      </div>
    </div>
  );
}
