import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Plus, LayoutGrid, List, Search, Users, Eye,
  TrendingUp, BarChart2, Paperclip, Check, Pencil, Trash2, GripVertical, Bell, X,
  Phone, Mail, MessageCircle, Calendar, StickyNote, AlarmClock,
  LayoutDashboard, Target, Building2, ClipboardList, CheckSquare, FileText,
  DollarSign, Percent, Flame, ChevronRight, CalendarClock, Layers, ChevronDown, Upload, Send, UserPlus, Activity
} from 'lucide-react';
import styles from './ModulePlaceholder.module.css';
import { useModal } from '@/context/ModalContext';
import { useToast } from '@/context/ToastContext';
import ClientManagement from './ClientManagement';
import { get, post, patch, del } from "@/services/api";
import EmployeeSearchDropdown from './EmployeeSearchDropdown';
import ClientChatPanel from './ClientChatPanel';
import EmployeeMultiSelectDropdown from './EmployeeMultiSelectDropdown';

interface Lead {
  id: number;
  name: string;
  company: string;
  college: string;
  contact_person: string;
  designation: string;
  phone: string;
  whatsapp: string;
  email: string;
  location: string;
  lead_source: string;
  status: 'LEAD' | 'CONTACTED' | 'PROPOSAL_SENT' | 'WON' | 'LOST';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  remarks: string;
  expected_deal_value: string;
  training_requirement: string;
  follow_up_date: string | null;
  next_follow_up: string | null;
  last_contact_date: string | null;
  notes: string;
}

interface ActivityLog {
  id: number;
  lead: number | null;
  lead_name: string | null;
  activity_type: 'CALL' | 'MEETING' | 'EMAIL' | 'WHATSAPP' | 'NOTE' | 'REMINDER';
  title: string | null;
  description: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  created_at: string;
}

interface Meeting {
  id: number;
  lead: number;
  lead_name: string;
  title: string;
  date: string;
  time: string;
  outcome: string;
}

interface LeadTask {
  id: number;
  lead: number;
  lead_name: string;
  title: string;
  due_date: string;
  completed: boolean;
}

interface LeadDoc {
  id: number;
  lead: number;
  lead_name: string;
  name: string;
  doc_type: string;
  uploaded_at: string;
}

const ACTIVITY_TYPES = ['CALL', 'MEETING', 'EMAIL', 'WHATSAPP', 'NOTE', 'REMINDER'] as const;
type ActivityType = typeof ACTIVITY_TYPES[number];

const BOARD_COLUMNS = ['CALL', 'MEETING', 'EMAIL', 'WHATSAPP'] as const;

const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  CALL: 'Calls', MEETING: 'Meetings', EMAIL: 'Emails',
  WHATSAPP: 'WhatsApp', NOTE: 'Notes', REMINDER: 'Reminders',
};

const ACTIVITY_TYPE_EMOJI: Record<ActivityType, string> = {
  CALL: '📞', MEETING: '🤝', EMAIL: '✉️', WHATSAPP: '💬', NOTE: '📝', REMINDER: '⏰',
};

const ACTIVITY_TYPE_COLORS: Record<ActivityType, string> = {
  CALL: '#2563EB', MEETING: '#7C3AED', EMAIL: '#F59E0B',
  WHATSAPP: '#10B981', NOTE: '#64748B', REMINDER: '#EF4444',
};

const ACTIVITY_TYPE_ICONS: Record<ActivityType, React.ReactNode> = {
  CALL: <Phone size={13} />, MEETING: <Users size={13} />, EMAIL: <Mail size={13} />,
  WHATSAPP: <MessageCircle size={13} />, NOTE: <StickyNote size={13} />, REMINDER: <AlarmClock size={13} />,
};

const Req = () => <span style={{ color: '#EF4444' }}> *</span>;
const fieldLabelStyle: React.CSSProperties = { display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: 600, color: 'var(--color-text-muted)' };
const fieldInputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-main)', fontSize: '13.5px', outline: 'none', transition: 'border-color 0.15s' };

// ── Global hover-zoom + card styling + tab transition styling (mounted once) ─
 const HoverZoomStyles = () => (
  <style>{`
    .hz-card { transition: transform 0.18s ease, box-shadow 0.18s ease; cursor: pointer; }
    .hz-card:hover { transform: scale(1.055); box-shadow: 0 12px 30px rgba(0,0,0,0.16); z-index: 5; position: relative; }

    .hover-zoom { transition: transform 0.22s cubic-bezier(0.4,0,0.2,1), box-shadow 0.22s ease; }
    .hover-zoom:hover { transform: scale(1.015); box-shadow: 0 10px 28px rgba(0,0,0,0.10); z-index: 4; position: relative; }

    .hover-zoom-sm { transition: transform 0.18s cubic-bezier(0.4,0,0.2,1), box-shadow 0.18s ease; }
    .hover-zoom-sm:hover { transform: scale(1.035); box-shadow: 0 8px 20px rgba(0,0,0,0.12); z-index: 4; position: relative; }

    .stat-pill { transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease; cursor: pointer; }
    .stat-pill:hover { transform: scale(1.04) translateY(-2px); box-shadow: 0 14px 30px rgba(0,0,0,0.14); z-index: 4; position: relative; }

    .tab-content-enter {
      animation: tabFadeSlideIn 0.28s cubic-bezier(0.22, 1, 0.36, 1);
    }
    @keyframes tabFadeSlideIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .crm-tab-btn {
      transition: background 0.25s cubic-bezier(0.22, 1, 0.36, 1),
                  color 0.25s cubic-bezier(0.22, 1, 0.36, 1),
                  box-shadow 0.25s cubic-bezier(0.22, 1, 0.36, 1),
                  transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
      will-change: transform, background;
    }
  `}</style>
);

// ── Small reusable ON/OFF toggle switch (used for Lead → Client conversion) ──
const ToggleSwitch = ({ checked, onChange, onColor = '#10B981', size = 'md' }: {
  checked: boolean; onChange: (val: boolean) => void; onColor?: string; size?: 'sm' | 'md';
}) => {
  const dims = size === 'sm' ? { w: 34, h: 19, knob: 15 } : { w: 42, h: 23, knob: 19 };
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
      style={{
        width: dims.w, height: dims.h, borderRadius: 999, border: 'none', cursor: 'pointer',
        background: checked ? onColor : 'var(--color-border)', position: 'relative',
        transition: 'background 0.2s ease', flexShrink: 0, padding: 0,
      }}
      aria-pressed={checked}
      title={checked ? 'Client — click to move back to Lead' : 'Lead — click to convert to Client'}
    >
      <span style={{
        position: 'absolute', top: 2, left: checked ? dims.w - dims.knob - 2 : 2,
        width: dims.knob, height: dims.knob, borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 4px rgba(0,0,0,0.25)', transition: 'left 0.2s cubic-bezier(0.34,1.56,0.64,1)',
      }} />
    </button>
  );
};

// ── Analog clock (SVG, display-only) ─────────────────────────────────────
const AnalogClock = ({ time, size = 30, color = '#2563EB' }: { time?: string | null; size?: number; color?: string }) => {
  if (!time) return null;
  const [h, m] = time.split(':').map(Number);
  const r = size / 2;
  const hourAngle = ((h % 12) + m / 60) * 30 - 90;
  const minAngle = m * 6 - 90;
  const hx = r + r * 0.5 * Math.cos((hourAngle * Math.PI) / 180);
  const hy = r + r * 0.5 * Math.sin((hourAngle * Math.PI) / 180);
  const mx = r + r * 0.78 * Math.cos((minAngle * Math.PI) / 180);
  const my = r + r * 0.78 * Math.sin((minAngle * Math.PI) / 180);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={r} cy={r} r={r - 1.5} fill="var(--color-surface)" stroke={color} strokeWidth="1.5" />
      {[...Array(12)].map((_, i) => {
        const a = (i * 30 * Math.PI) / 180;
        return <circle key={i} cx={r + (r - 3) * Math.sin(a)} cy={r - (r - 3) * Math.cos(a)} r="0.8" fill={color} opacity={0.5} />;
      })}
      <line x1={r} y1={r} x2={hx} y2={hy} stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1={r} y1={r} x2={mx} y2={my} stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      <circle cx={r} cy={r} r="1.3" fill={color} />
    </svg>
  );
};

// ── Interactive Analog Time Picker ──────────────────────────────────
const AnalogTimePicker = ({
  value, onChange, color = '#2563EB', size = 220,
}: { value: string; onChange: (time: string) => void; color?: string; size?: number }) => {
  const [mode, setMode] = useState<'hour' | 'minute'>('hour');
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState(false);

  const parsed = value ? value.split(':').map(Number) : [12, 0];
  let [hour24, minute] = parsed;
  if (isNaN(hour24)) hour24 = 12;
  if (isNaN(minute)) minute = 0;
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const isPM = hour24 >= 12;

  const r = size / 2;
  const faceR = r - 14;

  const angleFromPoint = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return 0;
    const rect = svg.getBoundingClientRect();
    const scale = size / rect.width;
    const x = (clientX - rect.left) * scale - r;
    const y = (clientY - rect.top) * scale - r;
    let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    return angle;
  };

  const setFromAngle = (angle: number) => {
    if (mode === 'hour') {
      let h = Math.round(angle / 30) % 12;
      if (h === 0) h = 12;
      const newHour24 = isPM ? (h === 12 ? 12 : h + 12) : (h === 12 ? 0 : h);
      onChange(`${String(newHour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
    } else {
      let m = Math.round(angle / 6) % 60;
      onChange(`${String(hour24).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  };

  const handlePointer = (e: React.PointerEvent) => {
    const angle = angleFromPoint(e.clientX, e.clientY);
    setFromAngle(angle);
  };

  const handleDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    setDragging(true);
    handlePointer(e);
  };
  const handleMove = (e: React.PointerEvent) => { if (dragging) handlePointer(e); };
  const handleUp = () => setDragging(false);

  const handAngle = mode === 'hour' ? (hour12 % 12) * 30 - 90 : minute * 6 - 90;
  const handLen = faceR * 0.72;
  const hx = r + handLen * Math.cos((handAngle * Math.PI) / 180);
  const hy = r + handLen * Math.sin((handAngle * Math.PI) / 180);

  const ticks = mode === 'hour'
    ? [...Array(12)].map((_, i) => i + 1)
    : [...Array(12)].map((_, i) => i * 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            type="button"
            onClick={() => setMode('hour')}
            style={{
              fontSize: '24px', fontWeight: 800, padding: '4px 8px', borderRadius: '8px',
              border: 'none', cursor: 'pointer',
              background: mode === 'hour' ? `${color}18` : 'transparent',
              color: mode === 'hour' ? color : 'var(--color-text-main)',
            }}
          >
            {String(hour12).padStart(2, '0')}
          </button>
          <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-text-muted)' }}>:</span>
          <button
            type="button"
            onClick={() => setMode('minute')}
            style={{
              fontSize: '24px', fontWeight: 800, padding: '4px 8px', borderRadius: '8px',
              border: 'none', cursor: 'pointer',
              background: mode === 'minute' ? `${color}18` : 'transparent',
              color: mode === 'minute' ? color : 'var(--color-text-main)',
            }}
          >
            {String(minute).padStart(2, '0')}
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <button
            type="button"
            onClick={() => { const h = isPM ? hour24 - 12 : hour24; onChange(`${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`); }}
            style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', border: `1.5px solid ${!isPM ? color : 'var(--color-border)'}`, background: !isPM ? `${color}18` : 'transparent', color: !isPM ? color : 'var(--color-text-muted)', cursor: 'pointer' }}
          >AM</button>
          <button
            type="button"
            onClick={() => { const h = !isPM ? hour24 + 12 : hour24; onChange(`${String(h % 24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`); }}
            style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', border: `1.5px solid ${isPM ? color : 'var(--color-border)'}`, background: isPM ? `${color}18` : 'transparent', color: isPM ? color : 'var(--color-text-muted)', cursor: 'pointer' }}
          >PM</button>
        </div>
      </div>

      <svg
        ref={svgRef}
        width={size} height={size} viewBox={`0 0 ${size} ${size}`}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        style={{ touchAction: 'none', cursor: 'pointer', userSelect: 'none' }}
      >
        <circle cx={r} cy={r} r={r - 2} fill={`${color}08`} stroke={`${color}30`} strokeWidth="1.5" />
        {ticks.map((t, i) => {
          const a = (i * 30 * Math.PI) / 180 - Math.PI / 2;
          const tx = r + faceR * Math.cos(a);
          const ty = r + faceR * Math.sin(a);
          const isSelected = mode === 'hour' ? t === hour12 : t === minute;
          return (
            <g key={t}>
              <circle cx={tx} cy={ty} r={isSelected ? 15 : 13} fill={isSelected ? color : 'transparent'} />
              <text x={tx} y={ty} textAnchor="middle" dominantBaseline="central"
                fontSize="12.5" fontWeight={isSelected ? 800 : 600}
                fill={isSelected ? 'white' : 'var(--color-text-main)'}>
                {mode === 'minute' ? String(t).padStart(2, '0') : t}
              </text>
            </g>
          );
        })}
        <line x1={r} y1={r} x2={hx} y2={hy} stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={r} cy={r} r="4" fill={color} />
      </svg>

      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
        {mode === 'hour' ? 'Select minutes next →' : '✓ Time set — click hour to adjust'}
      </span>
    </div>
  );
};

