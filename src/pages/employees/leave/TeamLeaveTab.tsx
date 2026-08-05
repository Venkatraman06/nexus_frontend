import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table, Typography, Space, Button, Modal, Form, Input, Select, Empty, Spin, Tag, Badge, message, Tooltip
} from "antd";
import { FilterOutlined, ReloadOutlined, EyeOutlined, MedicineBoxOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { get, post } from "@/services/api";
import { LeaveStatusBadge } from "./leaveStatus.tsx";

const { Text } = Typography;

interface TeamLeaveRow {
  id: string;
  employee: string;
  employee_code?: string;
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
  reporting_level: string;
  can_approve: boolean;
  can_ack?: boolean;
  can_view_only: boolean;
  medical_certificate?: string | null;
  is_emergency?: boolean;
  exempt_from_balance?: boolean;
}

interface TeamLeaveResponse {
  pending_count: number;
  direct_count: number;
  indirect_count: number;
  results: TeamLeaveRow[];
}

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
    onError: (e: any) => {
      const msg = e?.response?.data?.detail || e?.response?.data?.message || (typeof e?.response?.data === "string" ? e.response.data : "Failed to update leave request");
      message.error(msg);
    },
  });

  if (!record) return null;

  return (
    <Modal
      title={`Approve / Reject — ${record.employee}`}
      open={open}
      onCancel={onClose}
      footer={null}
      width={520}
    >
      <div style={{
        background: "var(--bms-surface-2)", borderRadius: 10, padding: "12px 16px",
        marginBottom: 16, border: "1px solid var(--bms-border)",
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px",
      }}>
        {[
          { label: "Employee", value: record.employee },
          { label: "Leave Type", value: record.leave_type },
          { label: "From", value: dayjs(record.start_date).format("DD MMM YYYY") },
          { label: "To", value: dayjs(record.end_date).format("DD MMM YYYY") },
          { label: "Days", value: `${record.days_count} day(s)` },
        ].map(({ label, value }) => (
          <div key={label}>
            <Text style={{ fontSize: 11, color: "var(--bms-text-3)" }}>{label}</Text>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{value}</div>
          </div>
        ))}
        {record.reason && (
          <div style={{ gridColumn: "1 / -1" }}>
            <Text style={{ fontSize: 11, color: "var(--bms-text-3)" }}>Reason</Text>
            <div style={{ fontSize: 13, color: "var(--bms-text-2)" }}>{record.reason}</div>
          </div>
        )}
      </div>

      {/* Emergency + Proof Certificate Info Banner */}
      {record.is_emergency && (
        <div style={{
          padding: "10px 14px", borderRadius: 8, marginBottom: 16,
          background: record.medical_certificate ? "#f0fdf4" : "#fffbeb",
          border: `1px solid ${record.medical_certificate ? "#86efac" : "#fcd34d"}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <MedicineBoxOutlined style={{ color: record.medical_certificate ? "#059669" : "#d97706" }} />
              <Text style={{ fontSize: 13, fontWeight: 600, color: record.medical_certificate ? "#059669" : "#d97706" }}>
                {record.medical_certificate
                  ? "Emergency Proof Uploaded (Balance will NOT be deducted)"
                  : "Emergency Leave (No proof attached)"}
              </Text>
            </div>
            {record.medical_certificate && (
              <a href={record.medical_certificate} target="_blank" rel="noreferrer"
                style={{ fontSize: 12, fontWeight: 600, color: "#1677ff" }}>
                View Proof ↗
              </a>
            )}
          </div>
        </div>
      )}

      {/* Document info for non-emergency leaves */}
      {!record.is_emergency && record.medical_certificate && (
        <div style={{
          padding: "10px 14px", borderRadius: 8, marginBottom: 16,
          background: "#f0f8ff", border: "1px solid #bae0ff",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 13, fontWeight: 600, color: "#0958d9" }}>
              Document Attached
            </Text>
            <a href={record.medical_certificate} target="_blank" rel="noreferrer"
              style={{ fontSize: 12, fontWeight: 600, color: "#1677ff" }}>
              View Document ↗
            </a>
          </div>
        </div>
      )}
      <Form form={form} layout="vertical" onFinish={(v) =>
        mutation.mutate({ id: record.id, status: v.status, remarks: v.remarks || "" })
      }>
        <Form.Item name="status" label="Decision" rules={[{ required: true }]}>
          <Select placeholder="Select decision">
            <Select.Option value="APPROVED"><span style={{ color: "#059669", fontWeight: 600 }}>Approve</span></Select.Option>
            <Select.Option value="REJECTED"><span style={{ color: "#dc2626", fontWeight: 600 }}>Reject</span></Select.Option>
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

export default function TeamLeaveTab() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [reviewRecord, setReviewRecord] = useState<TeamLeaveRow | null>(null);

  const { data: meta } = useQuery<{ has_team: boolean; direct_count: number; indirect_count: number }>({
    queryKey: ["leave-team-meta"],
    queryFn: () => get("/leave/team/meta/"),
  });

  const { data, isLoading } = useQuery<TeamLeaveResponse>({
    queryKey: ["leave-team-requests", statusFilter],
    queryFn: () =>
      get<TeamLeaveResponse>("/leave/team/requests/", statusFilter ? { status: statusFilter } : {}),
    enabled: meta?.has_team !== false,
    staleTime: 0,
  });

  if (meta && !meta.has_team) {
    return (
      <Empty
        description="You have no team members in your reporting line"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        style={{ padding: 48 }}
      />
    );
  }

  const columns = [
    {
      title: "Employee",
      key: "employee",
      width: 160,
      render: (_: unknown, r: TeamLeaveRow) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{r.employee}</Text>
          {r.employee_code && (
            <div style={{ fontSize: 11, color: "var(--bms-text-3)", fontFamily: "monospace" }}>{r.employee_code}</div>
          )}
        </div>
      ),
    },
    {
      title: "Team",
      key: "level",
      width: 100,
      render: (_: unknown, r: TeamLeaveRow) => (
        <Tag color={r.reporting_level === "direct" ? "blue" : "default"} style={{ margin: 0, fontSize: 11 }}>
          {r.reporting_level === "direct" ? "Direct" : "Indirect"}
        </Tag>
      ),
    },
    {
      title: "Leave",
      key: "leave",
      width: 120,
      render: (_: unknown, r: TeamLeaveRow) => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: r.color }} />
          <Text style={{ fontSize: 12 }}>{r.leave_type}</Text>
        </span>
      ),
    },
    {
      title: "Dates",
      key: "dates",
      width: 150,
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
      render: (v: string) => <Text style={{ fontSize: 12, color: "var(--bms-text-2)" }}>{v || "—"}</Text>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (v: string) => <LeaveStatusBadge status={v} />,
    },
    {
      title: "Action",
      key: "action",
      width: 120,
      render: (_: unknown, record: TeamLeaveRow) => (
        <Space size={4}>
          {record.can_approve ? (
            <Button type="primary" size="small" onClick={() => setReviewRecord(record)}>
              Review
            </Button>
          ) : (
            <Tag icon={<EyeOutlined />} style={{ margin: 0, fontSize: 11 }}>View only</Tag>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <Text style={{ fontSize: 13, color: "var(--bms-text-2)" }}>
          Direct reports ({data?.direct_count ?? meta?.direct_count ?? 0}) — you can approve.
          {" "}Indirect ({data?.indirect_count ?? meta?.indirect_count ?? 0}) — view only.
        </Text>
        <Space>
          <Select
            placeholder="Filter by status"
            allowClear
            style={{ width: 180 }}
            value={statusFilter}
            onChange={setStatusFilter}
            suffixIcon={<FilterOutlined />}
          >
            <Select.Option value="PENDING_MANAGER">Awaiting Approval</Select.Option>
            <Select.Option value="PENDING">Pending</Select.Option>
            <Select.Option value="APPROVED">Approved</Select.Option>
            <Select.Option value="REJECTED">Rejected</Select.Option>
          </Select>
          <Button icon={<ReloadOutlined />} onClick={() => {
            queryClient.invalidateQueries({ queryKey: ["leave-team-requests"] });
            queryClient.invalidateQueries({ queryKey: ["leave-team-meta"] });
          }}>
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
            {data?.pending_count} team leave request{(data?.pending_count ?? 0) === 1 ? "" : "s"} awaiting approval
          </Text>
        </div>
      )}

      <Table
        dataSource={data?.results ?? []}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        size="middle"
        pagination={{ pageSize: 15, showSizeChanger: false }}
        scroll={{ x: 900 }}
        locale={{
          emptyText: isLoading ? <Spin /> : (
            <Empty description="No team leave requests" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 40 }} />
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
          queryClient.invalidateQueries({ queryKey: ["leave-team-meta"] });
        }}
      />
    </div>
  );
}
