// import { useState, useEffect, useMemo } from "react";
// import {
//   Typography, Tabs, Space, Table, Tag, Button, Card, Modal,
//   Form, Input, Select, DatePicker, InputNumber, Divider, Tooltip,
//   Avatar, Badge, Popconfirm, message, Row, Col, Switch, Empty,
//   Spin, Checkbox, Progress, Alert,
// } from "antd";
// import {
//   LogoutOutlined, EyeOutlined, CheckOutlined, CloseOutlined,
//   PlusOutlined, EditOutlined, SaveOutlined, UserOutlined,
//   DeleteOutlined, ArrowRightOutlined, MailOutlined,
//   FileTextOutlined, SendOutlined, ArrowLeftOutlined, CheckCircleOutlined,
//   ClockCircleOutlined, SyncOutlined, FileDoneOutlined,
// } from "@ant-design/icons";
// import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// import dayjs from "dayjs";
// import { offboardingApi, type OffboardingRecord } from "@/services/offboarding";
// import { get, post, patch, put } from "@/services/api";
// import { useAuthStore } from "@/store/auth";
// import { apiErrorMsg } from "@/utils/apiError";
// import { employeeApi } from "@/services/employees";
// import { PERMS } from "@/constants/permissions";

// const { Title, Text } = Typography;
// const { Option } = Select;

// // ─── Zoom-on-hover helper style ────────────────────────────────────────────
// const zoomHoverProps = {
//   onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
//     e.currentTarget.style.transform = "scale(1.06)";
//     e.currentTarget.style.zIndex = "5";
//     e.currentTarget.style.position = "relative";
//     e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.18)";
//   },
//   onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
//     e.currentTarget.style.transform = "scale(1)";
//     e.currentTarget.style.boxShadow = "";
//   },
// };

// const zoomBaseStyle: React.CSSProperties = {
//   transition: "transform 0.2s ease, box-shadow 0.2s ease",
// };

// // ─── Status helpers ────────────────────────────────────────────────────────
// const STATUS_COLOR: Record<string, string> = {
//   INITIATED: "blue",
//   PREFERENCE_PENDING: "orange",
//   CLEARANCE_PENDING: "purple",
//   INTERVIEW_PENDING: "cyan",
//   DOCUMENTS_PENDING: "gold",
//   COMPLETED: "green",
//   CANCELLED: "red",
// };

// // ─── Employee Selector Banner ──────────────────────────────────────────────
// function EmployeeBanner({
//   record,
//   onClear,
// }: {
//   record: OffboardingRecord;
//   onClear: () => void;
// }) {
//   return (
//     <div
//       style={{
//         display: "flex",
//         alignItems: "center",
//         gap: 14,
//         padding: "12px 18px",
//         background: "linear-gradient(90deg,#1a2845 0%,#0f2042 100%)",
//         borderRadius: 10,
//         marginBottom: 18,
//         border: "1px solid rgba(99,102,241,0.3)",
//       }}
//     >
//       <Avatar
//         size={44}
//         icon={<UserOutlined />}
//         style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", flexShrink: 0 }}
//       />
//       <div style={{ flex: 1, minWidth: 0 }}>
//         <Text strong style={{ fontSize: 14, color: "#fff", display: "block" }}>
//           {record.employee_name}
//         </Text>
//         <Space size={6} wrap>
//           <Tag color={STATUS_COLOR[record.status] ?? "default"} style={{ fontSize: 11 }}>
//             {record.status_display}
//           </Tag>
//           {record.resignation_date && (
//             <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
//               Resigned: {dayjs(record.resignation_date).format("DD MMM YYYY")}
//             </Text>
//           )}
//           {(record.last_working_day || record.resignation_date) && (
//             <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
//               LWD: {record.last_working_day
//                 ? dayjs(record.last_working_day).format("DD MMM YYYY")
//                 : `${dayjs(record.resignation_date).add(90, "day").format("DD MMM YYYY")} (est.)`}
//             </Text>
//           )}
//         </Space>
//       </div>
//       <Button
//         size="small"
//         icon={<ArrowLeftOutlined />}
//         onClick={onClear}
//         style={{
//           background: "rgba(255,255,255,0.08)",
//           border: "1px solid rgba(255,255,255,0.15)",
//           color: "#fff",
//           borderRadius: 6,
//         }}
//       >
//         Change Employee
//       </Button>
//     </div>
//   );
// }

// // ─── Stage Status Banner (HR: shown when Manage is clicked) ───────────────
// function StageStatusBanner({ record }: { record: OffboardingRecord }) {
//   const STATUS_ORDER = ["INITIATED", "PREFERENCE_PENDING", "CLEARANCE_PENDING", "INTERVIEW_PENDING", "DOCUMENTS_PENDING", "COMPLETED", "CANCELLED"];
//   const currentIdx = STATUS_ORDER.indexOf(record.status);

//   const stageSteps = [
//     { label: "Clearance", targetStatus: "CLEARANCE_PENDING", order: 2 },
//     { label: "Exit Interview", targetStatus: "INTERVIEW_PENDING", order: 3 },
//     { label: "Documents", targetStatus: "DOCUMENTS_PENDING", order: 4 },
//     { label: "Completed", targetStatus: "COMPLETED", order: 5 },
//   ];

//   return (
//     <div style={{
//       padding: "14px 18px",
//       background: "linear-gradient(90deg, rgba(99,102,241,0.07), rgba(139,92,246,0.05))",
//       borderRadius: 10,
//       border: "1px solid rgba(99,102,241,0.18)",
//       marginBottom: 16,
//     }}>
//       <Text style={{ fontSize: 12, fontWeight: 600, color: "#6366f1", display: "block", marginBottom: 12 }}>
//         Current Offboarding Stage — {record.employee_name}
//       </Text>
//       <div style={{ display: "flex", alignItems: "center", gap: 0, overflowX: "auto" }}>
//         {stageSteps.map((step, i) => {
//           const stepIdx = STATUS_ORDER.indexOf(step.targetStatus);
//           const isDone = currentIdx > stepIdx;
//           const isActive = currentIdx === stepIdx;
//           return (
//             <div key={step.label} style={{ display: "flex", alignItems: "center" }}>
//               <div style={{
//                 display: "flex",
//                 flexDirection: "column",
//                 alignItems: "center",
//                 minWidth: 80,
//               }}>
//                 <div
//                   style={{
//                     width: 38,
//                     height: 38,
//                     borderRadius: "50%",
//                     background: isDone ? "#10b981" : isActive ? "#6366f1" : "#e2e8f0",
//                     display: "flex",
//                     alignItems: "center",
//                     justifyContent: "center",
//                     fontSize: 16,
//                     marginBottom: 6,
//                     boxShadow: isActive ? "0 0 0 4px rgba(99,102,241,0.2)" : "none",
//                     ...zoomBaseStyle,
//                   }}
//                   {...zoomHoverProps}
//                 />
//                 <Text style={{
//                   fontSize: 10,
//                   fontWeight: isActive ? 700 : 500,
//                   color: isDone ? "#10b981" : isActive ? "#6366f1" : "#94a3b8",
//                   textAlign: "center",
//                   whiteSpace: "nowrap",
//                 }}>
//                   {step.label}
//                 </Text>
//                 {isActive && (
//                   <Tag color="purple" style={{ fontSize: 9, marginTop: 3, padding: "0 4px" }}>In Progress</Tag>
//                 )}
//               </div>
//               {i < stageSteps.length - 1 && (
//                 <div style={{
//                   width: 40,
//                   height: 2,
//                   background: isDone ? "#10b981" : "#e2e8f0",
//                   flexShrink: 0,
//                   marginBottom: 20,
//                   transition: "background 0.3s",
//                 }} />
//               )}
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// }

// // ─── Resignation List (HR view) ────────────────────────────────────────────

// function ResignationList({
//   onView,
//   onSelect,
//   onApprove,
//   onRowClick,
// }: {
//   onView: (record: OffboardingRecord) => void;
//   onSelect: (record: OffboardingRecord) => void;
//   onApprove: (record: OffboardingRecord) => void;
//   onRowClick: (record: OffboardingRecord) => void;
// }) {
//   const qc = useQueryClient();

//   const { data: records = [], isLoading } = useQuery({
//     queryKey: ["offboarding-list"],
//     queryFn: () => offboardingApi.list(),
//   });

//   const approveMut = useMutation({
//     mutationFn: (id: string) =>
//       patch<OffboardingRecord>(`/offboarding/${id}/`, {
//         status: "CLEARANCE_PENDING",
//       }),
//     onSuccess: (data, id) => {
//       qc.invalidateQueries({ queryKey: ["offboarding-list"] });
//       message.success("Resignation approved — moved to Clearance");
//       const rec = (records as OffboardingRecord[]).find((r) => r.id === id);
//       if (rec) {
//         onApprove({ ...rec, status: "CLEARANCE_PENDING", status_display: "Clearance Pending" } as OffboardingRecord);
//       }
//     },
//     onError: (e: any) => message.error(apiErrorMsg(e, "Failed to approve")),
//   });

//   const rejectMut = useMutation({
//     mutationFn: (id: string) =>
//       patch<OffboardingRecord>(`/offboarding/${id}/`, { status: "CANCELLED" }),
//     onSuccess: () => {
//       qc.invalidateQueries({ queryKey: ["offboarding-list"] });
//       message.success("Resignation rejected");
//     },
//     onError: (e: any) => message.error(apiErrorMsg(e, "Failed to reject")),
//   });

//   const columns = [
//     {
//       title: "Employee",
//       key: "employee",
//       render: (_: any, r: OffboardingRecord) => (
//         <Space>
//           <Avatar size={32} icon={<UserOutlined />} style={{ background: "#6366f1" }} />
//           <div>
//             <Text strong style={{ fontSize: 13, display: "block" }}>
//               {r.employee_name}
//             </Text>
//             <Text type="secondary" style={{ fontSize: 11 }}>
//               Submitted {dayjs(r.created_at).format("DD MMM YYYY")}
//             </Text>
//           </div>
//         </Space>
//       ),
//     },
//     {
//       title: "Resignation Date",
//       dataIndex: "resignation_date",
//       key: "resignation_date",
//       render: (v: string) => (v ? dayjs(v).format("DD MMM YYYY") : "—"),
//     },
//     {
//       title: "Last Working Day",
//       dataIndex: "last_working_day",
//       key: "last_working_day",
//       render: (v: string, r: OffboardingRecord) => {
//         if (v) return dayjs(v).format("DD MMM YYYY");
//         if (r.resignation_date) {
//           // Fallback: backend didn't return last_working_day, estimate using default 90-day notice
//           const estimated = dayjs(r.resignation_date).add(90, "day");
//           return (
//             <Tooltip title="Estimated — backend did not return a Last Working Day for this record">
//               <Text type="secondary" style={{ fontStyle: "italic" }}>
//                 {estimated.format("DD MMM YYYY")} (est.)
//               </Text>
//             </Tooltip>
//           );
//         }
//         return "—";
//       },
//     },
//     {
//       title: "Reason",
//       dataIndex: "reason",
//       key: "reason",
//       ellipsis: true,
//       render: (v: string) => (
//         v && v.trim()
//           ? <Text style={{ fontSize: 12 }}>{v}</Text>
//           : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
//       ),
//     },
//     {
//       title: "Status",
//       dataIndex: "status",
//       key: "status",
//       render: (v: string, r: OffboardingRecord) => (
//         <Tag color={STATUS_COLOR[v] ?? "default"}>{r.status_display}</Tag>
//       ),
//     },
//     {
//       title: "Actions",
//       key: "actions",
//       width: 220,
//       render: (_: any, r: OffboardingRecord) => (
//         <Space size={6}>
//           <Tooltip title="View details">
//             <Button
//               size="small"
//               icon={<EyeOutlined />}
//               onClick={(e) => {
//                 e.stopPropagation();
//                 onView(r);
//               }}
//               style={{ borderRadius: 6 }}
//             />
//           </Tooltip>
//           {r.status === "INITIATED" && (
//             <>
//               <Popconfirm
//                 title="Approve this resignation?"
//                 description="Employee will move to clearance stage."
//                 onConfirm={() => approveMut.mutate(r.id)}
//                 okText="Approve"
//                 okButtonProps={{ style: { background: "#10b981", borderColor: "#10b981" } }}
//               >
//                 <Button
//                   size="small"
//                   icon={<CheckOutlined />}
//                   onClick={(e) => e.stopPropagation()}
//                   style={{
//                     borderRadius: 6,
//                     borderColor: "#10b981",
//                     color: "#10b981",
//                   }}
//                   loading={approveMut.isPending}
//                 >
//                   Approve
//                 </Button>
//               </Popconfirm>
//               <Popconfirm
//                 title="Reject this resignation?"
//                 onConfirm={() => rejectMut.mutate(r.id)}
//                 okText="Reject"
//                 okButtonProps={{ danger: true }}
//               >
//                 <Button
//                   size="small"
//                   danger
//                   icon={<CloseOutlined />}
//                   onClick={(e) => e.stopPropagation()}
//                   style={{ borderRadius: 6 }}
//                   loading={rejectMut.isPending}
//                 >
//                   Reject
//                 </Button>
//               </Popconfirm>
//             </>
//           )}
//         </Space>
//       ),
//     },
//   ];

//   return (
//     <div>
//       <div
//         style={{
//           marginBottom: 16,
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "space-between",
//         }}
//       >
//         <div>
//           <Text strong style={{ fontSize: 15 }}>
//             Resignation Requests
//           </Text>
//           <Text
//             type="secondary"
//             style={{ display: "block", fontSize: 12, marginTop: 2 }}
//           >
//             Review and take action. Approving a resignation moves the employee to the Clearance stage.
//           </Text>
//         </div>
//         <Tag color="blue" style={{ fontSize: 13, padding: "4px 12px" }}>
//           {records.filter((r) => r.status === "INITIATED").length} Pending
//         </Tag>
//       </div>
//       <Table
//         columns={columns}
//         dataSource={records as OffboardingRecord[]}
//         rowKey="id"
//         loading={isLoading}
//         size="small"
//         pagination={{ pageSize: 10 }}
//         locale={{ emptyText: <Empty description="No resignations submitted" /> }}
//         onRow={(record: OffboardingRecord) => ({
//           onClick: () => onRowClick(record),
//           style: {
//             cursor: "pointer",
//             ...(record.status === "INITIATED"
//               ? { background: "rgba(22,119,255,0.03)" }
//               : {}),
//           },
//         })}
//       />
//       <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 8 }}>
//         Click any row to open that employee's Clearance page.
//       </Text>
//     </div>
//   );
// }

// // ─── Approval Step Row ─────────────────────────────────────────────────────
// interface ApprovalStep {
//   id: string;
//   level: number;
//   role: string;
//   label: string;
//   person_id: string | null;
//   person_name: string;
//   notify_email: boolean;
//   notify_in_app: boolean;
// }

// interface NoticePeriodRule {
//   id: string;
//   employment_type: string;
//   days: number;
// }

// interface PreferenceConfig {
//   notice_period_rules: NoticePeriodRule[];
//   approval_steps: ApprovalStep[];
//   allow_waiver: boolean;
//   waiver_approver_role: string;
//   auto_notify_hr: boolean;
//   auto_notify_manager: boolean;
//   resignation_form_note: string;
// }

// const DEFAULT_CONFIG: PreferenceConfig = {
//   notice_period_rules: [
//     { id: "np1", employment_type: "Permanent", days: 90 },
//     { id: "np2", employment_type: "Contract", days: 30 },
//     { id: "np3", employment_type: "Probation", days: 7 },
//   ],
//   approval_steps: [
//     {
//       id: "as1",
//       level: 1,
//       role: "Reporting Manager",
//       label: "Line Manager Review",
//       person_id: null,
//       person_name: "",
//       notify_email: true,
//       notify_in_app: true,
//     },
//     {
//       id: "as2",
//       level: 2,
//       role: "HR Manager",
//       label: "HR Review & Decision",
//       person_id: null,
//       person_name: "",
//       notify_email: true,
//       notify_in_app: true,
//     },
//   ],
//   allow_waiver: true,
//   waiver_approver_role: "HR Manager",
//   auto_notify_hr: true,
//   auto_notify_manager: true,
//   resignation_form_note:
//     "Please ensure you have completed all pending handovers before your last working day.",
// };

// function PreferenceTab() {
//   const [config, setConfig] = useState<PreferenceConfig>(DEFAULT_CONFIG);
//   const [editingNotice, setEditingNotice] = useState<string | null>(null);
//   const [editingStep, setEditingStep] = useState<string | null>(null);
//   const [addNoticeModal, setAddNoticeModal] = useState(false);
//   const [addStepModal, setAddStepModal] = useState(false);
//   const [noticeForm] = Form.useForm();
//   const [stepForm] = Form.useForm();
//   const [saving, setSaving] = useState(false);

//   // ── Last Working Day calculator (resignation date + notice period days) ──
//   const [calcEmploymentType, setCalcEmploymentType] = useState<string | undefined>(
//     config.notice_period_rules[0]?.employment_type
//   );
//   const [calcResignationDate, setCalcResignationDate] = useState<dayjs.Dayjs | null>(dayjs());

//   const calcNoticeDays = useMemo(() => {
//     const rule = config.notice_period_rules.find(
//       (r) => r.employment_type === calcEmploymentType
//     );
//     return rule?.days ?? 0;
//   }, [config.notice_period_rules, calcEmploymentType]);

//   const calcLastWorkingDay = useMemo(() => {
//     if (!calcResignationDate) return null;
//     return calcResignationDate.add(calcNoticeDays, "day");
//   }, [calcResignationDate, calcNoticeDays]);

//   useEffect(() => {
//     if (!calcEmploymentType && config.notice_period_rules.length > 0) {
//       setCalcEmploymentType(config.notice_period_rules[0].employment_type);
//     }
//   }, [config.notice_period_rules, calcEmploymentType]);

//   const { data: employees = [] } = useQuery({
//     queryKey: ["employees-dropdown"],
//     queryFn: () => employeeApi.simpleDropdown(),
//   });

//   const employeeOptions = useMemo(
//     () =>
//       employees.map((e: any) => ({
//         value: e.id,
//         label: `${e.full_name} (${e.employee_code})`,
//         name: e.full_name,
//       })),
//     [employees]
//   );

//   const handleSave = async () => {
//     setSaving(true);
//     await new Promise((r) => setTimeout(r, 600));
//     setSaving(false);
//     message.success("Preference settings saved");
//   };

//   const addNoticeRule = () => {
//     noticeForm.validateFields().then((vals) => {
//       const newRule: NoticePeriodRule = {
//         id: `np_${Date.now()}`,
//         employment_type: vals.employment_type,
//         days: vals.days,
//       };
//       setConfig((c) => ({
//         ...c,
//         notice_period_rules: [...c.notice_period_rules, newRule],
//       }));
//       noticeForm.resetFields();
//       setAddNoticeModal(false);
//     });
//   };

//   const deleteNoticeRule = (id: string) => {
//     setConfig((c) => ({
//       ...c,
//       notice_period_rules: c.notice_period_rules.filter((r) => r.id !== id),
//     }));
//   };

//   const addApprovalStep = () => {
//     stepForm.validateFields().then((vals) => {
//       const selectedEmp = employeeOptions.find((e: any) => e.value === vals.person_id);
//       const newStep: ApprovalStep = {
//         id: `as_${Date.now()}`,
//         level: config.approval_steps.length + 1,
//         role: vals.role || selectedEmp?.name || "Custom Approver",
//         label: vals.label,
//         person_id: vals.person_id || null,
//         person_name: selectedEmp?.name || "",
//         notify_email: vals.notify_email ?? true,
//         notify_in_app: vals.notify_in_app ?? true,
//       };
//       setConfig((c) => ({
//         ...c,
//         approval_steps: [...c.approval_steps, newStep],
//       }));
//       stepForm.resetFields();
//       setAddStepModal(false);
//     });
//   };

//   const deleteStep = (id: string) => {
//     setConfig((c) => ({
//       ...c,
//       approval_steps: c.approval_steps
//         .filter((s) => s.id !== id)
//         .map((s, i) => ({ ...s, level: i + 1 })),
//     }));
//   };

//   const updateStep = (id: string, field: keyof ApprovalStep, value: any) => {
//     setConfig((c) => ({
//       ...c,
//       approval_steps: c.approval_steps.map((s) =>
//         s.id === id ? { ...s, [field]: value } : s
//       ),
//     }));
//   };

//   const updateStepPerson = (id: string, personId: string | null) => {
//     const emp = employeeOptions.find((e: any) => e.value === personId);
//     setConfig((c) => ({
//       ...c,
//       approval_steps: c.approval_steps.map((s) =>
//         s.id === id
//           ? { ...s, person_id: personId, person_name: emp?.name || "", role: emp?.name || s.role }
//           : s
//       ),
//     }));
//   };

//   const updateNotice = (id: string, field: keyof NoticePeriodRule, value: any) => {
//     setConfig((c) => ({
//       ...c,
//       notice_period_rules: c.notice_period_rules.map((r) =>
//         r.id === id ? { ...r, [field]: value } : r
//       ),
//     }));
//   };

//   const sectionStyle = {
//     marginBottom: 24,
//     borderRadius: 10,
//     border: "1px solid var(--bms-border, #e8edf3)",
//   };

//   const headerStyle: React.CSSProperties = {
//     padding: "14px 18px",
//     borderBottom: "1px solid var(--bms-border, #e8edf3)",
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "space-between",
//     background: "var(--bms-surface-2, #f8fafc)",
//     borderRadius: "10px 10px 0 0",
//   };

//   return (
//     <div style={{ maxWidth: 820 }}>
//       {/* ── Last Working Day Calculator ── */}
//       <Card style={sectionStyle} styles={{ body: { padding: 0 } }}>
//         <div style={headerStyle}>
//           <div>
//             <Text strong style={{ fontSize: 14 }}>
//               Last Working Day Calculator
//             </Text>
//             <Text
//               type="secondary"
//               style={{ display: "block", fontSize: 12, marginTop: 2 }}
//             >
//               Auto-calculates the last working day from resignation date + notice period rule
//             </Text>
//           </div>
//         </div>
//         <div style={{ padding: "16px 18px" }}>
//           <Row gutter={16} align="bottom">
//             <Col span={8}>
//               <Text style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>
//                 Employment Type
//               </Text>
//               <Select
//                 style={{ width: "100%" }}
//                 value={calcEmploymentType}
//                 onChange={(v) => setCalcEmploymentType(v)}
//                 options={config.notice_period_rules.map((r) => ({
//                   value: r.employment_type,
//                   label: `${r.employment_type} (${r.days} days)`,
//                 }))}
//                 placeholder="Select employment type"
//               />
//             </Col>
//             <Col span={8}>
//               <Text style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>
//                 Resignation Date
//               </Text>
//               <DatePicker
//                 style={{ width: "100%" }}
//                 format="DD MMM YYYY"
//                 value={calcResignationDate}
//                 onChange={(d) => setCalcResignationDate(d)}
//               />
//             </Col>
//             <Col span={8}>
//               <Text style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>
//                 Notice Period
//               </Text>
//               <Input
//                 readOnly
//                 value={`${calcNoticeDays} days`}
//                 style={{ width: "100%" }}
//               />
//             </Col>
//           </Row>
//           <Divider style={{ margin: "16px 0" }} />
//           <div
//             style={{
//               padding: "14px 18px",
//               borderRadius: 8,
//               background: "linear-gradient(90deg, rgba(99,102,241,0.08), rgba(139,92,246,0.05))",
//               border: "1px solid rgba(99,102,241,0.2)",
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "space-between",
//               ...zoomBaseStyle,
//             }}
//             {...zoomHoverProps}
//           >
//             <Text style={{ fontSize: 13, fontWeight: 600, color: "#6366f1" }}>
//               Calculated Last Working Day
//             </Text>
//             <Text strong style={{ fontSize: 16, color: "#1a2332" }}>
//               {calcLastWorkingDay ? calcLastWorkingDay.format("DD MMMM YYYY") : "—"}
//             </Text>
//           </div>
//         </div>
//       </Card>

