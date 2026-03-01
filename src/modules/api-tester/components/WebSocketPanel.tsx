import { useState, useEffect, useRef } from 'react';
import { useT } from '@/i18n';

interface Message {
  id: number;
  type: 'sent' | 'received' | 'system';
  data: string;
  time: string;
}

export function WebSocketPanel() {
  const t = useT();
  const [url, setUrl] = useState('wss://echo.websocket.org');
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const msgIdRef = useRef(0);

  const addMessage = (type: Message['type'], data: string) => {
    setMessages(prev => [...prev, {
      id: msgIdRef.current++,
      type,
      data,
      time: new Date().toLocaleTimeString(),
    }]);
  };

  const connect = () => {
    try {
      const ws = new WebSocket(url);
      ws.onopen = () => {
        setConnected(true);
        addMessage('system', t('wsPanel.connected'));
      };
      ws.onmessage = (e) => {
        addMessage('received', e.data);
      };
      ws.onclose = () => {
        setConnected(false);
        addMessage('system', t('wsPanel.disconnected'));
      };
      ws.onerror = () => {
        addMessage('system', t('wsPanel.connectionError'));
      };
      wsRef.current = ws;
    } catch (e) {
      addMessage('system', `Error: ${e}`);
    }
  };

  const disconnect = () => {
    wsRef.current?.close();
    wsRef.current = null;
  };

  const send = () => {
    if (wsRef.current && input) {
      wsRef.current.send(input);
      addMessage('sent', input);
      setInput('');
    }
  };

  const clear = () => setMessages([]);

  useEffect(() => {
    return () => { wsRef.current?.close(); };
  }, []);

  return (
    <div className="ws-panel">
      <div className="ws-header">
        <span className="ws-badge">WS</span>
        <input className="ws-url" value={url} onChange={e => setUrl(e.target.value)} placeholder="wss://..." disabled={connected} />
        {connected ? (
          <button className="btn danger" onClick={disconnect}>{t('wsPanel.disconnect')}</button>
        ) : (
          <button className="btn" onClick={connect}>{t('wsPanel.connect')}</button>
        )}
      </div>
      <div className="ws-messages-header">
        <span>{t('wsPanel.messages')}</span>
        <button className="icon-btn" onClick={clear}>{t('wsPanel.clear')}</button>
      </div>
      <div className="ws-messages">
        {messages.map(msg => (
          <div key={msg.id} className={`ws-message ${msg.type}`}>
            <span className="ws-arrow">{msg.type === 'sent' ? '→' : msg.type === 'received' ? '←' : '•'}</span>
            <span className="ws-data">{msg.data}</span>
            <span className="ws-time">{msg.time}</span>
          </div>
        ))}
      </div>
      <div className="ws-input-bar">
        <input className="ws-input" value={input} onChange={e => setInput(e.target.value)} 
          onKeyDown={e => e.key === 'Enter' && send()} placeholder={t('wsPanel.message')} disabled={!connected} />
        <button className="btn" onClick={send} disabled={!connected}>{t('wsPanel.send')}</button>
      </div>
    </div>
  );
}
