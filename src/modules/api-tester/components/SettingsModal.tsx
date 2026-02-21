import { useSettingsStore } from '../stores/settings';

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const settings = useSettingsStore();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal settings-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span>Settings</span>
          <button className="icon-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="settings-section">
            <h3>Appearance</h3>
            <div className="setting-row">
              <label>Theme</label>
              <select value={settings.theme} onChange={e => settings.setTheme(e.target.value as any)}>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="system">System</option>
              </select>
            </div>
            <div className="setting-row">
              <label>Font Size</label>
              <input type="number" value={settings.fontSize} onChange={e => settings.setFontSize(Number(e.target.value))} min={10} max={20} />
            </div>
          </div>

          <div className="settings-section">
            <h3>Request</h3>
            <div className="setting-row">
              <label>Timeout (ms)</label>
              <input type="number" value={settings.timeout} onChange={e => settings.setTimeout(Number(e.target.value))} />
            </div>
            <div className="setting-row">
              <label>Follow Redirects</label>
              <input type="checkbox" checked={settings.followRedirects} onChange={e => settings.setFollowRedirects(e.target.checked)} />
            </div>
            <div className="setting-row">
              <label>Validate SSL</label>
              <input type="checkbox" checked={settings.validateSSL} onChange={e => settings.setValidateSSL(e.target.checked)} />
            </div>
          </div>

          <div className="settings-section">
            <h3>Proxy</h3>
            <div className="setting-row">
              <label>Enable Proxy</label>
              <input type="checkbox" checked={settings.proxy.enabled} onChange={e => settings.setProxy({ ...settings.proxy, enabled: e.target.checked })} />
            </div>
            {settings.proxy.enabled && (
              <>
                <div className="setting-row">
                  <label>Type</label>
                  <select value={settings.proxy.type} onChange={e => settings.setProxy({ ...settings.proxy, type: e.target.value as any })}>
                    <option value="http">HTTP</option>
                    <option value="socks5">SOCKS5</option>
                  </select>
                </div>
                <div className="setting-row">
                  <label>Host</label>
                  <input value={settings.proxy.host} onChange={e => settings.setProxy({ ...settings.proxy, host: e.target.value })} placeholder="127.0.0.1" />
                </div>
                <div className="setting-row">
                  <label>Port</label>
                  <input type="number" value={settings.proxy.port} onChange={e => settings.setProxy({ ...settings.proxy, port: Number(e.target.value) })} />
                </div>
              </>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