// ── Popover wrapper for time selection — renders the ANALOG CLOCK picker on top ──
const TimeField = ({
  value, onChange, color = '#2563EB', style,
}: { value: string; onChange: (t: string) => void; color?: string; style?: React.CSSProperties }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleOpen = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      // Anchor the picker to the input's top edge so it expands upward and
      // remains fully visible inside the follow-up modal.
      setCoords({ top: rect.top - 8, left: rect.left });
    }
    setOpen(o => !o);
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative', ...style }}>
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        style={{ ...fieldInputStyle, display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between', cursor: 'pointer', color: value ? 'var(--color-text-main)' : 'var(--color-text-muted)' }}
      >
        <span>{value || 'Select time'}</span>
        {value ? <AnalogClock time={value} size={20} color={color} /> : <AlarmClock size={15} />}
      </button>
      {open && (
        <div style={{
          position: 'fixed', top: coords.top, left: coords.left, zIndex: 99999,
          transform: 'translateY(-100%)',
          background: 'var(--color-surface)', border: '1.5px solid var(--color-border)',
          borderRadius: '16px', padding: '18px', boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        }}>
          <AnalogTimePicker value={value || '12:00'} onChange={onChange} color={color} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{ padding: '7px 16px', background: color, color: 'white', border: 'none', borderRadius: '9px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Animated counter hook ──────────────────────────────────────────────────
const useCountUp = (target: number, duration = 1200) => {
  const [value, setValue] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(ease * target));
      if (progress < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return value;
};

// ── Mini KPI card for CRM dashboard ──────────────────────────────────────
const CRMStatCard = ({ label, value, prefix = '', suffix = '', icon, color, gradient, trend, sublabel }: {
  label: string; value: number; prefix?: string; suffix?: string;
  icon: React.ReactNode; color: string; gradient: string;
  trend?: number[]; sublabel?: string;
}) => {
  const animated = useCountUp(value);
  const bars = trend && trend.length > 0 ? trend : [4, 5, 3, 6, 5, 7, 8];
  const maxBar = Math.max(...bars, 1);
  return (
    <div className="glass-panel stat-pill" style={{ position: 'relative', overflow: 'hidden', padding: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: '4px', background: gradient, borderRadius: '18px 18px 0 0' }} />
      <div style={{ padding: '1.25rem 1.5rem 1.5rem', display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: `${color}18`, boxShadow: `0 0 0 6px ${color}0d`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color, transition: 'transform 0.32s cubic-bezier(0.34,1.56,0.64,1)',
          flexShrink: 0,
        }}
          className="icon-circle"
        >
          {icon}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
          <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-text-main)', lineHeight: 1.1, letterSpacing: '-0.03em' }}>
            {prefix}{typeof value === 'number' && value > 100 ? animated.toLocaleString() : animated}{suffix}
          </span>
          {sublabel && <span style={{ fontSize: '10.5px', fontWeight: 600, color }}>{sublabel}</span>}
        </div>
      </div>
      <div style={{ position: 'absolute', right: 16, bottom: 14, display: 'flex', alignItems: 'flex-end', gap: '3px', height: 30, opacity: 0.85 }}>
        {bars.map((b, i) => (
          <div key={i} style={{
            width: 4, height: `${Math.max((b / maxBar) * 100, 12)}%`,
            background: i === bars.length - 1 ? color : `${color}55`,
            borderRadius: '2px',
          }} />
        ))}
      </div>
    </div>
  );
};

// ── Donut / ring chart, e.g. Conversion Rate ("On-Time Fulfillment" style) ──
const DonutStat = ({
  percent, size = 132, strokeWidth = 14, label = 'On track', centerLabel = '',
  gradientFrom = '#7C3AED', gradientTo = '#2563EB', trackColor,
}: {
  percent: number; size?: number; strokeWidth?: number; label?: string; centerLabel?: string;
  gradientFrom?: string; gradientTo?: string; trackColor?: string;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const animated = useCountUp(Math.round(clamped), 1000);
  const offset = circumference - (clamped / 100) * circumference;
  const gradId = `donutGradient-${gradientFrom.replace('#', '')}-${gradientTo.replace('#', '')}`;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={trackColor || 'var(--color-border)'}
          strokeWidth={strokeWidth} fill="none" opacity={0.35}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth} fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.4,0,0.2,1)' }}
        />
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradientFrom} />
            <stop offset="100%" stopColor={gradientTo} />
          </linearGradient>
        </defs>
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.19, fontWeight: 800, color: 'var(--color-text-main)', lineHeight: 1 }}>{animated}%</span>
        {centerLabel && (
          <span style={{ fontSize: size * 0.075, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 4, textAlign: 'center' }}>
            {centerLabel}
          </span>
        )}
      </div>
    </div>
  );
};

// ── Tabs definition — Dashboard, Leads, Tasks, Follow-ups, Documents, Clients ──
const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} /> },
  { id: 'leads',     label: 'Leads',     icon: <Target size={15} /> },
  { id: 'tasks',     label: 'Tasks',     icon: <CheckSquare size={15} /> },
  { id: 'followups', label: 'Follow-ups',icon: <ClipboardList size={15} /> },
  { id: 'documents', label: 'Documents', icon: <FileText size={15} /> },
  { id: 'clients',   label: 'Clients',   icon: <Building2 size={15} /> },
] as const;
type TabId = typeof TABS[number]['id'];

const TrainingCRM: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [subTab, setSubTab] = useState<TabId>('leads');
  const [view, setView] = useState<'grid' | 'kanban'>('grid');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const { openModal, closeModal } = useModal();
  const { addToast } = useToast();

  const [draggedActivityId, setDraggedActivityId] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ActivityType | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [activityCategoryFilter, setActivityCategoryFilter] = useState<'ALL' | ActivityType>('ALL');
  const [activitySearch, setActivitySearch] = useState('');

  const [tabAnimKey, setTabAnimKey] = useState(0);

  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/crm/dashboard')) setSubTab('dashboard');
    else if (path.includes('/crm/clients')) setSubTab('clients');
    else if (path.includes('/crm/followups')) setSubTab('followups');
    else if (path.includes('/crm/tasks')) setSubTab('tasks');
    else if (path.includes('/crm/documents')) setSubTab('documents');
    else setSubTab('leads');
  }, [location.pathname]);

  useEffect(() => {
    setTabAnimKey(k => k + 1);
  }, [subTab]);

  const handleTabChange = (tab: TabId) => {
    if (tab === subTab) return;
    if (tab === 'leads') navigate('/crm');
    else navigate(`/crm/${tab}`);
  };

  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [selectedLeadForActivity, setSelectedLeadForActivity] = useState<number | ''>('');

  const [_meetings, setMeetings] = useState<Meeting[]>([]);
  const [tasks, setTasks] = useState<LeadTask[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('');
  const [newTaskLead, setNewTaskLead] = useState<number | ''>('');

  const [docs, setDocs] = useState<LeadDoc[]>([]);
  const [newDocFile, setNewDocFile] = useState<File | null>(null);
  const [newDocType, setNewDocType] = useState('Requirement');
  const [newDocLead, setNewDocLead] = useState<number | ''>('');

  useEffect(() => {
    if (leads.length > 0) {
      if (selectedLeadForActivity === '') setSelectedLeadForActivity(leads[0].id);
      if (newTaskLead === '') setNewTaskLead(leads[0].id);
      if (newDocLead === '') setNewDocLead(leads[0].id);
    }
  }, [leads]);

  const validateRequired = (fields: { label: string; value: unknown }[]): boolean => {
    const missing = fields.filter(f => f.value === '' || f.value === null || f.value === undefined).map(f => f.label);
    if (missing.length > 0) { addToast(`Please fill required field${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`, 'error'); return false; }
    return true;
  };

  const fetchLeads = async () => {
    try {
      const data = await get<any>(`/leads/`);
      setLeads(Array.isArray(data) ? data : (data.results ?? []));
    } catch {
      addToast('Could not reach backend - check that the Django server is running on port 8000', 'error');
    }
  };

  const fetchActivities = async () => {
    try {
      const data = await get<any>(`/activities/`);
      setActivities(Array.isArray(data) ? data : (data.results ?? []));
    } catch (e) { console.warn('Failed to load activities', e); }
  };

  const fetchMeetings = async () => {
    try {
      const data = await get<any>(`/meetings/`);
      setMeetings(Array.isArray(data) ? data : (data.results ?? []));
    } catch (e) { console.warn('Failed to load meetings', e); }
  };

  const fetchLeadTasks = async () => {
    try {
      const data = await get<any>(`/lead-tasks/`);
      setTasks(Array.isArray(data) ? data : (data.results ?? []));
    } catch (e) { console.warn('Failed to load lead tasks', e); }
  };

  const fetchDocs = async () => {
    try {
      const data = await get<any>(`/lead-documents/`);
      setDocs(Array.isArray(data) ? data : (data.results ?? []));
    } catch (e) { console.warn('Failed to load lead documents', e); }
  };

useEffect(() => { fetchLeads(); fetchActivities(); fetchLeadTasks(); fetchDocs(); }, []);

  const handleCreateLead = async (leadData: Partial<Lead>) => {
    try {
      await post(`/leads/`, leadData);
      addToast('Lead created successfully!', 'success');
      fetchLeads();
      closeModal();
    } catch (err: any) {
      console.error('Lead create failed:', err);
      addToast('Failed to save lead to backend', 'error');
    }
  };

  const handleEditLead = async (id: number, leadData: Partial<Lead>) => {
    try {
      await patch(`/leads/${id}/`, leadData);
      addToast('Lead updated successfully!', 'success');
      fetchLeads();
      closeModal();
    } catch {
      addToast('Failed to update lead on backend', 'error');
    }
  };

  const handleDeleteLead = async (id: number) => {
    if (!window.confirm('Delete this lead? This cannot be undone.')) return;
    try {
      await del(`/leads/${id}/`);
      addToast('Lead deleted', 'success');
      setLeads(leads.filter(l => l.id !== id));
      closeModal();
    } catch {
      addToast('Error deleting lead - check backend is running on port 8000', 'error');
    }
  };

  const handleUpdateStatus = async (id: number, newStatus: Lead['status']) => {
    setLeads(leads.map(l => l.id === id ? { ...l, status: newStatus } : l));
    addToast(`Status updated to ${newStatus}`, 'success');
    try {
      await patch(`/leads/${id}/`, { status: newStatus });
      fetchLeads(); // re-sync in case backend auto-converted to Client
    } catch {
      addToast('Status change failed to save to backend', 'error');
    }
  };

  const handleUpdatePriority = async (id: number, newPriority: Lead['priority']) => {
    const prevLeads = leads;
    setLeads(leads.map(l => l.id === id ? { ...l, priority: newPriority } : l));
    addToast(`Priority updated to ${newPriority}`, 'success');
    try {
      await patch(`/leads/${id}/`, { priority: newPriority });
      fetchLeads();
    } catch {
      setLeads(prevLeads);
      addToast('Priority change failed to save to backend', 'error');
    }
  };
   const ClientConversionForm = ({
  lead, onSubmit, onClose,
}: {
  lead: Lead;
  onSubmit: (data: {
    business_category: string; deal_title: string; deal_description: string;
    deal_amount: string; deal_date_from: string; deal_date_to: string; assigned_employee_ids: string[];
    assigned_employee_names: string[];
  }) => void;
  onClose: () => void;
}) => {
  const { addToast } = useToast();
  const [businessCategory, setBusinessCategory] = useState('TRAINING');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(lead.expected_deal_value || '');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
 const [assignedEmployeeIds, setAssignedEmployeeIds] = useState<string[]>([]);
const [assignedEmployeeNames, setAssignedEmployeeNames] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  if (!businessCategory || !title || !amount || !dateFrom || !dateTo || assignedEmployeeIds.length === 0) {
    addToast('Please fill required fields: Category, Title, Amount, Date From, Date To, Assigned To', 'error');
    return;
  }
  onSubmit({
    business_category: businessCategory, deal_title: title, deal_description: description,
    deal_amount: amount, deal_date_from: dateFrom, deal_date_to: dateTo,
    assigned_employee_ids: assignedEmployeeIds,
    assigned_employee_names: assignedEmployeeNames,
  });
};

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', margin: 0 }}>
        Converting <strong style={{ color: 'var(--color-text-main)' }}>{lead.name}</strong> from Lead to Client — fill in the deal details.
      </p>

      <div>
        <label style={fieldLabelStyle}>Business Category<Req /></label>
        <select value={businessCategory} onChange={e => setBusinessCategory(e.target.value)} style={fieldInputStyle}>
          <option value="TRAINING">Training</option>
          <option value="CONSULTING">Consulting</option>
          <option value="SALES">Sales</option>
        </select>
      </div>

      <div>
        <label style={fieldLabelStyle}>Title<Req /></label>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. 3-month Python training program" style={fieldInputStyle} />
      </div>

      <div>
        <label style={fieldLabelStyle}>Description</label>
        <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} style={{ ...fieldInputStyle, resize: 'vertical' }} />
      </div>

      <div>
        <label style={fieldLabelStyle}>Final Amount ($)<Req /></label>
        <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} style={fieldInputStyle} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div>
          <label style={fieldLabelStyle}>Date From<Req /></label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={fieldInputStyle} />
        </div>
        <div>
          <label style={fieldLabelStyle}>Date To<Req /></label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={fieldInputStyle} />
        </div>
      </div>

      <div>
  <label style={fieldLabelStyle}>Assigned To<Req /></label>
  <EmployeeMultiSelectDropdown
  value={assignedEmployeeIds}
  onChange={(ids, employees) => {
    setAssignedEmployeeIds(ids);
    setAssignedEmployeeNames(employees.map(e => e.full_name));
  }}
