import { useState, useMemo, ReactNode } from 'react';

interface JsonTreeProps {
  data: any;
}

export function JsonTreeView({ data }: JsonTreeProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggle = (path: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const renderValue = (value: any, path: string, key?: string): ReactNode => {
    const isObject = value !== null && typeof value === 'object';
    const isArray = Array.isArray(value);
    const isCollapsed = collapsed.has(path);

    if (!isObject) {
      return (
        <span className="json-value">
          {key !== undefined && <span className="json-key">"{key}": </span>}
          {typeof value === 'string' ? (
            <span className="json-string">"{value}"</span>
          ) : typeof value === 'number' ? (
            <span className="json-number">{value}</span>
          ) : typeof value === 'boolean' ? (
            <span className="json-boolean">{String(value)}</span>
          ) : (
            <span className="json-null">null</span>
          )}
        </span>
      );
    }

    const entries: [string | number, any][] = isArray 
      ? value.map((v: any, i: number) => [i, v] as [number, any])
      : Object.entries(value);
    const bracket = isArray ? ['[', ']'] : ['{', '}'];
    const preview = isArray ? `Array(${value.length})` : `Object(${Object.keys(value).length})`;

    return (
      <div className="json-node">
        <span className="json-toggle" onClick={() => toggle(path)}>
          {isCollapsed ? '▶' : '▼'}
        </span>
        {key !== undefined && <span className="json-key">"{key}": </span>}
        <span className="json-bracket">{bracket[0]}</span>
        {isCollapsed ? (
          <span className="json-preview" onClick={() => toggle(path)}>{preview}</span>
        ) : (
          <div className="json-children">
            {entries.map(([k, v], i) => (
              <div key={String(k)} className="json-entry">
                {renderValue(v, `${path}.${k}`, String(k))}
                {i < entries.length - 1 && <span className="json-comma">,</span>}
              </div>
            ))}
          </div>
        )}
        <span className="json-bracket">{bracket[1]}</span>
      </div>
    );
  };

  const parsed = useMemo(() => {
    if (typeof data === 'string') {
      try { return JSON.parse(data); } catch { return null; }
    }
    return data;
  }, [data]);

  if (parsed === null) {
    return <pre className="json-raw">{String(data)}</pre>;
  }

  return <div className="json-tree">{renderValue(parsed, 'root')}</div>;
}
