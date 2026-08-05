import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table, Button, Tag, Space, Typography, Modal, Form, Input,
  Select, Switch, Popconfirm, Tooltip, Card, Row, Col,
  Tabs, Badge, message, TimePicker, Spin, Checkbox, Divider, Alert, Empty,
} from "antd";
import {
  PlusOutlined, DeleteOutlined, EditOutlined, EyeOutlined,
  CheckOutlined, CloseOutlined, ApartmentOutlined, ClockCircleOutlined,
  ArrowRightOutlined, TeamOutlined, SaveOutlined,
} from "@ant-design/icons";

import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState,
  type Node, type Edge, type Connection,
  MarkerType, Handle, Position,
  addEdge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  workflowGroupApi, workflowStateApi, workflowTransitionApi,
  type WorkflowState, type WorkflowGroup, type WorkflowTransition,
} from "@/services/workflow";
import {
  designationApi, departmentApi, locationApi, gradeApi, employmentTypeApi,
  shiftCategoryApi, rateCardApi, clientCategoryApi, businessTypeApi, billingTypeApi,
  type MasterItem, type ShiftCategoryItem, type RateCardItem, type BusinessTypeItem,
} from "@/services/master";
import dayjs from "dayjs";
import { apiErrorMsg } from "@/utils/apiError";
import { get } from "@/services/api";
import { useMasterCrud, usePermission } from "@/hooks/usePermission";
import { hasPermission } from "@/utils/access";
import { PERMS } from "@/constants/permissions";
import { useAuthStore } from "@/store/auth";
import type { BmsPermission } from "@/constants/permissions";

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

