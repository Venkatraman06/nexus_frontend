// import React, { useState } from "react";
// import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// import {
//   Table, Typography, Tag, Space, Button, Modal, Form,
//   Input, Select, Spin, Empty, message, Tooltip, Popconfirm,
// } from "antd";
// import {
//   CheckOutlined, CloseOutlined, DeleteOutlined,
//   FilterOutlined, ReloadOutlined,
// } from "@ant-design/icons";
// import { get, post, del } from "@/services/api";
// import PermGuard from "@/components/common/PermGuard";
// import { PERMS } from "@/constants/permissions";

// const { Title, Text } = Typography;

// // ── Types ──────────────────────────────────────────────────────────────────────
// interface LeaveRequestRow {
//   id: string;
//   employee_id: string;
//   employee: string;
//   leave_type: string;
//   color: string;
//   start_date: string;
//   end_date: string;
//   days_count: number;
//   reason: string;
//   status: string;
//   reviewer: string | null;
//   reviewer_remarks: string;
//   created_at: string;
//   is_emergency?: boolean;
//   medical_certificate?: string | null;
//   emergency_note?: string;
// }

// interface Summary {
//   pending: number;
//   approved: number;
//   rejected: number;
//   days_approved: number;
// }

// interface AdminLeaveResponse {
//   summary: Summary;
//   results: LeaveRequestRow[];
// }

// // ── Colour maps ───────────────────────────────────────────────────────────────
// const STATUS_STYLES: Record<string, { color: string; bg: string; label: string }> = {
//   PENDING:   { color: "#d97706", bg: "#fffbeb", label: "pending" },
//   APPROVED:  { color: "#059669", bg: "#f0fdf4", label: "approved" },
//   REJECTED:  { color: "#dc2626", bg: "#fff1f2", label: "rejected" },
//   CANCELLED: { color: "#6b7280", bg: "#f9fafb", label: "cancelled" },
// };

// // ── Summary card ──────────────────────────────────────────────────────────────
// function SummaryCard({ label, value, sub, accent }: {
//   label: string; value: number | string; sub?: string; accent?: string;
// }) {
//   return (
//     <div style={{
//       flex: 1,
//       // ✅ FIX: was background: "#fff", border: "1px solid #eaecf0"
//       background: "var(--pmt-surface)",
//       borderRadius: 12,
//       border: "1px solid var(--pmt-border)",
//       padding: "18px 22px",
//       minWidth: 160,
//     }}>
//       {/* ✅ FIX: was color: "#6b7280" */}
//       <Text style={{ fontSize: 13, color: "var(--pmt-text-2)", display: "block", marginBottom: 4 }}>{label}</Text>
//       <div style={{ fontSize: 28, fontWeight: 700, color: accent ?? "var(--pmt-text)", lineHeight: 1.2 }}>{value}</div>
//       {/* ✅ FIX: was color: "#9ca3af" */}
//       {sub && <Text style={{ fontSize: 12, color: "var(--pmt-text-3)" }}>{sub}</Text>}
//     </div>
//   );
// }

// // ── Review modal ──────────────────────────────────────────────────────────────
// function ReviewModal({ open, record, onClose, onDone }: {
//   open: boolean;
//   record: LeaveRequestRow | null;
//   onClose: () => void;
//   onDone: () => void;
// }) {
//   const [form] = Form.useForm();

//   const mutation = useMutation({
//     mutationFn: ({ id, status, remarks }: { id: string; status: string; remarks: string }) =>
//       post(`/leave/requests/${id}/review/`, { status, remarks }),
//     onSuccess: () => {
//       message.success("Leave request updated");
//       form.resetFields();
//       onDone();
//     },
//     onError: () => message.error("Failed to update leave request"),
//   });

//   if (!record) return null;

//   return (
//     <Modal
//       title={
//         <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
//           <div style={{ width: 8, height: 8, borderRadius: "50%", background: record.color }} />
//           <span>Review Leave Request</span>
//         </div>
//       }
//       open={open}
//       onCancel={onClose}
//       footer={null}
//       width={500}
//     >
//       {/* Request details */}
//       <div style={{
//         // ✅ FIX: was background: "#f9fafb", border: "1px solid #f3f4f6"
//         background: "var(--pmt-surface-2)",
//         borderRadius: 10,
//         padding: "12px 16px",
//         marginBottom: 20,
//         border: "1px solid var(--pmt-border)",
//         display: "grid",
//         gridTemplateColumns: "1fr 1fr",
//         gap: "8px 16px",
//       }}>
//         {[
//           { label: "Employee",   value: record.employee },
//           { label: "Leave Type", value: record.leave_type },
//           { label: "From",       value: record.start_date },
//           { label: "To",         value: record.end_date },
//           { label: "Days",       value: `${record.days_count} day(s)` },
//           { label: "Applied On", value: record.created_at },
//         ].map(({ label, value }) => (
//           <div key={label}>
//             {/* ✅ FIX: was color: "#9ca3af" / "#111827" */}
//             <Text style={{ fontSize: 11, color: "var(--pmt-text-3)" }}>{label}</Text>
//             <div style={{ fontSize: 13, fontWeight: 500, color: "var(--pmt-text)" }}>{value}</div>
//           </div>
//         ))}
//         {record.reason && (
//           <div style={{ gridColumn: "1 / -1" }}>
//             <Text style={{ fontSize: 11, color: "var(--pmt-text-3)" }}>Reason</Text>
//             {/* ✅ FIX: was color: "#374151" */}
//             <div style={{ fontSize: 13, color: "var(--pmt-text-2)" }}>{record.reason}</div>
//           </div>
//         )}
//       </div>

