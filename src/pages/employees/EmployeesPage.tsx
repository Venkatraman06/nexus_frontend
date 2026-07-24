import { ScheduleOutlined, FundOutlined } from "@ant-design/icons";
import { usePermission } from "@/hooks/usePermission";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Typography, Button, Select, Drawer, Form, Input, DatePicker,
  Space, Spin, Empty, message, Row, Col, Divider, TimePicker, InputNumber,
  Card, Segmented, Table, Avatar, Tag, Pagination, Badge, Tooltip, Modal, Popconfirm,
} from "antd";
import OrgChart from "@/components/OrgChart";
import {
  PlusOutlined, PhoneOutlined, MailOutlined, ClockCircleOutlined,
  AppstoreOutlined, ApartmentOutlined, UnorderedListOutlined,
  UserOutlined, EyeOutlined, FilterOutlined, ClearOutlined, DeleteOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";

import { employeeApi, employeeGroupApi, type Employee, type EmployeeCreatePayload } from "@/services/employees";
import { resolveGroupFlags } from "@/constants/keycloakGroups";
import { useAuthStore } from "@/store/auth";
import PermGuard from "@/components/common/PermGuard";
import { PERMS } from "@/constants/permissions";
import {
  departmentApi, designationApi, locationApi, employmentTypeApi, shiftCategoryApi,
  type ShiftCategoryOption,
} from "@/services/master";
import { apiErrorMsg } from "@/utils/apiError";
import PhoneInput from "@/components/common/PhoneInput";
import { phoneFormRules } from "@/utils/phone";
import { get } from "@/services/api";
import { avatarPastel, deptPastel, initialsFromName } from "@/utils/avatarColors";

const { Text } = Typography;

const PAGE_SIZE = 15;

// ── Helpers ───────────────────────────────────────────────────────────────────
function initials(name: string) {
  return initialsFromName(name);
}
function toTitleCase(name: string) {
  return name.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

const DEPT_TAG_COLORS: Record<string, string> = {};
const TAG_PALETTE = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];
function deptTagColor(dept: string) {
  if (!DEPT_TAG_COLORS[dept]) {
    DEPT_TAG_COLORS[dept] = TAG_PALETTE[Object.keys(DEPT_TAG_COLORS).length % TAG_PALETTE.length];
  }
  return DEPT_TAG_COLORS[dept];
}

const AVATAR_COLORS = [
  "#E53935", "#8E24AA", "#1E88E5", "#00897B", "#F4511E",
  "#6D4C41", "#546E7A", "#43A047", "#FB8C00", "#D81B60",
  "#5E35B1", "#039BE5", "#00ACC1", "#7CB342", "#FFB300",
];
function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function deptTagStyle(dept: string) {
  return deptPastel(dept);
}

const STATUS_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  ACTIVE:   { color: "#059669", bg: "#f0fdf4", border: "#bbf7d0" },
  INACTIVE: { color: "#6b7280", bg: "#f3f4f6", border: "#d1d5db" },
  ON_LEAVE: { color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  RESIGNED: { color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
};

const STATUS_TAG: Record<string, string> = {
  ACTIVE: "success", INACTIVE: "default", ON_LEAVE: "warning", RESIGNED: "error",
};

// ── Employee Card ─────────────────────────────────────────────────────────────
function EmployeeCard({ emp, onClick, canManage, canUpdate, canDelete, onViewSummary, onToggleStatus, onDelete }: {
  emp: any;
  onClick: any;
  canManage?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  onViewSummary?: (e: React.MouseEvent) => void;
  onToggleStatus?: (e: React.MouseEvent, emp: any) => void;
  onDelete?: (e: React.MouseEvent, emp: any) => void;
}) {
  const currentUser = useAuthStore((s) => s.user);
  const isCeo = !!(
    currentUser?.designation?.toLowerCase().includes("ceo") ||
    currentUser?.keycloak_group?.toLowerCase().includes("ceo") ||
    currentUser?.keycloak_group?.toLowerCase().includes("admin")
  );
  const rawName   = emp.full_name || emp.username;
  const name      = toTitleCase(rawName);
  const color     = avatarColor(rawName);
  const dept      = emp.department_name || emp.department || "";
  const desig     = emp.designation_name || emp.designation || "";
  const statusKey = (emp.status || "ACTIVE").toUpperCase();
  const ss        = STATUS_STYLE[statusKey] ?? STATUS_STYLE.ACTIVE;
  const group     = emp.keycloak_group || "";
  const empType   = emp.employment_type_name || "";

  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--pmt-surface)",
        borderRadius: 14,
        padding: "22px 20px 16px",
        cursor: "pointer",
        border: "1px solid var(--pmt-border)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        transition: "box-shadow 0.18s, transform 0.18s",
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
      }}
    >
      {emp.profile_picture ? (
        <img
          src={emp.profile_picture}
          alt={name}
          style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", marginBottom: 14, border: "2px solid #eaecf0" }}
        />
      ) : (
        <div style={{
          width: 64, height: 64, borderRadius: "50%", background: color,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 14,
        }}>
          {initials(rawName)}
        </div>
      )}

      <div style={{ fontSize: 17, fontWeight: 700, color: "var(--pmt-text)", marginBottom: 4 }}>{name}</div>

      <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", marginBottom: 14 }}>
        {desig && <span style={{ fontSize: 12.5, color: "var(--pmt-text-3)" }}>{desig}</span>}
        {dept && (
          <>
            {desig && <span style={{ color: "var(--pmt-text-3)", fontSize: 11 }}>·</span>}
            <span style={{
              fontSize: 11, fontWeight: 600, color: "#ffffff",
              background: deptTagColor(dept), padding: "2px 9px", borderRadius: 20,
              border: `1px solid ${deptTagColor(dept)}`,
            }}>
              {dept.toLowerCase()}
            </span>
          </>
        )}
        {(empType || group) && (
          <span style={{
            fontSize: 10, fontWeight: 600, color: "var(--pmt-text-3)",
            background: "var(--pmt-surface-2)", padding: "1px 7px", borderRadius: 20,
            border: "1px solid var(--pmt-border)",
          }}>
            {empType || group}
          </span>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 16 }}>
        {emp.email && (
          <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
            <MailOutlined style={{ fontSize: 12, color: "var(--pmt-text-3)", flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, color: "var(--pmt-text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {emp.email}
            </span>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <ClockCircleOutlined style={{ fontSize: 12, color: "var(--pmt-text-3)", flexShrink: 0 }} />
          <span style={{ fontSize: 12.5, color: "var(--pmt-text-3)" }}>
            {emp.shift_applicable ? "shift applicable" : "general shift"}
          </span>
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--pmt-border)", marginBottom: 12 }} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{
          fontSize: 11, fontWeight: 600, color: "#ffffff", background: ss.color,
          padding: "3px 11px", borderRadius: 20, border: `1px solid ${ss.color}`,
          textTransform: "lowercase",
        }}>
          {statusKey.replace(/_/g, " ")}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {canUpdate && (
            <Tooltip title={statusKey === "ACTIVE" ? "Mark Inactive" : (isCeo ? "Mark Active" : "Only CEO can make active")}>
              <Button
                size="small"
                type="text"
                danger={statusKey === "ACTIVE"}
                disabled={statusKey === "INACTIVE" && !isCeo}
                style={{ color: statusKey === "INACTIVE" && isCeo ? "#059669" : undefined }}
                icon={statusKey === "ACTIVE" ? <UserOutlined style={{ textDecoration: 'line-through' }} /> : <UserOutlined />}
                onClick={(e) => { e.stopPropagation(); onToggleStatus?.(e, emp); }}
              />
            </Tooltip>
          )}
          {canManage && (
            <Tooltip title="View leave & attendance summary">
              <Button
                size="small"
                type="text"
                icon={<FundOutlined />}
                onClick={(e) => { e.stopPropagation(); onViewSummary?.(e); }}
              />
            </Tooltip>
          )}
          {canDelete && (
            <Tooltip title="Delete Employee">
              <Popconfirm
                title="Delete Employee"
                description={`Are you sure you want to delete ${name}?`}
                onConfirm={(e) => { e?.stopPropagation(); onDelete?.(e as any, emp); }}
                onCancel={(e) => e?.stopPropagation()}
                okText="Delete"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
              >
                <Button
                  size="small"
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={(e) => e.stopPropagation()}
                />
              </Popconfirm>
            </Tooltip>
          )}
          {emp.employee_code && (
            <span style={{ fontSize: 12.5, color: "var(--pmt-text-3)", fontFamily: "monospace" }}>
              {emp.employee_code}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Table View ────────────────────────────────────────────────────────────────
function EmployeeTable({ employees, isLoading, onView, canManage, canUpdate, canDelete, onViewSummary, onToggleStatus, onDelete }: {
  employees: Employee[];
  isLoading: boolean;
  onView: (id: string) => void;
  canManage?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  onViewSummary?: (emp: Employee) => void;
  onToggleStatus?: (emp: Employee) => void;
  onDelete?: (emp: Employee) => void;
}) {
  const currentUser = useAuthStore((s) => s.user);
  const isCeo = !!(
    currentUser?.designation?.toLowerCase().includes("ceo") ||
    currentUser?.keycloak_group?.toLowerCase().includes("ceo") ||
    currentUser?.keycloak_group?.toLowerCase().includes("admin")
  );
  const columns = [
    {
      title: "Employee",
      key: "employee",
      width: 240,
      render: (_: any, emp: Employee) => {
        const rawName = emp.full_name || emp.username;
        const name    = toTitleCase(rawName);
        const av      = avatarPastel(rawName);
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {emp.profile_picture ? (
              <Avatar src={emp.profile_picture} size={36} />
            ) : (
              <Avatar size={36} style={{
                background: av.bg, color: av.text, fontWeight: 600, fontSize: 13,
                border: `1px solid ${av.border}`,
              }}>
                {initials(rawName)}
              </Avatar>
            )}
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: "var(--pmt-text)", lineHeight: 1.3 }}>{name}</div>
              <div style={{ fontSize: 11, color: "var(--pmt-text-3)" }}>{emp.email}</div>
            </div>
          </div>
        );
      },
    },
    {
      title: "Code",
      dataIndex: "employee_code",
      key: "code",
      width: 90,
      render: (v: string) => v ? <Text code style={{ fontSize: 11 }}>{v}</Text> : "—",
    },
    {
      title: "Designation",
      key: "designation",
      width: 180,
      render: (_: any, emp: Employee) => emp.designation_name || emp.designation || "—",
    },
    {
      title: "Department",
      key: "department",
      width: 140,
      render: (_: any, emp: Employee) => {
        const dept = emp.department_name || emp.department || "";
        if (!dept) return "—";
        const tone = deptTagStyle(dept);
        return (
          <Tag style={{ fontSize: 11, border: `1px solid ${tone.text}`, background: tone.text, color: "#ffffff" }}>
            {dept}
          </Tag>
        );
      },
    },
    {
      title: "Role",
      dataIndex: "keycloak_group",
      key: "group",
      width: 120,
      render: (v: string) => v ? <Tag color="purple" style={{ fontSize: 11 }}>{v}</Tag> : "—",
    },
    {
      title: "Type",
      key: "emp_type",
      width: 110,
      render: (_: any, emp: Employee) => emp.employment_type_name || "—",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (v: string) => {
        const key = (v || "ACTIVE").toUpperCase();
        return (
          <Badge
            status={STATUS_TAG[key] as any}
            text={<span style={{ fontSize: 12 }}>{key.toLowerCase().replace("_", " ")}</span>}
          />
        );
      },
    },
    {
      title: "Joined",
      dataIndex: "joining_date",
      key: "joined",
      width: 110,
      render: (v: string) => v ? dayjs(v).format("DD MMM YYYY") : "—",
    },
    {
      title: "Shift",
      dataIndex: "shift_applicable",
      key: "shift",
      width: 100,
      render: (v: boolean) => (
        <Tag color={v ? "blue" : "default"} style={{ fontSize: 11 }}>
          {v ? "Shift" : "General"}
        </Tag>
      ),
    },
    {
      title: "",
      key: "action",
      width: canManage || canUpdate || canDelete ? 150 : 60,
      render: (_: any, emp: Employee) => {
        const statusKey = (emp.status || "ACTIVE").toUpperCase();
        const rawName = emp.full_name || emp.username;
        const name    = toTitleCase(rawName);
        return (
        <Space size={4}>
          {canUpdate && (
            <Tooltip title={statusKey === "ACTIVE" ? "Mark Inactive" : (isCeo ? "Mark Active" : "Only CEO can make active")}>
              <Button
                size="small"
                danger={statusKey === "ACTIVE"}
                disabled={statusKey === "INACTIVE" && !isCeo}
                style={{ color: statusKey === "INACTIVE" && isCeo ? "#059669" : undefined, borderColor: statusKey === "INACTIVE" && isCeo ? "#059669" : undefined }}
                icon={statusKey === "ACTIVE" ? <UserOutlined style={{ textDecoration: 'line-through' }} /> : <UserOutlined />}
                onClick={(e) => { e.stopPropagation(); onToggleStatus?.(emp); }}
              />
            </Tooltip>
          )}
          {canManage && (
            <Tooltip title="Leave & attendance summary">
              <Button
                size="small"
                icon={<FundOutlined />}
                onClick={(e) => { e.stopPropagation(); onViewSummary?.(emp); }}
              />
            </Tooltip>
          )}
          {canDelete && (
            <Tooltip title="Delete Employee">
              <Popconfirm
                title="Delete Employee"
                description={`Are you sure you want to delete ${name}?`}
                onConfirm={(e) => { e?.stopPropagation(); onDelete?.(emp); }}
                onCancel={(e) => e?.stopPropagation()}
                okText="Delete"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
              >
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={(e) => e.stopPropagation()}
                />
              </Popconfirm>
            </Tooltip>
          )}
          <Tooltip title="View Profile">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={(e) => { e.stopPropagation(); onView(emp.id); }}
            />
          </Tooltip>
        </Space>
        );
      },
    },
  ];

  return (
    <Table
      dataSource={employees}
      columns={columns}
      rowKey="id"
      loading={isLoading}
      size="middle"
      pagination={false}
      onRow={(emp) => ({ onClick: () => onView(emp.id), style: { cursor: "pointer" } })}
      style={{ borderRadius: 10, overflow: "hidden" }}
      scroll={{ x: 1100 }}
    />
  );
}

