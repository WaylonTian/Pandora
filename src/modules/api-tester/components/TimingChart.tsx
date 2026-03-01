import { useT } from '@/i18n';
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
  const t = useT();
  
  if (!timing) {
    return (
      <div className="timing-chart">
        <div className="timing-total">{totalTime} ms</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          {t('timingChart.detailedAnalysisNote')}
        </div>
      </div>
    );
  }

  const maxTime = Math.max(timing.dns, timing.tcp, timing.tls, timing.ttfb, timing.download, 1);
  const getWidth = (v: number) => `${(v / maxTime) * 100}%`;

  const phases = [
    { key: 'dns', label: t('timingChart.dnsResolution'), value: timing.dns },
    { key: 'tcp', label: t('timingChart.tcpConnection'), value: timing.tcp },
    { key: 'tls', label: t('timingChart.tlsHandshake'), value: timing.tls },
    { key: 'ttfb', label: t('timingChart.firstByte'), value: timing.ttfb },
    { key: 'download', label: t('timingChart.contentDownload'), value: timing.download },
  ];

  return (
    <div className="timing-chart">
      <div className="timing-total">
        {totalTime} ms <span>{t('timingChart.totalTime')}</span>
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
