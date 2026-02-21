import '../styles/TimingChart.css';

export interface TimingData {
  dns: number;
  tcp: number;
  tls: number;
  ttfb: number;
  download: number;
}

interface Props {
  timing?: TimingData;
  totalTime: number;
}

export function TimingChart({ timing, totalTime }: Props) {
  if (!timing) {
    return (
      <div className="timing-chart">
        <div className="timing-total">{totalTime} ms</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          详细时间分析需要 Rust 后端支持
        </div>
      </div>
    );
  }

  const maxTime = Math.max(timing.dns, timing.tcp, timing.tls, timing.ttfb, timing.download, 1);
  const getWidth = (v: number) => `${(v / maxTime) * 100}%`;

  const phases = [
    { key: 'dns', label: 'DNS 解析', value: timing.dns },
    { key: 'tcp', label: 'TCP 连接', value: timing.tcp },
    { key: 'tls', label: 'TLS 握手', value: timing.tls },
    { key: 'ttfb', label: '首字节 (TTFB)', value: timing.ttfb },
    { key: 'download', label: '内容下载', value: timing.download },
  ];

  return (
    <div className="timing-chart">
      <div className="timing-total">
        {totalTime} ms <span>总耗时</span>
      </div>
      
      <div className="timing-bars">
        {phases.map(p => (
          <div key={p.key} className="timing-row">
            <span className="timing-label">{p.label}</span>
            <div className="timing-bar-container">
              <div className={`timing-bar ${p.key}`} style={{ width: getWidth(p.value) }} />
            </div>
            <span className="timing-value">{p.value} ms</span>
          </div>
        ))}
      </div>

      <div className="timing-legend">
        {phases.map(p => (
          <div key={p.key} className="legend-item">
            <div className={`legend-color`} style={{ background: getBarColor(p.key) }} />
            <span>{p.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getBarColor(key: string): string {
  const colors: Record<string, string> = {
    dns: '#8b5cf6',
    tcp: '#f59e0b',
    tls: '#ec4899',
    ttfb: '#10b981',
    download: '#3b82f6',
  };
  return colors[key] || '#888';
}
