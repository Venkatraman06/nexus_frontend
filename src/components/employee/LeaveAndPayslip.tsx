import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button, DatePicker, Divider, Form, Input, Modal, Progress, Select, Typography, message,
  Upload, Alert,
} from "antd";
import {
  DownloadOutlined, EyeInvisibleOutlined, EyeOutlined, FilePdfOutlined, PlusOutlined,
  WalletOutlined, MedicineBoxOutlined, UploadOutlined, WarningOutlined,
} from "@ant-design/icons";
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

interface ModalLeaveBalance {
  leave_type_id: string;
  leave_type_name: string;
  leave_type_code: string;
  leave_type_color: string;
  total_days: number;
  used_days: number;
  remaining_days: number;
}

export function ApplyLeaveModal({
  open,
  onClose,
  onSuccess,
  balances: passedBalances,
  prefillLeaveTypeId,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  balances?: ModalLeaveBalance[];
  prefillLeaveTypeId?: string | null;
}) {
  const [blockModal, setBlockModal] = useState<string | null>(null);
  const [regularForm]   = Form.useForm();
  const [emergencyForm] = Form.useForm();
  const [fileList,      setFileList]      = useState<any[]>([]);
  const [mode, setMode] = useState<"regular" | "emergency">("regular");

  const queryClient = useQueryClient();
  const [newTypeName, setNewTypeName] = useState("");

  const { data: leaveTypes = [] } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ["leave-types"],
    queryFn: () => get("/leave/types/"),
    enabled: open,
  });

  const { data: queriedBalances = [] } = useQuery<ModalLeaveBalance[]>({
    queryKey: ["my-leave-balances"],
    queryFn: () => get("/leave/balances/"),
    enabled: open && !passedBalances,
  });

  const balances = passedBalances ?? queriedBalances;

  const selectedType    = Form.useWatch("leave_type", regularForm);
  const selectedBalance = balances.find((b) => b.leave_type_id === selectedType);

  const typeOptions = leaveTypes.map((t) => ({ value: t.id, label: t.name }));

  const addTypeMutation = useMutation({
    mutationFn: (name: string) => {
      const trimmed = name.trim();
      const words = trimmed.split(/\s+/);
      const code = words.length > 1
        ? words.map(w => w[0]).join("").toUpperCase().slice(0, 5)
        : trimmed.slice(0, 3).toUpperCase();
      const colors = ["#1677ff", "#2f54eb", "#722ed1", "#eb2f96", "#fa8c16", "#faad14", "#52c41a", "#13c2c2", "#fa541c"];
      const color = colors[Math.floor(Math.random() * colors.length)];
      return post("/master/leave/my-types/", {
        name: trimmed,
        code,
        is_paid: true,
        color,
        max_days: 0,
      });
    },
    onSuccess: (newType: any) => {
      message.success("New leave type added and assigned");
      setNewTypeName("");
      queryClient.invalidateQueries({ queryKey: ["leave-types"] });
      queryClient.invalidateQueries({ queryKey: ["my-leave-balances"] });
      regularForm.setFieldValue("leave_type", newType.id);
    },
    onError: () => message.error("Failed to add leave type"),
  });

  const addLeaveType = () => {
    if (!newTypeName.trim()) return;
    addTypeMutation.mutate(newTypeName);
  };

  useEffect(() => {
    if (open) {
      if (prefillLeaveTypeId === "__EMERGENCY__") {
        setMode("emergency");
      } else {
        setMode("regular");
        if (prefillLeaveTypeId) {
          regularForm.setFieldValue("leave_type", prefillLeaveTypeId);
        }
      }
    }
    if (!open) {
      regularForm.resetFields();
      emergencyForm.resetFields();
      setFileList([]);
      setMode("regular");
    }
  }, [open, prefillLeaveTypeId]);

  const regularMutation = useMutation({
    mutationFn: (values: any) => post("/leave/requests/", {
      leave_type:   values.leave_type,
      start_date:   values.dates[0].format("YYYY-MM-DD"),
      end_date:     values.dates[1].format("YYYY-MM-DD"),
      reason:       values.reason || "",
      is_emergency: false,
    }),
    onSuccess: () => {
      message.success("Leave request submitted — your Reporting Manager will review it");
      regularForm.resetFields();
      onSuccess();
    },
    onError: (e: any) => {
      const data = e?.response?.data;
      let detail = "Failed to submit leave request";
      if (typeof data === "string") {
        detail = data.includes("<!DOCTYPE") || data.includes("<html") ? "Server error occurred while processing your request." : data;
      } else if (data) {
        detail =
          data?.detail ??
          data?.errors?.non_field_errors?.[0] ??
          data?.non_field_errors?.[0] ??
          Object.entries(data?.errors ?? data ?? {})
            .map(([k, v]: any) => {
              if (Array.isArray(v)) return `${k}: ${v[0]}`;
              if (typeof v === "object" && v !== null) return `${k}: ${JSON.stringify(v)}`;
              return `${k}: ${v}`;
            })
            .join(", ");
      }
      if (
        detail.includes("contains no working") ||
        detail.includes("no working days") ||
        detail.includes("weekend") ||
        detail.includes("holiday") ||
        detail.includes("Saturday") ||
        detail.includes("Sunday")
      ) {
        setBlockModal(detail);
      } else {
        message.error(detail, 6);
      }
    },
  });

  const emergencyMutation = useMutation({
    mutationFn: async (values: any) => {
      if (fileList.length > 0 && fileList[0].originFileObj) {
        const fd = new FormData();
        fd.append("leave_type",          values.leave_type);
        fd.append("start_date",          values.dates[0].format("YYYY-MM-DD"));
        fd.append("end_date",            values.dates[1].format("YYYY-MM-DD"));
        fd.append("reason",              values.reason || "");
        fd.append("is_emergency",        "true");
        fd.append("medical_certificate", fileList[0].originFileObj);
        return post("/leave/requests/", fd, { headers: { "Content-Type": "multipart/form-data" } });
      }
      return post("/leave/requests/", {
        leave_type:   values.leave_type,
        start_date:   values.dates[0].format("YYYY-MM-DD"),
        end_date:     values.dates[1].format("YYYY-MM-DD"),
        reason:       values.reason || "",
        is_emergency: true,
      });
    },
    onSuccess: () => {
      message.success("Emergency leave requested — your Reporting Manager will review it");
      emergencyForm.resetFields();
      setFileList([]);
      onSuccess();
    },
    onError: (e: any) => {
      const data   = e?.response?.data;
      let detail = "Failed to submit leave request";
      if (typeof data === "string") {
        detail = data.includes("<!DOCTYPE") || data.includes("<html") ? "Server error occurred while processing your request." : data;
      } else if (data) {
        detail =
          data?.detail ??
          data?.errors?.non_field_errors?.[0] ??
          data?.non_field_errors?.[0] ??
          Object.entries(data?.errors ?? data ?? {})
            .map(([k, v]: any) => {
              if (Array.isArray(v)) return `${k}: ${v[0]}`;
              if (typeof v === "object" && v !== null) return `${k}: ${JSON.stringify(v)}`;
              return `${k}: ${v}`;
            })
            .join(", ");
      }
      if (
        detail.includes("no working days") ||
        detail.includes("weekend") ||
        detail.includes("holiday") ||
        detail.includes("Saturday") ||
        detail.includes("Sunday")
      ) {
        setBlockModal(detail);
      } else {
        message.error(detail, 6);
      }
    },
  });

  const handleClose = () => {
    regularForm.resetFields();
    emergencyForm.resetFields();
    setFileList([]);
    setMode("regular");
    onClose();
  };

  return (
    <>
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <WalletOutlined style={{ color: "#7c3aed" }} />
            <span>Apply for Leave</span>
          </div>
        }
        open={open}
        onCancel={handleClose}
        footer={null}
        width={500}
        destroyOnClose
      >
        {/* ── Mode tabs ── */}
        <div style={{
          display: "flex", gap: 0, marginBottom: 20, marginTop: 4,
          borderRadius: 10, overflow: "hidden", border: "1px solid var(--bms-border)",
        }}>
          <button
            onClick={() => setMode("regular")}
            style={{
              flex: 1, padding: "9px 0", border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 600, transition: "all 0.15s",
              background: mode === "regular" ? "#7c3aed" : "var(--bms-surface-2)",
              color:      mode === "regular" ? "#fff"    : "var(--bms-text-2)",
              borderRight: "1px solid var(--bms-border)",
            }}
          >
            <WalletOutlined style={{ marginRight: 6 }} />
            Regular Leave
          </button>
          <button
            onClick={() => setMode("emergency")}
            style={{
              flex: 1, padding: "9px 0", border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 600, transition: "all 0.15s",
              background: mode === "emergency" ? "#dc2626" : "var(--bms-surface-2)",
              color:      mode === "emergency" ? "#fff"    : "#dc2626",
            }}
          >
            <MedicineBoxOutlined style={{ marginRight: 6 }} />
            Emergency Leave
          </button>
        </div>

        {/* ── Regular leave form ── */}
        <div style={{ display: mode === "regular" ? "block" : "none" }}>
          <Form form={regularForm} layout="vertical" onFinish={(v) => regularMutation.mutate(v)}>
            <Form.Item name="leave_type" label="Leave Type"
              rules={[{ required: true, message: "Please select a leave type" }]}>
              <Select
                placeholder="Select leave type"
                options={typeOptions}
                dropdownRender={(menu) => (
                  <>
                    {menu}
                    <Divider style={{ margin: "8px 0" }} />
                    <div style={{ display: "flex", flexWrap: "nowrap", padding: "0 8px 4px", gap: 8, alignItems: "center" }}>
                      <Input
                        placeholder="New leave type name"
                        value={newTypeName}
                        onChange={(e) => setNewTypeName(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        size="small"
                        style={{ flex: 1 }}
                      />
                      <Button
                        type="text"
                        icon={<PlusOutlined />}
                        onClick={addLeaveType}
                        loading={addTypeMutation.isPending}
                        style={{ display: "flex", alignItems: "center" }}
                      >
                        Add
                      </Button>
                    </div>
                  </>
                )}
                notFoundContent={
                  <div style={{ padding: "12px 0", textAlign: "center", color: "#9ca3af", fontSize: 12 }}>
                    No leave types assigned. Contact HR.
                  </div>
                }
              />
            </Form.Item>

            {selectedBalance && (
              <div style={{
                marginTop: -8, marginBottom: 14, padding: "8px 12px", borderRadius: 8,
                background: selectedBalance.leave_type_color + "0f",
                border: `1px solid ${selectedBalance.leave_type_color}30`,
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: selectedBalance.leave_type_color }} />
                  <Text style={{ fontSize: 12 }}>Balance — {selectedBalance.leave_type_name}</Text>
                </div>
                <div style={{ display: "flex", gap: 14 }}>
                  <Text style={{ fontSize: 12, color: "var(--bms-text-3)" }}>
                    Used <b>{selectedBalance.used_days}</b> / <b>{selectedBalance.total_days}</b>
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: 700,
                    color: selectedBalance.remaining_days > 0 ? "#059669" : "#ef4444" }}>
                    {selectedBalance.remaining_days}d left
                  </Text>
                </div>
              </div>
            )}

            <Form.Item name="dates" label="Leave Dates"
              rules={[{ required: true, message: "Please select dates" }]}>
              <DatePicker.RangePicker style={{ width: "100%" }} format="DD MMM YYYY"
                disabledDate={(d) => !d || d < dayjs().startOf("day")} />
            </Form.Item>

            <Form.Item name="reason" label="Reason">
              <Input.TextArea rows={3} placeholder="Optional — provide a reason for your leave" />
            </Form.Item>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Button onClick={handleClose}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={regularMutation.isPending}
                icon={<WalletOutlined />}
                style={{ background: "#7c3aed", borderColor: "#7c3aed" }}>
                Submit Request
              </Button>
            </div>
          </Form>
        </div>

        {/* ── Emergency leave form ── */}
        <div style={{ display: mode === "emergency" ? "block" : "none" }}>
          <Alert
            type="error" showIcon icon={<MedicineBoxOutlined />}
            style={{ marginBottom: 16, borderRadius: 8 }}
            message={<Text style={{ fontSize: 13, fontWeight: 600, color: "#991b1b" }}>Emergency Leave</Text>}
            description={
              <Text style={{ fontSize: 12, color: "#7f1d1d" }}>
                For unforeseen medical or personal crises. Your Reporting Manager will review your request immediately.
                Proof speeds up approval.
              </Text>
            }
          />
          <Form form={emergencyForm} layout="vertical" onFinish={(v) => emergencyMutation.mutate(v)}>
            <Form.Item name="leave_type" label="Leave Type"
              rules={[{ required: true, message: "Please select a leave type" }]}>
              <Select
                placeholder="Select leave type"
                options={typeOptions}
                notFoundContent={<div style={{ padding: "12px 0", textAlign: "center", color: "#9ca3af", fontSize: 12 }}>No leave types assigned. Contact HR.</div>}
              />
            </Form.Item>

            <Form.Item name="dates" label="Leave Dates"
              rules={[{ required: true, message: "Please select dates" }]}>
              <DatePicker.RangePicker style={{ width: "100%" }} format="DD MMM YYYY"
                disabledDate={(d) => !d || d < dayjs().startOf("day")} />
            </Form.Item>

            <Form.Item name="reason" label="Reason"
              rules={[{ required: true, message: "Please describe the emergency" }]}>
              <Input.TextArea rows={3}
                placeholder="Describe the emergency — e.g. hospitalisation, accident, family crisis" />
            </Form.Item>

            <Form.Item
              name="medical_certificate"
              label={
                <span>
                  Proof
                  <Text style={{ fontSize: 11, color: "#9ca3af", marginLeft: 6, fontWeight: 400 }}>
                    optional but recommended
                  </Text>
                </span>
              }
            >
              <Upload
                fileList={fileList}
                beforeUpload={() => false}
                accept=".pdf,.jpg,.jpeg,.png"
                maxCount={1}
                onChange={({ fileList: fl }) => setFileList(fl)}
                onRemove={() => setFileList([])}
              >
                <Button icon={<UploadOutlined />} style={{ borderRadius: 8 }}>Upload Certificate</Button>
              </Upload>
              {fileList.length === 0 && (
                <Text style={{ fontSize: 11, color: "#9ca3af", display: "block", marginTop: 4 }}>
                  PDF, JPG, or PNG · max 5 MB
                </Text>
              )}
            </Form.Item>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Button onClick={handleClose}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={emergencyMutation.isPending}
                icon={<MedicineBoxOutlined />}
                style={{ background: "#dc2626", borderColor: "#dc2626" }}>
                Request Emergency Leave
              </Button>
            </div>
          </Form>
        </div>
      </Modal>

      {/* ── Weekend / Holiday block popup ── */}
      <Modal
        open={!!blockModal}
        onCancel={() => setBlockModal(null)}
        onOk={() => setBlockModal(null)}
        okText="Got it"
        cancelButtonProps={{ style: { display: "none" } }}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#d97706" }}>
            <WarningOutlined />
            <span>Invalid Dates Selected</span>
          </div>
        }
      >
        <div style={{ padding: "8px 0" }}>
          <Text>{blockModal}</Text>
        </div>
      </Modal>
    </>
  );
}

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  DRAFT: { color: "#d97706", bg: "#fffbeb" },
  FINALIZED: { color: "#1677ff", bg: "#eff6ff" },
  PAID: { color: "#059669", bg: "#f0fdf4" },
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
