import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Settings {
  theme: 'dark' | 'light' | 'system';
  fontSize: number;
  sidebarWidth: number;
  requestPanelHeight: number;
  proxy: { enabled: boolean; host: string; port: number; type: 'http' | 'socks5' };
  timeout: number;
  followRedirects: boolean;
  maxRedirects: number;
  validateSSL: boolean;
}

interface SettingsState extends Settings {
  setTheme: (theme: Settings['theme']) => void;
  setFontSize: (size: number) => void;
  setSidebarWidth: (width: number) => void;
  setRequestPanelHeight: (height: number) => void;
  setProxy: (proxy: Settings['proxy']) => void;
  setTimeout: (timeout: number) => void;
  setFollowRedirects: (follow: boolean) => void;
  setValidateSSL: (validate: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      fontSize: 13,
      sidebarWidth: 260,
      requestPanelHeight: 300,
      proxy: { enabled: false, host: '', port: 8080, type: 'http' },
      timeout: 30000,
      followRedirects: true,
      maxRedirects: 10,
      validateSSL: true,

      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
      setRequestPanelHeight: (requestPanelHeight) => set({ requestPanelHeight }),
      setProxy: (proxy) => set({ proxy }),
      setTimeout: (timeout) => set({ timeout }),
      setFollowRedirects: (followRedirects) => set({ followRedirects }),
      setValidateSSL: (validateSSL) => set({ validateSSL }),
    }),
    { name: 'getman-settings' }
  )
);
