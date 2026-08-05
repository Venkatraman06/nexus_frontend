import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table, Button, Tag, Space, Typography, Modal, Form, Input,
  Select, Switch, Popconfirm, Tooltip, Card, Row, Col,
  Tabs, Badge, message, TimePicker, DatePicker, InputNumber,
  Divider, Spin, Empty, Popover, Checkbox, Alert, ColorPicker,
} from "antd";
import {
  PlusOutlined, DeleteOutlined, EditOutlined, EyeOutlined,
  CheckOutlined, CloseOutlined, ApartmentOutlined, ClockCircleOutlined,
  ArrowRightOutlined, TeamOutlined, SaveOutlined, LockOutlined, UnlockOutlined,
  CalendarOutlined, CheckCircleOutlined, InfoCircleOutlined,
  SettingOutlined, ThunderboltOutlined, UserOutlined, MailOutlined,
  IdcardOutlined, SafetyCertificateOutlined, SendOutlined, FileProtectOutlined,
  DollarCircleOutlined, AuditOutlined,
} from "@ant-design/icons";
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState,
  type Node, type Edge, type Connection,
  MarkerType, Handle, Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  workflowStateApi, workflowTransitionApi,
  type WorkflowState, type WorkflowTransition,
} from "@/services/workflow";
import {
  designationApi, departmentApi, locationApi, employmentTypeApi,
  shiftCategoryApi, rateCardApi, clientCategoryApi, businessTypeApi, billingTypeApi,
  leaveTypeApi, holidayApi, followupTypeApi, reimbursementConfigApi,
  type MasterItem, type ShiftCategoryItem, type RateCardItem, type BusinessTypeItem, type ReimbursementConfigItem,
} from "@/services/master";
import { employeeApi } from "@/services/employees";
import dayjs from "dayjs";
import { apiErrorMsg } from "@/utils/apiError";
import { get, post, patch } from "@/services/api";
import { useMasterCrud, usePermission } from "@/hooks/usePermission";
import { hasPermission } from "@/utils/access";
import { PERMS } from "@/constants/permissions";
import { useAuthStore } from "@/store/auth";
import type { ReactNode } from "react";
import ActiveStatusSwitch from "@/components/common/ActiveStatusSwitch";
import MasterHub from "./MasterHub";
import { MASTER_TAB_PERMISSIONS, getMasterItemDef } from "./masterConfig";
import ExpensesPage from "@/pages/expenses/ExpensesPage";
import "./master.css";

const { Text, Title } = Typography;

// ── Generic Master Table ──────────────────────────────────────────────────────
interface MasterTableProps {
  queryKey: string;
  api: any;
  title: string;
  scope?: "hrms" | "client" | "project";
  extraColumns?: any[];
  extraFormItems?: React.ReactNode;
}

