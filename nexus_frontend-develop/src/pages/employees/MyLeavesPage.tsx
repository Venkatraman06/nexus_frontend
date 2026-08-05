import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Typography, Card, Table, Tag, Button, Space, Modal, Form,
  Input, Select, DatePicker, Empty, Spin, message, Divider, Progress, Row, Col,
} from "antd";
import {
  PlusOutlined, CalendarOutlined, ClockCircleOutlined,
  CheckCircleOutlined, CloseCircleOutlined, HomeOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { get, post, del } from "@/services/api";

const { Title, Text } = Typography;

interface LeaveBalance {
  id: string; leave_type_name: string; leave_type_code: string;
  leave_type_color: string; is_paid: boolean;
  year: number; total_days: string; used_days: string;
  pending_days: number; remaining_days: number;
}
interface LeaveRequest {
  id: string; leave_type: string; leave_type_name: string;
  leave_type_color: string; start_date: string; end_date: string;
  days_count: string; status: string; reason: string;
  reviewer_name: string | null; reviewer_remarks: string; created_at: string;
}
interface LeaveType {
  id: string; name: string; code: string; color: string; max_days: number; is_paid: boolean;
}

const STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  PENDING:   { color: "#d97706", bg: "#fffbeb", label: "Pending"   },
  APPROVED:  { color: "#16a34a", bg: "#f0fdf4", label: "Approved"  },
  REJECTED:  { color: "#dc2626", bg: "#fff1f2", label: "Rejected"  },
  CANCELLED: { color: "#6b7280", bg: "#f9fafb", label: "Cancelled" },
};