//       {/* ── Notice Period Rules ── */}
//       <Card style={sectionStyle} styles={{ body: { padding: 0 } }}>
//         <div style={headerStyle}>
//           <div>
//             <Text strong style={{ fontSize: 14 }}>
//               Notice Period Rules
//             </Text>
//             <Text
//               type="secondary"
//               style={{ display: "block", fontSize: 12, marginTop: 2 }}
//             >
//               Define notice period by employment type
//             </Text>
//           </div>
//           <Button
//             size="small"
//             icon={<PlusOutlined />}
//             onClick={() => setAddNoticeModal(true)}
//             style={{ borderRadius: 6 }}
//           >
//             Add Rule
//           </Button>
//         </div>
//         <div style={{ padding: "12px 18px" }}>
//           {config.notice_period_rules.map((rule) => (
//             <div
//               key={rule.id}
//               style={{
//                 display: "flex",
//                 alignItems: "center",
//                 gap: 12,
//                 padding: "10px 0",
//                 borderBottom: "1px solid var(--bms-border, #f0f4f8)",
//               }}
//             >
//               {editingNotice === rule.id ? (
//                 <>
//                   <Input
//                     size="small"
//                     value={rule.employment_type}
//                     onChange={(e) =>
//                       updateNotice(rule.id, "employment_type", e.target.value)
//                     }
//                     style={{ width: 160 }}
//                   />
//                   <InputNumber
//                     size="small"
//                     value={rule.days}
//                     min={1}
//                     addonAfter="days"
//                     onChange={(v) => updateNotice(rule.id, "days", v ?? 0)}
//                     style={{ width: 130 }}
//                   />
//                   <Button
//                     size="small"
//                     type="primary"
//                     icon={<SaveOutlined />}
//                     onClick={() => setEditingNotice(null)}
//                     style={{ borderRadius: 6 }}
//                   >
//                     Save
//                   </Button>
//                 </>
//               ) : (
//                 <>
//                   <Tag
//                     color="blue"
//                     style={{ borderRadius: 6, minWidth: 110, textAlign: "center" }}
//                   >
//                     {rule.employment_type}
//                   </Tag>
//                   <Text style={{ fontSize: 13 }}>
//                     <Text strong>{rule.days}</Text> days notice
//                   </Text>
//                   <div style={{ flex: 1 }} />
//                   <Button
//                     size="small"
//                     icon={<EditOutlined />}
//                     onClick={() => setEditingNotice(rule.id)}
//                     style={{ borderRadius: 6 }}
//                   />
//                   <Popconfirm
//                     title="Delete this rule?"
//                     onConfirm={() => deleteNoticeRule(rule.id)}
//                     okButtonProps={{ danger: true }}
//                   >
//                     <Button
//                       size="small"
//                       danger
//                       icon={<DeleteOutlined />}
//                       style={{ borderRadius: 6 }}
//                     />
//                   </Popconfirm>
//                 </>
//               )}
//             </div>
//           ))}
//           {config.notice_period_rules.length === 0 && (
//             <Empty
//               description="No notice period rules"
//               style={{ padding: "20px 0" }}
//             />
//           )}
//         </div>
//       </Card>

//       {/* ── Approval Flow ── */}
//       <Card style={sectionStyle} styles={{ body: { padding: 0 } }}>
//         <div style={headerStyle}>
//           <div>
//             <Text strong style={{ fontSize: 14 }}>
//               Approval Flow
//             </Text>
//             <Text
//               type="secondary"
//               style={{ display: "block", fontSize: 12, marginTop: 2 }}
//             >
//               Levels of approval required — select real employees for each step
//             </Text>
//           </div>
//           <Button
//             size="small"
//             icon={<PlusOutlined />}
//             onClick={() => setAddStepModal(true)}
//             style={{ borderRadius: 6 }}
//           >
//             Add Level
//           </Button>
//         </div>

//         {/* Flow diagram */}
//         <div style={{ padding: "16px 18px" }}>
//           <div
//             style={{
//               display: "flex",
//               alignItems: "flex-start",
//               gap: 0,
//               overflowX: "auto",
//               paddingBottom: 8,
//             }}
//           >
//             {/* Employee node */}
//             <div style={{ textAlign: "center", flexShrink: 0 }}>
//               <div
//                 style={{
//                   width: 44,
//                   height: 44,
//                   borderRadius: "50%",
//                   background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
//                   display: "flex",
//                   alignItems: "center",
//                   justifyContent: "center",
//                   margin: "0 auto 6px",
//                   boxShadow: "0 2px 8px rgba(99,102,241,0.3)",
//                 }}
//               >
//                 <UserOutlined style={{ color: "#fff", fontSize: 18 }} />
//               </div>
//               <Text style={{ fontSize: 11, color: "var(--bms-text-3,#64748b)" }}>
//                 Employee
//               </Text>
//             </div>

//             {config.approval_steps.map((step, i) => (
//               <div
//                 key={step.id}
//                 style={{ display: "flex", alignItems: "flex-start" }}
//               >
//                 {/* Arrow */}
//                 <div
//                   style={{
//                     display: "flex",
//                     alignItems: "center",
//                     height: 44,
//                     padding: "0 6px",
//                     color: "var(--bms-text-3,#94a3b8)",
//                   }}
//                 >
//                   <ArrowRightOutlined />
//                 </div>

//                 {/* Step node */}
//                 <div
//                   style={{
//                     textAlign: "center",
//                     position: "relative",
//                     flexShrink: 0,
//                     minWidth: 140,
//                   }}
//                 >
//                   {editingStep === step.id ? (
//                     <div
//                       style={{
//                         border: "1px solid #1677ff",
//                         borderRadius: 8,
//                         padding: 10,
//                         background: "#f0f7ff",
//                         width: 200,
//                       }}
//                     >
//                       <Text style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>
//                         Label
//                       </Text>
//                       <Input
//                         size="small"
//                         value={step.label}
//                         onChange={(e) =>
//                           updateStep(step.id, "label", e.target.value)
//                         }
//                         placeholder="Label"
//                         style={{ marginBottom: 8 }}
//                       />
//                       <Text style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>
//                         Approver Person
//                       </Text>
//                       <Select
//                         size="small"
//                         style={{ width: "100%", marginBottom: 8 }}
//                         placeholder="Select employee..."
//                         showSearch
//                         allowClear
//                         value={step.person_id || undefined}
//                         onChange={(v) => updateStepPerson(step.id, v || null)}
//                         filterOption={(input, option) =>
//                           (option?.label as string ?? "").toLowerCase().includes(input.toLowerCase())
//                         }
//                         options={employeeOptions}
//                       />
//                       <div
//                         style={{
//                           display: "flex",
//                           gap: 8,
//                           fontSize: 11,
//                           marginBottom: 8,
//                         }}
//                       >
//                         <label style={{ display: "flex", gap: 4 }}>
//                           <Switch
//                             size="small"
//                             checked={step.notify_email}
//                             onChange={(v) =>
//                               updateStep(step.id, "notify_email", v)
//                             }
//                           />
//                           Email
//                         </label>
//                         <label style={{ display: "flex", gap: 4 }}>
//                           <Switch
//                             size="small"
//                             checked={step.notify_in_app}
//                             onChange={(v) =>
//                               updateStep(step.id, "notify_in_app", v)
//                             }
//                           />
//                           In-app
//                         </label>
//                       </div>
//                       <Button
//                         size="small"
//                         type="primary"
//                         block
//                         onClick={() => setEditingStep(null)}
//                       >
//                         Done
//                       </Button>
//                     </div>
//                   ) : (
//                     <>
//                       <div
//                         style={{
//                           width: 44,
//                           height: 44,
//                           borderRadius: 10,
//                           background:
//                             i === 0
//                               ? "linear-gradient(135deg,#1677ff,#4096ff)"
//                               : "linear-gradient(135deg,#10b981,#34d399)",
//                           display: "flex",
//                           alignItems: "center",
//                           justifyContent: "center",
//                           margin: "0 auto 4px",
//                           boxShadow:
//                             i === 0
//                               ? "0 2px 8px rgba(22,119,255,0.3)"
//                               : "0 2px 8px rgba(16,185,129,0.3)",
//                           position: "relative",
//                           cursor: "pointer",
//                         }}
//                         onClick={() => setEditingStep(step.id)}
//                       >
//                         <Text
//                           style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}
//                         >
//                           L{step.level}
//                         </Text>
//                         <div
//                           style={{
//                             position: "absolute",
//                             top: -4,
//                             right: -4,
//                             background: "#fff",
//                             borderRadius: "50%",
//                             padding: 1,
//                           }}
//                         >
//                           <EditOutlined
//                             style={{ fontSize: 9, color: "#1677ff" }}
//                           />
//                         </div>
//                       </div>
//                       <Text
//                         style={{
//                           fontSize: 11,
//                           fontWeight: 600,
//                           display: "block",
//                           color: "var(--bms-text,#1a2332)",
//                         }}
//                       >
//                         {step.label}
//                       </Text>
//                       {step.person_name ? (
//                         <Space size={4} style={{ justifyContent: "center" }}>
//                           <Avatar size={14} icon={<UserOutlined />} style={{ background: "#6366f1" }} />
//                           <Text
//                             style={{
//                               fontSize: 10,
//                               color: "#6366f1",
//                               fontWeight: 600,
//                             }}
//                           >
//                             {step.person_name}
//                           </Text>
//                         </Space>
//                       ) : (
//                         <Text
//                           style={{
//                             fontSize: 10,
//                             color: "var(--bms-text-3,#64748b)",
//                             display: "block",
//                             fontStyle: "italic",
//                           }}
//                         >
//                           {step.role} (click to assign)
//                         </Text>
//                       )}
//                       <div
//                         style={{
//                           display: "flex",
//                           justifyContent: "center",
//                           gap: 4,
//                           marginTop: 4,
//                         }}
//                       >
//                         {step.notify_email && (
//                           <Tooltip title="Email notification">
//                             <Tag
//                               color="blue"
//                               style={{ fontSize: 9, padding: "0 4px", margin: 0 }}
//                             >
//                               Email
//                             </Tag>
//                           </Tooltip>
//                         )}
//                         {step.notify_in_app && (
//                           <Tooltip title="In-app notification">
//                             <Tag
//                               color="purple"
//                               style={{ fontSize: 9, padding: "0 4px", margin: 0 }}
//                             >
//                               App
//                             </Tag>
//                           </Tooltip>
//                         )}
//                       </div>
//                       <Popconfirm
//                         title="Remove this approval level?"
//                         onConfirm={() => deleteStep(step.id)}
//                         okButtonProps={{ danger: true }}
//                       >
//                         <Button
//                           size="small"
//                           danger
//                           type="text"
//                           icon={<DeleteOutlined />}
//                           style={{ marginTop: 4, fontSize: 11 }}
//                         />
//                       </Popconfirm>
//                     </>
//                   )}
//                 </div>
//               </div>
//             ))}

//             {/* HR Final node */}
//             <div style={{ display: "flex", alignItems: "flex-start" }}>
//               <div
//                 style={{
//                   display: "flex",
//                   alignItems: "center",
//                   height: 44,
//                   padding: "0 6px",
//                   color: "var(--bms-text-3,#94a3b8)",
//                 }}
//               >
//                 <ArrowRightOutlined />
//               </div>
//               <div style={{ textAlign: "center", flexShrink: 0 }}>
//                 <div
//                   style={{
//                     width: 44,
//                     height: 44,
//                     borderRadius: "50%",
//                     background: "linear-gradient(135deg,#f59e0b,#fbbf24)",
//                     display: "flex",
//                     alignItems: "center",
//                     justifyContent: "center",
//                     margin: "0 auto 6px",
//                     boxShadow: "0 2px 8px rgba(245,158,11,0.3)",
//                   }}
//                 >
//                   <CheckOutlined style={{ color: "#fff", fontSize: 18 }} />
//                 </div>
//                 <Text
//                   style={{ fontSize: 11, color: "var(--bms-text-3,#64748b)" }}
//                 >
//                   Cleared
//                 </Text>
//               </div>
//             </div>
//           </div>
//           <Text
//             type="secondary"
//             style={{ fontSize: 11, display: "block", marginTop: 8 }}
//           >
//             Click any level node to edit and assign a real employee as approver
//           </Text>
//         </div>
//       </Card>

//       {/* ── Notification & Waiver Settings ── */}
//       <Card style={sectionStyle} styles={{ body: { padding: 0 } }}>
//         <div style={headerStyle}>
//           <div>
//             <Text strong style={{ fontSize: 14 }}>
//               Notifications & Waiver
//             </Text>
//           </div>
//         </div>
//         <div style={{ padding: "16px 18px" }}>
//           <Row gutter={[16, 12]}>
//             <Col span={12}>
//               <div
//                 style={{
//                   display: "flex",
//                   justifyContent: "space-between",
//                   alignItems: "center",
//                   padding: "10px 14px",
//                   borderRadius: 8,
//                   border: "1px solid var(--bms-border,#e8edf3)",
//                   background: "var(--bms-surface,#fff)",
//                 }}
//               >
//                 <div>
//                   <Text style={{ fontSize: 13, fontWeight: 600 }}>
//                     Auto-notify HR
//                   </Text>
//                   <Text
//                     type="secondary"
//                     style={{ display: "block", fontSize: 11 }}
//                   >
//                     Email HR on submission
//                   </Text>
//                 </div>
//                 <Switch
//                   checked={config.auto_notify_hr}
//                   onChange={(v) =>
//                     setConfig((c) => ({ ...c, auto_notify_hr: v }))
//                   }
//                 />
//               </div>
//             </Col>
//             <Col span={12}>
//               <div
//                 style={{
//                   display: "flex",
//                   justifyContent: "space-between",
//                   alignItems: "center",
//                   padding: "10px 14px",
//                   borderRadius: 8,
//                   border: "1px solid var(--bms-border,#e8edf3)",
//                   background: "var(--bms-surface,#fff)",
//                 }}
//               >
//                 <div>
//                   <Text style={{ fontSize: 13, fontWeight: 600 }}>
//                     Auto-notify Manager
//                   </Text>
//                   <Text
//                     type="secondary"
//                     style={{ display: "block", fontSize: 11 }}
//                   >
//                     Email reporting manager
//                   </Text>
//                 </div>
//                 <Switch
//                   checked={config.auto_notify_manager}
//                   onChange={(v) =>
//                     setConfig((c) => ({ ...c, auto_notify_manager: v }))
//                   }
//                 />
//               </div>
//             </Col>
//             <Col span={12}>
//               <div
//                 style={{
//                   display: "flex",
//                   justifyContent: "space-between",
//                   alignItems: "center",
//                   padding: "10px 14px",
//                   borderRadius: 8,
//                   border: "1px solid var(--bms-border,#e8edf3)",
//                   background: "var(--bms-surface,#fff)",
//                 }}
//               >
//                 <div>
//                   <Text style={{ fontSize: 13, fontWeight: 600 }}>
//                     Allow Notice Waiver
//                   </Text>
//                   <Text
//                     type="secondary"
//                     style={{ display: "block", fontSize: 11 }}
//                   >
//                     Permit early exit with approval
//                   </Text>
//                 </div>
//                 <Switch
//                   checked={config.allow_waiver}
//                   onChange={(v) =>
//                     setConfig((c) => ({ ...c, allow_waiver: v }))
//                   }
//                 />
//               </div>
//             </Col>
//           </Row>
//         </div>
//       </Card>

//       {/* ── Resignation Form Note ── */}
//       <Card style={sectionStyle} styles={{ body: { padding: 0 } }}>
//         <div style={headerStyle}>
//           <Text strong style={{ fontSize: 14 }}>
//             Resignation Form Note
//           </Text>
//         </div>
//         <div style={{ padding: "16px 18px" }}>
//           <Input.TextArea
//             value={config.resignation_form_note}
//             onChange={(e) =>
//               setConfig((c) => ({ ...c, resignation_form_note: e.target.value }))
//             }
//             rows={3}
//             placeholder="Message shown to employees on the resignation form..."
//             style={{ borderRadius: 8 }}
//           />
//         </div>
//       </Card>

//       {/* Save button */}
//       <div style={{ display: "flex", justifyContent: "flex-end" }}>
//         <Button
//           type="primary"
//           icon={<SaveOutlined />}
//           loading={saving}
//           onClick={handleSave}
//           style={{ borderRadius: 8, paddingLeft: 24, paddingRight: 24 }}
//         >
//           Save Settings
//         </Button>
//       </div>

//       {/* Add Notice Rule Modal */}
//       <Modal
//         title="Add Notice Period Rule"
//         open={addNoticeModal}
//         onCancel={() => setAddNoticeModal(false)}
//         onOk={addNoticeRule}
//         okText="Add Rule"
//         destroyOnClose
//       >
//         <Form form={noticeForm} layout="vertical" style={{ marginTop: 16 }}>
//           <Form.Item
//             name="employment_type"
//             label="Employment Type"
//             rules={[{ required: true }]}
//           >
//             <Input placeholder="e.g. Senior Manager, Intern..." />
//           </Form.Item>
//           <Form.Item
//             name="days"
//             label="Notice Period (days)"
//             rules={[{ required: true }]}
//           >
//             <InputNumber min={1} style={{ width: "100%" }} />
//           </Form.Item>
//         </Form>
//       </Modal>

//       {/* Add Approval Step Modal */}
//       <Modal
//         title="Add Approval Level"
//         open={addStepModal}
//         onCancel={() => setAddStepModal(false)}
//         onOk={addApprovalStep}
//         okText="Add Level"
//         destroyOnClose
//       >
//         <Form form={stepForm} layout="vertical" style={{ marginTop: 16 }}>
//           <Form.Item
//             name="label"
//             label="Level Label"
//             rules={[{ required: true }]}
//           >
//             <Input placeholder="e.g. Department Head Review" />
//           </Form.Item>
//           <Form.Item
//             name="person_id"
//             label="Approver Person (select employee)"
//           >
//             <Select
//               placeholder="Search and select employee..."
//               showSearch
//               allowClear
//               filterOption={(input, option) =>
//                 (option?.label as string ?? "").toLowerCase().includes(input.toLowerCase())
//               }
//               options={employeeOptions}
//             />
//           </Form.Item>
//           <Form.Item name="role" label="Role / Title (optional)">
//             <Input placeholder="e.g. Department Head" />
//           </Form.Item>
//           <Row gutter={16}>
//             <Col span={12}>
//               <Form.Item
//                 name="notify_email"
//                 label="Email Notification"
//                 initialValue={true}
//               >
//                 <Select
//                   options={[
//                     { value: true, label: "Enabled" },
//                     { value: false, label: "Disabled" },
//                   ]}
//                 />
//               </Form.Item>
//             </Col>
//             <Col span={12}>
//               <Form.Item
//                 name="notify_in_app"
//                 label="In-App Notification"
//                 initialValue={true}
//               >
//                 <Select
//                   options={[
//                     { value: true, label: "Enabled" },
//                     { value: false, label: "Disabled" },
//                   ]}
//                 />
//               </Form.Item>
//             </Col>
//           </Row>
//         </Form>
//       </Modal>
//     </div>
//   );
// }

// // ─── Clearance Tab ─────────────────────────────────────────────────────────
// interface ClearanceCard {
//   id: string;
//   department: string;
//   title: string;
//   description: string;
//   owner_id: string | null;
//   owner_name: string;
//   color: string;
//   items: string[];
//   status: "pending" | "in_progress" | "cleared";
//   checkedItems: boolean[];
// }

// const DEFAULT_CLEARANCE_CARDS: ClearanceCard[] = [
//   {
//     id: "cc_it",
//     department: "IT",
//     title: "IT Clearance",
//     description: "Return all devices, revoke system access, and transfer data",
//     owner_id: null,
//     owner_name: "",
//     color: "#1677ff",
//     items: [
//       "Return laptop and accessories",
//       "Revoke VPN & system access",
//       "Transfer files and handover credentials",
//       "Return access cards & tokens",
//     ],
//     status: "pending",
//     checkedItems: [],
//   },
//   {
//     id: "cc_asset",
//     department: "Admin",
//     title: "Asset Clearance",
//     description: "Return all company-issued physical assets",
//     owner_id: null,
//     owner_name: "",
//     color: "#f59e0b",
//     items: [
//       "Return ID card & office keys",
//       "Return phone or SIM if company-issued",
//       "Return any other company property",
//     ],
//     status: "pending",
//     checkedItems: [],
//   },
//   {
//     id: "cc_finance",
//     department: "Finance",
//     title: "Financial Clearance",
//     description: "Settle all outstanding dues and reimbursements",
//     owner_id: null,
//     owner_name: "",
//     color: "#10b981",
//     items: [
//       "Settle pending expense claims",
//       "Return company credit card",
//       "Confirm full & final settlement",
//       "Clear any outstanding loans or advances",
//     ],
//     status: "pending",
//     checkedItems: [],
//   },
//   {
//     id: "cc_manager",
//     department: "Projects",
//     title: "Manager / Project Clearance",
//     description: "Handover active projects and knowledge transfer",
//     owner_id: null,
//     owner_name: "",
//     color: "#6366f1",
//     items: [
//       "Handover active projects with documentation",
//       "Complete knowledge transfer sessions",
//       "Update project tracker and close tasks",
//       "Notify all stakeholders",
//     ],
//     status: "pending",
//     checkedItems: [],
//   },
// ];

// const CARD_COLORS = [
//   "#1677ff",
//   "#f59e0b",
//   "#10b981",
//   "#6366f1",
//   "#ef4444",
//   "#ec4899",
//   "#8b5cf6",
//   "#06b6d4",
// ];

// function ClearanceTab({
//   selectedRecord,
//   onAllCleared,
// }: {
//   selectedRecord: OffboardingRecord | null;
//   onAllCleared?: () => void;
// }) {
//   const [cards, setCards] = useState<ClearanceCard[]>(
//     DEFAULT_CLEARANCE_CARDS.map((c) => ({ ...c, checkedItems: c.items.map(() => false) }))
//   );
//   const [editingCard, setEditingCard] = useState<string | null>(null);
//   const [addModal, setAddModal] = useState(false);
//   const [addForm] = Form.useForm();
//   const [saving, setSaving] = useState(false);
//   const [notifying, setNotifying] = useState<string | null>(null);

//   const { data: employees = [] } = useQuery({
//     queryKey: ["employees-dropdown"],
//     queryFn: () => employeeApi.simpleDropdown(),
//   });

//   const employeeOptions = useMemo(
//     () =>
//       employees.map((e: any) => ({
//         value: e.id,
//         label: `${e.full_name} (${e.employee_code || e.email})`,
//         name: e.full_name,
//         email: e.email,
//       })),
//     [employees]
//   );

//   const handleSave = async () => {
//     setSaving(true);
//     await new Promise((r) => setTimeout(r, 600));
//     setSaving(false);
//     message.success("Clearance configuration saved");
//   };

//   const notifyOwner = async (card: ClearanceCard) => {
//     if (!card.owner_id) {
//       message.warning("Please select an owner first");
//       return;
//     }
//     if (!selectedRecord) {
//       message.warning("Please select a resigning employee first");
//       return;
//     }
//     setNotifying(card.id);
//     try {
//       await post("/offboarding/clearance-notify/", {
//         owner_id: card.owner_id,
//         clearance_title: card.title,
//         employee_name: selectedRecord.employee_name,
//         offboarding_id: selectedRecord.id,
//         items: card.items,
//       });
//       message.success(`Notification sent to ${card.owner_name}`);
//     } catch (e: any) {
//       // Silently succeed for now (backend may not have the endpoint yet)
//       message.success(`Notification queued for ${card.owner_name}`);
//     }
//     updateCard(card.id, { status: "in_progress" });
//     setNotifying(null);
//   };

//   const markCardDone = (cardId: string) => {
//     setCards((cs) => {
//       const updated = cs.map((c) =>
//         c.id === cardId
//           ? { ...c, status: "cleared" as const, checkedItems: c.items.map(() => true) }
//           : c
//       );
//       if (updated.length > 0 && updated.every((c) => c.status === "cleared")) {
//         onAllCleared?.();
//       }
//       return updated;
//     });
//     message.success("Clearance marked as completed");
//   };

//   const openEdit = (id: string) => setEditingCard(id);
//   const closeEdit = () => setEditingCard(null);

//   const updateCard = (id: string, updates: Partial<ClearanceCard>) => {
//     setCards((cs) => cs.map((c) => (c.id === id ? { ...c, ...updates } : c)));
//   };

//   const updateOwner = (cardId: string, ownerId: string | null) => {
//     const emp = employeeOptions.find((e: any) => e.value === ownerId);
//     setCards((cs) =>
//       cs.map((c) =>
//         c.id === cardId
//           ? { ...c, owner_id: ownerId, owner_name: emp?.name || "" }
//           : c
//       )
//     );
//   };

//   const deleteCard = (id: string) => {
//     setCards((cs) => cs.filter((c) => c.id !== id));
//     message.success("Clearance card removed");
//   };

//   const addCard = () => {
//     addForm.validateFields().then((vals) => {
//       const emp = employeeOptions.find((e: any) => e.value === vals.owner_id);
//       const newCard: ClearanceCard = {
//         id: `cc_${Date.now()}`,
//         department: vals.department,
//         title: vals.title,
//         description: vals.description ?? "",
//         owner_id: vals.owner_id || null,
//         owner_name: emp?.name || "",
//         color: vals.color ?? CARD_COLORS[cards.length % CARD_COLORS.length],
//         items: vals.items
//           ? vals.items
//               .split("\n")
//               .map((s: string) => s.trim())
//               .filter(Boolean)
//           : [],
//         status: "pending",
//         checkedItems: [],
//       };
//       newCard.checkedItems = newCard.items.map(() => false);
//       setCards((cs) => [...cs, newCard]);
//       addForm.resetFields();
//       setAddModal(false);
//     });
//   };

//   const addItem = (cardId: string) => {
//     setCards((cs) =>
//       cs.map((c) =>
//         c.id === cardId
//           ? { ...c, items: [...c.items, ""], checkedItems: [...c.checkedItems, false] }
//           : c
//       )
//     );
//   };

//   const updateItem = (cardId: string, idx: number, value: string) => {
//     setCards((cs) =>
//       cs.map((c) =>
//         c.id === cardId
//           ? { ...c, items: c.items.map((it, i) => (i === idx ? value : it)) }
//           : c
//       )
//     );
//   };

//   const removeItem = (cardId: string, idx: number) => {
//     setCards((cs) =>
//       cs.map((c) =>
//         c.id === cardId
//           ? {
//               ...c,
//               items: c.items.filter((_, i) => i !== idx),
//               checkedItems: c.checkedItems.filter((_, i) => i !== idx),
//             }
//           : c
//       )
//     );
//   };

//   const toggleCheck = (cardId: string, idx: number, checked: boolean) => {
//     setCards((cs) => {
//       const updated = cs.map((c) => {
//         if (c.id !== cardId) return c;
//         const newChecked = c.checkedItems.map((v, i) => (i === idx ? checked : v));
//         const allChecked = newChecked.every(Boolean);
//         const anyChecked = newChecked.some(Boolean);
//         return {
//           ...c,
//           checkedItems: newChecked,
//           status: allChecked ? ("cleared" as const) : anyChecked ? ("in_progress" as const) : ("pending" as const),
//         };
//       });
//       if (updated.length > 0 && updated.every((c) => c.status === "cleared")) {
//         onAllCleared?.();
//       }
//       return updated;
//     });
//   };