//       <Form form={form} layout="vertical" onFinish={(v) =>
//         mutation.mutate({ id: record.id, status: v.status, remarks: v.remarks || "" })
//       }>
//         <Form.Item name="status" label="Decision" rules={[{ required: true, message: "Please select" }]}>
//           <Select placeholder="Select decision">
//             <Select.Option value="APPROVED">
//               <span style={{ color: "#059669", fontWeight: 600 }}>✓ Approve</span>
//             </Select.Option>
//             <Select.Option value="REJECTED">
//               <span style={{ color: "#dc2626", fontWeight: 600 }}>✗ Reject</span>
//             </Select.Option>
//           </Select>
//         </Form.Item>
//         <Form.Item name="remarks" label="Remarks (optional)">
//           <Input.TextArea rows={2} placeholder="Add a note for the employee…" />
//         </Form.Item>
//         <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
//           <Button onClick={onClose}>Cancel</Button>
//           <Button type="primary" htmlType="submit" loading={mutation.isPending}>
//             Submit
//           </Button>
//         </div>
//       </Form>
//     </Modal>
//   );
// }

// // ── Main page ─────────────────────────────────────────────────────────────────
// export default function LeaveRequestsPage() {
//   const queryClient = useQueryClient();
//   const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
//   const [reviewRecord, setReviewRecord] = useState<LeaveRequestRow | null>(null);

//   const { data, isLoading } = useQuery<AdminLeaveResponse>({
//     queryKey: ["leave-admin-requests", statusFilter],
//     queryFn: () =>
//       get<AdminLeaveResponse>("/leave/admin/requests/", statusFilter ? { status: statusFilter } : {}),
//     staleTime: 0,
//   });

//   const deleteMutation = useMutation({
//     mutationFn: (id: string) => del(`/leave/requests/${id}/`),
//     onSuccess: () => {
//       message.success("Request cancelled");
//       queryClient.invalidateQueries({ queryKey: ["leave-admin-requests"] });
//     },
//     onError: () => message.error("Failed to cancel"),
//   });

//   const summary = data?.summary ?? { pending: 0, approved: 0, rejected: 0, days_approved: 0 };
//   const rows    = data?.results ?? [];

