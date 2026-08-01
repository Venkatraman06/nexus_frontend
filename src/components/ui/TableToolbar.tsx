import React from 'react';
import { Pencil, Trash2, Search, Download } from 'lucide-react';

export const fieldInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px',
  borderRadius: '8px',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text-main)',
};

export const formatApiError = (err: any, status?: number, action: string = 'complete this action'): string => {
  if (err && typeof err === 'object') {
    if (typeof err.detail === 'string' && err.detail) return err.detail;
    const fieldMessages = Object.entries(err)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([field, msgs]) => {
        const text = Array.isArray(msgs) ? msgs.join(' ') : String(msgs);
        return field === 'non_field_errors' ? text : `${field}: ${text}`;
      });
    if (fieldMessages.length > 0) return fieldMessages.join(' | ');
  }
  return `Failed to ${action}${status ? ` (HTTP ${status})` : ''}.`;
};

export const downloadCSV = (filename: string, headers: string[], rows: Array<Array<string | number>>) => {
  const escape = (val: string | number) => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const csvContent = [headers, ...rows].map(row => row.map(escape).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const StatusSelect: React.FC<{
  value: string;
  labels: Record<string, string>;
  colors: Record<string, { bg: string; fg: string }>;
  onChange: (value: string) => void;
}> = ({ value, labels, colors, onChange }) => {
  const c = colors[value] || { bg: '#f5f5f5', fg: '#616161' };
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      onClick={e => e.stopPropagation()}
      style={{
        padding: '3px 6px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold',
        background: c.bg, color: c.fg, border: 'none', cursor: 'pointer'
      }}
    >
      {Object.entries(labels).map(([k, v]) => (
        <option key={k} value={k} style={{ color: '#000', background: '#fff' }}>{v}</option>
      ))}
    </select>
  );
};

export const RowActions: React.FC<{ onEdit: () => void; onDelete: () => void }> = ({ onEdit, onDelete }) => (
  <div style={{ display: 'flex', gap: '6px' }}>
    <button
      onClick={e => { e.stopPropagation(); onEdit(); }}
      title="Edit"
      style={{ padding: '6px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', cursor: 'pointer', display: 'flex' }}
    >
      <Pencil size={13} style={{ color: 'var(--color-secondary)' }} />
    </button>
    <button
      onClick={e => { e.stopPropagation(); onDelete(); }}
      title="Delete"
      style={{ padding: '6px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', cursor: 'pointer', display: 'flex' }}
    >
      <Trash2 size={13} style={{ color: '#e53935' }} />
    </button>
  </div>
);

export const SearchBox: React.FC<{ value: string; onChange: (v: string) => void; placeholder: string }> = ({ value, onChange, placeholder }) => (
  <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ ...fieldInputStyle, paddingLeft: '30px' }}
    />
  </div>
);

export const ToolbarButton: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px',
      border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-main)',
      cursor: 'pointer', fontSize: '12.5px', fontWeight: 600, whiteSpace: 'nowrap'
    }}
  >
    {children}
  </button>
);

export const FilterSelect: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}> = ({ value, onChange, options }) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-main)', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}
  >
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

export const BulkActionsBar: React.FC<{
  count: number;
  onClear: () => void;
  onDelete: () => void;
  onExport: () => void;
  statusLabels?: Record<string, string>;
  onApplyStatus?: (status: string) => void;
}> = ({ count, onClear, onDelete, onExport, statusLabels, onApplyStatus }) => {
  if (count === 0) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
      background: 'rgba(37,99,235,0.08)', borderRadius: '8px', fontSize: '12.5px', flexWrap: 'wrap'
    }}>
      <strong>{count} selected</strong>
      {statusLabels && onApplyStatus && (
        <select
          defaultValue=""
          onChange={e => { if (e.target.value) { onApplyStatus(e.target.value); e.target.value = ''; } }}
          style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '12px', background: 'var(--color-surface)', color: 'var(--color-text-main)' }}
        >
          <option value="">Set status to...</option>
          {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      )}
      <button onClick={onExport} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
        <Download size={12} /> Export Selected
      </button>
      <button onClick={onDelete} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', borderRadius: '6px', border: 'none', background: '#e53935', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
        <Trash2 size={12} /> Delete Selected
      </button>
      <button onClick={onClear} style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--color-text-muted)', textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none' }}>
        Clear
      </button>
    </div>
  );
};

export const RowCheckbox: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
  <input
    type="checkbox"
    checked={checked}
    onClick={e => e.stopPropagation()}
    onChange={onChange}
    style={{ width: '15px', height: '15px', cursor: 'pointer' }}
  />
);
