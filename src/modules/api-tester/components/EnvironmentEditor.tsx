import { useState, useEffect, useRef } from 'react';
import { useT } from '@/i18n';
import { useStore } from '../store';

interface Props {
  envId: number; // 0 = globals
}

export function EnvironmentEditor({ envId }: Props) {
  const t = useT();
  const store = useStore();
  const [filter, setFilter] = useState('');
  const [variables, setVariables] = useState<Array<{ id?: number; key: string; value: string; currentValue: string; enabled: boolean }>>([]);
  const saveRef = useRef<Record<number, number>>({});

  const env = store.environments.find(e => e.id === envId);
  const title = envId === 0 ? 'Globals' : env?.name || '';

  useEffect(() => {
    if (envId > 0) store.loadVariables(envId);
  }, [envId]);

  useEffect(() => {
    if (envId > 0) {
      const vars: Array<{ id?: number; key: string; value: string; currentValue: string; enabled: boolean }> =
        store.variables.map(v => ({ id: v.id, key: v.key, value: v.value, currentValue: v.value, enabled: v.enabled }));
      if (vars.length === 0 || vars.every(v => v.key)) {
        vars.push({ key: '', value: '', currentValue: '', enabled: true });
      }
      setVariables(vars);
    } else {
      setVariables([{ key: '', value: '', currentValue: '', enabled: true }]);
    }
  }, [store.variables, envId]);

  const updateVar = (index: number, field: string, value: string | boolean) => {
    const newVars = [...variables];
    newVars[index] = { ...newVars[index], [field]: value };
    if (index === newVars.length - 1 && (newVars[index].key || newVars[index].value)) {
      newVars.push({ key: '', value: '', currentValue: '', enabled: true });
    }
    setVariables(newVars);

    if (envId > 0 && newVars[index].key) {
      if (saveRef.current[index]) clearTimeout(saveRef.current[index]);
      saveRef.current[index] = window.setTimeout(async () => {
        const v = newVars[index];
        await store.saveVariable({ id: v.id, environment_id: envId, key: v.key, value: v.value, enabled: v.enabled });
        store.loadVariables(envId);
      }, 500);
    }
  };

  const deleteVar = async (index: number) => {
    const v = variables[index];
    if (v.id) await store.deleteVariable(v.id);
    else {
      const newVars = variables.filter((_, i) => i !== index);
      setVariables(newVars.length ? newVars : [{ key: '', value: '', currentValue: '', enabled: true }]);
    }
  };

  const filtered = filter
    ? variables.filter(v => v.key.toLowerCase().includes(filter.toLowerCase()) || !v.key)
    : variables;

  return (
    <div className="env-editor">
      <div className="env-editor-header">
        <h3 className="env-editor-title">{title}</h3>
      </div>
      <div className="env-editor-filter">
        <input className="kv-input" placeholder={t('envManager.filterVariables')} value={filter} onChange={e => setFilter(e.target.value)} />
      </div>
      <table className="kv-table">
        <thead>
          <tr>
            <th style={{ width: 32 }}></th>
            <th>{t('envManager.variable')}</th>
            <th>Type</th>
            <th>{t('envManager.initialValue')}</th>
            <th>{t('envManager.currentValue')}</th>
            <th style={{ width: 32 }}></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((v, i) => (
            <tr key={i} className={!v.enabled ? 'kv-row-disabled' : ''}>
              <td><input type="checkbox" checked={v.enabled} onChange={e => updateVar(i, 'enabled', e.target.checked)} /></td>
              <td><input className="kv-cell-input" placeholder={t('envManager.variableName')} value={v.key} onChange={e => updateVar(i, 'key', e.target.value)} /></td>
              <td>
                <select className="env-type-select" defaultValue="default">
                  <option value="default">default</option>
                  <option value="secret">secret</option>
                </select>
              </td>
              <td><input className="kv-cell-input" placeholder={t('envManager.value')} value={v.value} onChange={e => updateVar(i, 'value', e.target.value)} /></td>
              <td><input className="kv-cell-input" placeholder={t('envManager.value')} value={v.currentValue} onChange={e => updateVar(i, 'currentValue', e.target.value)} /></td>
              <td>{v.key && <button className="kv-delete" onClick={() => deleteVar(i)}>×</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