//   const columns = [
//     {
//       title: "EMPLOYEE",
//       dataIndex: "employee",
//       key: "employee",
//       render: (v: string) => <Text strong style={{ fontSize: 13, color: "#1677ff" }}>{v}</Text>,
//     },
//     {
//   title: "",
//   key: "emergency",
//   width: 40,
//   render: (_: any, r: LeaveRequestRow) => (r as any).is_emergency
//     ? <Tag color="error" style={{ fontSize: 10, padding: "0 4px" }}>🚨</Tag>
//     : null,
// },
//     {
//       title: "LEAVE TYPE",
//       dataIndex: "leave_type",
//       key: "leave_type",
//       render: (v: string, r: LeaveRequestRow) => (
//         <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
//           <div style={{ width: 6, height: 6, borderRadius: "50%", background: r.color, flexShrink: 0 }} />
//           {/* ✅ FIX: was no color set, inherits correctly via var(--pmt-text) from antd */}
//           <Text style={{ fontSize: 13, color: "var(--pmt-text)" }}>{v}</Text>
//         </div>
//       ),
//     },
//     {
//       title: "FROM",
//       dataIndex: "start_date",
//       key: "start_date",
//       render: (v: string) => <Text style={{ fontSize: 13, color: "var(--pmt-text)" }}>{v}</Text>,
//     },
//     {
//       title: "TO",
//       dataIndex: "end_date",
//       key: "end_date",
//       render: (v: string) => <Text style={{ fontSize: 13, color: "var(--pmt-text)" }}>{v}</Text>,
//     },
//     {
//       title: "DAYS",
//       dataIndex: "days_count",
//       key: "days_count",
//       width: 70,
//       render: (v: number) => (
//         <Text strong style={{ fontSize: 14, color: "#1677ff" }}>{v}</Text>
//       ),
//     },
//     {
//       title: "REASON",
//       dataIndex: "reason",
//       key: "reason",
//       ellipsis: true,
//       // ✅ FIX: was color: "#6b7280"
//       render: (v: string) => <Text style={{ fontSize: 12, color: "var(--pmt-text-2)" }}>{v || "—"}</Text>,
//     },
//     {
//       title: "STATUS",
//       dataIndex: "status",
//       key: "status",
//       width: 110,
//       render: (v: string) => {
//         const s = STATUS_STYLES[v] ?? STATUS_STYLES.CANCELLED;
//         return (
//           <span style={{
//             fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 20,
//             color: s.color, background: s.bg, border: `1px solid ${s.color}33`,
//           }}>
//             {s.label}
//           </span>
//         );
//       },
//     },
//     {
//       title: "APPLIED",
//       dataIndex: "created_at",
//       key: "created_at",
//       // ✅ FIX: was color: "#6b7280"
//       render: (v: string) => <Text style={{ fontSize: 12, color: "var(--pmt-text-2)" }}>{v}</Text>,
//     },
//     {
//       title: "ACTIONS",
//       key: "actions",
//       width: 120,
//       render: (_: any, record: LeaveRequestRow) => (
//         <Space size={4}>
//           {record.status === "PENDING" && (
//             <PermGuard permission={PERMS.HRMS_LEAVE_APPROVE}>
//               <Button
//                 size="small"
//                 style={{
//                   fontSize: 12, borderRadius: 4,
//                   borderColor: "#1677ff", color: "#1677ff",
//                 }}
//                 onClick={() => setReviewRecord(record)}
//               >
//                 Review
//               </Button>
//             </PermGuard>
//           )}
//           <PermGuard permission={PERMS.HRMS_LEAVE_MANAGE}>
//             <Popconfirm
//               title="Cancel this leave request?"
//               onConfirm={() => deleteMutation.mutate(record.id)}
//             >
//               <Button size="small" style={{ fontSize: 12, borderRadius: 4 }}>
//                 Del
//               </Button>
//             </Popconfirm>
//           </PermGuard>
//         </Space>
//       ),
//     },
//   ];

//   return (
//     <div>
//       {/* Header */}
//       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
//         <div>
//           <Title level={4} style={{ margin: 0, color: "var(--pmt-text)" }}>Leave Requests</Title>
//           {/* ✅ FIX: was color: "#6b7280" */}
//           <Text style={{ color: "var(--pmt-text-2)", fontSize: 13 }}>Manage employee leave applications</Text>
//         </div>
//         <Space>
//           <Select
//             placeholder="Filter by status"
//             allowClear
//             style={{ width: 160 }}
//             value={statusFilter}
//             onChange={setStatusFilter}
//             suffixIcon={<FilterOutlined />}
//           >
//             <Select.Option value="PENDING">Pending</Select.Option>
//             <Select.Option value="APPROVED">Approved</Select.Option>
//             <Select.Option value="REJECTED">Rejected</Select.Option>
//             <Select.Option value="CANCELLED">Cancelled</Select.Option>
//           </Select>
//           <Button
//             icon={<ReloadOutlined />}
//             onClick={() => queryClient.invalidateQueries({ queryKey: ["leave-admin-requests"] })}
//           >
//             Refresh
//           </Button>
//         </Space>
//       </div>

//       {/* Summary cards */}
//       <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
//         <SummaryCard label="Pending"       value={summary.pending}       sub="Awaiting approval" accent="#d97706" />
//         <SummaryCard label="Approved"      value={summary.approved}      accent="#059669" />
//         <SummaryCard label="Rejected"      value={summary.rejected}      accent="#dc2626" />
//         <SummaryCard label="Days Approved" value={summary.days_approved} accent="#1677ff" />
//       </div>

//       {/* Table */}
//       <div style={{
//         // ✅ FIX: was background: "#fff", border: "1px solid #eaecf0"
//         background: "var(--pmt-surface)",
//         borderRadius: 12,
//         border: "1px solid var(--pmt-border)",
//         overflow: "hidden",
//       }}>
//         <Table
//           dataSource={rows}
//           columns={columns}
//           rowKey="id"
//           loading={isLoading}
//           size="middle"
//           pagination={{ pageSize: 20, showSizeChanger: false, showTotal: (t) => `${t} requests` }}
//           locale={{ emptyText: <Empty description="No leave requests" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 40 }} /> }}
//           style={{ fontSize: 13 }}
//           rowClassName={(r) => r.status === "PENDING" ? "pending-row" : ""}
//         />
//       </div>

//       {/* Review modal */}
//       <ReviewModal
//         open={!!reviewRecord}
//         record={reviewRecord}
//         onClose={() => setReviewRecord(null)}
//         onDone={() => {
//           setReviewRecord(null);
//           queryClient.invalidateQueries({ queryKey: ["leave-admin-requests"] });
//         }}
//       />
//     </div>
//   );
// }