/>
</div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
        <button type="button" onClick={onClose} style={{ padding: '9px 18px', color: 'var(--color-text-muted)', fontWeight: 600, cursor: 'pointer', borderRadius: '10px', border: '1.5px solid var(--color-border)', background: 'transparent' }}>Cancel</button>
        <button type="submit" style={{ padding: '9px 18px', background: 'linear-gradient(135deg,#2563EB,#7C3AED)', color: 'white', borderRadius: '10px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>Convert to Client</button>
      </div>
    </form>
  );
};
  // ── NEW: Toggle Lead -> Client. Backend already auto-creates a Client row
  // whenever a lead's status flips to WON (see LeadViewSet.perform_update). ──
  const handleToggleClient = (id: number, makeClient: boolean) => {
  if (!makeClient) {
    // Moving back to Lead — no extra data needed
    const prevLeads = leads;
    setLeads(leads.map(l => l.id === id ? { ...l, status: 'LEAD' } : l));
    addToast('Moved back to Lead', 'success');
    patch(`/leads/${id}/`, { status: 'LEAD' })
      .then(() => fetchLeads())
      .catch(() => { setLeads(prevLeads); addToast('Failed to save to backend', 'error'); });
    return;
  }
  const lead = leads.find(l => l.id === id);
  if (!lead) return;
  openModal(
    <ClientConversionForm
      lead={lead}
    onSubmit={(extra: { business_category: string; deal_title: string; deal_description: string; deal_amount: string; deal_date_from: string; deal_date_to: string; assigned_employee_ids: string[]; assigned_employee_names: string[]; }) => handleConfirmConvertToClient(id, extra)}
      onClose={closeModal}
    />,
    `Convert to Client: ${lead.name}`
  );
};

