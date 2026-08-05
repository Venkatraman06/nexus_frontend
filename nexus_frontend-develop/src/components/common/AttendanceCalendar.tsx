import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Tooltip, Spin, Typography, Space, Modal, Button, Form,
  Input, Select, message,
} from "antd";
import {
  LeftOutlined, RightOutlined, HomeOutlined, ScheduleOutlined, UnlockOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { get, post } from "@/services/api";

const { Text } = Typography;

// ── Types ──────────────────────────────────────────────────────────────────────
interface LeaveInfo {
  id: string; type: string; color: string; status: string;
  days_count: number; reason: string;
}
interface CalendarDay {
  date: string; day: number; weekday: number;
  is_weekend: boolean; is_today: boolean; is_future: boolean;
  display_status: string; att_status: string | null;
  check_in: string | null; check_out: string | null;
  working_hours: number; notes: string;
  leave: LeaveInfo | null;
  // FIX 2: new field from backend
  clockin_enabled?: boolean;
}
interface CalendarData {
  year: number; month: number;
  employee_id: string; employee_name: string;
  effective_days: number;
  summary: Record<string, number>;
  days: CalendarDay[];
}

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, {
  icon: React.ReactNode;
  bg: string; border: string;
  tooltip: string; dotColor: string;
}> = {
  PRESENT:         { icon: <PersonCheckIcon color="#16a34a" />, bg: "#f0fdf4", border: "#bbf7d0", tooltip: "Present",               dotColor: "#16a34a" },
  WFH:             { icon: <PersonHomeIcon  color="#2563eb" />, bg: "#eff6ff", border: "#bfdbfe", tooltip: "Work From Home",        dotColor: "#2563eb" },
  HALF_DAY:        { icon: <PersonHalfIcon  color="#d97706" />, bg: "#fffbeb", border: "#fde68a", tooltip: "Half Day",              dotColor: "#d97706" },
  ON_LEAVE:        { icon: <PersonXIcon     color="#7c3aed" />, bg: "#f5f3ff", border: "#ddd6fe", tooltip: "On Leave",              dotColor: "#7c3aed" },
  PENDING_LEAVE:   { icon: <PersonXIcon     color="#ea580c" />, bg: "#fff7ed", border: "#fed7aa", tooltip: "Leave Pending Approval", dotColor: "#ea580c" },
  ABSENT:          { icon: <PersonXIcon     color="#dc2626" />, bg: "#fef2f2", border: "#fecaca", tooltip: "Absent",                dotColor: "#dc2626" },
  HOLIDAY:         { icon: <HolidayIcon     color="#0d9488" />, bg: "#f0fdfa", border: "#99f6e4", tooltip: "Holiday",               dotColor: "#0d9488" },
  // FIX 2: new status for HR-enabled future dates
  CLOCKIN_ENABLED: { icon: <UnlockOutlined style={{ color: "#7c3aed", fontSize: 16 }} />, bg: "#faf5ff", border: "#c4b5fd", tooltip: "Clock-in Enabled by HR", dotColor: "#7c3aed" },
  WEEKEND:         { icon: <WeekendIcon />,                     bg: "#f9fafb", border: "#e5e7eb", tooltip: "Weekend",               dotColor: "#9ca3af" },
  NOT_MARKED:      { icon: null,                                bg: "#fff",    border: "#e5e7eb", tooltip: "Not Marked",            dotColor: "#9ca3af" },
  FUTURE:          { icon: null,                                bg: "#fff",    border: "#e5e7eb", tooltip: "",                      dotColor: "#e5e7eb" },
};

// ── SVG Icons ──────────────────────────────────────────────────────────────────
function PersonCheckIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="10" cy="7" r="4" fill={color} opacity="0.9" />
      <path d="M2 21c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M17 13l2 2 4-4" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function PersonXIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="10" cy="7" r="4" fill={color} opacity="0.9" />
      <path d="M2 21c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M17 13l4 4m0-4l-4 4" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
function PersonHomeIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="10" cy="7" r="4" fill={color} opacity="0.9" />
      <path d="M2 21c0-4.4 3.6-8 8-8" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M17 13l-3.5 3.5V21h7v-4.5L17 13z" fill={color} opacity="0.85" />
      <path d="M14 13l3-3 3 3" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function PersonHalfIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M10 3a4 4 0 010 8V3z" fill={color} />
      <path d="M10 3a4 4 0 000 8" stroke={color} strokeWidth="1.5" fill="none" />
      <path d="M10 13c-4.4 0-8 3.6-8 8h8V13z" fill={color} />
      <path d="M10 13c4.4 0 8 3.6 8 8" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}
function HolidayIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L8 8H3l4 3.5-1.5 5.5L12 14l6.5 3-1.5-5.5L21 8h-5L12 2z" fill={color} opacity="0.9" />
      <rect x="10.5" y="19" width="3" height="3" rx="0.5" fill={color} opacity="0.7" />
    </svg>
  );
}
function WeekendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="#9ca3af" strokeWidth="1.8" fill="#f3f4f6" />
      <line x1="3" y1="9" x2="21" y2="9" stroke="#9ca3af" strokeWidth="1.5" />
      <line x1="8" y1="2" x2="8" y2="6" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="16" y1="2" x2="16" y2="6" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// ── Legend ─────────────────────────────────────────────────────────────────────
function Legend() {
  const items = [
    { label: "Present",          color: "#16a34a" },
    { label: "WFH",              color: "#2563eb" },
    { label: "Half Day",         color: "#d97706" },
    { label: "On Leave",         color: "#7c3aed" },
    { label: "Leave Pending",    color: "#ea580c" },
    { label: "Absent",           color: "#dc2626" },
    { label: "Holiday",          color: "#0d9488" },
    { label: "Clock-in Enabled", color: "#7c3aed" },  // FIX 2
    { label: "Weekend",          color: "#9ca3af" },
  ];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", marginBottom: 16 }}>
      {items.map((item) => (
        <Space key={item.label} size={5} style={{ fontSize: 12, color: "#374151" }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
          {item.label}
        </Space>
      ))}
    </div>
  );
}