import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table, Typography, Tag, Space, Button, Modal, Form,
  Input, Select, Spin, Empty, message, Tooltip, Popconfirm,
  InputNumber, Checkbox, Alert, Tabs, Badge,
} from "antd";
import {
  FilterOutlined, ReloadOutlined, MedicineBoxOutlined, UserAddOutlined,
  UserOutlined, TeamOutlined, AuditOutlined,
} from "@ant-design/icons";
import { get, post, del } from "@/services/api";
import PermGuard from "@/components/common/PermGuard";
import { PERMS } from "@/constants/permissions";
import { usePermission } from "@/hooks/usePermission";
import MyLeaveTab from "./leave/MyLeaveTab";
import TeamLeaveTab from "./leave/TeamLeaveTab";
import { useAuthStore } from "@/store/auth";

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
  start_day_part?: string;
  end_day_part?: string;
  days_count: number;
  reason: string;
  status: string;
  reviewer: string | null;
  reviewer_remarks: string;
  acknowledged_by?: string | null;
  ack_project?: string | null;
  can_ack?: boolean;
  can_approve?: boolean;
  created_at: string;
  is_emergency?: boolean;
  medical_certificate?: string | null;
  emergency_note?: string;
  certificate_verified?: boolean;
  exempt_from_balance?: boolean;
}

interface Summary {
  pending: number;
  pending_ack?: number;
  pending_manager?: number;
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
  PENDING_PROJECT_ACK: { color: "#2563eb", bg: "#eff6ff", label: "awaiting ack"    },
  PENDING_MANAGER:     { color: "#d97706", bg: "#fffbeb", label: "awaiting manager" },
  PENDING:             { color: "#d97706", bg: "#fffbeb", label: "pending"          },
  APPROVED:            { color: "#059669", bg: "#f0fdf4", label: "approved"         },
  REJECTED:            { color: "#dc2626", bg: "#fff1f2", label: "rejected"         },
  CANCELLED:           { color: "#6b7280", bg: "#f9fafb", label: "cancelled"        },
};

// ── Summary card ──────────────────────────────────────────────────────────────
function SummaryCard({ label, value, sub, accent }: {
  label: string; value: number | string; sub?: string; accent?: string;
}) {
  return (
    <div style={{
      flex: 1,
      background: "var(--pmt-surface)",
      borderRadius: 12,
      border: "1px solid var(--pmt-border)",
      padding: "18px 22px",
      minWidth: 160,
    }}>
      <Text style={{ fontSize: 13, color: "var(--pmt-text-2)", display: "block", marginBottom: 4 }}>{label}</Text>
      <div style={{ fontSize: 28, fontWeight: 700, color: accent ?? "var(--pmt-text)", lineHeight: 1.2 }}>{value}</div>
      {sub && <Text style={{ fontSize: 12, color: "var(--pmt-text-3)" }}>{sub}</Text>}
    </div>
  );
}

