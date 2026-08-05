import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Row, Col, Card, Tag, Typography, Progress, Table, Empty, Spin,
  Avatar, Divider, Button, Tooltip, message, Modal, Form, Input,
  Select, DatePicker, Badge, Space,
} from "antd";
import {
  ClockCircleOutlined, CheckCircleOutlined,
  CodeOutlined, UserOutlined, ProjectOutlined, FireOutlined,
  CalendarOutlined, LoginOutlined,
  LogoutOutlined, CoffeeOutlined, PauseCircleOutlined,
  PlayCircleOutlined, PlusOutlined, WalletOutlined,
  FilePdfOutlined, DownloadOutlined, EyeOutlined, EyeInvisibleOutlined,
  ScheduleOutlined, SyncOutlined, FolderOpenOutlined, AppstoreOutlined,
  PhoneOutlined, MailOutlined, WhatsAppOutlined, EnvironmentOutlined,
  WarningOutlined, CheckOutlined, HomeOutlined,
} from "@ant-design/icons";
import AttendanceCalendar from "@/components/common/AttendanceCalendar";
import FollowUpCalendarModal from "@/pages/followups/FollowUpCalendarModal";
import { useNavigate } from "react-router-dom";
import { get, post } from "@/services/api";
import { followUpApi } from "@/services/followups";
import { PERMS } from "@/constants/permissions";
import { useAuthStore } from "@/store/auth";
import dayjs, { Dayjs } from "dayjs";

const { Text, Title } = Typography;

// ── Types ─────────────────────────────────────────────────────────────────────
interface AttendanceBreak {
  id: string; break_type: string; break_type_label: string;
  start_time: string; end_time: string | null; duration_minutes: number;
}
interface AttendanceToday {
  status: string | null; check_in: string | null; check_out: string | null;
  duration_hours: number; working_hours?: number; total_break_minutes?: number;
  breaks?: AttendanceBreak[];
  clockin_enabled?: boolean;
}
interface LeaveBalance {
  leave_type: string; code: string; color: string;
  is_paid: boolean; total: number; used: number; remaining: number;
}
interface LeaveRequest {
  id: string; leave_type: string; color: string;
  start_date: string; end_date: string; days_count: number;
  status: string; reason: string;
}
interface WorkStats {
  avg_working_hours: number; avg_break_minutes: number;
  total_working_hours: number; total_break_minutes: number;
  working_days_count: number; on_time: number; late: number; early: number;
}
interface WFHStatus {
  wfh_enabled: boolean;           // HR toggled WFH allowed for this employee
  pending_wfh_request: boolean;   // has a pending WFH request already
  approved_wfh_today: boolean;    // WFH approved for today specifically
}
interface EmpDashboard {
  profile: {
    id: string; full_name: string; employee_code: string; email: string;
    designation: string; department: string; grade: string;
    keycloak_group: string; joining_date: string | null;
    profile_picture_url: string | null;
    shift_applicable: boolean;
  };
  work_items: { open: number; in_progress: number; in_review: number; done: number; total: number; overdue: number };
  recent_items: Array<{
    id: string; ticket_number: string; title: string; type: string;
    status: string; priority: string; due_date: string | null; project: string;
  }>;
  pending_followups?: Array<{
    id: string; title: string; type: string; type_label: string;
    priority: string; priority_label: string;
    description: string; start_date: string | null; end_date: string | null;
    start_time: string | null; end_time: string | null;
    is_overdue: boolean;
    assignee_name: string; workflow_state_slug: string; workflow_state_name: string;
  }>;
  my_projects: Array<{
    id: string; name: string; code: string; client: string;
    status: string; allocation_percentage: number;
    start_date: string; end_date: string | null;
  }>;
  timesheet: { weekly_hours: number; expected_hours: number; daily_logs: Array<{ log_date: string; hours: number }> };
  recent_logs: Array<{
    id: string; log_date: string; hours: number; notes: string;
    work_item: string; ticket: string; project: string; is_billable: boolean;
  }>;
  attendance_today: AttendanceToday;
  attendance_month: { present: number; wfh: number; half_day: number; on_leave: number };
  checkin_stats: WorkStats;
  leave_balances: LeaveBalance[];
  leave_requests: LeaveRequest[];
  wfh_status: WFHStatus;
  payslips: Array<{ id: string; month: number; month_name: string; year: number; status: string; net_salary: number }>;
  payslips_fy: string;
  reporting_hierarchy?: { manager?: { id: string; name: string; employee_code: string; designation: string; avatar: string | null } };
}

// ── Color maps ────────────────────────────────────────────────────────────────
const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: "#dc2626", HIGH: "#ea580c", MEDIUM: "#d97706", LOW: "#6b7280",
};
const STATUS_COLOR: Record<string, string> = {
  OPEN: "#6366f1", IN_PROGRESS: "#f97316", IN_REVIEW: "#0891b2", DONE: "#16a34a", CLOSED: "#6b7280",
};
const PROJECT_STATUS_COLOR: Record<string, string> = {
  ACTIVE: "#22c55e", ON_HOLD: "#f59e0b", COMPLETED: "#6b7280", DELAYED: "#ef4444", PLANNING: "#3b82f6",
};
const BREAK_COLORS: Record<string, string> = { TEA: "#f59e0b", LUNCH: "#16a34a", OTHER: "#6b7280" };
const BREAK_ICONS: Record<string, React.ReactNode> = {
  TEA: <CoffeeOutlined />, LUNCH: <CoffeeOutlined />, OTHER: <PauseCircleOutlined />,
};
const PAYSLIP_STYLE: Record<string, { color: string; bg: string }> = {
  DRAFT:     { color: "#d97706", bg: "#fffbeb" },
  FINALIZED: { color: "#1677ff", bg: "#eff6ff" },
  PAID:      { color: "#16a34a", bg: "#f0fdf4" },
};
const LEAVE_STATUS_COLOR: Record<string, string> = {
  PENDING: "#f59e0b", APPROVED: "#22c55e", REJECTED: "#ef4444", CANCELLED: "#6b7280",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function avatarInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}
function getGreeting(hour: number) {
  if (hour >= 5  && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Good night";
}
function useGreetingClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(id); }, []);
  return now;
}
function captureGeo(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null), { timeout: 5000 },
    );
  });
}

const FOLLOWUP_PRIORITY_COLOR: Record<string, string> = {
  IMPORTANT: "#dc2626", HIGH: "#ea580c", MEDIUM: "#d97706", LOW: "#6b7280",
};

function formatFollowUpTimeRange(start: string | null | undefined, end: string | null | undefined) {
  const fmt = (t: string) => dayjs(t, ["HH:mm", "HH:mm:ss"]).format("h:mm A");
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return `From ${fmt(start)}`;
  if (end) return `Until ${fmt(end)}`;
  return null;
}

const FOLLOWUP_TYPE_ICON: Record<string, React.ReactNode> = {
  EMAIL: <MailOutlined />, CALL: <PhoneOutlined />, MEETING: <CalendarOutlined />,
  WHATSAPP: <WhatsAppOutlined />, SITE_VISIT: <EnvironmentOutlined />,
};

function PendingFollowUpsWidget({ items, onDone, onOpenCalendar }: {
  items: EmpDashboard["pending_followups"];
  onDone: (id: string) => void;
  onOpenCalendar: () => void;
}) {
  const list = items ?? [];
  const MAX_VISIBLE = 3;
  const ITEM_APPROX_HEIGHT = 78;
  const LIST_GAP = 10;
  const scrollMaxHeight = MAX_VISIBLE * ITEM_APPROX_HEIGHT + (MAX_VISIBLE - 1) * LIST_GAP;

  return (
    <Widget
      title="Pending Follow-ups"
      icon={<PhoneOutlined />}
      iconColor="#1e3a8a"
      bgColor="#eff6ff"
      borderColor="#bfdbfe"
      extra={
        <Space size={4}>
          {list.length > MAX_VISIBLE && (
            <Text type="secondary" style={{ fontSize: 11 }}>{list.length} total</Text>
          )}
          <Tooltip title="View calendar">
            <Button type="text" size="small" icon={<CalendarOutlined />} onClick={onOpenCalendar} />
          </Tooltip>
        </Space>
      }
    >
      {list.length === 0 ? (
        <Empty description="No pending follow-ups" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: LIST_GAP,
            maxHeight: scrollMaxHeight,
            overflowY: list.length > MAX_VISIBLE ? "auto" : "visible",
            overflowX: "hidden",
            paddingRight: list.length > MAX_VISIBLE ? 4 : 0,
          }}
        >
          {list.map((f) => (
            <div key={f.id} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 8,
              border: "1px solid var(--bms-border)", background: "var(--bms-surface-2)",
            }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: f.is_overdue ? "#dc2626" : "#9ca3af", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <Text strong style={{ fontSize: 13 }}>{f.title}</Text>
                  <Tag color={FOLLOWUP_PRIORITY_COLOR[f.priority] ?? "#d97706"} style={{ fontSize: 11, margin: 0 }}>
                    {f.priority_label}
                  </Tag>
                  <Tag style={{ fontSize: 11, display: "inline-flex", alignItems: "center", gap: 3 }}>
                    {FOLLOWUP_TYPE_ICON[f.type]} {f.type_label}
                  </Tag>
                </div>
                <div style={{ fontSize: 11, color: "var(--bms-text-2)", marginTop: 3 }}>
                  {f.is_overdue && <Text type="danger" strong style={{ fontSize: 11 }}><WarningOutlined /> OVERDUE </Text>}
                  {f.end_date && <span>{f.end_date} · </span>}
                  {formatFollowUpTimeRange(f.start_time, f.end_time) && (
                    <span>{formatFollowUpTimeRange(f.start_time, f.end_time)} · </span>
                  )}
                  {f.description && <span>{f.description} · </span>}
                  {f.assignee_name}
                </div>
              </div>
              {f.workflow_state_slug !== "completed" && f.workflow_state_slug !== "cancelled" && (
                <Button size="small" icon={<CheckOutlined />} onClick={() => onDone(f.id)}>Done</Button>
              )}
            </div>
          ))}
        </div>
      )}
    </Widget>
  );
}

// ── Widget wrapper ────────────────────────────────────────────────────────────
function Widget({ title, icon, children, extra, iconColor = "#1677ff", bgColor, borderColor }: {
  title: string; icon: React.ReactNode; children: React.ReactNode;
  extra?: React.ReactNode; iconColor?: string; bgColor?: string; borderColor?: string;
}) {
  const isDark  = document.documentElement.getAttribute("data-theme") === "dark";
  const hBg     = isDark ? "var(--bms-surface-2)" : (bgColor     ?? "var(--bms-surface-2)");
  const hBorder = isDark ? "var(--bms-border)"    : (borderColor ?? "#eaecf0");
  return (
    <Card size="small"
      title={<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: iconColor }}>{icon}</span>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{title}</span>
      </div>}
      extra={extra}
      styles={{
        body:   { padding: "14px 16px", background: "var(--bms-surface)", borderRadius: "0 0 12px 12px" },
        header: { background: hBg, borderBottom: `1px solid ${hBorder}` },
      }}
      style={{ borderRadius: 12, border: `1px solid ${hBorder}`, height: "100%", background: "var(--bms-surface)" }}
    >
      {children}
    </Card>
  );
}

function StatBox({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <div style={{ flex: 1, textAlign: "center", padding: "12px 8px", background: color + "0d", borderRadius: 10, border: `1px solid ${color}25` }}>
      <div style={{ fontSize: 20, color, marginBottom: 2 }}>{icon}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--bms-text-2)", marginTop: 3 }}>{label}</div>
    </div>
  );
}

function MiniBarChart({ logs }: { logs: Array<{ log_date: string; hours: number }> }) {
  if (!logs.length) return <div style={{ color: "#9ca3af", fontSize: 12, paddingTop: 6 }}>No logs this month</div>;
  const max = Math.max(...logs.map((l) => l.hours), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 44, paddingTop: 4 }}>
      {logs.map((l) => (
        <div key={l.log_date} title={`${l.log_date}: ${l.hours}h`} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ width: "100%", background: "#1677ff", height: `${(l.hours / max) * 40}px`, borderRadius: "3px 3px 0 0", minHeight: 3 }} />
        </div>
      ))}
    </div>
  );
}

// ── Work hours stats ──────────────────────────────────────────────────────────
function WorkHoursStats({ stats }: { stats: WorkStats }) {
  const totalDays        = stats.working_days_count;
  const hasData          = totalDays > 0;
  const allowedBreakMins = 45 + 20 * 2 + 5;
  const breakPct = hasData ? Math.min(100, Math.round((stats.avg_break_minutes / allowedBreakMins) * 100)) : 0;
  const workPct  = hasData ? Math.min(100, Math.round((stats.avg_working_hours  / 9) * 100)) : 0;
  return (
    <Widget title="Monthly Work Statistics" icon={<ClockCircleOutlined />} iconColor="#7c3aed" bgColor="#faf5ff" borderColor="#e9d5ff">
      {!hasData ? (
        <div style={{ textAlign: "center", padding: "24px 0", color: "#9ca3af", fontSize: 13 }}>No attendance data this month</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#1677ff" }} />
                <Text style={{ fontSize: 12 }}>Avg Working Hours / Day</Text>
              </div>
              <Text style={{ fontSize: 12, fontWeight: 700, color: workPct >= 90 ? "#16a34a" : workPct >= 70 ? "#1677ff" : "#d97706" }}>
                {stats.avg_working_hours.toFixed(1)}h
              </Text>
            </div>
            <Progress percent={workPct} strokeColor={workPct >= 90 ? "#16a34a" : workPct >= 70 ? "#1677ff" : "#d97706"} showInfo={false} size="small" />
            <div style={{ fontSize: 10, color: "var(--bms-text-3)", marginTop: 2 }}>
              Total: {stats.total_working_hours.toFixed(1)}h across {totalDays} day{totalDays > 1 ? "s" : ""}
            </div>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} />
                <Text style={{ fontSize: 12 }}>Avg Break / Day</Text>
              </div>
              <Text style={{ fontSize: 12, fontWeight: 700, color: breakPct > 90 ? "#dc2626" : "#f59e0b" }}>
                {stats.avg_break_minutes.toFixed(0)} min
              </Text>
            </div>
            <Progress percent={breakPct} strokeColor={breakPct > 90 ? "#dc2626" : "#f59e0b"} showInfo={false} size="small" />
            <div style={{ fontSize: 10, color: "var(--bms-text-3)", marginTop: 2 }}>
              Allowed: Lunch 45m · Tea 20m × 2 · Other 5m = {allowedBreakMins}m total
            </div>
          </div>
          {(stats.on_time + stats.late + stats.early) > 0 && (
            <div>
              <Text style={{ fontSize: 11, color: "var(--bms-text-2)", display: "block", marginBottom: 6 }}>Punctuality</Text>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { label: "On Time", value: stats.on_time, color: "#16a34a" },
                  { label: "Late",    value: stats.late,    color: "#dc2626" },
                  { label: "Early",   value: stats.early,   color: "#1677ff" },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ flex: 1, textAlign: "center", padding: "6px 4px", background: color + "0d", borderRadius: 8, border: `1px solid ${color}22` }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
                    <div style={{ fontSize: 10, color: "var(--bms-text-2)" }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Widget>
  );
}

// ── WFH Request Modal ─────────────────────────────────────────────────────────
function WFHRequestModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [form] = Form.useForm();
  const mutation = useMutation({
    mutationFn: (values: { date: Dayjs; reason: string }) =>
      post("/attendance/wfh-requests/", {
        requested_date: values.date.format("YYYY-MM-DD"),
        date:           values.date.format("YYYY-MM-DD"),
        reason:         values.reason,
      }),
    onSuccess: () => { message.success("WFH request submitted — HR will review it"); form.resetFields(); onSuccess(); },
    onError: (e: any) => {
      const detail = e?.response?.data?.detail
        || Object.entries(e?.response?.data ?? {}).map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`).join(", ")
        || "Failed to submit WFH request";
      message.error(detail);
    },
  });
  return (
    <Modal title={<span><HomeOutlined style={{ color: "#2563eb", marginRight: 8 }} />Request Work From Home</span>}
      open={open} onCancel={() => { form.resetFields(); onClose(); }} footer={null} width={440} destroyOnClose>
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}
        onFinish={(v) => mutation.mutate({ date: v.date, reason: v.reason || "" })}>
        <Form.Item name="date" label="WFH Date" rules={[{ required: true, message: "Please select a date" }]}>
          <DatePicker style={{ width: "100%" }} format="DD MMM YYYY"
            disabledDate={(d) => d && d < dayjs().startOf("day")} />
        </Form.Item>
        <Form.Item name="reason" label="Reason" rules={[{ required: true, message: "Please provide a reason" }]}>
          <Input.TextArea rows={3} placeholder="Why do you need to work from home?" />
        </Form.Item>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button onClick={() => { form.resetFields(); onClose(); }}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={mutation.isPending}
            style={{ background: "#2563eb", borderColor: "#2563eb" }}>Submit Request</Button>
        </div>
      </Form>
    </Modal>
  );
}

// ── Shift Change Modal ────────────────────────────────────────────────────────
function ShiftChangeModal({ open, onClose, onSuccess, employeeId }: { open: boolean; onClose: () => void; onSuccess: () => void; employeeId: string }) {
  const [form] = Form.useForm();
  const requestType = Form.useWatch("request_type", form);
  const { data: shifts } = useQuery<Array<{ id: string; name: string; start_time: string; end_time: string }>>({
    queryKey: ["shifts-list"],
    queryFn: () => get("/attendance/shift-categories/", { page_size: 200 }).then((d: any) => d.results ?? d),
    enabled: open, staleTime: 120_000,
  });
  const mutation = useMutation({
    mutationFn: (payload: any) => post("/attendance/shift-change-requests/", payload),
    onSuccess: () => { message.success("Shift change request submitted — HR will review it"); form.resetFields(); onSuccess(); },
    onError: (e: any) => {
      const detail = e?.response?.data?.detail
        || Object.entries(e?.response?.data ?? {}).map(([k, v]: any) => `${k}: ${Array.isArray(v) ? v[0] : v}`).join(", ")
        || "Failed to submit request";
      message.error(detail);
    },
  });
  return (
    <Modal title={<span><ScheduleOutlined style={{ color: "#7c3aed", marginRight: 8 }} />Request Shift Change</span>}
      open={open} onCancel={() => { form.resetFields(); onClose(); }} footer={null} width={460} destroyOnClose>
      <Form form={form} layout="vertical" style={{ marginTop: 12 }} initialValues={{ request_type: "TEMPORARY" }}
        onFinish={(v) => mutation.mutate({
  employee:        employeeId,
  request_type:    v.request_type,
  requested_date:  v.request_type === "TEMPORARY" ? v.requested_date?.format("YYYY-MM-DD") : null,
  requested_shift: v.requested_shift,
  reason:          v.reason || "",
})}>
        <Form.Item name="request_type" label="Change Type" rules={[{ required: true }]}>
          <Select options={[
            { value: "TEMPORARY", label: "Temporary — one specific date" },
            { value: "PERMANENT", label: "Permanent — update my default shift" },
          ]} />
        </Form.Item>
        {requestType === "TEMPORARY" && (
          <Form.Item name="requested_date" label="Date" rules={[{ required: true, message: "Select a date" }]}>
            <DatePicker style={{ width: "100%" }} format="DD MMM YYYY"
              disabledDate={(d) => !d || d < dayjs().startOf("day")} />
          </Form.Item>
        )}
        <Form.Item name="requested_shift" label="Requested Shift" rules={[{ required: true, message: "Select a shift" }]}>
          <Select showSearch placeholder="Select shift"
            filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
            options={(shifts ?? []).map((s) => ({
              value: s.id,
              label: `${s.name} (${s.start_time?.slice(0, 5)} – ${s.end_time?.slice(0, 5)})`,
            }))} />
        </Form.Item>
        <Form.Item name="reason" label="Reason" rules={[{ required: true }]}>
          <Input.TextArea rows={3} placeholder="Why do you need this shift change?" />
        </Form.Item>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button onClick={() => { form.resetFields(); onClose(); }}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={mutation.isPending}
            style={{ background: "#7c3aed", borderColor: "#7c3aed" }}>Submit Request</Button>
        </div>
      </Form>
    </Modal>
  );
}

// ── Attendance widget ─────────────────────────────────────────────────────────
function AttendanceWidget({
  today, month, shiftApplicable, wfhStatus,
  onCheckIn, onCheckOut, onBreakStart, onBreakEnd,
  checkingIn, checkingOut, breakStarting, breakEnding,
  onViewCalendar, onRequestWFH, onRequestShiftChange,
}: {
  today: AttendanceToday; month: EmpDashboard["attendance_month"];
  shiftApplicable: boolean; wfhStatus: WFHStatus;
  onCheckIn: (s: string) => void; onCheckOut: () => void;
  onBreakStart: (bt: string) => void; onBreakEnd: () => void;
  checkingIn: boolean; checkingOut: boolean; breakStarting: boolean; breakEnding: boolean;
  onViewCalendar: () => void; onRequestWFH: () => void; onRequestShiftChange: () => void;
}) {
  const breaks      = today.breaks ?? [];
  const activeBreak = breaks.find((b) => !b.end_time);
  const onBreak     = !!activeBreak;
  const workingHrs  = today.working_hours ?? today.duration_hours;
  const breakMins   = today.total_break_minutes ?? 0;
  const canClockIn  = shiftApplicable || !!today.clockin_enabled;

  // Status badge color
  const statusBg = today.status === "PRESENT"  ? "#22c55e"
                 : today.status === "WFH"       ? "#2563eb"
                 : today.status === "HALF_DAY"  ? "#f59e0b"
                 : today.status === "ON_LEAVE"  ? "#7c3aed"
                 : today.status === "ABSENT"    ? "#ef4444"
                 : "#6b7280";
  const statusLabel: Record<string, string> = {
    PRESENT: "Present", WFH: "Work From Home", HALF_DAY: "Half Day",
    ON_LEAVE: "On Leave", ABSENT: "Absent", HOLIDAY: "Holiday",
  };

  return (
    <Widget title="Attendance" icon={<CalendarOutlined />} iconColor="#059669"
      bgColor="var(--bms-surface-2)" borderColor="var(--bms-border)"
      extra={<Button size="small" icon={<ScheduleOutlined />} onClick={onViewCalendar} style={{ borderRadius: 20, fontSize: 12 }}>My attendance</Button>}>

      {/* Today row */}
      <div style={{ background: "var(--bms-surface-2)", border: "1px solid var(--bms-border)", borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <Text style={{ fontSize: 12, color: "var(--bms-text-2)", fontWeight: 500 }}>Today</Text>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {!shiftApplicable && today.clockin_enabled && (
              <span style={{ fontSize: 10, fontWeight: 600, borderRadius: 20, padding: "1px 8px", background: "#7c3aed", color: "#fff" }}>HR Enabled</span>
            )}
            {onBreak && (
              <span style={{ fontSize: 11, fontWeight: 600, borderRadius: 20, padding: "1px 10px", background: "#f59e0b", color: "#fff" }}>On Break</span>
            )}
            {today.status ? (
              <span style={{ fontSize: 11, fontWeight: 600, borderRadius: 20, padding: "1px 10px", background: statusBg, color: "#fff" }}>
                {statusLabel[today.status] ?? today.status}
              </span>
            ) : (
              <span style={{ fontSize: 11, color: "var(--bms-text-3)" }}>Not marked</span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            { label: "Start Time", value: today.check_in  ?? "--:--", color: today.check_in  ? "#16a34a" : "var(--bms-text-3)" },
            { label: "End Time",   value: today.check_out ?? "--:--", color: today.check_out ? "#dc2626" : "var(--bms-text-3)" },
            { label: "Working",    value: workingHrs > 0 ? `${workingHrs}h` : "--", color: "var(--bms-text)" },
            { label: "Break",      value: breakMins  > 0 ? `${breakMins}m`  : "--", color: "var(--bms-text-2)" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ flex: "1 1 60px", minWidth: 55 }}>
              <div style={{ fontSize: 10, color: "var(--bms-text-2)" }}>{label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Clock-in actions */}
      {!today.check_in ? (
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <Tooltip title={!canClockIn ? "Clock-in not available — HR must enable it for today, or you need a shift assigned" : ""}>
            <Button type="primary" icon={<LoginOutlined />} loading={checkingIn} disabled={!canClockIn}
              style={{ flex: 1, borderRadius: 8, background: canClockIn ? "#16a34a" : undefined, borderColor: canClockIn ? "#16a34a" : undefined }}
              onClick={() => canClockIn && onCheckIn("PRESENT")}>
              {canClockIn ? "Start Day" : "Start Day (unavailable)"}
            </Button>
          </Tooltip>
          {wfhStatus.wfh_enabled && (
            <Tooltip title="Clock in as Work From Home">
              <Button icon={<HomeOutlined />} loading={checkingIn} disabled={!canClockIn}
                style={{ borderRadius: 8, color: "#2563eb", borderColor: "#2563eb", background: "transparent" }}
                onClick={() => canClockIn && onCheckIn("WFH")}>WFH</Button>
            </Tooltip>
          )}
        </div>
      ) : today.check_out ? (
        <div style={{ textAlign: "center", padding: "8px 12px", marginBottom: 10, background: "var(--bms-surface-2)", border: "1px solid var(--bms-border)", borderRadius: 8 }}>
          <CheckCircleOutlined style={{ color: "#22c55e", marginRight: 6 }} />
          <Text style={{ color: "#22c55e", fontSize: 13 }}>Day completed — see you tomorrow!</Text>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          {!onBreak ? (
            <>
              <Select size="small" placeholder="Start Break" style={{ flex: 1 }} loading={breakStarting}
                onChange={(val: string) => onBreakStart(val)} value={undefined} suffixIcon={<PauseCircleOutlined />}>
                <Select.Option value="TEA">☕ Tea Break</Select.Option>
                <Select.Option value="LUNCH">🍽 Lunch Break</Select.Option>
                <Select.Option value="OTHER">⏸ Other Break</Select.Option>
              </Select>
              <Button danger icon={<LogoutOutlined />} loading={checkingOut} style={{ borderRadius: 8, flex: 1 }} onClick={onCheckOut}>End Day</Button>
            </>
          ) : (
            <Button type="primary" icon={<PlayCircleOutlined />} loading={breakEnding} block
              style={{ borderRadius: 8, background: "#f59e0b", borderColor: "#f59e0b" }} onClick={onBreakEnd}>
              Resume — {activeBreak?.break_type_label}
            </Button>
          )}
        </div>
      )}

      {/* WFH request + shift change — single row */}
      <div style={{ marginBottom: 10 }}>
        {!today.check_in && wfhStatus.approved_wfh_today && (
          <div style={{ textAlign: "center", padding: "6px 10px", marginBottom: 8, borderRadius: 8, background: "#f0fdf4", border: "1px solid #86efac", fontSize: 12, color: "#16a34a" }}>
            <CheckCircleOutlined style={{ marginRight: 6 }} />
            WFH approved for today — use the WFH button above to clock in
          </div>
        )}
        {!today.check_in && wfhStatus.pending_wfh_request && (
          <div style={{ textAlign: "center", padding: "6px 10px", marginBottom: 8, borderRadius: 8, background: "var(--bms-surface-2)", border: "1px solid var(--bms-border)", fontSize: 12, color: "#d97706" }}>
            <ClockCircleOutlined style={{ marginRight: 6, color: "#d97706" }} />
            WFH request pending HR approval
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          {!today.check_in && !wfhStatus.approved_wfh_today && !wfhStatus.pending_wfh_request && (
            <Button
              size="small"
              icon={<HomeOutlined />}
              onClick={onRequestWFH}
              style={{ flex: 1, borderRadius: 8, fontSize: 12, color: "#2563eb", borderColor: "#2563eb", background: "transparent", fontWeight: 500, whiteSpace: "nowrap", paddingInline: 8 }}
            >
              Work From Home
            </Button>
          )}
          <Button
            size="small"
            icon={<ScheduleOutlined />}
            onClick={onRequestShiftChange}
            style={{ flex: 1, borderRadius: 8, fontSize: 12, color: "#7c3aed", borderColor: "#7c3aed", background: "transparent", whiteSpace: "nowrap", paddingInline: 8 }}
          >
            Shift Change
          </Button>
        </div>
      </div>

      {/* Break log */}
      {breaks.length > 0 && (
        <>
          <Divider style={{ margin: "8px 0" }} />
          <Text style={{ fontSize: 11, color: "var(--bms-text-3)", display: "block", marginBottom: 6 }}>Today's breaks</Text>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {breaks.map((b) => (
              <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 8px", borderRadius: 6, background: (BREAK_COLORS[b.break_type] ?? "#6b7280") + "18", border: `1px solid ${(BREAK_COLORS[b.break_type] ?? "#6b7280")}33` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: BREAK_COLORS[b.break_type] ?? "#6b7280", fontSize: 12 }}>{BREAK_ICONS[b.break_type]}</span>
                  <Text style={{ fontSize: 12, color: "var(--bms-text)" }}>{b.break_type_label}</Text>
                  <Text style={{ fontSize: 11, color: "var(--bms-text-3)" }}>{b.start_time}{b.end_time ? ` – ${b.end_time}` : " (ongoing)"}</Text>
                </div>
                {b.end_time && <Text style={{ fontSize: 12, fontWeight: 600, color: BREAK_COLORS[b.break_type] ?? "#6b7280" }}>{b.duration_minutes}m</Text>}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Monthly summary */}
      <Divider style={{ margin: "10px 0" }} />
      <Text style={{ fontSize: 11, color: "var(--bms-text-3)", display: "block", marginBottom: 8 }}>This month</Text>
      <div style={{ display: "flex", gap: 8 }}>
        {[
          { label: "Present", value: month.present,  color: "#16a34a" },
          { label: "WFH",     value: month.wfh,      color: "#2563eb" },
          { label: "Leave",   value: month.on_leave, color: "#7c3aed" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ flex: 1, textAlign: "center", padding: "6px 4px", background: color + "18", borderRadius: 8, border: `1px solid ${color}33` }}>
            <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: 10, color: "var(--bms-text-3)" }}>{label}</div>
          </div>
        ))}
      </div>
    </Widget>
  );
}

// ── Leave widget ──────────────────────────────────────────────────────────────
function LeaveWidget({ balances, requests, onApply }: {
  balances: LeaveBalance[]; requests: LeaveRequest[]; onApply: () => void;
}) {
  return (
    <Widget title="Leave Management" icon={<WalletOutlined />} iconColor="#7c3aed" bgColor="#f5f3ff" borderColor="#ddd6fe"
      extra={<Button size="small" type="primary" icon={<PlusOutlined />}
        style={{ borderRadius: 20, fontSize: 12, background: "var(--bms-surface-2)", borderColor: "var(--bms-border)", color: "var(--bms-text)" }}
        onClick={onApply}>Apply Leave</Button>}>
      {balances.length > 0 ? (
        <div style={{ marginBottom: 14 }}>
          <Text style={{ fontSize: 11, color: "var(--bms-text-3)", display: "block", marginBottom: 8 }}>Leave Balance — {new Date().getFullYear()}</Text>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {balances.map((b) => (
              <div key={b.code} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: b.color, flexShrink: 0 }} />
                <Text style={{ fontSize: 12, flex: 1 }}>{b.leave_type}</Text>
                <Text style={{ fontSize: 12, color: "var(--bms-text-3)" }}>{b.used}/{b.total} used</Text>
                <div style={{ width: 60 }}><Progress percent={b.total > 0 ? Math.round((b.used / b.total) * 100) : 0} strokeColor={b.color} showInfo={false} size="small" /></div>
                <Text style={{ fontSize: 12, fontWeight: 600, color: b.color, minWidth: 32, textAlign: "right" }}>{b.remaining}d</Text>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <Text style={{ fontSize: 12, color: "var(--bms-text-3)", display: "block", marginBottom: 14 }}>No leave balance configured. Contact HR.</Text>
      )}
      <Divider style={{ margin: "10px 0" }} />
      <Text style={{ fontSize: 11, color: "var(--bms-text-3)", display: "block", marginBottom: 8 }}>Recent Requests</Text>
      {requests.length === 0 ? (
        <div style={{ textAlign: "center", padding: "12px 0" }}><Text style={{ color: "#9ca3af", fontSize: 12 }}>No leave requests</Text></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {requests.map((r) => (
            <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: 8, background: "var(--bms-surface-2)", border: "1px solid var(--bms-border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: r.color, flexShrink: 0 }} />
                <div>
                  <Text style={{ fontSize: 12, fontWeight: 500 }}>{r.leave_type}</Text>
                  <div style={{ fontSize: 11, color: "var(--bms-text-3)" }}>{r.start_date} → {r.end_date} <span style={{ marginLeft: 6 }}>({r.days_count}d)</span></div>
                </div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, borderRadius: 20, padding: "1px 8px", background: LEAVE_STATUS_COLOR[r.status] + "18", color: LEAVE_STATUS_COLOR[r.status], border: `1px solid ${LEAVE_STATUS_COLOR[r.status]}33` }}>{r.status}</span>
            </div>
          ))}
        </div>
      )}
    </Widget>
  );
}

// ── Apply leave modal ─────────────────────────────────────────────────────────
function ApplyLeaveModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [form] = Form.useForm();
  const { data: leaveTypes } = useQuery<Array<{ id: string; name: string; code: string; color: string }>>({
    queryKey: ["leave-types"], queryFn: () => get("/leave/types/"), enabled: open,
  });
  const mutation = useMutation({
    mutationFn: (data: any) => post("/leave/requests/", data),
    onSuccess: () => { message.success("Leave request submitted"); form.resetFields(); onSuccess(); },
    onError: () => message.error("Failed to submit leave request"),
  });
  return (
    <Modal title="Apply for Leave" open={open} onCancel={onClose} footer={null} width={480}>
      <Form form={form} layout="vertical" onFinish={(v) => mutation.mutate({ leave_type: v.leave_type, start_date: v.dates[0].format("YYYY-MM-DD"), end_date: v.dates[1].format("YYYY-MM-DD"), reason: v.reason || "" })}>
        <Form.Item name="leave_type" label="Leave Type" rules={[{ required: true }]}>
          <Select placeholder="Select type">{(leaveTypes ?? []).map((t) => <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>)}</Select>
        </Form.Item>
        <Form.Item name="dates" label="Date Range" rules={[{ required: true }]}>
          <DatePicker.RangePicker style={{ width: "100%" }} disabledDate={(d) => d && d < dayjs().startOf("day")} />
        </Form.Item>
        <Form.Item name="reason" label="Reason"><Input.TextArea rows={3} placeholder="Optional reason" /></Form.Item>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={mutation.isPending} style={{ background: "#7c3aed", borderColor: "#7c3aed" }}>Submit Request</Button>
        </div>
      </Form>
    </Modal>
  );
}

// ── Payslip widget ────────────────────────────────────────────────────────────
function PayslipWidget({ records, fy }: { records: EmpDashboard["payslips"]; fy: string }) {
  const [amountVisible, setAmountVisible] = useState(false);
  const [downloading,   setDownloading]   = useState<string | null>(null);
  const downloadPayslip = async (id: string, monthName: string, year: number) => {
    setDownloading(id);
    try {
      const res = await fetch(`/bms/api/v1/payroll/my/${id}/payslip-pdf/`, { headers: { Authorization: `Bearer ${localStorage.getItem("kc_access_token") ?? ""}` } });
      if (!res.ok) { message.error("Failed to generate payslip"); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `Payslip-${monthName}-${year}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { message.error("Download failed"); }
    finally { setDownloading(null); }
  };
  return (
    <Widget title="My Payslips" icon={<WalletOutlined />} iconColor="#db2777"
      extra={<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Text style={{ fontSize: 12, color: "var(--bms-text-2)" }}>{fy}</Text>
        <Tooltip title={amountVisible ? "Hide amounts" : "Show amounts"}>
          <Button type="text" size="small" icon={amountVisible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
            onClick={() => setAmountVisible((v) => !v)} style={{ color: "#9ca3af", padding: "0 4px" }} />
        </Tooltip>
      </div>}>
      {records.length === 0 ? <Empty description="No payslips available" image={Empty.PRESENTED_IMAGE_SIMPLE} /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {records.map((r) => {
            const ss = PAYSLIP_STYLE[r.status] ?? PAYSLIP_STYLE.DRAFT;
            return (
              <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--bms-border)", background: "var(--bms-surface-2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 8, background: ss.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <FilePdfOutlined style={{ fontSize: 18, color: ss.color }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "var(--bms-text)" }}>{r.month_name} {r.year}</div>
                    <div style={{ fontSize: 12, color: "var(--bms-text-2)" }}>Net:{" "}
                      {amountVisible
                        ? <span style={{ fontWeight: 700, color: "#1677ff" }}>₹{r.net_salary.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                        : <span style={{ fontWeight: 700, color: "var(--bms-text-3)", letterSpacing: 2 }}>••••••</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 20, color: ss.color, background: ss.bg, border: `1px solid ${ss.color}33` }}>{r.status}</span>
                  <Button size="small" icon={<DownloadOutlined />} loading={downloading === r.id}
                    onClick={() => downloadPayslip(r.id, r.month_name, r.year)} style={{ color: "#7c3aed", borderColor: "#7c3aed" }}>PDF</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Widget>
  );
}

// ── Reporting chain ───────────────────────────────────────────────────────────
const RP_COLORS = ["#E53935","#8E24AA","#1E88E5","#00897B","#F4511E","#43A047","#FB8C00","#D81B60"];
function rpColor(name: string) { let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h); return RP_COLORS[Math.abs(h) % RP_COLORS.length]; }
function rpInit(name: string)  { const p = name.trim().split(/\s+/); return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase(); }

function ReportingChain({ managerName, managerCode, managerDesig, managerAvatar, managerId, selfName, selfCode, selfDesig, selfAvatar, selfId, onNavigate }: {
  managerName: string; managerCode: string; managerDesig: string; managerAvatar: string | null; managerId: string;
  selfName: string; selfCode: string; selfDesig: string; selfAvatar: string | null; selfId: string;
  onNavigate: (id: string) => void;
}) {
  function ChainRow({ name, code, desig, avatar, id, accent, label, isLast }: { name: string; code: string; desig: string; avatar: string | null; id: string; accent: string; label: string; isLast?: boolean }) {
    const col = rpColor(name);
    return (
      <div style={{ display: "flex", gap: 0 }}>
        <div style={{ width: 36, display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: accent, border: "2px solid #fff", boxShadow: `0 0 0 2px ${accent}40`, marginTop: 18, flexShrink: 0, zIndex: 1 }} />
          {!isLast && <div style={{ flex: 1, width: 2, background: `linear-gradient(to bottom, ${accent}60, var(--bms-border))`, minHeight: 24 }} />}
        </div>
        <div onClick={() => onNavigate(id)} style={{ flex: 1, marginLeft: 8, marginBottom: isLast ? 0 : 8, borderRadius: 10, overflow: "hidden", border: "1px solid var(--bms-border)", background: "var(--bms-surface)", cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", transition: "box-shadow 0.15s, transform 0.15s" }}
          onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = "0 4px 14px rgba(0,0,0,0.12)"; el.style.transform = "translateX(2px)"; }}
          onMouseLeave={(e)  => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)"; el.style.transform = ""; }}>
          <div style={{ height: 3, background: `linear-gradient(90deg, ${accent}, ${accent}44)` }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px" }}>
            {avatar ? <img src={avatar} alt={name} style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `2px solid ${accent}30` }} />
              : <div style={{ width: 34, height: 34, borderRadius: "50%", background: col, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 12, boxShadow: `0 2px 6px ${col}55` }}>{rpInit(name)}</div>}
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, color: accent, textTransform: "uppercase" }}>{label}</span>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--bms-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
              {desig && <div style={{ fontSize: 10, color: "var(--bms-text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{desig}</div>}
            </div>
            {code && <div style={{ fontSize: 9, color: "var(--bms-text-3)", fontFamily: "monospace", background: "var(--bms-surface-2)", border: "1px solid var(--bms-border)", borderRadius: 5, padding: "2px 6px", flexShrink: 0 }}>{code}</div>}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div style={{ background: "var(--bms-surface)", backgroundImage: "radial-gradient(circle, var(--bms-border) 1px, transparent 1px)", backgroundSize: "18px 18px", borderRadius: 10, border: "1px solid var(--bms-border)", padding: "12px 12px 12px 6px" }}>
      <ChainRow name={managerName} code={managerCode} desig={managerDesig} avatar={managerAvatar} id={managerId} accent="#7c3aed" label="Reports To" />
      <ChainRow name={selfName}    code={selfCode}    desig={selfDesig}    avatar={selfAvatar}    id={selfId}    accent="#2563eb" label="You" isLast />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function EmployeeDashboardPage() {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const [leaveModalOpen,       setLeaveModalOpen]       = useState(false);
  const [wfhModalOpen,         setWfhModalOpen]         = useState(false);
  const [shiftChangeModalOpen, setShiftChangeModalOpen] = useState(false);
  const [calendarOpen,         setCalendarOpen]         = useState(false);
  const [followUpCalendarOpen, setFollowUpCalendarOpen] = useState(false);
  const now = useGreetingClock();

  const { data, isLoading, isError } = useQuery<EmpDashboard>({
    queryKey: ["employee-dashboard"],
    queryFn:  () => get<EmpDashboard>("/dashboard/employee/"),
    staleTime: 0,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["employee-dashboard"] });

  const checkInMutation = useMutation({
    mutationFn: async (attendanceStatus: string) => { const geo = await captureGeo(); return post("/attendance/check-in/", { status: attendanceStatus, ...(geo ?? {}) }); },
    onSuccess: () => { message.success("Checked in successfully"); refresh(); },
    onError: (e: any) => message.error(e?.response?.data?.detail || "Check-in failed"),
  });
  const checkOutMutation = useMutation({
    mutationFn: async () => { const geo = await captureGeo(); return post("/attendance/check-out/", geo ?? {}); },
    onSuccess: () => { message.success("Day ended — see you tomorrow!"); refresh(); },
    onError: (e: any) => message.error(e?.response?.data?.detail || "Check-out failed"),
  });
  const startBreakMutation = useMutation({
    mutationFn: (bt: string) => post("/attendance/break/start/", { break_type: bt }),
    onSuccess: () => { message.success("Break started"); refresh(); },
    onError: (e: any) => message.error(e?.response?.data?.detail || "Could not start break"),
  });
  const endBreakMutation = useMutation({
    mutationFn: () => post("/attendance/break/end/", {}),
    onSuccess: () => { message.success("Break ended — welcome back!"); refresh(); },
    onError: (e: any) => message.error(e?.response?.data?.detail || "Could not end break"),
  });
  const permissions = useAuthStore((s) => s.permissions);
  const canFollowUp = permissions.includes(PERMS.CRM_FOLLOWUP_VIEW as never);
  const followUpDoneMutation = useMutation({
    mutationFn: (id: string) => followUpApi.transition(id, "completed"),
    onSuccess: () => { message.success("Follow-up marked as done"); refresh(); },
    onError: (e: any) => message.error(e?.response?.data?.error || "Could not update follow-up"),
  });

  if (isLoading) return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300 }}><Spin size="large" /></div>;
  if (isError || !data) return <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}><Empty description="Failed to load your dashboard. Contact admin if this persists." /></div>;

  const { profile, work_items, recent_items, pending_followups, my_projects, timesheet, recent_logs, attendance_today, attendance_month, checkin_stats, leave_balances, leave_requests, payslips, payslips_fy } = data;
  const wfhStatus: WFHStatus = data.wfh_status ?? { wfh_enabled: false, pending_wfh_request: false, approved_wfh_today: false };
  const weekPct = Math.min(100, Math.round((timesheet.weekly_hours / timesheet.expected_hours) * 100));
  const LOG_ROW_HEIGHT = 44;
  const LOG_HEADER_HEIGHT = 40;
  const LOG_VISIBLE_ROWS = 5;
  const logScrollY = LOG_HEADER_HEIGHT + LOG_ROW_HEIGHT * LOG_VISIBLE_ROWS;

  const itemCols = [
    { title: "Ticket",   dataIndex: "ticket_number", width: 100, render: (v: string) => <Text style={{ color: "#1677ff", cursor: "pointer", fontSize: 12, fontFamily: "monospace" }} onClick={() => navigate("/tickets")}>{v || "—"}</Text> },
    { title: "Title",    dataIndex: "title",          ellipsis: true, render: (v: string, r: any) => <div><Text style={{ fontSize: 13 }}>{v}</Text>{r.project && <div style={{ fontSize: 11, color: "#9ca3af" }}>{r.project}</div>}</div> },
    { title: "Status",   dataIndex: "status",         width: 110, render: (v: string) => <Tag color={STATUS_COLOR[v] ?? "#6b7280"} style={{ fontSize: 11, borderRadius: 20 }}>{v.replace("_", " ")}</Tag> },
    { title: "Priority", dataIndex: "priority",       width: 90,  render: (v: string) => <span style={{ fontSize: 12, color: PRIORITY_COLOR[v] ?? "#6b7280", fontWeight: 600 }}>{v}</span> },
    { title: "Due",      dataIndex: "due_date",        width: 95,  render: (v: string | null) => { if (!v) return <Text style={{ color: "#9ca3af", fontSize: 12 }}>—</Text>; const overdue = new Date(v) < new Date(); return <Text style={{ fontSize: 12, color: overdue ? "#dc2626" : "#374151" }}>{v}</Text>; } },
  ];
  const logCols = [
    { title: "Date",      dataIndex: "log_date",    width: 95,  render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text> },
    { title: "Work Item", dataIndex: "work_item",   ellipsis: true, render: (v: string, r: any) => <div><Text style={{ fontSize: 13 }}>{v || "—"}</Text>{r.ticket && <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 4 }}>{r.ticket}</span>}{r.project && <div style={{ fontSize: 11, color: "#9ca3af" }}>{r.project}</div>}</div> },
    { title: "Hours",     dataIndex: "hours",        width: 70,  render: (v: number) => <Text strong style={{ fontSize: 13 }}>{v}h</Text> },
    { title: "Billable",  dataIndex: "is_billable",  width: 80,  render: (v: boolean) => <Badge status={v ? "success" : "default"} text={<Text style={{ fontSize: 12 }}>{v ? "Yes" : "No"}</Text>} /> },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bms-bg)" }}>
      {/* Modals */}
      <ApplyLeaveModal  open={leaveModalOpen}       onClose={() => setLeaveModalOpen(false)}       onSuccess={() => { setLeaveModalOpen(false);       refresh(); }} />
      <WFHRequestModal  open={wfhModalOpen}         onClose={() => setWfhModalOpen(false)}         onSuccess={() => { setWfhModalOpen(false);         refresh(); }} />
      <ShiftChangeModal open={shiftChangeModalOpen} onClose={() => setShiftChangeModalOpen(false)} onSuccess={() => { setShiftChangeModalOpen(false); refresh(); } } employeeId={profile.id} />
      <Modal open={calendarOpen} onCancel={() => setCalendarOpen(false)} footer={null} width={860}
        title={<div style={{ display: "flex", alignItems: "center", gap: 8 }}><ScheduleOutlined style={{ color: "#059669" }} /><span>My Attendance Calendar</span></div>}
        styles={{ body: { padding: "20px 24px 24px" } }} destroyOnClose>
        <AttendanceCalendar employeeId={profile.id} />
      </Modal>
      <FollowUpCalendarModal
        open={followUpCalendarOpen}
        onClose={() => setFollowUpCalendarOpen(false)}
      />

      {/* Greeting */}
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0, color: "var(--bms-text)", fontWeight: 700 }}>
          {getGreeting(now.getHours())} <span style={{ color: "#f97316" }}>{profile.full_name.trim().split(/\s+/)[0]},</span>
        </Title>
        <Text style={{ color: "var(--bms-text-2)", fontSize: 13 }}>{dayjs(now).format("ddd DD MMM, hh:mm A")}</Text>
      </div>

      <Row gutter={[16, 16]}>
        {/* Profile */}
        <Col xs={24} sm={12} md={8} lg={6}>
          <Widget title="My Profile" icon={<UserOutlined />} iconColor="#3b82f6" bgColor="#eff6ff" borderColor="#bfdbfe">
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingBottom: 12 }}>
              {profile.profile_picture_url
                ? <Avatar size={72} src={profile.profile_picture_url} />
                : <Avatar size={72} style={{ background: "#1677ff", fontSize: 24, fontWeight: 700 }}>{avatarInitials(profile.full_name)}</Avatar>}
              <Title level={5} style={{ margin: "10px 0 2px", textAlign: "center", color: "var(--bms-text)" }}>{profile.full_name}</Title>
              <Text style={{ fontSize: 12, color: "var(--bms-text-3)", fontFamily: "monospace" }}>{profile.employee_code}</Text>
              {profile.keycloak_group && <Tag color="geekblue" style={{ marginTop: 6, borderRadius: 20, fontSize: 11 }}>{profile.keycloak_group}</Tag>}
            </div>
            <Divider style={{ margin: "8px 0" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {[
                { label: "Designation", value: profile.designation },
                { label: "Department",  value: profile.department  },
                { label: "Grade",       value: profile.grade       },
                { label: "Joined",      value: profile.joining_date ?? "—" },
                { label: "Email",       value: profile.email       },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <Text style={{ fontSize: 12, color: "var(--bms-text-3)", flexShrink: 0, marginRight: 8 }}>{label}</Text>
                  <Text style={{ fontSize: 12, color: "var(--bms-text)", textAlign: "right", wordBreak: "break-all" }}>{value || "—"}</Text>
                </div>
              ))}
            </div>
            {data?.reporting_hierarchy?.manager && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "14px 0 8px" }}>
                  <div style={{ flex: 1, height: 1, background: "var(--bms-border)" }} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: "var(--bms-text-3)", letterSpacing: 0.5, textTransform: "uppercase" }}>Reporting Line</span>
                  <div style={{ flex: 1, height: 1, background: "var(--bms-border)" }} />
                </div>
                <ReportingChain
                  managerId={data.reporting_hierarchy.manager.id}
                  managerName={data.reporting_hierarchy.manager.name}
                  managerCode={data.reporting_hierarchy.manager.employee_code}
                  managerDesig={data.reporting_hierarchy.manager.designation}
                  managerAvatar={data.reporting_hierarchy.manager.avatar}
                  selfId={profile.id} selfName={profile.full_name} selfCode={profile.employee_code}
                  selfDesig={profile.designation} selfAvatar={profile.profile_picture_url}
                  onNavigate={(id) => navigate(`/employees/${id}`)}
                />
              </>
            )}
          </Widget>
        </Col>

        {/* Right column */}
        <Col xs={24} sm={12} md={16} lg={18}>
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={14}>
              <Widget title="My Work Items" icon={<AppstoreOutlined />} iconColor="#16a34a" bgColor="#f0fdf4" borderColor="#bbf7d0"
                extra={work_items.overdue > 0 ? <Tag color="red" style={{ borderRadius: 20 }}>{work_items.overdue} overdue</Tag> : undefined}>
                <div style={{ display: "flex", gap: 8 }}>
                  <StatBox label="Open"        value={work_items.open}        color="#6366f1" icon={<FolderOpenOutlined />} />
                  <StatBox label="In Progress" value={work_items.in_progress} color="#f97316" icon={<SyncOutlined />} />
                  <StatBox label="In Review"   value={work_items.in_review}   color="#0891b2" icon={<EyeOutlined />} />
                  <StatBox label="Done"        value={work_items.done}        color="#16a34a" icon={<CheckCircleOutlined />} />
                </div>
              </Widget>
            </Col>
            <Col xs={24} lg={10}>
              <Widget title="This Week's Hours" icon={<ClockCircleOutlined />} iconColor="#f97316" bgColor="#fff7ed" borderColor="#fed7aa">
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 28, fontWeight: 700, color: weekPct >= 100 ? "#22c55e" : weekPct >= 60 ? "#1677ff" : "#f59e0b" }}>{timesheet.weekly_hours.toFixed(1)}</span>
                  <span style={{ fontSize: 14, color: "var(--bms-text-3)", marginLeft: 4 }}>/ {timesheet.expected_hours}h</span>
                </div>
                <Progress percent={weekPct} strokeColor={weekPct >= 100 ? "#22c55e" : weekPct >= 60 ? "#1677ff" : "#f59e0b"} showInfo={false} size="small" style={{ marginBottom: 8 }} />
                <Text style={{ fontSize: 11, color: "var(--bms-text-3)" }}>Monthly daily breakdown</Text>
                <MiniBarChart logs={timesheet.daily_logs} />
              </Widget>
            </Col>
            <Col xs={24} lg={12}>
              <AttendanceWidget
                today={attendance_today} month={attendance_month}
                shiftApplicable={profile.shift_applicable} wfhStatus={wfhStatus}
                onCheckIn={(s) => checkInMutation.mutate(s)}
                onCheckOut={() => checkOutMutation.mutate()}
                onBreakStart={(bt) => startBreakMutation.mutate(bt)}
                onBreakEnd={() => endBreakMutation.mutate()}
                checkingIn={checkInMutation.isPending} checkingOut={checkOutMutation.isPending}
                breakStarting={startBreakMutation.isPending} breakEnding={endBreakMutation.isPending}
                onViewCalendar={() => setCalendarOpen(true)}
                onRequestWFH={() => setWfhModalOpen(true)}
                onRequestShiftChange={() => setShiftChangeModalOpen(true)}
              />
            </Col>
            <Col xs={24} lg={12}>
              <WorkHoursStats stats={checkin_stats ?? { avg_working_hours: 0, avg_break_minutes: 0, total_working_hours: 0, total_break_minutes: 0, working_days_count: 0, on_time: 0, late: 0, early: 0 }} />
            </Col>
           <Col span={24}>
  <LeaveWidget balances={leave_balances} requests={leave_requests} onApply={() => setLeaveModalOpen(true)} />
</Col>
            <Col span={24}>
              <Widget title="My Active Projects" icon={<ProjectOutlined />} bgColor="#fffbeb" borderColor="#fde68a" iconColor="#d97706">
                {my_projects.length === 0 ? <Empty description="No active project allocations" image={Empty.PRESENTED_IMAGE_SIMPLE} /> : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {my_projects.map((p) => (
                      <div key={p.id} onClick={() => navigate("/projects")}
                        style={{ flex: "1 1 200px", maxWidth: 280, padding: "12px 14px", borderRadius: 10, cursor: "pointer", border: "1px solid var(--bms-border)", background: "var(--bms-surface-2)", transition: "box-shadow 0.15s" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                          <Text strong style={{ fontSize: 13, lineHeight: 1.3, color: "var(--bms-text)" }}>{p.name}</Text>
                          <Tag color={PROJECT_STATUS_COLOR[p.status] ?? "#6b7280"} style={{ fontSize: 10, borderRadius: 20, padding: "0 7px", marginLeft: 6, flexShrink: 0 }}>{p.status}</Tag>
                        </div>
                        {p.client && <Text style={{ fontSize: 11, color: "var(--bms-text-3)" }}>{p.client}</Text>}
                        <div style={{ marginTop: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <Text style={{ fontSize: 11, color: "var(--bms-text-2)" }}>Allocation</Text>
                            <Text style={{ fontSize: 12, fontWeight: 600, color: "#1677ff" }}>{p.allocation_percentage}%</Text>
                          </div>
                          <Progress percent={p.allocation_percentage} strokeColor="#1677ff" showInfo={false} size="small" />
                        </div>
                        {p.end_date && <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6 }}><CalendarOutlined style={{ fontSize: 11, color: "var(--bms-text-3)" }} /><Text style={{ fontSize: 11, color: "var(--bms-text-3)" }}>Until {p.end_date}</Text></div>}
                      </div>
                    ))}
                  </div>
                )}
              </Widget>
            </Col>
          </Row>
        </Col>

        <Col span={24}>
          {canFollowUp && (
            <PendingFollowUpsWidget
              items={pending_followups}
              onDone={(id) => followUpDoneMutation.mutate(id)}
              onOpenCalendar={() => setFollowUpCalendarOpen(true)}
            />
          )}
        </Col>
        <Col span={24}>
          <Widget title="Active Work Items" icon={<CodeOutlined />} bgColor="#f0f9ff" borderColor="#bae6fd" iconColor="#0284c7">
            <Table dataSource={recent_items} columns={itemCols} rowKey="id" size="small" pagination={false}
              locale={{ emptyText: <Empty description="No active work items assigned to you" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }} scroll={{ x: 600 }} />
          </Widget>
        </Col>
        <Col span={24}>
          <Widget
            title="This Week · Time Logs"
            icon={<ClockCircleOutlined />}
            bgColor="#f8fafc"
            borderColor="#e2e8f0"
            iconColor="#64748b"
            extra={
              recent_logs.length > LOG_VISIBLE_ROWS ? (
                <Text type="secondary" style={{ fontSize: 11 }}>{recent_logs.length} entries</Text>
              ) : undefined
            }
          >
            <Table
              dataSource={recent_logs}
              columns={logCols}
              rowKey="id"
              size="small"
              pagination={false}
              locale={{ emptyText: <Empty description="No time logs this week" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
              scroll={{ x: 500, y: recent_logs.length > LOG_VISIBLE_ROWS ? logScrollY : undefined }}
            />
          </Widget>
        </Col>
        <Col span={24}><PayslipWidget records={payslips ?? []} fy={payslips_fy ?? ""} /></Col>
      </Row>
    </div>
  );
}

// EyeOutlined is already imported above; duplicate import removed