const handleConfirmConvertToClient = async (id: number, extra: {
  business_category: string; deal_title: string; deal_description: string;
  deal_amount: string; deal_date_from: string; deal_date_to: string;
  assigned_employee_ids: string[]; assigned_employee_names: string[];
}) => {
  const prevLeads = leads;
  setLeads(leads.map(l => l.id === id ? { ...l, status: 'WON' } : l));
  try {
    const { assigned_employee_names, ...backendPayload } = extra;
await patch(`/leads/${id}/`, { status: 'WON', ...backendPayload });
    addToast('Converted to Client!', 'success');
    fetchLeads();
    closeModal();
  } catch {
    setLeads(prevLeads);
    addToast('Failed to save client conversion to backend', 'error');
  }
};

  const handleAddFollowup = async (data: {
    lead: number | '';
    activityType: ActivityLog['activity_type'];
    title: string;
    description: string;
    date: string;
    time: string;
  }) => {
    const ok = validateRequired([
      { label: 'Lead', value: data.lead },
      { label: 'Activity Type', value: data.activityType },
      { label: 'Title', value: data.title },
      { label: 'Date', value: data.date },
      { label: 'Time', value: data.time },
    ]);
    if (!ok) return;
    try {
      await post(`/activities/`, {
        lead: data.lead,
        activity_type: data.activityType,
        title: data.title || null,
        description: data.description,
        scheduled_date: data.date || null,
        scheduled_time: data.time || null,
      });
      addToast('Follow-up logged successfully!', 'success');
      fetchActivities();
      closeModal();
    } catch (err: any) {
      let detail = '';
      try {
        const errJson = err?.response?.data;
        if (errJson) detail = Object.entries(errJson).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`).join(' | ');
      } catch { /* ignore */ }
      addToast(detail ? `Failed to save follow-up: ${detail}` : 'Failed to save follow-up to backend', 'error');
    }
  };

  const handleUpdateActivity = async (id: number, data: Partial<ActivityLog>, opts?: { silent?: boolean }) => {
    const prev = activities;
    setActivities(activities.map(a => a.id === id ? { ...a, ...data } : a));
    try {
      await patch(`/activities/${id}/`, data);
      if (!opts?.silent) addToast('Activity updated successfully!', 'success');
      closeModal();
    } catch {
      setActivities(prev);
      addToast('Failed to update activity on backend', 'error');
    }
  };

  const handleDeleteActivity = async (id: number) => {
    if (!window.confirm('Delete this activity log? This cannot be undone.')) return;
    try {
      await del(`/activities/${id}/`);
      addToast('Activity deleted', 'success');
      setActivities(activities.filter(a => a.id !== id));
      closeModal();
    } catch {
      addToast('Error deleting activity on backend - check backend is running on port 8000', 'error');
    }
  };

  const handleDragStart = (id: number) => setDraggedActivityId(id);
  const handleDragEnd = () => { setDraggedActivityId(null); setDragOverColumn(null); };
  const handleDropOnColumn = (type: ActivityType) => {
    if (draggedActivityId == null) return;
    const activity = activities.find(a => a.id === draggedActivityId);
    if (activity && activity.activity_type !== type) { handleUpdateActivity(draggedActivityId, { activity_type: type }, { silent: true }); addToast(`Moved to ${ACTIVITY_TYPE_LABELS[type]}`, 'success'); }
    setDraggedActivityId(null); setDragOverColumn(null);
  };

  const handleAddTask = async () => {
    const ok = validateRequired([{ label: 'Lead', value: newTaskLead }, { label: 'Task Description', value: newTaskTitle }, { label: 'Due Date', value: newTaskDue }]);
    if (!ok) return;
    try {
      await post(`/lead-tasks/`, { lead: newTaskLead, title: newTaskTitle, due_date: newTaskDue });
      setNewTaskTitle('');
      setNewTaskDue('');
      addToast('Task created successfully!', 'success');
      fetchLeadTasks();
    } catch {
      addToast('Failed to save task to backend', 'error');
    }
  };

  const handleToggleTask = async (id: number) => {
    const target = tasks.find(t => t.id === id);
    if (!target) return;
    const newCompleted = !target.completed;
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: newCompleted } : t));
    try {
      await patch(`/lead-tasks/${id}/`, { completed: newCompleted });
    } catch {
      addToast('Failed to save task status to backend', 'error');
    }
  };

  const handleEditTask = async (id: number, data: Partial<LeadTask>) => {
    const ok = validateRequired([{ label: 'Task Description', value: data.title }, { label: 'Due Date', value: data.due_date }]);
    if (!ok) return;
    try {
      await patch(`/lead-tasks/${id}/`, data);
      addToast('Task updated successfully!', 'success');
      fetchLeadTasks();
      closeModal();
    } catch {
      addToast('Failed to update task on backend', 'error');
    }
  };

  const handleDeleteTask = async (id: number) => {
    if (!window.confirm('Delete this task? This cannot be undone.')) return;
    try {
      await del(`/lead-tasks/${id}/`);
      addToast('Task deleted', 'success');
      setTasks(tasks.filter(t => t.id !== id));
      closeModal();
    } catch {
      addToast('Error deleting task - check backend is running on port 8000', 'error');
    }
  };

  const handleAddDoc = async () => {
    if (!newDocFile) { addToast('Please select a file to upload', 'error'); return; }
    const ok = validateRequired([{ label: 'Lead', value: newDocLead }, { label: 'Type', value: newDocType }]);
    if (!ok) return;
    try {
      await post(`/lead-documents/`, { lead: newDocLead, name: newDocFile.name, doc_type: newDocType });
      setNewDocFile(null);
      addToast('Document attached successfully!', 'success');
      fetchDocs();
    } catch {
      addToast('Failed to save document to backend', 'error');
    }
  };

  const handleEditDoc = async (id: number, data: Partial<LeadDoc>) => {
    const ok = validateRequired([{ label: 'Document Name', value: data.name }, { label: 'Type', value: data.doc_type }]);
    if (!ok) return;
    try {
      await patch(`/lead-documents/${id}/`, data);
      addToast('Document updated successfully!', 'success');
      fetchDocs();
      closeModal();
    } catch {
      addToast('Failed to update document on backend', 'error');
    }
  };

  const handleDeleteDoc = async (id: number) => {
    if (!window.confirm('Delete this document? This cannot be undone.')) return;
    try {
      await del(`/lead-documents/${id}/`);
      addToast('Document deleted', 'success');
      setDocs(docs.filter(d => d.id !== id));
      closeModal();
    } catch {
      addToast('Error deleting document - check backend is running on port 8000', 'error');
    }
  };

  const handleSendDoc = (doc: LeadDoc, recipientEmail: string) => {
    if (!recipientEmail) { addToast('Please enter a recipient Gmail address', 'error'); return; }
    const subject = encodeURIComponent(`Document: ${doc.name}`);
    const body = encodeURIComponent(`Hi,\n\nSharing the document "${doc.name}" (${doc.doc_type}) related to ${doc.lead_name}.\n\nThanks.`);
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${recipientEmail}&su=${subject}&body=${body}`, '_blank');
    addToast('Opening Gmail compose window...', 'success');
    closeModal();
  };

  // ── NEW: Day-aware reminder logic — surfaces anything overdue, due today, or due tomorrow,
  // for ANY scheduled activity (not just type REMINDER), so the bell truly "reminds per day". ──
  const todayStr = new Date().toDateString();
  const tomorrowStr = new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString();

  const getUrgency = (dateStr: string | null): 'overdue' | 'today' | 'tomorrow' | 'later' | null => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    const dStr = d.toDateString();
    if (dStr === todayStr) return 'today';
    if (dStr === tomorrowStr) return 'tomorrow';
    if (d < new Date(todayStr)) return 'overdue';
    return 'later';
  };

  const reminderActivities = activities
    .filter(a => a.scheduled_date)
    .map(a => ({ ...a, _urgency: getUrgency(a.scheduled_date) }))
    .filter(a => a._urgency === 'overdue' || a._urgency === 'today' || a._urgency === 'tomorrow')
    .sort((a, b) => {
      const order = { overdue: 0, today: 1, tomorrow: 2 } as const;
      return (order[a._urgency as 'overdue' | 'today' | 'tomorrow'] ?? 3) - (order[b._urgency as 'overdue' | 'today' | 'tomorrow'] ?? 3);
    });

  const URGENCY_META: Record<string, { label: string; color: string }> = {
    overdue: { label: 'Overdue', color: '#EF4444' },
    today: { label: 'Today', color: '#F59E0B' },
    tomorrow: { label: 'Tomorrow', color: '#2563EB' },
  };

  const filteredLeads = leads.filter(l => {
    const query = search.toLowerCase();
    const matchesSearch = l.name.toLowerCase().includes(query) || l.company.toLowerCase().includes(query) || l.college.toLowerCase().includes(query) || l.contact_person.toLowerCase().includes(query);
    const matchesStatus = statusFilter ? l.status === statusFilter : true;
    const matchesPriority = priorityFilter ? l.priority === priorityFilter : true;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const filteredActivities = activities.filter(act => {
    const matchesCategory = activityCategoryFilter === 'ALL' ? true : act.activity_type === activityCategoryFilter;
    if (!matchesCategory) return false;
    const q = activitySearch.trim().toLowerCase();
    if (!q) return true;
    const haystack = `${act.lead_name || ''} ${act.title || ''} ${act.description || ''}`.toLowerCase();
    return haystack.includes(q);
  });

  const getPriorityColor = (priority: Lead['priority']) => {
    switch (priority) {
      case 'HIGH': return { bg: 'rgba(239,68,68,0.1)', color: '#EF4444' };
      case 'MEDIUM': return { bg: 'rgba(245,158,11,0.1)', color: '#F59E0B' };
      default: return { bg: 'rgba(16,185,129,0.1)', color: '#10B981' };
    }
  };

 const getStatusColor = (status: Lead['status']) => {
    switch (status) {
      case 'WON': return { bg: 'rgba(16,185,129,0.14)', color: '#10B981' };
      case 'LOST': return { bg: 'rgba(239,68,68,0.14)', color: '#EF4444' };
      case 'PROPOSAL_SENT': return { bg: 'rgba(37,99,235,0.14)', color: '#2563EB' };
      case 'CONTACTED': return { bg: 'rgba(245,158,11,0.14)', color: '#F59E0B' };
      default: return { bg: 'rgba(100,116,139,0.14)', color: '#94A3B8' };
    }
  };

  const iconBtnStyle: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer', padding: '5px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px',
    transition: 'background 0.15s',
  };

  const wonLeadsCount = leads.filter(l => l.status === 'WON').length;
  const conversionRate = leads.length > 0 ? (wonLeadsCount / leads.length) * 100 : 0;

  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingFollowupsCount = activities.filter(a => {
    if (!a.scheduled_date) return false;
    const d = new Date(a.scheduled_date);
    return d >= new Date(now.toDateString()) && d <= weekFromNow;
  }).length;

  const avgDealSize = leads.length > 0
    ? leads.reduce((sum, l) => sum + parseFloat(l.expected_deal_value || '0'), 0) / leads.length
    : 0;

  const funnelStages = [
    { label: 'New Leads', status: 'LEAD', color: '#2563EB', gradient: 'linear-gradient(90deg,#2563EB,#3B82F6)', icon: <Target size={16} /> },
    { label: 'Contacted', status: 'CONTACTED', color: '#7C3AED', gradient: 'linear-gradient(90deg,#7C3AED,#A78BFA)', icon: <Phone size={16} /> },
    { label: 'Proposal Sent', status: 'PROPOSAL_SENT', color: '#F59E0B', gradient: 'linear-gradient(90deg,#F59E0B,#FCD34D)', icon: <Mail size={16} /> },
    { label: 'Won', status: 'WON', color: '#10B981', gradient: 'linear-gradient(90deg,#10B981,#34D399)', icon: <Check size={16} /> },
    { label: 'Lost', status: 'LOST', color: '#EF4444', gradient: 'linear-gradient(90deg,#EF4444,#FCA5A5)', icon: <X size={16} /> },
  ];

  // Lead Contacts panel now driven by whether they've been toggled into Client (status WON)
  const contactClients = leads.filter(l => l.status === 'WON' && l.contact_person && l.contact_person.trim() !== '');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      <HoverZoomStyles />

      <div className={styles.header} style={{ borderBottom: 'none', paddingBottom: 0 }}>
        <div>
          <h1 className={styles.title}>Lead Management</h1>
          <p className={styles.subtitle}>Capture, nurture, and track pipeline follow-ups.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowNotifications(prev => !prev)}
              style={{ position: 'relative', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-main)', boxShadow: 'var(--shadow-sm)', transition: 'box-shadow 0.15s, transform 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
            >
              <Bell size={18} />
              {reminderActivities.length > 0 && (
                <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#EF4444', color: 'white', fontSize: '10px', fontWeight: 'bold', borderRadius: '999px', minWidth: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
                  {reminderActivities.length}
                </span>
              )}
            </button>
            {showNotifications && (
              <div style={{ position: 'absolute', top: '48px', right: 0, width: '320px', maxHeight: '400px', overflowY: 'auto', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px', boxShadow: 'var(--shadow-xl)', zIndex: 50, padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              
                  <span style={{ fontSize: '13px', fontWeight: 'bold' }}>🔔 Reminders</span>
                  <button onClick={() => setShowNotifications(false)} style={{ ...iconBtnStyle, color: 'var(--color-text-muted)' }}><X size={14} /></button>
                </div>
                {reminderActivities.length === 0 && <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem 0' }}>No reminders due today, tomorrow, or overdue.</p>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {reminderActivities.map(act => {
                    const urgencyMeta = URGENCY_META[(act as any)._urgency] || { label: '', color: 'var(--color-secondary)' };
                    return (
                      <div
                        key={act.id}
                        className="hz-card"
                        onClick={() => { setShowNotifications(false); openModal(<ActivityDetailForm activity={act} onUpdate={handleUpdateActivity} onDelete={handleDeleteActivity} onClose={closeModal} />, act.title || act.lead_name || 'Reminder'); }}
                        style={{ padding: '10px', background: `${urgencyMeta.color}0d`, borderRadius: '10px', border: `1px solid ${urgencyMeta.color}25` }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                              <span style={{ fontSize: '9.5px', fontWeight: 800, color: urgencyMeta.color, padding: '1px 7px', borderRadius: '999px', background: `${urgencyMeta.color}18`, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{urgencyMeta.label}</span>
                              <span style={{ fontSize: '10px', fontWeight: 700, color: ACTIVITY_TYPE_COLORS[act.activity_type] }}>{ACTIVITY_TYPE_LABELS[act.activity_type]}</span>
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: 'bold', display: 'block' }}>{act.lead_name}</span>
                            {act.title && <span style={{ fontSize: '11.5px', fontWeight: 600 }}>{act.title}</span>}
                          </div>
                          <div style={{ display: 'flex', gap: '2px' }} onClick={e => e.stopPropagation()}>
                            <button onClick={() => openModal(<ActivityEditForm activity={act} onSubmit={(data) => handleUpdateActivity(act.id, data)} />, 'Edit Reminder')} style={{ ...iconBtnStyle, color: 'var(--color-secondary)' }}><Pencil size={12} /></button>
                            <button onClick={() => handleDeleteActivity(act.id)} style={{ ...iconBtnStyle, color: '#EF4444' }}><Trash2 size={12} /></button>
                          </div>
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: '11.5px', color: 'var(--color-text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{act.description}</p>
                        {(act.scheduled_date || act.scheduled_time) && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                            {act.scheduled_time && <AnalogClock time={act.scheduled_time} size={18} color={urgencyMeta.color} />}
                            <span style={{ fontSize: '10.5px', color: urgencyMeta.color, fontWeight: 600 }}>📅 {act.scheduled_date} {act.scheduled_time && `• ${act.scheduled_time}`}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowChat(true)}
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-main)', boxShadow: 'var(--shadow-sm)' }}
          >
            <MessageCircle size={18} />
          </button>
        </div>
      </div>
      {/* ── Tab Navigation ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${TABS.length}, 1fr)`,
        gap: '6px',
        padding: '6px',
        background: 'var(--color-surface-elevated, var(--color-surface))',
        backdropFilter: 'blur(12px)',
        borderRadius: '16px',
        border: '1px solid var(--color-border)',
        boxShadow: '0 4px 16px rgba(37,99,235,0.07)',
      }}>
        {TABS.map(tab => {
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              className="crm-tab-btn"
              onClick={() => handleTabChange(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                padding: '10px 8px', borderRadius: '11px', border: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: isActive ? 700 : 500,
                whiteSpace: 'nowrap',
                background: isActive ? 'linear-gradient(135deg,#2563EB,#7C3AED)' : 'transparent',
                color: isActive ? '#fff' : 'var(--color-text-muted)',
                boxShadow: isActive ? '0 4px 14px rgba(37,99,235,0.35)' : 'none',
                transform: isActive ? 'translateY(-1px)' : 'translateY(0)',
              }}
            >
              <span style={{ opacity: isActive ? 1 : 0.65, display: 'flex' }}>{tab.icon}</span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════
          SUB-TAB: DASHBOARD
      ══════════════════════════════════════════ */}
      {subTab === 'dashboard' && (
        <div key={`dash-${tabAnimKey}`} className="tab-content-enter" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1rem' }}>
            <CRMStatCard label="Total Leads" value={leads.length} icon={<Users size={22} />} color="#2563EB" gradient="linear-gradient(135deg,#2563EB,#3B82F6)" />
            <CRMStatCard label="Avg Deal Size" value={Math.round(avgDealSize)} prefix="$" icon={<BarChart2 size={22} />} color="#7C3AED" gradient="linear-gradient(135deg,#7C3AED,#A78BFA)" />
            <CRMStatCard label="This Week's Follow-ups" value={upcomingFollowupsCount} icon={<CalendarClock size={22} />} color="#F59E0B" gradient="linear-gradient(135deg,#F59E0B,#FCD34D)" />
            <CRMStatCard label="Total Activities" value={activities.length + tasks.length} icon={<Activity size={22} />} color="#10B981" gradient="linear-gradient(135deg,#10B981,#34D399)" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1.25rem' }}>

            <div className="glass-panel hover-zoom" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-secondary)' }}>Signature · Live</span>
                  <h4 style={{ fontSize: '16px', fontWeight: 800, margin: '2px 0 0', letterSpacing: '-0.02em' }}>Lead Funnel</h4>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '3px 0 0' }}>Sourced, contacted, proposed &amp; won — {leads.length} total</p>
                </div>
                <div style={{ padding: '4px 12px', background: 'rgba(16,185,129,0.12)', borderRadius: '999px', fontSize: '11px', fontWeight: 700, color: '#10B981', display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                  On track
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: '9px', minWidth: '220px' }}>
                  {funnelStages.map(({ label, status, color, gradient }, idx) => {
                    const count = leads.filter(l => l.status === status).length;
                    const widthPct = 100 - idx * (48 / funnelStages.length);

                    return (
                      <div
                        key={status}
                        className="hover-zoom-sm"
                        onClick={() => { setStatusFilter(status); handleTabChange('leads'); }}
                        style={{
                          width: `${widthPct}%`,
                          background: gradient,
                          borderRadius: '10px',
                          padding: '11px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          color: '#fff',
                          boxShadow: `0 4px 14px ${color}35`,
                        }}
                      >
                        <span style={{ fontSize: '12.5px', fontWeight: 700 }}>{label}</span>
                        <span style={{ fontSize: '16px', fontWeight: 800 }}>{count.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flexShrink: 0, margin: '0 auto' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Conversion Rate</span>
                  <DonutStat percent={conversionRate} centerLabel="Won / Total" size={128} strokeWidth={13} gradientFrom="#7C3AED" gradientTo="#2563EB" />
                  <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', textAlign: 'center' }}>{wonLeadsCount} won of {leads.length} leads</span>
                </div>
              </div>
            </div>

            <div className="glass-panel hover-zoom" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>Recent Activities</h4>
                <button
                  onClick={() => handleTabChange('followups')}
                  className="hover-zoom-sm"
                  style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-secondary)', cursor: 'pointer', padding: '4px 10px', borderRadius: '999px', border: 'none', background: 'rgba(37,99,235,0.08)' }}
                >
                  View all
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '380px' }}>
                {activities.length === 0 && (
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem 0' }}>No activities yet.</p>
                )}
                {activities.slice(0, 8).map(act => (
                  <div
                    key={act.id}
                    className="hz-card"
                    onClick={() => openModal(<ActivityDetailForm activity={act} onUpdate={handleUpdateActivity} onDelete={handleDeleteActivity} onClose={closeModal} />, act.title || act.lead_name || 'Activity')}
                    style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '10px', background: `${ACTIVITY_TYPE_COLORS[act.activity_type]}08`, borderRadius: '10px', border: `1px solid ${ACTIVITY_TYPE_COLORS[act.activity_type]}18` }}
                  >
                    <div style={{ width: 30, height: 30, borderRadius: '8px', background: `${ACTIVITY_TYPE_COLORS[act.activity_type]}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: ACTIVITY_TYPE_COLORS[act.activity_type], flexShrink: 0 }}>
                      {ACTIVITY_TYPE_ICONS[act.activity_type]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--color-text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{act.lead_name}</span>
                        <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', flexShrink: 0 }}>{new Date(act.created_at).toLocaleDateString()}</span>
                      </div>
                      <span style={{ fontSize: '11px', color: ACTIVITY_TYPE_COLORS[act.activity_type], fontWeight: 600 }}>{ACTIVITY_TYPE_LABELS[act.activity_type]}</span>
                      {act.title && <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{act.title}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="glass-panel hover-zoom" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>All Activities</h3>
              <span style={{ fontSize: '12px', padding: '3px 12px', borderRadius: '999px', background: 'rgba(37,99,235,0.08)', fontWeight: 700, color: 'var(--color-secondary)' }}>{filteredActivities.length + tasks.length} items</span>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <div style={{ flex: '1 1 220px', position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search activities (lead, title, notes)..."
                  value={activitySearch}
                  onChange={e => setActivitySearch(e.target.value)}
                  style={{ ...fieldInputStyle, paddingLeft: '32px' }}
                />
              </div>
              <select
                value={activityCategoryFilter}
                onChange={e => setActivityCategoryFilter(e.target.value as 'ALL' | ActivityType)}
                style={{
                  ...fieldInputStyle, width: 'auto', minWidth: '180px',
                  color: activityCategoryFilter === 'ALL' ? 'var(--color-text-main)' : ACTIVITY_TYPE_COLORS[activityCategoryFilter as ActivityType],
                  fontWeight: 700,
                }}
              >
                <option value="ALL">📂 All Categories</option>
                {ACTIVITY_TYPES.map(t => (
                  <option key={t} value={t}>{ACTIVITY_TYPE_EMOJI[t]} {ACTIVITY_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>

            {activities.length === 0 && tasks.length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem 0' }}>Nothing logged yet. Use "+ Add Log Activity" in Follow-ups to log your first entry.</p>
            ) : filteredActivities.length === 0 && (activityCategoryFilter !== 'ALL' || activitySearch) ? (
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem 0' }}>No activities match your search/filter.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '10px', maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
                {filteredActivities.map(act => {
                  const c = ACTIVITY_TYPE_COLORS[act.activity_type];
                  return (
                    <div
                      key={`act-${act.id}`}
                      draggable
                      onDragStart={() => handleDragStart(act.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => openModal(<ActivityDetailForm activity={act} onUpdate={handleUpdateActivity} onDelete={handleDeleteActivity} onClose={closeModal} />, act.title || act.lead_name || 'Activity')}
                      className="glass-panel hz-card"
                      style={{ padding: '12px', borderRadius: '10px', border: `1.5px solid ${c}22`, opacity: draggedActivityId === act.id ? 0.4 : 1, display: 'flex', flexDirection: 'column', gap: '5px' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <GripVertical size={12} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} onClick={e => e.stopPropagation()} />
                        <div style={{ width: 20, height: 20, borderRadius: '6px', background: `${c}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c, flexShrink: 0 }}>{ACTIVITY_TYPE_ICONS[act.activity_type]}</div>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: c, flexShrink: 0 }}>{ACTIVITY_TYPE_LABELS[act.activity_type]}</span>
                        <span style={{ fontWeight: 700, fontSize: '12px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{act.lead_name}</span>
                      </div>
                      {act.title && <span style={{ fontSize: '12px', fontWeight: 600 }}>{act.title}</span>}
                      <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--color-text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{act.description}</p>
                      {(act.scheduled_date || act.scheduled_time) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {act.scheduled_time && <AnalogClock time={act.scheduled_time} size={20} color={c} />}
                          <span style={{ fontSize: '10.5px', color: c }}>📅 {act.scheduled_date}{act.scheduled_time && ` • ${act.scheduled_time}`}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                        <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{new Date(act.created_at).toLocaleDateString()}</span>
                        <div style={{ display: 'flex', gap: '2px' }} onClick={e => e.stopPropagation()}>
                          <button onClick={() => openModal(<ActivityEditForm activity={act} onSubmit={data => handleUpdateActivity(act.id, data)} />, 'Edit Activity')} style={{ ...iconBtnStyle, color: 'var(--color-secondary)' }}><Pencil size={12} /></button>
                          <button onClick={() => handleDeleteActivity(act.id)} style={{ ...iconBtnStyle, color: '#EF4444' }}><Trash2 size={12} /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {activityCategoryFilter === 'ALL' && !activitySearch && tasks.map(task => (
                  <div
                    key={`task-${task.id}`}
                    className="glass-panel hz-card"
                    onClick={() => openModal(<TaskDetailForm task={task} onUpdate={handleEditTask} onDelete={handleDeleteTask} onClose={closeModal} onToggle={handleToggleTask} />, task.title || task.lead_name || 'Task')}
                    style={{ padding: '12px', borderRadius: '10px', border: '1.5px solid rgba(16,185,129,0.2)', display: 'flex', flexDirection: 'column', gap: '5px' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button onClick={e => { e.stopPropagation(); handleToggleTask(task.id); }} style={{ width: 18, height: 18, borderRadius: '5px', border: '2px solid #10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', background: task.completed ? '#10B981' : 'transparent', cursor: 'pointer', flexShrink: 0 }}>
                        {task.completed && <Check size={10} color="white" />}
                      </button>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#10B981', flexShrink: 0 }}>Task</span>
                      <span style={{ fontWeight: 700, fontSize: '12px', flex: 1, textDecoration: task.completed ? 'line-through' : 'none', color: task.completed ? 'var(--color-text-muted)' : 'var(--color-text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.lead_name}</span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 600, textDecoration: task.completed ? 'line-through' : 'none' }}>{task.title}</span>
                    <span style={{ fontSize: '10.5px', color: '#10B981' }}>📅 Due {task.due_date}</span>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => openModal(<TaskEditForm task={task} onSubmit={data => handleEditTask(task.id, data)} />, 'Edit Task')} style={{ ...iconBtnStyle, color: 'var(--color-secondary)' }}><Pencil size={12} /></button>
                      <button onClick={() => handleDeleteTask(task.id)} style={{ ...iconBtnStyle, color: '#EF4444' }}><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          SUB-TAB: LEADS
      ══════════════════════════════════════════ */}
      {subTab === 'leads' && (
        <div key={`leads-${tabAnimKey}`} className="tab-content-enter" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input type="text" placeholder="Search leads, institutions, or contacts..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '10px 10px 10px 36px', borderRadius: '10px', border: '1.5px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-main)', fontSize: '13.5px' }} />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...fieldInputStyle, width: 'auto', minWidth: '140px' }}>
              <option value="">All Statuses</option>
              <option value="LEAD">Lead</option>
              <option value="CONTACTED">Contacted</option>
              <option value="PROPOSAL_SENT">Proposal Sent</option>
              <option value="WON">Won</option>
              <option value="LOST">Lost</option>
            </select>
            <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} style={{ ...fieldInputStyle, width: 'auto', minWidth: '140px' }}>
              <option value="">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
            <div style={{ display: 'flex', background: 'var(--color-bg)', border: '1.5px solid var(--color-border)', borderRadius: '10px', padding: '3px' }}>
              {[{ id: 'grid', icon: <List size={14} />, label: 'List' }, { id: 'kanban', icon: <LayoutGrid size={14} />, label: 'Kanban' }].map(v => (
                <button key={v.id} onClick={() => setView(v.id as 'grid' | 'kanban')}
                  style={{ padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '7px', background: view === v.id ? 'var(--color-surface-elevated, var(--color-surface))' : 'transparent', color: view === v.id ? 'var(--color-text-main)' : 'var(--color-text-muted)', fontSize: '13px', border: 'none', cursor: 'pointer', fontWeight: view === v.id ? 600 : 400, boxShadow: view === v.id ? 'var(--shadow-sm)' : 'none', transition: 'all 0.15s' }}>
                  {v.icon} {v.label}
                </button>
              ))}
            </div>
            <button className={styles.btnPrimary} onClick={() => openModal(<LeadForm onSubmit={handleCreateLead} onClose={closeModal} />, 'Add New Lead')}>
              <Plus size={16} /> New Lead
            </button>
          </div>

          {view === 'grid' ? (
            <div className="glass-panel" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid var(--color-border)' }}>
                    {['Institution & Lead', 'Contact Person', 'Value', 'Priority', 'Status', 'Client', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map(lead => (
                    <tr key={lead.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.12s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(37,99,235,0.025)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--color-text-main)', display: 'block', fontSize: '13.5px' }}>{lead.name}</span>
                        <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>{lead.company || lead.college}</span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontWeight: 600, display: 'block', fontSize: '13px' }}>{lead.contact_person}</span>
                        <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>{lead.designation}</span>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 800, fontSize: '14px', color: 'var(--color-secondary)' }}>${parseFloat(lead.expected_deal_value).toLocaleString()}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, ...getPriorityColor(lead.priority) }}>{lead.priority}</span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, ...getStatusColor(lead.status) }}>{lead.status.replace('_', ' ')}</span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={e => e.stopPropagation()}>
                          <ToggleSwitch
                            checked={lead.status === 'WON'}
                            onChange={(val) => handleToggleClient(lead.id, val)}
                          />
                          <span style={{ fontSize: '11px', fontWeight: 700, color: lead.status === 'WON' ? '#10B981' : 'var(--color-text-muted)' }}>
                            {lead.status === 'WON' ? 'Client' : 'Lead'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <button onClick={() => openModal(<LeadDetailsView lead={lead} onUpdateStatus={handleUpdateStatus} onUpdatePriority={handleUpdatePriority} />, `Lead: ${lead.name}`)}
                            style={{ background: 'rgba(37,99,235,0.1)', border: 'none', padding: '6px 12px', borderRadius: '8px', color: 'var(--color-secondary)', fontSize: '12px', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Eye size={12} /> View
                          </button>
                          <button onClick={() => openModal(<LeadForm onSubmit={(data) => handleEditLead(lead.id, data)} onClose={closeModal} initialData={lead} isEdit />, `Edit: ${lead.name}`)} style={{ ...iconBtnStyle, color: 'var(--color-secondary)' }}><Pencil size={14} /></button>
                          <button onClick={() => handleDeleteLead(lead.id)} style={{ ...iconBtnStyle, color: '#EF4444' }}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '1rem', overflowX: 'auto', minWidth: '1000px' }}>
              {(['LEAD', 'CONTACTED', 'PROPOSAL_SENT', 'WON', 'LOST'] as const).map(column => {
                const stageLeads = filteredLeads.filter(l => l.status === column);
                const stageColor = funnelStages.find(f => f.status === column)?.color || '#2563EB';
                return (
                  <div key={column} style={{ background: `${stageColor}06`, borderRadius: '14px', padding: '1rem', border: `1.5px solid ${stageColor}18`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `2px solid ${stageColor}30`, paddingBottom: '10px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: stageColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{column.replace('_', ' ')}</span>
                      <span style={{ fontSize: '11px', padding: '2px 9px', borderRadius: '999px', background: `${stageColor}18`, fontWeight: 800, color: stageColor }}>{stageLeads.length}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '500px' }}>
                      {stageLeads.map(lead => (
                        <div key={lead.id} className="glass-panel card-zoom" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div onClick={() => openModal(<LeadDetailsView lead={lead} onUpdateStatus={handleUpdateStatus} onUpdatePriority={handleUpdatePriority} />, `Lead: ${lead.name}`)}>
                            <span style={{ fontWeight: 800, fontSize: '13px', display: 'block' }}>{lead.name}</span>
                            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{lead.contact_person}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 800, color: stageColor }}>${parseFloat(lead.expected_deal_value).toLocaleString()}</span>
                            <span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 700, ...getPriorityColor(lead.priority) }}>{lead.priority}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '6px', marginTop: '2px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={e => e.stopPropagation()}>
                              <ToggleSwitch size="sm" checked={lead.status === 'WON'} onChange={(val) => handleToggleClient(lead.id, val)} />
                              <span style={{ fontSize: '10px', fontWeight: 700, color: lead.status === 'WON' ? '#10B981' : 'var(--color-text-muted)' }}>{lead.status === 'WON' ? 'Client' : ''}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button onClick={e => { e.stopPropagation(); openModal(<LeadForm onSubmit={d => handleEditLead(lead.id, d)} onClose={closeModal} initialData={lead} isEdit />, `Edit: ${lead.name}`); }} style={{ ...iconBtnStyle, color: 'var(--color-secondary)' }}><Pencil size={12} /></button>
                              <button onClick={e => { e.stopPropagation(); handleDeleteLead(lead.id); }} style={{ ...iconBtnStyle, color: '#EF4444' }}><Trash2 size={12} /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          SUB-TAB: TASKS
      ══════════════════════════════════════════ */}
      {subTab === 'tasks' && (
        <div key={`tasks-${tabAnimKey}`} className="tab-content-enter" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '1rem' }}>Lead Tasks Checklist</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {tasks.map(task => (
                <div
                  key={task.id}
                  className="hz-card"
                  onClick={() => openModal(<TaskDetailForm task={task} onUpdate={handleEditTask} onDelete={handleDeleteTask} onClose={closeModal} onToggle={handleToggleTask} />, task.title || task.lead_name || 'Task')}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: task.completed ? 'rgba(16,185,129,0.04)' : 'rgba(37,99,235,0.03)', borderRadius: '10px', border: `1px solid ${task.completed ? 'rgba(16,185,129,0.15)' : 'var(--color-border)'}` }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={e => { e.stopPropagation(); handleToggleTask(task.id); }} style={{ width: 22, height: 22, borderRadius: '6px', border: '2px solid var(--color-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: task.completed ? 'var(--color-secondary)' : 'transparent', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' }}>
                      {task.completed && <Check size={13} color="white" />}
                    </button>
                    <span style={{ fontSize: '13.5px', textDecoration: task.completed ? 'line-through' : 'none', color: task.completed ? 'var(--color-text-muted)' : 'var(--color-text-main)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '380px', display: 'inline-block' }}>
                      {task.title} <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 400 }}>({task.lead_name})</span>
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }} onClick={e => e.stopPropagation()}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Due: {task.due_date}</span>
                    <button onClick={() => openModal(<TaskEditForm task={task} onSubmit={data => handleEditTask(task.id, data)} />, 'Edit Task')} style={{ ...iconBtnStyle, color: 'var(--color-secondary)' }}><Pencil size={14} /></button>
                    <button onClick={() => handleDeleteTask(task.id)} style={{ ...iconBtnStyle, color: '#EF4444' }}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="glass-panel" style={{ padding: '1.5rem', height: 'fit-content' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '1rem' }}>Add Task</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div><label style={fieldLabelStyle}>Lead<Req /></label><select value={newTaskLead} onChange={e => setNewTaskLead(Number(e.target.value))} style={fieldInputStyle}>{leads.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
              <div><label style={fieldLabelStyle}>Task Description<Req /></label><input type="text" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="Send customized syllabus" style={fieldInputStyle} /></div>
              <div><label style={fieldLabelStyle}>Due Date<Req /></label><input type="date" value={newTaskDue} onChange={e => setNewTaskDue(e.target.value)} style={fieldInputStyle} /></div>
              <button onClick={handleAddTask} className={styles.btnPrimary}>Add Task</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          SUB-TAB: FOLLOW-UPS
      ══════════════════════════════════════════ */}
      {subTab === 'followups' && (
        <div key={`followups-${tabAnimKey}`} className="tab-content-enter" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>📋 Follow-up Activities</h3>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>Log calls, meetings, emails, and more against a lead.</p>
            </div>
            <button
              className={styles.btnPrimary}
              onClick={() => openModal(
                <LogActivityForm
                  leads={leads}
                  defaultLead={selectedLeadForActivity}
                  onSubmit={handleAddFollowup}
                />,
                'Add Log Activity'
              )}
            >
              <Plus size={16} /> Add Log Activity
            </button>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Activity Board</h3>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Drag cards to change type · scroll →</span>
            </div>
            <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
              {BOARD_COLUMNS.map(type => {
                const c = ACTIVITY_TYPE_COLORS[type];
                const columnActivities = activities.filter(a => a.activity_type === type);
                const isOver = dragOverColumn === type;
                return (
                  <div key={type}
                    onDragOver={e => { e.preventDefault(); setDragOverColumn(type); }}
                    onDragLeave={() => setDragOverColumn(prev => prev === type ? null : prev)}
                    onDrop={e => { e.preventDefault(); handleDropOnColumn(type); }}
                    style={{ background: isOver ? `${c}08` : `${c}05`, border: isOver ? `2px dashed ${c}` : `2px dashed ${c}22`, borderRadius: '14px', padding: '12px', minHeight: '160px', transition: 'all 0.15s', width: '260px', flex: '0 0 260px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: `2px solid ${c}30` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: 24, height: 24, borderRadius: '6px', background: `${c}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c }}>{ACTIVITY_TYPE_ICONS[type]}</div>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: c }}>{ACTIVITY_TYPE_LABELS[type]}</span>
                      </div>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', background: `${c}18`, fontWeight: 800, color: c }}>{columnActivities.length}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '480px' }}>
                      {columnActivities.length === 0 && <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem 0' }}>Drop here</p>}
                      {columnActivities.map(act => (
                        <div
                          key={act.id}
                          draggable
                          onDragStart={() => handleDragStart(act.id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => openModal(<ActivityDetailForm activity={act} onUpdate={handleUpdateActivity} onDelete={handleDeleteActivity} onClose={closeModal} />, act.title || act.lead_name || 'Activity')}
                          className="glass-panel hz-card"
                          style={{ padding: '10px', borderRadius: '8px', border: `1px solid ${c}18`, opacity: draggedActivityId === act.id ? 0.4 : 1, display: 'flex', flexDirection: 'column', gap: '4px' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <GripVertical size={12} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} onClick={e => e.stopPropagation()} />
                            <span style={{ fontWeight: 700, fontSize: '12.5px', flex: 1 }}>{act.lead_name}</span>
                          </div>
                          {act.title && <span style={{ fontSize: '12px', fontWeight: 600 }}>{act.title}</span>}
                          <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--color-text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{act.description}</p>
                          {(act.scheduled_date || act.scheduled_time) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {act.scheduled_time && <AnalogClock time={act.scheduled_time} size={18} color={c} />}
                              <span style={{ fontSize: '10.5px', color: c }}>📅 {act.scheduled_date}{act.scheduled_time && ` • ${act.scheduled_time}`}</span>
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                            <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{new Date(act.created_at).toLocaleDateString()}</span>
                            <div style={{ display: 'flex', gap: '2px' }} onClick={e => e.stopPropagation()}>
                              <button onClick={() => openModal(<ActivityEditForm activity={act} onSubmit={data => handleUpdateActivity(act.id, data)} />, 'Edit Activity')} style={{ ...iconBtnStyle, color: 'var(--color-secondary)' }}><Pencil size={12} /></button>
                              <button onClick={() => handleDeleteActivity(act.id)} style={{ ...iconBtnStyle, color: '#EF4444' }}><Trash2 size={12} /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          SUB-TAB: DOCUMENTS
      ══════════════════════════════════════════ */}
      {subTab === 'documents' && (
        <div key={`documents-${tabAnimKey}`} className="tab-content-enter" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '1rem' }}>Attached Documents</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {docs.map(doc => (
                <div key={doc.id} className="card-zoom" style={{ border: '1.5px solid var(--color-border)', padding: '1rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--color-surface)', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-secondary)', flexShrink: 0 }}>
                      <Paperclip size={18} />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={doc.name}>{doc.name}</span>
                    <button
                      onClick={() => openModal(<DocSendForm doc={doc} onSend={handleSendDoc} />, `Send: ${doc.name}`)}
                      style={{ background: 'rgba(37,99,235,0.1)', border: 'none', borderRadius: '8px', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-secondary)', cursor: 'pointer', flexShrink: 0 }}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    <span style={{ display: 'block' }}>Lead: {doc.lead_name}</span>
                    <span style={{ display: 'block' }}>Type: {doc.doc_type} · {new Date(doc.uploaded_at).toLocaleDateString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => openModal(<DocEditForm doc={doc} onSubmit={data => handleEditDoc(doc.id, data)} />, 'Edit Document')} style={{ ...iconBtnStyle, color: 'var(--color-secondary)' }}><Pencil size={14} /></button>
                      <button onClick={() => handleDeleteDoc(doc.id)} style={{ ...iconBtnStyle, color: '#EF4444' }}><Trash2 size={14} /></button>
                    </div>
                    <button onClick={() => addToast('Downloading file...', 'info')} style={{ background: 'rgba(37,99,235,0.08)', border: 'none', color: 'var(--color-secondary)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', padding: '4px 12px', borderRadius: '999px' }}>Download</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="glass-panel" style={{ padding: '1.5rem', height: 'fit-content' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '1rem' }}>Attach Document</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div><label style={fieldLabelStyle}>Lead<Req /></label><select value={newDocLead} onChange={e => setNewDocLead(Number(e.target.value))} style={fieldInputStyle}>{leads.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>

              <div>
                <label style={fieldLabelStyle}>File<Req /></label>
                <label style={{ ...fieldInputStyle, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: newDocFile ? 'var(--color-text-main)' : 'var(--color-text-muted)' }}>
                  <Upload size={15} style={{ flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{newDocFile ? newDocFile.name : 'Choose file from your computer...'}</span>
                  <input
                    type="file"
                    onChange={e => setNewDocFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              <div><label style={fieldLabelStyle}>Type<Req /></label>
                <select value={newDocType} onChange={e => setNewDocType(e.target.value)} style={fieldInputStyle}>
                  <option value="Requirement">Requirement Doc</option>
                  <option value="Visiting Card">Visiting Card</option>
                  <option value="Proposal">Proposal Draft</option>
                  <option value="Other">Other Attachment</option>
                </select>
              </div>
              <button onClick={handleAddDoc} className={styles.btnPrimary}>Upload Doc</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          SUB-TAB: CLIENTS
      ══════════════════════════════════════════ */}
      {subTab === 'clients' && (
        <div key={`clients-${tabAnimKey}`} className="tab-content-enter" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {contactClients.length > 0 && (
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                <UserPlus size={18} style={{ color: 'var(--color-secondary)' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Converted Clients (from Leads)</h3>
                <span style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '999px', background: 'rgba(37,99,235,0.08)', fontWeight: 700, color: 'var(--color-secondary)' }}>{contactClients.length}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: '10px' }}>
                {contactClients.map(lead => (
  <div key={lead.id} className="glass-panel card-zoom" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
    <span style={{ fontWeight: 800, fontSize: '13.5px' }}>{lead.contact_person}</span>
    <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>{lead.designation}</span>
    <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>{lead.company || lead.college}</span>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px', fontSize: '11px', color: 'var(--color-secondary)' }}>
      {lead.email && <span>{lead.email}</span>}
      {lead.phone && <span>{lead.phone}</span>}
    </div>
    <div style={{ display: 'flex', gap: '6px', marginTop: '8px', borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}>
      <button
  onClick={() => openModal(
    <LeadClientDetailView
      lead={lead}
      onEdit={(data) => handleEditLead(lead.id, data)}
      onDelete={() => handleDeleteLead(lead.id)}
      onClose={closeModal}
    />,
    `Client: ${lead.contact_person}`
  )}
  style={{ padding: '8px 14px', borderRadius: '10px', border: 'none', background: 'rgba(37,99,235,0.1)', color: 'var(--color-secondary)', fontWeight: 700, cursor: 'pointer' }}
>
  View Details
</button>
    </div>
  </div>
))}
              </div>
            </div>
          )}
          <ClientManagement />
        </div>
      )}
      {showChat && <ClientChatPanel onClose={() => setShowChat(false)} />}
    </div>
  );
};

// ── Lead→Client detail view with Edit + Delete ────────────────────────────
const LeadClientDetailView = ({
  lead, onEdit, onDelete, onClose,
}: {
  lead: Lead;
  onEdit: (data: Partial<Lead>) => void;
  onDelete: () => void;
  onClose: () => void;
}) => {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <LeadForm
        onSubmit={(data) => { onEdit(data); setEditing(false); }}
        onClose={() => setEditing(false)}
        initialData={lead}
        isEdit
      />
    );
  }

  const [employeeMap, setEmployeeMap] = useState<Map<string, string>>(new Map());

useEffect(() => {
  get<Array<{ id: string; full_name: string }>>('/employees/simple-dropdown/')
    .then(data => setEmployeeMap(new Map(data.map(e => [e.id, e.full_name]))))
    .catch(() => {});
}, []);

const rawIds: string[] =
  (lead as any).assigned_employee_ids ||
  (Array.isArray((lead as any).assigned_to) ? (lead as any).assigned_to : []);

const assignedNames: string =
  rawIds.length > 0
    ? rawIds.map((id: string) => employeeMap.get(id) || id).join(', ')
    : (lead as any).assigned_employee_names?.join(', ') ||
      (lead as any).assigned_to_name ||
      '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: '340px', maxWidth: '520px' }}>
      <div style={{ padding: '12px', background: 'rgba(16,185,129,0.06)', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.2)' }}>
        <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#10B981' }}>Converted Client</span>
        <h3 style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: 800 }}>{lead.name}</h3>
        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{lead.company || lead.college}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
        {[
          { label: 'Contact Person', val: lead.contact_person },
          { label: 'Designation', val: lead.designation || '—' },
          { label: 'Email', val: lead.email || '—' },
          { label: 'Phone', val: lead.phone || '—' },
        ].map(({ label, val }) => (
          <div key={label}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{label}</span>
            <p style={{ margin: '2px 0', fontWeight: 600, color: label === 'Email' ? 'var(--color-secondary)' : 'var(--color-text-main)' }}>{val}</p>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <span style={{ fontSize: '12px', fontWeight: 800 }}>Deal Details</span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
          {[
            { label: 'Business Category', val: (lead as any).business_category || '—' },
            { label: 'Deal Title', val: (lead as any).deal_title || '—' },
            { label: 'Final Amount', val: (lead as any).deal_amount ? `$${parseFloat((lead as any).deal_amount).toLocaleString()}` : '—', green: true },
            { label: 'Assigned To', val: assignedNames },
            { label: 'Date From', val: (lead as any).deal_date_from || '—' },
            { label: 'Date To', val: (lead as any).deal_date_to || '—' },
          ].map(({ label, val, green }) => (
            <div key={label}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{label}</span>
              <p style={{ margin: '2px 0', fontWeight: green ? 800 : 600, color: green ? '#10B981' : 'var(--color-text-main)' }}>{val}</p>
            </div>
          ))}
        </div>
        {(lead as any).deal_description && (
          <div>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Description</span>
            <p style={{ margin: '4px 0', fontSize: '13px', lineHeight: 1.5 }}>{(lead as any).deal_description}</p>
          </div>
        )}
      </div>

      {lead.training_requirement && (
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Training Requirement</span>
          <p style={{ margin: '4px 0', fontSize: '13px', lineHeight: 1.5 }}>{lead.training_requirement}</p>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
        <button
          onClick={() => setEditing(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 16px', background: 'linear-gradient(135deg,#2563EB,#7C3AED)', color: 'white', border: 'none', borderRadius: '9px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
        >
          <Pencil size={13} /> Edit Lead
        </button>
        <button
          onClick={onDelete}
          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 14px', borderRadius: '9px', border: '1px solid #EF444444', background: '#EF44441A', color: '#EF4444', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
        >
          <Trash2 size={13} /> Delete
        </button>
      </div>
    </div>
  );
};


// ── Lead Form ─────────────────────────────────────────────────────────────
const LeadForm = ({ onSubmit, onClose, initialData, isEdit }: { onSubmit: (data: Partial<Lead>) => void; onClose: () => void; initialData?: Partial<Lead>; isEdit?: boolean }) => {
  const { addToast } = useToast();
  const [formData, setFormData] = useState<Partial<Lead>>(initialData ?? {
    name: '', company: '', college: '', contact_person: '', designation: '',
    phone: '', whatsapp: '', email: '', location: '', lead_source: 'Website',
    status: 'LEAD', priority: 'MEDIUM', remarks: '', expected_deal_value: '0.00',
    training_requirement: '', follow_up_date: '', next_follow_up: '', notes: ''
  });

  const fieldInputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-main)', fontSize: '13.5px' };
  const fieldLabelStyle: React.CSSProperties = { display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: 600, color: 'var(--color-text-muted)' };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const required = [
      { label: 'Lead/Institution Name', value: formData.name },
      { label: 'Contact Person', value: formData.contact_person },
      { label: 'Designation', value: formData.designation },
      { label: 'Phone', value: formData.phone },
      { label: 'WhatsApp', value: formData.whatsapp },
      { label: 'Email', value: formData.email },
      { label: 'Expected Deal Value', value: formData.expected_deal_value },
      { label: 'Next Follow-up Date', value: formData.next_follow_up },
    ];
    const missing = required.filter(f => !f.value || f.value === '').map(f => f.label);
    if (missing.length > 0) { addToast(`Please fill: ${missing.join(', ')}`, 'error'); return; }
    onSubmit({ ...formData, follow_up_date: formData.follow_up_date || null, next_follow_up: formData.next_follow_up || null, last_contact_date: formData.last_contact_date || null });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {[{ label: 'Lead/Institution Name', key: 'name', type: 'text' }, { label: 'Company', key: 'company', type: 'text' }, { label: 'College / Department', key: 'college', type: 'text' }, { label: 'Contact Person', key: 'contact_person', type: 'text' }, { label: 'Designation', key: 'designation', type: 'text' }, { label: 'Phone', key: 'phone', type: 'text' }, { label: 'WhatsApp', key: 'whatsapp', type: 'text' }, { label: 'Email', key: 'email', type: 'email' }].map(({ label, key, type }) => (
          <div key={key}><label style={fieldLabelStyle}>{label}<Req /></label><input type={type} value={(formData as any)[key] || ''} onChange={e => setFormData({ ...formData, [key]: e.target.value })} style={fieldInputStyle} /></div>
        ))}
        <div><label style={fieldLabelStyle}>Expected Deal Value ($)<Req /></label><input type="number" step="0.01" value={formData.expected_deal_value} onChange={e => setFormData({ ...formData, expected_deal_value: e.target.value })} style={fieldInputStyle} /></div>
        <div><label style={fieldLabelStyle}>Next Follow-up Date<Req /></label><input type="date" value={formData.next_follow_up || ''} onChange={e => setFormData({ ...formData, next_follow_up: e.target.value })} style={fieldInputStyle} /></div>
      </div>
      <div><label style={fieldLabelStyle}>Training Requirements</label><textarea rows={3} value={formData.training_requirement} onChange={e => setFormData({ ...formData, training_requirement: e.target.value })} style={{ ...fieldInputStyle, resize: 'vertical' }} /></div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
        <button type="button" onClick={onClose} style={{ padding: '9px 18px', color: 'var(--color-text-muted)', fontWeight: 600, cursor: 'pointer', borderRadius: '10px', border: '1.5px solid var(--color-border)', background: 'transparent' }}>Cancel</button>
        <button type="submit" style={{ padding: '9px 18px', background: 'linear-gradient(135deg,#2563EB,#7C3AED)', color: 'white', borderRadius: '10px', fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}>{isEdit ? 'Save Changes' : 'Save Lead'}</button>
      </div>
    </form>
  );
};

// ── Log Activity Form ──
const LogActivityForm = ({
  leads, defaultLead, onSubmit,
}: {
  leads: Lead[];
  defaultLead: number | '';
  onSubmit: (data: {
    lead: number | '';
    activityType: ActivityLog['activity_type'];
    title: string;
    description: string;
    date: string;
    time: string;
  }) => void;
}) => {
  const [selectedLead, setSelectedLead] = useState<number | ''>(defaultLead);
  const [activityType, setActivityType] = useState<ActivityLog['activity_type']>('CALL');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const fInputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-main)', fontSize: '13.5px' };
  const fLabelStyle: React.CSSProperties = { display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: 600, color: 'var(--color-text-muted)' };

  const handleSubmit = () => {
    onSubmit({ lead: selectedLead, activityType, title, description, date, time });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '340px' }}>
      <div>
        <label style={fLabelStyle}>Lead<Req /></label>
        <select value={selectedLead} onChange={e => setSelectedLead(Number(e.target.value))} style={fInputStyle}>
          {leads.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>
      <div>
        <label style={fLabelStyle}>Activity Type<Req /></label>
        <select
          value={activityType}
          onChange={e => setActivityType(e.target.value as ActivityLog['activity_type'])}
          style={{ ...fInputStyle, color: ACTIVITY_TYPE_COLORS[activityType], fontWeight: 700 }}
        >
          {ACTIVITY_TYPES.map(t => (
            <option key={t} value={t}>{ACTIVITY_TYPE_EMOJI[t]} {ACTIVITY_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>
      <div>
        <label style={fLabelStyle}>Title<Req /></label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Follow-up call with HOD"
          style={fInputStyle}
          autoFocus
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div><label style={fLabelStyle}>Date<Req /></label><input type="date" value={date} onChange={e => setDate(e.target.value)} style={fInputStyle} /></div>
        <div><label style={fLabelStyle}>Time<Req /></label><TimeField value={time} onChange={setTime} color={ACTIVITY_TYPE_COLORS[activityType]} /></div>
      </div>
      <div>
        <label style={fLabelStyle}>Description</label>
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="e.g. Discussed pricing details..."
          style={fInputStyle}
        />
      </div>
      <button onClick={handleSubmit} style={{ padding: '10px', background: 'linear-gradient(135deg,#2563EB,#7C3AED)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>Log Activity</button>
    </div>
  );
};

// ── Activity Edit Form ─────────────────────────────────────────────────────
const ActivityEditForm = ({ activity, onSubmit }: { activity: ActivityLog; onSubmit: (data: Partial<ActivityLog>) => void }) => {
  const { addToast } = useToast();
  const [activityType, setActivityType] = useState<ActivityLog['activity_type']>(activity.activity_type);
  const [title, setTitle] = useState(activity.title || '');
  const [description, setDescription] = useState(activity.description || '');
  const [scheduledDate, setScheduledDate] = useState(activity.scheduled_date || '');
  const [scheduledTime, setScheduledTime] = useState(activity.scheduled_time || '');
  const fInputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-main)', fontSize: '13.5px' };
  const fLabelStyle: React.CSSProperties = { display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: 600, color: 'var(--color-text-muted)' };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityType || !title || !scheduledDate || !scheduledTime) { addToast('Please fill required fields: Activity Type, Title, Date, Time', 'error'); return; }
    onSubmit({ activity_type: activityType, title, description, scheduled_date: scheduledDate, scheduled_time: scheduledTime });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <label style={fLabelStyle}>Activity Type<Req /></label>
        <select
          value={activityType}
          onChange={e => setActivityType(e.target.value as ActivityLog['activity_type'])}
          style={{ ...fInputStyle, color: ACTIVITY_TYPE_COLORS[activityType], fontWeight: 700 }}
        >
          {ACTIVITY_TYPES.map(t => (
            <option key={t} value={t}>{ACTIVITY_TYPE_EMOJI[t]} {ACTIVITY_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>
      <div><label style={fLabelStyle}>Title<Req /></label><input type="text" value={title} onChange={e => setTitle(e.target.value)} style={fInputStyle} /></div>
      <div><label style={fLabelStyle}>Description</label><textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} style={{ ...fInputStyle, resize: 'vertical' }} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div><label style={fLabelStyle}>Date<Req /></label><input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} style={fInputStyle} /></div>
        <div><label style={fLabelStyle}>Time<Req /></label><TimeField value={scheduledTime} onChange={setScheduledTime} color={ACTIVITY_TYPE_COLORS[activityType]} /></div>
      </div>
      <button type="submit" style={{ padding: '10px', background: 'linear-gradient(135deg,#2563EB,#7C3AED)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>Save Changes</button>
    </form>
  );
};

// ── Activity Detail Form (compact) ────
const ActivityDetailForm = ({
  activity, onUpdate, onDelete, onClose,
}: { activity: ActivityLog; onUpdate: (id: number, data: Partial<ActivityLog>) => void; onDelete: (id: number) => void; onClose: () => void }) => {
  const [editing, setEditing] = useState(false);
  const c = ACTIVITY_TYPE_COLORS[activity.activity_type];

  if (editing) {
    return <ActivityEditForm activity={activity} onSubmit={(data) => onUpdate(activity.id, data)} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '300px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: 26, height: 26, borderRadius: '7px', background: `${c}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c }}>{ACTIVITY_TYPE_ICONS[activity.activity_type]}</div>
        <span style={{ fontWeight: 800, color: c, fontSize: '12.5px' }}>{ACTIVITY_TYPE_LABELS[activity.activity_type]}</span>
        <span style={{ fontWeight: 800, fontSize: '14px', marginLeft: 'auto' }}>{activity.lead_name}</span>
      </div>

      {activity.title && <h4 style={{ margin: 0, fontSize: '14px' }}>{activity.title}</h4>}

      {activity.description && (
        <p style={{ margin: 0, fontSize: '12.5px', lineHeight: 1.45, color: 'var(--color-text-muted)' }}>
          {activity.description}
        </p>
      )}

      {(activity.scheduled_date || activity.scheduled_time) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {activity.scheduled_time && <AnalogClock time={activity.scheduled_time} size={30} color={c} />}
          <span style={{ fontSize: '11.5px', color: c }}>
            {activity.scheduled_date}{activity.scheduled_time && ` • ${activity.scheduled_time}`}
          </span>
        </div>
      )}

      <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)' }}>Logged {new Date(activity.created_at).toLocaleString()}</span>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '2px', borderTop: '1px solid var(--color-border)', paddingTop: '10px' }}>
        <button onClick={() => setEditing(true)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 14px', background: 'linear-gradient(135deg,#2563EB,#7C3AED)', color: 'white', border: 'none', borderRadius: '9px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
          <Pencil size={12} /> Edit
        </button>
        <button
          onClick={() => onDelete(activity.id)}
          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', borderRadius: '9px', border: '1px solid #EF444444', background: '#EF44441A', color: '#EF4444', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
        >
          <Trash2 size={12} /> Delete
        </button>
      </div>
    </div>
  );
};

// ── Task Edit Form ────────────────────────────────────────────────────────
const TaskEditForm = ({ task, onSubmit }: { task: LeadTask; onSubmit: (data: Partial<LeadTask>) => void }) => {
  const [title, setTitle] = useState(task.title);
  const [dueDate, setDueDate] = useState(task.due_date);
  const fInputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-main)', fontSize: '13.5px' };
  const fLabelStyle: React.CSSProperties = { display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: 600, color: 'var(--color-text-muted)' };
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit({ title, due_date: dueDate }); }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div><label style={fLabelStyle}>Task Description<Req /></label><input type="text" value={title} onChange={e => setTitle(e.target.value)} style={fInputStyle} /></div>
      <div><label style={fLabelStyle}>Due Date<Req /></label><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={fInputStyle} /></div>
      <button type="submit" style={{ padding: '10px', background: 'linear-gradient(135deg,#2563EB,#7C3AED)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>Save Changes</button>
    </form>
  );
};

// ── Task Detail Form (compact) ────────
const TaskDetailForm = ({
  task, onUpdate, onDelete, onClose, onToggle,
}: { task: LeadTask; onUpdate: (id: number, data: Partial<LeadTask>) => void; onDelete: (id: number) => void; onClose: () => void; onToggle: (id: number) => void }) => {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return <TaskEditForm task={task} onSubmit={(data) => onUpdate(task.id, data)} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '300px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button onClick={() => onToggle(task.id)} style={{ width: 18, height: 18, borderRadius: '5px', border: '2px solid #10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', background: task.completed ? '#10B981' : 'transparent', cursor: 'pointer' }}>
          {task.completed && <Check size={11} color="white" />}
        </button>
        <span style={{ fontWeight: 800, color: '#10B981', fontSize: '12.5px' }}>Task</span>
        <span style={{ fontWeight: 800, fontSize: '14px', marginLeft: 'auto' }}>{task.lead_name}</span>
      </div>

      <h4 style={{ margin: 0, fontSize: '14px', textDecoration: task.completed ? 'line-through' : 'none' }}>{task.title}</h4>

      <span style={{ fontSize: '11.5px', color: '#10B981' }}>Due {task.due_date}</span>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '2px', borderTop: '1px solid var(--color-border)', paddingTop: '10px' }}>
        <button onClick={() => setEditing(true)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 14px', background: 'linear-gradient(135deg,#2563EB,#7C3AED)', color: 'white', border: 'none', borderRadius: '9px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
          <Pencil size={12} /> Edit
        </button>
        <button
          onClick={() => onDelete(task.id)}
          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', borderRadius: '9px', border: '1px solid #EF444444', background: '#EF44441A', color: '#EF4444', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
        >
          <Trash2 size={12} /> Delete
        </button>
      </div>
    </div>
  );
};

// ── Doc Edit Form ─────────────────────────────────────────────────────────
const DocEditForm = ({ doc, onSubmit }: { doc: LeadDoc; onSubmit: (data: Partial<LeadDoc>) => void }) => {
  const [name, setName] = useState(doc.name);
  const [docType, setDocType] = useState(doc.doc_type);
  const fInputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-main)', fontSize: '13.5px' };
  const fLabelStyle: React.CSSProperties = { display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: 600, color: 'var(--color-text-muted)' };
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit({ name, doc_type: docType }); }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div><label style={fLabelStyle}>Document Name<Req /></label><input type="text" value={name} onChange={e => setName(e.target.value)} style={fInputStyle} /></div>
      <div><label style={fLabelStyle}>Type<Req /></label>
        <select value={docType} onChange={e => setDocType(e.target.value)} style={fInputStyle}>
          <option value="Requirement">Requirement Doc</option>
          <option value="Visiting Card">Visiting Card</option>
          <option value="Proposal">Proposal Draft</option>
          <option value="Other">Other Attachment</option>
        </select>
      </div>
      <button type="submit" style={{ padding: '10px', background: 'linear-gradient(135deg,#2563EB,#7C3AED)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>Save Changes</button>
    </form>
  );
};

// ── Doc Send Form ──
const DocSendForm = ({ doc, onSend }: { doc: LeadDoc; onSend: (doc: LeadDoc, email: string) => void }) => {
  const [recipientEmail, setRecipientEmail] = useState('');
  const fInputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-main)', fontSize: '13.5px' };
  const fLabelStyle: React.CSSProperties = { display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: 600, color: 'var(--color-text-muted)' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '320px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-secondary)', flexShrink: 0 }}>
          <Paperclip size={18} />
        </div>
        <div>
          <span style={{ fontWeight: 700, fontSize: '13.5px', display: 'block' }}>{doc.name}</span>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{doc.doc_type} · {doc.lead_name}</span>
        </div>
      </div>
      <div>
        <label style={fLabelStyle}>Recipient Gmail<Req /></label>
        <input
          type="email"
          value={recipientEmail}
          onChange={e => setRecipientEmail(e.target.value)}
          placeholder="recipient@gmail.com"
          style={fInputStyle}
        />
      </div>
      <button
        onClick={() => onSend(doc, recipientEmail)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', background: 'linear-gradient(135deg,#2563EB,#7C3AED)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}
      >
        <Send size={15} /> Send via Gmail
      </button>
    </div>
  );
};

// ── Lead Details View ─────────────────────────────────────────────────────
const LeadDetailsView = ({
  lead, onUpdateStatus, onUpdatePriority,
}: {
  lead: Lead;
  onUpdateStatus: (id: number, status: Lead['status']) => void;
  onUpdatePriority: (id: number, priority: Lead['priority']) => void;
}) => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [newActivity, setNewActivity] = useState('');
  const [newActivityTitle, setNewActivityTitle] = useState('');
  const [activityType, setActivityType] = useState<ActivityLog['activity_type']>('NOTE');
  const [activityDate, setActivityDate] = useState('');
  const [activityTime, setActivityTime] = useState('');
  const { addToast } = useToast();

  const fInputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-main)', fontSize: '13.5px' };
  const fLabelStyle: React.CSSProperties = { display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: 600, color: 'var(--color-text-muted)' };

  const fetchActivities = async () => {
    try {
      const data = await get<any>(`/activities/`, { lead: lead.id });
      setActivities(Array.isArray(data) ? data : (data.results ?? []));
    } catch { addToast('Could not load activity history from backend', 'error'); }
  };

  useEffect(() => { fetchActivities(); }, [lead.id]);

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityType || !newActivityTitle.trim() || !activityDate || !activityTime) { addToast('Please fill required fields: Activity Type, Title, Date, Time', 'error'); return; }
    if (!newActivity.trim()) return;
    try {
      await post(`/activities/`, { lead: lead.id, activity_type: activityType, title: newActivityTitle || null, description: newActivity, scheduled_date: activityDate || null, scheduled_time: activityTime || null });
      addToast('Activity logged!', 'success');
      setNewActivity('');
      setNewActivityTitle('');
      setActivityDate('');
      setActivityTime('');
      fetchActivities();
    } catch {
      addToast('Error logging activity - check backend is running', 'error');
    }
  };

  const handleDeleteActivity = async (id: number) => {
    if (!window.confirm('Delete this activity log?')) return;
    try {
      await del(`/activities/${id}/`);
      addToast('Activity deleted', 'success');
      setActivities(activities.filter(a => a.id !== id));
    } catch {
      addToast('Error deleting activity', 'error');
    }
  };

  const iconBtnStyle: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' };

  const STATUS_META: Record<Lead['status'], { color: string; label: string }> = {
    LEAD: { color: '#64748B', label: 'Lead' }, CONTACTED: { color: '#F59E0B', label: 'Contacted' },
    PROPOSAL_SENT: { color: '#2563EB', label: 'Proposal Sent' }, WON: { color: '#10B981', label: 'Won' }, LOST: { color: '#EF4444', label: 'Lost' },
  };

  const PRIORITY_META: Record<Lead['priority'], { color: string }> = {
    LOW: { color: '#10B981' }, MEDIUM: { color: '#F59E0B' }, HIGH: { color: '#EF4444' },
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Status pipeline */}
          <div>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status Pipeline</span>
            <div style={{ display: 'flex', gap: '0', marginTop: '8px', background: 'var(--color-bg)', borderRadius: '10px', padding: '3px', border: '1px solid var(--color-border)' }}>
              {(['LEAD', 'CONTACTED', 'PROPOSAL_SENT', 'WON', 'LOST'] as const).map(status => {
                const meta = STATUS_META[status];
                const isActive = lead.status === status;
                return (
                  <button key={status} onClick={() => onUpdateStatus(lead.id, status)}
                    style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '11.5px', fontWeight: 700, background: isActive ? meta.color : 'transparent', color: isActive ? 'white' : 'var(--color-text-muted)', transition: 'all 0.2s', boxShadow: isActive ? `0 2px 8px ${meta.color}55` : 'none' }}>
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priority changer */}
          <div>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Priority</span>
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
              {(['LOW', 'MEDIUM', 'HIGH'] as const).map(p => {
                const pColor = PRIORITY_META[p].color;
                const isActive = lead.priority === p;
                return (
                  <button
                    key={p}
                    onClick={() => onUpdatePriority(lead.id, p)}
                    style={{
                      padding: '5px 14px', borderRadius: '999px', border: `1.5px solid ${isActive ? pColor : 'var(--color-border)'}`,
                      background: isActive ? `${pColor}18` : 'transparent',
                      color: isActive ? pColor : 'var(--color-text-muted)',
                      fontWeight: 700, fontSize: '11.5px', cursor: 'pointer', transition: 'all 0.18s',
                    }}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estimated Value</span>
          <h4 style={{ margin: '4px 0 0', color: 'var(--color-secondary)', fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em' }}>${parseFloat(lead.expected_deal_value).toLocaleString()}</h4>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        <div>
          <h5 style={{ fontWeight: 700, marginBottom: '8px', fontSize: '13px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Contact Information</h5>
          {[{ label: 'Person', val: `${lead.contact_person} (${lead.designation})` }, { label: 'Email', val: lead.email }, { label: 'Phone', val: lead.phone }, { label: 'WhatsApp', val: lead.whatsapp }].map(({ label, val }) => (
            <p key={label} style={{ margin: '5px 0', fontSize: '13px' }}><strong style={{ color: 'var(--color-text-muted)' }}>{label}:</strong> {val}</p>
          ))}
        </div>
        <div>
          <h5 style={{ fontWeight: 700, marginBottom: '8px', fontSize: '13px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Requirements</h5>
          <p style={{ margin: '4px 0', fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{lead.training_requirement || 'No requirements stated.'}</p>
          <p style={{ margin: '10px 0 0', fontSize: '13px' }}><strong style={{ color: 'var(--color-text-muted)' }}>Source:</strong> {lead.lead_source}</p>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
        <h5 style={{ fontWeight: 800, marginBottom: '12px', fontSize: '14px' }}>Log New Follow-up</h5>
        <form onSubmit={handleAddActivity} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={fLabelStyle}>Activity Type<Req /></label>
            <select
              value={activityType}
              onChange={e => setActivityType(e.target.value as ActivityLog['activity_type'])}
              style={{ ...fInputStyle, color: ACTIVITY_TYPE_COLORS[activityType], fontWeight: 700 }}
            >
              {ACTIVITY_TYPES.map(t => (
                <option key={t} value={t}>{ACTIVITY_TYPE_EMOJI[t]} {ACTIVITY_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div><label style={fLabelStyle}>Title<Req /></label><input type="text" placeholder="Title" value={newActivityTitle} onChange={e => setNewActivityTitle(e.target.value)} style={fInputStyle} /></div>
            <div><label style={fLabelStyle}>Description</label><input type="text" placeholder="Enter follow-up description..." value={newActivity} onChange={e => setNewActivity(e.target.value)} style={fInputStyle} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div><label style={fLabelStyle}>Date<Req /></label><input type="date" value={activityDate} onChange={e => setActivityDate(e.target.value)} style={fInputStyle} /></div>
            <div><label style={fLabelStyle}>Time<Req /></label><TimeField value={activityTime} onChange={setActivityTime} color={ACTIVITY_TYPE_COLORS[activityType]} /></div>
          </div>
          <button type="submit" style={{ padding: '9px 18px', background: 'linear-gradient(135deg,#2563EB,#7C3AED)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, alignSelf: 'flex-start', boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}>Log Activity</button>
        </form>

        <h5 style={{ fontWeight: 800, marginTop: '1.5rem', marginBottom: '10px', fontSize: '14px' }}>Timeline</h5>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {activities.map((act, idx) => {
            const c = ACTIVITY_TYPE_COLORS[act.activity_type];
            return (
              <div key={act.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: `${c}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c, border: `2px solid ${c}30` }}>
                    {ACTIVITY_TYPE_ICONS[act.activity_type]}
                  </div>
                  {idx < activities.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 16, background: 'var(--color-border)', margin: '3px 0' }} />}
                </div>
                <div className="hz-card" style={{ flex: 1, padding: '10px 12px', background: `${c}06`, borderRadius: '10px', border: `1px solid ${c}15`, marginBottom: idx < activities.length - 1 ? '4px' : 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: c }}>{ACTIVITY_TYPE_LABELS[act.activity_type]}{act.title ? ` — ${act.title}` : ''}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>{new Date(act.created_at).toLocaleDateString()}</span>
                      <button onClick={() => handleDeleteActivity(act.id)} style={{ ...iconBtnStyle, color: '#EF4444' }}><Trash2 size={12} /></button>
                    </div>
                  </div>
                  <span style={{ fontSize: '12.5px', color: 'var(--color-text-main)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{act.description}</span>
                  {(act.scheduled_date || act.scheduled_time) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      {act.scheduled_time && <AnalogClock time={act.scheduled_time} size={18} color={c} />}
                      <span style={{ color: c, fontSize: '11px' }}>📅 {act.scheduled_date}{act.scheduled_time && ` • ${act.scheduled_time}`}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
     
    </div>
  );
};


export default TrainingCRM