// ── Acknowledge modal (project team) ─────────────────────────────────────────
function AckModal({ open, record, onClose, onDone }: {
  open: boolean;
  record: LeaveRequestRow | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [form] = Form.useForm();
  const mutation = useMutation({
    mutationFn: ({ id, remarks }: { id: string; remarks: string }) =>
      post(`/leave/requests/${id}/ack/`, { remarks }),
    onSuccess: () => {
      message.success("Leave acknowledged — sent to reporting manager for final approval");
      form.resetFields();
      onDone();
    },
    onError: (e: any) => message.error(e?.response?.data?.detail ?? "Failed to acknowledge"),
  });

  if (!record) return null;

  return (
    <Modal title="Acknowledge Leave Request" open={open} onCancel={onClose} footer={null} width={480}>
      <Text style={{ display: "block", marginBottom: 12, fontSize: 13, color: "var(--pmt-text-2)" }}>
        Confirm you have noted {record.employee}&apos;s leave ({record.days_count} day(s)).
        The request will then go to their reporting manager for final approval.
      </Text>
      <Form form={form} layout="vertical" onFinish={(v) => mutation.mutate({ id: record.id, remarks: v.remarks || "" })}>
        <Form.Item name="remarks" label="Note (optional)">
          <Input.TextArea rows={2} placeholder="Optional note for the manager…" />
        </Form.Item>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={mutation.isPending}>Acknowledge</Button>
        </div>
      </Form>
    </Modal>
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
          <span>Final Approval — Leave Request</span>
          {record.is_emergency && (
            <Tag color="error" style={{ fontSize: 11 }}>🚨 Emergency</Tag>
          )}
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={520}
    >
      {/* Request details */}
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
          { label: "From",       value: record.start_date },
          { label: "To",         value: record.end_date },
          // FIX: days_count now correctly shows weekday-only count
          { label: "Days",       value: `${record.days_count} day(s)` },
          { label: "Applied On", value: record.created_at },
        ].map(({ label, value }) => (
          <div key={label}>
            <Text style={{ fontSize: 11, color: "var(--pmt-text-3)" }}>{label}</Text>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--pmt-text)" }}>{value}</div>
          </div>
        ))}
        {record.reason && (
          <div style={{ gridColumn: "1 / -1" }}>
            <Text style={{ fontSize: 11, color: "var(--pmt-text-3)" }}>Reason</Text>
            <div style={{ fontSize: 13, color: "var(--pmt-text-2)" }}>{record.reason}</div>
          </div>
        )}
        {record.emergency_note && (
          <div style={{ gridColumn: "1 / -1" }}>
            <Text style={{ fontSize: 11, color: "#dc2626" }}>Emergency Note</Text>
            <div style={{ fontSize: 13, color: "var(--pmt-text-2)" }}>{record.emergency_note}</div>
          </div>
        )}
      </div>

      {/* Emergency + certificate info banner */}
      {record.is_emergency && (
        <div style={{
          padding: "10px 14px", borderRadius: 8, marginBottom: 16,
          background: record.exempt_from_balance ? "#f0fdf4" : "#fffbeb",
          border: `1px solid ${record.exempt_from_balance ? "#86efac" : "#fcd34d"}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <MedicineBoxOutlined style={{ color: record.exempt_from_balance ? "#059669" : "#d97706" }} />
            <Text style={{ fontSize: 13, fontWeight: 600, color: record.exempt_from_balance ? "#059669" : "#d97706" }}>
              {record.exempt_from_balance
                ? "Medical certificate uploaded — balance will NOT be deducted on approval"
                : "No medical certificate — balance WILL be deducted on approval"}
            </Text>
          </div>
          {record.medical_certificate && (
            <a href={record.medical_certificate} target="_blank" rel="noreferrer"
              style={{ fontSize: 12, display: "block", marginTop: 4 }}>
              View Certificate ↗
            </a>
          )}
        </div>
      )}

      <Form form={form} layout="vertical" onFinish={(v) =>
        mutation.mutate({ id: record.id, status: v.status, remarks: v.remarks || "" })
      }>
        <Form.Item name="status" label="Decision" rules={[{ required: true, message: "Please select" }]}>
          <Select placeholder="Select decision">
            <Select.Option value="APPROVED">
              <span style={{ color: "#059669", fontWeight: 600 }}>✓ Approve</span>
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

// ── Assign Leave modal ──────────────────────────────────────────────────────────
interface LeaveTypeOption { id: string; name: string; code: string; max_days: number; is_paid: boolean; color: string; }
interface EmployeeOption  { id: string; full_name: string; employee_code: string; designation_name: string | null; }
interface AssignResultRow {
  employee_id: string; employee_name: string | null; status: string; message: string;
  carry_forward_days?: number; total_days?: number;
}

function AssignLeaveModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [form] = Form.useForm();
  const [results, setResults] = useState<{ fy_label: string; leave_type_name: string; summary: Record<string, number>; results: AssignResultRow[] } | null>(null);
  const { user } = useAuthStore();

  const { data: leaveTypes = [] } = useQuery<LeaveTypeOption[]>({
    queryKey: ["leave-types-active"],
    queryFn: () => get<LeaveTypeOption[]>("leave/types/"),
    enabled: open,
  });

  const { data: employees = [] } = useQuery<EmployeeOption[]>({
    queryKey: ["employees-simple-dropdown"],
    queryFn: () => get<EmployeeOption[]>("employees/simple-dropdown/"),
    enabled: open,
  });

  const { data: fyData } = useQuery<{ available_years: Array<{ year: number; label: string; working_days: number }> }>({
    queryKey: ["fy-years-metadata"],
    queryFn: () => get("/leave/admin/assign/"),
    enabled: open,
  });

  const assignMut = useMutation({
    mutationFn: (values: any) => post<any>("leave/admin/assign/", {
      leave_type_id:  values.leave_type_id,
      total_days:     values.total_days,
      carry_forward:  !!values.carry_forward,
      financial_year: values.financial_year,
      employee_ids:   values.assign_all
        ? employees.filter((e) => e.id !== user?.id).map((e) => e.id)
        : values.employee_ids,
    }),
    onSuccess: (data) => {
      setResults(data);
      const { assigned = 0, duplicate = 0, max_days_exceeded = 0, error = 0 } = data.summary ?? {};
      if (assigned > 0) message.success(`Assigned to ${assigned} employee(s)`);
      if (duplicate + max_days_exceeded + error > 0) message.warning(`${duplicate + max_days_exceeded + error} skipped — see details below`);
      onDone();
    },
    onError: (e: any) => message.error(e?.response?.data?.detail ?? "Failed to assign leave"),
  });

  const handleClose = () => {
    form.resetFields();
    setResults(null);
    onClose();
  };

  const assignAll = Form.useWatch("assign_all", form);
  const selectedYear = Form.useWatch("financial_year", form);
  const selectedYearInfo = fyData?.available_years?.find((y) => y.year === selectedYear);
  const defaultFY = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1;

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      title="Assign Leave Type to Employee(s)"
      okText={results ? "Assign More" : "Assign"}
      confirmLoading={assignMut.isPending}
      onOk={() => {
        if (results) {
          handleClose();
        } else {
          form.submit();
        }
      }}
      width={results ? 700 : 520}
    >
      {!results ? (
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) => { setResults(null); assignMut.mutate(v); }}
        >
          <Form.Item name="financial_year" label="Financial Year" initialValue={defaultFY} rules={[{ required: true, message: "Select financial year" }]}>
            <Select
              placeholder="Select financial year"
              options={fyData?.available_years?.map((y) => ({ value: y.year, label: y.label }))}
            />
          </Form.Item>
          {selectedYearInfo && (
            <div style={{ marginBottom: 16, padding: "8px 12px", background: "#f0f9ff", border: "1px solid #bae7ff", borderRadius: 6 }}>
              <Text style={{ fontSize: 13, color: "#0050b3" }}>
                Working days in {selectedYearInfo.label}: <strong>{selectedYearInfo.working_days} days</strong> (excluding weekends and holidays)
              </Text>
            </div>
          )}
          <Form.Item name="leave_type_id" label="Leave Type" rules={[{ required: true, message: "Select a leave type" }]}>
            <Select
              placeholder="Select leave type"
              options={leaveTypes.map((lt) => ({ value: lt.id, label: `${lt.name} (${lt.code})${lt.max_days ? ` — max ${lt.max_days}d/yr` : ""}` }))}
              onChange={(id) => {
                const lt = leaveTypes.find((l) => l.id === id);
                if (lt?.max_days) form.setFieldValue("total_days", lt.max_days);
              }}
            />
          </Form.Item>
          <Form.Item name="total_days" label="Total Days for this FY" rules={[{ required: true, message: "Enter total days" }]}>
            <InputNumber min={0} max={365} style={{ width: "100%" }} addonAfter="days" />
          </Form.Item>
          <Form.Item name="assign_all" valuePropName="checked" initialValue={false}>
            <Checkbox>Assign to all active employees</Checkbox>
          </Form.Item>
          {!assignAll && (
            <Form.Item name="employee_ids" label="Employee(s)" rules={[{ required: true, message: "Select at least one employee" }]}>
              <Select
                mode="multiple" placeholder="Search and select employee(s)" showSearch
                optionFilterProp="label"
                options={employees
                  .filter((e) => e.id !== user?.id)
                  .map((e) => ({ value: e.id, label: `${e.full_name} (${e.employee_code})${e.designation_name ? ` — ${e.designation_name}` : ""}` }))}
              />
            </Form.Item>
          )}
          <Form.Item name="carry_forward" valuePropName="checked" initialValue={false}>
            <Checkbox>Carry forward unused leave from last financial year (if the leave type's policy allows it)</Checkbox>
          </Form.Item>
          <Text style={{ fontSize: 12, color: "var(--pmt-text-3)" }}>
            Assignment applies to the current financial year. If an employee already has this leave type assigned for this FY, they'll be skipped.
          </Text>
        </Form>
      ) : (
        <div style={{ marginTop: 20 }}>
          {(() => {
            const { assigned = 0, duplicate = 0, max_days_exceeded: exceeded = 0, error = 0 } = results.summary;
            const hasIssues = duplicate > 0 || exceeded > 0 || error > 0;
            
            let friendlyMessage = '';
            const messageParts = [];
            
            if (assigned > 0) {
              messageParts.push(`✓ Successfully assigned to ${assigned} employee${assigned !== 1 ? 's' : ''}`);
            }
            
            if (duplicate > 0) {
              messageParts.push(`⚠ ${duplicate} employee${duplicate !== 1 ? 's' : ''} already ${duplicate !== 1 ? 'have' : 'has'} this leave type assigned`);
            }
            
            if (exceeded > 0) {
              messageParts.push(`⚠ ${exceeded} employee${exceeded !== 1 ? 's' : ''} exceeded the maximum allowed days`);
            }
            
            if (error > 0) {
              messageParts.push(`✕ ${error} error${error !== 1 ? 's' : ''} occurred during assignment`);
            }
            
            friendlyMessage = messageParts.join(' • ');
            if (!friendlyMessage) friendlyMessage = 'No assignments were made';

            return (
              <Alert
                type={hasIssues ? "warning" : assigned > 0 ? "success" : "info"}
                showIcon
                message={`${results.leave_type_name} for ${results.fy_label}`}
                description={friendlyMessage}
              />
            );
          })()}
          <div style={{ marginTop: 12, maxHeight: 260, overflowY: "auto", border: "1px solid var(--pmt-border)", borderRadius: 8 }}>
            {results.results.map((r) => (
              <div key={r.employee_id} style={{
                display: "flex", justifyContent: "space-between", gap: 12,
                padding: "8px 12px", borderBottom: "1px solid var(--pmt-border)", fontSize: 12,
              }}>
                <Text style={{ fontWeight: 600 }}>{r.employee_name ?? r.employee_id}</Text>
                <Tag color={r.status === "assigned" ? "success" : r.status === "duplicate" ? "default" : "error"} style={{ margin: 0 }}>
                  {r.message}
                </Tag>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
function HRLeaveAdminPanel() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get("status") ?? undefined;
  const [statusFilter, setStatusFilter] = useState<string | undefined>(initialStatus || undefined);
  const [reviewRecord, setReviewRecord] = useState<LeaveRequestRow | null>(null);
  const [ackRecord, setAckRecord] = useState<LeaveRequestRow | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);

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
      render: (v: string) => (
        <Text strong style={{ fontSize: 13, color: "#1677ff" }}>{v}</Text>
      ),
    },
    {
      title: "LEAVE TYPE",
      key: "leave_type",
      // FIX: horizontal layout — dot + name + emergency tag all in one row
      render: (_: any, r: LeaveRequestRow) => (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "nowrap" }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: r.color, flexShrink: 0,
          }} />
          <Text style={{ fontSize: 13, color: "var(--pmt-text)", whiteSpace: "nowrap" }}>
            {r.leave_type}
          </Text>
          {/* FIX: emergency badge now shows because is_emergency is returned from backend */}
          {r.is_emergency && (
            <Tooltip title={
              r.exempt_from_balance
                ? "Emergency leave with certificate — balance exempt"
                : "Emergency leave — balance will be deducted"
            }>
              <Tag
                color="error"
                style={{ fontSize: 10, margin: 0, padding: "0 4px", lineHeight: "16px", cursor: "help" }}
              >
                🚨 Emergency
              </Tag>
            </Tooltip>
          )}
          {r.is_emergency && r.medical_certificate && (
            <Tooltip title="Medical certificate uploaded">
              <MedicineBoxOutlined style={{ color: "#059669", fontSize: 13 }} />
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: "FROM",
      dataIndex: "start_date",
      key: "start_date",
      render: (v: string) => <Text style={{ fontSize: 13, color: "var(--pmt-text)" }}>{v}</Text>,
    },
    {
      title: "TO",
      dataIndex: "end_date",
      key: "end_date",
      render: (v: string) => <Text style={{ fontSize: 13, color: "var(--pmt-text)" }}>{v}</Text>,
    },
    {
      title: "DAYS",
      dataIndex: "days_count",
      key: "days_count",
      width: 70,
      // FIX: correct weekday-only count from backend
      render: (v: number, r: LeaveRequestRow) => (
        <Tooltip title={r.exempt_from_balance ? "Balance exempt (emergency + certificate)" : undefined}>
          <Text strong style={{ fontSize: 14, color: r.exempt_from_balance ? "#059669" : "#1677ff" }}>
            {v}{r.exempt_from_balance ? " *" : ""}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: "REASON",
      dataIndex: "reason",
      key: "reason",
      ellipsis: true,
      render: (v: string) => (
        <Text style={{ fontSize: 12, color: "var(--pmt-text-2)" }}>{v || "—"}</Text>
      ),
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
      render: (v: string) => (
        <Text style={{ fontSize: 12, color: "var(--pmt-text-2)" }}>{v}</Text>
      ),
    },
    {
      title: "ACTIONS",
      key: "actions",
      width: 120,
      render: (_: any, record: LeaveRequestRow) => (
        <Space size={4}>
          {record.can_ack && (
            <Button
              size="small"
              style={{ fontSize: 12, borderRadius: 4, borderColor: "#2563eb", color: "#2563eb" }}
              onClick={() => setAckRecord(record)}
            >
              Acknowledge
            </Button>
          )}
          {record.can_approve && (
            <PermGuard permission={PERMS.HRMS_LEAVE_APPROVE}>
              <Button
                size="small"
                style={{ fontSize: 12, borderRadius: 4, borderColor: "#1677ff", color: "#1677ff" }}
                onClick={() => setReviewRecord(record)}
              >
                Approve
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", rowGap: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0, color: "var(--pmt-text)" }}>All Employee Requests</Title>
          <Text style={{ color: "var(--pmt-text-2)", fontSize: 13 }}>HR view — all leave applications across the organisation</Text>
        </div>
        <Space wrap>
          <Select
            placeholder="Filter by status"
            allowClear
            style={{ width: 160 }}
            value={statusFilter}
            onChange={setStatusFilter}
            suffixIcon={<FilterOutlined />}
          >
            <Select.Option value="PENDING_PROJECT_ACK">Awaiting Project Ack</Select.Option>
            <Select.Option value="PENDING_MANAGER">Awaiting Manager</Select.Option>
            <Select.Option value="PENDING">Pending (legacy)</Select.Option>
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
          <PermGuard permission={PERMS.HRMS_LEAVE_MANAGE}>
            <Button type="primary" icon={<UserAddOutlined />} onClick={() => setAssignOpen(true)}>
              Assign Leave
            </Button>
          </PermGuard>
        </Space>
      </div>

      {/* Summary cards */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <SummaryCard label="Pending" value={summary.pending} sub={`${summary.pending_ack ?? 0} ack · ${summary.pending_manager ?? 0} manager`} accent="#d97706" />
        <SummaryCard label="Approved"      value={summary.approved}      accent="#059669" />
        <SummaryCard label="Rejected"      value={summary.rejected}      accent="#dc2626" />
        <SummaryCard label="Days Approved" value={summary.days_approved} accent="#1677ff" />
      </div>

      {/* Table */}
      <div style={{
        background: "var(--pmt-surface)",
        borderRadius: 12,
        border: "1px solid var(--pmt-border)",
        overflow: "hidden",
      }}>
        <Table
          dataSource={rows}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          size="middle"
          pagination={{ pageSize: 20, showSizeChanger: false, showTotal: (t) => `${t} requests` }}
          locale={{
            emptyText: (
              <Empty
                description="No leave requests"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ padding: 40 }}
              />
            ),
          }}
          style={{ fontSize: 13 }}
          rowClassName={(r) => ["PENDING", "PENDING_MANAGER", "PENDING_PROJECT_ACK"].includes(r.status) ? "pending-row" : ""}
        />
      </div>

      {/* * footnote for exempt leaves */}
      {rows.some((r) => r.exempt_from_balance) && (
        <div style={{ marginTop: 8, fontSize: 12, color: "var(--pmt-text-3)" }}>
          * Days marked with * are emergency leaves with medical certificate — balance is not deducted on approval.
        </div>
      )}

      <AckModal
        open={!!ackRecord}
        record={ackRecord}
        onClose={() => setAckRecord(null)}
        onDone={() => {
          setAckRecord(null);
          queryClient.invalidateQueries({ queryKey: ["leave-admin-requests"] });
        }}
      />

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

      {/* Assign leave modal */}
      <AssignLeaveModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        onDone={() => queryClient.invalidateQueries({ queryKey: ["leave-admin-requests"] })}
      />
    </div>
  );
}

export default function LeaveRequestsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const canHrView = usePermission(PERMS.HRMS_LEAVE_VIEW);

  const { data: teamMeta } = useQuery<{ has_team: boolean; pending_count: number }>({
    queryKey: ["leave-team-meta"],
    queryFn: () => get("/leave/team/meta/"),
  });

  const tabFromUrl = searchParams.get("tab");
  const resolvedTab = tabFromUrl === "team" ? "team" : tabFromUrl === "hr" ? "hr" : "mine";
  const [activeTab, setActiveTab] = useState(resolvedTab);

  useEffect(() => {
    if (resolvedTab === "team" && teamMeta && !teamMeta.has_team) {
      setActiveTab("mine");
      return;
    }
    if (resolvedTab === "hr" && !canHrView) {
      setActiveTab("mine");
      return;
    }
    setActiveTab(resolvedTab);
  }, [resolvedTab, teamMeta, canHrView]);

  const tabItems = useMemo(() => {
    const items = [
      {
        key: "mine",
        label: <span><UserOutlined /> My Leave</span>,
        children: <MyLeaveTab />,
      },
    ];
    if (teamMeta?.has_team) {
      items.push({
        key: "team",
        label: (
          <span>
            <TeamOutlined /> Team Leave
            {(teamMeta.pending_count ?? 0) > 0 && (
              <Badge count={teamMeta.pending_count} style={{ marginLeft: 6 }} size="small" />
            )}
          </span>
        ),
        children: <TeamLeaveTab />,
      });
    }
    if (canHrView) {
      items.push({
        key: "hr",
        label: <span><AuditOutlined /> All Requests</span>,
        children: <HRLeaveAdminPanel />,
      });
    }
    return items;
  }, [teamMeta, canHrView]);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0, color: "var(--pmt-text)" }}>Leave Management</Title>
        <Text style={{ color: "var(--pmt-text-2)", fontSize: 13 }}>
          Apply and track your leave, review your team&apos;s requests, and manage approvals by reporting line.
        </Text>
      </div>
      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key);
          setSearchParams(key === "mine" ? {} : { tab: key });
        }}
        items={tabItems}
        type="card"
      />
    </div>
  );
}