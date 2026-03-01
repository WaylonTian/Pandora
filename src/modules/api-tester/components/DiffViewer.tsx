import { useState } from 'react';
import { useT } from '@/i18n';
import { diffJson, diffText, DiffLine } from '../utils/diff';
import '../styles/DiffViewer.css';

interface Snapshot {
  id: string;
  name: string;
  timestamp: number;
  body: string;
  status: number;
}

interface Props {
  currentResponse?: { body: string; status: number };
  snapshots: Snapshot[];
  onSaveSnapshot: (name: string) => void;
  onDeleteSnapshot: (id: string) => void;
}

export function DiffViewer({ currentResponse, snapshots, onSaveSnapshot, onDeleteSnapshot }: Props) {
  const t = useT();
  const [leftId, setLeftId] = useState<string>('current');
  const [rightId, setRightId] = useState<string>(snapshots[0]?.id || '');
  const [snapshotName, setSnapshotName] = useState('');

  const getContent = (id: string): string => {
    if (id === 'current') return currentResponse?.body || '';
    return snapshots.find(s => s.id === id)?.body || '';
  };

  const leftContent = getContent(leftId);
  const rightContent = getContent(rightId);
  
  let diffLines: DiffLine[] = [];
  try {
    const leftJson = JSON.parse(leftContent);
    const rightJson = JSON.parse(rightContent);
    diffLines = diffJson(leftJson, rightJson);
  } catch {
    diffLines = diffText(leftContent, rightContent);
  }

  const stats = {
    added: diffLines.filter(l => l.type === 'added').length,
    removed: diffLines.filter(l => l.type === 'removed').length,
  };

  return (
    <div className="diff-viewer">
      <div className="diff-toolbar">
        <div className="diff-selectors">
          <select value={leftId} onChange={e => setLeftId(e.target.value)}>
            <option value="current">{t('diffViewer.currentResponse')}</option>
            {snapshots.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <span className="diff-vs">vs</span>
          <select value={rightId} onChange={e => setRightId(e.target.value)}>
            {snapshots.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
            {snapshots.length === 0 && <option value="">{t('diffViewer.noSnapshot')}</option>}
          </select>
        </div>
        <div className="diff-actions">
          <input
            type="text"
            placeholder={t('diffViewer.snapshotNamePlaceholder')}
            value={snapshotName}
            onChange={e => setSnapshotName(e.target.value)}
          />
          <button 
            onClick={() => { onSaveSnapshot(snapshotName || `Snapshot ${Date.now()}`); setSnapshotName(''); }}
            disabled={!currentResponse}
          >
            {t('diffViewer.saveSnapshot')}
          </button>
        </div>
      </div>

      <div className="diff-stats">
        <span className="stat-added">+{stats.added} {t('diffViewer.added')}</span>
        <span className="stat-removed">-{stats.removed} {t('diffViewer.removed')}</span>
      </div>

      <div className="diff-content">
        {diffLines.length === 0 ? (
          <div className="diff-empty">{t('diffViewer.selectTwoResponses')}</div>
        ) : (
          diffLines.map((line, i) => (
            <div key={i} className={`diff-line ${line.type}`}>
              <span className="line-num left">{line.lineNum?.left || ''}</span>
              <span className="line-num right">{line.lineNum?.right || ''}</span>
              <span className="line-prefix">
                {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
              </span>
              <span className="line-content">{line.content}</span>
            </div>
          ))
        )}
      </div>

      {snapshots.length > 0 && (
        <div className="snapshot-list">
          <div className="snapshot-header">{t('diffViewer.savedSnapshots')}</div>
          {snapshots.map(s => (
            <div key={s.id} className="snapshot-item">
              <span className="snapshot-name">{s.name}</span>
              <span className="snapshot-time">{new Date(s.timestamp).toLocaleString()}</span>
              <button className="snapshot-delete" onClick={() => onDeleteSnapshot(s.id)}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
