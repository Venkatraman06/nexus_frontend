import { useState } from "react";
import {
  Button, Input, Select, Table, Tag, Space, Popconfirm,
  message, Typography, Card, Row, Col, Statistic, Tooltip,
} from "antd";
import {
  PlusOutlined, SearchOutlined, EyeOutlined, EditOutlined,
  DeleteOutlined, FilePdfOutlined, FileTextOutlined,
  DollarOutlined, FileOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { usePermission } from "@/hooks/usePermission";
import { PERMS } from "@/constants/permissions";
import {
  financeApi,
  type FinanceDocument,
  type DocumentType,
  type DocumentStatus,
  STATUS_COLORS,
  DOC_TYPE_LABELS,
  ALLOWED_STATUSES,
} from "@/services/finance";
import PDFPreviewModal from "./components/PDFPreviewModal";

const { Title, Text } = Typography;
const { Option } = Select;

const DOC_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: "quotation",        label: "Quotation" },
  { value: "proforma_invoice", label: "Proforma Invoice" },
  { value: "gst_invoice",      label: "GST Invoice" },
  { value: "purchase_order",   label: "Purchase Order" },
  { value: "receipt",          label: "Receipt" },
];

export default function FinanceListPage() {
  const navigate   = useNavigate();
  const qc         = useQueryClient();

  const canCreate  = usePermission(PERMS.FINANCE_DOCUMENT_CREATE);
  const canUpdate  = usePermission(PERMS.FINANCE_DOCUMENT_UPDATE);
  const canDelete  = usePermission(PERMS.FINANCE_DOCUMENT_DELETE);

  const [search,      setSearch]      = useState("");
  const [typeFilter,  setTypeFilter]  = useState<DocumentType | "">("");
  const [statusFilter,setStatusFilter]= useState<DocumentStatus | "">("");
  const [page,        setPage]        = useState(1);
  const [previewId,   setPreviewId]   = useState<string | null>(null);

  const params: Record<string, unknown> = { page };
  if (search)       params.search        = search;
  if (typeFilter)   params.document_type = typeFilter;
  if (statusFilter) params.status        = statusFilter;

  const { data, isLoading } = useQuery({
    queryKey: ["finance-documents", params],
    queryFn:  () => financeApi.list(params),
  });

  const deleteMutation = useMutation({
    mutationFn: financeApi.delete,
    onSuccess: () => {
      message.success("Document deleted");
      qc.invalidateQueries({ queryKey: ["finance-documents"] });
    },
    onError: () => message.error("Failed to delete document"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: DocumentStatus }) =>
      financeApi.updateStatus(id, status),
    onSuccess: () => {
      message.success("Status updated");
      qc.invalidateQueries({ queryKey: ["finance-documents"] });
    },
    onError: () => message.error("Failed to update status"),
  });

  const documents = data?.results ?? [];
  const total     = data?.count ?? 0;

  // ── Summary stats ──────────────────────────────────────────────────────────
  const totalValue = documents.reduce((acc, d) => acc + parseFloat(d.total_amount), 0);
  const draftCount = documents.filter(d => d.status === "draft").length;
  const paidCount  = documents.filter(d => d.status === "paid").length;

  // ── Table columns ──────────────────────────────────────────────────────────
  const columns = [
    {
      title:     "Document No.",
      dataIndex: "document_number",
      key:       "document_number",
      render:    (v: string) => (
        <Text style={{ fontFamily: "monospace", fontWeight: 600, color: "#1677ff" }}>{v}</Text>
      ),
    },
    {
      title:  "Type",
      key:    "document_type",
      render: (_: unknown, r: FinanceDocument) => (
        <Tag color="blue" style={{ fontWeight: 500 }}>
          {r.document_type_display}
        </Tag>
      ),
    },
    {
      title:     "Client",
      dataIndex: "client_name",
      key:       "client_name",
      render:    (v: string) => <Text strong>{v}</Text>,
    },
    {
      title:     "Project",
      dataIndex: "project_name",
      key:       "project_name",
      render:    (v: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title:  "Status",
      key:    "status",
      render: (_: unknown, r: FinanceDocument) => {
        const allowed = ALLOWED_STATUSES[r.document_type];
        return (
          <Select
            value={r.status}
            size="small"
            style={{ width: 140 }}
            disabled={!canUpdate}
            onChange={(s: DocumentStatus) =>
              statusMutation.mutate({ id: r.id, status: s })
            }
          >
            {allowed.map(s => (
              <Option key={s} value={s}>
                <Tag color={STATUS_COLORS[s]} style={{ margin: 0 }}>
                  {s.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
                </Tag>
              </Option>
            ))}
          </Select>
        );
      },
    },
    {
      title:  "Total",
      key:    "total_amount",
      align:  "right" as const,
      render: (_: unknown, r: FinanceDocument) => (
        <Text strong>
          {r.currency} {parseFloat(r.total_amount).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
          })}
        </Text>
      ),
    },
    {
      title:  "Valid Until",
      key:    "valid_until",
      render: (_: unknown, r: FinanceDocument) =>
        r.valid_until
          ? new Date(r.valid_until).toLocaleDateString("en-IN")
          : <Text type="secondary">—</Text>,
    },
    {
      title:  "Created",
      key:    "created_at",
      render: (_: unknown, r: FinanceDocument) =>
        new Date(r.created_at).toLocaleDateString("en-IN"),
    },
    {
      title:  "Actions",
      key:    "actions",
      align:  "center" as const,
      render: (_: unknown, r: FinanceDocument) => (
        <Space size={4}>
          <Tooltip title="Preview PDF">
            <Button
              size="small"
              icon={<FilePdfOutlined />}
              onClick={() => setPreviewId(r.id)}
            />
          </Tooltip>
          {canUpdate && (
            <Tooltip title="Edit">
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => navigate(`/finance/documents/${r.id}`)}
              />
            </Tooltip>
          )}
          {canDelete && (
            <Popconfirm
              title="Delete this document?"
              description="This action cannot be undone."
              onConfirm={() => deleteMutation.mutate(r.id)}
              okText="Delete"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Delete">
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Finance Documents</Title>
          <Text type="secondary">Manage quotations, invoices, purchase orders and receipts</Text>
        </div>
        {canCreate && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate("/finance/documents/new")}
          >
            New Document
          </Button>
        )}
      </div>

      {/* ── Summary cards ────────────────────────────────────────────────── */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card size="small" bordered={false} style={{ background: "#f0f5ff", borderRadius: 10 }}>
            <Statistic
              title="Total Documents"
              value={total}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: "#1677ff" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" bordered={false} style={{ background: "#fff7e6", borderRadius: 10 }}>
            <Statistic
              title="Draft"
              value={draftCount}
              prefix={<FileOutlined />}
              valueStyle={{ color: "#d48806" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" bordered={false} style={{ background: "#f6ffed", borderRadius: 10 }}>
            <Statistic
              title="Paid"
              value={paidCount}
              prefix={<DollarOutlined />}
              valueStyle={{ color: "#389e0d" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" bordered={false} style={{ background: "#e6f4ff", borderRadius: 10 }}>
            <Statistic
              title="Total Value (INR)"
              value={totalValue}
              prefix="₹"
              precision={2}
              valueStyle={{ color: "#0958d9", fontSize: 16 }}
            />
          </Card>
        </Col>
      </Row>

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <Card
        style={{ marginBottom: 16, borderRadius: 10 }}
        styles={{ body: { padding: "14px 16px" } }}
      >
        <Row gutter={12} align="middle">
          <Col flex="1">
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Search by document number or client…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </Col>
          <Col>
            <Select
              allowClear
              placeholder="Document Type"
              style={{ width: 180 }}
              value={typeFilter || undefined}
              onChange={(v: DocumentType | undefined) => {
                setTypeFilter(v ?? "");
                setStatusFilter("");
                setPage(1);
              }}
            >
              {DOC_TYPE_OPTIONS.map(o => (
                <Option key={o.value} value={o.value}>{o.label}</Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Select
              allowClear
              placeholder="Status"
              style={{ width: 160 }}
              value={statusFilter || undefined}
              onChange={(v: DocumentStatus | undefined) => {
                setStatusFilter(v ?? "");
                setPage(1);
              }}
            >
              {(typeFilter ? ALLOWED_STATUSES[typeFilter] : Object.values(ALLOWED_STATUSES).flat().filter((s, i, a) => a.indexOf(s) === i)).map(s => (
                <Option key={s} value={s}>
                  <Tag color={STATUS_COLORS[s]} style={{ margin: 0 }}>
                    {s.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
                  </Tag>
                </Option>
              ))}
            </Select>
          </Col>
        </Row>
      </Card>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <Card style={{ borderRadius: 10 }} styles={{ body: { padding: 0 } }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={documents}
          loading={isLoading}
          pagination={{
            total,
            current:  page,
            pageSize: 20,
            showSizeChanger: false,
            showTotal: (t) => `${t} documents`,
            onChange:  (p) => setPage(p),
          }}
          size="middle"
          onRow={(r) => ({
            onDoubleClick: () => navigate(`/finance/documents/${r.id}`),
            style: { cursor: "pointer" },
          })}
        />
      </Card>

      {/* ── PDF Preview Modal ─────────────────────────────────────────────── */}
      {previewId && (
        <PDFPreviewModal
          documentId={previewId}
          onClose={() => setPreviewId(null)}
        />
      )}
    </div>
  );
}
