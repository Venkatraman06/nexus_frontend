import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table, Typography, Tag, Space, Button, Modal, Form,
  Input, Select, Spin, Empty, message, Tooltip, Popconfirm,
} from "antd";
import {
  CheckOutlined, CloseOutlined, DeleteOutlined,
  FilterOutlined, ReloadOutlined,
} from "@ant-design/icons";
import { get, post, del } from "@/services/api";
import PermGuard from "@/components/common/PermGuard";
import { PERMS } from "@/constants/permissions";

const { Title, Text } = Typography;

// ── Types ──────────────────────────────────────────────────────────────────────
interface LeaveRequestRow {
  id: string;
  employee_id: string;
  employee: string;
  leave_type: string;
  color: string;
  start_date: string;
  end_date: string;
  days_count: number;
  reason: string;
  status: string;
  reviewer: string | null;
  reviewer_remarks: string;
  created_at: string;
}

interface Summary {
  pending: number;
  approved: number;
  rejected: number;
  days_approved: number;
}

interface AdminLeaveResponse {
  summary: Summary;
  results: LeaveRequestRow[];
}

// ── Colour maps ───────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  PENDING:   { color: "#d97706", bg: "#fffbeb", label: "pending" },
  APPROVED:  { color: "#16a34a", bg: "#f0fdf4", label: "approved" },
  REJECTED:  { color: "#dc2626", bg: "#fff1f2", label: "rejected" },
  CANCELLED: { color: "#6b7280", bg: "#f9fafb", label: "cancelled" },
};

// ── Summary card ──────────────────────────────────────────────────────────────
function SummaryCard({ label, value, sub, accent }: {
  label: string; value: number | string; sub?: string; accent?: string;
}) {
  return (
    <div style={{
      flex: 1,
      // ✅ FIX: was background: "#fff", border: "1px solid #eaecf0"
      background: "var(--bms-surface)",
      borderRadius: 12,
      border: "1px solid var(--bms-border)",
      padding: "18px 22px",
      minWidth: 160,
    }}>
      {/* ✅ FIX: was color: "#6b7280" */}
      <Text style={{ fontSize: 13, color: "var(--bms-text-2)", display: "block", marginBottom: 4 }}>{label}</Text>
      <div style={{ fontSize: 28, fontWeight: 700, color: accent ?? "var(--bms-text)", lineHeight: 1.2 }}>{value}</div>
      {/* ✅ FIX: was color: "#9ca3af" */}
      {sub && <Text style={{ fontSize: 12, color: "var(--bms-text-3)" }}>{sub}</Text>}
    </div>
  );
}

// ── Review modal ──────────────────────────────────────────────────────────────
function ReviewModal({ open, record, onClose, onDone }: {
  open: boolean;
  record: LeaveRequestRow | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [form] = Form.useForm();

  const mutation = useMutation({
    mutationFn: ({ id, status, remarks }: { id: string; status: string; remarks: string }) =>
      post(`/leave/requests/${id}/review/`, { status, remarks }),
    onSuccess: () => {
      message.success("Leave request updated");
      form.resetFields();
      onDone();
    },
    onError: () => message.error("Failed to update leave request"),
  });

  if (!record) return null;

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: record.color }} />
          <span>Review Leave Request</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={500}
    >
      {/* Request details */}
      <div style={{
        // ✅ FIX: was background: "#f9fafb", border: "1px solid #f3f4f6"
        background: "var(--bms-surface-2)",
        borderRadius: 10,
        padding: "12px 16px",
        marginBottom: 20,
        border: "1px solid var(--bms-border)",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "8px 16px",
      }}>
        {[
          { label: "Employee",   value: record.employee },
          { label: "Leave Type", value: record.leave_type },
          { label: "From",       value: record.start_date },
          { label: "To",         value: record.end_date },
          { label: "Days",       value: `${record.days_count} day(s)` },
          { label: "Applied On", value: record.created_at },
        ].map(({ label, value }) => (
          <div key={label}>
            {/* ✅ FIX: was color: "#9ca3af" / "#111827" */}
            <Text style={{ fontSize: 11, color: "var(--bms-text-3)" }}>{label}</Text>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--bms-text)" }}>{value}</div>
          </div>
        ))}
        {record.reason && (
          <div style={{ gridColumn: "1 / -1" }}>
            <Text style={{ fontSize: 11, color: "var(--bms-text-3)" }}>Reason</Text>
            {/* ✅ FIX: was color: "#374151" */}
            <div style={{ fontSize: 13, color: "var(--bms-text-2)" }}>{record.reason}</div>
          </div>
        )}
      </div>

      <Form form={form} layout="vertical" onFinish={(v) =>
        mutation.mutate({ id: record.id, status: v.status, remarks: v.remarks || "" })
      }>
        <Form.Item name="status" label="Decision" rules={[{ required: true, message: "Please select" }]}>
          <Select placeholder="Select decision">
            <Select.Option value="APPROVED">
              <span style={{ color: "#16a34a", fontWeight: 600 }}>✓ Approve</span>
            </Select.Option>
            <Select.Option value="REJECTED">
              <span style={{ color: "#dc2626", fontWeight: 600 }}>✗ Reject</span>
            </Select.Option>
          </Select>
        </Form.Item>
        <Form.Item name="remarks" label="Remarks (optional)">
          <Input.TextArea rows={2} placeholder="Add a note for the employee…" />
        </Form.Item>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={mutation.isPending}>
            Submit
          </Button>
        </div>
      </Form>
    </Modal>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LeaveRequestsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [reviewRecord, setReviewRecord] = useState<LeaveRequestRow | null>(null);

  const { data, isLoading } = useQuery<AdminLeaveResponse>({
    queryKey: ["leave-admin-requests", statusFilter],
    queryFn: () =>
      get<AdminLeaveResponse>("/leave/admin/requests/", statusFilter ? { status: statusFilter } : {}),
    staleTime: 0,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => del(`/leave/requests/${id}/`),
    onSuccess: () => {
      message.success("Request cancelled");
      queryClient.invalidateQueries({ queryKey: ["leave-admin-requests"] });
    },
    onError: () => message.error("Failed to cancel"),
  });

  const summary = data?.summary ?? { pending: 0, approved: 0, rejected: 0, days_approved: 0 };
  const rows    = data?.results ?? [];

  const columns = [
    {
      title: "EMPLOYEE",
      dataIndex: "employee",
      key: "employee",
      render: (v: string) => <Text strong style={{ fontSize: 13, color: "#1677ff" }}>{v}</Text>,
    },
    {
      title: "LEAVE TYPE",
      dataIndex: "leave_type",
      key: "leave_type",
      render: (v: string, r: LeaveRequestRow) => (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: r.color, flexShrink: 0 }} />
          {/* ✅ FIX: was no color set, inherits correctly via var(--bms-text) from antd */}
          <Text style={{ fontSize: 13, color: "var(--bms-text)" }}>{v}</Text>
        </div>
      ),
    },
    {
      title: "FROM",
      dataIndex: "start_date",
      key: "start_date",
      render: (v: string) => <Text style={{ fontSize: 13, color: "var(--bms-text)" }}>{v}</Text>,
    },
    {
      title: "TO",
      dataIndex: "end_date",
      key: "end_date",
      render: (v: string) => <Text style={{ fontSize: 13, color: "var(--bms-text)" }}>{v}</Text>,
    },
    {
      title: "DAYS",
      dataIndex: "days_count",
      key: "days_count",
      width: 70,
      render: (v: number) => (
        <Text strong style={{ fontSize: 14, color: "#1677ff" }}>{v}</Text>
      ),
    },
    {
      title: "REASON",
      dataIndex: "reason",
      key: "reason",
      ellipsis: true,
      // ✅ FIX: was color: "#6b7280"
      render: (v: string) => <Text style={{ fontSize: 12, color: "var(--bms-text-2)" }}>{v || "—"}</Text>,
    },
    {
      title: "STATUS",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (v: string) => {
        const s = STATUS_STYLES[v] ?? STATUS_STYLES.CANCELLED;
        return (
          <span style={{
            fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 20,
            color: s.color, background: s.bg, border: `1px solid ${s.color}33`,
          }}>
            {s.label}
          </span>
        );
      },
    },
    {
      title: "APPLIED",
      dataIndex: "created_at",
      key: "created_at",
      // ✅ FIX: was color: "#6b7280"
      render: (v: string) => <Text style={{ fontSize: 12, color: "var(--bms-text-2)" }}>{v}</Text>,
    },
    {
      title: "ACTIONS",
      key: "actions",
      width: 120,
      render: (_: any, record: LeaveRequestRow) => (
        <Space size={4}>
          {record.status === "PENDING" && (
            <PermGuard permission={PERMS.HRMS_LEAVE_APPROVE}>
              <Button
                size="small"
                style={{
                  fontSize: 12, borderRadius: 4,
                  borderColor: "#1677ff", color: "#1677ff",
                }}
                onClick={() => setReviewRecord(record)}
              >
                Review
              </Button>
            </PermGuard>
          )}
          <PermGuard permission={PERMS.HRMS_LEAVE_MANAGE}>
            <Popconfirm
              title="Cancel this leave request?"
              onConfirm={() => deleteMutation.mutate(record.id)}
            >
              <Button size="small" style={{ fontSize: 12, borderRadius: 4 }}>
                Del
              </Button>
            </Popconfirm>
          </PermGuard>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0, color: "var(--bms-text)" }}>Leave Requests</Title>
          {/* ✅ FIX: was color: "#6b7280" */}
          <Text style={{ color: "var(--bms-text-2)", fontSize: 13 }}>Manage employee leave applications</Text>
        </div>
        <Space>
          <Select
            placeholder="Filter by status"
            allowClear
            style={{ width: 160 }}
            value={statusFilter}
            onChange={setStatusFilter}
            suffixIcon={<FilterOutlined />}
          >
            <Select.Option value="PENDING">Pending</Select.Option>
            <Select.Option value="APPROVED">Approved</Select.Option>
            <Select.Option value="REJECTED">Rejected</Select.Option>
            <Select.Option value="CANCELLED">Cancelled</Select.Option>
          </Select>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => queryClient.invalidateQueries({ queryKey: ["leave-admin-requests"] })}
          >
            Refresh
          </Button>
        </Space>
      </div>

      {/* Summary cards */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <SummaryCard label="Pending"       value={summary.pending}       sub="Awaiting approval" accent="#d97706" />
        <SummaryCard label="Approved"      value={summary.approved}      accent="#16a34a" />
        <SummaryCard label="Rejected"      value={summary.rejected}      accent="#dc2626" />
        <SummaryCard label="Days Approved" value={summary.days_approved} accent="#1677ff" />
      </div>

      {/* Table */}
      <div style={{
        // ✅ FIX: was background: "#fff", border: "1px solid #eaecf0"
        background: "var(--bms-surface)",
        borderRadius: 12,
        border: "1px solid var(--bms-border)",
        overflow: "hidden",
      }}>
        <Table
          dataSource={rows}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          size="middle"
          pagination={{ pageSize: 20, showSizeChanger: false, showTotal: (t) => `${t} requests` }}
          locale={{ emptyText: <Empty description="No leave requests" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 40 }} /> }}
          style={{ fontSize: 13 }}
          rowClassName={(r) => r.status === "PENDING" ? "pending-row" : ""}
        />
      </div>

      {/* Review modal */}
      <ReviewModal
        open={!!reviewRecord}
        record={reviewRecord}
        onClose={() => setReviewRecord(null)}
        onDone={() => {
          setReviewRecord(null);
          queryClient.invalidateQueries({ queryKey: ["leave-admin-requests"] });
        }}
      />
    </div>
  );
}