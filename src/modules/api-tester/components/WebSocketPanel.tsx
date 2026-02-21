import { useState, useEffect, useRef } from 'react';

interface Message {
  id: number;
  type: 'sent' | 'received' | 'system';
  data: string;
  time: string;
}

export function WebSocketPanel() {
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
        addMessage('system', 'Connected');
      };
      ws.onmessage = (e) => {
        addMessage('received', e.data);
      };
      ws.onclose = () => {
        setConnected(false);
        addMessage('system', 'Disconnected');
      };
      ws.onerror = () => {
        addMessage('system', 'Connection error');
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
          <button className="btn danger" onClick={disconnect}>Disconnect</button>
        ) : (
          <button className="btn" onClick={connect}>Connect</button>
        )}
      </div>
      <div className="ws-messages-header">
        <span>Messages</span>
        <button className="icon-btn" onClick={clear}>Clear</button>
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
          onKeyDown={e => e.key === 'Enter' && send()} placeholder="Message..." disabled={!connected} />
        <button className="btn" onClick={send} disabled={!connected}>Send</button>
      </div>
    </div>
  );
}