// ── Future Date Action Modal ───────────────────────────────────────────────────
function FutureDateModal({
  open, date, onClose, employeeId, onSuccess,
}: {
  open: boolean;
  date: string;
  onClose: () => void;
  employeeId: string;
  onSuccess: () => void;
}) {
  const [mode, setMode] = useState<"menu" | "wfh" | "shift">("menu");
  const [wfhForm]   = Form.useForm();
  const [shiftForm] = Form.useForm();

  const { data: shifts } = useQuery<Array<{ id: string; name: string; start_time: string; end_time: string }>>({
    queryKey: ["shifts-list"],
    queryFn:  () => get("/master/shift-categories/", { dropdown: 1, page_size: 200 })
                      .then((d: any) => d.results ?? d),
    // FIX 1: load shifts whenever modal is open in shift mode (not gated)
    enabled: open && mode === "shift",
    staleTime: 120_000,
  });

  const wfhMutation = useMutation({
    mutationFn: (payload: any) => post("/attendance/wfh-requests/", payload),
    onSuccess: () => {
      message.success("WFH request submitted — HR will review it");
      wfhForm.resetFields();
      onClose();
      onSuccess();
    },
    onError: (e: any) => {
      const detail = e?.response?.data?.detail
        || Object.entries(e?.response?.data ?? {}).map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`).join(", ")
        || "Failed to submit WFH request";
      message.error(detail);
    },
  });

  const shiftMutation = useMutation({
    mutationFn: (payload: any) => post("/attendance/shift-change-requests/", payload),
    onSuccess: () => {
      message.success("Shift change request submitted — HR will review it");
      shiftForm.resetFields();
      onClose();
      onSuccess();
    },
    onError: (e: any) => {
      const detail = e?.response?.data?.detail
        || Object.entries(e?.response?.data ?? {}).map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`).join(", ")
        || "Failed to submit shift change request";
      message.error(detail);
    },
  });

  const handleClose = () => {
    setMode("menu");
    wfhForm.resetFields();
    shiftForm.resetFields();
    onClose();
  };

  const formattedDate = dayjs(date).format("DD MMM YYYY (ddd)");

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      width={420}
      destroyOnClose
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {mode !== "menu" && (
            <Button
              type="text" size="small"
              onClick={() => { setMode("menu"); wfhForm.resetFields(); shiftForm.resetFields(); }}
              style={{ color: "var(--bms-text-3)", padding: "0 4px", marginRight: 4 }}
            >
              ←
            </Button>
          )}
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--bms-text)" }}>
            {mode === "menu"  && `Requests for ${formattedDate}`}
            {mode === "wfh"   && `WFH Request — ${formattedDate}`}
            {mode === "shift" && `Shift Change — ${formattedDate}`}
          </span>
        </div>
      }
    >
      {/* ── Menu ── */}
      {mode === "menu" && (
        <div style={{ padding: "8px 0" }}>
          <Text style={{ fontSize: 13, color: "var(--bms-text-2)", display: "block", marginBottom: 16 }}>
            What would you like to request for this date?
          </Text>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* WFH option */}
            <div
              onClick={() => setMode("wfh")}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 16px", borderRadius: 10, cursor: "pointer",
                border: "1px solid var(--bms-border)", background: "var(--bms-surface-2)",
                transition: "box-shadow 0.15s, transform 0.15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(37,99,235,0.12)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; (e.currentTarget as HTMLElement).style.transform = ""; }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <HomeOutlined style={{ fontSize: 20, color: "#2563eb" }} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: "var(--bms-text)" }}>Request WFH</div>
                <div style={{ fontSize: 12, color: "var(--bms-text-3)" }}>Work from home — HR approval required</div>
              </div>
            </div>

            {/* FIX 1: Shift change is ALWAYS clickable — no disabled state */}
            <div
              onClick={() => setMode("shift")}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 16px", borderRadius: 10, cursor: "pointer",
                border: "1px solid var(--bms-border)", background: "var(--bms-surface-2)",
                transition: "box-shadow 0.15s, transform 0.15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(124,58,237,0.12)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; (e.currentTarget as HTMLElement).style.transform = ""; }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#faf5ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <ScheduleOutlined style={{ fontSize: 20, color: "#7c3aed" }} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: "var(--bms-text)" }}>Request Shift Change</div>
                <div style={{ fontSize: 12, color: "var(--bms-text-3)" }}>Temporary or permanent shift change</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── WFH Form ── */}
      {mode === "wfh" && (
        <Form
          form={wfhForm}
          layout="vertical"
          style={{ marginTop: 8 }}
          onFinish={(v) => wfhMutation.mutate({
            requested_date: date,
            date:           date,
            reason:         v.reason || "",
          })}
        >
          <div style={{
            background: "#eff6ff", border: "1px solid #bfdbfe",
            borderRadius: 8, padding: "8px 12px", marginBottom: 14,
            fontSize: 12, color: "#1d4ed8",
          }}>
            <HomeOutlined style={{ marginRight: 6 }} />
            Requesting WFH for <strong>{formattedDate}</strong>
          </div>
          <Form.Item name="reason" label="Reason" rules={[{ required: true, message: "Please provide a reason" }]}>
            <Input.TextArea rows={3} placeholder="Why do you need to work from home?" />
          </Form.Item>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={wfhMutation.isPending}
              style={{ background: "#2563eb", borderColor: "#2563eb" }}>
              Submit WFH Request
            </Button>
          </div>
        </Form>
      )}

      {/* ── Shift Change Form ── */}
      {mode === "shift" && (
        <Form
          form={shiftForm}
          layout="vertical"
          style={{ marginTop: 8 }}
          initialValues={{ request_type: "TEMPORARY" }}
          onFinish={(v) => shiftMutation.mutate({
            request_type:    v.request_type,
            requested_date:  v.request_type === "TEMPORARY" ? date : null,
            requested_shift: v.requested_shift,
            reason:          v.reason || "",
          })}
        >
          <div style={{
            background: "#faf5ff", border: "1px solid #ddd6fe",
            borderRadius: 8, padding: "8px 12px", marginBottom: 14,
            fontSize: 12, color: "#6d28d9",
          }}>
            <ScheduleOutlined style={{ marginRight: 6 }} />
            Requesting shift change for <strong>{formattedDate}</strong>
          </div>

          <Form.Item name="request_type" label="Change Type" rules={[{ required: true }]}>
            <Select options={[
              { value: "TEMPORARY", label: "Temporary — for this date only" },
              { value: "PERMANENT", label: "Permanent — update my default shift" },
            ]} />
          </Form.Item>

          <Form.Item name="requested_shift" label="Requested Shift" rules={[{ required: true, message: "Please select a shift" }]}>
            <Select
              showSearch
              placeholder="Select shift"
              filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
              options={(shifts ?? []).map((s) => ({
                value: s.id,
                label: `${s.name} (${s.start_time?.slice(0, 5)} – ${s.end_time?.slice(0, 5)})`,
              }))}
              notFoundContent={<span style={{ fontSize: 12, color: "var(--bms-text-3)" }}>Loading shifts…</span>}
            />
          </Form.Item>

          <Form.Item name="reason" label="Reason" rules={[{ required: true, message: "Please provide a reason" }]}>
            <Input.TextArea rows={3} placeholder="Why do you need this shift change?" />
          </Form.Item>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={shiftMutation.isPending}
              style={{ background: "#7c3aed", borderColor: "#7c3aed" }}>
              Submit Shift Change
            </Button>
          </div>
        </Form>
      )}
    </Modal>
  );
}