function ApplyModal({ open, onClose, onSuccess }: {
  open: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const [form] = Form.useForm();
  const { data: leaveTypes } = useQuery<LeaveType[]>({
    queryKey: ["leave-types"],
    queryFn: () => get("/leave/types/"),
    enabled: open,
  });
  const mutation = useMutation({
    mutationFn: (data: any) => post("/leave/requests/", data),
    onSuccess: () => {
      message.success("Leave request submitted successfully");
      form.resetFields();
      onSuccess();
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.detail
        || Object.entries(e?.response?.data ?? {}).map(([k, v]: any) => `${k}: ${Array.isArray(v) ? v[0] : v}`).join(", ")
        || "Failed to submit";
      message.error(msg);
    },
  });

  return (
    <Modal title={<span><CalendarOutlined style={{ color: "#7c3aed", marginRight: 8 }} />Apply for Leave</span>}
      open={open} onCancel={() => { form.resetFields(); onClose(); }} footer={null} width={480} destroyOnClose>
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}
        onFinish={(v) => mutation.mutate({
          leave_type: v.leave_type,
          start_date: v.dates[0].format("YYYY-MM-DD"),
          end_date:   v.dates[1].format("YYYY-MM-DD"),
          reason:     v.reason || "",
        })}>
        <Form.Item name="leave_type" label="Leave Type" rules={[{ required: true, message: "Select a leave type" }]}>
          <Select placeholder="Select leave type">
            {(leaveTypes ?? []).map((t) => (
              <Select.Option key={t.id} value={t.id}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.color }} />
                  {t.name}
                  {t.max_days > 0 && <span style={{ color: "#9ca3af", fontSize: 11 }}>({t.max_days} days/year)</span>}
                  {!t.is_paid && <Tag color="warning" style={{ fontSize: 10, padding: "0 4px" }}>Unpaid</Tag>}
                </div>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="dates" label="Date Range" rules={[{ required: true, message: "Select dates" }]}>
          <DatePicker.RangePicker style={{ width: "100%" }} format="DD MMM YYYY"
            disabledDate={(d) => d && d < dayjs().startOf("day")} />
        </Form.Item>
        <Form.Item name="reason" label="Reason">
          <Input.TextArea rows={3} placeholder="Optional reason for leave..." />
        </Form.Item>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button onClick={() => { form.resetFields(); onClose(); }}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={mutation.isPending}
            style={{ background: "#7c3aed", borderColor: "#7c3aed" }}>
            Submit Request
          </Button>
        </div>
      </Form>
    </Modal>
  );
}

export default function MyLeavesPage() {
  const qc = useQueryClient();
  const [applyOpen, setApplyOpen] = useState(false);

  const { data: balances, isLoading: balLoading } = useQuery<LeaveBalance[]>({
    queryKey: ["my-leave-balances"],
    queryFn: () => get("/leave/balances/"),
    staleTime: 30_000,
  });

  const { data: requests, isLoading: reqLoading } = useQuery<LeaveRequest[]>({
    queryKey: ["my-leave-requests"],
    queryFn: () => get("/leave/requests/"),
    staleTime: 0,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => del(`/leave/requests/${id}/`),
    onSuccess: () => {
      message.success("Leave request cancelled");
      qc.invalidateQueries({ queryKey: ["my-leave-requests"] });
      qc.invalidateQueries({ queryKey: ["my-leave-balances"] });
    },
    onError: () => message.error("Failed to cancel"),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["my-leave-requests"] });
    qc.invalidateQueries({ queryKey: ["my-leave-balances"] });
  };

  const columns = [
    {
      title: "Leave Type", key: "leave_type",
      render: (_: any, r: LeaveRequest) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: r.leave_type_color, flexShrink: 0 }} />
          <Text style={{ fontSize: 13, fontWeight: 500, color: "var(--bms-text)" }}>{r.leave_type_name}</Text>
        </div>
      ),
    },
    {
      title: "From", dataIndex: "start_date", key: "start_date", width: 120,
      render: (v: string) => <Text style={{ fontSize: 13, color: "var(--bms-text)" }}>{dayjs(v).format("DD MMM YYYY")}</Text>,
    },
    {
      title: "To", dataIndex: "end_date", key: "end_date", width: 120,
      render: (v: string) => <Text style={{ fontSize: 13, color: "var(--bms-text)" }}>{dayjs(v).format("DD MMM YYYY")}</Text>,
    },
    {
      title: "Days", dataIndex: "days_count", key: "days_count", width: 70,
      render: (v: string) => <Text strong style={{ color: "#1677ff" }}>{v}</Text>,
    },
    {
      title: "Reason", dataIndex: "reason", key: "reason", ellipsis: true,
      render: (v: string) => <Text style={{ fontSize: 12, color: "var(--bms-text-2)" }}>{v || "—"}</Text>,
    },
    {
      title: "Status", dataIndex: "status", key: "status", width: 110,
      render: (v: string) => {
        const s = STATUS_STYLE[v] ?? STATUS_STYLE.CANCELLED;
        return <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 20, color: s.color, background: s.bg, border: `1px solid ${s.color}33` }}>{s.label}</span>;
      },
    },
    {
      title: "Reviewer", dataIndex: "reviewer_name", key: "reviewer", width: 130,
      render: (v: string | null) => <Text style={{ fontSize: 12, color: "var(--bms-text-3)" }}>{v || "—"}</Text>,
    },
    {
      title: "Applied", dataIndex: "created_at", key: "created_at", width: 120,
      render: (v: string) => <Text style={{ fontSize: 11, color: "var(--bms-text-3)" }}>{dayjs(v).format("DD MMM YYYY")}</Text>,
    },
    {
      title: "Action", key: "action", width: 90,
      render: (_: any, r: LeaveRequest) => r.status === "PENDING" ? (
        <Button size="small" danger onClick={() => cancelMutation.mutate(r.id)} loading={cancelMutation.isPending}>
          Cancel
        </Button>
      ) : null,
    },
  ];

  const year = dayjs().year();

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0, color: "var(--bms-text)" }}>My Leaves</Title>
          <Text style={{ color: "var(--bms-text-2)", fontSize: 13 }}>Track your leave balances and requests</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setApplyOpen(true)}
          style={{ background: "#7c3aed", borderColor: "#7c3aed" }}>
          Apply Leave
        </Button>
      </div>

      {/* Leave Balances */}
      <Card size="small" style={{ borderRadius: 12, marginBottom: 20, border: "1px solid var(--bms-border)", background: "var(--bms-surface)" }}
        title={<span style={{ fontWeight: 600, color: "var(--bms-text)" }}><CalendarOutlined style={{ color: "#7c3aed", marginRight: 8 }} />Leave Balance — {year}</span>}>
        {balLoading ? (
          <div style={{ textAlign: "center", padding: 40 }}><Spin /></div>
        ) : !balances?.length ? (
          <Empty description="No leave balance configured. Contact HR." image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 24 }} />
        ) : (
          <Row gutter={[16, 16]}>
            {balances.map((b) => {
              const total = parseFloat(b.total_days as any) || 0;
              const used  = parseFloat(b.used_days  as any) || 0;
              const pct   = total > 0 ? Math.round((used / total) * 100) : 0;
              return (
                <Col xs={24} sm={12} lg={8} key={b.id}>
                  <div style={{ padding: "14px 16px", borderRadius: 10, background: "var(--bms-surface-2)", border: `1px solid ${b.leave_type_color}33` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: b.leave_type_color }} />
                        <Text style={{ fontWeight: 600, fontSize: 13, color: "var(--bms-text)" }}>{b.leave_type_name}</Text>
                        {!b.is_paid && <Tag color="warning" style={{ fontSize: 10 }}>Unpaid</Tag>}
                      </div>
                      <Text style={{ fontSize: 18, fontWeight: 700, color: b.leave_type_color }}>{b.remaining_days}d</Text>
                    </div>
                    <Progress percent={pct} strokeColor={b.leave_type_color} showInfo={false} size="small" style={{ marginBottom: 4 }} />
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <Text style={{ fontSize: 11, color: "var(--bms-text-3)" }}>Used: {used} / {total} days</Text>
                      {b.pending_days > 0 && <Text style={{ fontSize: 11, color: "#d97706" }}>Pending: {b.pending_days}d</Text>}
                    </div>
                  </div>
                </Col>
              );
            })}
          </Row>
        )}
      </Card>

      {/* Leave Requests */}
      <Card size="small" style={{ borderRadius: 12, border: "1px solid var(--bms-border)", background: "var(--bms-surface)" }}
        title={<span style={{ fontWeight: 600, color: "var(--bms-text)" }}><ClockCircleOutlined style={{ color: "#1677ff", marginRight: 8 }} />My Leave Requests</span>}>
        <Table dataSource={requests ?? []} columns={columns} rowKey="id"
          loading={reqLoading} size="small"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 900 }}
          locale={{ emptyText: <Empty description="No leave requests yet" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 40 }} /> }}
        />
      </Card>

      <ApplyModal open={applyOpen} onClose={() => setApplyOpen(false)} onSuccess={() => { setApplyOpen(false); refresh(); }} />
    </div>
  );
}