// ── Add Employee Drawer ───────────────────────────────────────────────────────
function EmployeeDrawer({ open, onClose, allEmployees }: { open: boolean; onClose: () => void; allEmployees: any[] }) {
  const [form] = Form.useForm();
  const qc = useQueryClient();
  const shiftApplicable = Form.useWatch("shift_applicable", form);
  const shiftType       = Form.useWatch("shift_type", form);

  const { data: designations = [] } = useQuery({ queryKey: ["dd", "designations"], queryFn: () => designationApi.dropdown(),    staleTime: 60_000 });
  const { data: departments = [] }  = useQuery({ queryKey: ["dd", "departments"],  queryFn: () => departmentApi.dropdown(),     staleTime: 60_000 });
  const { data: locations = [] }    = useQuery({ queryKey: ["dd", "locations"],    queryFn: () => locationApi.dropdown(),       staleTime: 60_000 });
  const { data: empTypes = [] }     = useQuery({ queryKey: ["dd", "emp-types"],    queryFn: () => employmentTypeApi.dropdown(), staleTime: 60_000 });
  const { data: kcGroups = [] }     = useQuery({ queryKey: ["dd", "kc-groups"],    queryFn: () => employeeGroupApi.list(),      staleTime: 300_000 });
  const { data: shiftCats = [] }    = useQuery({ queryKey: ["dd", "shift-cats"],   queryFn: () => shiftCategoryApi.dropdown(),  staleTime: 60_000 });

  const createMut = useMutation({
    mutationFn: (v: EmployeeCreatePayload) => employeeApi.create(v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employees"] }); message.success("Employee created"); form.resetFields(); onClose(); },
    onError: (e: any) => message.error(apiErrorMsg(e, "Failed to create employee")),
  });

  const recalcTotalExp = () => {
    const jd: dayjs.Dayjs | undefined = form.getFieldValue("joining_date");
    const prior = parseFloat(form.getFieldValue("prior_experience") ?? 0) || 0;
    if (jd) form.setFieldsValue({ total_experience: parseFloat((dayjs().diff(jd, "day") / 365 + prior).toFixed(1)) });
  };

  const onFinish = (values: any) => {
    const groupFlags = values.keycloak_group ? resolveGroupFlags(values.keycloak_group) : {};
    createMut.mutate({
      ...values, ...groupFlags,
      joining_date:       values.joining_date         ? dayjs(values.joining_date).format("YYYY-MM-DD")        : null,
      date_of_birth:      values.date_of_birth        ? dayjs(values.date_of_birth).format("YYYY-MM-DD")        : null,
      custom_shift_start: values.custom_shift_start   ? dayjs(values.custom_shift_start).format("HH:mm:ss")    : null,
      custom_shift_end:   values.custom_shift_end     ? dayjs(values.custom_shift_end).format("HH:mm:ss")      : null,
      shift_category:     values.shift_type === "category" ? values.shift_category : null,
      total_experience:   values.total_experience ?? null,
    });
  };

  const dd  = (arr: any[]) => arr.map((d) => ({ value: d.id, label: d.name }));
  const ff  = (input: string, opt: any) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase());
  const sec = (label: string) => (
    <><Typography.Text strong style={{ fontSize: 13, color: "var(--pmt-text-3)" }}>{label}</Typography.Text><Divider style={{ margin: "8px 0 16px" }} /></>
  );

  return (
    <Drawer
      title="Add Employee" open={open}
      onClose={() => { form.resetFields(); onClose(); }}
      width={700} destroyOnClose
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button onClick={() => { form.resetFields(); onClose(); }}>Cancel</Button>
          <Button type="primary" loading={createMut.isPending} onClick={() => form.submit()}>Create</Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" onFinish={onFinish} onValuesChange={(c) => { if ("joining_date" in c || "prior_experience" in c) recalcTotalExp(); }}>
        {sec("Role")}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="keycloak_group" label="Role" rules={[{ required: true }]}>
              <Select showSearch allowClear placeholder="Select role" options={(kcGroups as string[]).map((g) => ({ value: g, label: g }))} filterOption={ff as any} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="manager" label="Reporting Manager">
              <Select showSearch allowClear placeholder="Select manager" filterOption={ff}
                options={(allEmployees as any[]).map((e: any) => ({ value: e.id, label: `${e.full_name} (${e.employee_code})` }))} />
            </Form.Item>
          </Col>
        </Row>

        {sec("Personal Information")}
        <Row gutter={16}>
          <Col span={12}><Form.Item name="first_name" label="First Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
          <Col span={12}><Form.Item name="last_name" label="Last Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}><Form.Item name="email" label="Email" rules={[{ required: true, type: "email" }]}><Input prefix={<MailOutlined />} /></Form.Item></Col>
          <Col span={12}>
            <Form.Item name="phone_number" label="Phone" rules={phoneFormRules({ label: "Phone number" })}>
              <PhoneInput />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="alternative_number" label="Alternative Number" rules={phoneFormRules({ label: "Alternative number" })}>
              <PhoneInput />
            </Form.Item>
          </Col>
          <Col span={12}><Form.Item name="gender" label="Gender"><Select allowClear options={[{ value: "M", label: "Male" }, { value: "F", label: "Female" }, { value: "O", label: "Other" }]} /></Form.Item></Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}><Form.Item name="date_of_birth" label="Date of Birth"><DatePicker style={{ width: "100%" }} format="DD MMM YYYY" /></Form.Item></Col>
        </Row>
        <Form.Item name="address" label="Address"><Input.TextArea rows={2} /></Form.Item>

        {sec("Employment Details")}
        <Row gutter={16}>
          <Col span={12}><Form.Item name="designation_ref" label="Designation"><Select showSearch allowClear options={dd(designations as any[])} filterOption={ff} /></Form.Item></Col>
          <Col span={12}><Form.Item name="department_ref" label="Department"><Select showSearch allowClear options={dd(departments as any[])} filterOption={ff} /></Form.Item></Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}><Form.Item name="location" label="Branch / Location"><Select showSearch allowClear options={dd(locations as any[])} filterOption={ff} /></Form.Item></Col>
          <Col span={12}><Form.Item name="employment_type" label="Employment Type"><Select showSearch allowClear options={dd(empTypes as any[])} filterOption={ff} /></Form.Item></Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}><Form.Item name="joining_date" label="Date of Joining"><DatePicker style={{ width: "100%" }} format="DD MMM YYYY" /></Form.Item></Col>
          <Col span={12}><Form.Item name="status" label="Status" initialValue="ACTIVE"><Select options={[{ value: "ACTIVE", label: "Active" }, { value: "INACTIVE", label: "Inactive" }]} /></Form.Item></Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}><Form.Item name="prior_experience" label="Prior Experience (yrs)"><InputNumber style={{ width: "100%" }} min={0} precision={1} /></Form.Item></Col>
          <Col span={12}><Form.Item name="total_experience" label="Total Experience (yrs)"><InputNumber style={{ width: "100%", background: "var(--pmt-surface-2)" }} disabled /></Form.Item></Col>
        </Row>

        {sec("Shift")}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="shift_applicable" label="Shift Applicable" initialValue={false}>
              <Select options={[{ value: true, label: "Yes" }, { value: false, label: "No" }]} />
            </Form.Item>
          </Col>
          {shiftApplicable && (
            <Col span={12}>
              <Form.Item name="shift_type" label="Shift Type" initialValue="category">
                <Select options={[{ value: "category", label: "From Master (predefined)" }, { value: "custom", label: "Custom timing" }]} />
              </Form.Item>
            </Col>
          )}
        </Row>
        {shiftApplicable && shiftType === "category" && (
          <Form.Item name="shift_category" label="Shift Category">
            <Select showSearch placeholder="Select shift" options={(shiftCats as ShiftCategoryOption[]).map((s) => ({ value: s.id, label: `${s.name}  (${s.start_time.slice(0, 5)} – ${s.end_time.slice(0, 5)})` }))} filterOption={ff} />
          </Form.Item>
        )}
        {shiftApplicable && shiftType === "custom" && (
          <Row gutter={16}>
            <Col span={12}><Form.Item name="custom_shift_start" label="Shift Start"><TimePicker format="HH:mm" style={{ width: "100%" }} /></Form.Item></Col>
            <Col span={12}>
              <Form.Item name="custom_shift_end" label="Shift End" rules={[{ validator: (_, val) => { const s = form.getFieldValue("custom_shift_start"); if (!val || !s) return Promise.resolve(); let e = dayjs(val); if (e.isBefore(dayjs(s))) e = e.add(1, "day"); return Math.abs(e.diff(dayjs(s), "minute") - 540) > 1 ? Promise.reject("Must be 9 hours") : Promise.resolve(); } }]}>
                <TimePicker format="HH:mm" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
        )}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="wfh_allowed" label="WFH Allowed" initialValue={false}>
              <Select options={[{ value: true, label: "Yes" }, { value: false, label: "No" }]} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Drawer>
  );
}

// ── Employee Leave & Attendance Summary Modal (HR/Admin) ─────────────────────
function EmployeeSummaryModal({ open, onClose, employee }: {
  open: boolean;
  onClose: () => void;
  employee: { id: string; full_name: string; employee_code: string } | null;
}) {
  const [month, setMonth] = useState<dayjs.Dayjs>(dayjs());

  // Reset to current month each time a new employee is opened
  useState; // no-op placeholder to keep imports tidy (intentionally unused)

  const { data, isLoading, isError } = useQuery<{ attendance?: any; leave_balances?: any[] }>({
    queryKey: ["employee-monthly-summary", employee?.id, month.format("YYYY-MM")],
    queryFn: () => get("/attendance/employee-summary/", {
      employee: employee!.id,
      year:  month.year(),
      month: month.month() + 1,
    }),
    enabled: open && !!employee?.id,
    staleTime: 30_000,
  });

  const att = data?.attendance;
  const leaveBalances = data?.leave_balances ?? [];

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FundOutlined style={{ color: "#1677ff" }} />
          <span>{employee?.full_name} — Monthly Summary</span>
          {employee?.employee_code && (
            <Text code style={{ fontSize: 11 }}>{employee.employee_code}</Text>
          )}
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={560}
      destroyOnClose
    >
      <Space style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 13, color: "var(--pmt-text-2)" }}>Month</Text>
        <DatePicker
          picker="month" value={month} onChange={(d) => d && setMonth(d)}
          format="MMM YYYY" allowClear={false}
          disabledDate={(d) => !!d && d > dayjs().endOf("month")}
        />
      </Space>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: 40 }}><Spin /></div>
      ) : isError || !data || !att ? (
        <Empty description="Could not load summary" />
      ) : (
        <>
          {/* Attendance counts */}
          <Row gutter={[10, 10]} style={{ marginBottom: 18 }}>
            {[
              { label: "Present",  value: att.present,  color: "#059669" },
              { label: "On Site",  value: att.on_site,   color: "#0d9488" },
              { label: "WFH",      value: att.wfh,       color: "#2563eb" },
              { label: "Half Day", value: att.half_day,  color: "#d97706" },
              { label: "On Leave", value: att.on_leave,  color: "#7c3aed" },
              { label: "Absent",   value: att.absent,    color: "#dc2626" },
            ].map(({ label, value, color }) => (
              <Col span={8} key={label}>
                <div style={{
                  textAlign: "center", padding: "10px 6px", borderRadius: 10,
                  background: color + "12", border: `1px solid ${color}30`,
                }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
                  <div style={{ fontSize: 11, color: "var(--pmt-text-2)" }}>{label}</div>
                </div>
              </Col>
            ))}
          </Row>

          {/* Leave balances */}
          <Text strong style={{ fontSize: 13, display: "block", marginBottom: 8 }}>
            Leave Balance ({month.year()})
          </Text>
          {leaveBalances.length === 0 ? (
            <Empty description="No leave types assigned" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {leaveBalances.map((b: any) => (
                <div key={b.leave_type_code} style={{
                  display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
                  padding: "8px 12px", borderRadius: 8,
                  border: `1px solid ${b.leave_type_color}30`, background: b.leave_type_color + "08",
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: b.leave_type_color, flexShrink: 0 }} />
                  <Text style={{ fontSize: 12, flex: 1, minWidth: 100 }}>{b.leave_type_name}</Text>
                  <Text style={{ fontSize: 11, color: "var(--pmt-text-3)" }}>
                    Used {b.used_days}/{b.total_days}
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: 700, color: b.leave_type_color, minWidth: 50, textAlign: "right" }}>
                    {b.remaining_days}d left
                  </Text>
                  {b.used_this_month > 0 && (
                    <Tag style={{ fontSize: 10, borderRadius: 20, margin: 0 }}>
                      {b.used_this_month}d this month
                    </Tag>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function EmployeesPage() {
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const isCeo = !!(
    currentUser?.designation?.toLowerCase().includes("ceo") ||
    currentUser?.keycloak_group?.toLowerCase().includes("ceo") ||
    currentUser?.keycloak_group?.toLowerCase().includes("admin")
  );
  const [divisionFilter, setDivisionFilter] = useState<string | null>(null);
  const [addOpen, setAddOpen]               = useState(false);
  const [viewMode, setViewMode]             = useState<"cards" | "table" | "org">("cards");
  const [page, setPage]                     = useState(1);
  const navigate = useNavigate();
  const canManage = usePermission(PERMS.HRMS_ATTENDANCE_VIEW) || usePermission(PERMS.HRMS_LEAVE_MANAGE);
  const canUpdate = usePermission(PERMS.HRMS_EMPLOYEE_UPDATE);
  const canDelete = usePermission(PERMS.HRMS_EMPLOYEE_DELETE);
  const [summaryEmp, setSummaryEmp] = useState<{ id: string; full_name: string; employee_code: string } | null>(null);
  const [tableDeptFilter, setTableDeptFilter]   = useState<string | null>(null);
  const [tableDesigFilter, setTableDesigFilter] = useState<string | null>(null);
  const [tableRoleFilter, setTableRoleFilter]   = useState<string | null>(null);
  const [tableTypeFilter, setTableTypeFilter]   = useState<string | null>(null);

  const { data: departments = [] }  = useQuery({ queryKey: ["dd", "departments"],  queryFn: () => departmentApi.dropdown(),     staleTime: 60_000 });
  const { data: designations = [] } = useQuery({ queryKey: ["dd", "designations"], queryFn: () => designationApi.dropdown(),    staleTime: 60_000 });
  const { data: empTypes = [] }     = useQuery({ queryKey: ["dd", "emp-types"],    queryFn: () => employmentTypeApi.dropdown(), staleTime: 60_000 });
  const { data: kcGroups = [] }     = useQuery({ queryKey: ["dd", "kc-groups"],    queryFn: () => employeeGroupApi.list(),      staleTime: 300_000 });

  const { data: pagedData, isLoading, isError } = useQuery({
    queryKey: ["employees", "paged", page, PAGE_SIZE, divisionFilter],
    queryFn: () => employeeApi.listPaged({
      page,
      page_size: PAGE_SIZE,
      ...(divisionFilter ? { department_ref: divisionFilter } : {}),
    }),
    enabled: viewMode !== "org",
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const toggleStatusMut = useMutation({
    mutationFn: ({ id, newStatus }: { id: string; newStatus: string }) => employeeApi.update(id, { status: newStatus }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      message.success("Employee status updated");
    },
    onError: (e: any) => message.error(apiErrorMsg(e, "Failed to update status")),
  });

  const deleteEmployeeMut = useMutation({
    mutationFn: (id: string) => employeeApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      message.success("Employee deleted successfully");
    },
    onError: (e: any) => message.error(apiErrorMsg(e, "Failed to delete employee")),
  });

  const handleToggleStatus = (emp: any) => {
    const currentStatus = (emp.status || "ACTIVE").toUpperCase();
    const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    if (newStatus === "ACTIVE" && !isCeo) {
      message.error("Only the CEO can make an inactive employee active again.");
      return;
    }
    toggleStatusMut.mutate({ id: emp.id, newStatus });
  };

  const { data: allEmpData } = useQuery({
    queryKey: ["employees", "dropdown"],
    queryFn: () => employeeApi.listPaged({ page_size: 200 }),
    staleTime: 60_000,
  });
  const allEmployees: Employee[] = (allEmpData as any)?.results ?? [];

  const employees: Employee[] = (pagedData as any)?.results ?? [];
  const totalCount: number    = (pagedData as any)?.count ?? 0;

  const divisionOptions = [
    { value: null, label: "All Divisions" },
    ...(departments as any[]).filter((d) => d.name.toLowerCase() !== "admin").map((d) => ({ value: d.id, label: d.name })),
  ];

  const filteredTableEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (tableDeptFilter && emp.department_ref !== tableDeptFilter && emp.department !== tableDeptFilter && emp.department_name !== tableDeptFilter) return false;
      if (tableDesigFilter && emp.designation_ref !== tableDesigFilter && emp.designation !== tableDesigFilter && emp.designation_name !== tableDesigFilter) return false;
      if (tableRoleFilter && emp.keycloak_group !== tableRoleFilter) return false;
      if (tableTypeFilter && emp.employment_type !== tableTypeFilter && emp.employment_type_name !== tableTypeFilter) return false;
      return true;
    });
  }, [employees, tableDeptFilter, tableDesigFilter, tableRoleFilter, tableTypeFilter]);

  const handlePageChange = (p: number) => setPage(p);
  const handleDivisionChange = (v: string | null) => { setDivisionFilter(v); setPage(1); };

  return (
    <div style={{ minHeight: "100vh", background: "var(--pmt-bg)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--pmt-text)" }}>Employees</div>
          <Text style={{ fontSize: 13, color: "var(--pmt-text-3)" }}>Team by division</Text>
        </div>
        <Space wrap>
          <Segmented
            value={viewMode}
            onChange={(v) => { setViewMode(v as any); setPage(1); }}
            options={[
              { value: "cards", icon: <AppstoreOutlined />,     label: "Cards"     },
              { value: "table", icon: <UnorderedListOutlined />, label: "Table"     },
              { value: "org",   icon: <ApartmentOutlined />,    label: "Org Chart" },
            ]}
          />
          {viewMode !== "org" && (
            <Select
              value={divisionFilter}
              onChange={handleDivisionChange}
              style={{ width: 160 }}
              options={divisionOptions as any}
              placeholder="All Divisions"
            />
          )}
          <PermGuard permission={PERMS.HRMS_EMPLOYEE_CREATE}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
              Add
            </Button>
          </PermGuard>
        </Space>
      </div>

      {viewMode === "org" && (
        <Card style={{ borderRadius: 12 }}>
          <OrgChart onNavigate={(id) => navigate(`/employees/${id}`)} height={620} />
        </Card>
      )}

      {viewMode !== "org" && isLoading && (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}><Spin size="large" /></div>
      )}
      {viewMode !== "org" && !isLoading && isError && (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
          <Empty description="Failed to load employees. Please refresh." />
        </div>
      )}
      {viewMode !== "org" && !isLoading && !isError && employees.length === 0 && (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
          <Empty description="No employees found" />
        </div>
      )}

      {viewMode === "cards" && !isLoading && !isError && employees.length > 0 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
            {employees.map((emp) => (
              <EmployeeCard
                key={emp.id}
                emp={emp}
                onClick={() => navigate(`/employees/${emp.id}`)}
                canManage={canManage}
                canUpdate={canUpdate}
                canDelete={canDelete}
                onToggleStatus={(e, empRecord) => handleToggleStatus(empRecord)}
                onViewSummary={(e) => {
                  e.stopPropagation();
                  setSummaryEmp({ id: emp.id, full_name: emp.full_name || emp.username, employee_code: emp.employee_code });
                }}
                onDelete={(e, empRecord) => {
                  e.stopPropagation();
                  deleteEmployeeMut.mutate(empRecord.id);
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
            <Pagination
              current={page} pageSize={PAGE_SIZE} total={totalCount}
              onChange={handlePageChange}
              showTotal={(t, r) => `Showing ${r[0]}–${r[1]} of ${t} employees`}
              showSizeChanger={false}
            />
          </div>
        </>
      )}

      {viewMode === "table" && !isLoading && !isError && employees.length > 0 && (
        <>
          {/* Filter Row Card */}
          <Card
            bodyStyle={{ padding: "12px 16px" }}
            style={{ borderRadius: 10, border: "1px solid var(--pmt-border)", marginBottom: 16, background: "var(--pmt-surface)" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <Space wrap size={12} style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 13, color: "var(--pmt-text-2)", marginRight: 4 }}>
                  <FilterOutlined style={{ color: "#1677ff" }} /> Filters:
                </div>
                <Select
                  allowClear
                  showSearch
                  placeholder="Department"
                  style={{ minWidth: 150 }}
                  value={tableDeptFilter}
                  onChange={(v) => setTableDeptFilter(v ?? null)}
                  options={(departments as any[]).filter((d) => d.name.toLowerCase() !== "admin").map((d) => ({ value: d.id, label: d.name }))}
                  filterOption={(input, option) => (option?.label as string)?.toLowerCase().includes(input.toLowerCase())}
                />
                <Select
                  allowClear
                  showSearch
                  placeholder="Designation"
                  style={{ minWidth: 160 }}
                  value={tableDesigFilter}
                  onChange={(v) => setTableDesigFilter(v ?? null)}
                  options={(designations as any[]).filter((d) => d.name.toLowerCase() !== "admin").map((d) => ({ value: d.id, label: d.name }))}
                  filterOption={(input, option) => (option?.label as string)?.toLowerCase().includes(input.toLowerCase())}
                />
                <Select
                  allowClear
                  showSearch
                  placeholder="Role"
                  style={{ minWidth: 140 }}
                  value={tableRoleFilter}
                  onChange={(v) => setTableRoleFilter(v ?? null)}
                  options={(kcGroups as string[]).filter((g) => g.toLowerCase() !== "admin").map((g) => ({ value: g, label: g }))}
                  filterOption={(input, option) => (option?.label as string)?.toLowerCase().includes(input.toLowerCase())}
                />
                <Select
                  allowClear
                  showSearch
                  placeholder="Type"
                  style={{ minWidth: 140 }}
                  value={tableTypeFilter}
                  onChange={(v) => setTableTypeFilter(v ?? null)}
                  options={(empTypes as any[]).map((d) => ({ value: d.id, label: d.name }))}
                  filterOption={(input, option) => (option?.label as string)?.toLowerCase().includes(input.toLowerCase())}
                />
              </Space>
              {(tableDeptFilter || tableDesigFilter || tableRoleFilter || tableTypeFilter) && (
                <Button
                  size="small"
                  type="text"
                  danger
                  icon={<ClearOutlined />}
                  onClick={() => {
                    setTableDeptFilter(null);
                    setTableDesigFilter(null);
                    setTableRoleFilter(null);
                    setTableTypeFilter(null);
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </Card>

          {filteredTableEmployees.length === 0 ? (
            <Card style={{ borderRadius: 10, border: "1px solid var(--pmt-border)", textAlign: "center", padding: "40px 0", marginBottom: 16 }}>
              <Empty description="No employees match the selected filters" />
            </Card>
          ) : (
            <Card bodyStyle={{ padding: 0 }} style={{ borderRadius: 10, border: "1px solid var(--pmt-border)" }}>
              <EmployeeTable
                employees={filteredTableEmployees}
                isLoading={isLoading}
                onView={(id) => navigate(`/employees/${id}`)}
                canManage={canManage}
                canUpdate={canUpdate}
                canDelete={canDelete}
                onToggleStatus={(emp) => handleToggleStatus(emp)}
                onViewSummary={(emp) => setSummaryEmp({ id: emp.id, full_name: emp.full_name || emp.username, employee_code: emp.employee_code })}
                onDelete={(emp) => deleteEmployeeMut.mutate(emp.id)}
              />
            </Card>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <Pagination
              current={page} pageSize={PAGE_SIZE} total={totalCount}
              onChange={handlePageChange}
              showTotal={(t, r) => `Showing ${r[0]}–${r[1]} of ${t} employees`}
              showSizeChanger={false}
            />
          </div>
        </>
      )}

      <EmployeeDrawer open={addOpen} onClose={() => setAddOpen(false)} allEmployees={allEmployees} />
      <EmployeeSummaryModal open={!!summaryEmp} onClose={() => setSummaryEmp(null)} employee={summaryEmp} />
    </div>
  );
}