// ── Day Cell ──────────────────────────────────────────────────────────────────
function DayCell({
  day, onFutureClick,
}: {
  day: CalendarDay;
  onFutureClick: (date: string) => void;
}) {
  // FIX 2: If this is a future date with HR clock-in enabled, use CLOCKIN_ENABLED status
  const effectiveStatus = (day.is_future && day.clockin_enabled)
    ? "CLOCKIN_ENABLED"
    : day.display_status;

  const cfg      = STATUS_CFG[effectiveStatus] ?? STATUS_CFG.NOT_MARKED;
  const isToday  = day.is_today;
  const isFuture = day.is_future;
  const isClickable = isFuture && !day.is_weekend;

  const tooltipContent = day.display_status === "FUTURE" && !day.clockin_enabled ? undefined : (
    <div style={{ fontSize: 12, lineHeight: 1.6, minWidth: 140 }}>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{dayjs(day.date).format("DD MMM YYYY (ddd)")}</div>
      {/* FIX 2: Show HR enabled badge in tooltip */}
      {day.clockin_enabled && isFuture && (
        <div style={{ color: "#7c3aed", fontWeight: 600, marginBottom: 2 }}>
          🔓 Clock-in enabled by HR
        </div>
      )}
      <div style={{ color: cfg.dotColor, fontWeight: 500 }}>{cfg.tooltip}</div>
      {day.check_in && (
        <div>In: <b>{day.check_in}</b>{day.check_out ? ` · Out: ${day.check_out}` : ""}</div>
      )}
      {day.working_hours > 0 && <div>Hours: <b>{day.working_hours}h</b></div>}
      {day.leave && (
        <div style={{ marginTop: 2 }}>
          Leave: <b>{day.leave.type}</b>
          {day.leave.reason && <div style={{ color: "#9ca3af" }}>{day.leave.reason}</div>}
        </div>
      )}
      {day.notes && <div style={{ color: "#9ca3af" }}>{day.notes}</div>}
    </div>
  );

  const cell = (
    <div
      onClick={() => isClickable && onFutureClick(day.date)}
      style={{
        minHeight: 64,
        border: `1px solid ${
          isToday ? "#1677ff"
          : (day.clockin_enabled && isFuture) ? "#c4b5fd"
          : isClickable ? "#a5b4fc"
          : cfg.border
        }`,
        borderRadius: 6,
        background: isToday ? "#e6f4ff"
          : (day.clockin_enabled && isFuture) ? "#faf5ff"
          : isClickable ? "#fafaff"
          : cfg.bg,
        position: "relative",
        padding: "4px 5px",
        cursor: isClickable ? "pointer" : "default",
        transition: "box-shadow 0.15s, transform 0.12s",
        boxShadow: isToday ? "0 0 0 2px #1677ff40"
          : (day.clockin_enabled && isFuture) ? "0 0 0 2px #c4b5fd60"
          : "none",
      }}
      onMouseEnter={(e) => {
        if (isClickable) {
          (e.currentTarget as HTMLElement).style.boxShadow = (day.clockin_enabled && isFuture)
            ? "0 2px 8px rgba(124,58,237,0.2)"
            : "0 2px 8px rgba(99,102,241,0.18)";
          (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = isToday ? "0 0 0 2px #1677ff40"
          : (day.clockin_enabled && isFuture) ? "0 0 0 2px #c4b5fd60"
          : "none";
        (e.currentTarget as HTMLElement).style.transform = "";
      }}
    >
      {/* Working-day corner triangle */}
      {!day.is_weekend && !isFuture && (
        <div style={{
          position: "absolute", top: 0, left: 0,
          width: 0, height: 0, borderStyle: "solid",
          borderWidth: "8px 8px 0 0",
          borderColor: `${cfg.dotColor} transparent transparent transparent`,
          borderTopLeftRadius: 5,
        }} />
      )}

      {/* FIX 2: HR-enabled lock icon for future dates */}
      {isFuture && day.clockin_enabled && (
        <div style={{
          position: "absolute", top: 2, right: 3,
          fontSize: 9, color: "#7c3aed", fontWeight: 700,
        }}>
          🔓
        </div>
      )}

      {/* Future date "+" hint (only if not clockin_enabled) */}
      {isFuture && !day.is_weekend && !day.clockin_enabled && (
        <div style={{
          position: "absolute", top: 2, right: 3,
          fontSize: 9, color: "#6366f1", fontWeight: 700, opacity: 0.6,
        }}>
          +
        </div>
      )}

      {/* Day number */}
      <div style={{
        fontSize: 11, fontWeight: isToday ? 700 : 500,
        color: isToday ? "#1677ff"
          : (day.clockin_enabled && isFuture) ? "#7c3aed"
          : isFuture ? "#6366f1"
          : "#374151",
        textAlign: "right", lineHeight: 1, marginBottom: 4,
      }}>
        {day.day}
      </div>

      {/* Status icon */}
      {cfg.icon && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 2 }}>
          {cfg.icon}
        </div>
      )}

      {/* Check-in time */}
      {day.check_in && !day.is_weekend && (
        <div style={{ fontSize: 9, color: "#6b7280", textAlign: "center", marginTop: 2, lineHeight: 1.2 }}>
          {day.check_in}
        </div>
      )}
    </div>
  );

  return tooltipContent ? (
    <Tooltip title={tooltipContent} placement="top" mouseEnterDelay={0.2}>{cell}</Tooltip>
  ) : cell;
}