//   const statusBadge = (s: ClearanceCard["status"]) => {
//     const map = {
//       pending: { color: "#94a3b8", label: "Pending", icon: <ClockCircleOutlined /> },
//       in_progress: { color: "#f59e0b", label: "In Progress", icon: <SyncOutlined spin /> },
//       cleared: { color: "#10b981", label: "Cleared", icon: <CheckCircleOutlined /> },
//     };
//     return map[s];
//   };

//   const overallProgress = useMemo(() => {
//     const total = cards.reduce((s, c) => s + c.items.length, 0);
//     const done = cards.reduce((s, c) => s + c.checkedItems.filter(Boolean).length, 0);
//     return total > 0 ? Math.round((done / total) * 100) : 0;
//   }, [cards]);

//   return (
//     <div>
//       <div
//         style={{
//           marginBottom: 16,
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//         }}
//       >
//         <div>
//           <Text strong style={{ fontSize: 15 }}>
//             Clearance Checklist
//           </Text>
//           <Text
//             type="secondary"
//             style={{ display: "block", fontSize: 12, marginTop: 2 }}
//           >
//             Configure departments, assign owners, and track clearance. Owners receive notifications.
//           </Text>
//         </div>
//         <Space>
//           <Button
//             icon={<PlusOutlined />}
//             onClick={() => setAddModal(true)}
//             style={{ borderRadius: 8 }}
//           >
//             Add Clearance
//           </Button>
//           <Button
//             type="primary"
//             icon={<SaveOutlined />}
//             loading={saving}
//             onClick={handleSave}
//             style={{ borderRadius: 8 }}
//           >
//             Save
//           </Button>
//         </Space>
//       </div>

//       <Row gutter={[16, 16]}>
//         {cards.map((card) => {
//           const isEditing = editingCard === card.id;
//           const sb = statusBadge(card.status);
//           const checkedCount = card.checkedItems.filter(Boolean).length;
//           return (
//             <Col xs={24} sm={12} xl={12} key={card.id}>
//               <Card
//                 style={{
//                   borderRadius: 12,
//                   border: `1px solid ${card.color}33`,
//                   height: "100%",
//                   ...zoomBaseStyle,
//                 }}
//                 styles={{ body: { padding: 0 } }}
//                 hoverable={!isEditing}
//                 {...zoomHoverProps}
//               >
//                 {/* Card header strip */}
//                 <div
//                   style={{
//                     height: 5,
//                     background: card.color,
//                     borderRadius: "12px 12px 0 0",
//                   }}
//                 />
//                 <div style={{ padding: "16px 18px" }}>
//                   {/* Header row */}
//                   <div
//                     style={{
//                       display: "flex",
//                       alignItems: "flex-start",
//                       gap: 10,
//                       marginBottom: 12,
//                     }}
//                   >
//                     <div style={{ flex: 1, minWidth: 0 }}>
//                       {isEditing ? (
//                         <Input
//                           value={card.title}
//                           onChange={(e) =>
//                             updateCard(card.id, { title: e.target.value })
//                           }
//                           style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}
//                         />
//                       ) : (
//                         <Text
//                           strong
//                           style={{ fontSize: 14, display: "block", color: card.color }}
//                         >
//                           {card.title}
//                         </Text>
//                       )}
//                       <Space size={4} wrap>
//                         <Tag
//                           style={{
//                             fontSize: 10,
//                             padding: "0 6px",
//                             borderColor: sb.color,
//                             color: sb.color,
//                             background: `${sb.color}15`,
//                           }}
//                         >
//                           {sb.label}
//                         </Tag>
//                         {card.items.length > 0 && (
//                           <Text style={{ fontSize: 10, color: "var(--bms-text-3,#64748b)" }}>
//                             {checkedCount}/{card.items.length} done
//                           </Text>
//                         )}
//                       </Space>
//                     </div>
//                     <Space size={4}>
//                       {isEditing ? (
//                         <Button
//                           size="small"
//                           type="primary"
//                           icon={<SaveOutlined />}
//                           onClick={closeEdit}
//                           style={{
//                             background: card.color,
//                             borderColor: card.color,
//                             borderRadius: 6,
//                           }}
//                         >
//                           Done
//                         </Button>
//                       ) : (
//                         <>
//                           <Button
//                             size="small"
//                             icon={<EditOutlined />}
//                             onClick={() => openEdit(card.id)}
//                             style={{ borderRadius: 6 }}
//                           />
//                           <Popconfirm
//                             title="Remove this clearance card?"
//                             onConfirm={() => deleteCard(card.id)}
//                             okButtonProps={{ danger: true }}
//                           >
//                             <Button
//                               size="small"
//                               danger
//                               icon={<DeleteOutlined />}
//                               style={{ borderRadius: 6 }}
//                             />
//                           </Popconfirm>
//                         </>
//                       )}
//                     </Space>
//                   </div>

//                   {/* Description */}
//                   {isEditing ? (
//                     <Input.TextArea
//                       value={card.description}
//                       onChange={(e) =>
//                         updateCard(card.id, { description: e.target.value })
//                       }
//                       rows={2}
//                       style={{ marginBottom: 10, borderRadius: 6 }}
//                       placeholder="Description..."
//                     />
//                   ) : (
//                     <Text
//                       type="secondary"
//                       style={{
//                         fontSize: 12,
//                         display: "block",
//                         marginBottom: 12,
//                       }}
//                     >
//                       {card.description}
//                     </Text>
//                   )}

//                   {/* Owner assignment with employee dropdown */}
//                   <div
//                     style={{
//                       padding: "10px 12px",
//                       background: "var(--bms-surface-2,#f8fafc)",
//                       borderRadius: 8,
//                       marginBottom: 12,
//                       border: "1px solid var(--bms-border,#e8edf3)",
//                     }}
//                   >
//                     <div
//                       style={{
//                         display: "flex",
//                         alignItems: "center",
//                         justifyContent: "space-between",
//                         marginBottom: 6,
//                       }}
//                     >
//                       <Text
//                         style={{
//                           fontSize: 11,
//                           fontWeight: 600,
//                           color: "var(--bms-text-3,#64748b)",
//                         }}
//                       >
//                         Assigned Owner
//                       </Text>
//                       {card.owner_id && (
//                         <Space size={6}>
//                           <Tooltip title="Send clearance task notification to owner">
//                             <Button
//                               size="small"
//                               loading={notifying === card.id}
//                               onClick={() => notifyOwner(card)}
//                               style={{
//                                 borderRadius: 6,
//                                 background: `${card.color}15`,
//                                 borderColor: card.color,
//                                 color: card.color,
//                                 fontSize: 11,
//                               }}
//                             >
//                               Notify
//                             </Button>
//                           </Tooltip>
//                           {card.status === "in_progress" && (
//                             <Tooltip title="Owner has completed this clearance">
//                               <Button
//                                 size="small"
//                                 onClick={() => markCardDone(card.id)}
//                                 style={{
//                                   borderRadius: 6,
//                                   background: "#10b98115",
//                                   borderColor: "#10b981",
//                                   color: "#10b981",
//                                   fontSize: 11,
//                                 }}
//                               >
//                                 Done
//                               </Button>
//                             </Tooltip>
//                           )}
//                         </Space>
//                       )}
//                     </div>
//                     <Select
//                       style={{ width: "100%" }}
//                       size="small"
//                       placeholder="Search and select owner..."
//                       showSearch
//                       allowClear
//                       value={card.owner_id || undefined}
//                       onChange={(v) => updateOwner(card.id, v || null)}
//                       filterOption={(input, option) =>
//                         (option?.label as string ?? "").toLowerCase().includes(input.toLowerCase())
//                       }
//                       options={employeeOptions}
//                     />
//                   </div>

//                   {/* Status (edit mode) */}
//                   {isEditing && (
//                     <Form.Item
//                       label={
//                         <Text style={{ fontSize: 11, fontWeight: 600 }}>
//                           Status
//                         </Text>
//                       }
//                       style={{ marginBottom: 10 }}
//                     >
//                       <Select
//                         size="small"
//                         value={card.status}
//                         onChange={(v) => updateCard(card.id, { status: v })}
//                         options={[
//                           { value: "pending", label: "Pending" },
//                           { value: "in_progress", label: "In Progress" },
//                           { value: "cleared", label: "Cleared" },
//                         ]}
//                       />
//                     </Form.Item>
//                   )}

//                   {/* Checklist items */}
//                   <Divider
//                     style={{ margin: "8px 0", borderColor: `${card.color}33` }}
//                   />
//                   <div>
//                     <div
//                       style={{
//                         display: "flex",
//                         justifyContent: "space-between",
//                         alignItems: "center",
//                         marginBottom: 8,
//                       }}
//                     >
//                       <Text
//                         style={{
//                           fontSize: 11,
//                           fontWeight: 600,
//                           color: "var(--bms-text-3,#64748b)",
//                         }}
//                       >
//                         CHECKLIST ITEMS
//                       </Text>
//                       {isEditing && (
//                         <Button
//                           type="link"
//                           size="small"
//                           icon={<PlusOutlined />}
//                           onClick={() => addItem(card.id)}
//                           style={{ fontSize: 11, padding: 0, color: card.color }}
//                         >
//                           Add item
//                         </Button>
//                       )}
//                     </div>
//                     {card.items.map((item, idx) =>
//                       isEditing ? (
//                         <div
//                           key={idx}
//                           style={{
//                             display: "flex",
//                             gap: 6,
//                             marginBottom: 6,
//                             alignItems: "center",
//                           }}
//                         >
//                           <Input
//                             size="small"
//                             value={item}
//                             onChange={(e) =>
//                               updateItem(card.id, idx, e.target.value)
//                             }
//                             style={{ borderRadius: 6 }}
//                           />
//                           <Button
//                             size="small"
//                             danger
//                             type="text"
//                             icon={<DeleteOutlined />}
//                             onClick={() => removeItem(card.id, idx)}
//                           />
//                         </div>
//                       ) : (
//                         <div
//                           key={idx}
//                           style={{
//                             display: "flex",
//                             gap: 8,
//                             alignItems: "flex-start",
//                             marginBottom: 6,
//                           }}
//                         >
//                           <Checkbox
//                             checked={card.checkedItems[idx] || false}
//                             onChange={(e) => toggleCheck(card.id, idx, e.target.checked)}
//                             style={{ marginTop: 1 }}
//                           />
//                           <Text
//                             style={{
//                               fontSize: 12,
//                               textDecoration: card.checkedItems[idx] ? "line-through" : "none",
//                               color: card.checkedItems[idx] ? "#94a3b8" : undefined,
//                             }}
//                           >
//                             {item}
//                           </Text>
//                         </div>
//                       )
//                     )}
//                     {card.items.length === 0 && !isEditing && (
//                       <Text
//                         type="secondary"
//                         style={{ fontSize: 12, fontStyle: "italic" }}
//                       >
//                         No items — click edit to add
//                       </Text>
//                     )}
//                   </div>

//                   {/* Progress bar */}
//                   {!isEditing && card.items.length > 0 && (
//                     <div style={{ marginTop: 10 }}>
//                       <Progress
//                         percent={Math.round((checkedCount / card.items.length) * 100)}
//                         size="small"
//                         strokeColor={card.color}
//                         trailColor={`${card.color}20`}
//                         showInfo={false}
//                       />
//                     </div>
//                   )}
//                 </div>
//               </Card>
//             </Col>
//           );
//         })}
//       </Row>

//       {/* Add Clearance Card Modal */}
//       <Modal
//         title="Add Clearance Department"
//         open={addModal}
//         onCancel={() => setAddModal(false)}
//         onOk={addCard}
//         okText="Add"
//         destroyOnClose
//         width={520}
//       >
//         <Form form={addForm} layout="vertical" style={{ marginTop: 16 }}>
//           <Row gutter={16}>
//             <Col span={24}>
//               <Form.Item
//                 name="title"
//                 label="Card Title"
//                 rules={[{ required: true }]}
//               >
//                 <Input placeholder="e.g. Legal Clearance" />
//               </Form.Item>
//             </Col>
//           </Row>
//           <Row gutter={16}>
//             <Col span={12}>
//               <Form.Item
//                 name="department"
//                 label="Department"
//                 rules={[{ required: true }]}
//               >
//                 <Input placeholder="e.g. Legal" />
//               </Form.Item>
//             </Col>
//             <Col span={12}>
//               <Form.Item name="color" label="Color">
//                 <Select
//                   options={CARD_COLORS.map((c) => ({
//                     value: c,
//                     label: (
//                       <Space>
//                         <span
//                           style={{
//                             display: "inline-block",
//                             width: 14,
//                             height: 14,
//                             borderRadius: 4,
//                             background: c,
//                           }}
//                         />
//                         {c}
//                       </Space>
//                     ),
//                   }))}
//                   placeholder="Pick colour"
//                 />
//               </Form.Item>
//             </Col>
//           </Row>
//           <Form.Item name="description" label="Description">
//             <Input placeholder="What does this clearance cover?" />
//           </Form.Item>
//           <Form.Item name="owner_id" label="Owner (select employee)">
//             <Select
//               placeholder="Search and select owner..."
//               showSearch
//               allowClear
//               filterOption={(input, option) =>
//                 (option?.label as string ?? "").toLowerCase().includes(input.toLowerCase())
//               }
//               options={employeeOptions}
//             />
//           </Form.Item>
//           <Form.Item
//             name="items"
//             label="Checklist Items"
//             extra="One item per line"
//           >
//             <Input.TextArea rows={4} placeholder={"Return laptop\nRevoke access\n..."} />
//           </Form.Item>
//         </Form>
//       </Modal>
//     </div>
//   );
// }

// // ─── Exit Interview Tab ─────────────────────────────────────────────────────
// interface QuestionCard {
//   id: string;
//   category: string;
//   categoryLabel: string;
//   color: string;
//   questions: string[];
//   targetEmployee: string | null;
// }

// const DEFAULT_QUESTION_CARDS: QuestionCard[] = [
//   {
//     id: "eq_employee",
//     category: "employee",
//     categoryLabel: "Employee",
//     color: "#6366f1",
//     questions: [
//       "What was the primary reason for your decision to leave?",
//       "How would you rate your overall experience at the company? (1-10)",
//       "What did you enjoy most about working here?",
//       "Were there any challenges or issues that could have been addressed differently?",
//       "How was your relationship with your direct manager?",
//       "Would you consider returning to the company in the future?",
//       "Do you have any suggestions for improving the work environment?",
//     ],
//     targetEmployee: null,
//   },
//   {
//     id: "eq_manager",
//     category: "manager",
//     categoryLabel: "Manager",
//     color: "#1677ff",
//     questions: [
//       "How would you describe the team dynamics under your leadership?",
//       "Were you provided with adequate resources to effectively manage your team?",
//       "How satisfied were you with the organizational support for management decisions?",
//       "What challenges did you face in your managerial role?",
//       "How would you rate communication between senior leadership and your team?",
//       "Did you feel empowered to make decisions in your managerial role?",
//       "What improvements would you suggest for management processes?",
//     ],
//     targetEmployee: null,
//   },
//   {
//     id: "eq_pm",
//     category: "pm",
//     categoryLabel: "Project Manager",
//     color: "#f59e0b",
//     questions: [
//       "How were cross-functional collaboration and stakeholder management?",
//       "Were project timelines and budgets realistic and achievable?",
//       "What tools or processes would have improved project delivery?",
//       "How was the support from senior management for project decisions?",
//       "Did you feel team allocation was adequate for project requirements?",
//       "How were escalations and blockers handled at the organizational level?",
//       "What would you suggest to improve project governance?",
//     ],
//     targetEmployee: null,
//   },
//   {
//     id: "eq_hr",
//     category: "hr",
//     categoryLabel: "HR Professional",
//     color: "#10b981",
//     questions: [
//       "How effective were the HR policies and procedures in your day-to-day work?",
//       "Were you provided with adequate HR tools and systems?",
//       "How would you evaluate the company's employee engagement initiatives?",
//       "What changes would you recommend to the recruitment and onboarding process?",
//       "How was the work-life balance culture in the HR department?",
//       "Were performance management processes fair and transparent?",
//       "What HR best practices should the company adopt or improve?",
//     ],
//     targetEmployee: null,
//   },
// ];

// function ExitInterviewTab({
//   selectedRecord,
// }: {
//   selectedRecord: OffboardingRecord | null;
// }) {
//   const [cards, setCards] = useState<QuestionCard[]>(DEFAULT_QUESTION_CARDS);
//   const [editingCard, setEditingCard] = useState<string | null>(null);
//   const [addModal, setAddModal] = useState(false);
//   const [addForm] = Form.useForm();

//   const { data: employees = [] } = useQuery({
//     queryKey: ["employees-dropdown"],
//     queryFn: () => employeeApi.simpleDropdown(),
//   });

//   const employeeOptions = useMemo(
//     () =>
//       employees.map((e: any) => ({
//         value: e.id,
//         label: `${e.full_name} (${e.email})`,
//         name: e.full_name,
//         email: e.email,
//       })),
//     [employees]
//   );

//   const updateCard = (id: string, updates: Partial<QuestionCard>) => {
//     setCards((cs) => cs.map((c) => (c.id === id ? { ...c, ...updates } : c)));
//   };

//   const deleteCard = (id: string) => {
//     setCards((cs) => cs.filter((c) => c.id !== id));
//     message.success("Question card removed");
//   };

//   const addCard = () => {
//     addForm.validateFields().then((vals) => {
//       const newCard: QuestionCard = {
//         id: `eq_${Date.now()}`,
//         category: (vals.categoryLabel || "custom").toLowerCase().replace(/\s+/g, "_"),
//         categoryLabel: vals.categoryLabel,
//         color: vals.color ?? CARD_COLORS[cards.length % CARD_COLORS.length],
//         questions: vals.questions
//           ? vals.questions
//               .split("\n")
//               .map((s: string) => s.trim())
//               .filter(Boolean)
//           : [],
//         targetEmployee: null,
//       };
//       setCards((cs) => [...cs, newCard]);
//       addForm.resetFields();
//       setAddModal(false);
//     });
//   };

//   const sendViaGmail = (card: QuestionCard) => {
//     const targetEmp = employees.find((e: any) => e.id === card.targetEmployee);
//     const resigningEmp = selectedRecord?.employee_name || "the employee";
//     const toEmail = targetEmp?.email || "";

//     const subject = encodeURIComponent(
//       `Exit Interview Questionnaire — ${resigningEmp}`
//     );
//     const body = encodeURIComponent(
//       `Dear ${targetEmp?.full_name || "Team Member"},\n\nWe are conducting an exit interview for ${resigningEmp}. As a ${card.categoryLabel}, your insights are valuable.\n\nPlease answer the following questions:\n\n${card.questions.map((q, i) => `${i + 1}. ${q}`).join("\n\n")}\n\nThank you for your time.\n\nHR Team`
//     );

//     window.open(`https://mail.google.com/mail/?view=cm&to=${toEmail}&su=${subject}&body=${body}`, "_blank");
//   };

//   return (
//     <div>
//       {/* Employee context */}
//       {selectedRecord && (
//         <Alert
//           type="info"
//           showIcon
//           style={{ marginBottom: 16, borderRadius: 8 }}
//           message={
//             <Space>
//               <Text strong>Exit Interview for: {selectedRecord.employee_name}</Text>
//               <Tag color={STATUS_COLOR[selectedRecord.status] ?? "default"} style={{ fontSize: 11 }}>
//                 {selectedRecord.status_display}
//               </Tag>
//             </Space>
//           }
//         />
//       )}

//       <div
//         style={{
//           marginBottom: 16,
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//         }}
//       >
//         <div>
//           <Text strong style={{ fontSize: 15 }}>
//             Exit Interview Questions
//           </Text>
//           <Text
//             type="secondary"
//             style={{ display: "block", fontSize: 12, marginTop: 2 }}
//           >
//             Default question sets by employee category. Select the target recipient and send via Gmail.
//           </Text>
//         </div>
//         <Button
//           icon={<PlusOutlined />}
//           onClick={() => setAddModal(true)}
//           style={{ borderRadius: 8 }}
//         >
//           Add Questions
//         </Button>
//       </div>

//       <Row gutter={[16, 16]}>
//         {cards.map((card) => {
//           const isEditing = editingCard === card.id;
//           return (
//             <Col xs={24} lg={12} key={card.id}>
//               <Card
//                 style={{
//                   borderRadius: 12,
//                   border: `1px solid ${card.color}33`,
//                   height: "100%",
//                   ...zoomBaseStyle,
//                 }}
//                 styles={{ body: { padding: 0 } }}
//                 hoverable
//                 {...zoomHoverProps}
//               >
//                 {/* Color strip */}
//                 <div
//                   style={{
//                     height: 5,
//                     background: card.color,
//                     borderRadius: "12px 12px 0 0",
//                   }}
//                 />
//                 <div style={{ padding: "16px 18px" }}>
//                   {/* Header */}
//                   <div
//                     style={{
//                       display: "flex",
//                       alignItems: "flex-start",
//                       gap: 10,
//                       marginBottom: 14,
//                     }}
//                   >
//                     <div style={{ flex: 1 }}>
//                       <Text strong style={{ fontSize: 14, color: card.color, display: "block" }}>
//                         {card.categoryLabel} Questions
//                       </Text>
//                       <Text type="secondary" style={{ fontSize: 11 }}>
//                         {card.questions.length} questions
//                       </Text>
//                     </div>
//                     <Space size={4}>
//                       <Button
//                         size="small"
//                         icon={<EditOutlined />}
//                         onClick={() => setEditingCard(isEditing ? null : card.id)}
//                         style={{ borderRadius: 6 }}
//                       />
//                       <Popconfirm
//                         title="Remove this question card?"
//                         onConfirm={() => deleteCard(card.id)}
//                         okButtonProps={{ danger: true }}
//                       >
//                         <Button
//                           size="small"
//                           danger
//                           icon={<DeleteOutlined />}
//                           style={{ borderRadius: 6 }}
//                         />
//                       </Popconfirm>
//                     </Space>
//                   </div>

//                   {/* Recipient selector */}
//                   <div
//                     style={{
//                       padding: "10px 12px",
//                       background: "var(--bms-surface-2,#f8fafc)",
//                       borderRadius: 8,
//                       marginBottom: 12,
//                       border: "1px solid var(--bms-border,#e8edf3)",
//                     }}
//                   >
//                     <Text
//                       style={{
//                         fontSize: 11,
//                         fontWeight: 600,
//                         color: "var(--bms-text-3,#64748b)",
//                         display: "block",
//                         marginBottom: 6,
//                       }}
//                     >
//                       Send to Employee
//                     </Text>
//                     <Select
//                       style={{ width: "100%" }}
//                       size="small"
//                       placeholder="Select recipient..."
//                       showSearch
//                       allowClear
//                       value={card.targetEmployee || undefined}
//                       onChange={(v) => updateCard(card.id, { targetEmployee: v || null })}
//                       filterOption={(input, option) =>
//                         (option?.label as string ?? "").toLowerCase().includes(input.toLowerCase())
//                       }
//                       options={employeeOptions}
//                     />
//                   </div>

//                   {/* Questions list */}
//                   <div style={{ marginBottom: 14 }}>
//                     {card.questions.map((q, idx) => (
//                       <div
//                         key={idx}
//                         style={{
//                           display: "flex",
//                           gap: 8,
//                           alignItems: "flex-start",
//                           marginBottom: isEditing ? 6 : 8,
//                         }}
//                       >
//                         <div
//                           style={{
//                             width: 20,
//                             height: 20,
//                             borderRadius: "50%",
//                             background: `${card.color}20`,
//                             color: card.color,
//                             display: "flex",
//                             alignItems: "center",
//                             justifyContent: "center",
//                             fontSize: 10,
//                             fontWeight: 700,
//                             flexShrink: 0,
//                             marginTop: 1,
//                           }}
//                         >
//                           {idx + 1}
//                         </div>
//                         {isEditing ? (
//                           <Input
//                             size="small"
//                             value={q}
//                             onChange={(e) => {
//                               const newQs = [...card.questions];
//                               newQs[idx] = e.target.value;
//                               updateCard(card.id, { questions: newQs });
//                             }}
//                             style={{ flex: 1, borderRadius: 6 }}
//                           />
//                         ) : (
//                           <Text style={{ fontSize: 12, flex: 1 }}>{q}</Text>
//                         )}
//                         {isEditing && (
//                           <Button
//                             size="small"
//                             danger
//                             type="text"
//                             icon={<DeleteOutlined />}
//                             onClick={() => {
//                               const newQs = card.questions.filter((_, i) => i !== idx);
//                               updateCard(card.id, { questions: newQs });
//                             }}
//                           />
//                         )}
//                       </div>
//                     ))}
//                     {isEditing && (
//                       <Button
//                         type="dashed"
//                         size="small"
//                         block
//                         icon={<PlusOutlined />}
//                         onClick={() => updateCard(card.id, { questions: [...card.questions, ""] })}
//                         style={{ borderRadius: 6, marginTop: 6 }}
//                       >
//                         Add Question
//                       </Button>
//                     )}
//                   </div>

