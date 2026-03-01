import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { useT } from '@/i18n';

export function EnvironmentManager({ onClose }: { onClose: () => void }) {
  const t = useT();
  const store = useStore();
  const [selectedEnvId, setSelectedEnvId] = useState<number | null>(store.activeEnvId);
  const [newEnvName, setNewEnvName] = useState('');
  const [variables, setVariables] = useState<Array<{ id?: number; key: string; value: string; enabled: boolean }>>([]);
  const saveTimeoutRef = useRef<Record<number, number>>({});

  useEffect(() => {
    store.loadEnvironments();
  }, []);

  useEffect(() => {
    if (selectedEnvId) {
      store.loadVariables(selectedEnvId);
    } else {
      setVariables([{ id: undefined, key: '', value: '', enabled: true }]);
    }
  }, [selectedEnvId]);

  useEffect(() => {
    if (selectedEnvId) {
      const vars: Array<{ id?: number; key: string; value: string; enabled: boolean }> = 
        store.variables.map(v => ({ id: v.id, key: v.key, value: v.value, enabled: v.enabled }));
      // 确保有空行可以输入
      if (vars.length === 0 || vars.every(v => v.key || v.value)) {
        vars.push({ id: undefined, key: '', value: '', enabled: true });
      }
      setVariables(vars);
    }
  }, [store.variables, selectedEnvId]);

  const handleCreateEnv = async () => {
    if (newEnvName.trim()) {
      await store.createEnvironment(newEnvName.trim());
      setNewEnvName('');
    }
  };

  const handleDeleteEnv = async (id: number) => {
    if (confirm(t('envManager.deleteConfirm'))) {
      await store.deleteEnvironment(id);
      if (selectedEnvId === id) {
        setSelectedEnvId(null);
        setVariables([{ key: '', value: '', enabled: true }]);
      }
    }
  };

  const handleSelectEnv = (id: number) => {
    setSelectedEnvId(id);
    store.setActiveEnvironment(id);
  };

  const updateVariable = (index: number, field: string, value: string | boolean) => {
    const newVars = [...variables];
    newVars[index] = { ...newVars[index], [field]: value };
    
    // 自动添加新行
    if (index === newVars.length - 1 && (newVars[index].key || newVars[index].value)) {
      newVars.push({ id: undefined, key: '', value: '', enabled: true });
    }
    setVariables(newVars);
    
    // 防抖自动保存（有 key 时）
    const v = newVars[index];
    if (selectedEnvId && v.key) {
      if (saveTimeoutRef.current[index]) clearTimeout(saveTimeoutRef.current[index]);
      saveTimeoutRef.current[index] = window.setTimeout(async () => {
        await store.saveVariable({
          id: v.id,
          environment_id: selectedEnvId,
          key: v.key,
          value: v.value,
          enabled: v.enabled,
        });
        // 重新加载以获取新 id
        store.loadVariables(selectedEnvId);
      }, 500);
    }
  };

  const deleteVariable = async (index: number) => {
    const v = variables[index];
    if (v.id) {
      await store.deleteVariable(v.id);
    } else {
      const newVars = variables.filter((_, i) => i !== index);
      setVariables(newVars.length ? newVars : [{ key: '', value: '', enabled: true }]);
    }
  };

  const addPresetVariable = async (key: string, value: string = '') => {
    if (!selectedEnvId) return;
    // 直接保存到数据库
    await store.saveVariable({
      environment_id: selectedEnvId,
      key,
      value,
      enabled: true,
    });
    // 重新加载
    store.loadVariables(selectedEnvId);
  };

  const selectedEnv = store.environments.find(e => e.id === selectedEnvId);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal env-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span>{t('envManager.title')}</span>
          <button className="icon-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body env-body">
          {/* 左侧环境列表 */}
          <div className="env-list">
            <div className="env-list-header">
              <span>{t('envManager.environments')}</span>
            </div>
            <div className="env-create">
              <input
                className="env-input"
                placeholder={t('envManager.newEnvironment')}
                value={newEnvName}
                onChange={e => setNewEnvName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateEnv()}
              />
              <button className="icon-btn" onClick={handleCreateEnv}>+</button>
            </div>
            <div className="env-items">
              {store.environments.map(env => (
                <div
                  key={env.id}
                  className={`env-item ${selectedEnvId === env.id ? 'active' : ''}`}
                  onClick={() => env.id && handleSelectEnv(env.id)}
                >
                  <span className="env-name">{env.name}</span>
                  {env.is_active && <span className="env-active-badge">{t('envManager.active')}</span>}
                  <button
                    className="env-delete"
                    onClick={e => { e.stopPropagation(); env.id && handleDeleteEnv(env.id); }}
                  >×</button>
                </div>
              ))}
              {store.environments.length === 0 && (
                <div className="env-empty">{t('envManager.noEnvironments')}</div>
              )}
            </div>
          </div>

          {/* 右侧变量编辑 */}
          <div className="env-variables">
            {selectedEnv ? (
              <>
                <div className="env-var-header">
                  <span>{selectedEnv.name} {t('envManager.variables')}</span>
                  <span className="env-hint">{t('envManager.useHint')}</span>
                </div>
                <div className="env-var-table">
                  <div className="env-var-row header">
                    <span style={{ width: 30 }}></span>
                    <span style={{ flex: 1 }}>{t('envManager.variable')}</span>
                    <span style={{ flex: 2 }}>{t('envManager.value')}</span>
                    <span style={{ width: 60 }}>{t('envManager.actions')}</span>
                  </div>
                  {variables.map((v, i) => (
                    <div key={i} className={`env-var-row ${!v.enabled ? 'disabled' : ''}`}>
                      <input
                        type="checkbox"
                        checked={v.enabled}
                        onChange={e => updateVariable(i, 'enabled', e.target.checked)}
                      />
                      <input
                        className="env-var-input"
                        placeholder={t('envManager.variableName')}
                        value={v.key}
                        onChange={e => updateVariable(i, 'key', e.target.value)}
                      />
                      <input
                        className="env-var-input"
                        placeholder={t('envManager.value')}
                        value={v.value}
                        onChange={e => updateVariable(i, 'value', e.target.value)}
                      />
                      <div className="env-var-actions">
                        <button className="icon-btn small" onClick={() => deleteVariable(i)} title="Delete">×</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="env-presets">
                  <span className="env-preset-title">{t('envManager.quickAdd')}</span>
                  <button className="env-preset-btn" onClick={() => addPresetVariable('baseUrl', 'http://localhost:3000')}>baseUrl</button>
                  <button className="env-preset-btn" onClick={() => addPresetVariable('apiKey', '')}>apiKey</button>
                  <button className="env-preset-btn" onClick={() => addPresetVariable('token', '')}>token</button>
                </div>
              </>
            ) : (
              <div className="env-no-selection">
                <p>{t('envManager.selectEnv')}</p>
                <p className="env-hint">{t('envManager.orCreateNew')}</p>
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>{t('envManager.done')}</button>
        </div>
      </div>
    </div>
  );
}
