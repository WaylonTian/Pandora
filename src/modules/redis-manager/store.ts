import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

export interface RedisConnectionConfig {
  id: string; name: string; host: string; port: number;
  password?: string; database: number;
}
export interface KeyInfo { key: string; key_type: string; ttl: number; size: number; }
export interface ScanResult { cursor: number; keys: KeyInfo[]; }
export interface RedisValue { type: 'String' | 'Hash' | 'List' | 'Set' | 'ZSet' | 'None'; data: any; }
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export const cmd = {
  saveConfig: (config: RedisConnectionConfig) => invoke('redis_save_config', { config }),
  loadConfigs: () => invoke<RedisConnectionConfig[]>('redis_load_configs'),
  deleteConfig: (id: string) => invoke('redis_delete_config', { id }),
  testConnection: (config: RedisConnectionConfig) => invoke('redis_test_connection', { config }),
  connect: (id: string, config: RedisConnectionConfig) => invoke('redis_connect', { id, config }),
  disconnect: (id: string) => invoke('redis_disconnect', { id }),
  scanKeys: (id: string, cursor: number, pattern: string, count: number) =>
    invoke<ScanResult>('redis_scan_keys', { id, cursor, pattern, count }),
  getKeyValue: (id: string, key: string) => invoke<RedisValue>('redis_get_key_value', { id, key }),
  setString: (id: string, key: string, value: string) => invoke('redis_set_string', { id, key, value }),
  deleteKeys: (id: string, keys: string[]) => invoke('redis_delete_keys', { id, keys }),
  renameKey: (id: string, key: string, newKey: string) => invoke('redis_rename_key', { id, key, newKey: newKey }),
  setTtl: (id: string, key: string, ttl: number) => invoke('redis_set_ttl', { id, key, ttl }),
  executeCommand: (id: string, command: string) => invoke<string>('redis_execute_command', { id, command }),
  getServerInfo: (id: string) => invoke<string>('redis_get_server_info', { id }),
  hashSet: (id: string, key: string, field: string, value: string) => invoke('redis_hash_set', { id, key, field, value }),
  hashDel: (id: string, key: string, field: string) => invoke('redis_hash_del', { id, key, field }),
  listPush: (id: string, key: string, value: string, head: boolean) => invoke('redis_list_push', { id, key, value, head }),
  listRemove: (id: string, key: string, value: string, count: number) => invoke('redis_list_remove', { id, key, value, count }),
  setAdd: (id: string, key: string, member: string) => invoke('redis_set_add', { id, key, member }),
  setRemove: (id: string, key: string, member: string) => invoke('redis_set_remove', { id, key, member }),
  zsetAdd: (id: string, key: string, member: string, score: number) => invoke('redis_zset_add', { id, key, member, score }),
  zsetRemove: (id: string, key: string, member: string) => invoke('redis_zset_remove', { id, key, member }),
};

interface RedisStore {
  configs: RedisConnectionConfig[];
  connectionStatus: Record<string, ConnectionStatus>;
  activeConnectionId: string | null;
  keys: KeyInfo[];
  scanCursor: number;
  scanPattern: string;
  selectedKey: string | null;
  selectedKeyValue: RedisValue | null;
  cliHistory: string[];
  cliOutput: string[];
  loadConfigs: () => Promise<void>;
  saveConfig: (config: RedisConnectionConfig) => Promise<void>;
  deleteConfig: (id: string) => Promise<void>;
  testConnection: (config: RedisConnectionConfig) => Promise<void>;
  connect: (id: string) => Promise<void>;
  disconnect: (id: string) => Promise<void>;
  scanKeys: (reset?: boolean) => Promise<void>;
  setScanPattern: (pattern: string) => void;
  selectKey: (key: string) => Promise<void>;
  refreshSelectedKey: () => Promise<void>;
  executeCommand: (command: string) => Promise<void>;
  clearCliOutput: () => void;
}

export const useRedisStore = create<RedisStore>((set, get) => ({
  configs: [], connectionStatus: {}, activeConnectionId: null,
  keys: [], scanCursor: 0, scanPattern: '*', selectedKey: null, selectedKeyValue: null,
  cliHistory: [], cliOutput: [],

  loadConfigs: async () => {
    const configs = await cmd.loadConfigs();
    set({ configs });
  },
  saveConfig: async (config) => {
    await cmd.saveConfig(config);
    await get().loadConfigs();
  },
  deleteConfig: async (id) => {
    await cmd.deleteConfig(id);
    set(s => ({ configs: s.configs.filter(c => c.id !== id) }));
  },
  testConnection: async (config) => { await cmd.testConnection(config); },
  connect: async (id) => {
    const config = get().configs.find(c => c.id === id);
    if (!config) throw new Error('Config not found');
    set(s => ({ connectionStatus: { ...s.connectionStatus, [id]: 'connecting' } }));
    try {
      await cmd.connect(id, config);
      set(s => ({
        connectionStatus: { ...s.connectionStatus, [id]: 'connected' },
        activeConnectionId: id, keys: [], scanCursor: 0, selectedKey: null, selectedKeyValue: null,
      }));
      await get().scanKeys(true);
    } catch (e) {
      set(s => ({ connectionStatus: { ...s.connectionStatus, [id]: 'disconnected' } }));
      throw e;
    }
  },
  disconnect: async (id) => {
    await cmd.disconnect(id);
    set(s => ({
      connectionStatus: { ...s.connectionStatus, [id]: 'disconnected' },
      ...(s.activeConnectionId === id ? { activeConnectionId: null, keys: [], selectedKey: null, selectedKeyValue: null } : {}),
    }));
  },
  scanKeys: async (reset) => {
    const { activeConnectionId: id, scanPattern, scanCursor, keys } = get();
    if (!id) return;
    const cursor = reset ? 0 : scanCursor;
    const result = await cmd.scanKeys(id, cursor, scanPattern, 200);
    set({ keys: reset ? result.keys : [...keys, ...result.keys], scanCursor: result.cursor });
  },
  setScanPattern: (pattern) => set({ scanPattern: pattern }),
  selectKey: async (key) => {
    const id = get().activeConnectionId;
    if (!id) return;
    const value = await cmd.getKeyValue(id, key);
    set({ selectedKey: key, selectedKeyValue: value });
  },
  refreshSelectedKey: async () => {
    const { selectedKey } = get();
    if (selectedKey) await get().selectKey(selectedKey);
  },
  executeCommand: async (command) => {
    const id = get().activeConnectionId;
    if (!id) return;
    set(s => ({ cliHistory: [...s.cliHistory, command] }));
    try {
      const result = await cmd.executeCommand(id, command);
      set(s => ({ cliOutput: [...s.cliOutput, `> ${command}`, result] }));
    } catch (e: any) {
      set(s => ({ cliOutput: [...s.cliOutput, `> ${command}`, `(error) ${e}`] }));
    }
  },
  clearCliOutput: () => set({ cliOutput: [] }),
}));