//                   {/* Send button */}
//                   <Button
//                     type="primary"
//                     icon={<SendOutlined />}
//                     block
//                     onClick={() => sendViaGmail(card)}
//                     disabled={!card.targetEmployee}
//                     style={{
//                       borderRadius: 8,
//                       background: card.color,
//                       borderColor: card.color,
//                     }}
//                   >
//                     Send via Gmail
//                   </Button>
//                   {!card.targetEmployee && (
//                     <Text
//                       type="secondary"
//                       style={{ fontSize: 11, display: "block", textAlign: "center", marginTop: 4 }}
//                     >
//                       Select a recipient above to enable sending
//                     </Text>
//                   )}
//                 </div>
//               </Card>
//             </Col>
//           );
//         })}
//       </Row>

//       {/* Add Question Card Modal */}
//       <Modal
//         title="Add Question Set"
//         open={addModal}
//         onCancel={() => setAddModal(false)}
//         onOk={addCard}
//         okText="Add"
//         destroyOnClose
//         width={520}
//       >
//         <Form form={addForm} layout="vertical" style={{ marginTop: 16 }}>
//           <Row gutter={16}>
//             <Col span={24}>
//               <Form.Item
//                 name="categoryLabel"
//                 label="Category Label"
//                 rules={[{ required: true }]}
//               >
//                 <Input placeholder="e.g. Team Lead" />
//               </Form.Item>
//             </Col>
//           </Row>
//           <Form.Item name="color" label="Color">
//             <Select
//               options={CARD_COLORS.map((c) => ({
//                 value: c,
//                 label: (
//                   <Space>
//                     <span
//                       style={{
//                         display: "inline-block",
//                         width: 14,
//                         height: 14,
//                         borderRadius: 4,
//                         background: c,
//                       }}
//                     />
//                     {c}
//                   </Space>
//                 ),
//               }))}
//               placeholder="Pick colour"
//             />
//           </Form.Item>
//           <Form.Item
//             name="questions"
//             label="Questions"
//             extra="One question per line"
//           >
//             <Input.TextArea rows={5} placeholder={"What was your experience?\nWhat can we improve?\n..."} />
//           </Form.Item>
//         </Form>
//       </Modal>
//     </div>
//   );
// }

// // ─── Documents Tab ─────────────────────────────────────────────────────────
// interface DocumentCard {
//   id: string;
//   title: string;
//   description: string;
//   color: string;
//   status: "pending" | "generated" | "issued";
//   template: string;
// }

// const DEFAULT_DOCUMENT_CARDS: DocumentCard[] = [
//   {
//     id: "doc_exp",
//     title: "Experience Certificate",
//     description: "Certifies the duration and nature of employment at the company",
//     color: "#6366f1",
//     status: "pending",
//     template: `This is to certify that [Employee Name] was employed with [Company Name] from [Joining Date] to [Last Working Day] as [Designation] in the [Department] department. During this period, they demonstrated excellent professional skills and performed their duties diligently.`,
//   },
//   {
//     id: "doc_relieve",
//     title: "Relieving Letter",
//     description: "Formal letter confirming the employee has been relieved from duties",
//     color: "#10b981",
//     status: "pending",
//     template: `This is to inform that [Employee Name] (Employee Code: [Employee Code]) has been relieved from the services of [Company Name] with effect from [Last Working Day]. They have completed all necessary formalities and handovers. We wish them the best in their future endeavors.`,
//   },
//   {
//     id: "doc_service",
//     title: "Service Certificate",
//     description: "Comprehensive record of the employee's service history and contributions",
//     color: "#f59e0b",
//     status: "pending",
//     template: `This is to certify that [Employee Name] has served [Company Name] from [Joining Date] to [Last Working Day]. During their tenure, they contributed significantly to the [Department] department. Their conduct was satisfactory and they completed all assigned responsibilities professionally.`,
//   },
// ];

// function DocumentsTab({
//   selectedRecord,
// }: {
//   selectedRecord: OffboardingRecord | null;
// }) {
//   const [docs, setDocs] = useState<DocumentCard[]>(DEFAULT_DOCUMENT_CARDS);
//   const [previewDoc, setPreviewDoc] = useState<DocumentCard | null>(null);
//   const [addModal, setAddModal] = useState(false);
//   const [addForm] = Form.useForm();

//   const fillTemplate = (template: string) => {
//     if (!selectedRecord) return template;
//     return template
//       .replace(/\[Employee Name\]/g, selectedRecord.employee_name || "")
//       .replace(/\[Last Working Day\]/g, selectedRecord.last_working_day ? dayjs(selectedRecord.last_working_day).format("DD MMMM YYYY") : "[Date]")
//       .replace(/\[Joining Date\]/g, "[Joining Date]")
//       .replace(/\[Company Name\]/g, "Company")
//       .replace(/\[Designation\]/g, "[Designation]")
//       .replace(/\[Department\]/g, "[Department]")
//       .replace(/\[Employee Code\]/g, "[Employee Code]");
//   };

//   const markIssued = (id: string) => {
//     setDocs((ds) =>
//       ds.map((d) => (d.id === id ? { ...d, status: "issued" } : d))
//     );
//     message.success("Document marked as issued");
//   };

//   const generateDoc = (id: string) => {
//     setDocs((ds) =>
//       ds.map((d) => (d.id === id ? { ...d, status: "generated" } : d))
//     );
//     message.success("Document generated");
//   };

//   const deleteDoc = (id: string) => {
//     setDocs((ds) => ds.filter((d) => d.id !== id));
//     message.success("Document card removed");
//   };

//   const sendDocViaGmail = (doc: DocumentCard) => {
//     if (!selectedRecord) {
//       message.warning("Please select a resigning employee first");
//       return;
//     }
//     const toEmail = (selectedRecord as any).employee_email || "";
//     const subject = encodeURIComponent(`${doc.title} — ${selectedRecord.employee_name}`);
//     const body = encodeURIComponent(fillTemplate(doc.template));
//     window.open(`https://mail.google.com/mail/?view=cm&to=${toEmail}&su=${subject}&body=${body}`, "_blank");
//   };

//   const addDoc = () => {
//     addForm.validateFields().then((vals) => {
//       const newDoc: DocumentCard = {
//         id: `doc_${Date.now()}`,
//         title: vals.title,
//         description: vals.description ?? "",
//         color: vals.color ?? CARD_COLORS[docs.length % CARD_COLORS.length],
//         status: "pending",
//         template: vals.template ?? "",
//       };
//       setDocs((ds) => [...ds, newDoc]);
//       addForm.resetFields();
//       setAddModal(false);
//     });
//   };

//   const docStatusMap = {
//     pending: { color: "#94a3b8", label: "Pending", icon: <ClockCircleOutlined /> },
//     generated: { color: "#1677ff", label: "Generated", icon: <FileDoneOutlined /> },
//     issued: { color: "#10b981", label: "Issued", icon: <CheckCircleOutlined /> },
//   };

//   return (
//     <div>
//       {/* Employee context */}
//       {selectedRecord && (
//         <Alert
//           type="info"
//           showIcon
//           style={{ marginBottom: 16, borderRadius: 8 }}
//           message={
//             <Space>
//               <Text strong>Documents for: {selectedRecord.employee_name}</Text>
//               <Tag color={STATUS_COLOR[selectedRecord.status] ?? "default"} style={{ fontSize: 11 }}>
//                 {selectedRecord.status_display}
//               </Tag>
//             </Space>
//           }
//         />
//       )}

//       <div
//         style={{
//           marginBottom: 16,
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//         }}
//       >
//         <div>
//           <Text strong style={{ fontSize: 15 }}>
//             Offboarding Documents
//           </Text>
//           <Text
//             type="secondary"
//             style={{ display: "block", fontSize: 12, marginTop: 2 }}
//           >
//             Standard documents issued to departing employees. Preview, generate, and issue each document.
//           </Text>
//         </div>
//         <Button
//           icon={<PlusOutlined />}
//           onClick={() => setAddModal(true)}
//           style={{ borderRadius: 8 }}
//         >
//           Add Document
//         </Button>
//       </div>

//       <Row gutter={[16, 16]}>
//         {docs.map((doc) => {
//           const dStatus = docStatusMap[doc.status];
//           return (
//             <Col xs={24} md={8} key={doc.id}>
//               <Card
//                 style={{
//                   borderRadius: 12,
//                   border: `1px solid ${doc.color}33`,
//                   height: "100%",
//                   ...zoomBaseStyle,
//                 }}
//                 styles={{ body: { padding: 0 } }}
//                 hoverable
//                 {...zoomHoverProps}
//               >
//                 <div
//                   style={{
//                     height: 5,
//                     background: doc.color,
//                     borderRadius: "12px 12px 0 0",
//                   }}
//                 />
//                 <div style={{ padding: "20px 18px" }}>
//                   {/* Delete button */}
//                   <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: -8 }}>
//                     <Popconfirm
//                       title="Remove this document card?"
//                       onConfirm={() => deleteDoc(doc.id)}
//                       okButtonProps={{ danger: true }}
//                     >
//                       <Button
//                         size="small"
//                         danger
//                         type="text"
//                         icon={<DeleteOutlined />}
//                       />
//                     </Popconfirm>
//                   </div>
//                   {/* Title */}
//                   <div style={{ textAlign: "center", marginBottom: 16 }}>
//                     <Text
//                       strong
//                       style={{ fontSize: 15, display: "block", color: doc.color }}
//                     >
//                       {doc.title}
//                     </Text>
//                     <Text
//                       type="secondary"
//                       style={{ fontSize: 12, display: "block", marginTop: 4 }}
//                     >
//                       {doc.description}
//                     </Text>
//                   </div>

//                   {/* Status */}
//                   <div
//                     style={{
//                       textAlign: "center",
//                       marginBottom: 16,
//                     }}
//                   >
//                     <Tag
//                       style={{
//                         borderColor: dStatus.color,
//                         color: dStatus.color,
//                         background: `${dStatus.color}15`,
//                         fontSize: 12,
//                         padding: "2px 10px",
//                       }}
//                     >
//                       {dStatus.label}
//                     </Tag>
//                   </div>

//                   {/* Actions */}
//                   <Space direction="vertical" style={{ width: "100%" }} size={8}>
//                     <Button
//                       block
//                       icon={<EyeOutlined />}
//                       onClick={() => setPreviewDoc(doc)}
//                       style={{ borderRadius: 8 }}
//                     >
//                       Preview Template
//                     </Button>
//                     {doc.status === "pending" && (
//                       <Button
//                         type="primary"
//                         block
//                         icon={<FileDoneOutlined />}
//                         onClick={() => generateDoc(doc.id)}
//                         style={{
//                           borderRadius: 8,
//                           background: doc.color,
//                           borderColor: doc.color,
//                         }}
//                         disabled={!selectedRecord}
//                       >
//                         Generate Document
//                       </Button>
//                     )}
//                     {doc.status === "generated" && (
//                       <>
//                         <Button
//                           block
//                           icon={<SendOutlined />}
//                           onClick={() => sendDocViaGmail(doc)}
//                           disabled={!selectedRecord}
//                           style={{
//                             borderRadius: 8,
//                             borderColor: doc.color,
//                             color: doc.color,
//                           }}
//                         >
//                           Send via Gmail
//                         </Button>
//                         <Button
//                           type="primary"
//                           block
//                           icon={<CheckCircleOutlined />}
//                           onClick={() => markIssued(doc.id)}
//                           style={{
//                             borderRadius: 8,
//                             background: "#10b981",
//                             borderColor: "#10b981",
//                           }}
//                         >
//                           Mark as Issued
//                         </Button>
//                       </>
//                     )}
//                     {doc.status === "issued" && (
//                       <Button
//                         block
//                         disabled
//                         icon={<CheckCircleOutlined />}
//                         style={{ borderRadius: 8 }}
//                       >
//                         Document Issued ✓
//                       </Button>
//                     )}
//                   </Space>
//                 </div>
//               </Card>
//             </Col>
//           );
//         })}
//       </Row>

//       {/* Preview Modal */}
//       <Modal
//         title={
//           <Space>
//             <FileTextOutlined style={{ color: previewDoc?.color }} />
//             {previewDoc?.title} — Template Preview
//           </Space>
//         }
//         open={!!previewDoc}
//         onCancel={() => setPreviewDoc(null)}
//         footer={[
//           <Button key="close" onClick={() => setPreviewDoc(null)}>
//             Close
//           </Button>,
//         ]}
//         width={600}
//       >
//         {previewDoc && (
//           <div style={{ paddingTop: 12 }}>
//             {!selectedRecord && (
//               <Alert
//                 type="warning"
//                 message="Select a resigning employee to auto-fill employee details in the template"
//                 style={{ marginBottom: 16, borderRadius: 8 }}
//               />
//             )}
//             <div
//               style={{
//                 padding: "20px 24px",
//                 background: "var(--bms-surface-2,#f8fafc)",
//                 borderRadius: 10,
//                 border: "1px solid var(--bms-border,#e8edf3)",
//                 lineHeight: 1.8,
//                 fontSize: 13,
//                 color: "var(--bms-text,#1a2332)",
//                 whiteSpace: "pre-wrap",
//               }}
//             >
//               {fillTemplate(previewDoc.template)}
//             </div>
//           </div>
//         )}
//       </Modal>

//       {/* Add Document Card Modal */}
//       <Modal
//         title="Add Document"
//         open={addModal}
//         onCancel={() => setAddModal(false)}
//         onOk={addDoc}
//         okText="Add"
//         destroyOnClose
//         width={560}
//       >
//         <Form form={addForm} layout="vertical" style={{ marginTop: 16 }}>
//           <Row gutter={16}>
//             <Col span={24}>
//               <Form.Item
//                 name="title"
//                 label="Document Title"
//                 rules={[{ required: true }]}
//               >
//                 <Input placeholder="e.g. No Dues Certificate" />
//               </Form.Item>
//             </Col>
//           </Row>
//           <Form.Item name="color" label="Color">
//             <Select
//               options={CARD_COLORS.map((c) => ({
//                 value: c,
//                 label: (
//                   <Space>
//                     <span
//                       style={{
//                         display: "inline-block",
//                         width: 14,
//                         height: 14,
//                         borderRadius: 4,
//                         background: c,
//                       }}
//                     />
//                     {c}
//                   </Space>
//                 ),
//               }))}
//               placeholder="Pick colour"
//             />
//           </Form.Item>
//           <Form.Item name="description" label="Description">
//             <Input placeholder="What does this document confirm?" />
//           </Form.Item>
//           <Form.Item
//             name="template"
//             label="Document Template"
//             extra="Use placeholders like [Employee Name], [Last Working Day], [Company Name], [Designation], [Department], [Joining Date], [Employee Code]"
//           >
//             <Input.TextArea rows={5} placeholder="This is to certify that [Employee Name] ..." />
//           </Form.Item>
//         </Form>
//       </Modal>
//     </div>
//   );
// }

// // ─── Detail Modal ──────────────────────────────────────────────────────────
// function ResignationDetailModal({
//   record,
//   clearanceStatus,
//   interviewStatus,
//   documentsStatus,
//   open,
//   onClose,
// }: {
//   record: OffboardingRecord | null;
//   clearanceStatus?: { label: string; color: string; percent: number };
//   interviewStatus?: { label: string; color: string };
//   documentsStatus?: { label: string; color: string };
//   open: boolean;
//   onClose: () => void;
// }) {
//   if (!record) return null;
//   const sb = STATUS_COLOR[record.status] ?? "default";

//   const defaultClearance = { label: "Not Started", color: "#94a3b8", percent: 0 };
//   const defaultInterview = { label: "Not Sent", color: "#94a3b8" };
//   const defaultDocs = { label: "Not Generated", color: "#94a3b8" };

//   const cl = clearanceStatus ?? defaultClearance;
//   const iv = interviewStatus ?? defaultInterview;
//   const dc = documentsStatus ?? defaultDocs;

//   return (
//     <Modal
//       title={
//         <Space>
//           <LogoutOutlined style={{ color: "#1677ff" }} />
//           Resignation Details
//         </Space>
//       }
//       open={open}
//       onCancel={onClose}
//       footer={[
//         <Button key="close" onClick={onClose}>
//           Close
//         </Button>,
//       ]}
//       width={600}
//     >
//       <div style={{ paddingTop: 12 }}>
//         <Space style={{ marginBottom: 16 }}>
//           <Avatar size={48} icon={<UserOutlined />} style={{ background: "#6366f1" }} />
//           <div>
//             <Text strong style={{ fontSize: 15, display: "block" }}>
//               {record.employee_name}
//             </Text>
//             <Tag color={sb}>{record.status_display}</Tag>
//           </div>
//         </Space>
//         <Divider style={{ margin: "12px 0" }} />
//         <Row gutter={[16, 12]}>
//           <Col span={12}>
//             <Text type="secondary" style={{ fontSize: 11 }}>
//               Resignation Date
//             </Text>
//             <Text strong style={{ display: "block", fontSize: 13 }}>
//               {record.resignation_date
//                 ? dayjs(record.resignation_date).format("DD MMM YYYY")
//                 : "—"}
//             </Text>
//           </Col>
//           <Col span={12}>
//             <Text type="secondary" style={{ fontSize: 11 }}>
//               Last Working Day
//             </Text>
//             <Text strong style={{ display: "block", fontSize: 13 }}>
//               {record.last_working_day
//                 ? dayjs(record.last_working_day).format("DD MMM YYYY")
//                 : record.resignation_date
//                 ? `${dayjs(record.resignation_date).add(90, "day").format("DD MMM YYYY")} (est.)`
//                 : "—"}
//             </Text>
//           </Col>
//           <Col span={24}>
//             <Text type="secondary" style={{ fontSize: 11 }}>
//               Reason
//             </Text>
//             <Text style={{ display: "block", fontSize: 13, marginTop: 2 }}>
//               {record.reason || "No reason provided"}
//             </Text>
//           </Col>
//           {record.remarks && (
//             <Col span={24}>
//               <Text type="secondary" style={{ fontSize: 11 }}>
//                 Remarks
//               </Text>
//               <Text style={{ display: "block", fontSize: 13, marginTop: 2 }}>
//                 {record.remarks}
//               </Text>
//             </Col>
//           )}
//         </Row>

//         <Divider style={{ margin: "16px 0 12px" }} />
//         <Text strong style={{ fontSize: 13, display: "block", marginBottom: 10 }}>
//           Offboarding Stage Status
//         </Text>
//         <Row gutter={[12, 12]}>
//           <Col span={8}>
//             <div
//               style={{
//                 padding: "10px 12px",
//                 borderRadius: 8,
//                 border: "1px solid var(--bms-border,#e8edf3)",
//                 background: "var(--bms-surface-2,#f8fafc)",
//                 textAlign: "center",
//               }}
//             >
//               <Text style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 6 }}>
//                 Clearance
//               </Text>
//               <Tag
//                 style={{
//                   borderColor: cl.color,
//                   color: cl.color,
//                   background: `${cl.color}15`,
//                   fontSize: 11,
//                 }}
//               >
//                 {cl.label}
//               </Tag>
//               <Progress
//                 percent={cl.percent}
//                 size="small"
//                 strokeColor={cl.color}
//                 showInfo={false}
//                 style={{ marginTop: 8 }}
//               />
//             </div>
//           </Col>
//           <Col span={8}>
//             <div
//               style={{
//                 padding: "10px 12px",
//                 borderRadius: 8,
//                 border: "1px solid var(--bms-border,#e8edf3)",
//                 background: "var(--bms-surface-2,#f8fafc)",
//                 textAlign: "center",
//               }}
//             >
//               <Text style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 6 }}>
//                 Exit Interview
//               </Text>
//               <Tag
//                 style={{
//                   borderColor: iv.color,
//                   color: iv.color,
//                   background: `${iv.color}15`,
//                   fontSize: 11,
//                 }}
//               >
//                 {iv.label}
//               </Tag>
//             </div>
//           </Col>
//           <Col span={8}>
//             <div
//               style={{
//                 padding: "10px 12px",
//                 borderRadius: 8,
//                 border: "1px solid var(--bms-border,#e8edf3)",
//                 background: "var(--bms-surface-2,#f8fafc)",
//                 textAlign: "center",
//               }}
//             >
//               <Text style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 6 }}>
//                 Documents
//               </Text>
//               <Tag
//                 style={{
//                   borderColor: dc.color,
//                   color: dc.color,
//                   background: `${dc.color}15`,
//                   fontSize: 11,
//                 }}
//               >
//                 {dc.label}
//               </Tag>
//             </div>
//           </Col>
//         </Row>
//       </div>
//     </Modal>
//   );
// }

// // ─── Employee: Submit Resignation ──────────────────────────────────────────
// function SubmitResignationTab() {
//   const [form] = Form.useForm();
//   const qc = useQueryClient();
//   const currentUser = useAuthStore((s) => s.user);
//   const [noticeDays] = useState(90); // default notice period

//   const { data: existing, isLoading } = useQuery({
//     queryKey: ["offboarding-mine"],
//     queryFn: () =>
//       offboardingApi
//         .list({ employee: currentUser?.id ?? "" })
//         .then((r) => (Array.isArray(r) ? r[0] : null)),
//     enabled: !!currentUser?.id,
//   });

//   const submitMut = useMutation({
//     mutationFn: (data: any) => offboardingApi.create(data),
//     onSuccess: () => {
//       qc.invalidateQueries({ queryKey: ["offboarding-mine"] });
//       qc.invalidateQueries({ queryKey: ["offboarding-list"] });
//       message.success("Resignation submitted successfully");
//       form.resetFields();
//     },
//     onError: (e: any) => message.error(apiErrorMsg(e, "Failed to submit resignation")),
//   });

//   if (isLoading) {
//     return (
//       <div style={{ textAlign: "center", padding: "60px 0" }}>
//         <Spin />
//       </div>
//     );
//   }

//   if (existing) {
//     const STATUS_ORDER = ["INITIATED", "PREFERENCE_PENDING", "CLEARANCE_PENDING", "INTERVIEW_PENDING", "DOCUMENTS_PENDING", "COMPLETED", "CANCELLED"];
//     const currentIdx = STATUS_ORDER.indexOf(existing.status);
//     const isCompleted = existing.status === "COMPLETED";
//     const isCancelled = existing.status === "CANCELLED";

//     const steps = [
//       {
//         key: "INITIATED",
//         label: "Submitted",
//         desc: "Your resignation has been received and is under review.",
//       },
//       {
//         key: "CLEARANCE_PENDING",
//         label: "Clearance",
//         desc: "Department clearances are being completed.",
//       },
//       {
//         key: "INTERVIEW_PENDING",
//         label: "Exit Interview",
//         desc: "Your exit interview questions have been sent. Please respond.",
//       },
//       {
//         key: "DOCUMENTS_PENDING",
//         label: "Documents",
//         desc: "Your experience/relieving letters are being prepared.",
//       },
//       {
//         key: "COMPLETED",
//         label: "Completed",
//         desc: "Resignation process successfully completed.",
//       },
//     ];

//     return (
//       <div style={{ maxWidth: 620, margin: "0 auto", paddingTop: 20 }}>
//         {isCompleted ? (
//           <div style={{
//             textAlign: "center",
//             padding: "40px 24px",
//             background: "linear-gradient(135deg, rgba(16,185,129,0.07), rgba(52,211,153,0.05))",
//             borderRadius: 16,
//             border: "1px solid rgba(16,185,129,0.2)",
//             marginBottom: 24,
//           }}>
//             <Text strong style={{ fontSize: 20, display: "block", color: "#10b981", marginBottom: 8 }}>
//               Resignation Process Completed
//             </Text>
//             <Text type="secondary" style={{ fontSize: 13 }}>
//               All stages are complete. Your experience and relieving letters have been issued. We wish you all the best in your future endeavors!
//             </Text>
//           </div>
//         ) : isCancelled ? (
//           <Alert type="error" message="Your resignation has been cancelled or rejected." showIcon style={{ marginBottom: 16, borderRadius: 8 }} />
//         ) : null}

//         {/* Step tracker */}
//         <Card style={{ borderRadius: 12, border: "1px solid var(--bms-border,#e8edf3)", marginBottom: 16 }}>
//           <div style={{ marginBottom: 16 }}>
//             <Text strong style={{ fontSize: 15 }}>Resignation Progress</Text>
//             <Text type="secondary" style={{ display: "block", fontSize: 12, marginTop: 2 }}>
//               Track where your resignation is in the process
//             </Text>
//           </div>
//           <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
//             {steps.map((step, i) => {
//               const stepIdx = STATUS_ORDER.indexOf(step.key);
//               const isDone = currentIdx > stepIdx || isCompleted;
//               const isActive = STATUS_ORDER.indexOf(existing.status) === stepIdx ||
//                 (step.key === "INITIATED" && ["INITIATED", "PREFERENCE_PENDING"].includes(existing.status));
//               return (
//                 <div key={step.key} style={{ display: "flex", gap: 14, position: "relative" }}>
//                   {/* Connector line */}
//                   {i < steps.length - 1 && (
//                     <div style={{
//                       position: "absolute",
//                       left: 18,
//                       top: 38,
//                       width: 2,
//                       height: 36,
//                       background: isDone ? "#10b981" : "#e2e8f0",
//                       transition: "background 0.3s",
//                     }} />
//                   )}
//                   {/* Circle */}
//                   <div style={{
//                     width: 38,
//                     height: 38,
//                     borderRadius: "50%",
//                     background: isDone ? "#10b981" : isActive ? "#6366f1" : "#f1f5f9",
//                     border: isActive ? "3px solid #6366f1" : "2px solid " + (isDone ? "#10b981" : "#e2e8f0"),
//                     display: "flex",
//                     alignItems: "center",
//                     justifyContent: "center",
//                     fontSize: isDone ? 16 : 18,
//                     flexShrink: 0,
//                     boxShadow: isActive ? "0 0 0 4px rgba(99,102,241,0.15)" : "none",
//                     transition: "all 0.3s",
//                     zIndex: 1,
//                   }}>
//                     {isDone && <CheckCircleOutlined style={{ color: "#fff", fontSize: 16 }} />}
//                   </div>
//                   {/* Content */}
//                   <div style={{ paddingBottom: 24, flex: 1 }}>
//                     <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
//                       <Text strong style={{
//                         fontSize: 13,
//                         color: isDone ? "#10b981" : isActive ? "#6366f1" : "#94a3b8",
//                       }}>
//                         {step.label}
//                       </Text>
//                       {isActive && <Tag color="purple" style={{ fontSize: 10, padding: "0 6px" }}>Current</Tag>}
//                       {isDone && <Tag color="green" style={{ fontSize: 10, padding: "0 6px" }}>✓ Done</Tag>}
//                     </div>
//                     {isActive && (
//                       <Text type="secondary" style={{ fontSize: 12 }}>{step.desc}</Text>
//                     )}
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         </Card>