// ── Summary Bar ───────────────────────────────────────────────────────────────
function SummaryBar({ summary }: { summary: Record<string, number> }) {
  const items = [
    { key: "present",       label: "Present",          color: "#16a34a" },
    { key: "wfh",           label: "WFH",              color: "#2563eb" },
    { key: "half_day",      label: "Half Day",         color: "#d97706" },
    { key: "on_leave",      label: "On Leave",         color: "#7c3aed" },
    { key: "pending_leave", label: "Pending",          color: "#ea580c" },
    { key: "absent",        label: "Absent",           color: "#dc2626" },
    { key: "holiday",       label: "Holiday",          color: "#0d9488" },
    { key: "clockin_enabled", label: "Clock-in Enabled", color: "#7c3aed" }, // FIX 2
  ].filter((i) => summary[i.key] > 0);

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
      {items.map((item) => (
        <div key={item.key} style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "5px 12px", borderRadius: 20,
          background: item.color + "12", border: `1px solid ${item.color}30`,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color }} />
          <Text style={{ fontSize: 12, fontWeight: 600, color: item.color }}>{summary[item.key]}</Text>
          <Text style={{ fontSize: 12, color: "#6b7280" }}>{item.label}</Text>
        </div>
      ))}
    </div>
  );
}

// ── Main Calendar Component ────────────────────────────────────────────────────
export default function AttendanceCalendar({ employeeId }: { employeeId: string }) {
  const today   = dayjs();
  const qc      = useQueryClient();
  const [current, setCurrent]             = useState(today);
  const [futureDateModal, setFutureDateModal] = useState<string | null>(null);

  const year  = current.year();
  const month = current.month() + 1;

  const { data, isLoading } = useQuery<CalendarData>({
    queryKey: ["emp-calendar", employeeId, year, month],
    queryFn:  () => get(`/attendance/employee-calendar/?employee=${employeeId}&year=${year}&month=${month}`),
    staleTime: 60_000,
  });

  const firstDay    = dayjs(new Date(year, month - 1, 1));
  const startOffset = (firstDay.day() + 7) % 7;
  const gridCells: (CalendarDay | null)[] = [
    ...Array(startOffset).fill(null),
    ...(data?.days ?? []),
  ];
  while (gridCells.length % 7 !== 0) gridCells.push(null);

  const WEEK_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const hasFutureDates = (data?.days ?? []).some((d) => d.is_future && !d.is_weekend);
  // FIX 2: count HR-enabled dates for the hint
  const hasClockInEnabled = (data?.days ?? []).some((d) => d.is_future && d.clockin_enabled);

  return (
    <div>
      {/* Month navigation */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Text style={{ fontSize: 14, color: "#374151" }}>
            Effective days worked:{" "}
            <Text strong style={{ fontSize: 15, color: "#1677ff" }}>
              {data?.effective_days ?? "—"}
            </Text>
          </Text>
        </div>
        <Space>
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            background: "#f8fafc", borderRadius: 8, padding: "4px 12px",
            border: "1px solid #e5e7eb",
          }}>
            <LeftOutlined
              style={{ fontSize: 12, cursor: "pointer", color: "#374151" }}
              onClick={() => setCurrent((c) => c.subtract(1, "month"))}
            />
            <Text strong style={{ fontSize: 14, color: "#1f2937", minWidth: 100, textAlign: "center" }}>
              {current.format("MMMM YYYY")}
            </Text>
            <RightOutlined
              style={{ fontSize: 12, cursor: "pointer", color: "#374151" }}
              onClick={() => setCurrent((c) => c.add(1, "month"))}
            />
          </div>
          <div
            style={{ fontSize: 12, color: "#1677ff", cursor: "pointer", padding: "4px 8px", borderRadius: 6, border: "1px solid #bae0ff", background: "#e6f4ff" }}
            onClick={() => setCurrent(today)}
          >
            Today
          </div>
        </Space>
      </div>

      {/* FIX 2: HR clock-in enabled hint */}
      {hasClockInEnabled && (
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          marginBottom: 8, padding: "6px 12px", borderRadius: 8,
          background: "#faf5ff", border: "1px solid #c4b5fd", fontSize: 12, color: "#7c3aed",
        }}>
          🔓 <strong style={{ marginLeft: 2 }}>HR has enabled clock-in</strong> for one or more dates this month. Those dates are highlighted in purple — click them to request WFH or a shift change too.
        </div>
      )}

      {/* Future dates hint */}
      {hasFutureDates && (
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          marginBottom: 10, padding: "6px 12px", borderRadius: 8,
          background: "#f0f0ff", border: "1px solid #a5b4fc", fontSize: 12, color: "#4338ca",
        }}>
          <span style={{ fontWeight: 700 }}>Tip:</span>
          Click on any future date (marked with <span style={{ fontWeight: 700, marginLeft: 2, marginRight: 2 }}>+</span>) to request WFH or a shift change for that day.
        </div>
      )}

      {/* Summary pills */}
      {data && <SummaryBar summary={data.summary} />}

      {/* Legend */}
      <Legend />

      {/* Calendar grid */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: 60 }}><Spin size="large" /></div>
      ) : (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
          {/* Week header */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: "#f8fafc", borderBottom: "1px solid #e5e7eb" }}>
            {WEEK_HEADERS.map((h) => (
              <div key={h} style={{
                textAlign: "center", padding: "8px 4px",
                fontSize: 12, fontWeight: 600,
                color: (h === "Sun" || h === "Sat") ? "#9ca3af" : "#374151",
                borderRight: "1px solid #f0f0f0",
              }}>
                {h}
              </div>
            ))}
          </div>

          {/* Calendar rows */}
          {Array.from({ length: gridCells.length / 7 }, (_, rowIdx) => (
            <div key={rowIdx} style={{
              display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
              borderBottom: rowIdx < gridCells.length / 7 - 1 ? "1px solid #f0f0f0" : "none",
            }}>
              {gridCells.slice(rowIdx * 7, rowIdx * 7 + 7).map((day, colIdx) => (
                <div key={colIdx} style={{ padding: 4, borderRight: colIdx < 6 ? "1px solid #f0f0f0" : "none", minHeight: 72 }}>
                  {day ? (
                    <DayCell
                      day={day}
                      onFutureClick={(date) => setFutureDateModal(date)}
                    />
                  ) : null}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Future Date Request Modal */}
      {futureDateModal && (
        <FutureDateModal
          open={!!futureDateModal}
          date={futureDateModal}
          employeeId={employeeId}
          onClose={() => setFutureDateModal(null)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ["emp-calendar", employeeId, year, month] });
          }}
        />
      )}
    </div>
  );
}