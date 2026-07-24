import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table, Typography, Space, Button, Modal, Form,
  Input, Select, Spin, Empty, message, Tag, Badge,
} from "antd";
import { FilterOutlined, ReloadOutlined, TeamOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { get, post } from "@/services/api";

const { Title, Text } = Typography;

interface TeamLeaveRow {
  id: string;
  employee: string;
  leave_type: string;
  color: string;
  start_date: string;
  end_date: string;
  days_count: number;
  reason: string;
  status: string;
  acknowledged_by?: string | null;
  ack_project?: string | null;
  created_at: string;
  can_approve: boolean;
}

interface TeamLeaveResponse {
  pending_count: number;
  results: TeamLeaveRow[];
}

const STATUS_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  PENDING_MANAGER: { color: "#d97706", bg: "#fffbeb", label: "awaiting approval" },
  PENDING:         { color: "#d97706", bg: "#fffbeb", label: "pending"          },
  APPROVED:        { color: "#059669", bg: "#f0fdf4", label: "approved"         },
  REJECTED:        { color: "#dc2626", bg: "#fff1f2", label: "rejected"         },
};

function ReviewModal({ open, record, onClose, onDone }: {
  open: boolean;
  record: TeamLeaveRow | null;
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
    onError: (e: any) => message.error(e?.response?.data?.detail ?? "Failed to update leave request"),
  });

  if (!record) return null;

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: record.color }} />
          <span>Approve / Reject — Team Leave</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={520}
    >
      <div style={{
        background: "var(--pmt-surface-2)",
        borderRadius: 10,
        padding: "12px 16px",
        marginBottom: 16,
        border: "1px solid var(--pmt-border)",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "8px 16px",
      }}>
        {[
          { label: "Employee",   value: record.employee },
          { label: "Leave Type", value: record.leave_type },
          { label: "From",       value: dayjs(record.start_date).format("DD MMM YYYY") },
          { label: "To",         value: dayjs(record.end_date).format("DD MMM YYYY") },
          { label: "Days",       value: `${record.days_count} day(s)` },
          { label: "Applied On", value: record.created_at },
        ].map(({ label, value }) => (
          <div key={label}>
            <Text style={{ fontSize: 11, color: "var(--pmt-text-3)" }}>{label}</Text>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--pmt-text)" }}>{value}</div>
          </div>
        ))}
        {record.acknowledged_by && (
          <div style={{ gridColumn: "1 / -1" }}>
            <Text style={{ fontSize: 11, color: "var(--pmt-text-3)" }}>Acknowledged by</Text>
            <div style={{ fontSize: 13, color: "var(--pmt-text-2)" }}>
              {record.acknowledged_by}
              {record.ack_project ? ` · ${record.ack_project}` : ""}
            </div>
          </div>
        )}
        {record.reason && (
          <div style={{ gridColumn: "1 / -1" }}>
            <Text style={{ fontSize: 11, color: "var(--pmt-text-3)" }}>Reason</Text>
            <div style={{ fontSize: 13, color: "var(--pmt-text-2)" }}>{record.reason}</div>
          </div>
        )}
      </div>

      <Form form={form} layout="vertical" onFinish={(v) =>
        mutation.mutate({ id: record.id, status: v.status, remarks: v.remarks || "" })
      }>
        <Form.Item name="status" label="Decision" rules={[{ required: true, message: "Please select" }]}>
          <Select placeholder="Select decision">
            <Select.Option value="APPROVED">
              <span style={{ color: "#059669", fontWeight: 600 }}>Approve</span>
            </Select.Option>
            <Select.Option value="REJECTED">
              <span style={{ color: "#dc2626", fontWeight: 600 }}>Reject</span>
            </Select.Option>
          </Select>
        </Form.Item>
        <Form.Item name="remarks" label="Remarks (optional)">
          <Input.TextArea rows={2} placeholder="Optional note for the employee…" />
        </Form.Item>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={mutation.isPending}>Submit</Button>
        </div>
      </Form>
    </Modal>
  );
}

export default function TeamLeaveApprovalsPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get("status") ?? undefined;
  const [statusFilter, setStatusFilter] = useState<string | undefined>(initialStatus || undefined);
  const [reviewRecord, setReviewRecord] = useState<TeamLeaveRow | null>(null);

  const { data, isLoading } = useQuery<TeamLeaveResponse>({
    queryKey: ["leave-team-requests", statusFilter],
    queryFn: () =>
      get<TeamLeaveResponse>("/leave/team/requests/", statusFilter ? { status: statusFilter } : {}),
    staleTime: 0,
  });

  const columns = [
    {
      title: "Employee",
      dataIndex: "employee",
      key: "employee",
      width: 150,
      render: (v: string) => <Text strong style={{ fontSize: 13 }}>{v}</Text>,
    },
    {
      title: "Leave",
      key: "leave",
      width: 130,
      render: (_: unknown, r: TeamLeaveRow) => (
        <Tag color="purple" style={{ margin: 0 }}>{r.leave_type}</Tag>
      ),
    },
    {
      title: "Dates",
      key: "dates",
      width: 160,
      render: (_: unknown, r: TeamLeaveRow) => (
        <span style={{ fontSize: 12 }}>
          {dayjs(r.start_date).format("DD MMM")}
          {r.start_date !== r.end_date && ` – ${dayjs(r.end_date).format("DD MMM")}`}
          {" · "}{r.days_count}d
        </span>
      ),
    },
    {
      title: "Reason",
      dataIndex: "reason",
      key: "reason",
      ellipsis: true,
      render: (v: string) => <Text style={{ fontSize: 12, color: "var(--pmt-text-2)" }}>{v || "—"}</Text>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (v: string) => {
        const s = STATUS_STYLES[v] ?? { color: "#6b7280", bg: "#f9fafb", label: v.toLowerCase() };
        return (
          <span style={{
            fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 20,
            color: s.color, background: s.bg, border: `1px solid ${s.color}33`,
          }}>
            {s.label}
          </span>
        );
      },
    },
    {
      title: "Action",
      key: "action",
      width: 120,
      render: (_: unknown, record: TeamLeaveRow) =>
        record.can_approve ? (
          <Button
            type="primary"
            size="small"
            onClick={() => setReviewRecord(record)}
          >
            Review
          </Button>
        ) : null,
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", rowGap: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0, color: "var(--pmt-text)" }}>
            <TeamOutlined style={{ marginRight: 8 }} />
            Team Leave Approvals
          </Title>
          <Text style={{ color: "var(--pmt-text-2)", fontSize: 13 }}>
            Approve or reject leave requests from your direct reports
          </Text>
        </div>
        <Space wrap>
          <Select
            placeholder="Filter by status"
            allowClear
            style={{ width: 180 }}
            value={statusFilter}
            onChange={setStatusFilter}
            suffixIcon={<FilterOutlined />}
          >
            <Select.Option value="PENDING_MANAGER">Awaiting Approval</Select.Option>
            <Select.Option value="APPROVED">Approved</Select.Option>
            <Select.Option value="REJECTED">Rejected</Select.Option>
          </Select>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => queryClient.invalidateQueries({ queryKey: ["leave-team-requests"] })}
          >
            Refresh
          </Button>
        </Space>
      </div>

      {(data?.pending_count ?? 0) > 0 && (
        <div style={{
          marginBottom: 16, padding: "10px 14px", borderRadius: 8,
          background: "#fffbeb", border: "1px solid #fcd34d",
        }}>
          <Badge count={data?.pending_count} style={{ marginRight: 8 }} />
          <Text style={{ fontSize: 13, color: "#92400e" }}>
            {data?.pending_count} team leave request{(data?.pending_count ?? 0) === 1 ? "" : "s"} awaiting your approval
          </Text>
        </div>
      )}

      <Table
        dataSource={data?.results ?? []}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        size="small"
        pagination={{ pageSize: 10, showSizeChanger: false }}
        scroll={{ x: 800 }}
        locale={{
          emptyText: isLoading ? (
            <Spin />
          ) : (
            <Empty
              description="No team leave requests"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ padding: 40 }}
            />
          ),
        }}
      />

      <ReviewModal
        open={!!reviewRecord}
        record={reviewRecord}
        onClose={() => setReviewRecord(null)}
        onDone={() => {
          setReviewRecord(null);
          queryClient.invalidateQueries({ queryKey: ["leave-team-requests"] });
        }}
      />
    </div>
  );
}