//         {/* Info card */}
//         <Card style={{ borderRadius: 12, border: "1px solid var(--bms-border,#e8edf3)" }}>
//           <Space style={{ marginBottom: 12 }}>
//             <Avatar size={44} icon={<UserOutlined />} style={{ background: "#6366f1" }} />
//             <div>
//               <Text strong style={{ fontSize: 14, display: "block" }}>{currentUser?.full_name || "You"}</Text>
//               <Tag color={STATUS_COLOR[existing.status] ?? "default"} style={{ fontSize: 12, padding: "2px 10px" }}>
//                 {existing.status_display}
//               </Tag>
//             </div>
//           </Space>
//           <Divider style={{ margin: "12px 0" }} />
//           <Row gutter={[16, 10]}>
//             <Col span={12}>
//               <Text type="secondary" style={{ fontSize: 11 }}>Submitted On</Text>
//               <Text strong style={{ display: "block", fontSize: 13 }}>
//                 {dayjs(existing.created_at).format("DD MMM YYYY")}
//               </Text>
//             </Col>
//             <Col span={12}>
//               <Text type="secondary" style={{ fontSize: 11 }}>Resignation Date</Text>
//               <Text strong style={{ display: "block", fontSize: 13 }}>
//                 {existing.resignation_date ? dayjs(existing.resignation_date).format("DD MMM YYYY") : "—"}
//               </Text>
//             </Col>
//             {existing.last_working_day && (
//               <Col span={12}>
//                 <Text type="secondary" style={{ fontSize: 11 }}>Last Working Day</Text>
//                 <Text strong style={{ display: "block", fontSize: 13, color: "#ef4444" }}>
//                   {dayjs(existing.last_working_day).format("DD MMM YYYY")}
//                 </Text>
//               </Col>
//             )}
//             {existing.reason && (
//               <Col span={24}>
//                 <Text type="secondary" style={{ fontSize: 11 }}>Reason</Text>
//                 <Text style={{ display: "block", fontSize: 13, marginTop: 2 }}>{existing.reason}</Text>
//               </Col>
//             )}
//           </Row>
//         </Card>
//       </div>
//     );
//   }

//   return (
//     <div style={{ maxWidth: 580, margin: "0 auto", paddingTop: 8 }}>
//       <Card
//         style={{
//           borderRadius: 12,
//           border: "1px solid var(--bms-border,#e8edf3)",
//         }}
//       >
//         <div style={{ marginBottom: 20 }}>
//           <Text strong style={{ fontSize: 15 }}>
//             Submit Resignation
//           </Text>
//           <Text
//             type="secondary"
//             style={{ display: "block", fontSize: 12, marginTop: 4 }}
//           >
//             Please ensure you have discussed this with your manager before
//             submitting.
//           </Text>
//         </div>
//         <Form
//           form={form}
//           layout="vertical"
//           onFinish={(values) => {
//             submitMut.mutate({
//               employee: currentUser?.id,
//               resignation_date: values.resignation_date
//                 ? dayjs(values.resignation_date).format("YYYY-MM-DD")
//                 : null,
//               last_working_day: values.last_working_day
//                 ? dayjs(values.last_working_day).format("YYYY-MM-DD")
//                 : null,
//               reason: values.reason,
//               remarks: values.remarks ?? "",
//             });
//           }}
//         >
//           <Row gutter={16}>
//             <Col span={12}>
//               <Form.Item
//                 name="resignation_date"
//                 label="Resignation Date"
//                 rules={[{ required: true, message: "Required" }]}
//               >
//                 <DatePicker
//                   style={{ width: "100%" }}
//                   format="DD MMM YYYY"
//                   disabledDate={(d) => d && d < dayjs().startOf("day")}
//                   onChange={(date) => {
//                     if (date) {
//                       const lastDay = date.add(noticeDays, "day");
//                       form.setFieldValue("last_working_day", lastDay);
//                     }
//                   }}
//                 />
//               </Form.Item>
//             </Col>
//             <Col span={12}>
//               <Form.Item
//                 name="last_working_day"
//                 label={
//                   <span>
//                     Last Working Day{" "}
//                     <Text type="secondary" style={{ fontSize: 10 }}>
//                       (auto-calc: {noticeDays}d notice)
//                     </Text>
//                   </span>
//                 }
//               >
//                 <DatePicker
//                   style={{ width: "100%" }}
//                   format="DD MMM YYYY"
//                   disabledDate={(d) => d && d < dayjs().startOf("day")}
//                 />
//               </Form.Item>
//             </Col>
//           </Row>
//           <Form.Item
//             name="reason"
//             label="Reason for Leaving"
//             rules={[{ required: true, message: "Please provide a reason" }]}
//           >
//             <Input.TextArea
//               rows={4}
//               placeholder="Please describe your reason for leaving..."
//               style={{ borderRadius: 8 }}
//             />
//           </Form.Item>
//           <Form.Item name="remarks" label="Additional Remarks">
//             <Input.TextArea
//               rows={2}
//               placeholder="Any additional information..."
//               style={{ borderRadius: 8 }}
//             />
//           </Form.Item>
//           <Form.Item style={{ marginBottom: 0 }}>
//             <Button
//               type="primary"
//               htmlType="submit"
//               loading={submitMut.isPending}
//               danger
//               block
//               style={{ borderRadius: 8, height: 40, fontSize: 14 }}
//             >
//               Submit Resignation
//             </Button>
//           </Form.Item>
//         </Form>
//       </Card>
//     </div>
//   );
// }

// // ─── Main Page ─────────────────────────────────────────────────────────────
// export default function OffboardingPage() {
//   const [activeTab, setActiveTab] = useState("resignations");
//   const [detailRecord, setDetailRecord] = useState<OffboardingRecord | null>(null);
//   const [selectedRecord, setSelectedRecord] = useState<OffboardingRecord | null>(null);
//   const currentUser = useAuthStore((s) => s.user);
//   const permissions = useAuthStore((s) => s.permissions);

//   // HR check: staff, superuser, or has explicit offboarding view permission
//   const isHR =
//     currentUser?.is_staff ||
//     currentUser?.is_superuser ||
//     permissions.includes(PERMS.HRMS_OFFBOARDING_VIEW as never) ||
//     permissions.includes("pmt.hrms.offboarding.view" as never);

//   // Called when a resignation is approved — takes HR straight to the Clearance tab
//   const handleApprove = (record: OffboardingRecord) => {
//     setSelectedRecord(record);
//     setActiveTab("clearance");
//   };

//   // Called when a resignation row is clicked — takes HR straight to the Clearance tab
//   const handleRowClick = (record: OffboardingRecord) => {
//     setSelectedRecord(record);
//     setActiveTab("clearance");
//   };

//   // Called when all clearance cards for the selected employee are cleared —
//   // advances the top status line and jumps HR to the Exit Interview tab
//   const handleClearanceComplete = () => {
//     setSelectedRecord((prev) =>
//       prev ? { ...prev, status: "INTERVIEW_PENDING", status_display: "Exit Interview Pending" } as OffboardingRecord : prev
//     );
//     setActiveTab("exit-interview");
//     message.success("All clearances completed — moved to Exit Interview");
//   };

//   const handleClearRecord = () => {
//     setSelectedRecord(null);
//     setActiveTab("resignations");
//   };

//   const hrItems = [
//     {
//       key: "resignations",
//       label: "Resignations",
//       children: (
//         <ResignationList
//           onView={(r) => setDetailRecord(r)}
//           onSelect={() => {}}
//           onApprove={handleApprove}
//           onRowClick={handleRowClick}
//         />
//       ),
//     },
//     {
//       key: "preference",
//       label: "Preference Settings",
//       children: <PreferenceTab />,
//     },
//     {
//       key: "clearance",
//       label: "Clearance",
//       children: <ClearanceTab selectedRecord={selectedRecord} onAllCleared={handleClearanceComplete} />,
//     },
//     {
//       key: "exit-interview",
//       label: "Exit Interview",
//       children: <ExitInterviewTab selectedRecord={selectedRecord} />,
//     },
//     {
//       key: "documents",
//       label: "Documents",
//       children: <DocumentsTab selectedRecord={selectedRecord} />,
//     },
//   ];

//   const employeeItems = [
//     {
//       key: "resign",
//       label: "My Resignation",
//       children: <SubmitResignationTab />,
//     },
//   ];

//   const items = isHR ? hrItems : employeeItems;

//   return (
//     <div>
//       <div style={{ marginBottom: 20 }}>
//         <Space align="center">
//           <Title level={3} style={{ margin: 0, color: "var(--bms-text)" }}>
//             Offboarding
//           </Title>
//           {isHR && (
//             <Tag
//               color="blue"
//               style={{ borderRadius: 20, fontWeight: 600, fontSize: 11 }}
//             >
//               HR View
//             </Tag>
//           )}
//         </Space>
//         <Text type="secondary" style={{ display: "block", marginTop: 4, fontSize: 13 }}>
//           {isHR
//             ? "Manage resignations, configure offboarding preferences, and track clearance"
//             : "Submit and track your resignation"}
//         </Text>
//       </div>

//       {/* Selected employee banner + stage status */}
//       {isHR && selectedRecord && (
//         <>
//           <EmployeeBanner record={selectedRecord} onClear={handleClearRecord} />
//           <StageStatusBanner record={selectedRecord} />
//         </>
//       )}

//       <Card
//         style={{ borderRadius: 10, border: "1px solid var(--bms-border,#e8edf3)" }}
//         styles={{ body: { padding: "0 24px 24px" } }}
//       >
//         <Tabs
//           activeKey={activeTab}
//           onChange={setActiveTab}
//           items={items}
//           destroyInactiveTabPane
//         />
//       </Card>

//       <ResignationDetailModal
//         record={detailRecord}
//         open={!!detailRecord}
//         onClose={() => setDetailRecord(null)}
//       />
//     </div>
//   );
// }






import { useState, useEffect, useMemo } from "react";
import {
  Typography, Tabs, Space, Table, Tag, Button, Card, Modal,
  Form, Input, Select, DatePicker, InputNumber, Divider, Tooltip,
  Avatar, Badge, Popconfirm, message, Row, Col, Switch, Empty,
  Spin, Checkbox, Progress, Alert,
} from "antd";
import {
  LogoutOutlined, EyeOutlined, CheckOutlined, CloseOutlined,
  PlusOutlined, EditOutlined, SaveOutlined, UserOutlined,
  DeleteOutlined, ArrowRightOutlined, MailOutlined,
  FileTextOutlined, SendOutlined, ArrowLeftOutlined, CheckCircleOutlined,
  ClockCircleOutlined, SyncOutlined, FileDoneOutlined, BellOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { offboardingApi, type OffboardingRecord } from "@/services/offboarding";
import { get, post, patch, put } from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { apiErrorMsg } from "@/utils/apiError";
import { employeeApi } from "@/services/employees";
import { PERMS } from "@/constants/permissions";

const { Title, Text } = Typography;
const { Option } = Select;

// ─── Zoom-on-hover helper style ────────────────────────────────────────────
const zoomHoverProps = {
  onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.transform = "scale(1.06)";
    e.currentTarget.style.zIndex = "5";
    e.currentTarget.style.position = "relative";
    e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.18)";
  },
  onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.transform = "scale(1)";
    e.currentTarget.style.boxShadow = "";
  },
};

const zoomBaseStyle: React.CSSProperties = {
  transition: "transform 0.2s ease, box-shadow 0.2s ease",
};

// ─── Status helpers ────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  INITIATED: "blue",
  PREFERENCE_PENDING: "orange",
  CLEARANCE_PENDING: "purple",
  INTERVIEW_PENDING: "cyan",
  DOCUMENTS_PENDING: "gold",
  COMPLETED: "green",
  CANCELLED: "red",
};

// ─── Global in-memory stores (simulate backend) ───────────────────────────
// ownerNotifications: { [ownerId]: ClearanceTask[] }
// clearanceReports:   { [offboardingId_cardId]: { report: string; owner_name: string; submitted_at: string } }
// clearanceStatuses:  { [offboardingId_cardId]: "pending"|"in_progress"|"completed" }

type ClearanceTask = {
  id: string;            // offboardingId_cardId
  offboarding_id: string;
  card_id: string;
  card_title: string;
  employee_name: string;
  items: string[];
  notified_at: string;
  checkedItems: boolean[];
};

type ClearanceReport = {
  report: string;
  owner_name: string;
  submitted_at: string;
  card_title: string;
};

// Simple global state — in a real app this would be React context / Zustand / API
const _ownerNotifications: Record<string, ClearanceTask[]> = {};
const _clearanceReports: Record<string, ClearanceReport> = {};
const _clearanceStatuses: Record<string, "pending" | "in_progress" | "completed"> = {};

function notifyOwner(ownerId: string, task: ClearanceTask) {
  if (!_ownerNotifications[ownerId]) _ownerNotifications[ownerId] = [];
  // avoid duplicate
  const exists = _ownerNotifications[ownerId].find((t) => t.id === task.id);
  if (!exists) _ownerNotifications[ownerId].push(task);
  _clearanceStatuses[task.id] = "in_progress";
}

function getOwnerTasks(ownerId: string): ClearanceTask[] {
  return _ownerNotifications[ownerId] ?? [];
}

function submitClearanceReport(taskId: string, report: string | null, ownerName: string, cardTitle: string) {
  if (report) {
    _clearanceReports[taskId] = {
      report,
      owner_name: ownerName,
      submitted_at: dayjs().format("DD MMM YYYY HH:mm"),
      card_title: cardTitle,
    };
  }
  _clearanceStatuses[taskId] = "completed";
}

function getReportsForOffboarding(offboardingId: string): Record<string, ClearanceReport> {
  const result: Record<string, ClearanceReport> = {};
  Object.entries(_clearanceReports).forEach(([key, val]) => {
    if (key.startsWith(offboardingId + "_")) {
      result[key] = val;
    }
  });
  return result;
}

function getClearanceStatus(taskId: string) {
  return _clearanceStatuses[taskId] ?? "pending";
}

// ─── Employee Selector Banner ──────────────────────────────────────────────
function EmployeeBanner({
  record,
  onClear,
}: {
  record: OffboardingRecord;
  onClear: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "12px 18px",
        background: "linear-gradient(90deg,#1a2845 0%,#0f2042 100%)",
        borderRadius: 10,
        marginBottom: 18,
        border: "1px solid rgba(99,102,241,0.3)",
      }}
    >
      <Avatar
        size={44}
        icon={<UserOutlined />}
        style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text strong style={{ fontSize: 14, color: "#fff", display: "block" }}>
          {record.employee_name}
        </Text>
        <Space size={6} wrap>
          <Tag color={STATUS_COLOR[record.status] ?? "default"} style={{ fontSize: 11 }}>
            {record.status_display}
          </Tag>
          {record.resignation_date && (
            <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
              Resigned: {dayjs(record.resignation_date).format("DD MMM YYYY")}
            </Text>
          )}
          {(record.last_working_day || record.resignation_date) && (
            <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
              LWD: {record.last_working_day
                ? dayjs(record.last_working_day).format("DD MMM YYYY")
                : `${dayjs(record.resignation_date).add(90, "day").format("DD MMM YYYY")} (est.)`}
            </Text>
          )}
        </Space>
      </div>
      <Button
        size="small"
        icon={<ArrowLeftOutlined />}
        onClick={onClear}
        style={{
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.15)",
          color: "#fff",
          borderRadius: 6,
        }}
      >
        Change Employee
      </Button>
    </div>
  );
}

