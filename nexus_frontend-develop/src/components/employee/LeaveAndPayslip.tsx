import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Button, DatePicker, Divider, Form, Input, Modal, Progress, Select, Typography, message,
} from "antd";
import { DownloadOutlined, EyeInvisibleOutlined, EyeOutlined, FilePdfOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { get, post } from "@/services/api";
import type { EmpDashboard, LeaveBalance, LeaveRequest } from "./types";
import { LEAVE_STATUS_COLOR } from "./types";

const { Text } = Typography;

export function LeaveSection({
  balances,
  requests,
  onApply,
}: {
  balances: LeaveBalance[];
  requests: LeaveRequest[];
  onApply: () => void;
}) {
  return (
    <div className="emp-leave">
      <div className="emp-leave__head">
        <Text strong>Leave balance</Text>
        <Button size="small" type="primary" icon={<PlusOutlined />} onClick={onApply}>
          Apply
        </Button>
      </div>
      {balances.length === 0 ? (
        <Text type="secondary" style={{ fontSize: 12 }}>No leave balance configured. Contact HR.</Text>
      ) : (
        <div className="emp-leave__balances">
          {balances.map((b) => (
            <div key={b.code} className="emp-leave__balance-row">
              <span className="emp-leave__dot" style={{ background: b.color }} />
              <Text style={{ fontSize: 12, flex: 1 }}>{b.leave_type}</Text>
              <Text type="secondary" style={{ fontSize: 11 }}>{b.used}/{b.total}</Text>
              <div style={{ width: 48 }}>
                <Progress
                  percent={b.total > 0 ? Math.round((b.used / b.total) * 100) : 0}
                  strokeColor={b.color}
                  showInfo={false}
                  size="small"
                />
              </div>
              <Text strong style={{ fontSize: 12, color: b.color, minWidth: 28, textAlign: "right" }}>
                {b.remaining}d
              </Text>
            </div>
          ))}
        </div>
      )}
      <Divider style={{ margin: "12px 0" }} />
      <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 8 }}>Recent requests</Text>
      {requests.length === 0 ? (
        <Text type="secondary" style={{ fontSize: 12 }}>No leave requests</Text>
      ) : (
        <div className="emp-leave__requests">
          {requests.slice(0, 4).map((r) => (
            <div key={r.id} className="emp-leave__request">
              <div>
                <Text style={{ fontSize: 12, fontWeight: 500 }}>{r.leave_type}</Text>
                <div style={{ fontSize: 11, color: "var(--bms-text-3)" }}>
                  {r.start_date} → {r.end_date} ({r.days_count}d)
                </div>
              </div>
              <span
                className="emp-leave__status"
                style={{
                  color: LEAVE_STATUS_COLOR[r.status],
                  background: `${LEAVE_STATUS_COLOR[r.status]}18`,
                  border: `1px solid ${LEAVE_STATUS_COLOR[r.status]}33`,
                }}
              >
                {r.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ApplyLeaveModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form] = Form.useForm();
  const { data: leaveTypes } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ["leave-types"],
    queryFn: () => get("/leave/types/"),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: (data: Record<string, string>) => post("/leave/requests/", data),
    onSuccess: () => {
      message.success("Leave request submitted");
      form.resetFields();
      onSuccess();
    },
    onError: (e: any) => {
      const data = e?.response?.data;
      const detail =
        data?.detail ??
        data?.errors?.non_field_errors?.[0] ??
        data?.non_field_errors?.[0] ??
        Object.entries(data?.errors ?? data ?? {})
          .map(([k, v]: any) => `${k}: ${Array.isArray(v) ? v[0] : v}`)
          .join(", ") ??
        "Failed to submit leave request";
      message.error(detail, 6);
    },
  });

  return (
    <Modal title="Apply for Leave" open={open} onCancel={onClose} footer={null} width={480}>
      <Form
        form={form}
        layout="vertical"
        onFinish={(v) => {
          mutation.mutate({
            leave_type: v.leave_type,
            start_date: v.dates[0].format("YYYY-MM-DD"),
            end_date: v.dates[1].format("YYYY-MM-DD"),
            reason: v.reason || "",
          });
        }}
      >
        <Form.Item name="leave_type" label="Leave Type" rules={[{ required: true }]}>
          <Select placeholder="Select type">
            {(leaveTypes ?? []).map((t) => (
              <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="dates" label="Date Range" rules={[{ required: true }]}>
          <DatePicker.RangePicker
            style={{ width: "100%" }}
            disabledDate={(d) => d && d < dayjs().startOf("day")}
          />
        </Form.Item>
        <Form.Item name="reason" label="Reason">
          <Input.TextArea rows={3} placeholder="Optional reason" />
        </Form.Item>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={mutation.isPending}>
            Submit Request
          </Button>
        </div>
      </Form>
    </Modal>
  );
}

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  DRAFT: { color: "#d97706", bg: "#fffbeb" },
  FINALIZED: { color: "#1677ff", bg: "#eff6ff" },
  PAID: { color: "#16a34a", bg: "#f0fdf4" },
};

export function PayslipWidget({
  records,
  fy,
}: {
  records: EmpDashboard["payslips"];
  fy: string;
}) {
  const [amountVisible, setAmountVisible] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  const downloadPayslip = async (id: string, monthName: string, year: number) => {
    setDownloading(id);
    try {
      const res = await fetch(`/bms/api/v1/payroll/my/${id}/payslip-pdf/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("kc_access_token") ?? ""}` },
      });
      if (!res.ok) {
        message.error("Failed to generate payslip");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Payslip-${monthName}-${year}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      message.error("Download failed");
    } finally {
      setDownloading(null);
    }
  };

  if (records.length === 0) {
    return <Text type="secondary">No payslips available for {fy}</Text>;
  }

  return (
    <div className="emp-payslips">
      <div className="emp-payslips__head">
        <Text type="secondary">{fy}</Text>
        <Button
          type="text"
          size="small"
          icon={amountVisible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
          onClick={() => setAmountVisible((v) => !v)}
        />
      </div>
      {records.map((r) => {
        const ss = STATUS_STYLE[r.status] ?? STATUS_STYLE.DRAFT;
        return (
          <div key={r.id} className="emp-payslips__row">
            <div className="emp-payslips__icon" style={{ background: ss.bg }}>
              <FilePdfOutlined style={{ color: ss.color }} />
            </div>
            <div style={{ flex: 1 }}>
              <Text strong style={{ fontSize: 13 }}>{r.month_name} {r.year}</Text>
              <div style={{ fontSize: 12, color: "var(--bms-text-2)" }}>
                Net:{" "}
                {amountVisible ? (
                  <span style={{ fontWeight: 700, color: "var(--bms-primary)" }}>
                    ₹{r.net_salary.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                ) : (
                  <span style={{ letterSpacing: 2 }}>••••••</span>
                )}
              </div>
            </div>
            <span className="emp-payslips__status" style={{ color: ss.color, background: ss.bg }}>
              {r.status}
            </span>
            <Button
              size="small"
              icon={<DownloadOutlined />}
              loading={downloading === r.id}
              onClick={() => downloadPayslip(r.id, r.month_name, r.year)}
            >
              PDF
            </Button>
          </div>
        );
      })}
    </div>
  );
}