function MasterTable({ queryKey, api, title, scope = "hrms", extraColumns = [], extraFormItems }: MasterTableProps) {
  const { canCreate, canUpdate, canDelete } = useMasterCrud(scope);
  const qc = useQueryClient();
  const [modal, setModal] = useState<{ open: boolean; editing: MasterItem | null }>({ open: false, editing: null });
  const [form] = Form.useForm();

  const { data = [], isLoading, isError } = useQuery({ queryKey: [queryKey], queryFn: () => api.list(), retry: 1 });

  const saveMut = useMutation({
    mutationFn: ({ values, editing }: { values: any; editing: MasterItem | null }) =>
      editing ? api.update(editing.id, values) : api.create(values),
    onSuccess: (_data, { editing }) => {
      qc.invalidateQueries({ queryKey: [queryKey] });
      setModal({ open: false, editing: null });
      form.resetFields();
      message.success(editing ? `${title} updated` : `${title} created`);
    },
    onError: (e: any) => message.error(apiErrorMsg(e, `Failed to save ${title}`)),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [queryKey] }); message.success(`${title} deleted`); },
    onError: () => message.error(`Failed to delete ${title}`),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => api.update(id, { is_active }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [queryKey] }); message.success("Status updated"); },
    onError: () => message.error("Failed to update status"),
  });

  const openAdd  = () => { form.resetFields(); form.setFieldsValue({ is_active: true }); setModal({ open: true, editing: null }); };
  const openEdit = (r: MasterItem) => { form.setFieldsValue(r); setModal({ open: true, editing: r }); };

  const baseColumns = [
    { title: "Name", dataIndex: "name", key: "name", render: (v: string) => <Text strong>{v}</Text> },
    ...extraColumns,
    { title: "Status", dataIndex: "is_active", key: "is_active", width: 90, render: (_: boolean, r: MasterItem) => (
      <ActiveStatusSwitch
        checked={r.is_active}
        disabled={!canUpdate}
        loading={statusMut.isPending && statusMut.variables?.id === r.id}
        onChange={(checked) => statusMut.mutate({ id: r.id, is_active: checked })}
      />
    ) },
    { title: "Created On",    dataIndex: "created_at", key: "created_at", render: (v: string) => dayjs(v).format("DD MMM YYYY | hh:mm A") },
    { title: "Last Modified", dataIndex: "updated_at", key: "updated_at", render: (v: string) => dayjs(v).format("DD MMM YYYY | hh:mm A") },
    ...(canUpdate || canDelete ? [{
      title: "Action", key: "action", width: 80,
      render: (_: any, r: MasterItem) => (
        <Space>
          {canUpdate && <Tooltip title="Edit"><Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} /></Tooltip>}
          {canDelete && (
            <Popconfirm title={`Delete ${r.name}?`} onConfirm={() => deleteMut.mutate(r.id)} okButtonProps={{ danger: true }}>
              <Tooltip title="Delete"><Button size="small" danger icon={<DeleteOutlined />} /></Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    }] : []),
  ];

  const rows = Array.isArray(data) ? data : [];
  return (
    <>
      <div className="master-panel-toolbar">
        <Text className="master-panel-toolbar-title">
          <strong>{rows.length}</strong> record{rows.length === 1 ? "" : "s"}
          {isError && <Tag color="error" style={{ marginLeft: 8 }}>API error — check auth</Tag>}
        </Text>
        {canCreate && <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Add {title}</Button>}
      </div>
      <Table dataSource={rows} columns={baseColumns} rowKey="id" loading={isLoading} size="middle"
        pagination={{ pageSize: 15, showTotal: (t, r) => `Showing ${r[0]}-${r[1]} of ${t}` }} />
      <Modal
        title={modal.editing ? `Edit ${title}` : `Add ${title}`}
        open={modal.open}
        onCancel={() => { setModal({ open: false, editing: null }); form.resetFields(); }}
        onOk={() => form.submit()} confirmLoading={saveMut.isPending} width={440}
      >
        <Form form={form} layout="vertical" onFinish={(v) => saveMut.mutate({ values: v, editing: modal.editing })}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder={`Enter ${title.toLowerCase()} name`} />
          </Form.Item>
          {extraFormItems}
          <Form.Item name="is_active" label="Status" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

// ── Location Table ─────────────────────────────────────────────────────────────
function LocationTable() {
  return (
    <MasterTable queryKey="master-locations" api={locationApi} title="Location"
      extraColumns={[
        { title: "City",  dataIndex: "city",  key: "city"  },
        { title: "State", dataIndex: "state", key: "state" },
      ]}
      extraFormItems={
        <>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="city"  label="City"><Input placeholder="City" /></Form.Item></Col>
            <Col span={12}><Form.Item name="state" label="State"><Input placeholder="State" /></Form.Item></Col>
          </Row>
          <Form.Item name="country" label="Country" initialValue="India"><Input placeholder="Country" /></Form.Item>
        </>
      }
    />
  );
}

// ── Shift Category Table ──────────────────────────────────────────────────────
const SHIFT_PRESETS = [
  { label: "9 AM – 6 PM",  start: "09:00:00", end: "18:00:00", name: "Morning Shift (9AM-6PM)"  },
  { label: "10 AM – 7 PM", start: "10:00:00", end: "19:00:00", name: "General Shift (10AM-7PM)" },
];

function ShiftCategoryTable() {
  const { canCreate, canUpdate, canDelete } = useMasterCrud("hrms");
  const qc = useQueryClient();
  const [modal, setModal] = useState<{ open: boolean; editing: ShiftCategoryItem | null }>({ open: false, editing: null });
  const [form] = Form.useForm();

  const { data = [], isLoading, isError } = useQuery({ queryKey: ["master-shift-categories"], queryFn: () => shiftCategoryApi.list(), retry: 1 });

  const saveMut = useMutation({
    mutationFn: ({ values, editing }: { values: any; editing: ShiftCategoryItem | null }) => {
      const payload = {
        ...values,
        start_time: values.start_time ? dayjs(values.start_time).format("HH:mm:ss") : values.start_time,
        end_time:   values.end_time   ? dayjs(values.end_time).format("HH:mm:ss")   : values.end_time,
      };
      return editing ? shiftCategoryApi.update(editing.id, payload) : shiftCategoryApi.create(payload);
    },
    onSuccess: (_d, { editing }) => {
      qc.invalidateQueries({ queryKey: ["master-shift-categories"] });
      setModal({ open: false, editing: null }); form.resetFields();
      message.success(editing ? "Shift updated" : "Shift created");
    },
    onError: (e: any) => message.error(apiErrorMsg(e, "Failed to save shift")),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => shiftCategoryApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["master-shift-categories"] }); message.success("Shift deleted"); },
    onError: () => message.error("Failed to delete shift"),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => shiftCategoryApi.update(id, { is_active }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["master-shift-categories"] }); message.success("Status updated"); },
    onError: () => message.error("Failed to update status"),
  });

  const openAdd  = () => { form.resetFields(); form.setFieldsValue({ is_active: true }); setModal({ open: true, editing: null }); };
  const openEdit = (r: ShiftCategoryItem) => {
    form.setFieldsValue({ ...r, start_time: r.start_time ? dayjs(r.start_time, "HH:mm:ss") : null, end_time: r.end_time ? dayjs(r.end_time, "HH:mm:ss") : null });
    setModal({ open: true, editing: r });
  };
  const applyPreset = (p: typeof SHIFT_PRESETS[0]) => {
    form.setFieldsValue({ name: form.getFieldValue("name") || p.name, start_time: dayjs(p.start, "HH:mm:ss"), end_time: dayjs(p.end, "HH:mm:ss") });
  };

  const rows: ShiftCategoryItem[] = Array.isArray(data) ? data : [];
  const columns = [
    { title: "Shift Name", dataIndex: "name", key: "name", render: (v: string) => <Space><ClockCircleOutlined style={{ color: "#6366f1" }} /><Text strong>{v}</Text></Space> },
    { title: "Start Time", dataIndex: "start_time", key: "start_time", render: (v: string) => <Tag color="blue" style={{ fontWeight: 600, fontSize: 13 }}>{v ? dayjs(v, "HH:mm:ss").format("hh:mm A") : "—"}</Tag> },
    { title: "End Time",   dataIndex: "end_time",   key: "end_time",   render: (v: string) => <Tag color="purple" style={{ fontWeight: 600, fontSize: 13 }}>{v ? dayjs(v, "HH:mm:ss").format("hh:mm A") : "—"}</Tag> },
    {
  title: "Duration", key: "duration",
  render: (_: any, r: ShiftCategoryItem) => {
    if (!r.start_time || !r.end_time) return "—";
    let diff = dayjs(r.end_time, "HH:mm:ss").diff(dayjs(r.start_time, "HH:mm:ss"), "minute");
    if (diff < 0) diff += 24 * 60;
    return <Tag color="green">{Math.floor(diff / 60)}h{diff % 60 > 0 ? ` ${diff % 60}m` : ""}</Tag>;
  },
},
    { title: "Status", dataIndex: "is_active", key: "is_active", width: 90, render: (_: boolean, r: ShiftCategoryItem) => (
      <ActiveStatusSwitch
        checked={r.is_active}
        disabled={!canUpdate}
        loading={statusMut.isPending && statusMut.variables?.id === r.id}
        onChange={(checked) => statusMut.mutate({ id: r.id, is_active: checked })}
      />
    ) },
    { title: "Created On", dataIndex: "created_at", key: "created_at", render: (v: string) => dayjs(v).format("DD MMM YYYY") },
    ...(canUpdate || canDelete ? [{
      title: "Action", key: "action", width: 80,
      render: (_: any, r: ShiftCategoryItem) => (
        <Space>
          {canUpdate && <Tooltip title="Edit"><Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} /></Tooltip>}
          {canDelete && (
            <Popconfirm title={`Delete "${r.name}"?`} onConfirm={() => deleteMut.mutate(r.id)} okButtonProps={{ danger: true }}>
              <Tooltip title="Delete"><Button size="small" danger icon={<DeleteOutlined />} /></Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    }] : []),
  ];

  return (
    <>
      <div className="master-panel-toolbar">
        <Text className="master-panel-toolbar-title">
          <strong>{rows.length}</strong> shift{rows.length === 1 ? "" : "s"}
          {isError && <Tag color="error" style={{ marginLeft: 8 }}>API error</Tag>}
        </Text>
        {canCreate && <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Add Shift</Button>}
      </div>
      <div className="master-panel-section">
      <Row gutter={[12, 12]}>
        {SHIFT_PRESETS.map((p) => (
          <Col key={p.label} xs={24} sm={12} md={8} lg={6}>
            <div style={{ border: "1px solid var(--bms-border)", borderRadius: 10, padding: "14px 16px", cursor: "default", background: "var(--bms-surface)", boxShadow: "var(--shadow-sm)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                    <ClockCircleOutlined style={{ color: "#6366f1", marginRight: 6 }} />
                    <Text strong style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.label}</Text>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                    <Tag color="blue" style={{ margin: 0 }}>{dayjs(p.start, "HH:mm:ss").format("hh:mm A")}</Tag>
                    <span style={{ color: "var(--bms-text-3)", fontSize: 12 }}>→</span>
                    <Tag color="purple" style={{ margin: 0 }}>{dayjs(p.end, "HH:mm:ss").format("hh:mm A")}</Tag>
                    <Tag color="green" style={{ margin: 0 }}>9h</Tag>
                  </div>
                </div>
                <Button size="small" type="dashed" onClick={() => { form.setFieldsValue({ name: p.name, start_time: dayjs(p.start, "HH:mm:ss"), end_time: dayjs(p.end, "HH:mm:ss"), is_active: true }); setModal({ open: true, editing: null }); }}>Use</Button>
              </div>
            </div>
          </Col>
        ))}
      </Row>
      </div>
      <Table dataSource={rows} columns={columns} rowKey="id" loading={isLoading} size="middle" pagination={{ pageSize: 15, showTotal: (t, r) => `Showing ${r[0]}-${r[1]} of ${t}` }} />
      <Modal title={<Space><ClockCircleOutlined style={{ color: "#6366f1" }} />{modal.editing ? "Edit Shift Category" : "Add Shift Category"}</Space>}
        open={modal.open} onCancel={() => { setModal({ open: false, editing: null }); form.resetFields(); }}
        onOk={() => form.submit()} confirmLoading={saveMut.isPending} width={480}>
        <Form form={form} layout="vertical" onFinish={(v) => saveMut.mutate({ values: v, editing: modal.editing })}>
          <Form.Item name="name" label="Shift Name" rules={[{ required: true }]}><Input placeholder="e.g. Morning Shift (9AM-6PM)" /></Form.Item>
          <Form.Item label="Quick Presets"><Space wrap>{SHIFT_PRESETS.map((p) => <Button key={p.label} size="small" onClick={() => applyPreset(p)}>{p.label}</Button>)}</Space></Form.Item>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="start_time" label="Start Time" rules={[{ required: true }]}><TimePicker format="hh:mm A" use12Hours style={{ width: "100%" }} /></Form.Item></Col>
            <Col span={12}><Form.Item name="end_time"   label="End Time"   rules={[{ required: true }]}><TimePicker format="hh:mm A" use12Hours style={{ width: "100%" }} /></Form.Item></Col>
          </Row>
         <Form.Item noStyle shouldUpdate={(p, c) => p.start_time !== c.start_time || p.end_time !== c.end_time}>
  {({ getFieldValue }) => {
    const s = getFieldValue("start_time"); const e = getFieldValue("end_time");
    if (!s || !e) return null;
    let diff = dayjs(e).diff(dayjs(s), "minute");
    if (diff < 0) diff += 24 * 60; // handle overnight shifts (end time is next day)
    const h = Math.floor(diff / 60); const m = diff % 60;
    const ok = h === 9 && m === 0;
    return <div style={{ marginBottom: 16, padding: "8px 12px", background: ok ? "color-mix(in srgb, var(--bms-success) 15%, var(--bms-surface))" : "color-mix(in srgb, var(--bms-warning) 15%, var(--bms-surface))", borderRadius: 8, border: `1px solid ${ok ? "var(--bms-success)" : "var(--bms-warning)"}` }}><Text style={{ color: ok ? "var(--bms-success)" : "var(--bms-warning)", fontWeight: 600 }}>Duration: {h}h{m > 0 ? ` ${m}m` : ""} {ok ? "✓ Valid (9h)" : "⚠ Must be exactly 9 hours"}</Text></div>;
  }}
</Form.Item>
          <Form.Item name="is_active" label="Status" valuePropName="checked" initialValue={true}><Switch checkedChildren="Active" unCheckedChildren="Inactive" /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}

// ── Rate Card Table ───────────────────────────────────────────────────────────
function RateCardTable() {
  const { canCreate, canUpdate, canDelete } = useMasterCrud("hrms");
  const qc = useQueryClient();
  const [modal, setModal] = useState<{ open: boolean; editing: RateCardItem | null }>({ open: false, editing: null });
  const [form] = Form.useForm();

  const { data: designations = [] } = useQuery({ queryKey: ["dd", "designations"], queryFn: () => designationApi.dropdown(), staleTime: 60_000 });
  const { data: departments  = [] } = useQuery({ queryKey: ["dd", "departments"],  queryFn: () => departmentApi.dropdown(),  staleTime: 60_000 });
  const { data = [], isLoading, isError } = useQuery({ queryKey: ["master-rate-cards"], queryFn: () => rateCardApi.list(), retry: 1 });

  const saveMut = useMutation({
    mutationFn: ({ values, editing }: { values: any; editing: RateCardItem | null }) =>
      editing ? rateCardApi.update(editing.id, values) : rateCardApi.create(values),
    onSuccess: (_d, { editing }) => { qc.invalidateQueries({ queryKey: ["master-rate-cards"] }); setModal({ open: false, editing: null }); form.resetFields(); message.success(editing ? "Rate card updated" : "Rate card created"); },
    onError: (e: any) => message.error(apiErrorMsg(e, "Failed to save rate card")),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => rateCardApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["master-rate-cards"] }); message.success("Rate card deleted"); },
    onError: () => message.error("Failed to delete"),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => rateCardApi.update(id, { is_active }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["master-rate-cards"] }); message.success("Status updated"); },
    onError: () => message.error("Failed to update status"),
  });

  const openAdd  = () => { form.resetFields(); form.setFieldsValue({ is_active: true, currency: "INR" }); setModal({ open: true, editing: null }); };
  const openEdit = (r: RateCardItem) => { form.setFieldsValue({ designation_ref: r.designation_ref, department_ref: r.department_ref, hr_daily_rate: r.hr_daily_rate, client_billing_rate: r.client_billing_rate, currency: r.currency, is_active: r.is_active }); setModal({ open: true, editing: r }); };
  const rows: RateCardItem[] = Array.isArray(data) ? data : [];
  const dd = (arr: any[]) => arr.map((d: any) => ({ value: d.id, label: d.name }));
  const ff = (input: string, opt: any) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase());

  const columns = [
    { title: "Designation",           dataIndex: "designation_name",  key: "desig",    render: (v: string) => <Tag color="blue"   style={{ fontWeight: 600 }}>{v}</Tag> },
    { title: "Department",            dataIndex: "department_name",   key: "dept",     render: (v: string) => <Tag color="purple" style={{ fontWeight: 600 }}>{v}</Tag> },
    { title: "HR Daily Rate",         dataIndex: "hr_daily_rate",     key: "hr",       render: (v: string) => <span style={{ fontWeight: 700, color: "#059669" }}>₹{parseFloat(v).toLocaleString("en-IN")}</span> },
    { title: "Client Billing Rate",   dataIndex: "client_billing_rate", key: "client", render: (v: string) => <span style={{ fontWeight: 700, color: "#2563eb" }}>₹{parseFloat(v).toLocaleString("en-IN")}</span> },
    { title: "Monthly HR (est.)",     dataIndex: "monthly_hr_cost",   key: "m_hr",     render: (v: number) => <Text style={{ fontSize: 12, color: "#374151" }}>₹{v.toLocaleString("en-IN")}</Text> },
    { title: "Monthly Billing (est.)",dataIndex: "monthly_client_rate",key: "m_client",render: (v: number) => <Text style={{ fontSize: 12, color: "#374151" }}>₹{v.toLocaleString("en-IN")}</Text> },
    { title: "Status", dataIndex: "is_active", key: "status", width: 90, render: (_: boolean, r: RateCardItem) => (
      <ActiveStatusSwitch
        checked={r.is_active}
        disabled={!canUpdate}
        loading={statusMut.isPending && statusMut.variables?.id === r.id}
        onChange={(checked) => statusMut.mutate({ id: r.id, is_active: checked })}
      />
    ) },
    ...(canUpdate || canDelete ? [{ title: "Action", key: "action", width: 80, render: (_: any, r: RateCardItem) => (<Space>{canUpdate && <Tooltip title="Edit"><Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} /></Tooltip>}{canDelete && <Popconfirm title="Delete this rate card?" onConfirm={() => deleteMut.mutate(r.id)} okButtonProps={{ danger: true }}><Tooltip title="Delete"><Button size="small" danger icon={<DeleteOutlined />} /></Tooltip></Popconfirm>}</Space>) }] : []),
  ];

  return (
    <>
      <div className="master-panel-toolbar">
        <Text className="master-panel-toolbar-title"><strong>{rows.length}</strong> rate card{rows.length === 1 ? "" : "s"}{isError && <Tag color="error" style={{ marginLeft: 8 }}>API error</Tag>}</Text>
        {canCreate && <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Add Rate Card</Button>}
      </div>
      <div className="master-panel-section" style={{ marginBottom: 0, background: "color-mix(in srgb, var(--bms-success) 15%, var(--bms-surface))", borderColor: "var(--bms-success)", fontSize: 12, color: "var(--bms-success)" }}>
        <strong>Daily rates</strong> — HR Daily Rate = company cost per working day | Client Billing Rate = amount billed to client per day | Monthly estimates based on 22 working days
      </div>
      <Table dataSource={rows} columns={columns} rowKey="id" loading={isLoading} size="middle" pagination={{ pageSize: 20, showTotal: (t, r) => `Showing ${r[0]}-${r[1]} of ${t}` }} />
      <Modal title={modal.editing ? "Edit Rate Card" : "Add Rate Card"} open={modal.open} onCancel={() => { setModal({ open: false, editing: null }); form.resetFields(); }} onOk={() => form.submit()} confirmLoading={saveMut.isPending} width={500}>
        <Form form={form} layout="vertical" onFinish={(v) => saveMut.mutate({ values: v, editing: modal.editing })}>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="designation_ref" label="Designation" rules={[{ required: true }]}><Select showSearch placeholder="Select" options={dd(designations as any[])} filterOption={ff} /></Form.Item></Col>
            <Col span={12}><Form.Item name="department_ref"  label="Department"  rules={[{ required: true }]}><Select showSearch placeholder="Select" options={dd(departments  as any[])} filterOption={ff} /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="hr_daily_rate"       label="HR Daily Rate (₹)"       rules={[{ required: true }]} tooltip="Daily cost to company per employee"><Input type="number" min={0} step={10} prefix="₹" placeholder="150" /></Form.Item></Col>
            <Col span={12}><Form.Item name="client_billing_rate" label="Client Billing Rate (₹)" rules={[{ required: true }]} tooltip="Daily rate billed to client"><Input type="number" min={0} step={10} prefix="₹" placeholder="200" /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="currency" label="Currency" initialValue="INR"><Select options={[{ value: "INR", label: "INR (₹)" }, { value: "USD", label: "USD ($)" }]} /></Form.Item></Col>
            <Col span={12}><Form.Item name="is_active" label="Status" valuePropName="checked" initialValue={true}><Switch checkedChildren="Active" unCheckedChildren="Inactive" /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
}

// ── Business Type Table ───────────────────────────────────────────────────────
function BusinessTypeTable() {
  const { canCreate, canUpdate, canDelete } = useMasterCrud("project");
  const qc = useQueryClient();
  const [modal, setModal] = useState<{ open: boolean; editing: BusinessTypeItem | null }>({ open: false, editing: null });
  const [form] = Form.useForm();
  const { data = [], isLoading, isError } = useQuery({ queryKey: ["master-business-types"], queryFn: () => businessTypeApi.list(), retry: 1 });
  const saveMut = useMutation({
    mutationFn: ({ values, editing }: { values: any; editing: BusinessTypeItem | null }) => editing ? businessTypeApi.update(editing.id, values) : businessTypeApi.create(values),
    onSuccess: (_d, { editing }) => { qc.invalidateQueries({ queryKey: ["master-business-types"] }); qc.invalidateQueries({ queryKey: ["dd", "business-types"] }); setModal({ open: false, editing: null }); form.resetFields(); message.success(editing ? "Business Type updated" : "Business Type created"); },
    onError: (e: any) => message.error(apiErrorMsg(e, "Failed to save Business Type")),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => businessTypeApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["master-business-types"] }); message.success("Business Type deleted"); },
    onError: () => message.error("Failed to delete Business Type"),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => businessTypeApi.update(id, { is_active }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["master-business-types"] }); qc.invalidateQueries({ queryKey: ["dd", "business-types"] }); message.success("Status updated"); },
    onError: () => message.error("Failed to update status"),
  });

  const rows: BusinessTypeItem[] = Array.isArray(data) ? data : [];
  const columns = [
    { title: "Name",        dataIndex: "name",       key: "name",   render: (v: string) => <Text strong>{v}</Text> },
    { title: "Code Prefix", dataIndex: "prefix",     key: "prefix", render: (v: string) => v ? <Tag color="blue" style={{ fontFamily: "monospace", fontWeight: 700 }}>{v}</Tag> : <Text type="secondary">—</Text> },
    { title: "Status", dataIndex: "is_active", key: "status", width: 90, render: (_: boolean, r: BusinessTypeItem) => (
      <ActiveStatusSwitch
        checked={r.is_active}
        disabled={!canUpdate}
        loading={statusMut.isPending && statusMut.variables?.id === r.id}
        onChange={(checked) => statusMut.mutate({ id: r.id, is_active: checked })}
      />
    ) },
    { title: "Created On",  dataIndex: "created_at", key: "created_at", render: (v: string) => dayjs(v).format("DD MMM YYYY | hh:mm A") },
    ...(canUpdate || canDelete ? [{ title: "Action", key: "action", width: 80, render: (_: any, r: BusinessTypeItem) => (<Space>{canUpdate && <Tooltip title="Edit"><Button size="small" icon={<EditOutlined />} onClick={() => { form.setFieldsValue(r); setModal({ open: true, editing: r }); }} /></Tooltip>}{canDelete && <Popconfirm title={`Delete "${r.name}"?`} onConfirm={() => deleteMut.mutate(r.id)} okButtonProps={{ danger: true }}><Tooltip title="Delete"><Button size="small" danger icon={<DeleteOutlined />} /></Tooltip></Popconfirm>}</Space>) }] : []),
  ];
  return (
    <>
      <div className="master-panel-section" style={{ background: "color-mix(in srgb, var(--bms-primary) 15%, var(--bms-surface))", borderColor: "var(--bms-primary)", fontSize: 12, color: "var(--bms-primary)" }}>
        <strong>Code Prefix</strong> — Each type carries a short prefix (e.g. <code>PRJ</code>, <code>TRN</code>). Project codes are auto-generated as <code>PREFIX-YY####</code>.
      </div>
      <div className="master-panel-toolbar">
        <Text className="master-panel-toolbar-title"><strong>{rows.length}</strong> type{rows.length === 1 ? "" : "s"}{isError && <Tag color="error" style={{ marginLeft: 8 }}>API error</Tag>}</Text>
        {canCreate && <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); form.setFieldsValue({ is_active: true }); setModal({ open: true, editing: null }); }}>Add Business Type</Button>}
      </div>
      <Table dataSource={rows} columns={columns} rowKey="id" loading={isLoading} size="middle" pagination={{ pageSize: 15 }} />
      <Modal title={modal.editing ? "Edit Business Type" : "Add Business Type"} open={modal.open} onCancel={() => { setModal({ open: false, editing: null }); form.resetFields(); }} onOk={() => form.submit()} confirmLoading={saveMut.isPending} width={440}>
        <Form form={form} layout="vertical" onFinish={(v) => saveMut.mutate({ values: v, editing: modal.editing })}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input placeholder="e.g. Project, Training, POC" /></Form.Item>
          <Form.Item name="prefix" label="Code Prefix" rules={[{ pattern: /^[A-Z0-9]{0,10}$/, message: "Max 10 uppercase letters/digits" }]}>
            <Input placeholder="e.g. PRJ" maxLength={10} style={{ fontFamily: "monospace", textTransform: "uppercase" }} onChange={(e) => form.setFieldValue("prefix", e.target.value.toUpperCase())} />
          </Form.Item>
          <Form.Item name="is_active" label="Status" valuePropName="checked" initialValue={true}><Switch checkedChildren="Active" unCheckedChildren="Inactive" /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}

// ── INDIAN GOVERNMENT HOLIDAYS (preset) ──────────────────────────────────────
const INDIAN_GOVT_HOLIDAYS_2026 = [
  { name: "New Year's Day",        date: "2026-01-01" },
  { name: "Republic Day",          date: "2026-01-26" },
  { name: "Holi",                  date: "2026-03-14" },
  { name: "Good Friday",           date: "2026-04-03" },
  { name: "Dr. Ambedkar Jayanti",  date: "2026-04-14" },
  { name: "Ram Navami",            date: "2026-04-18" },
  { name: "Labour Day",            date: "2026-05-01" },
  { name: "Eid ul-Fitr",          date: "2026-03-31" },
  { name: "Independence Day",      date: "2026-08-15" },
  { name: "Janmashtami",           date: "2026-08-26" },
  { name: "Gandhi Jayanti",        date: "2026-10-02" },
  { name: "Dussehra",              date: "2026-10-12" },
  { name: "Diwali",                date: "2026-10-30" },
  { name: "Christmas Day",         date: "2026-12-25" },
];

interface HolidayItem {
  id: string; name: string; slug?: string; date: string; year: number;
  holiday_type: string; holiday_type_label: string;
  description: string; is_active: boolean;
  created_at: string; updated_at: string;
}

function HolidayTab() {
  const { canCreate, canUpdate, canDelete } = useMasterCrud("hrms");
  const qc = useQueryClient();
  const [year, setYear] = useState(dayjs().year());
  const [modal, setModal] = useState<{ open: boolean; editing: HolidayItem | null }>({ open: false, editing: null });
  const [viewMode, setViewMode] = useState<"table" | "calendar" | "year">("table");
  const [calMonth, setCalMonth] = useState(dayjs().month());
  const [form] = Form.useForm();

  const { data = [], isLoading } = useQuery<HolidayItem[]>({
    queryKey: ["master-holidays", year],
    queryFn: () => holidayApi.list({ year, page_size: 100 }),
    staleTime: 30_000,
  });

  const saveMut = useMutation({
    mutationFn: (values: any) =>
      modal.editing
        ? holidayApi.update(modal.editing.id, values)
        : holidayApi.create(values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["master-holidays"] });
      setModal({ open: false, editing: null });
      form.resetFields();
      message.success(modal.editing ? "Holiday updated" : "Holiday added");
    },
    onError: (e: any) => message.error(apiErrorMsg(e, "Failed to save holiday")),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => holidayApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["master-holidays"] }); message.success("Holiday deleted"); },
    onError: () => message.error("Failed to delete"),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      holidayApi.update(id, { is_active }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["master-holidays"] }); message.success("Status updated"); },
    onError: () => message.error("Failed to update status"),
  });

  const bulkImportMut = useMutation({
    mutationFn: async () => {
      for (const h of INDIAN_GOVT_HOLIDAYS_2026) {
        try {
          await holidayApi.create({
            name: h.name, date: h.date,
            holiday_type: "GOVERNMENT", is_active: true, description: "",
          } as any);
        } catch { /* skip duplicates */ }
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["master-holidays"] }); message.success("Government holidays imported for 2026"); },
    onError: () => message.error("Import failed"),
  });

  const openAdd = () => {
    form.resetFields();
    form.setFieldsValue({ holiday_type: "GOVERNMENT", is_active: true });
    setModal({ open: true, editing: null });
  };

  const openEdit = (r: HolidayItem) => {
    form.setFieldsValue({ ...r, date: dayjs(r.date) });
    setModal({ open: true, editing: r });
  };

  const rows = Array.isArray(data) ? data : [];
  // Replace the govtCount / companyCount lines with:
  const holidayMap = new Map<string, HolidayItem>();
INDIAN_GOVT_HOLIDAYS_2026.forEach((h) =>
  holidayMap.set(h.date, {
    id: "", name: h.name, date: h.date, year: 2026,
    holiday_type: "GOVERNMENT", holiday_type_label: "Government Holiday",
    description: "", is_active: true, created_at: "", updated_at: "",
  })
);
rows.forEach((h) => holidayMap.set(h.date, h));

const allDisplayed = Array.from(holidayMap.values());
const govtCount    = allDisplayed.filter((h) => h.holiday_type === "GOVERNMENT").length;
const companyCount = allDisplayed.filter((h) => h.holiday_type === "COMPANY").length;
 

  // Calendar view renderer
  const renderCalendar = () => {
    const months = Array.from({ length: 12 }, (_, i) => i);
    const displayMonths = viewMode === "calendar" ? [calMonth] : months;

    const MonthGrid = ({ month }: { month: number }) => {
      const firstDay = dayjs(`${year}-${String(month + 1).padStart(2, "0")}-01`);
      const daysInMonth = firstDay.daysInMonth();
      const startDow = firstDay.day(); // 0=Sun
      const cells: (number | null)[] = [
        ...Array(startDow).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
      ];
      // pad to complete last row
      while (cells.length % 7 !== 0) cells.push(null);

      return (
        <div style={{ border: "1px solid var(--bms-border)", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
          {/* Month header */}
          <div style={{ background: "#1677ff", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{firstDay.format("MMMM YYYY")}</Text>
            <div style={{ display: "flex", gap: 6 }}>
              {/* <Tag color="green" style={{ fontSize: 11, margin: 0 }}>
                {rows.filter((h) => dayjs(h.date).month() === month).filter((h) => h.holiday_type === "GOVERNMENT").length} Govt
              </Tag>
              <Tag color="purple" style={{ fontSize: 11, margin: 0 }}>
                {rows.filter((h) => dayjs(h.date).month() === month).filter((h) => h.holiday_type === "COMPANY").length} Co.
              </Tag> */}
            </div>
          </div>
          {/* Day labels */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: "#f8fafc", borderBottom: "1px solid var(--bms-border)" }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} style={{ textAlign: "center", padding: "6px 0", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>{d}</div>
            ))}
          </div>
          {/* Date cells */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {cells.map((day, idx) => {
              const dateStr = day ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";
              const holiday = day ? holidayMap.get(dateStr) : undefined;
              const isGovt    = holiday?.holiday_type === "GOVERNMENT";
              const isCompany = holiday?.holiday_type === "COMPANY";
              const isSun = idx % 7 === 0;
              const isSat = idx % 7 === 6;
              const isWeekend = isSun || isSat;
              return (
                <Tooltip key={idx} title={holiday ? `${holiday.name} (${isGovt ? "Govt" : "Company"})` : undefined}>
                  <div style={{
                    minHeight: 44,
                    padding: "4px 6px",
                    borderRight: idx % 7 !== 6 ? "1px solid var(--bms-border)" : "none",
                    borderBottom: idx < cells.length - 7 ? "1px solid var(--bms-border)" : "none",
                    background: isGovt ? '#059669' : isCompany ? '#f59e0b' : isWeekend ? '#25bdc2' : 'var(--bms-surface)',
                    cursor: holiday ? "pointer" : "default",
                    transition: "background 0.1s",
                  }}
                    onClick={() => holiday && openEdit(holiday)}
                  >
                    {day && (
                      <>
                        <div style={{
                          fontSize: 12, fontWeight: holiday ? 700 : 400,
                          color: isGovt ? '#fff' : isCompany ? '#fff' : isWeekend ? '#1d1f24' : 'var(--bms-text)'
                        }}>
                          {day}
                        </div>
                        {holiday && (
                          <div style={{
                            fontSize: 9, lineHeight: 1.2, marginTop: 2,
                            color: isGovt ? '#dcfce7' : '#fef3c7',
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {holiday.name}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </Tooltip>
              );
            })}
          </div>
        </div>
      );
    };

    return (
      <div>
        {/* Legend */}
        <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
          {[
            { color: '#059669', border: '#15803d', text: 'Government Holiday' },
            { color: '#f59e0b', border: '#d97706', text: 'Company Holiday' },
            { color: "#25bdc2", border: "#1b57ce", text: "Weekend" },
          ].map(({ color, border, text }) => (
            <div key={text} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 14, height: 14, borderRadius: 3, background: color, border: `1.5px solid ${border}` }} />
              <Text style={{ fontSize: 12, color: "var(--bms-text-2)" }}>{text}</Text>
            </div>
          ))}
          <Text style={{ fontSize: 11, color: "var(--bms-text-3)", marginLeft: "auto" }}>Click a holiday to edit</Text>
        </div>

        {/* Single month nav (calendar mode) */}
        {viewMode === "calendar" && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <Button size="small" onClick={() => setCalMonth((m) => (m === 0 ? 11 : m - 1))}>‹ Prev</Button>
            <Text style={{ fontWeight: 600, minWidth: 120, textAlign: "center" }}>{dayjs().month(calMonth).format("MMMM")}</Text>
            <Button size="small" onClick={() => setCalMonth((m) => (m === 11 ? 0 : m + 1))}>Next ›</Button>
            <Button size="small" type="link" onClick={() => setCalMonth(dayjs().month())}>Today</Button>
          </div>
        )}

        {displayMonths.map((m) => <MonthGrid key={m} month={m} />)}
      </div>
    );
  };

  return (
    <div>
      <div className="master-panel-toolbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Select
            value={year} onChange={setYear} style={{ width: 100 }}
            options={Array.from({ length: 5 }, (_, i) => ({
              value: dayjs().year() - 1 + i,
              label: String(dayjs().year() - 1 + i),
            }))}
          />
          <Tag color="blue">{govtCount} Govt</Tag>
          <Tag color="purple">{companyCount} Company</Tag>
        </div>
        <Space wrap>
          {/* View toggle */}
          <div style={{ display: "flex", border: "1px solid var(--bms-border)", borderRadius: 6, overflow: "hidden" }}>
            {([
              { key: "table",    label: "☰ List"       },
              { key: "calendar", label: "🗓 Month"      },
              { key: "year",     label: "📅 Year"       },
            ] as { key: "table" | "calendar" | "year"; label: string }[]).map(({ key, label }) => (
              <button key={key}
                onClick={() => setViewMode(key)}
                style={{
                  padding: "4px 12px", border: "none", cursor: "pointer", fontSize: 12,
                  background: viewMode === key ? "#1677ff" : "var(--bms-surface-2)",
                  color: viewMode === key ? "#fff" : "var(--bms-text-2)",
                  borderRight: key !== "year" ? "1px solid var(--bms-border)" : "none",
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {canCreate && year === 2026 && (
            <Button
              icon={<ThunderboltOutlined />}
              loading={bulkImportMut.isPending}
              onClick={() => bulkImportMut.mutate()}
            >
              Import Govt Holidays
            </Button>
          )}
          {canCreate && (
            <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
              Add Holiday
            </Button>
          )}
        </Space>
      </div>

      <div className="master-panel-section" style={{ background: "color-mix(in srgb, var(--bms-warning) 15%, var(--bms-surface))", borderColor: "var(--bms-warning)", fontSize: 12, color: "var(--bms-warning)" }}>
        <strong>Holiday Policy</strong> — Government holidays are national/state holidays. Company holidays are org-specific offs.
        These dates will be marked as <strong>HOLIDAY</strong> in employee attendance calendars.
      </div>

      {/* Summary cards */}
      {rows.length > 0 && (
        <div className="master-panel-section">
          <Row gutter={12}>
          {[
            { label: "Total Holidays", value: rows.length,    color: "#1677ff", bg: "#eff6ff" },
            { label: "Government",     value: govtCount,      color: "#059669", bg: "#f0fdf4" },
            { label: "Company",        value: companyCount,   color: "#7c3aed", bg: "#faf5ff" },
            { label: "Active",         value: rows.filter((h) => h.is_active).length, color: "#059669", bg: "#ecfdf5" },
          ].map(({ label, value, color, bg }) => (
            <Col key={label} xs={12} sm={6}>
              <div style={{ padding: "12px 16px", borderRadius: 10, background: bg, border: `1px solid ${color}22`, textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{label}</div>
              </div>
            </Col>
          ))}
          </Row>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: 60 }}><Spin size="large" /></div>
      ) : rows.length === 0 && viewMode === "table" ? (
        <div style={{ textAlign: "center", padding: "60px 20px", border: "2px dashed var(--bms-border)", borderRadius: 12, background: "var(--bms-surface-2)" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🗓️</div>
          <Title level={5} style={{ color: "var(--bms-text)", marginBottom: 8 }}>No holidays configured for {year}</Title>
          <Text style={{ color: "var(--bms-text-3)", fontSize: 13, display: "block", marginBottom: 20 }}>
            Add holidays manually or import government holidays.
          </Text>
          <Space wrap style={{ justifyContent: "center" }}>
            {year === 2026 && <Button icon={<ThunderboltOutlined />} onClick={() => bulkImportMut.mutate()} loading={bulkImportMut.isPending}>Import Govt Holidays 2026</Button>}
            <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Add Holiday</Button>
          </Space>
        </div>
      ) : viewMode !== "table" ? (
        renderCalendar()
      ) : (
        <Table
          dataSource={rows}
          rowKey="id"
          size="middle"
          pagination={{ pageSize: 20, showTotal: (t, r) => `Showing ${r[0]}-${r[1]} of ${t}` }}
          columns={[
            {
              title: "Holiday Name", dataIndex: "name", key: "name",
              render: (v: string, r: HolidayItem) => (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: r.holiday_type === "GOVERNMENT" ? "#059669" : "#7c3aed" }} />
                  <Text strong>{v}</Text>
                </div>
              ),
            },
            {
              title: "Date", dataIndex: "date", key: "date",
              render: (v: string) => (
                <div>
                  <Text style={{ fontWeight: 600 }}>{dayjs(v).format("DD MMM YYYY")}</Text>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>{dayjs(v).format("dddd")}</div>
                </div>
              ),
            },
            {
              title: "Type", dataIndex: "holiday_type", key: "holiday_type",
              render: (v: string) => <Tag color={v === "GOVERNMENT" ? "green" : "purple"} style={{ borderRadius: 20 }}>{v === "GOVERNMENT" ? "🏛 Government" : "🏢 Company"}</Tag>,
            },
            {
              title: "Description", dataIndex: "description", key: "description",
              render: (v: string) => v ? <Text style={{ fontSize: 12, color: "#6b7280" }}>{v}</Text> : <Text type="secondary">—</Text>,
            },
            {
              title: "Status", dataIndex: "is_active", key: "is_active", width: 90,
              render: (_: boolean, r: HolidayItem) => r.id ? (
                <ActiveStatusSwitch
                  checked={r.is_active}
                  disabled={!canUpdate}
                  loading={statusMut.isPending && statusMut.variables?.id === r.id}
                  onChange={(checked) => statusMut.mutate({ id: r.id, is_active: checked })}
                />
              ) : <ActiveStatusSwitch checked={r.is_active} disabled />,
            },
            ...(canUpdate || canDelete ? [{
              title: "Action", key: "action", width: 80,
              render: (_: any, r: HolidayItem) => (
                <Space>
                  {canUpdate && <Tooltip title="Edit"><Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} /></Tooltip>}
                  {canDelete && (
                    <Popconfirm title={`Delete "${r.name}"?`} onConfirm={() => deleteMut.mutate(r.id)} okButtonProps={{ danger: true }}>
                      <Tooltip title="Delete"><Button size="small" danger icon={<DeleteOutlined />} /></Tooltip>
                    </Popconfirm>
                  )}
                </Space>
              ),
            }] : []),
          ]}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal
        title={modal.editing ? "Edit Holiday" : "Add Holiday"}
        open={modal.open}
        onCancel={() => { setModal({ open: false, editing: null }); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={saveMut.isPending}
        width={480}
      >
        <Form
          form={form} layout="vertical"
         onFinish={(v) => saveMut.mutate({ ...v, date: dayjs(v.date).format('YYYY-MM-DD'), year: dayjs(v.date).year() })}
        >
          <Form.Item name="name" label="Holiday Name" rules={[{ required: true, message: "Enter holiday name" }]}>
            <Input placeholder="e.g. Diwali, Republic Day" size="large" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="date" label="Date" rules={[{ required: true, message: "Select a date" }]}>
                <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" size="large" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="holiday_type" label="Type" rules={[{ required: true }]} initialValue="GOVERNMENT">
                <Select size="large" options={[
                  { value: "GOVERNMENT", label: "🏛 Government Holiday" },
                  { value: "COMPANY",    label: "🏢 Company Holiday"    },
                ]} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Description (optional)">
            <Input.TextArea rows={2} placeholder="Brief note about this holiday" />
          </Form.Item>
          <Form.Item name="is_active" label="Status" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
// ── Leave Type Table ──────────────────────────────────────────────────────────
function LeaveTypeTable() {
  return (
    <MasterTable queryKey="master-leave-types" api={leaveTypeApi} title="Leave Type"
      extraColumns={[
        { title: "Code",     dataIndex: "code",     key: "code",     render: (v: string) => <Tag style={{ fontFamily: "monospace" }}>{v}</Tag> },
        { title: "Max Days", dataIndex: "max_days", key: "max_days", render: (v: number) => v > 0 ? `${v} days/yr` : "Unlimited" },
        { title: "Paid",     dataIndex: "is_paid",  key: "is_paid",  render: (v: boolean) => <Tag color={v ? "green" : "orange"}>{v ? "Paid" : "Unpaid / LOP"}</Tag> },
      ]}
      extraFormItems={
        <>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="code" label="Short Code" rules={[{ required: true, message: "Enter a code" }, { max: 10, message: "Max 10 characters" }]}>
                <Input placeholder="e.g. CL, SL" maxLength={10} style={{ fontFamily: "monospace", textTransform: "uppercase" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="max_days" label="Max Days / Year" initialValue={0}>
                <InputNumber min={0} max={365} style={{ width: "100%" }} placeholder="0 = unlimited" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="is_paid" label="Paid Leave?" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren="Paid" unCheckedChildren="Unpaid" />
          </Form.Item>
          <Form.Item name="color" label="Color" initialValue="#1677ff">
            <Input type="color" style={{ width: 80, padding: 2 }} />
          </Form.Item>
        </>
      }
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── WORKFLOW ──────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
const PRESET_COLORS = ["#10B981","#3B82F6","#8B5CF6","#F59E0B","#EF4444","#6366F1","#EC4899","#14B8A6","#6B7280","#374151"];
const START_NODE_ID = "__start__";

function StartNode() {
  return (
    <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#059669", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 11, letterSpacing: 0.5, boxShadow: "0 0 0 4px #bbf7d0, 0 4px 12px rgba(22,163,74,0.35)", border: "2px solid #15803d", userSelect: "none" }}>
      START
      <Handle type="source" position={Position.Right} style={{ background: "#15803d", width: 10, height: 10, border: "2px solid #fff" }} />
    </div>
  );
}

function StateNode({ data }: { data: any }) {
  return (
    <div style={{ background: data.color, color: "#fff", borderRadius: 8, padding: "10px 18px", minWidth: 130, textAlign: "center", fontWeight: 600, fontSize: 13, boxShadow: "0 2px 8px rgba(0,0,0,0.18)" }}>
      <Handle type="target" position={Position.Left} style={{ background: "rgba(255,255,255,0.6)", width: 10, height: 10 }} />
      {data.is_initial && <div style={{ fontSize: 9, opacity: 0.85, marginBottom: 2, background: "rgba(255,255,255,0.2)", borderRadius: 4, padding: "1px 4px", display: "inline-block" }}>INITIAL</div>}
      <div>{data.label}</div>
      {data.is_final && <div style={{ fontSize: 9, opacity: 0.85, marginTop: 2, background: "rgba(0,0,0,0.2)", borderRadius: 4, padding: "1px 4px", display: "inline-block" }}>FINAL</div>}
      <Handle type="source" position={Position.Right} style={{ background: "rgba(255,255,255,0.6)", width: 10, height: 10 }} />
    </div>
  );
}

const nodeTypes = { stateNode: StateNode, startNode: StartNode };

function buildFlowData(states: WorkflowState[], transitions: WorkflowTransition[]) {
  const sorted = [...states].sort((a, b) => a.order - b.order);
  const startNode: Node = { id: START_NODE_ID, type: "startNode", position: { x: 40, y: 200 }, data: {}, draggable: true };
  const stateNodes: Node[] = sorted.map((s, i) => ({ id: s.id, type: "stateNode", position: { x: 220 + i * 220, y: 180 }, data: { label: s.name, color: s.color_code, is_initial: s.is_initial, is_final: s.is_final }, draggable: true }));
  const startEdges: Edge[] = sorted.filter((s) => s.is_initial).map((s) => ({ id: `${START_NODE_ID}->${s.id}`, source: START_NODE_ID, target: s.id, type: "smoothstep", markerEnd: { type: MarkerType.ArrowClosed, color: "#059669" }, style: { stroke: "#059669", strokeWidth: 2, strokeDasharray: "6 3" }, selectable: false }));
  const transEdges: Edge[] = transitions.map((t) => ({ id: t.id, source: t.source_state, target: t.destination_state, label: t.label || undefined, labelStyle: { fontSize: 11, fill: "#1f2937" }, labelBgStyle: { fill: "#fff", fillOpacity: 0.95 }, labelBgPadding: [6, 8] as [number, number], markerEnd: { type: MarkerType.ArrowClosed, color: "#6366f1" }, style: { stroke: "#6366f1", strokeWidth: 2.5 }, data: { group_names: t.group_names ?? [], transition_id: t.id }, type: "smoothstep" }));
  return { nodes: [startNode, ...stateNodes], edges: [...startEdges, ...transEdges] };
}

function WorkflowTab({ appLabel, model, contentTypeId }: { appLabel: string; model: string; contentTypeId: number | null; }) {
  const canManage = usePermission(PERMS.MASTER_WORKFLOW_MANAGE);
  const qc = useQueryClient();
  const [stateModal, setStateModal] = useState<{ open: boolean; editing: WorkflowState | null }>({ open: false, editing: null });
  const [stateForm] = Form.useForm();
  const [selectedTrans, setSelectedTrans] = useState<WorkflowTransition | null>(null);
  const [pendingConn, setPendingConn] = useState<{ source: string; target: string } | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const reactFlowRef = useRef<any>(null);

  const { data: statesData = [] } = useQuery<WorkflowState[]>({ queryKey: ["wf-states", appLabel, model], queryFn: () => workflowStateApi.list(appLabel, model) });
  const { data: transData = [] } = useQuery<WorkflowTransition[]>({ queryKey: ["wf-transitions", appLabel, model], queryFn: () => workflowTransitionApi.list(appLabel, model) });
  const { data: kcGroupsRaw } = useQuery<{ groups: string[] }>({ queryKey: ["keycloak-groups"], queryFn: () => get<{ groups: string[] }>("/keycloak-groups/"), staleTime: 300_000 });
  const kcGroups: string[] = kcGroupsRaw?.groups ?? [];

  // Build flow data only after states have loaded, so edges are never
  // overwritten with an empty transition array during initialization.
  const flowLoadedRef = useRef(false);
  useEffect(() => {
    // Skip the very first render (both arrays are empty) — wait for real data.
    if (statesData.length === 0 && !flowLoadedRef.current) return;
    flowLoadedRef.current = true;
    const { nodes: n, edges: e } = buildFlowData(statesData, transData);
    setNodes(n);
    setEdges(e);
    requestAnimationFrame(() => {
      reactFlowRef.current?.fitView({ padding: 0.3 });
    });
  }, [statesData, transData]);

  const createStateMut = useMutation({ mutationFn: (v: any) => workflowStateApi.create({ ...v, content_type: contentTypeId }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["wf-states", appLabel, model] }); setStateModal({ open: false, editing: null }); stateForm.resetFields(); message.success("State created"); }, onError: (e: any) => message.error(apiErrorMsg(e, "Failed to create state")) });
  const updateStateMut = useMutation({ mutationFn: ({ id, data }: any) => workflowStateApi.update(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["wf-states", appLabel, model] }); setStateModal({ open: false, editing: null }); stateForm.resetFields(); message.success("State updated"); }, onError: (e: any) => message.error(apiErrorMsg(e, "Failed to update state")) });
  const createTransMut = useMutation({ mutationFn: (v: any) => workflowTransitionApi.create({ ...v, content_type: contentTypeId }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["wf-transitions", appLabel, model] }); setPendingConn(null); setSelectedTrans(null); message.success("Transition created"); }, onError: (e: any) => message.error(apiErrorMsg(e, "Failed to create transition")) });
  const updateTransMut = useMutation({ mutationFn: ({ id, data }: any) => workflowTransitionApi.update(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["wf-transitions", appLabel, model] }); setSelectedTrans(null); message.success("Groups saved"); }, onError: (e: any) => message.error(apiErrorMsg(e, "Failed to save groups")) });

  const onConnect = useCallback((conn: Connection) => {
    if (!conn.source || !conn.target) return;
    if (conn.source === START_NODE_ID) { const target = statesData.find((s) => s.id === conn.target); if (target && !target.is_initial) updateStateMut.mutate({ id: target.id, data: { ...target, is_initial: true } }); return; }
    const existing = transData.find((t) => t.source_state === conn.source && t.destination_state === conn.target);
    if (existing) { setSelectedTrans(existing); return; }
    setPendingConn({ source: conn.source!, target: conn.target! });
    createTransMut.mutate({ source_state: conn.source, destination_state: conn.target, keycloak_group_names: [] });
  }, [statesData, transData, createTransMut, updateStateMut]);

  const onEdgeClick = useCallback((_: any, edge: Edge) => { if (edge.id.startsWith(START_NODE_ID)) return; const trans = transData.find((t) => t.id === edge.id); if (trans) setSelectedTrans(trans); }, [transData]);

  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [groupSearch, setGroupSearch] = useState("");
  useEffect(() => { if (selectedTrans) { setSelectedGroups(selectedTrans.group_names ?? []); setGroupSearch(""); } }, [selectedTrans]);
  const filteredGroups = kcGroups.filter((g) => g.toLowerCase().includes(groupSearch.toLowerCase()));
  const saveGroups = () => { if (!selectedTrans) return; updateTransMut.mutate({ id: selectedTrans.id, data: { keycloak_group_names: selectedGroups } }); };

  return (
    <div className="master-workflow-canvas">
      <div className="master-workflow-sidebar">
        {canManage && <Button type="primary" icon={<PlusOutlined />} block size="small" style={{ marginBottom: 6, borderRadius: 6 }} onClick={() => { stateForm.resetFields(); stateForm.setFieldsValue({ color_code: PRESET_COLORS[statesData.length % PRESET_COLORS.length], order: statesData.length + 1, is_initial: false, is_final: false }); setStateModal({ open: true, editing: null }); }}>Add State</Button>}
        {statesData.length === 0 && <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 12, padding: "12px 0" }}>No states yet.</div>}
        {statesData.map((s) => (
          <div key={s.id} style={{ background: s.color_code, color: "#fff", borderRadius: 8, padding: "8px 10px", cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.15)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div><div style={{ fontSize: 10, opacity: 0.8 }}>{s.is_initial ? "Initial" : s.is_final ? "Final" : `Order ${s.order}`}</div></div>
            {canManage && <EditOutlined style={{ fontSize: 12, opacity: 0.85, cursor: "pointer", flexShrink: 0, marginLeft: 6 }} onClick={() => { stateForm.setFieldsValue({ ...s }); setStateModal({ open: true, editing: s }); }} />}
          </div>
        ))}
        <div style={{ marginTop: "auto", paddingTop: 8, fontSize: 11, color: "#9ca3af", lineHeight: 1.4 }}><div style={{ fontWeight: 600, marginBottom: 4 }}>How to use</div>Drag from a state's right handle to another to create a transition.<br />Drag from <span style={{ color: "#059669", fontWeight: 600 }}>START</span> to mark the initial state.<br />Click an arrow to assign groups.</div>
      </div>
      <div className="master-workflow-main">
        <ReactFlow
          nodes={nodes} edges={edges}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          onConnect={onConnect} onEdgeClick={onEdgeClick}
          nodeTypes={nodeTypes}
          onInit={(instance) => { reactFlowRef.current = instance; }}
          defaultEdgeOptions={{ type: "smoothstep", markerEnd: { type: MarkerType.ArrowClosed } }}
          connectionLineStyle={{ stroke: "#1677ff", strokeWidth: 2 }}
          style={{ background: "var(--bms-surface-2)" }}
        >
          <Background gap={18} color="var(--bms-border)" /><Controls /><MiniMap nodeColor={(n) => n.type === "startNode" ? "#059669" : ((n.data as any)?.color ?? "#6B7280")} nodeStrokeWidth={0} />
        </ReactFlow>
      </div>
      {selectedTrans && (
        <div className="master-workflow-groups">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div><div style={{ fontSize: 13, fontWeight: 700, color: "var(--bms-text)" }}>Assign Groups</div><div style={{ fontSize: 11, color: "var(--bms-text-3)", marginTop: 2 }}>{selectedTrans.source_state_detail?.name} → {selectedTrans.destination_state_detail?.name}</div></div>
            <button onClick={() => setSelectedTrans(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#9ca3af", padding: 2 }}>×</button>
          </div>
          <Input size="small" placeholder="Search groups…" value={groupSearch} onChange={(e) => setGroupSearch(e.target.value)} style={{ marginBottom: 8, borderRadius: 6 }} />
          <div style={{ padding: "6px 8px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => setSelectedGroups(selectedGroups.length === kcGroups.length ? [] : [...kcGroups])}>
            <div style={{ width: 16, height: 16, border: "1.5px solid #d1d5db", borderRadius: 3, background: selectedGroups.length === kcGroups.length ? "#1677ff" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {selectedGroups.length === kcGroups.length && <span style={{ color: "#fff", fontSize: 10, lineHeight: 1 }}>✓</span>}
              {selectedGroups.length > 0 && selectedGroups.length < kcGroups.length && <span style={{ color: "#1677ff", fontSize: 12, lineHeight: 1 }}>—</span>}
            </div>
            <span style={{ fontSize: 12, color: "#374151", fontWeight: 500 }}>Select All</span>
          </div>
          <div style={{ flex: 1, overflowY: "auto", marginBottom: 10 }}>
            {filteredGroups.length === 0 && <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 12, padding: "16px 0" }}>{kcGroups.length === 0 ? "No Keycloak groups found" : "No results"}</div>}
            {filteredGroups.map((g) => {
              const checked = selectedGroups.includes(g);
              return (
                <div key={g} onClick={() => setSelectedGroups(checked ? selectedGroups.filter((x) => x !== g) : [...selectedGroups, g])} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", cursor: "pointer", borderRadius: 6, background: checked ? "#eff6ff" : "transparent", borderBottom: "1px solid #f9fafb" }} onMouseEnter={(e) => { if (!checked) (e.currentTarget as HTMLElement).style.background = "#f9fafb"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = checked ? "#eff6ff" : "transparent"; }}>
                  <div style={{ width: 16, height: 16, border: `1.5px solid ${checked ? "#1677ff" : "#d1d5db"}`, borderRadius: 3, background: checked ? "#1677ff" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{checked && <span style={{ color: "#fff", fontSize: 10, lineHeight: 1 }}>✓</span>}</div>
                  <span style={{ fontSize: 12, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g}</span>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8, textAlign: "center" }}>{selectedGroups.length === 0 ? "Empty = all groups allowed" : `${selectedGroups.length} group${selectedGroups.length > 1 ? "s" : ""} selected`}</div>
          <Button type="primary" block size="small" loading={updateTransMut.isPending} onClick={saveGroups} style={{ borderRadius: 6 }}>Save Groups</Button>
        </div>
      )}
      <Modal title={stateModal.editing ? "Edit State" : "Add State"} open={stateModal.open} onCancel={() => { setStateModal({ open: false, editing: null }); stateForm.resetFields(); }} onOk={() => stateForm.submit()} confirmLoading={createStateMut.isPending || updateStateMut.isPending} width={400}>
        <Form form={stateForm} layout="vertical" onFinish={(v) => { if (stateModal.editing) updateStateMut.mutate({ id: stateModal.editing.id, data: v }); else createStateMut.mutate(v); }}>
          <Form.Item name="name" label="State Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="order" label="Order" rules={[{ required: true }]}><Input type="number" min={1} /></Form.Item></Col>
            <Col span={12}>
              <Form.Item
                name="color_code"
                label="Color"
                getValueFromEvent={(color) => color.toHexString()}
              >
                <ColorPicker showText format="hex" disabledAlpha />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="is_initial" label="Mark as Initial" valuePropName="checked" initialValue={false}><Switch /></Form.Item></Col>
            <Col span={12}><Form.Item name="is_final"   label="Mark as Final"   valuePropName="checked" initialValue={false}><Switch /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}

// ── Reimbursement Config — Premium Singleton UI ────────────────────────────
function ReimbursementConfigTable() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const { data: config, isLoading } = useQuery({
    queryKey: ["master-reimbursement-config"],
    queryFn: () => reimbursementConfigApi.get(),
  });

  const isConfigured = config?.is_configured === true;

  const { data: employeesData } = useQuery({
    queryKey: ["employees-dropdown"],
    queryFn: () => employeeApi.list({ page_size: 200 }),
  });
  const employeesList = Array.isArray(employeesData)
    ? employeesData
    : employeesData?.results ?? [];

  const saveMut = useMutation({
    mutationFn: (approver_id: string) => reimbursementConfigApi.set(approver_id),
    onSuccess: () => {
      message.success("Approver configured successfully");
      queryClient.invalidateQueries({ queryKey: ["master-reimbursement-config"] });
      setModalOpen(false);
      form.resetFields();
    },
    onError: (err: any) => message.error(apiErrorMsg(err, "Failed to save configuration")),
  });

  const openModal = () => {
    if (isConfigured && config?.approver_id) {
      form.setFieldsValue({ approver: config.approver_id });
    } else {
      form.resetFields();
    }
    setModalOpen(true);
  };

  const onFinish = (vals: { approver: string }) => saveMut.mutate(vals.approver);

  if (isLoading) {
    return (
      <div style={{ padding: 60, textAlign: "center" }}>
        <Spin size="large" />
        <div style={{ marginTop: 12, color: "#888", fontSize: 13 }}>Loading configuration…</div>
      </div>
    );
  }

  const WORKFLOW_STEPS = [
    { icon: <SendOutlined />,          label: "Employee Submits",   desc: "Claim raised",        color: "#6366f1" },
    { icon: <AuditOutlined />,         label: "Approver Reviews",   desc: "Checks receipts",     color: "#8b5cf6" },
    { icon: <SafetyCertificateOutlined />, label: "Approved / Rejected", desc: "Decision made",  color: "#0ea5e9" },
    { icon: <FileProtectOutlined />,   label: "Expense Created",    desc: "Auto-generated",      color: "#10b981" },
    { icon: <DollarCircleOutlined />,  label: "Claim Paid Out",     desc: "Mark as Paid",        color: "#f59e0b" },
  ];

  return (
    <div>
      {/* ── Hero Banner ─────────────────────────────────────────────── */}
      <div
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
          borderRadius: 16,
          padding: "28px 32px",
          marginBottom: 28,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative blobs */}
        <div style={{
          position: "absolute", top: -30, right: -30, width: 120, height: 120,
          borderRadius: "50%", background: "rgba(255,255,255,0.08)",
        }} />
        <div style={{
          position: "absolute", bottom: -20, right: 80, width: 80, height: 80,
          borderRadius: "50%", background: "rgba(255,255,255,0.06)",
        }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <SafetyCertificateOutlined style={{ color: "#fff", fontSize: 18 }} />
            </div>
            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase" }}>
              Reimbursement Workflow
            </span>
          </div>
          <Title level={3} style={{ color: "#fff", margin: 0, fontWeight: 700 }}>
            Approval Configuration
          </Title>
          <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, display: "block", marginTop: 6 }}>
            Designate the single employee who reviews and approves all employee reimbursement claims.
            On approval, a Company Expense is automatically created.
          </Text>
        </div>
      </div>

      {/* ── Workflow Pipeline ────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <Text strong style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 14, letterSpacing: 0.5, textTransform: "uppercase" }}>
          Workflow Pipeline
        </Text>
        <div style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "wrap", gap: 0 }}>
          {WORKFLOW_STEPS.map((step, i) => (
            <>
              <div
                key={step.label}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  background: "#fff", border: `1.5px solid ${step.color}22`,
                  borderRadius: 12, padding: "14px 18px",
                  minWidth: 120, flex: "1 1 100px",
                  boxShadow: `0 2px 8px ${step.color}18`,
                  position: "relative",
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: `linear-gradient(135deg, ${step.color}33, ${step.color}11)`,
                  border: `2px solid ${step.color}44`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 8, fontSize: 18, color: step.color,
                }}>
                  {step.icon}
                </div>
                <Text strong style={{ fontSize: 12, textAlign: "center", lineHeight: 1.3, color: "#222" }}>
                  {step.label}
                </Text>
                <Text type="secondary" style={{ fontSize: 10, textAlign: "center", marginTop: 2 }}>
                  {step.desc}
                </Text>
                {/* Step badge */}
                <div style={{
                  position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)",
                  background: step.color, color: "#fff", borderRadius: "50%",
                  width: 18, height: 18, fontSize: 10, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {i + 1}
                </div>
              </div>
              {i < WORKFLOW_STEPS.length - 1 && (
                <div key={`arrow-${i}`} style={{ color: "#c0c0c0", fontSize: 18, padding: "0 4px", flexShrink: 0 }}>
                  <ArrowRightOutlined />
                </div>
              )}
            </>
          ))}
        </div>
      </div>

      {/* ── Approver Config Card ─────────────────────────────────────── */}
      {isConfigured ? (
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {/* Approver Card */}
          <div style={{ flex: "1 1 320px", maxWidth: 480 }}>
            <Text strong style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 12, letterSpacing: 0.5, textTransform: "uppercase" }}>
              Designated Approver
            </Text>
            <div
              style={{
                borderRadius: 16, overflow: "hidden",
                boxShadow: "0 4px 24px rgba(102,102,234,0.15)",
                border: "1px solid #e8e3ff",
              }}
            >
              {/* Card header gradient */}
              <div style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                padding: "20px 24px",
                display: "flex", alignItems: "center", gap: 16,
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%",
                  background: "rgba(255,255,255,0.2)",
                  border: "3px solid rgba(255,255,255,0.4)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22, fontWeight: 700, color: "#fff", flexShrink: 0,
                }}>
                  {config?.approver_name?.charAt(0)?.toUpperCase() ?? "A"}
                </div>
                <div>
                  <Text style={{ color: "#fff", fontSize: 18, fontWeight: 700, display: "block" }}>
                    {config?.approver_name}
                  </Text>
                  <Tag
                    icon={<SafetyCertificateOutlined />}
                    color="#ffffff30"
                    style={{ color: "#fff", border: "1px solid rgba(255,255,255,0.4)", fontSize: 11 }}
                  >
                    Designated Approver
                  </Tag>
                </div>
              </div>
              {/* Card body */}
              <div style={{ background: "#fff", padding: "18px 24px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {config?.approver_code && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <IdcardOutlined style={{ color: "#8b5cf6", fontSize: 14 }} />
                      <Text style={{ fontSize: 13 }}>EMP ID: <strong>{config.approver_code}</strong></Text>
                    </div>
                  )}
                  {config?.approver_email && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <MailOutlined style={{ color: "#8b5cf6", fontSize: 14 }} />
                      <Text style={{ fontSize: 13 }}>{config.approver_email}</Text>
                    </div>
                  )}
                  {config?.configured_by_name && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, paddingTop: 10, borderTop: "1px solid #f0f0f0" }}>
                      <UserOutlined style={{ color: "#aaa", fontSize: 13 }} />
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        Last configured by <strong>{config.configured_by_name}</strong>
                      </Text>
                    </div>
                  )}
                </div>
                <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
                  <Button
                    icon={<EditOutlined />}
                    onClick={openModal}
                    type="primary"
                    ghost
                    style={{ borderRadius: 8 }}
                  >
                    Change Approver
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Info panel */}
          <div style={{ flex: "1 1 200px", maxWidth: 320 }}>
            <Text strong style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 12, letterSpacing: 0.5, textTransform: "uppercase" }}>
              How It Works
            </Text>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { icon: <CheckCircleOutlined style={{ color: "#10b981" }} />, text: "All employees see this person as their approver" },
                { icon: <CheckCircleOutlined style={{ color: "#10b981" }} />, text: "Approver gets notified on every new submission" },
                { icon: <CheckCircleOutlined style={{ color: "#10b981" }} />, text: "On approval, a Company Expense is auto-created" },
                { icon: <CheckCircleOutlined style={{ color: "#10b981" }} />, text: "Approver can request more info or reject claims" },
                { icon: <CheckCircleOutlined style={{ color: "#10b981" }} />, text: "Final step: mark claim as Paid to close the loop" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "#f8fffe", borderRadius: 8, padding: "8px 12px", border: "1px solid #d1fae5" }}>
                  <span style={{ marginTop: 1, flexShrink: 0 }}>{item.icon}</span>
                  <Text style={{ fontSize: 12, color: "#374151", lineHeight: 1.5 }}>{item.text}</Text>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ── Not configured state ──────────────────────────────────── */
        <div
          style={{
            borderRadius: 16, border: "2px dashed #f59e0b",
            background: "linear-gradient(135deg, #fffbeb, #fef3c7)",
            padding: 32, maxWidth: 580,
          }}
        >
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start", marginBottom: 24 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, flexShrink: 0,
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 12px rgba(245,158,11,0.4)",
            }}>
              <InfoCircleOutlined style={{ color: "#fff", fontSize: 24 }} />
            </div>
            <div>
              <Text strong style={{ fontSize: 17, display: "block", color: "#92400e" }}>
                Approver Not Configured
              </Text>
              <Text style={{ fontSize: 13, color: "#b45309", display: "block", marginTop: 4 }}>
                Employees cannot submit reimbursement claims until you designate an approver.
                Complete the setup below to unlock the reimbursement workflow.
              </Text>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {[
              "Go to Finance → Employee Reimbursements to see all claims",
              "Once configured, the approver is auto-assigned to every new claim",
              "The approver can approve, reject, or request more info on claims",
            ].map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{
                  width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                  background: "#f59e0b", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700,
                }}>{i + 1}</div>
                <Text style={{ fontSize: 12, color: "#78350f" }}>{step}</Text>
              </div>
            ))}
          </div>
          <Button
            type="primary"
            icon={<SettingOutlined />}
            onClick={openModal}
            size="large"
            style={{
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              border: "none", borderRadius: 10,
              boxShadow: "0 4px 12px rgba(245,158,11,0.4)",
              fontWeight: 600,
            }}
          >
            Configure Approver Now
          </Button>
        </div>
      )}

      {/* ── Modal ───────────────────────────────────────────────────── */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, #667eea, #764ba2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <SafetyCertificateOutlined style={{ color: "#fff", fontSize: 15 }} />
            </div>
            <span>{isConfigured ? "Change Reimbursement Approver" : "Configure Reimbursement Approver"}</span>
          </div>
        }
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={saveMut.isPending}
        okText={isConfigured ? "Save Changes" : "Configure Approver"}
        okButtonProps={{ style: { background: "linear-gradient(135deg, #667eea, #764ba2)", border: "none" } }}
        destroyOnClose
        width={500}
      >
        <Alert
          type="info"
          showIcon
          message="This replaces any previously configured approver across the organisation."
          style={{ marginBottom: 20, borderRadius: 8 }}
        />
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="approver"
            label={<span style={{ fontWeight: 600 }}>Designated Approver</span>}
            rules={[{ required: true, message: "Please select an employee" }]}
          >
            <Select
              placeholder="Search and select employee…"
              showSearch
              optionFilterProp="label"
              size="large"
              style={{ width: "100%" }}
            >
              {employeesList.map((emp: any) => (
                <Select.Option
                  key={emp.id}
                  value={emp.id}
                  label={emp.full_name || emp.username}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "2px 0" }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                      background: "linear-gradient(135deg, #667eea, #764ba2)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontSize: 12, fontWeight: 700,
                    }}>
                      {(emp.full_name || emp.username)?.charAt(0)?.toUpperCase()}
                    </div>
                    <div style={{ lineHeight: 1.3 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{emp.full_name || emp.username}</div>
                      <div style={{ fontSize: 11, color: "#888" }}>
                        {emp.employee_code ? `${emp.employee_code} · ` : ""}{emp.email}
                      </div>
                    </div>
                  </div>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MasterPage({ defaultTab }: { defaultTab?: string }) {
  const navigate = useNavigate();
  const user        = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);

  const { data: projectCt } = useQuery({ queryKey: ["wf-ct", "projects", "project"], queryFn: () => workflowStateApi.contentTypeId("projects", "project"), staleTime: Infinity });
  const { data: ticketCt }  = useQuery({ queryKey: ["wf-ct", "tickets",  "ticket"],  queryFn: () => workflowStateApi.contentTypeId("tickets",  "ticket"),  staleTime: Infinity });
  const projectCtId = projectCt?.id ?? null;
  const ticketCtId  = ticketCt?.id  ?? null;

  const tabContent: Record<string, ReactNode> = {
    designation:     <MasterTable queryKey="master-designations"     api={designationApi}    title="Designation"     />,
    department:      <MasterTable queryKey="master-departments"      api={departmentApi}     title="Department"      />,
    location:        <LocationTable />,
    "employment-type": <MasterTable queryKey="master-employment-types" api={employmentTypeApi} title="Employment Type" />,
    "shift-category":  <ShiftCategoryTable />,
    "rate-card":            <RateCardTable />,
    reimbursement:          <ReimbursementConfigTable />,
    "reimbursement-config": <ReimbursementConfigTable />,
    holiday:                <HolidayTab />,
    "leave-type":      <LeaveTypeTable />,
    "client-category": <MasterTable queryKey="master-client-categories" api={clientCategoryApi} title="Client Category" scope="client" />,
    "business-type":   <BusinessTypeTable />,
    "billing-type":    <MasterTable queryKey="master-billing-types"   api={billingTypeApi}   title="Billing Type" scope="project" />,
    "followup-type":   <MasterTable queryKey="master-followup-types"  api={followupTypeApi}  title="Follow-up Type" scope="project" />,
    workflow: (
      <Tabs
        className="master-workflow-tabs"
        items={[
          { key: "project", label: "Project Workflow", children: <WorkflowTab appLabel="projects" model="project" contentTypeId={projectCtId} /> },
          { key: "ticket",  label: "Ticket Workflow",  children: <WorkflowTab appLabel="tickets"  model="ticket"  contentTypeId={ticketCtId}  /> },
        ]}
      />
    ),
  };

  if (!defaultTab) {
    return <MasterHub />;
  }

  const itemDef = getMasterItemDef(defaultTab);
  const requiredPerm = MASTER_TAB_PERMISSIONS[defaultTab];
  if (!requiredPerm || !hasPermission(user, permissions, requiredPerm) || !tabContent[defaultTab]) {
    return <MasterHub />;
  }

  return (
    <div className="master-detail-page">
      <div className="master-detail-header">
        <Button type="link" className="master-detail-back" onClick={() => navigate("/master")}>
          ← All Masters
        </Button>
        <div className="master-detail-heading">
          <h1 className="master-detail-title">{itemDef?.label ?? "Master"}</h1>
          {itemDef?.description && (
            <p className="master-detail-subtitle">{itemDef.description}</p>
          )}
        </div>
      </div>
      <Card className="master-detail-card">
        {tabContent[defaultTab]}
      </Card>
    </div>
  );
}