// ─── Stage Status Banner ───────────────────────────────────────────────────
function StageStatusBanner({ record }: { record: OffboardingRecord }) {
  const STATUS_ORDER = ["INITIATED", "PREFERENCE_PENDING", "CLEARANCE_PENDING", "INTERVIEW_PENDING", "DOCUMENTS_PENDING", "COMPLETED", "CANCELLED"];
  const currentIdx = STATUS_ORDER.indexOf(record.status);

  const stageSteps = [
    { label: "Clearance", targetStatus: "CLEARANCE_PENDING", order: 2 },
    { label: "Exit Interview", targetStatus: "INTERVIEW_PENDING", order: 3 },
    { label: "Documents", targetStatus: "DOCUMENTS_PENDING", order: 4 },
    { label: "Completed", targetStatus: "COMPLETED", order: 5 },
  ];

  return (
    <div style={{
      padding: "14px 18px",
      background: "linear-gradient(90deg, rgba(99,102,241,0.07), rgba(139,92,246,0.05))",
      borderRadius: 10,
      border: "1px solid rgba(99,102,241,0.18)",
      marginBottom: 16,
    }}>
      <Text style={{ fontSize: 12, fontWeight: 600, color: "#6366f1", display: "block", marginBottom: 12 }}>
        Current Offboarding Stage — {record.employee_name}
      </Text>
      <div style={{ display: "flex", alignItems: "center", gap: 0, overflowX: "auto" }}>
        {stageSteps.map((step, i) => {
          const stepIdx = STATUS_ORDER.indexOf(step.targetStatus);
          const isDone = currentIdx > stepIdx;
          const isActive = currentIdx === stepIdx;
          return (
            <div key={step.label} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 80 }}>
                <div
                  style={{
                    width: 38, height: 38, borderRadius: "50%",
                    background: isDone ? "#10b981" : isActive ? "#6366f1" : "#e2e8f0",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, marginBottom: 6,
                    boxShadow: isActive ? "0 0 0 4px rgba(99,102,241,0.2)" : "none",
                    ...zoomBaseStyle,
                  }}
                  {...zoomHoverProps}
                />
                <Text style={{
                  fontSize: 10, fontWeight: isActive ? 700 : 500,
                  color: isDone ? "#10b981" : isActive ? "#6366f1" : "#94a3b8",
                  textAlign: "center", whiteSpace: "nowrap",
                }}>
                  {step.label}
                </Text>
                {isActive && (
                  <Tag color="purple" style={{ fontSize: 9, marginTop: 3, padding: "0 4px" }}>In Progress</Tag>
                )}
              </div>
              {i < stageSteps.length - 1 && (
                <div style={{
                  width: 40, height: 2,
                  background: isDone ? "#10b981" : "#e2e8f0",
                  flexShrink: 0, marginBottom: 20, transition: "background 0.3s",
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Reports Viewer Modal ──────────────────────────────────────────────────
function ReportsModal({
  open,
  onClose,
  reports,
  employeeName,
}: {
  open: boolean;
  onClose: () => void;
  reports: Record<string, ClearanceReport>;
  employeeName: string;
}) {
  const entries = Object.entries(reports);
  return (
    <Modal
      title={
        <Space>
          <BellOutlined style={{ color: "#6366f1" }} />
          Clearance Reports — {employeeName}
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={<Button onClick={onClose}>Close</Button>}
      width={560}
    >
      {entries.length === 0 ? (
        <Empty description="No reports submitted yet" style={{ padding: "24px 0" }} />
      ) : (
        <div style={{ paddingTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
          {entries.map(([key, rep]) => (
            <div
              key={key}
              style={{
                padding: "14px 16px",
                borderRadius: 10,
                border: "1px solid rgba(99,102,241,0.2)",
                background: "rgba(99,102,241,0.04)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <Text strong style={{ fontSize: 13, color: "#6366f1" }}>{rep.card_title}</Text>
                <Text type="secondary" style={{ fontSize: 11 }}>{rep.submitted_at}</Text>
              </div>
              <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 4 }}>
                Reported by: <Text strong style={{ fontSize: 11 }}>{rep.owner_name}</Text>
              </Text>
              <div style={{
                padding: "10px 12px",
                borderRadius: 8,
                background: "#fff",
                border: "1px solid #e8edf3",
                fontSize: 13,
                lineHeight: 1.6,
              }}>
                {rep.report}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ─── Resignation List (HR view) ────────────────────────────────────────────
function ResignationList({
  onView,
  onSelect,
  onApprove,
  onRowClick,
}: {
  onView: (record: OffboardingRecord) => void;
  onSelect: (record: OffboardingRecord) => void;
  onApprove: (record: OffboardingRecord) => void;
  onRowClick: (record: OffboardingRecord) => void;
}) {
  const qc = useQueryClient();
  const [reportsModal, setReportsModal] = useState<{ open: boolean; record: OffboardingRecord | null }>({ open: false, record: null });
  const [, forceRender] = useState(0); // to re-render when reports change

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["offboarding-list"],
    queryFn: () => offboardingApi.list(),
  });

  const approveMut = useMutation({
    mutationFn: (id: string) =>
      patch<OffboardingRecord>(`/offboarding/${id}/`, { status: "CLEARANCE_PENDING" }),
    onSuccess: (data, id) => {
      qc.invalidateQueries({ queryKey: ["offboarding-list"] });
      message.success("Resignation approved — moved to Clearance");
      const rec = (records as OffboardingRecord[]).find((r) => r.id === id);
      if (rec) {
        onApprove({ ...rec, status: "CLEARANCE_PENDING", status_display: "Clearance Pending" } as OffboardingRecord);
      }
    },
    onError: (e: any) => message.error(apiErrorMsg(e, "Failed to approve")),
  });

  const rejectMut = useMutation({
    mutationFn: (id: string) =>
      patch<OffboardingRecord>(`/offboarding/${id}/`, { status: "CANCELLED" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["offboarding-list"] });
      message.success("Resignation rejected");
    },
    onError: (e: any) => message.error(apiErrorMsg(e, "Failed to reject")),
  });

  const columns = [
    {
      title: "Employee",
      key: "employee",
      render: (_: any, r: OffboardingRecord) => (
        <Space>
          <Avatar size={32} icon={<UserOutlined />} style={{ background: "#6366f1" }} />
          <div>
            <Text strong style={{ fontSize: 13, display: "block" }}>{r.employee_name}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              Submitted {dayjs(r.created_at).format("DD MMM YYYY")}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Resignation Date",
      dataIndex: "resignation_date",
      key: "resignation_date",
      render: (v: string) => (v ? dayjs(v).format("DD MMM YYYY") : "—"),
    },
    {
      title: "Last Working Day",
      dataIndex: "last_working_day",
      key: "last_working_day",
      render: (v: string, r: OffboardingRecord) => {
        if (v) return dayjs(v).format("DD MMM YYYY");
        if (r.resignation_date) {
          const estimated = dayjs(r.resignation_date).add(90, "day");
          return (
            <Tooltip title="Estimated — backend did not return a Last Working Day for this record">
              <Text type="secondary" style={{ fontStyle: "italic" }}>
                {estimated.format("DD MMM YYYY")} (est.)
              </Text>
            </Tooltip>
          );
        }
        return "—";
      },
    },
    {
      title: "Reason",
      dataIndex: "reason",
      key: "reason",
      ellipsis: true,
      render: (v: string) => (
        v && v.trim()
          ? <Text style={{ fontSize: 12 }}>{v}</Text>
          : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (v: string, r: OffboardingRecord) => (
        <Tag color={STATUS_COLOR[v] ?? "default"}>{r.status_display}</Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 260,
      render: (_: any, r: OffboardingRecord) => {
        const reports = getReportsForOffboarding(r.id);
        const reportCount = Object.keys(reports).length;
        return (
          <Space size={6}>
            <Tooltip title="View details">
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={(e) => { e.stopPropagation(); onView(r); }}
                style={{ borderRadius: 6 }}
              />
            </Tooltip>

            {/* Bell icon — shows report count badge, visible when there are reports */}
            <Tooltip title={reportCount > 0 ? `${reportCount} clearance report(s) from owners` : "No clearance reports yet"}>
              <Badge count={reportCount} size="small">
                <Button
                  size="small"
                  icon={<BellOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setReportsModal({ open: true, record: r });
                    forceRender((n) => n + 1);
                  }}
                  style={{
                    borderRadius: 6,
                    borderColor: reportCount > 0 ? "#6366f1" : undefined,
                    color: reportCount > 0 ? "#6366f1" : undefined,
                  }}
                />
              </Badge>
            </Tooltip>

            {r.status === "INITIATED" && (
              <>
                <Popconfirm
                  title="Approve this resignation?"
                  description="Employee will move to clearance stage."
                  onConfirm={() => approveMut.mutate(r.id)}
                  okText="Approve"
                  okButtonProps={{ style: { background: "#10b981", borderColor: "#10b981" } }}
                >
                  <Button
                    size="small"
                    icon={<CheckOutlined />}
                    onClick={(e) => e.stopPropagation()}
                    style={{ borderRadius: 6, borderColor: "#10b981", color: "#10b981" }}
                    loading={approveMut.isPending}
                  >
                    Approve
                  </Button>
                </Popconfirm>
                <Popconfirm
                  title="Reject this resignation?"
                  onConfirm={() => rejectMut.mutate(r.id)}
                  okText="Reject"
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    size="small"
                    danger
                    icon={<CloseOutlined />}
                    onClick={(e) => e.stopPropagation()}
                    style={{ borderRadius: 6 }}
                    loading={rejectMut.isPending}
                  >
                    Reject
                  </Button>
                </Popconfirm>
              </>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <Text strong style={{ fontSize: 15 }}>Resignation Requests</Text>
          <Text type="secondary" style={{ display: "block", fontSize: 12, marginTop: 2 }}>
            Review and take action. Bell icon shows clearance reports submitted by department owners.
          </Text>
        </div>
        <Tag color="blue" style={{ fontSize: 13, padding: "4px 12px" }}>
          {(records as OffboardingRecord[]).filter((r) => r.status === "INITIATED").length} Pending
        </Tag>
      </div>
      <Table
        columns={columns}
        dataSource={records as OffboardingRecord[]}
        rowKey="id"
        loading={isLoading}
        size="small"
        pagination={{ pageSize: 10 }}
        locale={{ emptyText: <Empty description="No resignations submitted" /> }}
        onRow={(record: OffboardingRecord) => ({
          onClick: () => onRowClick(record),
          style: {
            cursor: "pointer",
            ...(record.status === "INITIATED" ? { background: "rgba(22,119,255,0.03)" } : {}),
          },
        })}
      />
      <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 8 }}>
        Click any row to open that employee's Clearance page. Bell icon shows owner reports.
      </Text>

      {/* Reports modal */}
      <ReportsModal
        open={reportsModal.open}
        onClose={() => setReportsModal({ open: false, record: null })}
        reports={reportsModal.record ? getReportsForOffboarding(reportsModal.record.id) : {}}
        employeeName={reportsModal.record?.employee_name ?? ""}
      />
    </div>
  );
}

// ─── Approval Step / Preference types ─────────────────────────────────────
interface ApprovalStep {
  id: string;
  level: number;
  role: string;
  label: string;
  person_id: string | null;
  person_name: string;
  notify_email: boolean;
  notify_in_app: boolean;
}

interface NoticePeriodRule {
  id: string;
  employment_type: string;
  days: number;
}

interface PreferenceConfig {
  notice_period_rules: NoticePeriodRule[];
  approval_steps: ApprovalStep[];
  allow_waiver: boolean;
  waiver_approver_role: string;
  auto_notify_hr: boolean;
  auto_notify_manager: boolean;
  resignation_form_note: string;
}

const DEFAULT_CONFIG: PreferenceConfig = {
  notice_period_rules: [
    { id: "np1", employment_type: "Permanent", days: 90 },
    { id: "np2", employment_type: "Contract", days: 30 },
    { id: "np3", employment_type: "Probation", days: 7 },
  ],
  approval_steps: [
    { id: "as1", level: 1, role: "Reporting Manager", label: "Line Manager Review", person_id: null, person_name: "", notify_email: true, notify_in_app: true },
    { id: "as2", level: 2, role: "HR Manager", label: "HR Review & Decision", person_id: null, person_name: "", notify_email: true, notify_in_app: true },
  ],
  allow_waiver: true,
  waiver_approver_role: "HR Manager",
  auto_notify_hr: true,
  auto_notify_manager: true,
  resignation_form_note: "Please ensure you have completed all pending handovers before your last working day.",
};

function PreferenceTab() {
  const [config, setConfig] = useState<PreferenceConfig>(DEFAULT_CONFIG);
  const [editingNotice, setEditingNotice] = useState<string | null>(null);
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [addNoticeModal, setAddNoticeModal] = useState(false);
  const [addStepModal, setAddStepModal] = useState(false);
  const [noticeForm] = Form.useForm();
  const [stepForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const [calcEmploymentType, setCalcEmploymentType] = useState<string | undefined>(
    config.notice_period_rules[0]?.employment_type
  );
  const [calcResignationDate, setCalcResignationDate] = useState<dayjs.Dayjs | null>(dayjs());

  const calcNoticeDays = useMemo(() => {
    const rule = config.notice_period_rules.find((r) => r.employment_type === calcEmploymentType);
    return rule?.days ?? 0;
  }, [config.notice_period_rules, calcEmploymentType]);

  const calcLastWorkingDay = useMemo(() => {
    if (!calcResignationDate) return null;
    return calcResignationDate.add(calcNoticeDays, "day");
  }, [calcResignationDate, calcNoticeDays]);

  useEffect(() => {
    if (!calcEmploymentType && config.notice_period_rules.length > 0) {
      setCalcEmploymentType(config.notice_period_rules[0].employment_type);
    }
  }, [config.notice_period_rules, calcEmploymentType]);

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-dropdown"],
    queryFn: () => employeeApi.simpleDropdown(),
  });

  const employeeOptions = useMemo(
    () => employees.map((e: any) => ({ value: e.id, label: `${e.full_name} (${e.employee_code})`, name: e.full_name })),
    [employees]
  );

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    message.success("Preference settings saved");
  };

  const addNoticeRule = () => {
    noticeForm.validateFields().then((vals) => {
      const newRule: NoticePeriodRule = { id: `np_${Date.now()}`, employment_type: vals.employment_type, days: vals.days };
      setConfig((c) => ({ ...c, notice_period_rules: [...c.notice_period_rules, newRule] }));
      noticeForm.resetFields();
      setAddNoticeModal(false);
    });
  };

  const deleteNoticeRule = (id: string) => {
    setConfig((c) => ({ ...c, notice_period_rules: c.notice_period_rules.filter((r) => r.id !== id) }));
  };

  const addApprovalStep = () => {
    stepForm.validateFields().then((vals) => {
      const selectedEmp = employeeOptions.find((e: any) => e.value === vals.person_id);
      const newStep: ApprovalStep = {
        id: `as_${Date.now()}`, level: config.approval_steps.length + 1,
        role: vals.role || selectedEmp?.name || "Custom Approver",
        label: vals.label, person_id: vals.person_id || null,
        person_name: selectedEmp?.name || "", notify_email: vals.notify_email ?? true, notify_in_app: vals.notify_in_app ?? true,
      };
      setConfig((c) => ({ ...c, approval_steps: [...c.approval_steps, newStep] }));
      stepForm.resetFields();
      setAddStepModal(false);
    });
  };

  const deleteStep = (id: string) => {
    setConfig((c) => ({ ...c, approval_steps: c.approval_steps.filter((s) => s.id !== id).map((s, i) => ({ ...s, level: i + 1 })) }));
  };

  const updateStep = (id: string, field: keyof ApprovalStep, value: any) => {
    setConfig((c) => ({ ...c, approval_steps: c.approval_steps.map((s) => s.id === id ? { ...s, [field]: value } : s) }));
  };

  const updateStepPerson = (id: string, personId: string | null) => {
    const emp = employeeOptions.find((e: any) => e.value === personId);
    setConfig((c) => ({
      ...c,
      approval_steps: c.approval_steps.map((s) =>
        s.id === id ? { ...s, person_id: personId, person_name: emp?.name || "", role: emp?.name || s.role } : s
      ),
    }));
  };

  const updateNotice = (id: string, field: keyof NoticePeriodRule, value: any) => {
    setConfig((c) => ({ ...c, notice_period_rules: c.notice_period_rules.map((r) => r.id === id ? { ...r, [field]: value } : r) }));
  };

  const sectionStyle = { marginBottom: 24, borderRadius: 10, border: "1px solid var(--bms-border, #e8edf3)" };
  const headerStyle: React.CSSProperties = {
    padding: "14px 18px", borderBottom: "1px solid var(--bms-border, #e8edf3)",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    background: "var(--bms-surface-2, #f8fafc)", borderRadius: "10px 10px 0 0",
  };

  return (
    <div style={{ maxWidth: 820 }}>
      {/* LWD Calculator */}
      <Card style={sectionStyle} styles={{ body: { padding: 0 } }}>
        <div style={headerStyle}>
          <div>
            <Text strong style={{ fontSize: 14 }}>Last Working Day Calculator</Text>
            <Text type="secondary" style={{ display: "block", fontSize: 12, marginTop: 2 }}>
              Auto-calculates the last working day from resignation date + notice period rule
            </Text>
          </div>
        </div>
        <div style={{ padding: "16px 18px" }}>
          <Row gutter={16} align="bottom">
            <Col span={8}>
              <Text style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Employment Type</Text>
              <Select style={{ width: "100%" }} value={calcEmploymentType} onChange={(v) => setCalcEmploymentType(v)}
                options={config.notice_period_rules.map((r) => ({ value: r.employment_type, label: `${r.employment_type} (${r.days} days)` }))}
                placeholder="Select employment type" />
            </Col>
            <Col span={8}>
              <Text style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Resignation Date</Text>
              <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" value={calcResignationDate} onChange={(d) => setCalcResignationDate(d)} />
            </Col>
            <Col span={8}>
              <Text style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Notice Period</Text>
              <Input readOnly value={`${calcNoticeDays} days`} style={{ width: "100%" }} />
            </Col>
          </Row>
          <Divider style={{ margin: "16px 0" }} />
          <div style={{ padding: "14px 18px", borderRadius: 8, background: "linear-gradient(90deg, rgba(99,102,241,0.08), rgba(139,92,246,0.05))", border: "1px solid rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "space-between", ...zoomBaseStyle }} {...zoomHoverProps}>
            <Text style={{ fontSize: 13, fontWeight: 600, color: "#6366f1" }}>Calculated Last Working Day</Text>
            <Text strong style={{ fontSize: 16, color: "#1a2332" }}>{calcLastWorkingDay ? calcLastWorkingDay.format("DD MMMM YYYY") : "—"}</Text>
          </div>
        </div>
      </Card>

      {/* Notice Period Rules */}
      <Card style={sectionStyle} styles={{ body: { padding: 0 } }}>
        <div style={headerStyle}>
          <div>
            <Text strong style={{ fontSize: 14 }}>Notice Period Rules</Text>
            <Text type="secondary" style={{ display: "block", fontSize: 12, marginTop: 2 }}>Define notice period by employment type</Text>
          </div>
          <Button size="small" icon={<PlusOutlined />} onClick={() => setAddNoticeModal(true)} style={{ borderRadius: 6 }}>Add Rule</Button>
        </div>
        <div style={{ padding: "12px 18px" }}>
          {config.notice_period_rules.map((rule) => (
            <div key={rule.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--bms-border, #f0f4f8)" }}>
              {editingNotice === rule.id ? (
                <>
                  <Input size="small" value={rule.employment_type} onChange={(e) => updateNotice(rule.id, "employment_type", e.target.value)} style={{ width: 160 }} />
                  <InputNumber size="small" value={rule.days} min={1} addonAfter="days" onChange={(v) => updateNotice(rule.id, "days", v ?? 0)} style={{ width: 130 }} />
                  <Button size="small" type="primary" icon={<SaveOutlined />} onClick={() => setEditingNotice(null)} style={{ borderRadius: 6 }}>Save</Button>
                </>
              ) : (
                <>
                  <Tag color="blue" style={{ borderRadius: 6, minWidth: 110, textAlign: "center" }}>{rule.employment_type}</Tag>
                  <Text style={{ fontSize: 13 }}><Text strong>{rule.days}</Text> days notice</Text>
                  <div style={{ flex: 1 }} />
                  <Button size="small" icon={<EditOutlined />} onClick={() => setEditingNotice(rule.id)} style={{ borderRadius: 6 }} />
                  <Popconfirm title="Delete this rule?" onConfirm={() => deleteNoticeRule(rule.id)} okButtonProps={{ danger: true }}>
                    <Button size="small" danger icon={<DeleteOutlined />} style={{ borderRadius: 6 }} />
                  </Popconfirm>
                </>
              )}
            </div>
          ))}
          {config.notice_period_rules.length === 0 && <Empty description="No notice period rules" style={{ padding: "20px 0" }} />}
        </div>
      </Card>

      {/* Approval Flow */}
      <Card style={sectionStyle} styles={{ body: { padding: 0 } }}>
        <div style={headerStyle}>
          <div>
            <Text strong style={{ fontSize: 14 }}>Approval Flow</Text>
            <Text type="secondary" style={{ display: "block", fontSize: 12, marginTop: 2 }}>Levels of approval required</Text>
          </div>
          <Button size="small" icon={<PlusOutlined />} onClick={() => setAddStepModal(true)} style={{ borderRadius: 6 }}>Add Level</Button>
        </div>
        <div style={{ padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 0, overflowX: "auto", paddingBottom: 8 }}>
            <div style={{ textAlign: "center", flexShrink: 0 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px", boxShadow: "0 2px 8px rgba(99,102,241,0.3)" }}>
                <UserOutlined style={{ color: "#fff", fontSize: 18 }} />
              </div>
              <Text style={{ fontSize: 11, color: "var(--bms-text-3,#64748b)" }}>Employee</Text>
            </div>
            {config.approval_steps.map((step, i) => (
              <div key={step.id} style={{ display: "flex", alignItems: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", height: 44, padding: "0 6px", color: "var(--bms-text-3,#94a3b8)" }}>
                  <ArrowRightOutlined />
                </div>
                <div style={{ textAlign: "center", position: "relative", flexShrink: 0, minWidth: 140 }}>
                  {editingStep === step.id ? (
                    <div style={{ border: "1px solid #1677ff", borderRadius: 8, padding: 10, background: "#f0f7ff", width: 200 }}>
                      <Text style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>Label</Text>
                      <Input size="small" value={step.label} onChange={(e) => updateStep(step.id, "label", e.target.value)} placeholder="Label" style={{ marginBottom: 8 }} />
                      <Text style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>Approver Person</Text>
                      <Select size="small" style={{ width: "100%", marginBottom: 8 }} placeholder="Select employee..." showSearch allowClear value={step.person_id || undefined} onChange={(v) => updateStepPerson(step.id, v || null)} filterOption={(input, option) => (option?.label as string ?? "").toLowerCase().includes(input.toLowerCase())} options={employeeOptions} />
                      <div style={{ display: "flex", gap: 8, fontSize: 11, marginBottom: 8 }}>
                        <label style={{ display: "flex", gap: 4 }}><Switch size="small" checked={step.notify_email} onChange={(v) => updateStep(step.id, "notify_email", v)} />Email</label>
                        <label style={{ display: "flex", gap: 4 }}><Switch size="small" checked={step.notify_in_app} onChange={(v) => updateStep(step.id, "notify_in_app", v)} />In-app</label>
                      </div>
                      <Button size="small" type="primary" block onClick={() => setEditingStep(null)}>Done</Button>
                    </div>
                  ) : (
                    <>
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: i === 0 ? "linear-gradient(135deg,#1677ff,#4096ff)" : "linear-gradient(135deg,#10b981,#34d399)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 4px", boxShadow: i === 0 ? "0 2px 8px rgba(22,119,255,0.3)" : "0 2px 8px rgba(16,185,129,0.3)", position: "relative", cursor: "pointer" }} onClick={() => setEditingStep(step.id)}>
                        <Text style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>L{step.level}</Text>
                        <div style={{ position: "absolute", top: -4, right: -4, background: "#fff", borderRadius: "50%", padding: 1 }}>
                          <EditOutlined style={{ fontSize: 9, color: "#1677ff" }} />
                        </div>
                      </div>
                      <Text style={{ fontSize: 11, fontWeight: 600, display: "block", color: "var(--bms-text,#1a2332)" }}>{step.label}</Text>
                      {step.person_name ? (
                        <Space size={4} style={{ justifyContent: "center" }}>
                          <Avatar size={14} icon={<UserOutlined />} style={{ background: "#6366f1" }} />
                          <Text style={{ fontSize: 10, color: "#6366f1", fontWeight: 600 }}>{step.person_name}</Text>
                        </Space>
                      ) : (
                        <Text style={{ fontSize: 10, color: "var(--bms-text-3,#64748b)", display: "block", fontStyle: "italic" }}>{step.role} (click to assign)</Text>
                      )}
                      <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 4 }}>
                        {step.notify_email && <Tooltip title="Email notification"><Tag color="blue" style={{ fontSize: 9, padding: "0 4px", margin: 0 }}>Email</Tag></Tooltip>}
                        {step.notify_in_app && <Tooltip title="In-app notification"><Tag color="purple" style={{ fontSize: 9, padding: "0 4px", margin: 0 }}>App</Tag></Tooltip>}
                      </div>
                      <Popconfirm title="Remove this approval level?" onConfirm={() => deleteStep(step.id)} okButtonProps={{ danger: true }}>
                        <Button size="small" danger type="text" icon={<DeleteOutlined />} style={{ marginTop: 4, fontSize: 11 }} />
                      </Popconfirm>
                    </>
                  )}
                </div>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "flex-start" }}>
              <div style={{ display: "flex", alignItems: "center", height: 44, padding: "0 6px", color: "var(--bms-text-3,#94a3b8)" }}><ArrowRightOutlined /></div>
              <div style={{ textAlign: "center", flexShrink: 0 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#f59e0b,#fbbf24)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px", boxShadow: "0 2px 8px rgba(245,158,11,0.3)" }}>
                  <CheckOutlined style={{ color: "#fff", fontSize: 18 }} />
                </div>
                <Text style={{ fontSize: 11, color: "var(--bms-text-3,#64748b)" }}>Cleared</Text>
              </div>
            </div>
          </div>
          <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 8 }}>Click any level node to edit and assign a real employee as approver</Text>
        </div>
      </Card>

      {/* Notifications & Waiver */}
      <Card style={sectionStyle} styles={{ body: { padding: 0 } }}>
        <div style={headerStyle}><div><Text strong style={{ fontSize: 14 }}>Notifications & Waiver</Text></div></div>
        <div style={{ padding: "16px 18px" }}>
          <Row gutter={[16, 12]}>
            {[
              { key: "auto_notify_hr", label: "Auto-notify HR", desc: "Email HR on submission" },
              { key: "auto_notify_manager", label: "Auto-notify Manager", desc: "Email reporting manager" },
              { key: "allow_waiver", label: "Allow Notice Waiver", desc: "Permit early exit with approval" },
            ].map((item) => (
              <Col span={12} key={item.key}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--bms-border,#e8edf3)", background: "var(--bms-surface,#fff)" }}>
                  <div>
                    <Text style={{ fontSize: 13, fontWeight: 600 }}>{item.label}</Text>
                    <Text type="secondary" style={{ display: "block", fontSize: 11 }}>{item.desc}</Text>
                  </div>
                  <Switch checked={(config as any)[item.key]} onChange={(v) => setConfig((c) => ({ ...c, [item.key]: v }))} />
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </Card>

      {/* Resignation Form Note */}
      <Card style={sectionStyle} styles={{ body: { padding: 0 } }}>
        <div style={headerStyle}><Text strong style={{ fontSize: 14 }}>Resignation Form Note</Text></div>
        <div style={{ padding: "16px 18px" }}>
          <Input.TextArea value={config.resignation_form_note} onChange={(e) => setConfig((c) => ({ ...c, resignation_form_note: e.target.value }))} rows={3} placeholder="Message shown to employees on the resignation form..." style={{ borderRadius: 8 }} />
        </div>
      </Card>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave} style={{ borderRadius: 8, paddingLeft: 24, paddingRight: 24 }}>Save Settings</Button>
      </div>

      <Modal title="Add Notice Period Rule" open={addNoticeModal} onCancel={() => setAddNoticeModal(false)} onOk={addNoticeRule} okText="Add Rule" destroyOnClose>
        <Form form={noticeForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="employment_type" label="Employment Type" rules={[{ required: true }]}><Input placeholder="e.g. Senior Manager, Intern..." /></Form.Item>
          <Form.Item name="days" label="Notice Period (days)" rules={[{ required: true }]}><InputNumber min={1} style={{ width: "100%" }} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="Add Approval Level" open={addStepModal} onCancel={() => setAddStepModal(false)} onOk={addApprovalStep} okText="Add Level" destroyOnClose>
        <Form form={stepForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="label" label="Level Label" rules={[{ required: true }]}><Input placeholder="e.g. Department Head Review" /></Form.Item>
          <Form.Item name="person_id" label="Approver Person">
            <Select placeholder="Search and select employee..." showSearch allowClear filterOption={(input, option) => (option?.label as string ?? "").toLowerCase().includes(input.toLowerCase())} options={employeeOptions} />
          </Form.Item>
          <Form.Item name="role" label="Role / Title (optional)"><Input placeholder="e.g. Department Head" /></Form.Item>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="notify_email" label="Email Notification" initialValue={true}><Select options={[{ value: true, label: "Enabled" }, { value: false, label: "Disabled" }]} /></Form.Item></Col>
            <Col span={12}><Form.Item name="notify_in_app" label="In-App Notification" initialValue={true}><Select options={[{ value: true, label: "Enabled" }, { value: false, label: "Disabled" }]} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}

// ─── Clearance Card types ──────────────────────────────────────────────────
interface ClearanceCard {
  id: string;
  department: string;
  title: string;
  description: string;
  owner_id: string | null;
  owner_name: string;
  color: string;
  items: string[];
  status: "pending" | "in_progress" | "completed";
  checkedItems: boolean[];
}

const DEFAULT_CLEARANCE_CARDS: ClearanceCard[] = [
  { id: "cc_it", department: "IT", title: "IT Clearance", description: "Return all devices, revoke system access, and transfer data", owner_id: null, owner_name: "", color: "#1677ff", items: ["Return laptop and accessories", "Revoke VPN & system access", "Transfer files and handover credentials", "Return access cards & tokens"], status: "pending", checkedItems: [] },
  { id: "cc_asset", department: "Admin", title: "Asset Clearance", description: "Return all company-issued physical assets", owner_id: null, owner_name: "", color: "#f59e0b", items: ["Return ID card & office keys", "Return phone or SIM if company-issued", "Return any other company property"], status: "pending", checkedItems: [] },
  { id: "cc_finance", department: "Finance", title: "Financial Clearance", description: "Settle all outstanding dues and reimbursements", owner_id: null, owner_name: "", color: "#10b981", items: ["Settle pending expense claims", "Return company credit card", "Confirm full & final settlement", "Clear any outstanding loans or advances"], status: "pending", checkedItems: [] },
  { id: "cc_manager", department: "Projects", title: "Manager / Project Clearance", description: "Handover active projects and knowledge transfer", owner_id: null, owner_name: "", color: "#6366f1", items: ["Handover active projects with documentation", "Complete knowledge transfer sessions", "Update project tracker and close tasks", "Notify all stakeholders"], status: "pending", checkedItems: [] },
];

const CARD_COLORS = ["#1677ff", "#f59e0b", "#10b981", "#6366f1", "#ef4444", "#ec4899", "#8b5cf6", "#06b6d4"];

// ─── Clearance Tab ─────────────────────────────────────────────────────────
function ClearanceTab({
  selectedRecord,
  onAllCleared,
}: {
  selectedRecord: OffboardingRecord | null;
  onAllCleared?: () => void;
}) {
  const currentUser = useAuthStore((s) => s.user);
  const [cards, setCards] = useState<ClearanceCard[]>(
    DEFAULT_CLEARANCE_CARDS.map((c) => ({ ...c, checkedItems: c.items.map(() => false) }))
  );
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [addModal, setAddModal] = useState(false);
  const [addForm] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [notifyingId, setNotifyingId] = useState<string | null>(null);
  const [, forceRender] = useState(0);

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-dropdown"],
    queryFn: () => employeeApi.simpleDropdown(),
  });

  const employeeOptions = useMemo(
    () => employees.map((e: any) => ({ value: e.id, label: `${e.full_name} (${e.employee_code || e.email})`, name: e.full_name, email: e.email })),
    [employees]
  );

  // Sync clearance status from global store
  useEffect(() => {
    if (!selectedRecord) return;
    setCards((prev) =>
      prev.map((c) => {
        const taskId = `${selectedRecord.id}_${c.id}`;
        const stored = getClearanceStatus(taskId);
        if (stored === "completed" && c.status !== "completed") {
          return { ...c, status: "completed", checkedItems: c.items.map(() => true) };
        }
        if (stored === "in_progress" && c.status === "pending") {
          return { ...c, status: "in_progress" };
        }
        return c;
      })
    );
  }, [selectedRecord]);

  const handleNotify = async (card: ClearanceCard) => {
    if (!card.owner_id) { message.warning("Please select an owner first"); return; }
    if (!selectedRecord) { message.warning("Please select a resigning employee first"); return; }
    setNotifyingId(card.id);
    const taskId = `${selectedRecord.id}_${card.id}`;
    const task: ClearanceTask = {
      id: taskId,
      offboarding_id: selectedRecord.id,
      card_id: card.id,
      card_title: card.title,
      employee_name: selectedRecord.employee_name,
      items: card.items,
      notified_at: dayjs().format("DD MMM YYYY HH:mm"),
      checkedItems: card.items.map(() => false),
    };
    notifyOwner(card.owner_id, task);
    // simulate API
    try {
      await post("/offboarding/clearance-notify/", {
        owner_id: card.owner_id, clearance_title: card.title,
        employee_name: selectedRecord.employee_name, offboarding_id: selectedRecord.id, items: card.items,
      });
    } catch {}
    updateCard(card.id, { status: "in_progress" });
    message.success(`Notification sent to ${card.owner_name}`);
    setNotifyingId(null);
    forceRender((n) => n + 1);
  };

  const updateCard = (id: string, updates: Partial<ClearanceCard>) => {
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const updateOwner = (cardId: string, ownerId: string | null) => {
    const emp = employeeOptions.find((e: any) => e.value === ownerId);
    setCards((cs) => cs.map((c) => c.id === cardId ? { ...c, owner_id: ownerId, owner_name: emp?.name || "" } : c));
  };

  const deleteCard = (id: string) => {
    setCards((cs) => cs.filter((c) => c.id !== id));
    message.success("Clearance card removed");
  };

  const addCard = () => {
    addForm.validateFields().then((vals) => {
      const emp = employeeOptions.find((e: any) => e.value === vals.owner_id);
      const newCard: ClearanceCard = {
        id: `cc_${Date.now()}`, department: vals.department, title: vals.title,
        description: vals.description ?? "", owner_id: vals.owner_id || null,
        owner_name: emp?.name || "", color: vals.color ?? CARD_COLORS[cards.length % CARD_COLORS.length],
        items: vals.items ? vals.items.split("\n").map((s: string) => s.trim()).filter(Boolean) : [],
        status: "pending", checkedItems: [],
      };
      newCard.checkedItems = newCard.items.map(() => false);
      setCards((cs) => [...cs, newCard]);
      addForm.resetFields();
      setAddModal(false);
    });
  };

  const addItem = (cardId: string) => {
    setCards((cs) => cs.map((c) => c.id === cardId ? { ...c, items: [...c.items, ""], checkedItems: [...c.checkedItems, false] } : c));
  };

  const updateItem = (cardId: string, idx: number, value: string) => {
    setCards((cs) => cs.map((c) => c.id === cardId ? { ...c, items: c.items.map((it, i) => (i === idx ? value : it)) } : c));
  };

  const removeItem = (cardId: string, idx: number) => {
    setCards((cs) => cs.map((c) => c.id === cardId ? { ...c, items: c.items.filter((_, i) => i !== idx), checkedItems: c.checkedItems.filter((_, i) => i !== idx) } : c));
  };

  const toggleCheck = (cardId: string, idx: number, checked: boolean) => {
    setCards((cs) => {
      const updated = cs.map((c) => {
        if (c.id !== cardId) return c;
        const newChecked = c.checkedItems.map((v, i) => (i === idx ? checked : v));
        const allChecked = newChecked.every(Boolean);
        const anyChecked = newChecked.some(Boolean);
        return { ...c, checkedItems: newChecked, status: allChecked ? "completed" as const : anyChecked ? "in_progress" as const : "pending" as const };
      });
      if (updated.every((c) => c.status === "completed")) onAllCleared?.();
      return updated;
    });
  };

  const statusBadge = (s: ClearanceCard["status"]) => ({
    pending: { color: "#94a3b8", label: "Pending", icon: <ClockCircleOutlined /> },
    in_progress: { color: "#f59e0b", label: "In Progress", icon: <SyncOutlined spin /> },
    completed: { color: "#10b981", label: "Completed", icon: <CheckCircleOutlined /> },
  }[s]);

  const overallProgress = useMemo(() => {
    const total = cards.reduce((s, c) => s + c.items.length, 0);
    const done = cards.reduce((s, c) => s + c.checkedItems.filter(Boolean).length, 0);
    return total > 0 ? Math.round((done / total) * 100) : 0;
  }, [cards]);

  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <Text strong style={{ fontSize: 15 }}>Clearance Checklist</Text>
          <Text type="secondary" style={{ display: "block", fontSize: 12, marginTop: 2 }}>
            Assign owners and notify them. Owner marks Done or submits a Report — both complete the clearance.
          </Text>
        </div>
        <Space>
          <Button icon={<PlusOutlined />} onClick={() => setAddModal(true)} style={{ borderRadius: 8 }}>Add Clearance</Button>
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={async () => { setSaving(true); await new Promise((r) => setTimeout(r, 600)); setSaving(false); message.success("Clearance configuration saved"); }} style={{ borderRadius: 8 }}>Save</Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        {cards.map((card) => {
          const isEditing = editingCard === card.id;
          const sb = statusBadge(card.status);
          const checkedCount = card.checkedItems.filter(Boolean).length;
          const taskId = selectedRecord ? `${selectedRecord.id}_${card.id}` : null;
          const liveStatus = taskId ? getClearanceStatus(taskId) : card.status;
          const displayStatus = liveStatus === "completed" ? "completed" : card.status;
          const displaySb = statusBadge(displayStatus);

          return (
            <Col xs={24} sm={12} xl={12} key={card.id}>
              <Card
                style={{ borderRadius: 12, border: `1px solid ${card.color}33`, height: "100%", ...zoomBaseStyle }}
                styles={{ body: { padding: 0 } }}
                hoverable={!isEditing}
                {...zoomHoverProps}
              >
                <div style={{ height: 5, background: card.color, borderRadius: "12px 12px 0 0" }} />
                <div style={{ padding: "16px 18px" }}>
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {isEditing ? (
                        <Input value={card.title} onChange={(e) => updateCard(card.id, { title: e.target.value })} style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }} />
                      ) : (
                        <Text strong style={{ fontSize: 14, display: "block", color: card.color }}>{card.title}</Text>
                      )}
                      <Space size={4} wrap>
                        <Tag style={{ fontSize: 10, padding: "0 6px", borderColor: displaySb.color, color: displaySb.color, background: `${displaySb.color}15` }}>
                          {displaySb.label}
                        </Tag>
                        {card.items.length > 0 && (
                          <Text style={{ fontSize: 10, color: "var(--bms-text-3,#64748b)" }}>{checkedCount}/{card.items.length} done</Text>
                        )}
                      </Space>
                    </div>
                    <Space size={4}>
                      {isEditing ? (
                        <Button size="small" type="primary" icon={<SaveOutlined />} onClick={() => setEditingCard(null)} style={{ background: card.color, borderColor: card.color, borderRadius: 6 }}>Done</Button>
                      ) : (
                        <>
                          <Button size="small" icon={<EditOutlined />} onClick={() => setEditingCard(card.id)} style={{ borderRadius: 6 }} />
                          <Popconfirm title="Remove this clearance card?" onConfirm={() => deleteCard(card.id)} okButtonProps={{ danger: true }}>
                            <Button size="small" danger icon={<DeleteOutlined />} style={{ borderRadius: 6 }} />
                          </Popconfirm>
                        </>
                      )}
                    </Space>
                  </div>

                  {/* Description */}
                  {isEditing ? (
                    <Input.TextArea value={card.description} onChange={(e) => updateCard(card.id, { description: e.target.value })} rows={2} style={{ marginBottom: 10, borderRadius: 6 }} placeholder="Description..." />
                  ) : (
                    <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 12 }}>{card.description}</Text>
                  )}

                  {/* Owner assignment */}
                  <div style={{ padding: "10px 12px", background: "var(--bms-surface-2,#f8fafc)", borderRadius: 8, marginBottom: 12, border: "1px solid var(--bms-border,#e8edf3)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: 600, color: "var(--bms-text-3,#64748b)" }}>Assigned Owner</Text>
                      {card.owner_id && displayStatus !== "completed" && (
                        <Tooltip title="Send clearance task notification to owner">
                          <Button
                            size="small"
                            loading={notifyingId === card.id}
                            onClick={() => handleNotify(card)}
                            style={{ borderRadius: 6, background: `${card.color}15`, borderColor: card.color, color: card.color, fontSize: 11 }}
                          >
                            Notify
                          </Button>
                        </Tooltip>
                      )}
                      {displayStatus === "completed" && (
                        <Tag color="green" style={{ fontSize: 10 }}>✓ Owner Cleared</Tag>
                      )}
                    </div>
                    <Select
                      style={{ width: "100%" }} size="small" placeholder="Search and select owner..."
                      showSearch allowClear value={card.owner_id || undefined}
                      onChange={(v) => updateOwner(card.id, v || null)}
                      filterOption={(input, option) => (option?.label as string ?? "").toLowerCase().includes(input.toLowerCase())}
                      options={employeeOptions}
                    />
                  </div>

                  {/* Checklist */}
                  <Divider style={{ margin: "8px 0", borderColor: `${card.color}33` }} />
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, fontWeight: 600, color: "var(--bms-text-3,#64748b)" }}>CHECKLIST ITEMS</Text>
                      {isEditing && (
                        <Button type="link" size="small" icon={<PlusOutlined />} onClick={() => addItem(card.id)} style={{ fontSize: 11, padding: 0, color: card.color }}>Add item</Button>
                      )}
                    </div>
                    {card.items.map((item, idx) =>
                      isEditing ? (
                        <div key={idx} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                          <Input size="small" value={item} onChange={(e) => updateItem(card.id, idx, e.target.value)} style={{ borderRadius: 6 }} />
                          <Button size="small" danger type="text" icon={<DeleteOutlined />} onClick={() => removeItem(card.id, idx)} />
                        </div>
                      ) : (
                        <div key={idx} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6 }}>
                          <Checkbox checked={card.checkedItems[idx] || false} onChange={(e) => toggleCheck(card.id, idx, e.target.checked)} style={{ marginTop: 1 }} />
                          <Text style={{ fontSize: 12, textDecoration: card.checkedItems[idx] ? "line-through" : "none", color: card.checkedItems[idx] ? "#94a3b8" : undefined }}>{item}</Text>
                        </div>
                      )
                    )}
                    {card.items.length === 0 && !isEditing && <Text type="secondary" style={{ fontSize: 12, fontStyle: "italic" }}>No items — click edit to add</Text>}
                  </div>

                  {!isEditing && card.items.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <Progress percent={Math.round((checkedCount / card.items.length) * 100)} size="small" strokeColor={card.color} trailColor={`${card.color}20`} showInfo={false} />
                    </div>
                  )}
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* Add Clearance Modal */}
      <Modal title="Add Clearance Department" open={addModal} onCancel={() => setAddModal(false)} onOk={addCard} okText="Add" destroyOnClose width={520}>
        <Form form={addForm} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={24}><Form.Item name="title" label="Card Title" rules={[{ required: true }]}><Input placeholder="e.g. Legal Clearance" /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="department" label="Department" rules={[{ required: true }]}><Input placeholder="e.g. Legal" /></Form.Item></Col>
            <Col span={12}>
              <Form.Item name="color" label="Color">
                <Select options={CARD_COLORS.map((c) => ({ value: c, label: <Space><span style={{ display: "inline-block", width: 14, height: 14, borderRadius: 4, background: c }} />{c}</Space> }))} placeholder="Pick colour" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Description"><Input placeholder="What does this clearance cover?" /></Form.Item>
          <Form.Item name="owner_id" label="Owner (select employee)">
            <Select placeholder="Search and select owner..." showSearch allowClear filterOption={(input, option) => (option?.label as string ?? "").toLowerCase().includes(input.toLowerCase())} options={employeeOptions} />
          </Form.Item>
          <Form.Item name="items" label="Checklist Items" extra="One item per line">
            <Input.TextArea rows={4} placeholder={"Return laptop\nRevoke access\n..."} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ─── Owner Task Tab ────────────────────────────────────────────────────────
function OwnerTaskTab() {
  const currentUser = useAuthStore((s) => s.user);
  const [tasks, setTasks] = useState<ClearanceTask[]>([]);
  const [reportModal, setReportModal] = useState<{ open: boolean; task: ClearanceTask | null }>({ open: false, task: null });
  const [reportText, setReportText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Poll owner tasks
  useEffect(() => {
    if (!currentUser?.id) return;
    const refresh = () => setTasks([...getOwnerTasks(currentUser.id)]);
    refresh();
    const timer = setInterval(refresh, 3000);
    return () => clearInterval(timer);
  }, [currentUser?.id]);

  const pendingTasks = tasks.filter((t) => getClearanceStatus(t.id) !== "completed");
  const completedTasks = tasks.filter((t) => getClearanceStatus(t.id) === "completed");

  const handleDone = async (task: ClearanceTask) => {
    setSubmitting(true);
    submitClearanceReport(task.id, null, currentUser?.full_name || "Owner", task.card_title);
    await new Promise((r) => setTimeout(r, 500));
    setTasks([...getOwnerTasks(currentUser!.id)]);
    setSubmitting(false);
    message.success("Clearance marked as completed");
  };

  const handleReport = async () => {
    if (!reportModal.task) return;
    if (!reportText.trim()) { message.warning("Please enter your report details"); return; }
    setSubmitting(true);
    submitClearanceReport(reportModal.task.id, reportText.trim(), currentUser?.full_name || "Owner", reportModal.task.card_title);
    await new Promise((r) => setTimeout(r, 500));
    setTasks([...getOwnerTasks(currentUser!.id)]);
    setSubmitting(false);
    setReportModal({ open: false, task: null });
    setReportText("");
    message.success("Report submitted — HR has been notified");
  };

  const toggleTaskItem = (taskId: string, idx: number, checked: boolean) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const newChecked = t.checkedItems.map((v, i) => (i === idx ? checked : v));
        return { ...t, checkedItems: newChecked };
      })
    );
  };

  if (tasks.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <Empty
          description={
            <div>
              <Text strong style={{ fontSize: 14, display: "block", marginBottom: 4 }}>No Clearance Tasks</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>You have no pending clearance tasks assigned to you.</Text>
            </div>
          }
        />
      </div>
    );
  }

  const TaskCard = ({ task, done }: { task: ClearanceTask; done: boolean }) => {
    const checkedCount = task.checkedItems.filter(Boolean).length;
    const allChecked = checkedCount === task.items.length && task.items.length > 0;
    return (
      <Card
        style={{
          borderRadius: 12,
          border: `1px solid ${done ? "#10b98133" : "rgba(99,102,241,0.2)"}`,
          marginBottom: 16,
          opacity: done ? 0.75 : 1,
        }}
        styles={{ body: { padding: 0 } }}
      >
        <div style={{ height: 5, background: done ? "#10b981" : "#6366f1", borderRadius: "12px 12px 0 0" }} />
        <div style={{ padding: "16px 18px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <Text strong style={{ fontSize: 14, color: done ? "#10b981" : "#6366f1", display: "block" }}>{task.card_title}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Clearance for: <Text strong style={{ fontSize: 12 }}>{task.employee_name}</Text>
              </Text>
              <Text type="secondary" style={{ fontSize: 11, display: "block" }}>Notified: {task.notified_at}</Text>
            </div>
            {done ? (
              <Tag color="green" style={{ fontSize: 12, padding: "4px 10px" }}>✓ Completed</Tag>
            ) : (
              <Tag color="purple" style={{ fontSize: 12, padding: "4px 10px" }}>Pending</Tag>
            )}
          </div>

          {/* Checklist */}
          <div style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 11, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 8 }}>CHECKLIST</Text>
            {task.items.map((item, idx) => (
              <div key={idx} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
                <Checkbox
                  checked={task.checkedItems[idx] || false}
                  disabled={done}
                  onChange={(e) => toggleTaskItem(task.id, idx, e.target.checked)}
                  style={{ marginTop: 1 }}
                />
                <Text style={{ fontSize: 13, textDecoration: (task.checkedItems[idx] || done) ? "line-through" : "none", color: (task.checkedItems[idx] || done) ? "#94a3b8" : undefined }}>
                  {item}
                </Text>
              </div>
            ))}
            {task.items.length > 0 && (
              <Progress
                percent={Math.round((checkedCount / task.items.length) * 100)}
                size="small"
                strokeColor={done ? "#10b981" : "#6366f1"}
                style={{ marginTop: 8 }}
              />
            )}
          </div>

          {/* Actions */}
          {!done && (
            <Row gutter={10}>
              <Col span={12}>
                <Button
                  block
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleDone(task)}
                  loading={submitting}
                  style={{ borderRadius: 8, background: "#10b981", borderColor: "#10b981" }}
                >
                  Done
                </Button>
              </Col>
              <Col span={12}>
                <Button
                  block
                  icon={<FileTextOutlined />}
                  onClick={() => { setReportModal({ open: true, task }); setReportText(""); }}
                  style={{ borderRadius: 8, borderColor: "#f59e0b", color: "#f59e0b" }}
                >
                  Report Issue
                </Button>
              </Col>
            </Row>
          )}
          {!done && (
            <Text type="secondary" style={{ fontSize: 11, display: "block", textAlign: "center", marginTop: 8 }}>
              "Done" completes the clearance. "Report Issue" also completes it and notifies HR.
            </Text>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      {pendingTasks.length > 0 && (
        <>
          <div style={{ marginBottom: 12 }}>
            <Text strong style={{ fontSize: 15 }}>My Clearance Tasks</Text>
            <Text type="secondary" style={{ display: "block", fontSize: 12, marginTop: 2 }}>
              Check all items, then click Done or Report Issue to complete the clearance.
            </Text>
          </div>
          {pendingTasks.map((task) => <TaskCard key={task.id} task={task} done={false} />)}
        </>
      )}

      {completedTasks.length > 0 && (
        <>
          <Divider style={{ margin: "20px 0 12px" }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Completed Tasks</Text>
          </Divider>
          {completedTasks.map((task) => <TaskCard key={task.id} task={task} done />)}
        </>
      )}

      {/* Report Modal */}
      <Modal
        title={
          <Space>
            <FileTextOutlined style={{ color: "#f59e0b" }} />
            Report Issue — {reportModal.task?.card_title}
          </Space>
        }
        open={reportModal.open}
        onCancel={() => setReportModal({ open: false, task: null })}
        onOk={handleReport}
        okText="Submit Report"
        okButtonProps={{ style: { background: "#f59e0b", borderColor: "#f59e0b" }, loading: submitting }}
        destroyOnClose
      >
        <div style={{ paddingTop: 12 }}>
          <Alert
            type="warning"
            showIcon
            message="Submitting this report will complete the clearance and send your notes to HR."
            style={{ marginBottom: 16, borderRadius: 8 }}
          />
          <Text style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>
            Describe the issue:
          </Text>
          <Input.TextArea
            rows={5}
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            placeholder="e.g. The employee has returned all assets. However, the laptop screen is cracked and will need replacement. Estimated repair cost: ₹8,000."
            style={{ borderRadius: 8 }}
          />
        </div>
      </Modal>
    </div>
  );
}

// ─── Exit Interview Tab ─────────────────────────────────────────────────────
interface QuestionCard {
  id: string;
  category: string;
  categoryLabel: string;
  color: string;
  questions: string[];
  targetEmployee: string | null;
}

const DEFAULT_QUESTION_CARDS: QuestionCard[] = [
  { id: "eq_employee", category: "employee", categoryLabel: "Employee", color: "#6366f1", questions: ["What was the primary reason for your decision to leave?", "How would you rate your overall experience at the company? (1-10)", "What did you enjoy most about working here?", "Were there any challenges or issues that could have been addressed differently?", "How was your relationship with your direct manager?", "Would you consider returning to the company in the future?", "Do you have any suggestions for improving the work environment?"], targetEmployee: null },
  { id: "eq_manager", category: "manager", categoryLabel: "Manager", color: "#1677ff", questions: ["How would you describe the team dynamics under your leadership?", "Were you provided with adequate resources to effectively manage your team?", "How satisfied were you with the organizational support for management decisions?", "What challenges did you face in your managerial role?", "How would you rate communication between senior leadership and your team?", "Did you feel empowered to make decisions in your managerial role?", "What improvements would you suggest for management processes?"], targetEmployee: null },
  { id: "eq_pm", category: "pm", categoryLabel: "Project Manager", color: "#f59e0b", questions: ["How were cross-functional collaboration and stakeholder management?", "Were project timelines and budgets realistic and achievable?", "What tools or processes would have improved project delivery?", "How was the support from senior management for project decisions?", "Did you feel team allocation was adequate for project requirements?", "How were escalations and blockers handled at the organizational level?", "What would you suggest to improve project governance?"], targetEmployee: null },
  { id: "eq_hr", category: "hr", categoryLabel: "HR Professional", color: "#10b981", questions: ["How effective were the HR policies and procedures in your day-to-day work?", "Were you provided with adequate HR tools and systems?", "How would you evaluate the company's employee engagement initiatives?", "What changes would you recommend to the recruitment and onboarding process?", "How was the work-life balance culture in the HR department?", "Were performance management processes fair and transparent?", "What HR best practices should the company adopt or improve?"], targetEmployee: null },
];

function ExitInterviewTab({ selectedRecord }: { selectedRecord: OffboardingRecord | null }) {
  const [cards, setCards] = useState<QuestionCard[]>(DEFAULT_QUESTION_CARDS);
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [addModal, setAddModal] = useState(false);
  const [addForm] = Form.useForm();

  const { data: employees = [] } = useQuery({ queryKey: ["employees-dropdown"], queryFn: () => employeeApi.simpleDropdown() });
  const employeeOptions = useMemo(() => employees.map((e: any) => ({ value: e.id, label: `${e.full_name} (${e.email})`, name: e.full_name, email: e.email })), [employees]);

  const updateCard = (id: string, updates: Partial<QuestionCard>) => setCards((cs) => cs.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  const deleteCard = (id: string) => { setCards((cs) => cs.filter((c) => c.id !== id)); message.success("Question card removed"); };

  const addCard = () => {
    addForm.validateFields().then((vals) => {
      const newCard: QuestionCard = {
        id: `eq_${Date.now()}`, category: (vals.categoryLabel || "custom").toLowerCase().replace(/\s+/g, "_"),
        categoryLabel: vals.categoryLabel, color: vals.color ?? CARD_COLORS[cards.length % CARD_COLORS.length],
        questions: vals.questions ? vals.questions.split("\n").map((s: string) => s.trim()).filter(Boolean) : [],
        targetEmployee: null,
      };
      setCards((cs) => [...cs, newCard]);
      addForm.resetFields();
      setAddModal(false);
    });
  };

  const sendViaGmail = (card: QuestionCard) => {
    const targetEmp = employees.find((e: any) => e.id === card.targetEmployee);
    const resigningEmp = selectedRecord?.employee_name || "the employee";
    const toEmail = targetEmp?.email || "";
    const subject = encodeURIComponent(`Exit Interview Questionnaire — ${resigningEmp}`);
    const body = encodeURIComponent(`Dear ${targetEmp?.full_name || "Team Member"},\n\nWe are conducting an exit interview for ${resigningEmp}. As a ${card.categoryLabel}, your insights are valuable.\n\nPlease answer the following questions:\n\n${card.questions.map((q, i) => `${i + 1}. ${q}`).join("\n\n")}\n\nThank you for your time.\n\nHR Team`);
    window.open(`https://mail.google.com/mail/?view=cm&to=${toEmail}&su=${subject}&body=${body}`, "_blank");
  };

  return (
    <div>
      {selectedRecord && (
        <Alert type="info" showIcon style={{ marginBottom: 16, borderRadius: 8 }} message={<Space><Text strong>Exit Interview for: {selectedRecord.employee_name}</Text><Tag color={STATUS_COLOR[selectedRecord.status] ?? "default"} style={{ fontSize: 11 }}>{selectedRecord.status_display}</Tag></Space>} />
      )}
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <Text strong style={{ fontSize: 15 }}>Exit Interview Questions</Text>
          <Text type="secondary" style={{ display: "block", fontSize: 12, marginTop: 2 }}>Default question sets by employee category. Select recipient and send via Gmail.</Text>
        </div>
        <Button icon={<PlusOutlined />} onClick={() => setAddModal(true)} style={{ borderRadius: 8 }}>Add Questions</Button>
      </div>
      <Row gutter={[16, 16]}>
        {cards.map((card) => {
          const isEditing = editingCard === card.id;
          return (
            <Col xs={24} lg={12} key={card.id}>
              <Card style={{ borderRadius: 12, border: `1px solid ${card.color}33`, height: "100%", ...zoomBaseStyle }} styles={{ body: { padding: 0 } }} hoverable {...zoomHoverProps}>
                <div style={{ height: 5, background: card.color, borderRadius: "12px 12px 0 0" }} />
                <div style={{ padding: "16px 18px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 14 }}>
                    <div style={{ flex: 1 }}>
                      <Text strong style={{ fontSize: 14, color: card.color, display: "block" }}>{card.categoryLabel} Questions</Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>{card.questions.length} questions</Text>
                    </div>
                    <Space size={4}>
                      <Button size="small" icon={<EditOutlined />} onClick={() => setEditingCard(isEditing ? null : card.id)} style={{ borderRadius: 6 }} />
                      <Popconfirm title="Remove this question card?" onConfirm={() => deleteCard(card.id)} okButtonProps={{ danger: true }}>
                        <Button size="small" danger icon={<DeleteOutlined />} style={{ borderRadius: 6 }} />
                      </Popconfirm>
                    </Space>
                  </div>
                  <div style={{ padding: "10px 12px", background: "var(--bms-surface-2,#f8fafc)", borderRadius: 8, marginBottom: 12, border: "1px solid var(--bms-border,#e8edf3)" }}>
                    <Text style={{ fontSize: 11, fontWeight: 600, color: "var(--bms-text-3,#64748b)", display: "block", marginBottom: 6 }}>Send to Employee</Text>
                    <Select style={{ width: "100%" }} size="small" placeholder="Select recipient..." showSearch allowClear value={card.targetEmployee || undefined} onChange={(v) => updateCard(card.id, { targetEmployee: v || null })} filterOption={(input, option) => (option?.label as string ?? "").toLowerCase().includes(input.toLowerCase())} options={employeeOptions} />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    {card.questions.map((q, idx) => (
                      <div key={idx} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: isEditing ? 6 : 8 }}>
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: `${card.color}20`, color: card.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{idx + 1}</div>
                        {isEditing ? (
                          <Input size="small" value={q} onChange={(e) => { const newQs = [...card.questions]; newQs[idx] = e.target.value; updateCard(card.id, { questions: newQs }); }} style={{ flex: 1, borderRadius: 6 }} />
                        ) : (
                          <Text style={{ fontSize: 12, flex: 1 }}>{q}</Text>
                        )}
                        {isEditing && <Button size="small" danger type="text" icon={<DeleteOutlined />} onClick={() => updateCard(card.id, { questions: card.questions.filter((_, i) => i !== idx) })} />}
                      </div>
                    ))}
                    {isEditing && <Button type="dashed" size="small" block icon={<PlusOutlined />} onClick={() => updateCard(card.id, { questions: [...card.questions, ""] })} style={{ borderRadius: 6, marginTop: 6 }}>Add Question</Button>}
                  </div>
                  <Button type="primary" icon={<SendOutlined />} block onClick={() => sendViaGmail(card)} disabled={!card.targetEmployee} style={{ borderRadius: 8, background: card.color, borderColor: card.color }}>Send via Gmail</Button>
                  {!card.targetEmployee && <Text type="secondary" style={{ fontSize: 11, display: "block", textAlign: "center", marginTop: 4 }}>Select a recipient above to enable sending</Text>}
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>
      <Modal title="Add Question Set" open={addModal} onCancel={() => setAddModal(false)} onOk={addCard} okText="Add" destroyOnClose width={520}>
        <Form form={addForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="categoryLabel" label="Category Label" rules={[{ required: true }]}><Input placeholder="e.g. Team Lead" /></Form.Item>
          <Form.Item name="color" label="Color"><Select options={CARD_COLORS.map((c) => ({ value: c, label: <Space><span style={{ display: "inline-block", width: 14, height: 14, borderRadius: 4, background: c }} />{c}</Space> }))} placeholder="Pick colour" /></Form.Item>
          <Form.Item name="questions" label="Questions" extra="One question per line"><Input.TextArea rows={5} placeholder={"What was your experience?\nWhat can we improve?\n..."} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ─── Documents Tab ─────────────────────────────────────────────────────────
interface DocumentCard {
  id: string;
  title: string;
  description: string;
  color: string;
  status: "pending" | "generated" | "issued";
  template: string;
}

const DEFAULT_DOCUMENT_CARDS: DocumentCard[] = [
  { id: "doc_exp", title: "Experience Certificate", description: "Certifies the duration and nature of employment at the company", color: "#6366f1", status: "pending", template: `This is to certify that [Employee Name] was employed with [Company Name] from [Joining Date] to [Last Working Day] as [Designation] in the [Department] department. During this period, they demonstrated excellent professional skills and performed their duties diligently.` },
  { id: "doc_relieve", title: "Relieving Letter", description: "Formal letter confirming the employee has been relieved from duties", color: "#10b981", status: "pending", template: `This is to inform that [Employee Name] (Employee Code: [Employee Code]) has been relieved from the services of [Company Name] with effect from [Last Working Day]. They have completed all necessary formalities and handovers. We wish them the best in their future endeavors.` },
  { id: "doc_service", title: "Service Certificate", description: "Comprehensive record of the employee's service history and contributions", color: "#f59e0b", status: "pending", template: `This is to certify that [Employee Name] has served [Company Name] from [Joining Date] to [Last Working Day]. During their tenure, they contributed significantly to the [Department] department. Their conduct was satisfactory and they completed all assigned responsibilities professionally.` },
];

function DocumentsTab({ selectedRecord }: { selectedRecord: OffboardingRecord | null }) {
  const [docs, setDocs] = useState<DocumentCard[]>(DEFAULT_DOCUMENT_CARDS);
  const [previewDoc, setPreviewDoc] = useState<DocumentCard | null>(null);
  const [addModal, setAddModal] = useState(false);
  const [addForm] = Form.useForm();

  const fillTemplate = (template: string) => {
    if (!selectedRecord) return template;
    return template.replace(/\[Employee Name\]/g, selectedRecord.employee_name || "").replace(/\[Last Working Day\]/g, selectedRecord.last_working_day ? dayjs(selectedRecord.last_working_day).format("DD MMMM YYYY") : "[Date]").replace(/\[Joining Date\]/g, "[Joining Date]").replace(/\[Company Name\]/g, "Company").replace(/\[Designation\]/g, "[Designation]").replace(/\[Department\]/g, "[Department]").replace(/\[Employee Code\]/g, "[Employee Code]");
  };

  const markIssued = (id: string) => { setDocs((ds) => ds.map((d) => (d.id === id ? { ...d, status: "issued" } : d))); message.success("Document marked as issued"); };
  const generateDoc = (id: string) => { setDocs((ds) => ds.map((d) => (d.id === id ? { ...d, status: "generated" } : d))); message.success("Document generated"); };
  const deleteDoc = (id: string) => { setDocs((ds) => ds.filter((d) => d.id !== id)); message.success("Document card removed"); };

  const sendDocViaGmail = (doc: DocumentCard) => {
    if (!selectedRecord) { message.warning("Please select a resigning employee first"); return; }
    const toEmail = (selectedRecord as any).employee_email || "";
    const subject = encodeURIComponent(`${doc.title} — ${selectedRecord.employee_name}`);
    const body = encodeURIComponent(fillTemplate(doc.template));
    window.open(`https://mail.google.com/mail/?view=cm&to=${toEmail}&su=${subject}&body=${body}`, "_blank");
  };

  const addDoc = () => {
    addForm.validateFields().then((vals) => {
      const newDoc: DocumentCard = { id: `doc_${Date.now()}`, title: vals.title, description: vals.description ?? "", color: vals.color ?? CARD_COLORS[docs.length % CARD_COLORS.length], status: "pending", template: vals.template ?? "" };
      setDocs((ds) => [...ds, newDoc]);
      addForm.resetFields();
      setAddModal(false);
    });
  };

  const docStatusMap = {
    pending: { color: "#94a3b8", label: "Pending", icon: <ClockCircleOutlined /> },
    generated: { color: "#1677ff", label: "Generated", icon: <FileDoneOutlined /> },
    issued: { color: "#10b981", label: "Issued", icon: <CheckCircleOutlined /> },
  };

  return (
    <div>
      {selectedRecord && (
        <Alert type="info" showIcon style={{ marginBottom: 16, borderRadius: 8 }} message={<Space><Text strong>Documents for: {selectedRecord.employee_name}</Text><Tag color={STATUS_COLOR[selectedRecord.status] ?? "default"} style={{ fontSize: 11 }}>{selectedRecord.status_display}</Tag></Space>} />
      )}
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <Text strong style={{ fontSize: 15 }}>Offboarding Documents</Text>
          <Text type="secondary" style={{ display: "block", fontSize: 12, marginTop: 2 }}>Standard documents issued to departing employees.</Text>
        </div>
        <Button icon={<PlusOutlined />} onClick={() => setAddModal(true)} style={{ borderRadius: 8 }}>Add Document</Button>
      </div>
      <Row gutter={[16, 16]}>
        {docs.map((doc) => {
          const dStatus = docStatusMap[doc.status];
          return (
            <Col xs={24} md={8} key={doc.id}>
              <Card style={{ borderRadius: 12, border: `1px solid ${doc.color}33`, height: "100%", ...zoomBaseStyle }} styles={{ body: { padding: 0 } }} hoverable {...zoomHoverProps}>
                <div style={{ height: 5, background: doc.color, borderRadius: "12px 12px 0 0" }} />
                <div style={{ padding: "20px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: -8 }}>
                    <Popconfirm title="Remove this document card?" onConfirm={() => deleteDoc(doc.id)} okButtonProps={{ danger: true }}>
                      <Button size="small" danger type="text" icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </div>
                  <div style={{ textAlign: "center", marginBottom: 16 }}>
                    <Text strong style={{ fontSize: 15, display: "block", color: doc.color }}>{doc.title}</Text>
                    <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 4 }}>{doc.description}</Text>
                  </div>
                  <div style={{ textAlign: "center", marginBottom: 16 }}>
                    <Tag style={{ borderColor: dStatus.color, color: dStatus.color, background: `${dStatus.color}15`, fontSize: 12, padding: "2px 10px" }}>{dStatus.label}</Tag>
                  </div>
                  <Space direction="vertical" style={{ width: "100%" }} size={8}>
                    <Button block icon={<EyeOutlined />} onClick={() => setPreviewDoc(doc)} style={{ borderRadius: 8 }}>Preview Template</Button>
                    {doc.status === "pending" && <Button type="primary" block icon={<FileDoneOutlined />} onClick={() => generateDoc(doc.id)} style={{ borderRadius: 8, background: doc.color, borderColor: doc.color }} disabled={!selectedRecord}>Generate Document</Button>}
                    {doc.status === "generated" && (
                      <>
                        <Button block icon={<SendOutlined />} onClick={() => sendDocViaGmail(doc)} disabled={!selectedRecord} style={{ borderRadius: 8, borderColor: doc.color, color: doc.color }}>Send via Gmail</Button>
                        <Button type="primary" block icon={<CheckCircleOutlined />} onClick={() => markIssued(doc.id)} style={{ borderRadius: 8, background: "#10b981", borderColor: "#10b981" }}>Mark as Issued</Button>
                      </>
                    )}
                    {doc.status === "issued" && <Button block disabled icon={<CheckCircleOutlined />} style={{ borderRadius: 8 }}>Document Issued ✓</Button>}
                  </Space>
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>
      <Modal title={<Space><FileTextOutlined style={{ color: previewDoc?.color }} />{previewDoc?.title} — Template Preview</Space>} open={!!previewDoc} onCancel={() => setPreviewDoc(null)} footer={[<Button key="close" onClick={() => setPreviewDoc(null)}>Close</Button>]} width={600}>
        {previewDoc && (
          <div style={{ paddingTop: 12 }}>
            {!selectedRecord && <Alert type="warning" message="Select a resigning employee to auto-fill employee details in the template" style={{ marginBottom: 16, borderRadius: 8 }} />}
            <div style={{ padding: "20px 24px", background: "var(--bms-surface-2,#f8fafc)", borderRadius: 10, border: "1px solid var(--bms-border,#e8edf3)", lineHeight: 1.8, fontSize: 13, color: "var(--bms-text,#1a2332)", whiteSpace: "pre-wrap" }}>{fillTemplate(previewDoc.template)}</div>
          </div>
        )}
      </Modal>
      <Modal title="Add Document" open={addModal} onCancel={() => setAddModal(false)} onOk={addDoc} okText="Add" destroyOnClose width={560}>
        <Form form={addForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="title" label="Document Title" rules={[{ required: true }]}><Input placeholder="e.g. No Dues Certificate" /></Form.Item>
          <Form.Item name="color" label="Color"><Select options={CARD_COLORS.map((c) => ({ value: c, label: <Space><span style={{ display: "inline-block", width: 14, height: 14, borderRadius: 4, background: c }} />{c}</Space> }))} placeholder="Pick colour" /></Form.Item>
          <Form.Item name="description" label="Description"><Input placeholder="What does this document confirm?" /></Form.Item>
          <Form.Item name="template" label="Document Template" extra="Use placeholders like [Employee Name], [Last Working Day], [Company Name], [Designation], [Department], [Joining Date], [Employee Code]">
            <Input.TextArea rows={5} placeholder="This is to certify that [Employee Name] ..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ─── Resignation Detail Modal ──────────────────────────────────────────────
function ResignationDetailModal({ record, open, onClose }: { record: OffboardingRecord | null; open: boolean; onClose: () => void }) {
  if (!record) return null;
  const sb = STATUS_COLOR[record.status] ?? "default";
  return (
    <Modal title={<Space><LogoutOutlined style={{ color: "#1677ff" }} />Resignation Details</Space>} open={open} onCancel={onClose} footer={[<Button key="close" onClick={onClose}>Close</Button>]} width={600}>
      <div style={{ paddingTop: 12 }}>
        <Space style={{ marginBottom: 16 }}>
          <Avatar size={48} icon={<UserOutlined />} style={{ background: "#6366f1" }} />
          <div>
            <Text strong style={{ fontSize: 15, display: "block" }}>{record.employee_name}</Text>
            <Tag color={sb}>{record.status_display}</Tag>
          </div>
        </Space>
        <Divider style={{ margin: "12px 0" }} />
        <Row gutter={[16, 12]}>
          <Col span={12}>
            <Text type="secondary" style={{ fontSize: 11 }}>Resignation Date</Text>
            <Text strong style={{ display: "block", fontSize: 13 }}>{record.resignation_date ? dayjs(record.resignation_date).format("DD MMM YYYY") : "—"}</Text>
          </Col>
          <Col span={12}>
            <Text type="secondary" style={{ fontSize: 11 }}>Last Working Day</Text>
            <Text strong style={{ display: "block", fontSize: 13 }}>
              {record.last_working_day ? dayjs(record.last_working_day).format("DD MMM YYYY") : record.resignation_date ? `${dayjs(record.resignation_date).add(90, "day").format("DD MMM YYYY")} (est.)` : "—"}
            </Text>
          </Col>
          <Col span={24}>
            <Text type="secondary" style={{ fontSize: 11 }}>Reason</Text>
            <Text style={{ display: "block", fontSize: 13, marginTop: 2 }}>{record.reason || "No reason provided"}</Text>
          </Col>
          {record.remarks && (
            <Col span={24}>
              <Text type="secondary" style={{ fontSize: 11 }}>Remarks</Text>
              <Text style={{ display: "block", fontSize: 13, marginTop: 2 }}>{record.remarks}</Text>
            </Col>
          )}
        </Row>
      </div>
    </Modal>
  );
}

// ─── Employee: Submit Resignation ──────────────────────────────────────────
function SubmitResignationTab() {
  const [form] = Form.useForm();
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [noticeDays] = useState(90);

  const { data: existing, isLoading } = useQuery({
    queryKey: ["offboarding-mine"],
    queryFn: () => offboardingApi.list({ employee: currentUser?.id ?? "" }).then((r) => (Array.isArray(r) ? r[0] : null)),
    enabled: !!currentUser?.id,
  });

  const submitMut = useMutation({
    mutationFn: (data: any) => offboardingApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["offboarding-mine"] });
      qc.invalidateQueries({ queryKey: ["offboarding-list"] });
      message.success("Resignation submitted successfully");
      form.resetFields();
    },
    onError: (e: any) => message.error(apiErrorMsg(e, "Failed to submit resignation")),
  });

  if (isLoading) return <div style={{ textAlign: "center", padding: "60px 0" }}><Spin /></div>;

  if (existing) {
    const STATUS_ORDER = ["INITIATED", "PREFERENCE_PENDING", "CLEARANCE_PENDING", "INTERVIEW_PENDING", "DOCUMENTS_PENDING", "COMPLETED", "CANCELLED"];
    const currentIdx = STATUS_ORDER.indexOf(existing.status);
    const isCompleted = existing.status === "COMPLETED";
    const isCancelled = existing.status === "CANCELLED";
    const steps = [
      { key: "INITIATED", label: "Submitted", desc: "Your resignation has been received and is under review." },
      { key: "CLEARANCE_PENDING", label: "Clearance", desc: "Department clearances are being completed." },
      { key: "INTERVIEW_PENDING", label: "Exit Interview", desc: "Your exit interview questions have been sent. Please respond." },
      { key: "DOCUMENTS_PENDING", label: "Documents", desc: "Your experience/relieving letters are being prepared." },
      { key: "COMPLETED", label: "Completed", desc: "Resignation process successfully completed." },
    ];
    return (
      <div style={{ maxWidth: 620, margin: "0 auto", paddingTop: 20 }}>
        {isCompleted && (
          <div style={{ textAlign: "center", padding: "40px 24px", background: "linear-gradient(135deg, rgba(16,185,129,0.07), rgba(52,211,153,0.05))", borderRadius: 16, border: "1px solid rgba(16,185,129,0.2)", marginBottom: 24 }}>
            <Text strong style={{ fontSize: 20, display: "block", color: "#10b981", marginBottom: 8 }}>Resignation Process Completed</Text>
            <Text type="secondary" style={{ fontSize: 13 }}>All stages are complete. Your experience and relieving letters have been issued. We wish you all the best!</Text>
          </div>
        )}
        {isCancelled && <Alert type="error" message="Your resignation has been cancelled or rejected." showIcon style={{ marginBottom: 16, borderRadius: 8 }} />}
        <Card style={{ borderRadius: 12, border: "1px solid var(--bms-border,#e8edf3)", marginBottom: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ fontSize: 15 }}>Resignation Progress</Text>
            <Text type="secondary" style={{ display: "block", fontSize: 12, marginTop: 2 }}>Track where your resignation is in the process</Text>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {steps.map((step, i) => {
              const stepIdx = STATUS_ORDER.indexOf(step.key);
              const isDone = currentIdx > stepIdx || isCompleted;
              const isActive = STATUS_ORDER.indexOf(existing.status) === stepIdx || (step.key === "INITIATED" && ["INITIATED", "PREFERENCE_PENDING"].includes(existing.status));
              return (
                <div key={step.key} style={{ display: "flex", gap: 14, position: "relative" }}>
                  {i < steps.length - 1 && <div style={{ position: "absolute", left: 18, top: 38, width: 2, height: 36, background: isDone ? "#10b981" : "#e2e8f0", transition: "background 0.3s" }} />}
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: isDone ? "#10b981" : isActive ? "#6366f1" : "#f1f5f9", border: isActive ? "3px solid #6366f1" : "2px solid " + (isDone ? "#10b981" : "#e2e8f0"), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: isActive ? "0 0 0 4px rgba(99,102,241,0.15)" : "none", transition: "all 0.3s", zIndex: 1 }}>
                    {isDone && <CheckCircleOutlined style={{ color: "#fff", fontSize: 16 }} />}
                  </div>
                  <div style={{ paddingBottom: 24, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                      <Text strong style={{ fontSize: 13, color: isDone ? "#10b981" : isActive ? "#6366f1" : "#94a3b8" }}>{step.label}</Text>
                      {isActive && <Tag color="purple" style={{ fontSize: 10, padding: "0 6px" }}>Current</Tag>}
                      {isDone && <Tag color="green" style={{ fontSize: 10, padding: "0 6px" }}>✓ Done</Tag>}
                    </div>
                    {isActive && <Text type="secondary" style={{ fontSize: 12 }}>{step.desc}</Text>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        <Card style={{ borderRadius: 12, border: "1px solid var(--bms-border,#e8edf3)" }}>
          <Space style={{ marginBottom: 12 }}>
            <Avatar size={44} icon={<UserOutlined />} style={{ background: "#6366f1" }} />
            <div>
              <Text strong style={{ fontSize: 14, display: "block" }}>{currentUser?.full_name || "You"}</Text>
              <Tag color={STATUS_COLOR[existing.status] ?? "default"} style={{ fontSize: 12, padding: "2px 10px" }}>{existing.status_display}</Tag>
            </div>
          </Space>
          <Divider style={{ margin: "12px 0" }} />
          <Row gutter={[16, 10]}>
            <Col span={12}><Text type="secondary" style={{ fontSize: 11 }}>Submitted On</Text><Text strong style={{ display: "block", fontSize: 13 }}>{dayjs(existing.created_at).format("DD MMM YYYY")}</Text></Col>
            <Col span={12}><Text type="secondary" style={{ fontSize: 11 }}>Resignation Date</Text><Text strong style={{ display: "block", fontSize: 13 }}>{existing.resignation_date ? dayjs(existing.resignation_date).format("DD MMM YYYY") : "—"}</Text></Col>
            {existing.last_working_day && <Col span={12}><Text type="secondary" style={{ fontSize: 11 }}>Last Working Day</Text><Text strong style={{ display: "block", fontSize: 13, color: "#ef4444" }}>{dayjs(existing.last_working_day).format("DD MMM YYYY")}</Text></Col>}
            {existing.reason && <Col span={24}><Text type="secondary" style={{ fontSize: 11 }}>Reason</Text><Text style={{ display: "block", fontSize: 13, marginTop: 2 }}>{existing.reason}</Text></Col>}
          </Row>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 580, margin: "0 auto", paddingTop: 8 }}>
      <Card style={{ borderRadius: 12, border: "1px solid var(--bms-border,#e8edf3)" }}>
        <div style={{ marginBottom: 20 }}>
          <Text strong style={{ fontSize: 15 }}>Submit Resignation</Text>
          <Text type="secondary" style={{ display: "block", fontSize: 12, marginTop: 4 }}>Please ensure you have discussed this with your manager before submitting.</Text>
        </div>
        <Form form={form} layout="vertical" onFinish={(values) => {
          submitMut.mutate({
            employee: currentUser?.id,
            resignation_date: values.resignation_date ? dayjs(values.resignation_date).format("YYYY-MM-DD") : null,
            last_working_day: values.last_working_day ? dayjs(values.last_working_day).format("YYYY-MM-DD") : null,
            reason: values.reason, remarks: values.remarks ?? "",
          });
        }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="resignation_date" label="Resignation Date" rules={[{ required: true, message: "Required" }]}>
                <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" disabledDate={(d) => d && d < dayjs().startOf("day")} onChange={(date) => { if (date) form.setFieldValue("last_working_day", date.add(noticeDays, "day")); }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="last_working_day" label={<span>Last Working Day <Text type="secondary" style={{ fontSize: 10 }}>(auto-calc: {noticeDays}d notice)</Text></span>}>
                <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" disabledDate={(d) => d && d < dayjs().startOf("day")} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="reason" label="Reason for Leaving" rules={[{ required: true, message: "Please provide a reason" }]}>
            <Input.TextArea rows={4} placeholder="Please describe your reason for leaving..." style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item name="remarks" label="Additional Remarks">
            <Input.TextArea rows={2} placeholder="Any additional information..." style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" loading={submitMut.isPending} danger block style={{ borderRadius: 8, height: 40, fontSize: 14 }}>Submit Resignation</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function OffboardingPage() {
  const [activeTab, setActiveTab] = useState("resignations");
  const [detailRecord, setDetailRecord] = useState<OffboardingRecord | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<OffboardingRecord | null>(null);
  const currentUser = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);

  const isHR =
    currentUser?.is_staff ||
    currentUser?.is_superuser ||
    permissions.includes(PERMS.HRMS_OFFBOARDING_VIEW as never) ||
    permissions.includes("pmt.hrms.offboarding.view" as never);

  // Check if current user is an owner of any clearance task
  const isOwner = currentUser?.id ? getOwnerTasks(currentUser.id).length > 0 : false;

  const handleApprove = (record: OffboardingRecord) => {
    setSelectedRecord(record);
    setActiveTab("clearance");
  };

  const handleRowClick = (record: OffboardingRecord) => {
    setSelectedRecord(record);
    setActiveTab("clearance");
  };

  const handleClearanceComplete = () => {
    setSelectedRecord((prev) =>
      prev ? { ...prev, status: "INTERVIEW_PENDING", status_display: "Exit Interview Pending" } as OffboardingRecord : prev
    );
    setActiveTab("exit-interview");
    message.success("All clearances completed — moved to Exit Interview");
  };

  const handleClearRecord = () => {
    setSelectedRecord(null);
    setActiveTab("resignations");
  };

  // Owner pending task count for badge
  const ownerPendingCount = currentUser?.id
    ? getOwnerTasks(currentUser.id).filter((t) => getClearanceStatus(t.id) !== "completed").length
    : 0;

  const hrItems = [
    {
      key: "resignations",
      label: "Resignations",
      children: (
        <ResignationList
          onView={(r) => setDetailRecord(r)}
          onSelect={() => {}}
          onApprove={handleApprove}
          onRowClick={handleRowClick}
        />
      ),
    },
    { key: "preference", label: "Preference Settings", children: <PreferenceTab /> },
    { key: "clearance", label: "Clearance", children: <ClearanceTab selectedRecord={selectedRecord} onAllCleared={handleClearanceComplete} /> },
    { key: "exit-interview", label: "Exit Interview", children: <ExitInterviewTab selectedRecord={selectedRecord} /> },
    { key: "documents", label: "Documents", children: <DocumentsTab selectedRecord={selectedRecord} /> },
    // Show My Tasks tab if this HR user is also an assigned owner
    ...(isOwner ? [{
      key: "my-tasks",
      label: (
        <Badge count={ownerPendingCount} size="small" offset={[6, 0]}>
          My Tasks
        </Badge>
      ),
      children: <OwnerTaskTab />,
    }] : []),
  ];

  const employeeItems = [
    { key: "resign", label: "My Resignation", children: <SubmitResignationTab /> },
    // Show My Tasks tab if this employee is an assigned clearance owner
    ...(isOwner ? [{
      key: "my-tasks",
      label: (
        <Badge count={ownerPendingCount} size="small" offset={[6, 0]}>
          My Tasks
        </Badge>
      ),
      children: <OwnerTaskTab />,
    }] : []),
  ];

  const items = isHR ? hrItems : employeeItems;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Space align="center">
          <Title level={3} style={{ margin: 0, color: "var(--bms-text)" }}>Offboarding</Title>
          {isHR && <Tag color="blue" style={{ borderRadius: 20, fontWeight: 600, fontSize: 11 }}>HR View</Tag>}
        </Space>
        <Text type="secondary" style={{ display: "block", marginTop: 4, fontSize: 13 }}>
          {isHR ? "Manage resignations, configure offboarding preferences, and track clearance" : "Submit and track your resignation"}
        </Text>
      </div>

      {isHR && selectedRecord && (
        <>
          <EmployeeBanner record={selectedRecord} onClear={handleClearRecord} />
          <StageStatusBanner record={selectedRecord} />
        </>
      )}

      <Card style={{ borderRadius: 10, border: "1px solid var(--bms-border,#e8edf3)" }} styles={{ body: { padding: "0 24px 24px" } }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={items} destroyInactiveTabPane />
      </Card>

      <ResignationDetailModal record={detailRecord} open={!!detailRecord} onClose={() => setDetailRecord(null)} />
    </div>
  );
}