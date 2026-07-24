import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table, Typography, Button, Space, Empty, Spin, Progress, Card, Row, Col,
  Popconfirm, message, Modal, Form, Input, Switch, InputNumber, ColorPicker,
} from "antd";
import { PlusOutlined, ReloadOutlined, FileAddOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { get, del, post } from "@/services/api";
import { ApplyLeaveModal } from "@/components/employee/LeaveAndPayslip";
import { LeaveStatusBadge } from "./leaveStatus.tsx";

const { Text } = Typography;

interface LeaveBalance {
  leave_type_id: string;
  leave_type_name: string;
  leave_type_code: string;
  leave_type_color: string;
  total_days: number;
  used_days: number;
  remaining_days: number;
}

interface MyLeaveRow {
  id: string;
  leave_type_name: string;
  start_date: string;
  end_date: string;
  days_count: number;
  reason: string;
  status: string;
  created_at: string;
}

// ── Create Leave Type Modal ─────────────────────────────────────────────────────
function CreateLeaveTypeModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form] = Form.useForm();

  const mutation = useMutation({
    mutationFn: (values: any) =>
      post("/master/leave/my-types/", {
        name: values.name,
        code: values.code.toUpperCase(),
        max_days: values.max_days || 0,
        is_paid: values.is_paid ?? true,
        color: values.color || "#1677ff",
      }),
    onSuccess: () => {
      message.success("Leave type created and assigned to you!");
      form.resetFields();
      onSuccess();
    },
    onError: (e: any) => {
      const detail = e?.response?.data?.detail || "Failed to create leave type";
      message.error(detail);
    },
  });

  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FileAddOutlined style={{ color: "#8b5cf6" }} />
          <span>Create New Leave Type</span>
        </div>
      }
      open={open}
      onCancel={handleClose}
      onOk={() => form.submit()}
      confirmLoading={mutation.isPending}
      okText="Create & Assign to Me"
      width={480}
      destroyOnClose
    >
      <Text style={{ display: "block", marginBottom: 16, fontSize: 13, color: "var(--pmt-text-2)" }}>
        Create a custom leave type. It will be added to the system and automatically
        assigned to you with a default balance.
      </Text>
      <Form
        form={form}
        layout="vertical"
        onFinish={(v) => mutation.mutate(v)}
        initialValues={{ is_paid: true, color: "#1677ff" }}
      >
        <Row gutter={12}>
          <Col span={16}>
            <Form.Item
              name="name"
              label="Leave Name"
              rules={[{ required: true, message: "Enter a name" }]}
            >
              <Input placeholder="e.g. Study Leave, Exam Leave" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="code"
              label="Code"
              rules={[
                { required: true, message: "Enter code" },
                { max: 10, message: "Max 10 chars" },
              ]}
            >
              <Input
                placeholder="e.g. STL"
                maxLength={10}
                style={{ fontFamily: "monospace", textTransform: "uppercase" }}
                onChange={(e) =>
                  form.setFieldValue("code", e.target.value.toUpperCase())
                }
              />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item
          name="max_days"
          label="Max Days / Year"
          tooltip="0 = unlimited"
          initialValue={10}
        >
          <InputNumber min={0} max={365} style={{ width: "100%" }} placeholder="10" />
        </Form.Item>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="is_paid" label="Paid Leave?" valuePropName="checked">
              <Switch checkedChildren="Paid" unCheckedChildren="Unpaid" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="color" label="Color" getValueFromEvent={(color) => color.toHexString()}>
              <ColorPicker showText format="hex" disabledAlpha style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}