function MasterTable({
  queryKey,
  api,
  title,
  scope = "hrms",
  extraColumns = [],
  extraFormItems,
}: MasterTableProps) {
  const { canCreate, canUpdate, canDelete } = useMasterCrud(scope);
  const qc = useQueryClient();
  const [modal, setModal] = useState<{ open: boolean; editing: MasterItem | null }>({ open: false, editing: null });
  const [form] = Form.useForm();

  const { data = [], isLoading, isError } = useQuery({
    queryKey: [queryKey],
    queryFn: () => api.list(),
    retry: 1,
  });

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKey] });
      message.success(`${title} deleted`);
    },
    onError: () => message.error(`Failed to delete ${title}`),
  });

  const openAdd = () => { form.resetFields(); form.setFieldsValue({ is_active: true }); setModal({ open: true, editing: null }); };
  const openEdit = (r: MasterItem) => { form.setFieldsValue(r); setModal({ open: true, editing: r }); };

  const baseColumns = [
    {
      title: "Name", dataIndex: "name", key: "name",
      render: (v: string) => <Text strong>{v}</Text>,
    },
    ...extraColumns,
    {
      title: "Status", dataIndex: "is_active", key: "is_active",
      render: (v: boolean) => <Tag color={v ? "success" : "default"}>{v ? "Active" : "Inactive"}</Tag>,
    },
    {
      title: "Created On", dataIndex: "created_at", key: "created_at",
      render: (v: string) => dayjs(v).format("DD MMM YYYY | hh:mm A"),
    },
    {
      title: "Last Modified", dataIndex: "updated_at", key: "updated_at",
      render: (v: string) => dayjs(v).format("DD MMM YYYY | hh:mm A"),
    },
    ...(canUpdate || canDelete ? [{
      title: "Action", key: "action", width: 80,
      render: (_: any, r: MasterItem) => (
        <Space>
          {canUpdate && (
            <Tooltip title="Edit">
              <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
            </Tooltip>
          )}
          {canDelete && (
            <Popconfirm title={`Delete ${r.name}?`} onConfirm={() => deleteMut.mutate(r.id)} okButtonProps={{ danger: true }}>
              <Tooltip title="Delete">
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    }] : []),
  ];

  const rows = Array.isArray(data) ? data : [];

  return (
    <>
      <div className="table-toolbar">
        <Text className="table-toolbar-title">
          {title} — <span style={{ color: "#8c9ab0" }}>Showing {rows.length} records</span>
          {isError && <Tag color="error" style={{ marginLeft: 8 }}>API error — check auth</Tag>}
        </Text>
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
            Add {title}
          </Button>
        )}
      </div>
      <Table
        dataSource={rows}
        columns={baseColumns}
        rowKey="id"
        loading={isLoading}
        size="middle"
        pagination={{ pageSize: 15, showTotal: (t, r) => `Showing ${r[0]}-${r[1]} of ${t}` }}
      />
      <Modal
        title={modal.editing ? `Edit ${title}` : `Add ${title}`}
        open={modal.open}
        onCancel={() => { setModal({ open: false, editing: null }); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={saveMut.isPending}
        width={440}
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

// ── Location Table (has extra fields) ─────────────────────────────────────────
function LocationTable() {
  return (
    <MasterTable
      queryKey="master-locations"
      api={locationApi}
      title="Location"
      extraColumns={[
        { title: "City", dataIndex: "city", key: "city" },
        { title: "State", dataIndex: "state", key: "state" },
      ]}
      extraFormItems={
        <>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="city" label="City">
                <Input placeholder="City" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="state" label="State">
                <Input placeholder="State" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="country" label="Country" initialValue="India">
            <Input placeholder="Country" />
          </Form.Item>
        </>
      }
    />
  );
}

// ── Shift Category Table ──────────────────────────────────────────────────────

const SHIFT_PRESETS = [
  { label: "9 AM – 6 PM", start: "09:00:00", end: "18:00:00", name: "Morning Shift (9AM-6PM)" },
  { label: "10 AM – 7 PM", start: "10:00:00", end: "19:00:00", name: "General Shift (10AM-7PM)" },
];

function ShiftCategoryTable() {
  const { canCreate, canUpdate, canDelete } = useMasterCrud("hrms");
  const qc = useQueryClient();
  const [modal, setModal] = useState<{ open: boolean; editing: ShiftCategoryItem | null }>({ open: false, editing: null });
  const [form] = Form.useForm();

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["master-shift-categories"],
    queryFn: () => shiftCategoryApi.list(),
    retry: 1,
  });

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
      setModal({ open: false, editing: null });
      form.resetFields();
      message.success(editing ? "Shift updated" : "Shift created");
    },
    onError: (e: any) => message.error(apiErrorMsg(e, "Failed to save shift")),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => shiftCategoryApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["master-shift-categories"] }); message.success("Shift deleted"); },
    onError: () => message.error("Failed to delete shift"),
  });

  const openAdd = () => {
    form.resetFields();
    form.setFieldsValue({ is_active: true });
    setModal({ open: true, editing: null });
  };

  const openEdit = (r: ShiftCategoryItem) => {
    form.setFieldsValue({
      ...r,
      start_time: r.start_time ? dayjs(r.start_time, "HH:mm:ss") : null,
      end_time:   r.end_time   ? dayjs(r.end_time,   "HH:mm:ss") : null,
    });
    setModal({ open: true, editing: r });
  };

  const applyPreset = (p: typeof SHIFT_PRESETS[0]) => {
    form.setFieldsValue({
      name:       form.getFieldValue("name") || p.name,
      start_time: dayjs(p.start, "HH:mm:ss"),
      end_time:   dayjs(p.end,   "HH:mm:ss"),
    });
  };

  const rows: ShiftCategoryItem[] = Array.isArray(data) ? data : [];

  const columns = [
    {
      title: "Shift Name", dataIndex: "name", key: "name",
      render: (v: string) => (
        <Space><ClockCircleOutlined style={{ color: "#6366f1" }} /><Text strong>{v}</Text></Space>
      ),
    },
    {
      title: "Start Time", dataIndex: "start_time", key: "start_time",
      render: (v: string) => (
        <Tag color="blue" style={{ fontWeight: 600, fontSize: 13 }}>
          {v ? dayjs(v, "HH:mm:ss").format("hh:mm A") : "—"}
        </Tag>
      ),
    },
    {
      title: "End Time", dataIndex: "end_time", key: "end_time",
      render: (v: string) => (
        <Tag color="purple" style={{ fontWeight: 600, fontSize: 13 }}>
          {v ? dayjs(v, "HH:mm:ss").format("hh:mm A") : "—"}
        </Tag>
      ),
    },
    {
      title: "Duration", key: "duration",
      render: (_: any, r: ShiftCategoryItem) => {
        if (!r.start_time || !r.end_time) return "—";
        const s = dayjs(r.start_time, "HH:mm:ss");
        const e = dayjs(r.end_time,   "HH:mm:ss");
        const diff = e.diff(s, "minute");
        const h = Math.floor(Math.abs(diff) / 60);
        const m = Math.abs(diff) % 60;
        return <Tag color="green">{h}h{m > 0 ? ` ${m}m` : ""}</Tag>;
      },
    },
    {
      title: "Status", dataIndex: "is_active", key: "is_active",
      render: (v: boolean) => <Tag color={v ? "success" : "default"}>{v ? "Active" : "Inactive"}</Tag>,
    },
    {
      title: "Created On", dataIndex: "created_at", key: "created_at",
      render: (v: string) => dayjs(v).format("DD MMM YYYY"),
    },
    ...(canUpdate || canDelete ? [{
      title: "Action", key: "action", width: 80,
      render: (_: any, r: ShiftCategoryItem) => (
        <Space>
          {canUpdate && (
            <Tooltip title="Edit">
              <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
            </Tooltip>
          )}
          {canDelete && (
            <Popconfirm title={`Delete "${r.name}"?`} onConfirm={() => deleteMut.mutate(r.id)} okButtonProps={{ danger: true }}>
              <Tooltip title="Delete">
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    }] : []),
  ];

  return (
    <>
      <div className="table-toolbar">
        <Text className="table-toolbar-title">
          Shift Categories — <span style={{ color: "#8c9ab0" }}>Showing {rows.length} records</span>
          {isError && <Tag color="error" style={{ marginLeft: 8 }}>API error — check auth</Tag>}
        </Text>
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
            Add Shift
          </Button>
        )}
      </div>

      {/* Quick-add preset cards */}
      <Row gutter={12} style={{ padding: "0 0 16px 0" }}>
        {SHIFT_PRESETS.map((p) => (
          <Col key={p.label} xs={24} sm={12} md={8} lg={6}>
            <Card
              size="small"
              hoverable
              style={{ border: "1.5px solid #e8edf3", borderRadius: 10, cursor: "default" }}
              styles={{ body: { padding: "12px 16px" } }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <ClockCircleOutlined style={{ color: "#6366f1", marginRight: 6 }} />
                  <Text strong style={{ fontSize: 13 }}>{p.label}</Text>
                  <div style={{ marginTop: 4, display: "flex", gap: 6 }}>
                    <Tag color="blue">{dayjs(p.start, "HH:mm:ss").format("hh:mm A")}</Tag>
                    <span style={{ color: "#aaa" }}>→</span>
                    <Tag color="purple">{dayjs(p.end, "HH:mm:ss").format("hh:mm A")}</Tag>
                    <Tag color="green">9h</Tag>
                  </div>
                </div>
                <Button
                  size="small" type="dashed"
                  onClick={() => {
                    form.setFieldsValue({
                      name:       p.name,
                      start_time: dayjs(p.start, "HH:mm:ss"),
                      end_time:   dayjs(p.end,   "HH:mm:ss"),
                      is_active:  true,
                    });
                    setModal({ open: true, editing: null });
                  }}
                >
                  Use
                </Button>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Table
        dataSource={rows}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        size="middle"
        pagination={{ pageSize: 15, showTotal: (t, r) => `Showing ${r[0]}-${r[1]} of ${t}` }}
      />

      <Modal
        title={
          <Space>
            <ClockCircleOutlined style={{ color: "#6366f1" }} />
            {modal.editing ? "Edit Shift Category" : "Add Shift Category"}
          </Space>
        }
        open={modal.open}
        onCancel={() => { setModal({ open: false, editing: null }); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={saveMut.isPending}
        width={480}
      >
        <Form form={form} layout="vertical" onFinish={(v) => saveMut.mutate({ values: v, editing: modal.editing })}>
          <Form.Item name="name" label="Shift Name" rules={[{ required: true, message: "Shift name is required" }]}>
            <Input placeholder="e.g. Morning Shift (9AM-6PM)" />
          </Form.Item>

          {/* Preset quick-fill buttons */}
          <Form.Item label="Quick Presets">
            <Space wrap>
              {SHIFT_PRESETS.map((p) => (
                <Button key={p.label} size="small" onClick={() => applyPreset(p)}>
                  {p.label}
                </Button>
              ))}
            </Space>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="start_time" label="Start Time" rules={[{ required: true, message: "Start time required" }]}>
                <TimePicker
                  format="hh:mm A"
                  use12Hours
                  style={{ width: "100%" }}
                  placeholder="Select start time"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="end_time" label="End Time" rules={[{ required: true, message: "End time required" }]}>
                <TimePicker
                  format="hh:mm A"
                  use12Hours
                  style={{ width: "100%" }}
                  placeholder="Select end time"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item noStyle shouldUpdate={(p, c) => p.start_time !== c.start_time || p.end_time !== c.end_time}>
            {({ getFieldValue }) => {
              const s = getFieldValue("start_time");
              const e = getFieldValue("end_time");
              if (!s || !e) return null;
              const diff = dayjs(e).diff(dayjs(s), "minute");
              const h = Math.floor(Math.abs(diff) / 60);
              const m = Math.abs(diff) % 60;
              const ok = h === 9 && m === 0;
              return (
                <div style={{ marginBottom: 16, padding: "8px 12px", background: ok ? "#f6ffed" : "#fff7e6", borderRadius: 8, border: `1px solid ${ok ? "#b7eb8f" : "#ffd591"}` }}>
                  <Text style={{ color: ok ? "#389e0d" : "#d46b08", fontWeight: 600 }}>
                    Duration: {h}h{m > 0 ? ` ${m}m` : ""} {ok ? "✓ Valid (9h)" : "⚠ Must be exactly 9 hours"}
                  </Text>
                </div>
              );
            }}
          </Form.Item>

          <Form.Item name="is_active" label="Status" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>
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

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["master-rate-cards"],
    queryFn: () => rateCardApi.list(),
    retry: 1,
  });

  const saveMut = useMutation({
    mutationFn: ({ values, editing }: { values: any; editing: RateCardItem | null }) =>
      editing ? rateCardApi.update(editing.id, values) : rateCardApi.create(values),
    onSuccess: (_d, { editing }) => {
      qc.invalidateQueries({ queryKey: ["master-rate-cards"] });
      setModal({ open: false, editing: null });
      form.resetFields();
      message.success(editing ? "Rate card updated" : "Rate card created");
    },
    onError: (e: any) => message.error(apiErrorMsg(e, "Failed to save rate card")),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => rateCardApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["master-rate-cards"] }); message.success("Rate card deleted"); },
    onError: () => message.error("Failed to delete"),
  });

  const openAdd  = () => { form.resetFields(); form.setFieldsValue({ is_active: true, currency: "INR" }); setModal({ open: true, editing: null }); };
  const openEdit = (r: RateCardItem) => {
    form.setFieldsValue({
      designation_ref: r.designation_ref,
      department_ref:  r.department_ref,
      hr_daily_rate:   r.hr_daily_rate,
      client_billing_rate: r.client_billing_rate,
      currency: r.currency,
      is_active: r.is_active,
    });
    setModal({ open: true, editing: r });
  };

  const rows: RateCardItem[] = Array.isArray(data) ? data : [];

  const columns = [
    {
      title: "Designation", dataIndex: "designation_name", key: "desig",
      render: (v: string) => <Tag color="blue" style={{ fontWeight: 600 }}>{v}</Tag>,
    },
    {
      title: "Department", dataIndex: "department_name", key: "dept",
      render: (v: string) => <Tag color="purple" style={{ fontWeight: 600 }}>{v}</Tag>,
    },
    {
      title: "HR Daily Rate", dataIndex: "hr_daily_rate", key: "hr",
      render: (v: string) => (
        <span style={{ fontWeight: 700, color: "#16a34a" }}>₹{parseFloat(v).toLocaleString("en-IN")}</span>
      ),
    },
    {
      title: "Client Billing Rate", dataIndex: "client_billing_rate", key: "client",
      render: (v: string) => (
        <span style={{ fontWeight: 700, color: "#2563eb" }}>₹{parseFloat(v).toLocaleString("en-IN")}</span>
      ),
    },
    {
      title: "Monthly HR (est.)", dataIndex: "monthly_hr_cost", key: "m_hr",
      render: (v: number) => <Text style={{ fontSize: 12, color: "#374151" }}>₹{v.toLocaleString("en-IN")}</Text>,
    },
    {
      title: "Monthly Billing (est.)", dataIndex: "monthly_client_rate", key: "m_client",
      render: (v: number) => <Text style={{ fontSize: 12, color: "#374151" }}>₹{v.toLocaleString("en-IN")}</Text>,
    },
    {
      title: "Status", dataIndex: "is_active", key: "status",
      render: (v: boolean) => <Tag color={v ? "success" : "default"}>{v ? "Active" : "Inactive"}</Tag>,
    },
    ...(canUpdate || canDelete ? [{
      title: "Action", key: "action", width: 80,
      render: (_: any, r: RateCardItem) => (
        <Space>
          {canUpdate && (
            <Tooltip title="Edit"><Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} /></Tooltip>
          )}
          {canDelete && (
            <Popconfirm title="Delete this rate card?" onConfirm={() => deleteMut.mutate(r.id)} okButtonProps={{ danger: true }}>
              <Tooltip title="Delete"><Button size="small" danger icon={<DeleteOutlined />} /></Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    }] : []),
  ];

  const dd = (arr: any[]) => arr.map((d: any) => ({ value: d.id, label: d.name }));
  const ff = (input: string, opt: any) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase());

  return (
    <>
      <div className="table-toolbar">
        <Text className="table-toolbar-title">
          Rate Cards — <span style={{ color: "#8c9ab0" }}>Showing {rows.length} records</span>
          {isError && <Tag color="error" style={{ marginLeft: 8 }}>API error</Tag>}
        </Text>
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Add Rate Card</Button>
        )}
      </div>

      {/* Summary note */}
      <div style={{ marginBottom: 12, padding: "8px 14px", background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0", fontSize: 12, color: "#166534" }}>
        <strong>Daily rates</strong> — HR Daily Rate = company cost per working day &nbsp;|&nbsp;
        Client Billing Rate = amount billed to client per day &nbsp;|&nbsp;
        Monthly estimates based on 22 working days
      </div>

      <Table
        dataSource={rows} columns={columns} rowKey="id"
        loading={isLoading} size="middle"
        pagination={{ pageSize: 20, showTotal: (t, r) => `Showing ${r[0]}-${r[1]} of ${t}` }}
      />

      <Modal
        title={modal.editing ? "Edit Rate Card" : "Add Rate Card"}
        open={modal.open}
        onCancel={() => { setModal({ open: false, editing: null }); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={saveMut.isPending}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={(v) => saveMut.mutate({ values: v, editing: modal.editing })}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="designation_ref" label="Designation" rules={[{ required: true }]}>
                <Select showSearch placeholder="Select" options={dd(designations as any[])} filterOption={ff} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="department_ref" label="Department" rules={[{ required: true }]}>
                <Select showSearch placeholder="Select" options={dd(departments as any[])} filterOption={ff} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="hr_daily_rate" label="HR Daily Rate (₹)" rules={[{ required: true }]} tooltip="Daily cost to company per employee">
                <Input type="number" min={0} step={10} prefix="₹" placeholder="150" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="client_billing_rate" label="Client Billing Rate (₹)" rules={[{ required: true }]} tooltip="Daily rate billed to client">
                <Input type="number" min={0} step={10} prefix="₹" placeholder="200" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="currency" label="Currency" initialValue="INR">
                <Select options={[{ value: "INR", label: "INR (₹)" }, { value: "USD", label: "USD ($)" }]} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="is_active" label="Status" valuePropName="checked" initialValue={true}>
                <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
}

// ── Business Type Table (extra prefix field) ──────────────────────────────────
function BusinessTypeTable() {
  const { canCreate, canUpdate, canDelete } = useMasterCrud("project");
  const qc = useQueryClient();
  const [modal, setModal] = useState<{ open: boolean; editing: BusinessTypeItem | null }>({ open: false, editing: null });
  const [form] = Form.useForm();

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["master-business-types"],
    queryFn: () => businessTypeApi.list(),
    retry: 1,
  });

  const saveMut = useMutation({
    mutationFn: ({ values, editing }: { values: any; editing: BusinessTypeItem | null }) =>
      editing ? businessTypeApi.update(editing.id, values) : businessTypeApi.create(values),
    onSuccess: (_d, { editing }) => {
      qc.invalidateQueries({ queryKey: ["master-business-types"] });
      qc.invalidateQueries({ queryKey: ["dd", "business-types"] });
      setModal({ open: false, editing: null });
      form.resetFields();
      message.success(editing ? "Business Type updated" : "Business Type created");
    },
    onError: (e: any) => message.error(apiErrorMsg(e, "Failed to save Business Type")),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => businessTypeApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["master-business-types"] }); message.success("Business Type deleted"); },
    onError: () => message.error("Failed to delete Business Type"),
  });

  const openAdd  = () => { form.resetFields(); form.setFieldsValue({ is_active: true }); setModal({ open: true, editing: null }); };
  const openEdit = (r: BusinessTypeItem) => { form.setFieldsValue(r); setModal({ open: true, editing: r }); };
  const rows: BusinessTypeItem[] = Array.isArray(data) ? data : [];

  const columns = [
    { title: "Name", dataIndex: "name", key: "name", render: (v: string) => <Text strong>{v}</Text> },
    {
      title: "Code Prefix", dataIndex: "prefix", key: "prefix",
      render: (v: string) => v
        ? <Tag color="blue" style={{ fontFamily: "monospace", fontWeight: 700 }}>{v}</Tag>
        : <Text type="secondary">—</Text>,
    },
    { title: "Status", dataIndex: "is_active", key: "is_active", render: (v: boolean) => <Tag color={v ? "success" : "default"}>{v ? "Active" : "Inactive"}</Tag> },
    { title: "Created On", dataIndex: "created_at", key: "created_at", render: (v: string) => dayjs(v).format("DD MMM YYYY | hh:mm A") },
    ...(canUpdate || canDelete ? [{
      title: "Action", key: "action", width: 80,
      render: (_: any, r: BusinessTypeItem) => (
        <Space>
          {canUpdate && (
            <Tooltip title="Edit"><Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} /></Tooltip>
          )}
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
      <div style={{ marginBottom: 10, padding: "8px 14px", background: "#eff6ff", borderRadius: 8, border: "1px solid #bfdbfe", fontSize: 12, color: "#1e40af" }}>
        <strong>Code Prefix</strong> — Each type carries a short prefix (e.g. <code>PRJ</code>, <code>TRN</code>, <code>SVC</code>).
        Project codes are auto-generated as <code>PREFIX-YY####</code> (e.g. <code>PRJ-260001</code>).
      </div>
      <div className="table-toolbar">
        <Text className="table-toolbar-title">
          Business Types — <span style={{ color: "#8c9ab0" }}>Showing {rows.length} records</span>
          {isError && <Tag color="error" style={{ marginLeft: 8 }}>API error</Tag>}
        </Text>
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Add Business Type</Button>
        )}
      </div>
      <Table dataSource={rows} columns={columns} rowKey="id" loading={isLoading} size="middle"
        pagination={{ pageSize: 15, showTotal: (t, r) => `Showing ${r[0]}-${r[1]} of ${t}` }} />
      <Modal
        title={modal.editing ? "Edit Business Type" : "Add Business Type"}
        open={modal.open}
        onCancel={() => { setModal({ open: false, editing: null }); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={saveMut.isPending}
        width={440}
      >
        <Form form={form} layout="vertical" onFinish={(v) => saveMut.mutate({ values: v, editing: modal.editing })}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Project, Training, POC" />
          </Form.Item>
          <Form.Item name="prefix" label="Code Prefix"
            tooltip="Short uppercase code used when auto-generating project codes. E.g. PRJ for Project, TRN for Training."
            rules={[{ pattern: /^[A-Z0-9]{0,10}$/, message: "Max 10 uppercase letters/digits" }]}
          >
            <Input placeholder="e.g. PRJ" maxLength={10} style={{ fontFamily: "monospace", textTransform: "uppercase" }}
              onChange={(e) => form.setFieldValue("prefix", e.target.value.toUpperCase())} />
          </Form.Item>
          <Form.Item name="is_active" label="Status" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

// ── Workflow Editor ────────────────────────────────────────────────────────────
const PRESET_COLORS = [
  "#10B981", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444",
  "#6366F1", "#EC4899", "#14B8A6", "#6B7280", "#374151",
];

// ── Start node ────────────────────────────────────────────────────────────────
function StartNode() {
  return (
    <div style={{
      width: 56, height: 56, borderRadius: "50%",
      background: "#16a34a", color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 800, fontSize: 11, letterSpacing: 0.5,
      boxShadow: "0 0 0 4px #bbf7d0, 0 4px 12px rgba(22,163,74,0.35)",
      border: "2px solid #15803d",
      userSelect: "none",
    }}>
      START
      <Handle type="source" position={Position.Bottom}
        style={{ background: "#15803d", width: 10, height: 10, border: "2px solid #fff" }} />
    </div>
  );
}

// ── State node ────────────────────────────────────────────────────────────────
function StateNode({ data }: { data: any }) {
  return (
    <div style={{
      background: data.color, color: "#fff", borderRadius: 8,
      padding: "10px 18px", minWidth: 140, textAlign: "center",
      fontWeight: 600, fontSize: 13,
      boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
    }}>
      <Handle type="target" position={Position.Top}
        style={{ background: "rgba(255,255,255,0.6)", width: 10, height: 10 }} />
      {data.is_initial && (
        <div style={{ fontSize: 9, opacity: 0.85, marginBottom: 2,
          background: "rgba(255,255,255,0.2)", borderRadius: 4, padding: "1px 4px", display: "inline-block" }}>
          INITIAL
        </div>
      )}
      <div>{data.label}</div>
      {data.is_final && (
        <div style={{ fontSize: 9, opacity: 0.85, marginTop: 2,
          background: "rgba(0,0,0,0.2)", borderRadius: 4, padding: "1px 4px", display: "inline-block" }}>
          FINAL
        </div>
      )}
      <Handle type="source" position={Position.Bottom}
        style={{ background: "rgba(255,255,255,0.6)", width: 10, height: 10 }} />
    </div>
  );
}

const nodeTypes = { stateNode: StateNode, startNode: StartNode };

const START_NODE_ID = "__start__";
const NODE_CENTER_X = 220;
const NODE_Y_START = 100;
const NODE_Y_GAP = 130;
const ALT_COLUMN_X = 520;

function isAlternateState(s: WorkflowState): boolean {
  const slug = (s.slug ?? "").toLowerCase();
  const name = s.name.toLowerCase();
  return slug.includes("cancel") || name.includes("cancel");
}

function buildNodeLayout(states: WorkflowState[]) {
  const sorted = [...states].sort((a, b) => a.order - b.order);
  const mainStates = sorted.filter((s) => !isAlternateState(s));
  const altStates = sorted.filter(isAlternateState);
  const positions = new Map<string, { x: number; y: number }>();

  // Main path — top to bottom
  mainStates.forEach((s, i) => {
    positions.set(s.id, { x: NODE_CENTER_X, y: NODE_Y_START + i * NODE_Y_GAP });
  });

  // Alternate / cancel states — right column, vertically spaced
  altStates.forEach((s, i) => {
    positions.set(s.id, {
      x: ALT_COLUMN_X,
      y: NODE_Y_START + 60 + i * NODE_Y_GAP,
    });
  });

  sorted.forEach((s, i) => {
    if (!positions.has(s.id)) {
      positions.set(s.id, { x: NODE_CENTER_X, y: NODE_Y_START + i * NODE_Y_GAP });
    }
  });

  return { sorted, positions };
}

function buildFlowNodes(states: WorkflowState[]): Node[] {
  const { sorted, positions } = buildNodeLayout(states);
  const startNode: Node = {
    id: START_NODE_ID,
    type: "startNode",
    position: { x: NODE_CENTER_X + 42, y: 16 },
    data: {},
    draggable: true,
  };

  const stateNodes: Node[] = sorted.map((s) => ({
    id: s.id,
    type: "stateNode",
    position: positions.get(s.id) ?? { x: NODE_CENTER_X, y: NODE_Y_START },
    data: { label: s.name, color: s.color_code, is_initial: s.is_initial, is_final: s.is_final },
    draggable: true,
  }));

  return [startNode, ...stateNodes];
}

function buildFlowEdges(
  states: WorkflowState[],
  transitions: WorkflowTransition[],
  selectedTransId: string | null,
): Edge[] {
  const startEdges: Edge[] = states
    .filter((s) => s.is_initial)
    .map((s) => ({
      id: `${START_NODE_ID}->${s.id}`,
      source: START_NODE_ID,
      target: s.id,
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed, color: "#16a34a" },
      style: { stroke: "#16a34a", strokeWidth: 2, strokeDasharray: "6 3" },
      selectable: false,
    }));

  const transEdges: Edge[] = transitions.map((t) => {
    const isSelected = t.id === selectedTransId;
    const isAlt = isAlternateState(t.destination_state_detail) ||
      (t.destination_state_detail?.name ?? "").toLowerCase().includes("cancel");
    return {
      id: t.id,
      source: t.source_state,
      target: t.destination_state,
      label: isSelected ? (t.label || "Transition") : undefined,
      labelStyle: { fontSize: 12, fill: "#1677ff", fontWeight: 600 },
      labelBgStyle: { fill: "#ffffff", fillOpacity: 0.98 },
      labelBgPadding: [8, 12] as [number, number],
      labelBgBorderRadius: 8,
      markerEnd: { type: MarkerType.ArrowClosed, color: isSelected ? "#1677ff" : "#64748b" },
      style: {
        stroke: isSelected ? "#1677ff" : isAlt ? "#ef4444" : "#64748b",
        strokeWidth: isSelected ? 3 : 1.8,
      },
      data: { group_names: t.group_names ?? [], transition_id: t.id },
      type: "smoothstep",
      animated: isSelected,
      zIndex: isSelected ? 10 : 0,
    };
  });

  return [...startEdges, ...transEdges];
}

// ── Workflow Editor ────────────────────────────────────────────────────────────
function WorkflowTab({ appLabel, model, contentTypeId, contentTypeLoading }: {
  appLabel: string; model: string; contentTypeId: number | null; contentTypeLoading?: boolean;
}) {
  const canManage = usePermission(PERMS.MASTER_WORKFLOW_MANAGE);
  const qc = useQueryClient();

  // State modal
  const [stateModal, setStateModal] = useState<{ open: boolean; editing: WorkflowState | null }>({ open: false, editing: null });
  const [stateForm] = Form.useForm();

  // Selected edge → group panel
  const [selectedTrans, setSelectedTrans] = useState<WorkflowTransition | null>(null);
  const [pendingConn, setPendingConn]     = useState<{ source: string; target: string } | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: statesData = [] } = useQuery<WorkflowState[]>({
    queryKey: ["wf-states", appLabel, model],
    queryFn: () => workflowStateApi.list(appLabel, model),
    enabled: contentTypeId !== null,
  });
  const { data: transData = [] } = useQuery<WorkflowTransition[]>({
    queryKey: ["wf-transitions", appLabel, model],
    queryFn: () => workflowTransitionApi.list(appLabel, model),
    enabled: contentTypeId !== null,
  });
  // Keycloak groups (string names)
  const { data: kcGroupsRaw } = useQuery<{ groups: string[] }>({
    queryKey: ["keycloak-groups"],
    queryFn: () => get<{ groups: string[] }>("/keycloak-groups/"),
    staleTime: 300_000,
  });
  const kcGroups: string[] = kcGroupsRaw?.groups ?? [];

  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [legacyGroupNames, setLegacyGroupNames] = useState<string[]>([]);
  const [groupSearch, setGroupSearch] = useState("");
  const [transLabel, setTransLabel] = useState("");
  const [transDirty, setTransDirty] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"states" | "transitions">("states");
  const openingTransitionId = useRef<string | null>(null);

  /** Split saved group names into Keycloak checkboxes vs legacy workflow-only names. */
  const splitSavedGroups = useCallback((names: string[] | undefined) => {
    const saved = names ?? [];
    const matched = saved.filter((g) => kcGroups.includes(g));
    const legacy = saved.filter((g) => !kcGroups.includes(g));
    return { matched, legacy };
  }, [kcGroups]);

  const loadTransitionIntoForm = useCallback((trans: WorkflowTransition) => {
    const { matched, legacy } = splitSavedGroups(trans.group_names);
    openingTransitionId.current = trans.id;
    setSelectedTrans(trans);
    setSelectedGroups(matched);
    setLegacyGroupNames(legacy);
    setTransLabel(trans.label ?? "");
    setGroupSearch("");
    setTransDirty(false);
    setSidebarTab("transitions");
  }, [splitSavedGroups]);

  const openTransitionById = useCallback((transId: string) => {
    const fresh = transData.find((t) => t.id === transId);
    if (fresh) loadTransitionIntoForm(fresh);
  }, [transData, loadTransitionIntoForm]);

  const createStateMut = useMutation({
    mutationFn: (v: any) => workflowStateApi.create({ ...v, content_type: contentTypeId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["wf-states", appLabel, model] }); setStateModal({ open: false, editing: null }); stateForm.resetFields(); message.success("State created"); },
    onError: (e: any) => message.error(apiErrorMsg(e, "Failed to create state")),
  });
  const updateStateMut = useMutation({
    mutationFn: ({ id, data }: any) => workflowStateApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["wf-states", appLabel, model] }); setStateModal({ open: false, editing: null }); stateForm.resetFields(); message.success("State updated"); },
    onError: (e: any) => message.error(apiErrorMsg(e, "Failed to update state")),
  });
  const createTransMut = useMutation({
    mutationFn: (v: any) => workflowTransitionApi.create({ ...v, content_type: contentTypeId }),
    onSuccess: (created: WorkflowTransition) => {
      void qc.invalidateQueries({ queryKey: ["wf-transitions", appLabel, model] });
      setPendingConn(null);
      if (created?.id) loadTransitionIntoForm(created);
      message.success("Transition created — assign groups on the right");
    },
    onError: (e: any) => message.error(apiErrorMsg(e, "Failed to create transition")),
  });
  const updateTransMut = useMutation({
    mutationFn: ({ id, data }: any) => workflowTransitionApi.update(id, data),
    onSuccess: (data: WorkflowTransition, vars) => {
      const savedNames: string[] =
        data?.group_names ??
        vars.data.keycloak_group_names ??
        [];
      qc.setQueryData(
        ["wf-transitions", appLabel, model],
        (old?: WorkflowTransition[]) =>
          Array.isArray(old)
            ? old.map((t) =>
                t.id === vars.id
                  ? {
                      ...t,
                      ...data,
                      label: data?.label ?? vars.data.label ?? t.label,
                      group_names: savedNames,
                    }
                  : t,
              )
            : old,
      );
      void qc.invalidateQueries({ queryKey: ["wf-transitions", appLabel, model] });
      const { matched, legacy } = splitSavedGroups(savedNames);
      setSelectedGroups(matched);
      setLegacyGroupNames(legacy);
      setSelectedTrans((prev) =>
        prev?.id === vars.id
          ? {
              ...prev,
              ...data,
              label: data?.label ?? vars.data.label ?? prev.label,
              group_names: savedNames,
            }
          : prev,
      );
      setTransDirty(false);
      message.success("Transition saved");
    },
    onError: (e: any) => message.error(apiErrorMsg(e, "Failed to save transition")),
  });
  const deleteTransMut = useMutation({
    mutationFn: (id: string) => workflowTransitionApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wf-transitions", appLabel, model] });
      setSelectedTrans(null);
      message.success("Transition removed");
    },
    onError: (e: any) => message.error(apiErrorMsg(e, "Failed to delete transition")),
  });

  // Re-sync form when transition list refetches (e.g. after save) — only for the open transition
  useEffect(() => {
    if (!selectedTrans?.id) return;
    const fresh = transData.find((t) => t.id === selectedTrans.id);
    if (!fresh) return;
    // Skip if user just opened this transition (loadTransitionIntoForm already ran)
    if (openingTransitionId.current === fresh.id) {
      openingTransitionId.current = null;
      return;
    }
    const { matched, legacy } = splitSavedGroups(fresh.group_names);
    setSelectedGroups(matched);
    setLegacyGroupNames(legacy);
    setTransLabel(fresh.label ?? "");
    setSelectedTrans(fresh);
  }, [transData, selectedTrans?.id, splitSavedGroups]);

  useEffect(() => {
    setNodes(buildFlowNodes(statesData));
  }, [statesData, setNodes]);

  useEffect(() => {
    setEdges(buildFlowEdges(statesData, transData, selectedTrans?.id ?? null));
  }, [statesData, transData, selectedTrans?.id, setEdges]);

  const filteredGroups = kcGroups.filter((g) =>
    g.toLowerCase().includes(groupSearch.toLowerCase())
  );

  const saveGroups = () => {
    if (!selectedTrans) return;
    if (!canManage) {
      message.warning("You need workflow manage permission to save transitions");
      return;
    }
    updateTransMut.mutate({
      id: selectedTrans.id,
      data: {
        keycloak_group_names: [...selectedGroups, ...legacyGroupNames],
        label: transLabel.trim(),
      },
    });
  };

  const stateColor = (stateId: string) =>
    statesData.find((s) => s.id === stateId)?.color_code ?? "#6b7280";

  const groupSummary = (t: WorkflowTransition) => {
    const count = t.group_names?.length ?? 0;
    return count === 0 ? "All groups" : `${count} group${count > 1 ? "s" : ""}`;
  };
  const onConnect = useCallback((conn: Connection) => {
    if (!conn.source || !conn.target) return;
    // Dragging from START marks target as initial state
    if (conn.source === START_NODE_ID) {
      const target = statesData.find((s) => s.id === conn.target);
      if (target && !target.is_initial)
        updateStateMut.mutate({ id: target.id, data: { ...target, is_initial: true } });
      return;
    }
    // Regular transition — save immediately, then allow group assignment
    const existing = transData.find(
      (t) => t.source_state === conn.source && t.destination_state === conn.target
    );
    if (existing) { openTransitionById(existing.id); return; }
    setPendingConn({ source: conn.source!, target: conn.target! });
    createTransMut.mutate({ source_state: conn.source, destination_state: conn.target, keycloak_group_names: [] });
  }, [statesData, transData, createTransMut, updateStateMut, openTransitionById]);

  // ── Edge click ────────────────────────────────────────────────────────────
  const onEdgeClick = useCallback((_: any, edge: Edge) => {
    if (edge.id.startsWith(START_NODE_ID)) return;
    openTransitionById(edge.id);
  }, [openTransitionById]);

  // ── Connect handler (drag arrow) ──────────────────────────────────────────
  if (contentTypeLoading) {
    return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Spin /></div>;
  }
  if (!contentTypeId) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>
        <Text type="secondary">
          Workflow model <Text code>{appLabel}.{model}</Text> is not registered yet.
          Run backend migration and seed:{" "}
          <Text code>python manage.py migrate followups</Text> then{" "}
          <Text code>python manage.py seed_workflow</Text>.
        </Text>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 0, height: 820, border: "1px solid #e8edf3", borderRadius: 8, overflow: "hidden" }}>
      {/* ── Left sidebar ── */}
      <div style={{
        width: 260, flexShrink: 0, background: "#f8fafc",
        borderRight: "1px solid #e8edf3",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        <Tabs
          activeKey={sidebarTab}
          onChange={(k) => setSidebarTab(k as "states" | "transitions")}
          size="small"
          style={{ padding: "0 8px" }}
          items={[
            { key: "states", label: `States (${statesData.length})` },
            { key: "transitions", label: `Transitions (${transData.length})` },
          ]}
        />

        <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px 12px" }}>
          {sidebarTab === "states" ? (
            <>
              {canManage && (
                <Button
                  type="primary" icon={<PlusOutlined />} block size="small"
                  style={{ marginBottom: 10, borderRadius: 6 }}
                  onClick={() => {
                    stateForm.resetFields();
                    stateForm.setFieldsValue({ color_code: PRESET_COLORS[statesData.length % PRESET_COLORS.length], order: statesData.length + 1, is_initial: false, is_final: false });
                    setStateModal({ open: true, editing: null });
                  }}
                >
                  Add State
                </Button>
              )}
              {statesData.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No states yet" />
              ) : (
                statesData.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      background: s.color_code, color: "#fff", borderRadius: 8,
                      padding: "8px 10px", marginBottom: 6,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 12 }}>{s.name}</div>
                      <div style={{ fontSize: 10, opacity: 0.85 }}>
                        {s.is_initial ? "Initial" : s.is_final ? "Final" : `Order ${s.order}`}
                      </div>
                    </div>
                    {canManage && (
                      <EditOutlined
                        style={{ fontSize: 12, cursor: "pointer" }}
                        onClick={() => { stateForm.setFieldsValue({ ...s }); setStateModal({ open: true, editing: s }); }}
                      />
                    )}
                  </div>
                ))
              )}
              <Alert
                type="info" showIcon={false}
                message="Tip"
                description="Drag from the bottom handle of a state to the top of another to create a transition. Drag from START downward to set the initial state."
                style={{ marginTop: 12, fontSize: 11 }}
              />
            </>
          ) : (
            <>
              {transData.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No transitions yet" />
              ) : (
                transData.map((t) => {
                  const active = selectedTrans?.id === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => openTransitionById(t.id)}
                      style={{
                        padding: "10px 12px", marginBottom: 8, borderRadius: 8, cursor: "pointer",
                        border: active ? "2px solid #1677ff" : "1px solid #e5e7eb",
                        background: active ? "#eff6ff" : "#fff",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                        <Tag color={stateColor(t.source_state)} style={{ margin: 0, borderRadius: 6 }}>
                          {t.source_state_detail?.name ?? "?"}
                        </Tag>
                        <ArrowRightOutlined style={{ fontSize: 10, color: "#9ca3af" }} />
                        <Tag color={stateColor(t.destination_state)} style={{ margin: 0, borderRadius: 6 }}>
                          {t.destination_state_detail?.name ?? "?"}
                        </Tag>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>
                        {t.label || "Untitled transition"}
                      </div>
                      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                        <TeamOutlined /> {groupSummary(t)}
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Center: Canvas ── */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden", minWidth: 0 }}>
        <ReactFlow
          nodes={nodes} edges={edges}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          onConnect={onConnect} onEdgeClick={onEdgeClick}
          onPaneClick={() => { setSelectedTrans(null); setLegacyGroupNames([]); }}
          nodeTypes={nodeTypes}
          fitView fitViewOptions={{ padding: 0.4, maxZoom: 1.1 }}
          minZoom={0.35}
          defaultEdgeOptions={{ type: "smoothstep", markerEnd: { type: MarkerType.ArrowClosed } }}
          connectionLineStyle={{ stroke: "#1677ff", strokeWidth: 2 }}
          style={{ background: "#f9fbfc" }}
        >
          <Background gap={20} color="#e2e8f0" />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={(n) => n.type === "startNode" ? "#16a34a" : ((n.data as any)?.color ?? "#6B7280")}
            nodeStrokeWidth={0}
            style={{ border: "1px solid #e5e7eb", borderRadius: 8 }}
          />
        </ReactFlow>
        {!selectedTrans && transData.length > 0 && (
          <div style={{
            position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)",
            background: "rgba(255,255,255,0.95)", border: "1px solid #e5e7eb", borderRadius: 20,
            padding: "6px 14px", fontSize: 12, color: "#64748b", pointerEvents: "none",
          }}>
            Click a transition in the list or on the diagram to configure groups
          </div>
        )}
      </div>

      {/* ── Right: Transition config panel ── */}
      {selectedTrans && (
        <div style={{
          width: 320, flexShrink: 0,
          background: "#fff", borderLeft: "1px solid #e8edf3",
          display: "flex", flexDirection: "column",
          height: "100%", overflow: "hidden",
        }}>
          <div style={{ padding: "16px 14px 0", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Transition Settings</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                  <Tag color={stateColor(selectedTrans.source_state)}>{selectedTrans.source_state_detail?.name}</Tag>
                  <ArrowRightOutlined style={{ color: "#9ca3af" }} />
                  <Tag color={stateColor(selectedTrans.destination_state)}>{selectedTrans.destination_state_detail?.name}</Tag>
                </div>
              </div>
              <Button type="text" size="small" icon={<CloseOutlined />} onClick={() => { setSelectedTrans(null); setLegacyGroupNames([]); setTransDirty(false); }} />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "0 14px" }}>
            <Form layout="vertical" size="small">
              <Form.Item label="Transition label" style={{ marginBottom: 12 }}>
                <Input
                  value={transLabel}
                  onChange={(e) => { setTransLabel(e.target.value); setTransDirty(true); }}
                  placeholder="e.g. Approve & Kick Off"
                  disabled={!canManage}
                />
              </Form.Item>
            </Form>

            <Divider style={{ margin: "4px 0 12px" }} />

            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
              <TeamOutlined /> Allowed groups
            </div>
            <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 10 }}>
              Select groups, then click Save to apply. Leave empty to allow all groups.
            </Text>

            <Input
              size="small" placeholder="Search groups…" allowClear
              value={groupSearch}
              onChange={(e) => setGroupSearch(e.target.value)}
              style={{ marginBottom: 10 }}
            />

            {legacyGroupNames.length > 0 && (
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 10, fontSize: 12 }}
                message="Also allowed (workflow groups)"
                description={
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                    {legacyGroupNames.map((g) => (
                      <Tag key={g} color="blue">{g}</Tag>
                    ))}
                  </div>
                }
              />
            )}

            {kcGroups.length === 0 ? (
              <Empty description="No Keycloak groups found" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <>
                <div style={{ marginBottom: 8 }}>
                  <Checkbox
                    disabled={!canManage}
                    indeterminate={selectedGroups.length > 0 && selectedGroups.length < kcGroups.length}
                    checked={selectedGroups.length === kcGroups.length && kcGroups.length > 0}
                    onChange={(e) => { setSelectedGroups(e.target.checked ? [...kcGroups] : []); setTransDirty(true); }}
                  >
                    Select all
                  </Checkbox>
                </div>
                <Checkbox.Group
                  value={selectedGroups}
                  disabled={!canManage}
                  onChange={(vals) => { setSelectedGroups(vals as string[]); setTransDirty(true); }}
                  style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", paddingBottom: 12 }}
                >
                  {filteredGroups.map((g) => (
                    <Checkbox key={g} value={g} style={{ marginInlineStart: 0 }}>
                      <span style={{ fontSize: 13 }}>{g}</span>
                    </Checkbox>
                  ))}
                </Checkbox.Group>
              </>
            )}
          </div>

          <div style={{
            flexShrink: 0,
            padding: "12px 14px",
            borderTop: "1px solid #e8edf3",
            background: "#f8fafc",
            display: "flex", flexDirection: "column", gap: 8,
          }}>
            {transDirty && (
              <Alert type="warning" showIcon message="Unsaved changes" style={{ fontSize: 12, padding: "4px 8px" }} />
            )}
            <Text type="secondary" style={{ fontSize: 11, textAlign: "center" }}>
              {selectedGroups.length === 0 && legacyGroupNames.length === 0
                ? "All groups can perform this transition"
                : `${selectedGroups.length + legacyGroupNames.length} group${selectedGroups.length + legacyGroupNames.length > 1 ? "s" : ""} allowed`}
            </Text>
            <Tooltip title={!canManage ? "Requires workflow manage permission" : undefined}>
              <Button
                type="primary"
                block
                icon={<SaveOutlined />}
                loading={updateTransMut.isPending}
                disabled={!canManage}
                onClick={saveGroups}
              >
                Save{transDirty ? " *" : ""}
              </Button>
            </Tooltip>
            {canManage && (
              <Popconfirm
                title="Delete this transition?"
                onConfirm={() => deleteTransMut.mutate(selectedTrans.id)}
              >
                <Button danger block icon={<DeleteOutlined />} loading={deleteTransMut.isPending}>
                  Delete Transition
                </Button>
              </Popconfirm>
            )}
          </div>
        </div>
      )}

      {/* ── State Modal ── */}
      <Modal
        title={stateModal.editing ? "Edit State" : "Add State"}
        open={stateModal.open}
        onCancel={() => { setStateModal({ open: false, editing: null }); stateForm.resetFields(); }}
        onOk={() => stateForm.submit()}
        confirmLoading={createStateMut.isPending || updateStateMut.isPending}
        width={400}
      >
        <Form form={stateForm} layout="vertical" onFinish={(v) => {
          if (stateModal.editing) updateStateMut.mutate({ id: stateModal.editing.id, data: v });
          else createStateMut.mutate(v);
        }}>
          <Form.Item name="name" label="State Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="order" label="Order" rules={[{ required: true }]}><Input type="number" min={1} /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="color_code" label="Color">
                <Select options={PRESET_COLORS.map((c) => ({
                  value: c,
                  label: <Space><span style={{ width: 12, height: 12, borderRadius: 2, background: c, display: "inline-block" }} />{c}</Space>,
                }))} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="is_initial" label="Mark as Initial" valuePropName="checked" initialValue={false}><Switch /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="is_final" label="Mark as Final" valuePropName="checked" initialValue={false}><Switch /></Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const MASTER_TAB_PERMISSIONS: Record<string, BmsPermission> = {
  designation:     PERMS.MASTER_HRMS_VIEW,
  department:      PERMS.MASTER_HRMS_VIEW,
  location:        PERMS.MASTER_HRMS_VIEW,
  grade:           PERMS.MASTER_HRMS_VIEW,
  "employment-type": PERMS.MASTER_HRMS_VIEW,
  "shift-category":  PERMS.MASTER_HRMS_VIEW,
  "rate-card":       PERMS.MASTER_HRMS_VIEW,
  "client-category": PERMS.MASTER_CLIENT_VIEW,
  "business-type":   PERMS.MASTER_PROJECT_VIEW,
  "billing-type":    PERMS.MASTER_PROJECT_VIEW,
  workflow:          PERMS.MASTER_WORKFLOW_VIEW,
};

export default function MasterPage({ defaultTab = "designation" }: { defaultTab?: string }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);
  const { data: projectCt, isLoading: projectCtLoading } = useQuery({
    queryKey: ["wf-ct", "projects", "project"],
    queryFn: () => workflowStateApi.contentTypeId("projects", "project"),
    staleTime: Infinity,
  });
  const { data: ticketCt, isLoading: ticketCtLoading } = useQuery({
    queryKey: ["wf-ct", "tickets", "ticket"],
    queryFn: () => workflowStateApi.contentTypeId("tickets", "ticket"),
    staleTime: Infinity,
    retry: false,
  });
  const { data: followupCt, isLoading: followupCtLoading } = useQuery({
    queryKey: ["wf-ct", "followups", "followup"],
    queryFn: () => workflowStateApi.contentTypeId("followups", "followup"),
    staleTime: Infinity,
    retry: false,
  });
  const projectCtId = projectCt?.id ?? null;
  const ticketCtId  = ticketCt?.id  ?? null;
  const followupCtId = followupCt?.id ?? null;

  const tabs = [
    { key: "designation",     label: "Designation",     children: <MasterTable queryKey="master-designations"      api={designationApi}     title="Designation" /> },
    { key: "department",      label: "Department",      children: <MasterTable queryKey="master-departments"       api={departmentApi}      title="Department" /> },
    { key: "location",        label: "Location",        children: <LocationTable /> },
    { key: "grade",           label: "Grade",           children: <MasterTable queryKey="master-grades"            api={gradeApi}           title="Grade" /> },
    { key: "employment-type", label: "Employment Type", children: <MasterTable queryKey="master-employment-types"  api={employmentTypeApi}  title="Employment Type" /> },
    { key: "shift-category",  label: "Shift Categories",children: <ShiftCategoryTable /> },
    { key: "rate-card",       label: "Rate Cards",      children: <RateCardTable /> },
    { key: "client-category", label: "Client Category", children: <MasterTable queryKey="master-client-categories" api={clientCategoryApi}  title="Client Category" scope="client" /> },
    { key: "business-type",   label: "Business Type",   children: <BusinessTypeTable /> },
    { key: "billing-type",    label: "Billing Type",    children: <MasterTable queryKey="master-billing-types"    api={billingTypeApi}    title="Billing Type" scope="project" /> },
    {
      key: "workflow", label: "Workflow",
      children: (
        <Tabs items={[
          { key: "project",   label: "Project Workflow",   children: <WorkflowTab appLabel="projects"  model="project"  contentTypeId={projectCtId}  contentTypeLoading={projectCtLoading} /> },
          { key: "ticket",    label: "Ticket Workflow",    children: <WorkflowTab appLabel="tickets"   model="ticket"   contentTypeId={ticketCtId}   contentTypeLoading={ticketCtLoading}  /> },
          { key: "followup",  label: "Follow-up Workflow", children: <WorkflowTab appLabel="followups" model="followup" contentTypeId={followupCtId} contentTypeLoading={followupCtLoading} /> },
        ]} />
      ),
    },
  ];

  const visibleTabs = tabs.filter((t) =>
    hasPermission(user, permissions, MASTER_TAB_PERMISSIONS[t.key]),
  );
  const activeKey = visibleTabs.some((t) => t.key === defaultTab)
    ? defaultTab
    : (visibleTabs[0]?.key ?? defaultTab);
  const activeLabel = visibleTabs.find((t) => t.key === activeKey)?.label ?? "Master";

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Master Configuration</h1>
          <p className="page-subtitle">Masters | {activeLabel}</p>
        </div>
      </div>
      <Card styles={{ body: { padding: 0 } }}>
        <Tabs
          activeKey={activeKey}
          onChange={(key) => navigate(`/master/${key}`)}
          items={visibleTabs}
          tabBarStyle={{ padding: "0 20px", marginBottom: 0 }}
          destroyInactiveTabPane={false}
        />
      </Card>
    </div>
  );
}
