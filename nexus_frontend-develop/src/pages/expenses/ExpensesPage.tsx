import { useState } from "react";
import {
  Table, Button, Modal, Form, Input, Select, DatePicker, InputNumber,
  Tag, Space, Popconfirm, message, Card, Statistic, Row, Col, Typography,
  Tooltip, Badge,
} from "antd";
import {
  PlusOutlined, SearchOutlined, CheckCircleOutlined, CloseCircleOutlined,
  SendOutlined, DollarOutlined, FilterOutlined, EditOutlined, DeleteOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { expenseApi, ExpenseListItem, ExpenseCreate } from "@/services/expenses";
import { useQuery as useDropdownQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import { ENDPOINTS } from "@/constants/api";
import { PERMS } from "@/constants/permissions";
import { useAuthStore } from "@/store/auth";

const { Title } = Typography;
const { Option } = Select;

const CATEGORY_OPTIONS = [
  { value: "TRAVEL",    label: "Travel & Transport" },
  { value: "MEALS",     label: "Meals & Entertainment" },
  { value: "OFFICE",    label: "Office Supplies" },
  { value: "SOFTWARE",  label: "Software & Subscriptions" },
  { value: "MARKETING", label: "Marketing & Advertising" },
  { value: "UTILITIES", label: "Utilities & Internet" },
  { value: "EQUIPMENT", label: "Equipment & Hardware" },
  { value: "RENT",      label: "Rent & Facilities" },
  { value: "OTHER",     label: "Other" },
];

const PAYMENT_MODE_OPTIONS = [
  { value: "CASH",           label: "Cash" },
  { value: "CORPORATE_CARD", label: "Corporate Card" },
  { value: "PERSONAL_CARD",  label: "Personal Card" },
  { value: "UPI",            label: "UPI" },
  { value: "BANK_TRANSFER",  label: "Bank Transfer" },
  { value: "CHEQUE",         label: "Cheque" },
];

const STATUS_COLOR: Record<string, string> = {
  DRAFT:      "default",
  SUBMITTED:  "processing",
  APPROVED:   "success",
  REJECTED:   "error",
  REIMBURSED: "purple",
};

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ExpensesPage() {
  const qc = useQueryClient();
  const permissions = useAuthStore((s) => s.permissions);
  const canCreate  = permissions.includes(PERMS.CRM_EXPENSE_CREATE as any);
  const canApprove = permissions.includes(PERMS.CRM_EXPENSE_APPROVE as any);

  // ── Filters ──────────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch]   = useState("");

  const params = { ...filters, ...(search ? { search } : {}) };

  // ── Data ─────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["expenses", params],
    queryFn:  () => expenseApi.list(params),
  });

  const { data: employees } = useDropdownQuery({
    queryKey: ["employees-dropdown"],
    queryFn:  () => get<any[]>(`${ENDPOINTS.EMPLOYEES}?is_active=true&page_size=500`),
    staleTime: 60_000,
  });

  const { data: projects } = useDropdownQuery({
    queryKey: ["projects-dropdown"],
    queryFn:  () => get<any>(`${ENDPOINTS.PROJECT_DROPDOWN}`),
    staleTime: 60_000,
  });

  const { data: clients } = useDropdownQuery({
    queryKey: ["clients-dropdown"],
    queryFn:  () => get<any>(`${ENDPOINTS.FINANCE_CLIENTS_DROPDOWN}`),
    staleTime: 60_000,
  });

  // ── Modal ─────────────────────────────────────────────────────────────────
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<ExpenseListItem | null>(null);
  const [rejectModal, setRejectModal] = useState<{ open: boolean; id: string }>({ open: false, id: "" });
  const [rejectReason, setRejectReason] = useState("");

  function openCreate() {
    form.resetFields();
    form.setFieldValue("date", dayjs());
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(row: ExpenseListItem) {
    form.setFieldsValue({
      ...row,
      date: dayjs(row.date),
    });
    setEditing(row);
    setModalOpen(true);
  }

  // ── Mutations ─────────────────────────────────────────────────────────────
  const invalidate = () => qc.invalidateQueries({ queryKey: ["expenses"] });

  const createMut = useMutation({
    mutationFn: (d: ExpenseCreate) => expenseApi.create(d),
    onSuccess: () => { message.success("Expense created"); setModalOpen(false); invalidate(); },
    onError:   () => message.error("Failed to create expense"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: Partial<ExpenseCreate> }) => expenseApi.update(id, d),
    onSuccess: () => { message.success("Expense updated"); setModalOpen(false); invalidate(); },
    onError:   () => message.error("Failed to update expense"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => expenseApi.delete(id),
    onSuccess: () => { message.success("Expense deleted"); invalidate(); },
    onError:   () => message.error("Failed to delete"),
  });

  const submitMut = useMutation({
    mutationFn: (id: string) => expenseApi.submit(id),
    onSuccess: () => { message.success("Submitted for approval"); invalidate(); },
    onError:   () => message.error("Failed to submit"),
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => expenseApi.approve(id),
    onSuccess: () => { message.success("Expense approved"); invalidate(); },
    onError:   () => message.error("Failed to approve"),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => expenseApi.reject(id, reason),
    onSuccess: () => { message.success("Expense rejected"); setRejectModal({ open: false, id: "" }); invalidate(); },
    onError:   () => message.error("Failed to reject"),
  });

  const reimburseMut = useMutation({
    mutationFn: (id: string) => expenseApi.reimburse(id),
    onSuccess: () => { message.success("Marked as reimbursed"); invalidate(); },
    onError:   () => message.error("Failed to reimburse"),
  });

  function onFinish(values: any) {
    const payload: ExpenseCreate = {
      ...values,
      date: values.date?.format("YYYY-MM-DD"),
    };
    if (editing) {
      updateMut.mutate({ id: editing.id, d: payload });
    } else {
      createMut.mutate(payload);
    }
  }

  // ── Summary stats ─────────────────────────────────────────────────────────
  const summary = data?.summary;
  const pendingCount  = summary?.by_status?.SUBMITTED?.count ?? 0;
  const approvedAmt   = summary?.by_status?.APPROVED?.amount ?? 0;
  const rejectedCount = summary?.by_status?.REJECTED?.count ?? 0;

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns = [
    {
      title: "Expense #",
      dataIndex: "expense_number",
      width: 120,
      render: (v: string) => <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 600 }}>{v}</span>,
    },
    { title: "Date", dataIndex: "date", width: 100 },
    {
      title: "Category",
      dataIndex: "category_label",
      width: 150,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: "Description",
      dataIndex: "description",
      ellipsis: true,
    },
    {
      title: "Amount",
      dataIndex: "amount",
      width: 130,
      align: "right" as const,
      render: (v: number) => <strong>{fmt(Number(v))}</strong>,
    },
    { title: "Paid By", dataIndex: "paid_by_name", width: 140 },
    { title: "Project", dataIndex: "project_code", width: 100, render: (v: string | null) => v || "—" },
    {
      title: "Status",
      dataIndex: "status",
      width: 110,
      render: (v: string, row: ExpenseListItem) => (
        <Tag color={STATUS_COLOR[v] ?? "default"}>{row.status_label}</Tag>
      ),
    },
    {
      title: "Actions",
      width: 200,
      render: (_: any, row: ExpenseListItem) => (
        <Space size={4} wrap>
          {row.status === "DRAFT" && (
            <>
              <Tooltip title="Edit">
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} />
              </Tooltip>
              <Tooltip title="Submit for approval">
                <Popconfirm title="Submit this expense?" onConfirm={() => submitMut.mutate(row.id)}>
                  <Button size="small" icon={<SendOutlined />} type="primary" ghost />
                </Popconfirm>
              </Tooltip>
              <Tooltip title="Delete">
                <Popconfirm title="Delete this expense?" onConfirm={() => deleteMut.mutate(row.id)}>
                  <Button size="small" icon={<DeleteOutlined />} danger />
                </Popconfirm>
              </Tooltip>
            </>
          )}
          {row.status === "SUBMITTED" && canApprove && (
            <>
              <Tooltip title="Approve">
                <Popconfirm title="Approve expense?" onConfirm={() => approveMut.mutate(row.id)}>
                  <Button size="small" icon={<CheckCircleOutlined />} type="primary" />
                </Popconfirm>
              </Tooltip>
              <Tooltip title="Reject">
                <Button
                  size="small"
                  icon={<CloseCircleOutlined />}
                  danger
                  onClick={() => { setRejectModal({ open: true, id: row.id }); setRejectReason(""); }}
                />
              </Tooltip>
            </>
          )}
          {row.status === "APPROVED" && canApprove && (
            <Tooltip title="Mark Reimbursed">
              <Popconfirm title="Mark as reimbursed?" onConfirm={() => reimburseMut.mutate(row.id)}>
                <Button size="small" icon={<DollarOutlined />} type="primary" style={{ background: "#7c3aed" }} />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const employeeList: any[] = Array.isArray(employees)
    ? employees
    : (employees as any)?.results ?? [];

  const projectList: any[] = Array.isArray(projects)
    ? projects
    : (projects as any)?.results ?? [];

  const clientList: any[] = Array.isArray(clients)
    ? clients
    : (clients as any)?.results ?? [];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0 }}>Company Expenses</Title>
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            New Expense
          </Button>
        )}
      </div>

      {/* ── KPI strip ── */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Total Expenses" value={fmt(summary?.total_amount ?? 0)} valueStyle={{ fontSize: 18 }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Total Records" value={summary?.total_count ?? 0} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Pending Approval"
              value={pendingCount}
              prefix={pendingCount > 0 ? <Badge dot status="processing" /> : null}
              valueStyle={{ color: pendingCount > 0 ? "#faad14" : undefined }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Approved (₹)" value={fmt(approvedAmt)} valueStyle={{ color: "#52c41a", fontSize: 18 }} />
          </Card>
        </Col>
      </Row>

      {/* ── Filters ── */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Search expenses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 220 }}
            allowClear
          />
          <Select
            placeholder="Category"
            allowClear
            style={{ width: 180 }}
            onChange={(v) => setFilters((f) => ({ ...f, category: v ?? "" }))}
            suffixIcon={<FilterOutlined />}
          >
            {CATEGORY_OPTIONS.map((o) => <Option key={o.value} value={o.value}>{o.label}</Option>)}
          </Select>
          <Select
            placeholder="Status"
            allowClear
            style={{ width: 140 }}
            onChange={(v) => setFilters((f) => ({ ...f, status: v ?? "" }))}
          >
            {["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "REIMBURSED"].map((s) => (
              <Option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</Option>
            ))}
          </Select>
          <DatePicker
            placeholder="From date"
            onChange={(d) => setFilters((f) => ({ ...f, date_from: d?.format("YYYY-MM-DD") ?? "" }))}
          />
          <DatePicker
            placeholder="To date"
            onChange={(d) => setFilters((f) => ({ ...f, date_to: d?.format("YYYY-MM-DD") ?? "" }))}
          />
        </Space>
      </Card>

      {/* ── Table ── */}
      <Card size="small">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data?.results ?? []}
          loading={isLoading}
          pagination={{ pageSize: 20, showSizeChanger: true }}
          scroll={{ x: 1100 }}
          size="small"
        />
      </Card>

      {/* ── Create / Edit modal ── */}
      <Modal
        open={modalOpen}
        title={editing ? "Edit Expense" : "New Expense"}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createMut.isPending || updateMut.isPending}
        width={640}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="date" label="Date" rules={[{ required: true }]}>
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="category" label="Category" rules={[{ required: true }]}>
                <Select placeholder="Select category">
                  {CATEGORY_OPTIONS.map((o) => <Option key={o.value} value={o.value}>{o.label}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Description" rules={[{ required: true }]}>
            <Input.TextArea rows={2} placeholder="Describe the expense..." />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="amount" label="Amount (₹)" rules={[{ required: true }]}>
                <InputNumber
                  style={{ width: "100%" }}
                  min={0.01}
                  precision={2}
                  prefix="₹"
                  placeholder="0.00"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="payment_mode" label="Payment Mode" rules={[{ required: true }]}>
                <Select placeholder="Select mode">
                  {PAYMENT_MODE_OPTIONS.map((o) => <Option key={o.value} value={o.value}>{o.label}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="paid_by" label="Paid By" rules={[{ required: true }]}>
                <Select
                  showSearch
                  filterOption={(input, opt) =>
                    String(opt?.label ?? "").toLowerCase().includes(input.toLowerCase())
                  }
                  placeholder="Select employee"
                  options={employeeList.map((e: any) => ({
                    value: e.id,
                    label: e.full_name ?? `${e.first_name} ${e.last_name}`,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="reference_number" label="Reference / Bill No.">
                <Input placeholder="Optional reference number" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="project" label="Project">
                <Select
                  showSearch
                  allowClear
                  filterOption={(input, opt) =>
                    String(opt?.label ?? "").toLowerCase().includes(input.toLowerCase())
                  }
                  placeholder="Link to project (optional)"
                  options={projectList.map((p: any) => ({
                    value: p.id,
                    label: `${p.code} — ${p.name}`,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="client" label="Client">
                <Select
                  showSearch
                  allowClear
                  filterOption={(input, opt) =>
                    String(opt?.label ?? "").toLowerCase().includes(input.toLowerCase())
                  }
                  placeholder="Link to client (optional)"
                  options={clientList.map((c: any) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} placeholder="Internal notes..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Reject reason modal ── */}
      <Modal
        open={rejectModal.open}
        title={<><ExclamationCircleOutlined style={{ color: "#ff4d4f", marginRight: 8 }} />Reject Expense</>}
        onCancel={() => setRejectModal({ open: false, id: "" })}
        onOk={() => rejectMut.mutate({ id: rejectModal.id, reason: rejectReason })}
        confirmLoading={rejectMut.isPending}
        okText="Reject"
        okButtonProps={{ danger: true }}
      >
        <Form layout="vertical">
          <Form.Item label="Reason for rejection" required>
            <Input.TextArea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Please provide a reason..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