// ── Main Tab ───────────────────────────────────────────────────────────────────
export default function MyLeaveTab() {
  const qc = useQueryClient();
  const [applyOpen, setApplyOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: balances = [], isLoading: balLoading } = useQuery<LeaveBalance[]>({
    queryKey: ["my-leave-balances"],
    queryFn: () => get("/leave/balances/"),
  });

  const { data: requests = [], isLoading: reqLoading } = useQuery<MyLeaveRow[]>({
    queryKey: ["my-leave-requests-list"],
    queryFn: () => get("/leave/requests/"),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => del(`/leave/requests/${id}/`),
    onSuccess: () => {
      message.success("Leave request cancelled");
      qc.invalidateQueries({ queryKey: ["my-leave-requests-list"] });
      qc.invalidateQueries({ queryKey: ["my-leave-balances"] });
    },
    onError: () => message.error("Could not cancel request"),
  });

  const columns = [
    {
      title: "Leave Type",
      dataIndex: "leave_type_name",
      key: "leave_type_name",
      render: (v: string) => <Text strong style={{ fontSize: 13 }}>{v}</Text>,
    },
    {
      title: "From",
      dataIndex: "start_date",
      key: "start_date",
      render: (v: string) => dayjs(v).format("DD MMM YYYY"),
    },
    {
      title: "To",
      dataIndex: "end_date",
      key: "end_date",
      render: (v: string) => dayjs(v).format("DD MMM YYYY"),
    },
    {
      title: "Days",
      dataIndex: "days_count",
      key: "days_count",
      width: 70,
      render: (v: number) => <Text strong>{v}</Text>,
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
      width: 140,
      render: (v: string) => <LeaveStatusBadge status={v} />,
    },
    {
      title: "Applied",
      dataIndex: "created_at",
      key: "created_at",
      width: 110,
      render: (v: string) => dayjs(v).format("DD MMM YYYY"),
    },
    {
      title: "",
      key: "actions",
      width: 90,
      render: (_: unknown, r: MyLeaveRow) =>
        ["PENDING", "PENDING_MANAGER", "PENDING_PROJECT_ACK", "APPROVED"].includes(r.status) ? (
          <Popconfirm title="Cancel this leave request?" onConfirm={() => cancelMutation.mutate(r.id)}>
            <Button size="small" danger type="link" style={{ padding: 0 }}>Cancel</Button>
          </Popconfirm>
        ) : null,
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 16 }}>
        <Button icon={<ReloadOutlined />} onClick={() => {
          qc.invalidateQueries({ queryKey: ["my-leave-requests-list"] });
          qc.invalidateQueries({ queryKey: ["my-leave-balances"] });
        }}>
          Refresh
        </Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setApplyOpen(true)}>
          Apply Leave
        </Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {balLoading ? (
          <Col span={24}><Spin /></Col>
        ) : balances.length === 0 ? (
          <Col span={24}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              No leave balance assigned yet. Open <b>Apply Leave</b> to create a custom leave type.
            </Text>
          </Col>
        ) : (
          balances.map((b) => (
            <Col xs={24} sm={12} md={8} lg={6} key={b.leave_type_id}>
              <Card size="small" style={{ borderRadius: 10 }}>
                <Text style={{ fontSize: 12, color: "var(--pmt-text-2)" }}>{b.leave_type_name}</Text>
                <div style={{ fontSize: 22, fontWeight: 700, color: b.leave_type_color, margin: "4px 0" }}>
                  {b.remaining_days}d
                </div>
                <Text style={{ fontSize: 11, color: "var(--pmt-text-3)" }}>
                  {b.used_days} used of {b.total_days}
                </Text>
                <Progress
                  percent={b.total_days > 0 ? Math.round((b.used_days / b.total_days) * 100) : 0}
                  strokeColor={b.leave_type_color}
                  showInfo={false}
                  size="small"
                  style={{ marginTop: 8 }}
                />
              </Card>
            </Col>
          ))
        )}
      </Row>

      <Table
        dataSource={requests}
        columns={columns}
        rowKey="id"
        loading={reqLoading}
        size="middle"
        pagination={{ pageSize: 10, showSizeChanger: false }}
        locale={{
          emptyText: <Empty description="No leave requests yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />,
        }}
      />

      <CreateLeaveTypeModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => {
          setCreateOpen(false);
          qc.invalidateQueries({ queryKey: ["my-leave-balances"] });
          qc.invalidateQueries({ queryKey: ["my-leave-requests-list"] });
        }}
      />

      <ApplyLeaveModal
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        onSuccess={() => {
          setApplyOpen(false);
          qc.invalidateQueries({ queryKey: ["my-leave-requests-list"] });
          qc.invalidateQueries({ queryKey: ["my-leave-balances"] });
        }}
        balances={balances}
      />
    </div>
  );
}
