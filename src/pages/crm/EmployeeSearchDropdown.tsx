import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
import { get } from '@/services/api';

interface EmployeeOption {
  id: string;
  email: string;
  full_name: string;
  employee_code: string;
  designation_name: string | null;
}

interface Props {
  value: string;
  onChange: (id: string, employee?: EmployeeOption) => void;
  color?: string;
}

const EmployeeSearchDropdown: React.FC<Props> = ({ value, onChange, color = '#2563EB' }) => {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    get<EmployeeOption[]>('/employees/simple-dropdown/')
      .then(data => setEmployees(Array.isArray(data) ? data : []))
      .catch(() => setEmployees([]));
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const selected = employees.find(e => e.id === value);
  const filtered = employees.filter(e => {
    const q = query.toLowerCase();
    return e.full_name?.toLowerCase().includes(q) || e.email?.toLowerCase().includes(q) || e.employee_code?.toLowerCase().includes(q);
  });

  const fieldInputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-main)', fontSize: '13.5px', outline: 'none' };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{ ...fieldInputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', color: selected ? 'var(--color-text-main)' : 'var(--color-text-muted)' }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? `${selected.full_name} (${selected.employee_code})` : 'Select employee...'}
        </span>
        <ChevronDown size={15} style={{ flexShrink: 0 }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 200,
          background: 'var(--color-surface)', border: '1.5px solid var(--color-border)',
          borderRadius: '12px', boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
          maxHeight: '320px', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{ padding: '8px', borderBottom: '1px solid var(--color-border)', position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input
              autoFocus
              type="text"
              placeholder="Search by name, email, code..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ width: '100%', padding: '7px 10px 7px 30px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)', fontSize: '12.5px', outline: 'none' }}
            />
          </div>
          <div style={{ overflowY: 'auto', maxHeight: '260px' }}>
            {filtered.length === 0 && (
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem' }}>No employees found.</p>
            )}
            {filtered.map(emp => {
              const isSelected = emp.id === value;
              return (
                <div
                  key={emp.id}
                  onClick={() => { onChange(emp.id, emp); setOpen(false); setQuery(''); }}
                  style={{
                    padding: '9px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    cursor: 'pointer', background: isSelected ? `${color}12` : 'transparent',
                  }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--color-bg)'; }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0 }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.full_name}</span>
                    <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {emp.designation_name || emp.employee_code} · {emp.email}
                    </span>
                  </div>
                  {isSelected && <Check size={14} color={color} style={{ flexShrink: 0 }} />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeSearchDropdown;