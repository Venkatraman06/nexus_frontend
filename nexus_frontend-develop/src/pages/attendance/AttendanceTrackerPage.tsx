import React, { useState, useEffect, Component } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Typography, Select, DatePicker, Card, Empty, Spin, Button,
  Space, Row, Col, Alert, Modal, Form, Input, TimePicker, message,
  Drawer, Divider, Tag, Tabs, Switch, Table, Tooltip, Badge, theme,
  Avatar,
} from "antd";
import {
  LoginOutlined, LogoutOutlined, CoffeeOutlined,
  PauseCircleOutlined, PlayCircleOutlined, EnvironmentOutlined,
  DownloadOutlined, UserOutlined, ClockCircleOutlined, PlusOutlined,
  TeamOutlined, CheckCircleOutlined, CloseCircleOutlined, CalendarOutlined,
  UnlockOutlined, FilterOutlined, HomeOutlined, ScheduleOutlined,
  SwapOutlined, AppstoreOutlined,
  ExclamationCircleOutlined,SyncOutlined
} from "@ant-design/icons";
import { Pie, Column } from "@ant-design/charts";
import dayjs, { Dayjs } from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { get, post, patch } from "@/services/api";
import { usePermission } from "@/hooks/usePermission";
import { PERMS, type BmsPermission } from "@/constants/permissions";
import { useAuthStore } from "@/store/auth";

dayjs.extend(isoWeek);


const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { useToken } = theme;

// ─── Types ────────────────────────────────────────────────────────────────────
interface TrackerEvent {
  type: string; time: string; label: string;
  lat?: number | null; lng?: number | null;
  break_type?: string; duration_minutes?: number;
}
interface BreakRecord {
  id: string; break_type: string; break_type_label: string;
  start_time: string; end_time: string | null; duration_minutes: number;
}
interface TrackerRecord {
  status: string; check_in: string | null; check_out: string | null;
  duration_hours: number; working_hours: number; total_break_minutes: number;
  check_in_lat: number | null; check_in_lng: number | null;
  check_out_lat: number | null; check_out_lng: number | null;
  breaks: BreakRecord[];
}
interface TrackerResponse {
  employee: { id: string; full_name: string; employee_code: string; designation: string; department: string };
  date: string; record: TrackerRecord | null; events: TrackerEvent[];
}
interface OverviewResponse {
  date: string; total_employees: number; marked: number; not_marked: number;
  counts: Record<string, number>;
  week_trend: Array<{ date: string; present: number; absent: number }>;
}
interface AttendanceRow {
  id: string; employee_id: string; employee_name: string; employee_code: string;
  department: string; division: string;
  date: string; status: string; check_in: string | null; check_out: string | null;
  working_hours: number; shift_name: string | null;
}
interface EnableEntry {
  id: string; employee_id: string; employee_name: string; employee_code: string;
  department: string; date: string; enabled: boolean; enabled_by: string | null;
  shift_name?: string | null;
  shift_category_name?: string | null;
  shift_start_time?: string | null;
  shift_end_time?: string | null;
  job_type?: string | null;
}
// ─── NEW: Shift assignment types ──────────────────────────────────────────────
interface ShiftCategory {
  id: string; name: string; start_time: string; end_time: string;
  shift_type?: string;
}
interface EmployeeShift {
  id: string; employee_id: string; employee_name: string; employee_code: string;
  department: string; shift_name: string; shift_id: string;
  start_time: string; end_time: string;
  effective_from: string; effective_to: string | null;
  employment_type?: string; job_type?: string;
}
interface EmployeeOption {
  id: string; full_name: string; employee_code: string; department?: string;
  employment_type?: string; job_type?: string;
}
// ─── NEW: Future schedule / job type types ────────────────────────────────────
interface FutureSchedule {
  date: string; shift_name: string | null; shift_id: string | null;
  job_type: string | null; employment_type: string | null;
  check_in: string | null; check_out: string | null;
  status: string | null;
}

interface ShiftCategory {
  id: string; name: string; start_time: string; end_time: string;
}

interface WFHSetting {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  department: string;
  wfh_enabled: boolean;
  updated_by: string | null;
}

// ─── Style maps ───────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  PRESENT:    { color: "#16a34a", bg: "#f0fdf4", label: "Present"    },
  WFH:        { color: "#2563eb", bg: "#eff6ff", label: "WFH"        },
  ABSENT:     { color: "#dc2626", bg: "#fff1f2", label: "Absent"     },
  HALF_DAY:   { color: "#d97706", bg: "#fffbeb", label: "Half Day"   },
  ON_LEAVE:   { color: "#7c3aed", bg: "#fdf4ff", label: "On Leave"   },
  HOLIDAY:    { color: "#0d9488", bg: "#f0fdfa", label: "Holiday"    },
  WEEKEND:    { color: "#6b7280", bg: "#f9fafb", label: "Weekend"    },
  NOT_MARKED: { color: "#9ca3af", bg: "#f3f4f6", label: "Not Marked" },
};
const PIE_COLORS: Record<string, string> = {
  PRESENT: "#16a34a", WFH: "#2563eb", ABSENT: "#dc2626",
  HALF_DAY: "#d97706", ON_LEAVE: "#7c3aed", HOLIDAY: "#0d9488",
  WEEKEND: "#6b7280", NOT_MARKED: "#d1d5db",
};
const EVENT_META: Record<string, { color: string; icon: React.ReactNode; bg: string }> = {
  CHECK_IN:    { color: "#16a34a", bg: "#f0fdf4", icon: <LoginOutlined />       },
  CHECK_OUT:   { color: "#dc2626", bg: "#fff1f2", icon: <LogoutOutlined />      },
  BREAK_START: { color: "#f59e0b", bg: "#fffbeb", icon: <PauseCircleOutlined /> },
  BREAK_END:   { color: "#3b82f6", bg: "#eff6ff", icon: <PlayCircleOutlined />  },
};

// ─── Job type / employment type color helpers ─────────────────────────────────
const JOB_TYPE_COLOR: Record<string, string> = {
  // FULL_TIME:  "#1677ff",
  // PART_TIME:  "#f59e0b",
  // CONTRACT:   "#7c3aed",
  // INTERN:     "#059669",
  // FREELANCE:  "#ea580c",
  ON_SITE:    "#16a34a",
  WFH:        "#2563eb",
  HYBRID:     "#7c3aed",
};
function jobTypeColor(jt: string | null | undefined): string {
  return JOB_TYPE_COLOR[jt ?? ""] ?? "#9ca3af";
}
function jobTypeLabel(jt: string | null | undefined): string {
  if (!jt) return "—";
  return jt.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Map error boundary ───────────────────────────────────────────────────────
interface EBState { hasError: boolean; error: string }
class MapErrorBoundary extends Component<{ children: React.ReactNode }, EBState> {
  state: EBState = { hasError: false, error: "" };
  static getDerivedStateFromError(e: Error): EBState { return { hasError: true, error: e.message }; }
  render() {
    if (this.state.hasError)
      return <Alert type="warning" message="Map could not be loaded" description={this.state.error} style={{ margin: 8 }} />;
    return this.props.children;
  }
}
const LeafletMap = React.lazy(() => import("./LeafletMap"));

// ─── Export helper ────────────────────────────────────────────────────────────
function downloadExport(year: number, month: number) {
  const token = localStorage.getItem("kc_access_token");
  const url   = `/bms/api/v1/attendance/export/?year=${year}&month=${month}`;
  fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    .then((r) => r.blob())
    .then((blob) => {
      const a   = document.createElement("a");
      const pad = (n: number) => String(n).padStart(2, "0");
      const ts  = `${year}_${pad(month)}_${new Date().toISOString().slice(0, 10).replace(/-/g, "_")}`;
      a.href = URL.createObjectURL(blob);
      a.download = `attendance_report_${ts}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
}

// ─── Shared filter bar ────────────────────────────────────────────────────────
interface FilterState { department: string; division: string; }
function AttendanceFilters({ filters, onChange }: {
  filters: FilterState;
  onChange: (f: Partial<FilterState>) => void;
}) {
  const { data: shifts } = useQuery<Array<{ id: string; name: string; start_time: string; end_time: string }>>({
  queryKey: ["shifts-list-attendance"],  // ← changed key to bust old cache
  queryFn:  () => get("/attendance/shift-categories/", { page_size: 500 }).then((d: any) => d.results ?? d),
  enabled: !!open,
  staleTime: 120_000,
});
  const { data: divisions } = useQuery<string[]>({
    queryKey: ["divisions-list"],
    queryFn: () => get("/master/divisions/?dropdown=1").then((d: any) => (d.results ?? d).map((x: any) => x.name)),
    staleTime: 120_000,
  });
  const { data: departments } = useQuery<string[]>({
    queryKey: ["departments-list"],
    queryFn: () => get("/master/departments/?dropdown=1").then((d: any) => (d.results ?? d).map((x: any) => x.name)),
    staleTime: 120_000,
  });
  return (
    <Space wrap>
      <Select
        allowClear placeholder="Filter by Department" style={{ width: 200 }}
        value={filters.department || undefined}
        onChange={(v) => onChange({ department: v ?? "" })}
        options={(departments ?? []).map((d) => ({ value: d, label: d }))}
        suffixIcon={<FilterOutlined />}
      />
      <Select
        allowClear placeholder="Filter by Division" style={{ width: 200 }}
        value={filters.division || undefined}
        onChange={(v) => onChange({ division: v ?? "" })}
        options={(divisions ?? []).map((d) => ({ value: d, label: d }))}
        suffixIcon={<FilterOutlined />}
      />
    </Space>
  );
}

// ─── Overview (Daily summary charts) ─────────────────────────────────────────
function AttendanceOverview({ date }: { date: Dayjs }) {
  const { token } = useToken();
  const { data, isLoading } = useQuery<OverviewResponse>({
    queryKey: ["attendance-overview", date.format("YYYY-MM-DD")],
    queryFn:  () => get(`/attendance/overview/?date=${date.format("YYYY-MM-DD")}`),
    staleTime: 30_000,
  });

  if (isLoading) return <div style={{ textAlign: "center", padding: 40 }}><Spin size="large" /></div>;
  if (!data) return null;

  const attendance_rate = data.total_employees > 0
    ? Math.round(((data.counts.PRESENT ?? 0) + (data.counts.WFH ?? 0)) / data.total_employees * 100) : 0;

  const pieData = Object.entries(data.counts)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ type: STATUS_STYLE[k]?.label ?? k, value: v, color: PIE_COLORS[k] ?? "#ccc" }));

  const trendData: Array<{ date: string; type: string; value: number }> = [];
  (data.week_trend ?? []).forEach((d) => {
    trendData.push({ date: d.date, type: "Present", value: d.present });
    trendData.push({ date: d.date, type: "Absent",  value: d.absent  });
  });

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {[
          { label: "Total Employees",  value: data.total_employees, color: "#1677ff", icon: <TeamOutlined /> },
          { label: "Present / WFH",    value: (data.counts.PRESENT ?? 0) + (data.counts.WFH ?? 0), color: "#16a34a", icon: <CheckCircleOutlined /> },
          { label: "Absent",           value: data.counts.ABSENT   ?? 0, color: "#dc2626", icon: <CloseCircleOutlined /> },
          { label: "On Leave",         value: data.counts.ON_LEAVE ?? 0, color: "#7c3aed", icon: <CalendarOutlined /> },
          { label: "Not Marked",       value: data.not_marked,           color: "#9ca3af", icon: <ClockCircleOutlined /> },
          { label: "Attendance Rate",  value: `${attendance_rate}%`,     color: attendance_rate >= 80 ? "#16a34a" : "#d97706", icon: <CheckCircleOutlined /> },
        ].map(({ label, value, color, icon }) => (
          <Col xs={12} sm={8} lg={4} key={label}>
            <Card size="small" style={{ borderRadius: 10, textAlign: "center", borderTop: `3px solid ${color}` }}>
              <div style={{ color, fontSize: 22, marginBottom: 4 }}>{icon}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: 11, color: token.colorTextDescription, marginTop: 2 }}>{label}</div>
            </Card>
          </Col>
        ))}
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <Card size="small" title={<span style={{ fontSize: 14, fontWeight: 600 }}>Today's Distribution</span>} style={{ borderRadius: 10 }}>
            {pieData.length === 0
              ? <Empty description="No data" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 40 }} />
              : (
                <Pie
                  data={pieData} angleField="value" colorField="type"
                  theme={{ background: "transparent" }}
                  color={({ type }: any) => pieData.find((d) => d.type === type)?.color ?? "#ccc"}
                  radius={0.85} innerRadius={0.6}
                  label={{ text: "value", style: { fontSize: 12 } }}
                  legend={{ position: "bottom", layout: "horizontal" }}
                  tooltip={{ title: "type" }} height={260}
                  statistic={{ title: { content: "Total" }, content: { content: String(data.marked) } }}
                />
              )}
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card size="small" title={<span style={{ fontSize: 14, fontWeight: 600 }}>7-Day Trend</span>} style={{ borderRadius: 10 }}>
            {trendData.length === 0
              ? <Empty description="No trend data" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 40 }} />
              : (
                <Column
                  data={trendData} xField="date" yField="value" seriesField="type"
                  color={({ type }: any) => type === "Present" ? "#16a34a" : "#dc2626"}
                  isGroup groupField="type" columnWidthRatio={0.6}
                  theme={{ background: "transparent" }}
                  legend={{ position: "top-right" }}
                  yAxis={{ label: { formatter: (v: string) => v }, grid: { line: { style: { stroke: token.colorBorderSecondary, lineWidth: 1, lineDash: [4, 4] } } } }}
                  xAxis={{ label: { style: { fill: token.colorTextSecondary } }, line: { style: { stroke: token.colorBorder } }, tickLine: { style: { stroke: token.colorBorder } } }}
                  height={260} tooltip={{ title: "date" }}
                />
              )}
          </Card>
        </Col>
      </Row>
      {pieData.length > 0 && (
        <Row gutter={[12, 12]} style={{ marginTop: 16 }}>
          {pieData.map(({ type, value, color }) => (
            <Col key={type}>
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                background: token.colorBgContainer, border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: 20, padding: "4px 14px", fontSize: 13,
              }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
                <span style={{ color: token.colorText }}>{type}</span>
                <span style={{ fontWeight: 700, color }}>{value}</span>
              </div>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}

// ─── Attendance list table ────────────────────────────────────────────────────
function AttendanceListTab({ mode, dateRange, singleDate, filters }: {
  mode: "daily" | "weekly" | "monthly" | "yearly";
  dateRange?: [Dayjs, Dayjs]; singleDate?: Dayjs; filters: FilterState;
}) {
  const canManage  = usePermission(PERMS.HRMS_ATTENDANCE_VIEW);
  const [drawerEmpId, setDrawerEmpId] = useState("");
  const [drawerDate,  setDrawerDate]  = useState<Dayjs>(dayjs());
  const [drawerOpen,  setDrawerOpen]  = useState(false);

  const params: Record<string, string> = { page_size: "500" };
  if (filters.department) params.department = filters.department;
  if (filters.division)   params.division   = filters.division;
  if (mode === "daily" && singleDate) {
    params.date = singleDate.format("YYYY-MM-DD");
  } else if (dateRange) {
    params.date_from = dateRange[0].format("YYYY-MM-DD");
    params.date_to   = dateRange[1].format("YYYY-MM-DD");
  }

  const { data, isLoading } = useQuery<AttendanceRow[]>({
    queryKey: ["attendance-list", mode, JSON.stringify(params)],
    queryFn:  () => get("/attendance/list/", params).then((d: any) => d.results ?? d),
    staleTime: 30_000,
  });

  const columns = [
    {
      title: "Employee", dataIndex: "employee_name", key: "employee_name",
      render: (name: string, row: AttendanceRow) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{name}</div>
          <div style={{ fontSize: 11, color: "var(--bms-text-3)", fontFamily: "monospace" }}>{row.employee_code}</div>
        </div>
      ),
    },
    { title: "Department", dataIndex: "department", key: "department", width: 140 },
    { title: "Division",   dataIndex: "division",   key: "division",   width: 130 },
    ...(mode !== "daily" ? [{ title: "Date", dataIndex: "date", key: "date", width: 110, render: (v: string) => dayjs(v).format("DD MMM YYYY") }] : []),
    {
      title: "Status", dataIndex: "status", key: "status", width: 120,
      render: (s: string) => {
        const ss = STATUS_STYLE[s] ?? STATUS_STYLE.NOT_MARKED;
        return <Tag color={ss.color} style={{ color: ss.color, background: ss.bg, border: `1px solid ${ss.color}33` }}>{ss.label}</Tag>;
      },
    },
    { title: "Check In",  dataIndex: "check_in",      key: "check_in",      width: 90,  render: (v: string | null) => v ?? "—" },
    { title: "Check Out", dataIndex: "check_out",     key: "check_out",     width: 90,  render: (v: string | null) => v ?? "—" },
    { title: "Hours",     dataIndex: "working_hours", key: "working_hours", width: 80,  render: (v: number) => v ? `${v}h` : "—" },
    { title: "Shift",     dataIndex: "shift_name",    key: "shift_name",    width: 120, render: (v: string | null) => v ?? <span style={{ color: "var(--bms-text-3)" }}>No shift</span> },
    ...(canManage ? [{
      title: "Action", key: "action", width: 100,
      render: (_: any, row: AttendanceRow) => (
        <Button size="small" type="link" icon={<UserOutlined />}
          onClick={() => { setDrawerEmpId(row.employee_id); setDrawerDate(dayjs(row.date)); setDrawerOpen(true); }}>
          View
        </Button>
      ),
    }] : []),
  ];

  return (
    <>
      <Table
        dataSource={data ?? []} columns={columns}
        rowKey={(r) => `${r.employee_id}-${r.date}`}
        loading={isLoading} size="small"
        pagination={{ pageSize: 50, showSizeChanger: true }}
        scroll={{ x: 900 }} style={{ borderRadius: 10 }}
      />
      <EmployeeAttendanceDrawer
        open={drawerOpen} empId={drawerEmpId} selDate={drawerDate}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}

// ─── FIX 4 & 5: Shift Assignment Panel ───────────────────────────────────────
// This was missing entirely — causes "shift assign showing no data" and
// "shift assigning not working" issues.
function ShiftAssignmentPanel() {
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const [editRecord, setEditRecord] = useState<EmployeeShift | null>(null);
  const [modalOpen, setModalOpen]   = useState(false);
  const [filterEmp, setFilterEmp]   = useState<string>("");

  const { data: employees = [] } = useQuery<EmployeeOption[]>({
    queryKey: ["employees-all-dropdown"],
    queryFn:  () => get("/employees/", { dropdown: 1, page_size: 500 }).then((d: any) => d.results ?? d),
    staleTime: 60_000,
  });

 const { data: shifts = [] } = useQuery<ShiftCategory[]>({
    queryKey: ["shift-categories-assign"],
    queryFn:  () => get("/attendance/shift-categories/", { page_size: 200 }).then((d: any) => d.results ?? d),
    staleTime: 120_000,
    retry: false,
  });

  // FIX: Fetch ALL employee shifts, not filtered — so data always shows
  const { data: assignments = [], isLoading } = useQuery<EmployeeShift[]>({
    queryKey: ["employee-shifts-all", filterEmp],
    queryFn:  () => {
      const params: any = { page_size: 500 };
      if (filterEmp) params.employee = filterEmp;
      return get("/attendance/employee-shifts/", params).then((d: any) => d.results ?? d);
    },
    staleTime: 0,
  });

  const saveMutation = useMutation({
    mutationFn: (payload: any) =>
      editRecord
        ? patch(`/attendance/employee-shifts/${editRecord.id}/`, payload)
        : post("/attendance/employee-shifts/", payload),
    onSuccess: () => {
      message.success(editRecord ? "Shift updated" : "Shift assigned");
      form.resetFields();
      setEditRecord(null);
      setModalOpen(false);
      qc.invalidateQueries({ queryKey: ["employee-shifts-all"] });
    },
    onError: (e: any) => {
  const status = e?.response?.status;
  if (status === 403) {
    message.error("You don't have permission to submit WFH requests. Contact HR to enable this for your account.");
    return;
  }
  const detail =
    e?.response?.data?.detail ||
    Object.entries(e?.response?.data ?? {})
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`)
      .join(", ") ||
    "Failed to submit WFH request";
  message.error(detail);
},
  });

  const openAdd = () => { setEditRecord(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (r: EmployeeShift) => {
    setEditRecord(r);
    form.setFieldsValue({
      employee:       r.employee_id,
      shift:          r.shift_id,
      effective_from: dayjs(r.effective_from),
      effective_to:   r.effective_to ? dayjs(r.effective_to) : null,
       job_type:       r.job_type ?? null,
    });
    setModalOpen(true);
  };

  const columns = [
    {
      title: "Employee", key: "employee",
      render: (_: any, r: EmployeeShift) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{r.employee_name}</div>
          <div style={{ fontSize: 11, color: "var(--bms-text-3)", fontFamily: "monospace" }}>{r.employee_code}</div>
          {r.department && <div style={{ fontSize: 11, color: "var(--bms-text-3)" }}>{r.department}</div>}
        </div>
      ),
    },
    {
      title: "Shift", key: "shift",
      render: (_: any, r: EmployeeShift) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{r.shift_name}</div>
          <div style={{ fontSize: 11, color: "var(--bms-text-3)" }}>
            {r.start_time?.slice(0, 5)} – {r.end_time?.slice(0, 5)}
          </div>
        </div>
      ),
    },
    {
      // FIX 1 & 3: Job type column — shows the employee's employment/job type
      title: "Job Type", key: "job_type", width: 130,
      render: (_: any, r: EmployeeShift) => {
        const jt = r.job_type ?? r.employment_type;
        return (
          <Tag style={{
            color: jobTypeColor(jt), background: jobTypeColor(jt) + "18",
            border: `1px solid ${jobTypeColor(jt)}33`, borderRadius: 20, fontSize: 11,
          }}>
            {jobTypeLabel(jt)}
          </Tag>
        );
      },
    },
    {
      title: "Effective From", dataIndex: "effective_from", key: "effective_from", width: 130,
      render: (v: string) => dayjs(v).format("DD MMM YYYY"),
    },
    {
      title: "Effective To", dataIndex: "effective_to", key: "effective_to", width: 130,
      render: (v: string | null) => v
        ? dayjs(v).format("DD MMM YYYY")
        : <span style={{ color: "var(--bms-text-3)" }}>Ongoing</span>,
    },
    {
      title: "Actions", key: "actions", width: 80,
      render: (_: any, r: EmployeeShift) => (
        <Button size="small" type="link" onClick={() => openEdit(r)}>Edit</Button>
      ),
    },
  ];

  return (
    <div>
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Space wrap>
          <Select
            showSearch allowClear placeholder="Filter by employee"
            style={{ width: 260 }} value={filterEmp || undefined}
            onChange={(v) => setFilterEmp(v ?? "")}
            options={employees.map((e) => ({ value: e.id, label: `${e.full_name} (${e.employee_code})` }))}
            filterOption={(input, opt) => (opt?.label as string ?? "").toLowerCase().includes(input.toLowerCase())}
            suffixIcon={<UserOutlined />}
          />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
          Assign Shift
        </Button>
      </div>

      <Table
        dataSource={assignments} columns={columns}
        rowKey="id" loading={isLoading} size="small"
        pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `${t} assignments` }}
        locale={{ emptyText: <Empty description="No shift assignments found" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 40 }} /> }}
        scroll={{ x: 800 }}
        style={{ borderRadius: 10 }}
      />

      {/* Add / Edit Modal */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ScheduleOutlined style={{ color: "#7c3aed" }} />
            <span>{editRecord ? "Edit Shift Assignment" : "Assign Shift to Employee"}</span>
          </div>
        }
        open={modalOpen}
        onCancel={() => { form.resetFields(); setEditRecord(null); setModalOpen(false); }}
        footer={null} width={480} destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}
          onFinish={(v) => saveMutation.mutate({
            employee:       v.employee,
            shift:          v.shift,
            effective_from: v.effective_from.format("YYYY-MM-DD"),
            effective_to:   v.effective_to ? v.effective_to.format("YYYY-MM-DD") : null,
              job_type:       v.job_type ?? null,
          })}>

          <Form.Item name="employee" label="Employee" rules={[{ required: true }]}>
            <Select
              showSearch placeholder="Select employee"
              disabled={!!editRecord}
              filterOption={(input, opt) => (opt?.label as string ?? "").toLowerCase().includes(input.toLowerCase())}
              options={employees.map((e) => ({
                value: e.id,
                label: `${e.full_name} (${e.employee_code})`,
              }))}
            />
          </Form.Item>

          <Form.Item name="shift" label="Shift" rules={[{ required: true }]}>
            <Select
              showSearch placeholder="Select shift"
              filterOption={(input, opt) => (opt?.label as string ?? "").toLowerCase().includes(input.toLowerCase())}
              options={shifts.map((s) => ({
                value: s.id,
                label: `${s.name} (${s.start_time?.slice(0, 5)} – ${s.end_time?.slice(0, 5)})`,
              }))}
            />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
            <Form.Item name="job_type" label="Job Type">
            <Select allowClear placeholder="Select job type (optional)">
              <Select.Option value="ON_SITE"><span style={{ color: "#16a34a", fontWeight: 500 }}>🏢 On Site</span></Select.Option>
              <Select.Option value="WFH"><span style={{ color: "#2563eb", fontWeight: 500 }}>🏠 WFH</span></Select.Option>
              <Select.Option value="HYBRID"><span style={{ color: "#7c3aed", fontWeight: 500 }}>🔀 Hybrid</span></Select.Option>
            </Select>
          </Form.Item>
              <Form.Item name="effective_from" label="Effective From" rules={[{ required: true }]}>
                <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="effective_to" label="Effective To">
                <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" placeholder="Leave blank = ongoing" />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 }}>
            <Button onClick={() => { form.resetFields(); setEditRecord(null); setModalOpen(false); }}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={saveMutation.isPending}
              style={{ background: "#7c3aed", borderColor: "#7c3aed" }}>
              {editRecord ? "Update" : "Assign Shift"}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

// ─── FIX 1 & 3: Job Type / Future Schedule Panel ─────────────────────────────
// Shows each employee's job type and their upcoming shift schedule for future dates.
function JobTypeSchedulePanel() {
  const [selEmp,   setSelEmp]   = useState<string>("");
  const [selMonth, setSelMonth] = useState<Dayjs>(dayjs());

  const { data: employees = [] } = useQuery<EmployeeOption[]>({
    queryKey: ["employees-all-dropdown"],
    queryFn:  () => get("/employees/", { dropdown: 1, page_size: 500 }).then((d: any) => d.results ?? d),
    staleTime: 60_000,
  });

  // Fetch future schedule for selected employee
  const { data: schedule = [], isLoading } = useQuery<FutureSchedule[]>({
    queryKey: ["future-schedule", selEmp, selMonth.format("YYYY-MM")],
    queryFn:  () => get("/attendance/schedule/", {
      employee:   selEmp,
      date_from:  selMonth.startOf("month").format("YYYY-MM-DD"),
      date_to:    selMonth.endOf("month").format("YYYY-MM-DD"),
    }).then((d: any) => d.results ?? d),
    enabled: !!selEmp,
    staleTime: 30_000,
  });

  // The selected employee object (to show their job type)
  const selectedEmp = employees.find((e) => e.id === selEmp);

  const futureDays = schedule.filter((s) => dayjs(s.date).isAfter(dayjs(), "day"));

  const columns = [
    {
      title: "Date", dataIndex: "date", key: "date", width: 130,
      render: (v: string) => {
        const d = dayjs(v);
        const isFuture = d.isAfter(dayjs(), "day");
        const isToday  = d.isSame(dayjs(), "day");
        return (
          <div>
            <div style={{ fontWeight: isToday ? 700 : 400, color: isToday ? "#1677ff" : "var(--bms-text)" }}>
              {d.format("DD MMM YYYY")}
            </div>
            {isFuture && <Tag color="blue" style={{ fontSize: 10, borderRadius: 20, padding: "0 6px", marginTop: 2 }}>Upcoming</Tag>}
            {isToday  && <Tag color="green" style={{ fontSize: 10, borderRadius: 20, padding: "0 6px", marginTop: 2 }}>Today</Tag>}
          </div>
        );
      },
    },
    {
      title: "Shift", key: "shift", width: 180,
      render: (_: any, r: FutureSchedule) => r.shift_name
        ? (
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{r.shift_name}</div>
            <div style={{ fontSize: 11, color: "var(--bms-text-3)" }}>
              {r.check_in?.slice(0, 5) ?? "—"} – {r.check_out?.slice(0, 5) ?? "—"}
            </div>
          </div>
        )
        : <span style={{ color: "var(--bms-text-3)", fontSize: 12 }}>No shift assigned</span>,
    },
    {
      // FIX 3: Job type shown per future date row
      title: "Job Type", key: "job_type", width: 130,
      render: (_: any, r: FutureSchedule) => {
        const jt = r.job_type ?? r.employment_type;
        return (
          <Tag style={{
            color: jobTypeColor(jt), background: jobTypeColor(jt) + "18",
            border: `1px solid ${jobTypeColor(jt)}33`, borderRadius: 20, fontSize: 11,
          }}>
            {jobTypeLabel(jt)}
          </Tag>
        );
      },
    },
    {
      title: "Status", dataIndex: "status", key: "status", width: 120,
      render: (v: string | null) => {
        if (!v) return <span style={{ color: "var(--bms-text-3)", fontSize: 12 }}>—</span>;
        const ss = STATUS_STYLE[v] ?? STATUS_STYLE.NOT_MARKED;
        return <Tag style={{ color: ss.color, background: ss.bg, border: `1px solid ${ss.color}33`, borderRadius: 20 }}>{ss.label}</Tag>;
      },
    },
  ];

  return (
    <div>
      <Card size="small" style={{ borderRadius: 10, marginBottom: 16 }}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AppstoreOutlined style={{ color: "#1677ff" }} />
            <span style={{ fontWeight: 600 }}>Job Type &amp; Future Schedule</span>
          </div>
        }>
        <Space wrap style={{ marginBottom: 16 }}>
          <Select
            showSearch placeholder="Select employee" style={{ width: 280 }}
            value={selEmp || undefined} onChange={(v) => setSelEmp(v ?? "")}
            allowClear onClear={() => setSelEmp("")}
            filterOption={(input, opt) => (opt?.label as string ?? "").toLowerCase().includes(input.toLowerCase())}
            options={employees.map((e) => ({ value: e.id, label: `${e.full_name} (${e.employee_code})` }))}
            suffixIcon={<UserOutlined />}
          />
          <DatePicker
            picker="month" value={selMonth} onChange={(d) => d && setSelMonth(d)}
            format="MMM YYYY" allowClear={false} style={{ width: 130 }}
          />
        </Space>

        {/* Employee job type summary card */}
        {selectedEmp && (
          <div style={{
            padding: "12px 16px", borderRadius: 10, marginBottom: 16,
            background: "var(--bms-surface-2)", border: "1px solid var(--bms-border)",
            display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
          }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--bms-text-3)" }}>Employee</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--bms-text)" }}>{selectedEmp.full_name}</div>
              <div style={{ fontSize: 11, color: "var(--bms-text-3)", fontFamily: "monospace" }}>{selectedEmp.employee_code}</div>
            </div>
            {selectedEmp.department && (
              <div>
                <div style={{ fontSize: 11, color: "var(--bms-text-3)" }}>Department</div>
                <div style={{ fontSize: 13, color: "var(--bms-text)" }}>{selectedEmp.department}</div>
              </div>
            )}
            <div>
              <div style={{ fontSize: 11, color: "var(--bms-text-3)", marginBottom: 4 }}>Job Type</div>
              <Tag style={{
                color: jobTypeColor(selectedEmp.job_type ?? selectedEmp.employment_type),
                background: jobTypeColor(selectedEmp.job_type ?? selectedEmp.employment_type) + "18",
                border: `1px solid ${jobTypeColor(selectedEmp.job_type ?? selectedEmp.employment_type)}33`,
                borderRadius: 20, fontSize: 12, padding: "2px 12px",
              }}>
                {jobTypeLabel(selectedEmp.job_type ?? selectedEmp.employment_type)}
              </Tag>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--bms-text-3)" }}>Upcoming days this month</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#1677ff" }}>{futureDays.length}</div>
            </div>
          </div>
        )}

        {!selEmp && (
          <Empty description="Select an employee to view their schedule and job type" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 40 }} />
        )}
        {selEmp && (
          <Table
            dataSource={schedule} columns={columns}
            rowKey="date" loading={isLoading} size="small"
            pagination={{ pageSize: 31, showSizeChanger: false }}
            rowClassName={(r) => dayjs(r.date).isAfter(dayjs(), "day") ? "future-row" : ""}
            locale={{ emptyText: <Empty description="No schedule data for this period" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
            scroll={{ x: 600 }}
            style={{ borderRadius: 10 }}
          />
        )}
      </Card>
    </div>
  );
}

// ─── WFH Settings Panel ───────────────────────────────────────────────────────
// HR uses this to toggle whether an employee is allowed to request / use WFH.
function WFHSettingsPanel() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [dept,   setDept]   = useState("");

  const { data: departments } = useQuery<string[]>({
    queryKey: ["departments-list"],
    queryFn: () =>
      get("/master/departments/?dropdown=1").then((d: any) =>
        (d.results ?? d).map((x: any) => x.name)
      ),
    staleTime: 120_000,
  });

  const { data: settings = [], isLoading, isError, refetch } = useQuery<WFHSetting[]>({
    queryKey: ["wfh-settings-list", dept],
    queryFn: () =>
      get("/attendance/wfh-settings/", {
        page_size: 500,
        ...(dept ? { department: dept } : {}),
      }).then((d: any) => d.results ?? d),
    staleTime: 0,
    retry: false,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ employeeId, enabled }: { employeeId: string; enabled: boolean }) =>
      post("/attendance/wfh-settings/", { employee: employeeId, wfh_enabled: enabled }),
    onSuccess: () => {
      message.success("WFH setting updated");
      qc.invalidateQueries({ queryKey: ["wfh-settings-list"] });
    },
    onError: (e: any) => {
      const detail =
        e?.response?.data?.detail ||
        Object.entries(e?.response?.data ?? {})
          .map(([k, v]: any) => `${k}: ${Array.isArray(v) ? v[0] : v}`)
          .join(", ") ||
        "Failed to update WFH setting";
      message.error(detail);
    },
  });

  // Client-side search filter
  const filtered = settings.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.employee_name.toLowerCase().includes(q) ||
      s.employee_code.toLowerCase().includes(q)
    );
  });

  const enabledCount  = settings.filter((s) => s.wfh_enabled).length;
  const disabledCount = settings.length - enabledCount;

  const columns = [
    {
      title: "Employee",
      key: "employee",
      render: (_: any, r: WFHSetting) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: "50%", background: "#2563eb",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 700, fontSize: 13, flexShrink: 0,
          }}>
            {r.employee_name.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{r.employee_name}</div>
            <div style={{ fontSize: 11, color: "var(--bms-text-3)", fontFamily: "monospace" }}>
              {r.employee_code}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Department",
      dataIndex: "department",
      key: "department",
      width: 160,
      render: (v: string) => v || <span style={{ color: "var(--bms-text-3)" }}>—</span>,
    },
    {
      title: "Updated By",
      dataIndex: "updated_by",
      key: "updated_by",
      width: 140,
      render: (v: string | null) => (
        <span style={{ fontSize: 12, color: "var(--bms-text-2)" }}>{v ?? "—"}</span>
      ),
    },
    {
      title: "WFH Allowed",
      key: "wfh_enabled",
      width: 160,
      render: (_: any, r: WFHSetting) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Switch
            checked={r.wfh_enabled}
            onChange={(val) =>
              toggleMutation.mutate({ employeeId: r.employee_id, enabled: val })
            }
            checkedChildren="Allowed"
            unCheckedChildren="Blocked"
            loading={toggleMutation.isPending}
            style={{
              background: r.wfh_enabled ? "#2563eb" : undefined,
            }}
          />
          {r.wfh_enabled ? (
            <span style={{ fontSize: 11, color: "#2563eb", fontWeight: 600 }}>
              Can request WFH
            </span>
          ) : (
            <span style={{ fontSize: 11, color: "var(--bms-text-3)" }}>
              Office only
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* Summary cards */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        {[
          {
            label: "WFH Allowed",
            value: enabledCount,
            color: "#2563eb",
            icon: <HomeOutlined />,
            desc: "Employees who can request WFH",
          },
          {
            label: "Office Only",
            value: disabledCount,
            color: "#6b7280",
            icon: <UserOutlined />,
            desc: "Employees restricted to office",
          },
          {
            label: "Total Employees",
            value: settings.length,
            color: "#1677ff",
            icon: <TeamOutlined />,
            desc: "In this view",
          },
        ].map(({ label, value, color, icon, desc }) => (
          <Col xs={24} sm={8} key={label}>
            <Card
              size="small"
              style={{ borderRadius: 10, borderTop: `3px solid ${color}`, textAlign: "center" }}
            >
              <div style={{ color, fontSize: 20, marginBottom: 4 }}>{icon}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: 12, color: "var(--bms-text-2)", fontWeight: 600 }}>{label}</div>
              <div style={{ fontSize: 11, color: "var(--bms-text-3)", marginTop: 2 }}>{desc}</div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Filter bar */}
      <Card size="small" style={{ borderRadius: 10, marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="Search employee name or code..."
            prefix={<UserOutlined style={{ color: "var(--bms-text-3)" }} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            style={{ width: 260 }}
          />
          <Select
            allowClear
            placeholder="Filter by department"
            style={{ width: 200 }}
            value={dept || undefined}
            onChange={(v) => setDept(v ?? "")}
            options={(departments ?? []).map((d) => ({ value: d, label: d }))}
            suffixIcon={<FilterOutlined />}
          />
          <Button
            icon={<SyncOutlined />}
            onClick={() => refetch()}
            loading={isLoading}
          >
            Refresh
          </Button>
        </Space>
      </Card>

      {/* Error state */}
      {isError && (
        <Alert
          type="error"
          showIcon
          message="Could not load WFH settings"
          description={
            <>
              The endpoint <code>/attendance/wfh-settings/</code> returned an error.
              Ask your backend developer to ensure this endpoint exists and HR has access.
            </>
          }
          style={{ marginBottom: 16, borderRadius: 10 }}
        />
      )}

      {/* Main table */}
      <Card size="small" style={{ borderRadius: 10 }}>
        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="employee_id"
          loading={isLoading}
          size="small"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (t) => `${t} employees`,
          }}
          scroll={{ x: 700 }}
          locale={{
            emptyText: (
              <Empty
                description={
                  isError
                    ? "Error loading data — see above"
                    : "No employees found. The backend may need a /attendance/wfh-settings/ endpoint."
                }
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ padding: 40 }}
              />
            ),
          }}
        />
      </Card>
    </div>
  );
}

// ─── FIX 4: Enable Clock-in Panel ────────────────────────────────────────────
// Was missing the HR permission guard causing it to not show. Now explicitly
// wrapped and properly fetching all entries.
function EnableClockInPanel() {
  const qc = useQueryClient();
  const [selEmp,     setSelEmp]     = useState<string>("");
  const [selDate,    setSelDate]    = useState<Dayjs>(dayjs());
  const [selShift,   setSelShift]   = useState<string>("");
  const [selJobType, setSelJobType] = useState<string>("");

  // FIX: fetch ALL employees (no shift_applicable filter) so HR sees everyone
  const { data: employees } = useQuery<Array<{ id: string; full_name: string; employee_code: string }>>({
    queryKey: ["employees-no-shift"],
    queryFn:  () => get("/employees/", { dropdown: 1, page_size: 500 }),
    select:   (d: any) => d.results ?? d,
    staleTime: 60_000,
  });

  // Fetch shift categories for the shift type dropdown
 const { data: shifts = [] } = useQuery<ShiftCategory[]>({
  queryKey: ["shift-categories-assign"],
  queryFn:  () => get("/attendance/shift-categories/", { page_size: 200 }).then((d: any) => d.results ?? d),
  staleTime: 120_000,
  retry: false,
});

  const { data: entries, isLoading, isError } = useQuery<EnableEntry[]>({
  queryKey: ["attendance-enable-list", selDate.format("YYYY-MM-DD")],
  queryFn:  () =>
    get("/attendance/enable-clockin/", { date: selDate.format("YYYY-MM-DD") })
      .then((d: any) => d.results ?? d),
  staleTime: 0,
  retry: false,
});
  const toggleMutation = useMutation({
    mutationFn: ({ empId, date, enabled, shift, jobType }: {
      empId: string; date: string; enabled: boolean;
      shift?: string; jobType?: string;
    }) =>
      post("/attendance/enable-clockin/", {
        employee: empId,
        date,
        enabled,
        ...(shift   ? { shift_category: shift }  : {}),
        ...(jobType ? { job_type: jobType }       : {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance-enable-list"] });
      message.success("Updated successfully");
    },
    onError: () => message.error("Failed to update"),
  });

  const handleAdd = () => {
    if (!selEmp) { message.warning("Select an employee"); return; }
    toggleMutation.mutate({
      empId:   selEmp,
      date:    selDate.format("YYYY-MM-DD"),
      enabled: true,
      shift:   selShift   || undefined,
      jobType: selJobType || undefined,
    });
    setSelEmp("");
    setSelShift("");
    setSelJobType("");
  };

  // Table columns — now includes Shift Type and Job Type
  const columns = [
    {
      title: "Employee",
      dataIndex: "employee_name",
      key: "employee_name",
      render: (name: string, row: EnableEntry) => (
        <div>
          <div style={{ fontWeight: 600 }}>{name}</div>
          <div style={{ fontSize: 11, color: "#6b7280", fontFamily: "monospace" }}>
            {row.employee_code}
          </div>
        </div>
      ),
    },
    {
      title: "Department",
      dataIndex: "department",
      key: "department",
      width: 140,
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      width: 120,
      render: (v: string) => dayjs(v).format("DD MMM YYYY"),
    },
    {
      // NEW: Shift type column
      title: "Shift Type",
      dataIndex: "shift_name",
      key: "shift_name",
      width: 150,
      render: (v: string | null, row: EnableEntry) => {
        const name = v ?? (row as any).shift_category_name ?? null;
        const time = (row as any).shift_start_time && (row as any).shift_end_time
          ? ` (${(row as any).shift_start_time.slice(0, 5)}–${(row as any).shift_end_time.slice(0, 5)})`
          : "";
        return name
          ? (
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{name}</div>
              {time && <div style={{ fontSize: 11, color: "#9ca3af" }}>{time}</div>}
            </div>
          )
          : <span style={{ color: "#9ca3af", fontSize: 12 }}>—</span>;
      },
    },
    {
      // NEW: Job type column (WFH / Hybrid / On-site)
      title: "Job Type",
      dataIndex: "job_type",
      key: "job_type",
      width: 110,
      render: (v: string | null) => {
        if (!v) return <span style={{ color: "#9ca3af", fontSize: 12 }}>—</span>;
        const JOB_COLOR: Record<string, string> = {
          WFH:     "#2563eb",
          HYBRID:  "#7c3aed",
          ON_SITE: "#16a34a",
        };
        const color = JOB_COLOR[v] ?? "#6b7280";
        return (
          <span style={{
            fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 20,
            color, background: color + "18", border: `1px solid ${color}33`,
          }}>
            {v.replace("_", " ")}
          </span>
        );
      },
    },
    {
      title: "Enabled By",
      dataIndex: "enabled_by",
      key: "enabled_by",
      width: 140,
      render: (v: string | null) => v ?? "—",
    },
    {
      title: "Clock-in Enabled",
      dataIndex: "enabled",
      key: "enabled",
      width: 150,
      render: (enabled: boolean, row: EnableEntry) => (
        <Switch
          checked={enabled}
          onChange={(val) =>
            toggleMutation.mutate({
              empId:   row.employee_id,
              date:    row.date,
              enabled: val,
              shift:   (row as any).shift_category_id ?? undefined,
    jobType: row.job_type ?? undefined,
            })
          }
          checkedChildren="Enabled"
          unCheckedChildren="Disabled"
          loading={toggleMutation.isPending}
        />
      ),
    },
  ];

  return (
    <div>
      {/* ── Enable form card ── */}
      <Card
        size="small"
        style={{ marginBottom: 16, borderRadius: 10 }}
        title={
          <span style={{ fontWeight: 600 }}>
            <UnlockOutlined style={{ color: "#1677ff", marginRight: 8 }} />
            Enable Clock-in for Specific Date
          </span>
        }
      >
        {/* Row 1: employee + date */}
        <Space wrap style={{ marginBottom: 10 }}>
          <Select
            showSearch
            placeholder="Select employee"
            style={{ width: 280 }}
            value={selEmp || undefined}
            onChange={(v) => setSelEmp(v ?? "")}
            allowClear
            onClear={() => setSelEmp("")}
            filterOption={(input, opt) =>
              (opt?.label as string ?? "").toLowerCase().includes(input.toLowerCase())
            }
            options={(employees ?? []).map((e) => ({
              value: e.id,
              label: `${e.full_name} (${e.employee_code})`,
            }))}
            suffixIcon={<UserOutlined />}
          />
          <DatePicker
            value={selDate}
            onChange={(d) => d && setSelDate(d)}
            format="DD MMM YYYY"
            allowClear={false}
            style={{ width: 160 }}
            disabledDate={(d) => d && d < dayjs().startOf("day")}
          />
        </Space>

        {/* Row 2: shift type + job type */}
        <Space wrap style={{ marginBottom: 12 }}>
          <Select
            allowClear
            placeholder="Shift type (optional)"
            style={{ width: 220 }}
            value={selShift || undefined}
            onChange={(v) => setSelShift(v ?? "")}
            suffixIcon={<ScheduleOutlined />}
          >
            {shifts.map((s) => (
              <Select.Option key={s.id} value={s.id}>
                {s.name}
                <span style={{ color: "#9ca3af", fontSize: 11, marginLeft: 6 }}>
                  ({s.start_time?.slice(0, 5)}–{s.end_time?.slice(0, 5)})
                </span>
              </Select.Option>
            ))}
          </Select>

          <Select
            allowClear
            placeholder="Job type (optional)"
            style={{ width: 180 }}
            value={selJobType || undefined}
            onChange={(v) => setSelJobType(v ?? "")}
          >
            <Select.Option value="ON_SITE">
              <span style={{ color: "#16a34a", fontWeight: 500 }}>🏢 On Site</span>
            </Select.Option>
            <Select.Option value="WFH">
              <span style={{ color: "#2563eb", fontWeight: 500 }}>🏠 WFH</span>
            </Select.Option>
            <Select.Option value="HYBRID">
              <span style={{ color: "#7c3aed", fontWeight: 500 }}>🔀 Hybrid</span>
            </Select.Option>
          </Select>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            loading={toggleMutation.isPending}
          >
            Enable Clock-in
          </Button>
        </Space>

        <div style={{ fontSize: 12, color: "#6b7280" }}>
          Select an employee and future date. Shift type and job type are optional —
          they help the employee know how they should work that day.
        </div>
      </Card>

      {/* ── Entries table card ── */}
      <Card
        size="small"
        style={{ borderRadius: 10 }}
        title={
          <Space>
            <span style={{ fontWeight: 600 }}>Enabled Entries for</span>
            <DatePicker
              value={selDate}
              onChange={(d) => d && setSelDate(d)}
              format="DD MMM YYYY"
              allowClear={false}
              style={{ width: 150 }}
            />
          </Space>
        }
      >
        {isError && (
  <Alert
    type="error"
    message="Could not load clock-in entries"
    description="The server returned an error. Check that /attendance/enable-clockin/ is accessible for HR users."
    style={{ marginBottom: 12 }}
    showIcon
  />
)}
        <Table
          dataSource={entries ?? []}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          size="small"
          pagination={{ pageSize: 20 }}
          scroll={{ x: 900 }}
          locale={{
            emptyText: (
              <Empty
                description="No entries enabled for this date"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ),
          }}
        />
      </Card>
    </div>
  );
}

// ─── HR Requests Panel (WFH + Shift Change approvals) ────────────────────────
function HRRequestsPanel() {
  const qc = useQueryClient();
  const { token } = useToken();
  const [activeSubTab,  setActiveSubTab]  = useState("wfh");
  const [statusFilter,  setStatusFilter]  = useState("PENDING");
  const [rejectTarget,  setRejectTarget]  = useState<{ id: string; type: "wfh" | "shift" } | null>(null);
  const [rejectNote,    setRejectNote]    = useState("");

  const { data: wfhData, isLoading: wfhLoading } = useQuery<{ results: any[]; pending_count: number }>({
    queryKey: ["wfh-requests-admin", statusFilter],
    queryFn:  () => get("/attendance/wfh-requests/admin/", { status: statusFilter }),
    staleTime: 0,
  });

  const { data: shiftData, isLoading: shiftLoading } = useQuery<{ results: any[]; pending_count: number }>({
    queryKey: ["shift-change-admin", statusFilter],
    queryFn:  () => get("/attendance/shift-change-requests/admin/", { status: statusFilter }),
    staleTime: 0,
  });

  const reviewMut = useMutation({
    mutationFn: ({ id, type, action, note }: { id: string; type: "wfh" | "shift"; action: string; note?: string }) => {
      const url = type === "wfh"
        ? `/attendance/wfh-requests/${id}/review/`
        : `/attendance/shift-change-requests/${id}/review/`;
      return post(url, { action, rejection_note: note ?? "" });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["wfh-requests-admin"] });
      qc.invalidateQueries({ queryKey: ["shift-change-admin"] });
      message.success(vars.action === "APPROVE" ? "Approved" : "Rejected");
      setRejectTarget(null);
      setRejectNote("");
    },
    onError: () => message.error("Failed to process request"),
  });

  const statusPill = (s: string) => {
    const cfg: Record<string, string> = { PENDING: "#d97706", APPROVED: "#16a34a", REJECTED: "#dc2626" };
    const color = cfg[s] ?? "#6b7280";
    return (
      <span style={{ fontSize: 11, fontWeight: 600, borderRadius: 20, padding: "2px 10px", background: color, color: "#fff", display: "inline-flex", alignItems: "center", gap: 4 }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#fff", opacity: 0.8 }} />
        {s}
      </span>
    );
  };

  const actionBtns = (id: string, type: "wfh" | "shift", currentStatus: string) => {
    if (currentStatus !== "PENDING") return <Text style={{ fontSize: 12, color: "var(--bms-text-3)" }}>—</Text>;
    return (
      <Space>
        <Button size="small" type="primary" icon={<CheckCircleOutlined />} loading={reviewMut.isPending}
          style={{ background: "#16a34a", borderColor: "#16a34a" }}
          onClick={() => reviewMut.mutate({ id, type, action: "APPROVE" })}>
          Approve
        </Button>
        <Button size="small" danger icon={<CloseCircleOutlined />}
          onClick={() => { setRejectTarget({ id, type }); setRejectNote(""); }}>
          Reject
        </Button>
      </Space>
    );
  };

  const wfhPending   = wfhData?.pending_count  ?? 0;
  const shiftPending = shiftData?.pending_count ?? 0;

  const wfhCols = [
    { title: "Employee", key: "employee", render: (_: any, r: any) => (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Avatar size={34} style={{ background: "#1677ff", fontWeight: 700 }}>{r.employee_name?.slice(0, 1).toUpperCase()}</Avatar>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: "var(--bms-text)" }}>{r.employee_name}</div>
          <div style={{ fontSize: 11, color: "var(--bms-text-3)", fontFamily: "monospace" }}>{r.employee_code}</div>
          <div style={{ fontSize: 11, color: "var(--bms-text-3)" }}>{r.department}</div>
        </div>
      </div>
    )},
    { title: "WFH Date", dataIndex: "requested_date", key: "date", width: 130,
      render: (v: string) => <Tag color="blue">{dayjs(v).format("DD MMM YYYY")}</Tag> },
    { title: "Reason", dataIndex: "reason", key: "reason", ellipsis: true,
      render: (v: string) => <Text style={{ fontSize: 12, color: "var(--bms-text-2)" }}>{v || "—"}</Text> },
    { title: "Status", dataIndex: "status", key: "status", width: 110, render: (v: string) => statusPill(v) },
    { title: "Submitted", dataIndex: "created_at", key: "created_at", width: 140,
      render: (v: string) => <Text style={{ fontSize: 11, color: "var(--bms-text-3)" }}>{dayjs(v).format("DD MMM, HH:mm")}</Text> },
    { title: "Rejection Note", dataIndex: "rejection_note", key: "note", width: 160, ellipsis: true,
      render: (v: string) => v ? <Text style={{ fontSize: 12, color: "#dc2626" }}>{v}</Text> : "—" },
    { title: "Action", key: "action", width: 170, render: (_: any, r: any) => actionBtns(r.id, "wfh", r.status) },
  ];

  const shiftCols = [
    { title: "Employee", key: "employee", render: (_: any, r: any) => (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Avatar size={34} style={{ background: "#7c3aed", fontWeight: 700 }}>{r.employee_name?.slice(0, 1).toUpperCase()}</Avatar>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: "var(--bms-text)" }}>{r.employee_name}</div>
          <div style={{ fontSize: 11, color: "var(--bms-text-3)", fontFamily: "monospace" }}>{r.employee_code}</div>
        </div>
      </div>
    )},
    { title: "Type", dataIndex: "request_type", key: "type", width: 120,
      render: (v: string) => <Tag color={v === "PERMANENT" ? "purple" : "blue"}>{v}</Tag> },
    { title: "Date", dataIndex: "requested_date", key: "date", width: 120,
      render: (v: string | null) => v ? dayjs(v).format("DD MMM YYYY") : <Text style={{ color: "var(--bms-text-3)" }}>Permanent</Text> },
    { title: "Requested Shift", dataIndex: "shift_name", key: "shift", width: 160,
      render: (v: string | null) => v ?? "—" },
    { title: "Reason", dataIndex: "reason", key: "reason", ellipsis: true,
      render: (v: string) => <Text style={{ fontSize: 12, color: "var(--bms-text-2)" }}>{v || "—"}</Text> },
    { title: "Status", dataIndex: "status", key: "status", width: 110, render: (v: string) => statusPill(v) },
    { title: "Rejection Note", dataIndex: "rejection_note", key: "note", width: 160, ellipsis: true,
      render: (v: string) => v ? <Text style={{ fontSize: 12, color: "#dc2626" }}>{v}</Text> : "—" },
    { title: "Action", key: "action", width: 170, render: (_: any, r: any) => actionBtns(r.id, "shift", r.status) },
  ];

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {[
          { label: "Pending WFH",          value: wfhPending,                color: "#2563eb", icon: <HomeOutlined /> },
          { label: "Pending Shift Changes", value: shiftPending,              color: "#7c3aed", icon: <ScheduleOutlined /> },
          { label: "Total Pending",         value: wfhPending + shiftPending, color: "#d97706", icon: <ExclamationCircleOutlined /> },
        ].map(({ label, value, color, icon }) => (
          <Col xs={24} sm={8} key={label}>
            <Card size="small" style={{ borderRadius: 10, textAlign: "center", borderTop: `3px solid ${color}` }}>
              <div style={{ color, fontSize: 20, marginBottom: 4 }}>{icon}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: 12, color: token.colorTextDescription }}>{label}</div>
            </Card>
          </Col>
        ))}
      </Row>

      <div style={{ marginBottom: 14 }}>
        <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 160 }}
          options={[
            { value: "PENDING",  label: "Pending"  },
            { value: "APPROVED", label: "Approved" },
            { value: "REJECTED", label: "Rejected" },
          ]}
        />
      </div>

      <Tabs activeKey={activeSubTab} onChange={setActiveSubTab} type="card"
        items={[
          {
            key: "wfh",
            label: <span><HomeOutlined /> WFH Requests {wfhPending > 0 && <Badge count={wfhPending} style={{ marginLeft: 6 }} />}</span>,
            children: (
              <Card size="small" style={{ borderRadius: "0 0 10px 10px", borderTop: "none" }}>
                <Table dataSource={wfhData?.results ?? []} columns={wfhCols} rowKey="id"
                  loading={wfhLoading} size="small" pagination={{ pageSize: 20, showSizeChanger: true }}
                  scroll={{ x: 1000 }}
                  locale={{ emptyText: <Empty description="No WFH requests" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                />
              </Card>
            ),
          },
          {
            key: "shift",
            label: <span><ScheduleOutlined /> Shift Change Requests {shiftPending > 0 && <Badge count={shiftPending} style={{ marginLeft: 6 }} />}</span>,
            children: (
              <Card size="small" style={{ borderRadius: "0 0 10px 10px", borderTop: "none" }}>
                <Table dataSource={shiftData?.results ?? []} columns={shiftCols} rowKey="id"
                  loading={shiftLoading} size="small" pagination={{ pageSize: 20, showSizeChanger: true }}
                  scroll={{ x: 1100 }}
                  locale={{ emptyText: <Empty description="No shift change requests" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                />
              </Card>
            ),
          },
        ]}
      />

      <Modal
        title={<span><ExclamationCircleOutlined style={{ color: "#dc2626", marginRight: 8 }} />Reject Request</span>}
        open={!!rejectTarget}
        onCancel={() => { setRejectTarget(null); setRejectNote(""); }}
        onOk={() => rejectTarget && reviewMut.mutate({ ...rejectTarget, action: "REJECT", note: rejectNote })}
        okText="Reject" okButtonProps={{ danger: true, loading: reviewMut.isPending }}
        destroyOnClose
      >
        <Text style={{ fontSize: 13, color: "var(--bms-text)" }}>Provide a reason (visible to employee):</Text>
        <Input.TextArea rows={3} value={rejectNote} onChange={(e) => setRejectNote(e.target.value)}
          placeholder="e.g. Insufficient notice, team meeting required..." style={{ marginTop: 10 }} />
      </Modal>
    </div>
  );
}
// ─── Add Attendance Modal ─────────────────────────────────────────────────────
function AddAttendanceModal({ open, empId, date, onClose, onSaved }: {
  open: boolean; empId: string; date: Dayjs; onClose: () => void; onSaved: () => void;
}) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) form.resetFields(); }, [open, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      await post("/attendance/tracker/", {
        employee:  empId, date: date.format("YYYY-MM-DD"), status: values.status,
        check_in:  values.check_in  ? dayjs(values.check_in).format("HH:mm")  : null,
        check_out: values.check_out ? dayjs(values.check_out).format("HH:mm") : null,
        notes:     values.notes ?? "",
      });
      message.success("Attendance record saved");
      onSaved(); onClose();
    } catch { message.error("Failed to save attendance"); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="Add Attendance Record" open={open} onOk={handleOk} onCancel={onClose}
      confirmLoading={saving} okText="Save" destroyOnClose>
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Form.Item name="status" label="Status" initialValue="PRESENT" rules={[{ required: true }]}>
          <Select options={[
            { value: "PRESENT",  label: "Present"        },
            { value: "WFH",      label: "Work From Home" },
            { value: "HALF_DAY", label: "Half Day"       },
            { value: "ON_LEAVE", label: "On Leave"       },
            { value: "HOLIDAY",  label: "Holiday"        },
            { value: "WEEKEND",  label: "Weekend"        },
            { value: "ABSENT",   label: "Absent"         },
          ]} />
        </Form.Item>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="check_in"  label="Check In" ><TimePicker format="HH:mm" style={{ width: "100%" }} /></Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="check_out" label="Check Out"><TimePicker format="HH:mm" style={{ width: "100%" }} /></Form.Item>
          </Col>
        </Row>
        <Form.Item name="notes" label="Notes">
          <Input.TextArea rows={2} placeholder="Optional notes" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ─── Employee Attendance Drawer ───────────────────────────────────────────────
function EmployeeAttendanceDrawer({ open, empId, selDate, onClose }: {
  open: boolean; empId: string; selDate: Dayjs; onClose: () => void;
}) {
  const canManageAttendance = usePermission(PERMS.HRMS_LEAVE_MANAGE);
  const [addOpen, setAddOpen] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<TrackerResponse>({
    queryKey: ["attendance-tracker", empId, selDate.format("YYYY-MM-DD")],
    queryFn:  () => get(`/attendance/tracker/?employee=${empId}&date=${selDate.format("YYYY-MM-DD")}`),
    enabled:  open && !!empId, staleTime: 0,
  });

  const rec = data?.record ?? null;
  const mapPoints: Array<{ lat: number; lng: number; label: string; time: string; color: string }> = [];
  if (rec?.check_in_lat  != null && rec.check_in_lng  != null)
    mapPoints.push({ lat: rec.check_in_lat,  lng: rec.check_in_lng,  label: "Start", time: rec.check_in  ?? "", color: "#16a34a" });
  if (rec?.check_out_lat != null && rec.check_out_lng != null)
    mapPoints.push({ lat: rec.check_out_lat, lng: rec.check_out_lng, label: "End",   time: rec.check_out ?? "", color: "#dc2626" });

  const drawerTitle = data ? (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#1677ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
        {data.employee.full_name.slice(0, 1).toUpperCase()}
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>{data.employee.full_name}</div>
        <div style={{ fontSize: 12, color: "var(--bms-text-3)", fontFamily: "monospace" }}>{data.employee.employee_code}</div>
      </div>
      <Tag style={{ marginLeft: "auto", marginRight: 0 }}>{selDate.format("DD MMM YYYY")}</Tag>
    </div>
  ) : "Attendance Detail";

  return (
    <>
      <Drawer open={open} onClose={onClose} width={520} title={drawerTitle} destroyOnClose styles={{ body: { padding: 20 } }}>
        {isLoading && <div style={{ textAlign: "center", padding: 60 }}><Spin size="large" /></div>}
        {!isLoading && data && (
          <>
            {rec && (() => {
              const ss = STATUS_STYLE[rec.status] ?? STATUS_STYLE.ABSENT;
              return (
                <div style={{ marginBottom: 16 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: ss.color, background: ss.bg, border: `1px solid ${ss.color}33`, borderRadius: 20, padding: "4px 16px" }}>{ss.label}</span>
                </div>
              );
            })()}
            {!rec && (
              <Empty description="No attendance record for this date" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 40 }}>
                {canManageAttendance && (
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>Add Attendance</Button>
                )}
              </Empty>
            )}
            {rec && (
              <>
                <Row gutter={10} style={{ marginBottom: 16 }}>
                  {[
                    { label: "Check In",  value: rec.check_in  ?? "—", color: "#16a34a", icon: <LoginOutlined />       },
                    { label: "Check Out", value: rec.check_out ?? "—", color: "#dc2626", icon: <LogoutOutlined />      },
                    { label: "Working",   value: `${rec.working_hours}h`, color: "#1677ff", icon: <ClockCircleOutlined /> },
                    { label: "Break",     value: `${rec.total_break_minutes}m`, color: "#f59e0b", icon: <CoffeeOutlined /> },
                  ].map(({ label, value, color, icon }) => (
                    <Col span={6} key={label}>
                      <Card size="small" style={{ borderRadius: 10, textAlign: "center", padding: 0 }}>
                        <div style={{ color, fontSize: 16, marginBottom: 2 }}>{icon}</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color }}>{value}</div>
                        <div style={{ fontSize: 10, color: "var(--bms-text-3)" }}>{label}</div>
                      </Card>
                    </Col>
                  ))}
                </Row>
                <Divider style={{ margin: "12px 0" }} />
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: "var(--bms-text)" }}>Day Timeline</div>
                {data.events.length === 0 ? <Empty description="No events recorded" image={Empty.PRESENTED_IMAGE_SIMPLE} /> : (
                  <div style={{ position: "relative", paddingLeft: 28 }}>
                    <div style={{ position: "absolute", left: 9, top: 8, bottom: 8, width: 2, background: "var(--bms-border)" }} />
                    {data.events.map((ev, idx) => {
                      const meta = EVENT_META[ev.type] ?? EVENT_META.CHECK_IN;
                      return (
                        <div key={idx} style={{ position: "relative", marginBottom: 14 }}>
                          <div style={{ position: "absolute", left: -23, top: 2, width: 18, height: 18, borderRadius: "50%", background: meta.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 9, border: "2px solid #fff", boxShadow: `0 0 0 2px ${meta.color}40` }}>
                            {meta.icon}
                          </div>
                          <div style={{ background: meta.bg, borderRadius: 8, padding: "7px 11px", border: `1px solid ${meta.color}22` }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <Text strong style={{ fontSize: 12, color: meta.color }}>{ev.label}</Text>
                              <Text style={{ fontSize: 11, color: "var(--bms-text-3)", fontFamily: "monospace" }}>{ev.time}</Text>
                            </div>
                            {ev.duration_minutes != null && <Text style={{ fontSize: 11, color: "var(--bms-text-3)" }}>Duration: {ev.duration_minutes} min</Text>}
                            {ev.lat != null && ev.lng != null && (
                              <div style={{ marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
                                <EnvironmentOutlined style={{ fontSize: 10, color: "var(--bms-text-3)" }} />
                                <Text style={{ fontSize: 10, color: "var(--bms-text-3)", fontFamily: "monospace" }}>{ev.lat.toFixed(5)}, {ev.lng.toFixed(5)}</Text>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {mapPoints.length > 0 && (
                  <>
                    <Divider style={{ margin: "12px 0" }} />
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: "var(--bms-text)", display: "flex", alignItems: "center", gap: 6 }}>
                      <EnvironmentOutlined style={{ color: "#1677ff" }} /> Location Track
                    </div>
                    <MapErrorBoundary>
                      <React.Suspense fallback={<div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center" }}><Spin /></div>}>
                        <LeafletMap points={mapPoints} />
                      </React.Suspense>
                    </MapErrorBoundary>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 10 }}>
                      {mapPoints.map((p) => (
                        <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                          <Text style={{ fontSize: 12, color: "var(--bms-text)", minWidth: 36 }}>{p.label}</Text>
                          {p.time && <Text style={{ fontSize: 12, color: "var(--bms-text-2)" }}>{p.time}</Text>}
                          <Text style={{ fontSize: 11, color: "var(--bms-text-3)", fontFamily: "monospace" }}>{p.lat.toFixed(5)}, {p.lng.toFixed(5)}</Text>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}
      </Drawer>
      <AddAttendanceModal
        open={addOpen} empId={empId} date={selDate}
        onClose={() => setAddOpen(false)}
        onSaved={() => qc.invalidateQueries({ queryKey: ["attendance-tracker", empId, selDate.format("YYYY-MM-DD")] })}
      />
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AttendanceTrackerPage() {
  const canManage = usePermission(PERMS.HRMS_ATTENDANCE_VIEW) 
               || usePermission(PERMS.HRMS_LEAVE_MANAGE);
   const permissions   = useAuthStore((s) => s.permissions);  // ADD
  console.log("HR permissions:", permissions);                // ADD
  console.log("canManage:", canManage); 
  const canWFHApprove = usePermission("bms.hrms.wfh.approve" as BmsPermission);
  const { token }     = useToken();

  const [activeTab,  setActiveTab]  = useState("daily");
  const [exportMon,  setExportMon]  = useState<Dayjs>(dayjs());
  const [filters,    setFilters]    = useState<FilterState>({ department: "", division: "" });

  const [dailyDate,  setDailyDate]  = useState<Dayjs>(dayjs());
  const [weekRange,  setWeekRange]  = useState<[Dayjs, Dayjs]>([dayjs().startOf("isoWeek"), dayjs().endOf("isoWeek")]);
  const [monthDate,  setMonthDate]  = useState<Dayjs>(dayjs());
  const [yearDate,   setYearDate]   = useState<Dayjs>(dayjs());

  const [empId,      setEmpId]      = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: employees } = useQuery<Array<{ id: string; full_name: string; employee_code: string }>>({
    queryKey: ["employees-shift-dropdown"],
    queryFn:  () => get("/employees/", { dropdown: 1, page_size: 500 }).then((d: any) => d.results ?? d),
    staleTime: 60_000,
  });

  const DateControl = () => {
    if (activeTab === "daily") return (
      <DatePicker value={dailyDate} onChange={(d) => d && setDailyDate(d)}
        format="DD MMM YYYY" disabledDate={(d) => d > dayjs().endOf("day")} allowClear={false} style={{ width: 160 }} />
    );
    if (activeTab === "weekly") return (
      <RangePicker value={weekRange} onChange={(v) => v && v[0] && v[1] && setWeekRange([v[0], v[1]])}
        format="DD MMM" allowClear={false} style={{ width: 240 }} picker="week" />
    );
    if (activeTab === "monthly") return (
      <DatePicker picker="month" value={monthDate} onChange={(d) => d && setMonthDate(d)}
        format="MMM YYYY" allowClear={false} style={{ width: 130 }} />
    );
    if (activeTab === "yearly") return (
      <DatePicker picker="year" value={yearDate} onChange={(d) => d && setYearDate(d)}
        format="YYYY" allowClear={false} style={{ width: 100 }} />
    );
    return null;
  };

  // ─── FIX: All 5 tabs in correct order ─────────────────────────────────────
  // 1. daily  2. weekly  3. monthly  4. yearly
  // 5. job-type-schedule  ← FIX 1 & 3: was missing entirely
  // 6. shift-assign       ← FIX 2 & 5: was missing entirely
  // 7. enable-clockin     ← FIX 4: only shown when canManage is true
  const tabItems = [
    {
      key: "daily",
      label: <span><CalendarOutlined /> Daily</span>,
      children: (
        <>
          <div style={{ marginBottom: 20 }}>
            <AttendanceOverview date={dailyDate} />
          </div>
          <Divider style={{ margin: "16px 0" }} />
          {canManage && (
            <Card size="small" style={{ marginBottom: 16, borderRadius: 10 }}
              title={<span style={{ fontWeight: 600 }}><UserOutlined style={{ color: "#1677ff", marginRight: 8 }} />View Individual Employee Attendance</span>}>
              <Space wrap>
                <Select showSearch placeholder="Select employee" style={{ width: 280 }}
                  value={empId || undefined} onChange={(v) => setEmpId(v ?? "")}
                  allowClear onClear={() => setEmpId("")}
                  filterOption={(input, opt) => (opt?.label as string ?? "").toLowerCase().includes(input.toLowerCase())}
                  options={(employees ?? []).map((e) => ({ value: e.id, label: `${e.full_name} (${e.employee_code})` }))}
                  suffixIcon={<UserOutlined />}
                />
                <Button type="primary" icon={<UserOutlined />}
                  onClick={() => { if (!empId) { message.warning("Select an employee first"); return; } setDrawerOpen(true); }}>
                  View Attendance
                </Button>
              </Space>
            </Card>
          )}
          <AttendanceListTab mode="daily" singleDate={dailyDate} filters={filters} />
        </>
      ),
    },
    {
      key: "weekly",
      label: <span><ClockCircleOutlined /> Weekly</span>,
      children: <AttendanceListTab mode="weekly" dateRange={weekRange} filters={filters} />,
    },
    {
      key: "monthly",
      label: <span><CalendarOutlined /> Monthly</span>,
      children: <AttendanceListTab mode="monthly" dateRange={[monthDate.startOf("month"), monthDate.endOf("month")]} filters={filters} />,
    },
    {
      key: "yearly",
      label: <span><CalendarOutlined /> Yearly</span>,
      children: <AttendanceListTab mode="yearly" dateRange={[yearDate.startOf("year"), yearDate.endOf("year")]} filters={filters} />,
    },
    // ── FIX 1 & 3: Job Type / Future Schedule tab ────────────────────────────
    {
      key: "job-type-schedule",
      label: (
        <span>
          <AppstoreOutlined /> Job Type &amp; Schedule
        </span>
      ),
      children: <JobTypeSchedulePanel />,
    },
    // ── FIX 2 & 5: Shift Assignment tab (was completely missing) ─────────────
    // ── WFH Settings tab — HR toggles per-employee WFH permission ────────────
...(canManage ? [{
  key: "wfh-settings",
  label: (
    <span>
      <HomeOutlined /> WFH Settings
      <Tooltip title="Control which employees can request Work From Home">
        <Badge count="HR" style={{ marginLeft: 6, background: "#2563eb", fontSize: 10 }} />
      </Tooltip>
    </span>
  ),
  children: <WFHSettingsPanel />,
}] : []),
    ...(canManage ? [{
      key: "shift-assign",
      label: (
        <span>
          <SwapOutlined /> Shift Assignment
          <Tooltip title="Assign or update employee shift schedules">
            <Badge count="HR" style={{ marginLeft: 6, background: "#7c3aed", fontSize: 10 }} />
          </Tooltip>
        </span>
      ),
      children: <ShiftAssignmentPanel />,
    }] : []),
    // ── FIX 4: Enable Clock-in tab — guard with canManage ────────────────────
    ...(canManage ? [{
      key: "enable-clockin",
      label: (
        <span>
          <UnlockOutlined /> Enable Clock-in
          <Tooltip title="Grant specific employees permission to clock in for a particular date">
            <Badge count="HR" style={{ marginLeft: 6, background: "#1677ff", fontSize: 10 }} />
          </Tooltip>
        </span>
      ),
      children: <EnableClockInPanel />,
    }] : []),
  ];

  // Pending counts for HR Requests badge
  const { data: wfhSummary }   = useQuery<{ pending_count: number }>({
    queryKey: ["wfh-requests-admin", "PENDING"],
    queryFn:  () => get("/attendance/wfh-requests/admin/", { status: "PENDING" }),
    staleTime: 60_000,
    enabled: canManage,
  });
  const { data: shiftSummary } = useQuery<{ pending_count: number }>({
    queryKey: ["shift-change-admin", "PENDING"],
    queryFn:  () => get("/attendance/shift-change-requests/admin/", { status: "PENDING" }),
    staleTime: 60_000,
    enabled: canManage,
  });
  const totalPending = (wfhSummary?.pending_count ?? 0) + (shiftSummary?.pending_count ?? 0);

  // ── HR Requests tab — WFH + Shift Change approvals ────────────────────────
  const hrRequestsItems = canManage ? [{
    key: "hr-requests",
    label: (
      <span>
        <ExclamationCircleOutlined /> HR Requests
        {totalPending > 0 && (
          <Badge count={totalPending} style={{ marginLeft: 6, background: "#d97706" }} />
        )}
      </span>
    ),
    children: <HRRequestsPanel />,
  }] : [];

  // Add HR Requests tab to tabs
  const allTabs = [
    ...tabItems,
    ...hrRequestsItems,
  ];
  

  return (
    <div style={{ background: token.colorBgLayout, minHeight: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Attendance Tracker</Title>
          <Text style={{ color: token.colorTextDescription, fontSize: 13 }}>
            Daily · Weekly · Monthly · Yearly · Job Type · Shift Assignment
          </Text>
        </div>
        <Space>
          <DatePicker picker="month" value={exportMon} onChange={(d) => d && setExportMon(d)}
            format="MMM YYYY" style={{ width: 130 }} allowClear={false} />
          <Button icon={<DownloadOutlined />} onClick={() => downloadExport(exportMon.year(), exportMon.month() + 1)}>
            Export CSV
          </Button>
        </Space>
      </div>

      {/* Global filter bar — hidden on HR-only tabs */}
      {!["shift-assign", "enable-clockin", "job-type-schedule", "wfh-settings"].includes(activeTab) && (
        <Card size="small" style={{ marginBottom: 16, borderRadius: 10 }}>
          <Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
            <Space wrap>
              <DateControl />
              <AttendanceFilters filters={filters} onChange={(f) => setFilters((prev) => ({ ...prev, ...f }))} />
            </Space>
            {canWFHApprove && (
              <Button icon={<HomeOutlined />} href="/attendance/wfh-requests" type="default">
                WFH Requests
              </Button>
            )}
          </Space>
        </Card>
      )}

      {/* Status tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={allTabs}
        type="card"
        style={{ borderRadius: 12, padding: "0 0 16px" }}
      />
      <EmployeeAttendanceDrawer
        open={drawerOpen} empId={empId} selDate={dailyDate}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}