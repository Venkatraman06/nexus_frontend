// import { useState, useMemo } from "react";
// import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// import {
//   Typography, Button, Select, Drawer, Form, Input, DatePicker,
//   Space, Spin, Empty, message, Row, Col, Divider, TimePicker, InputNumber,
//   Card, Segmented, Table, Avatar, Tag, Pagination, Badge, Tooltip,
// } from "antd";
// import OrgChart from "@/components/OrgChart";
// import {
//   PlusOutlined, PhoneOutlined, MailOutlined, ClockCircleOutlined,
//   AppstoreOutlined, ApartmentOutlined, UnorderedListOutlined,
//   UserOutlined, EyeOutlined,
// } from "@ant-design/icons";
// import { useNavigate } from "react-router-dom";
// import dayjs from "dayjs";

// import { employeeApi, employeeGroupApi, type Employee, type EmployeeCreatePayload } from "@/services/employees";
// import { resolveGroupFlags } from "@/constants/keycloakGroups";
// import PermGuard from "@/components/common/PermGuard";
// import { PERMS } from "@/constants/permissions";
// import {
//   departmentApi, designationApi, locationApi, gradeApi, employmentTypeApi, shiftCategoryApi,
//   type ShiftCategoryOption,
// } from "@/services/master";
// import { apiErrorMsg } from "@/utils/apiError";

// const { Text } = Typography;

// const PAGE_SIZE = 15;

// // ── Helpers ───────────────────────────────────────────────────────────────────
// const AVATAR_COLORS = [
//   "#E53935", "#8E24AA", "#1E88E5", "#00897B", "#F4511E",
//   "#6D4C41", "#546E7A", "#43A047", "#FB8C00", "#D81B60",
//   "#5E35B1", "#039BE5", "#00ACC1", "#7CB342", "#FFB300",
// ];
// function avatarColor(name: string) {
//   let hash = 0;
//   for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
//   return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
// }
// function initials(name: string) {
//   const parts = name.trim().split(/\s+/);
//   if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
//   return name.slice(0, 2).toUpperCase();
// }
// function toTitleCase(name: string) {
//   return name.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
// }

// const DEPT_TAG_COLORS: Record<string, string> = {};
// const TAG_PALETTE = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];
// function deptTagColor(dept: string) {
//   if (!DEPT_TAG_COLORS[dept])
//     DEPT_TAG_COLORS[dept] = TAG_PALETTE[Object.keys(DEPT_TAG_COLORS).length % TAG_PALETTE.length];
//   return DEPT_TAG_COLORS[dept];
// }

// const STATUS_STYLE: Record<string, { color: string; bg: string; border: string }> = {
//   ACTIVE:   { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
//   INACTIVE: { color: "#6b7280", bg: "#f3f4f6", border: "#d1d5db" },
//   ON_LEAVE: { color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
//   RESIGNED: { color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
// };

// const STATUS_TAG: Record<string, string> = {
//   ACTIVE: "success", INACTIVE: "default", ON_LEAVE: "warning", RESIGNED: "error",
// };

// // ── Employee Card ─────────────────────────────────────────────────────────────
// function EmployeeCard({ emp, onClick }: { emp: Employee; onClick: () => void }) {
//   const rawName   = emp.full_name || emp.username;
//   const name      = toTitleCase(rawName);
//   const color     = avatarColor(rawName);
//   const dept      = emp.department_name || emp.department || "";
//   const desig     = emp.designation_name || emp.designation || "";
//   const statusKey = (emp.status || "ACTIVE").toUpperCase();
//   const ss        = STATUS_STYLE[statusKey] ?? STATUS_STYLE.ACTIVE;
//   const group     = emp.keycloak_group || "";

//   return (
//     <div
//       onClick={onClick}
//       style={{
//         background: "var(--bms-surface)", borderRadius: 14, padding: "22px 20px 16px",
//         cursor: "pointer",  border: "1px solid var(--bms-border)",
//         boxShadow: "0 1px 3px rgba(0,0,0,0.06)", transition: "box-shadow 0.18s, transform 0.18s",
//         display: "flex", flexDirection: "column",
//       }}
//       onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; }}
//       onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
//     >
//       {emp.profile_picture ? (
//         <img src={emp.profile_picture} alt={name} style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", marginBottom: 14, border: "2px solid #eaecf0" }} />
//       ) : (
//         <div style={{ width: 64, height: 64, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 14 }}>
//           {initials(rawName)}
//         </div>
//       )}
//       <div style={{ fontSize: 17, fontWeight: 700, color: "var(--bms-text)" }}>{name}</div>
//       <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", marginBottom: 14 }}>
//         {desig && <span style={{ fontSize: 12.5, color: "var(--bms-text-3)" }}>{desig}</span>}
//         {dept && <><span style={{ color: "var(--bms-text-3)", fontSize: 11 }}>·</span><span style={{ fontSize: 11, fontWeight: 600, color: deptTagColor(dept), background: deptTagColor(dept) + "1a", padding: "2px 9px", borderRadius: 20, border: `1px solid ${deptTagColor(dept)}35` }}>{dept.toLowerCase()}</span></>}
//         {group && <span style={{ fontSize: 10, fontWeight: 600, color: "var(--bms-text-3)", background: "var(--bms-surface-2)", padding: "1px 7px", borderRadius: 20, border: "1px solid var(--bms-border)" }}>{group}</span>}
//       </div>
//       <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 16 }}>
//         {emp.email && <div style={{ display: "flex", alignItems: "center", gap: 7 }}><MailOutlined style={{ fontSize: 12, color: "var(--bms-text-3)" }} /><span style={{ fontSize: 12.5, color: "var(--bms-text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{emp.email}</span></div>}
//         <div style={{ display: "flex", alignItems: "center", gap: 7 }}><ClockCircleOutlined style={{ fontSize: 12, color: "var(--bms-text-3)" }} /><span style={{ fontSize: 12.5, color: "var(--bms-text-3)" }}>{emp.shift_applicable ? "shift applicable" : "general shift"}</span></div>
//       </div>
//       <div style={{ borderTop: "1px solid var(--bms-border)", marginBottom: 12 }} />
//       <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
//         <span style={{ fontSize: 11, fontWeight: 600, color: ss.color, background: ss.bg, padding: "3px 11px", borderRadius: 20, border: `1px solid ${ss.border}` }}>{statusKey.toLowerCase().replace("_", " ")}</span>
//         {emp.employee_code && <span style={{ fontSize: 12.5, color: "var(--bms-text-3)", fontFamily: "monospace" }}>{emp.employee_code}</span>}
//       </div>
//     </div>
//   );
// }

// // ── Table View ────────────────────────────────────────────────────────────────
// function EmployeeTable({ employees, isLoading, onView }: {
//   employees: Employee[];
//   isLoading: boolean;
//   onView: (id: string) => void;
// }) {
//   const columns = [
//     {
//       title: "Employee",
//       key: "employee",
//       width: 240,
//       render: (_: any, emp: Employee) => {
//         const rawName = emp.full_name || emp.username;
//         const name    = toTitleCase(rawName);
//         const color   = avatarColor(rawName);
//         return (
//           <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//             {emp.profile_picture ? (
//               <Avatar src={emp.profile_picture} size={36} />
//             ) : (
//               <Avatar size={36} style={{ background: color, fontWeight: 700, fontSize: 14 }}>
//                 {initials(rawName)}
//               </Avatar>
//             )}
//             <div>
//               <div style={{ fontWeight: 600, fontSize: 13, color: "#111827", lineHeight: 1.3 }}>{name}</div>
//               <div style={{ fontSize: 11, color: "#9ca3af" }}>{emp.email}</div>
//             </div>
//           </div>
//         );
//       },
//     },
//     {
//       title: "Code",
//       dataIndex: "employee_code",
//       key: "code",
//       width: 90,
//       render: (v: string) => v ? <Text code style={{ fontSize: 11 }}>{v}</Text> : "—",
//     },
//     {
//       title: "Designation",
//       key: "designation",
//       width: 180,
//       render: (_: any, emp: Employee) => emp.designation_name || emp.designation || "—",
//     },
//     {
//       title: "Department",
//       key: "department",
//       width: 140,
//       render: (_: any, emp: Employee) => {
//         const dept = emp.department_name || emp.department || "";
//         if (!dept) return "—";
//         return (
//           <Tag color={deptTagColor(dept)} style={{ fontSize: 11, border: "none", background: deptTagColor(dept) + "18", color: deptTagColor(dept) }}>
//             {dept.toLowerCase()}
//           </Tag>
//         );
//       },
//     },
//     {
//       title: "Role",
//       dataIndex: "keycloak_group",
//       key: "group",
//       width: 120,
//       render: (v: string) => v ? <Tag color="purple" style={{ fontSize: 11 }}>{v}</Tag> : "—",
//     },
//     {
//       title: "Type",
//       key: "emp_type",
//       width: 110,
//       render: (_: any, emp: Employee) => emp.employment_type_name || "—",
//     },
//     {
//       title: "Status",
//       dataIndex: "status",
//       key: "status",
//       width: 100,
//       render: (v: string) => {
//         const key = (v || "ACTIVE").toUpperCase();
//         return (
//           <Badge
//             status={STATUS_TAG[key] as any}
//             text={<span style={{ fontSize: 12 }}>{key.toLowerCase().replace("_", " ")}</span>}
//           />
//         );
//       },
//     },
//     {
//       title: "Joined",
//       dataIndex: "joining_date",
//       key: "joined",
//       width: 110,
//       render: (v: string) => v ? dayjs(v).format("DD MMM YYYY") : "—",
//     },
//     {
//       title: "Shift",
//       dataIndex: "shift_applicable",
//       key: "shift",
//       width: 100,
//       render: (v: boolean) => (
//         <Tag color={v ? "blue" : "default"} style={{ fontSize: 11 }}>
//           {v ? "Shift" : "General"}
//         </Tag>
//       ),
//     },
//     {
//       title: "",
//       key: "action",
//       width: 60,
//       render: (_: any, emp: Employee) => (
//         <Tooltip title="View Profile">
//           <Button
//             size="small"
//             icon={<EyeOutlined />}
//             onClick={(e) => { e.stopPropagation(); onView(emp.id); }}
//           />
//         </Tooltip>
//       ),
//     },
//   ];

//   return (
//     <Table
//       dataSource={employees}
//       columns={columns}
//       rowKey="id"
//       loading={isLoading}
//       size="middle"
//       pagination={false}
//       onRow={(emp) => ({ onClick: () => onView(emp.id), style: { cursor: "pointer" } })}
//       style={{ borderRadius: 10, overflow: "hidden" }}
//       scroll={{ x: 1100 }}
//     />
//   );
// }

// // ── Add Employee Drawer ───────────────────────────────────────────────────────
// function EmployeeDrawer({ open, onClose, allEmployees }: { open: boolean; onClose: () => void; allEmployees: any[] }) {
//   const [form] = Form.useForm();
//   const qc = useQueryClient();
//   const shiftApplicable = Form.useWatch("shift_applicable", form);
//   const shiftType       = Form.useWatch("shift_type", form);

//   const { data: designations = [] } = useQuery({ queryKey: ["dd", "designations"], queryFn: () => designationApi.dropdown(),    staleTime: 60_000 });
//   const { data: departments = [] }  = useQuery({ queryKey: ["dd", "departments"],  queryFn: () => departmentApi.dropdown(),     staleTime: 60_000 });
//   const { data: locations = [] }    = useQuery({ queryKey: ["dd", "locations"],    queryFn: () => locationApi.dropdown(),       staleTime: 60_000 });
//   const { data: grades = [] }       = useQuery({ queryKey: ["dd", "grades"],       queryFn: () => gradeApi.dropdown(),          staleTime: 60_000 });
//   const { data: empTypes = [] }     = useQuery({ queryKey: ["dd", "emp-types"],    queryFn: () => employmentTypeApi.dropdown(), staleTime: 60_000 });
//   const { data: kcGroups = [] }     = useQuery({ queryKey: ["dd", "kc-groups"],    queryFn: () => employeeGroupApi.list(),      staleTime: 300_000 });
//   const { data: shiftCats = [] }    = useQuery({ queryKey: ["dd", "shift-cats"],   queryFn: () => shiftCategoryApi.dropdown(),  staleTime: 60_000 });

//   const createMut = useMutation({
//     mutationFn: (v: EmployeeCreatePayload) => employeeApi.create(v),
//     onSuccess: () => { qc.invalidateQueries({ queryKey: ["employees"] }); message.success("Employee created"); form.resetFields(); onClose(); },
//     onError: (e: any) => message.error(apiErrorMsg(e, "Failed to create employee")),
//   });

//   const recalcTotalExp = () => {
//     const jd: dayjs.Dayjs | undefined = form.getFieldValue("joining_date");
//     const prior = parseFloat(form.getFieldValue("prior_experience") ?? 0) || 0;
//     if (jd) form.setFieldsValue({ total_experience: parseFloat((dayjs().diff(jd, "day") / 365 + prior).toFixed(1)) });
//   };

//   const onFinish = (values: any) => {
//     const groupFlags = values.keycloak_group ? resolveGroupFlags(values.keycloak_group) : {};
//     createMut.mutate({
//       ...values, ...groupFlags,
//       joining_date:       values.joining_date         ? dayjs(values.joining_date).format("YYYY-MM-DD")        : null,
//       date_of_birth:      values.date_of_birth        ? dayjs(values.date_of_birth).format("YYYY-MM-DD")        : null,
//       custom_shift_start: values.custom_shift_start   ? dayjs(values.custom_shift_start).format("HH:mm:ss")    : null,
//       custom_shift_end:   values.custom_shift_end     ? dayjs(values.custom_shift_end).format("HH:mm:ss")      : null,
//       shift_category:     values.shift_type === "category" ? values.shift_category : null,
//       total_experience:   values.total_experience ?? null,
//     });
//   };

//   const dd  = (arr: any[]) => arr.map((d) => ({ value: d.id, label: d.name }));
//   const ff  = (input: string, opt: any) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase());
//   const sec = (label: string) => (
//     <><Typography.Text strong style={{ fontSize: 13, color: "#5a6a7e" }}>{label}</Typography.Text><Divider style={{ margin: "8px 0 16px" }} /></>
//   );

//   return (
//     <Drawer
//       title="Add Employee" open={open}
//       onClose={() => { form.resetFields(); onClose(); }}
//       width={700} destroyOnClose
//       footer={
//         <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
//           <Button onClick={() => { form.resetFields(); onClose(); }}>Cancel</Button>
//           <Button type="primary" loading={createMut.isPending} onClick={() => form.submit()}>Create</Button>
//         </div>
//       }
//     >
//       <Form form={form} layout="vertical" onFinish={onFinish} onValuesChange={(c) => { if ("joining_date" in c || "prior_experience" in c) recalcTotalExp(); }}>
//         {sec("Role")}
//         <Row gutter={16}>
//           <Col span={12}>
//             <Form.Item name="keycloak_group" label="Role" rules={[{ required: true }]}>
//               <Select showSearch allowClear placeholder="Select role" options={(kcGroups as string[]).map((g) => ({ value: g, label: g }))} filterOption={ff as any} />
//             </Form.Item>
//           </Col>
//           <Col span={12}>
//             <Form.Item name="manager" label="Reporting Manager">
//               <Select showSearch allowClear placeholder="Select manager" filterOption={ff}
//                 options={(allEmployees as any[]).map((e: any) => ({ value: e.id, label: `${e.full_name} (${e.employee_code})` }))} />
//             </Form.Item>
//           </Col>
//         </Row>

//         {sec("Personal Information")}
//         <Row gutter={16}>
//           <Col span={12}><Form.Item name="first_name" label="First Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
//           <Col span={12}><Form.Item name="last_name" label="Last Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
//         </Row>
//         <Row gutter={16}>
//           <Col span={12}><Form.Item name="email" label="Email" rules={[{ required: true, type: "email" }]}><Input prefix={<MailOutlined />} /></Form.Item></Col>
//           <Col span={12}><Form.Item name="phone_number" label="Phone"><Input prefix={<PhoneOutlined />} /></Form.Item></Col>
//         </Row>
//         <Row gutter={16}>
//           <Col span={12}><Form.Item name="alternative_number" label="Alternative Number"><Input prefix={<PhoneOutlined />} /></Form.Item></Col>
//           <Col span={12}><Form.Item name="gender" label="Gender"><Select allowClear options={[{ value: "M", label: "Male" }, { value: "F", label: "Female" }, { value: "O", label: "Other" }]} /></Form.Item></Col>
//         </Row>
//         <Row gutter={16}>
//           <Col span={12}><Form.Item name="date_of_birth" label="Date of Birth"><DatePicker style={{ width: "100%" }} format="DD MMM YYYY" /></Form.Item></Col>
//         </Row>
//         <Form.Item name="address" label="Address"><Input.TextArea rows={2} /></Form.Item>

//         {sec("Employment Details")}
//         <Row gutter={16}>
//           <Col span={12}><Form.Item name="designation_ref" label="Designation"><Select showSearch allowClear options={dd(designations as any[])} filterOption={ff} /></Form.Item></Col>
//           <Col span={12}><Form.Item name="department_ref" label="Department"><Select showSearch allowClear options={dd(departments as any[])} filterOption={ff} /></Form.Item></Col>
//         </Row>
//         <Row gutter={16}>
//           <Col span={12}><Form.Item name="location" label="Branch / Location"><Select showSearch allowClear options={dd(locations as any[])} filterOption={ff} /></Form.Item></Col>
//           <Col span={12}><Form.Item name="employment_type" label="Employment Type"><Select showSearch allowClear options={dd(empTypes as any[])} filterOption={ff} /></Form.Item></Col>
//         </Row>
//         <Row gutter={16}>
//           <Col span={12}><Form.Item name="joining_date" label="Date of Joining"><DatePicker style={{ width: "100%" }} format="DD MMM YYYY" /></Form.Item></Col>
//           <Col span={12}><Form.Item name="status" label="Status" initialValue="ACTIVE"><Select options={[{ value: "ACTIVE", label: "Active" }, { value: "INACTIVE", label: "Inactive" }]} /></Form.Item></Col>
//         </Row>
//         <Row gutter={16}>
//           <Col span={12}><Form.Item name="prior_experience" label="Prior Experience (yrs)"><InputNumber style={{ width: "100%" }} min={0} precision={1} /></Form.Item></Col>
//           <Col span={12}><Form.Item name="total_experience" label="Total Experience (yrs)"><InputNumber style={{ width: "100%", background: "#f8fafc" }} disabled /></Form.Item></Col>
//         </Row>

//         {sec("Shift")}
//         <Row gutter={16}>
//           <Col span={12}>
//             <Form.Item name="shift_applicable" label="Shift Applicable" initialValue={false}>
//               <Select options={[{ value: true, label: "Yes" }, { value: false, label: "No" }]} />
//             </Form.Item>
//           </Col>
//           {shiftApplicable && (
//             <Col span={12}>
//               <Form.Item name="shift_type" label="Shift Type" initialValue="category">
//                 <Select options={[{ value: "category", label: "From Master (predefined)" }, { value: "custom", label: "Custom timing" }]} />
//               </Form.Item>
//             </Col>
//           )}
//         </Row>
//         {shiftApplicable && shiftType === "category" && (
//           <Form.Item name="shift_category" label="Shift Category">
//             <Select showSearch placeholder="Select shift" options={(shiftCats as ShiftCategoryOption[]).map((s) => ({ value: s.id, label: `${s.name}  (${s.start_time.slice(0, 5)} – ${s.end_time.slice(0, 5)})` }))} filterOption={ff} />
//           </Form.Item>
//         )}
//         {shiftApplicable && shiftType === "custom" && (
//           <Row gutter={16}>
//             <Col span={12}><Form.Item name="custom_shift_start" label="Shift Start"><TimePicker format="HH:mm" style={{ width: "100%" }} /></Form.Item></Col>
//             <Col span={12}>
//               <Form.Item name="custom_shift_end" label="Shift End" rules={[{ validator: (_, val) => { const s = form.getFieldValue("custom_shift_start"); if (!val || !s) return Promise.resolve(); let e = dayjs(val); if (e.isBefore(dayjs(s))) e = e.add(1, "day"); return Math.abs(e.diff(dayjs(s), "minute") - 540) > 1 ? Promise.reject("Must be 9 hours") : Promise.resolve(); } }]}>
//                 <TimePicker format="HH:mm" style={{ width: "100%" }} />
//               </Form.Item>
//             </Col>
//           </Row>
//         )}
//       </Form>
//     </Drawer>
//   );
// }

// // ── Main Page ─────────────────────────────────────────────────────────────────
// export default function EmployeesPage() {
//   const [divisionFilter, setDivisionFilter] = useState<string | null>(null);
//   const [addOpen, setAddOpen]               = useState(false);
//   const [viewMode, setViewMode]             = useState<"cards" | "table" | "org">("cards");
//   const [page, setPage]                     = useState(1);
//   const navigate = useNavigate();

//   const { data: departments = [] } = useQuery({ queryKey: ["dd", "departments"], queryFn: () => departmentApi.dropdown(), staleTime: 60_000 });

//   // Server-side paged query (cards + table view)
//   const { data: pagedData, isLoading, isError } = useQuery({
//     queryKey: ["employees", "paged", page, PAGE_SIZE, divisionFilter],
//     queryFn: () => employeeApi.listPaged({
//       page,
//       page_size: PAGE_SIZE,
//       ...(divisionFilter ? { department_ref: divisionFilter } : {}),
//     }),
//     enabled: viewMode !== "org",
//     staleTime: 30_000,
//     placeholderData: (prev) => prev,
//   });

//   // Flat list for manager dropdown in the Add drawer (small list, no pagination needed)
//   const { data: allEmpData } = useQuery({
//     queryKey: ["employees", "dropdown"],
//     queryFn: () => employeeApi.listPaged({ page_size: 200 }),
//     staleTime: 60_000,
//   });
//   const allEmployees: Employee[] = (allEmpData as any)?.results ?? [];

//   const employees: Employee[] = (pagedData as any)?.results ?? [];
//   const totalCount: number    = (pagedData as any)?.count ?? 0;

//   const divisionOptions = [
//     { value: null, label: "All Divisions" },
//     ...(departments as any[]).map((d) => ({ value: d.id, label: d.name })),
//   ];

//   const handlePageChange = (p: number) => setPage(p);

//   const handleDivisionChange = (v: string | null) => {
//     setDivisionFilter(v);
//     setPage(1);
//   };

//   return (
//     // <div style={{ minHeight: "100vh", background: "#f5f7fa" }}>
//     <div style={{ minHeight: "100vh", background: "var(--bms-bg)" }}>
//       {/* Header */}
//       <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
//         <div>
//           {/* <div style={{ fontSize: 22, fontWeight: 700, color: "#1a2332" }}>Employees</div>
//           <Text style={{ fontSize: 13, color: "#8c9ab0" }}>Team by division</Text> */}
//           <div style={{ fontSize: 22, fontWeight: 700, color: "var(--bms-text)" }}>Employees</div>
//           <Text style={{ fontSize: 13, color: "var(--bms-text-3)" }}>Team by division</Text>
//         </div>
//         <Space wrap>
//           <Segmented
//             value={viewMode}
//             onChange={(v) => { setViewMode(v as any); setPage(1); }}
//             options={[
//               { value: "cards", icon: <AppstoreOutlined />,     label: "Cards"     },
//               { value: "table", icon: <UnorderedListOutlined />, label: "Table"     },
//               { value: "org",   icon: <ApartmentOutlined />,    label: "Org Chart" },
//             ]}
//           />
//           {viewMode !== "org" && (
//             <Select
//               value={divisionFilter}
//               onChange={handleDivisionChange}
//               style={{ width: 160 }}
//               options={divisionOptions as any}
//               placeholder="All Divisions"
//             />
//           )}
//           <PermGuard permission={PERMS.HRMS_EMPLOYEE_CREATE}>
//             <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
//               Add
//             </Button>
//           </PermGuard>
//         </Space>
//       </div>

//       {/* ── Org Chart view: full company hierarchy ── */}
//       {viewMode === "org" && (
//         <Card style={{ borderRadius: 12 }}>
//           <OrgChart onNavigate={(id) => navigate(`/employees/${id}`)} height={620} />
//         </Card>
//       )}

//       {/* ── Cards / Table loading / error / empty ── */}
//       {viewMode !== "org" && isLoading && (
//         <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}><Spin size="large" /></div>
//       )}
//       {viewMode !== "org" && !isLoading && isError && (
//         <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
//           <Empty description="Failed to load employees. Please refresh." />
//         </div>
//       )}
//       {viewMode !== "org" && !isLoading && !isError && employees.length === 0 && (
//         <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
//           <Empty description="No employees found" />
//         </div>
//       )}

//       {/* ── Cards grid ── */}
//       {viewMode === "cards" && !isLoading && !isError && employees.length > 0 && (
//         <>
//           <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
//             {employees.map((emp) => (
//               <EmployeeCard key={emp.id} emp={emp} onClick={() => navigate(`/employees/${emp.id}`)} />
//             ))}
//           </div>
//           <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
//             <Pagination
//               current={page}
//               pageSize={PAGE_SIZE}
//               total={totalCount}
//               onChange={handlePageChange}
//               showTotal={(t, r) => `Showing ${r[0]}–${r[1]} of ${t} employees`}
//               showSizeChanger={false}
//             />
//           </div>
//         </>
//       )}

//       {/* ── Table view ── */}
//       {viewMode === "table" && !isLoading && !isError && employees.length > 0 && (
//         <>
//           <Card bodyStyle={{ padding: 0 }} style={{ borderRadius: 10, border: "1px solid #e8edf3" }}>
//             <EmployeeTable
//               employees={employees}
//               isLoading={isLoading}
//               onView={(id) => navigate(`/employees/${id}`)}
//             />
//           </Card>
//           <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
//             <Pagination
//               current={page}
//               pageSize={PAGE_SIZE}
//               total={totalCount}
//               onChange={handlePageChange}
//               showTotal={(t, r) => `Showing ${r[0]}–${r[1]} of ${t} employees`}
//               showSizeChanger={false}
//             />
//           </div>
//         </>
//       )}

//       <EmployeeDrawer open={addOpen} onClose={() => setAddOpen(false)} allEmployees={allEmployees} />
//     </div>
//   );
// }
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Typography, Button, Select, Drawer, Form, Input, DatePicker,
  Space, Spin, Empty, message, Row, Col, Divider, TimePicker, InputNumber,
  Card, Segmented, Table, Avatar, Tag, Pagination, Badge, Tooltip,
} from "antd";
import OrgChart from "@/components/OrgChart";
import {
  PlusOutlined, PhoneOutlined, MailOutlined, ClockCircleOutlined,
  AppstoreOutlined, ApartmentOutlined, UnorderedListOutlined,
  UserOutlined, EyeOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";

import { employeeApi, employeeGroupApi, type Employee, type EmployeeCreatePayload } from "@/services/employees";
import { resolveGroupFlags } from "@/constants/keycloakGroups";
import PermGuard from "@/components/common/PermGuard";
import { PERMS } from "@/constants/permissions";
import {
  departmentApi, designationApi, locationApi, gradeApi, employmentTypeApi, shiftCategoryApi,
  type ShiftCategoryOption,
} from "@/services/master";
import { apiErrorMsg } from "@/utils/apiError";
import PhoneInput from "@/components/common/PhoneInput";
import { phoneFormRules } from "@/utils/phone";

const { Text } = Typography;

const PAGE_SIZE = 15;

// ── Helpers ───────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "#E53935", "#8E24AA", "#1E88E5", "#00897B", "#F4511E",
  "#6D4C41", "#546E7A", "#43A047", "#FB8C00", "#D81B60",
  "#5E35B1", "#039BE5", "#00ACC1", "#7CB342", "#FFB300",
];
function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}
function toTitleCase(name: string) {
  return name.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

const DEPT_TAG_COLORS: Record<string, string> = {};
const TAG_PALETTE = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];
function deptTagColor(dept: string) {
  if (!DEPT_TAG_COLORS[dept])
    DEPT_TAG_COLORS[dept] = TAG_PALETTE[Object.keys(DEPT_TAG_COLORS).length % TAG_PALETTE.length];
  return DEPT_TAG_COLORS[dept];
}

const STATUS_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  ACTIVE:   { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
  INACTIVE: { color: "#6b7280", bg: "#f3f4f6", border: "#d1d5db" },
  ON_LEAVE: { color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  RESIGNED: { color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
};

const STATUS_TAG: Record<string, string> = {
  ACTIVE: "success", INACTIVE: "default", ON_LEAVE: "warning", RESIGNED: "error",
};

// ── Employee Card ─────────────────────────────────────────────────────────────
function EmployeeCard({ emp, onClick }: { emp: Employee; onClick: () => void }) {
  const rawName   = emp.full_name || emp.username;
  const name      = toTitleCase(rawName);
  const color     = avatarColor(rawName);
  const dept      = emp.department_name || emp.department || "";
  const desig     = emp.designation_name || emp.designation || "";
  const statusKey = (emp.status || "ACTIVE").toUpperCase();
  const ss        = STATUS_STYLE[statusKey] ?? STATUS_STYLE.ACTIVE;
  const group     = emp.keycloak_group || "";

  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--bms-surface)", borderRadius: 14, padding: "22px 20px 16px",
        cursor: "pointer", border: "1px solid var(--bms-border)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)", transition: "box-shadow 0.18s, transform 0.18s",
        display: "flex", flexDirection: "column",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
    >
      {emp.profile_picture ? (
        <img src={emp.profile_picture} alt={name} style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", marginBottom: 14, border: "2px solid var(--bms-border)" }} />
      ) : (
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 14 }}>
          {initials(rawName)}
        </div>
      )}
      <div style={{ fontSize: 17, fontWeight: 700, color: "var(--bms-text)" }}>{name}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", marginBottom: 14 }}>
        {desig && <span style={{ fontSize: 12.5, color: "var(--bms-text-3)" }}>{desig}</span>}
        {dept && <><span style={{ color: "var(--bms-text-3)", fontSize: 11 }}>·</span><span style={{ fontSize: 11, fontWeight: 600, color: deptTagColor(dept), background: deptTagColor(dept) + "1a", padding: "2px 9px", borderRadius: 20, border: `1px solid ${deptTagColor(dept)}35` }}>{dept.toLowerCase()}</span></>}
        {group && <span style={{ fontSize: 10, fontWeight: 600, color: "var(--bms-text-3)", background: "var(--bms-surface-2)", padding: "1px 7px", borderRadius: 20, border: "1px solid var(--bms-border)" }}>{group}</span>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 16 }}>
        {emp.email && <div style={{ display: "flex", alignItems: "center", gap: 7 }}><MailOutlined style={{ fontSize: 12, color: "var(--bms-text-3)" }} /><span style={{ fontSize: 12.5, color: "var(--bms-text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{emp.email}</span></div>}
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}><ClockCircleOutlined style={{ fontSize: 12, color: "var(--bms-text-3)" }} /><span style={{ fontSize: 12.5, color: "var(--bms-text-3)" }}>{emp.shift_applicable ? "shift applicable" : "general shift"}</span></div>
      </div>
      <div style={{ borderTop: "1px solid var(--bms-border)", marginBottom: 12 }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{
  fontSize: 11, fontWeight: 600, padding: "3px 11px", borderRadius: 20,
  background: statusKey === "ACTIVE" ? "#22c55e"
    : statusKey === "ON_LEAVE" ? "#f59e0b"
    : statusKey === "RESIGNED" ? "#ef4444"
    : "#6b7280",
  color: "#ffffff",
  border: "none",
  display: "inline-flex", alignItems: "center", gap: 5,
}}>
  <span style={{
    width: 6, height: 6, borderRadius: "50%",
    background: "#ffffff", opacity: 0.85, flexShrink: 0,
  }} />
  {statusKey.toLowerCase().replace("_", " ")}
</span>
        {emp.employee_code && <span style={{ fontSize: 12.5, color: "var(--bms-text-3)", fontFamily: "monospace" }}>{emp.employee_code}</span>}
      </div>
    </div>
  );
}

// ── Table View ────────────────────────────────────────────────────────────────
function EmployeeTable({ employees, isLoading, onView }: {
  employees: Employee[];
  isLoading: boolean;
  onView: (id: string) => void;
}) {
  const columns = [
    {
      title: "Employee",
      key: "employee",
      width: 240,
      render: (_: any, emp: Employee) => {
        const rawName = emp.full_name || emp.username;
        const name    = toTitleCase(rawName);
        const color   = avatarColor(rawName);
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {emp.profile_picture ? (
              <Avatar src={emp.profile_picture} size={36} />
            ) : (
              <Avatar size={36} style={{ background: color, fontWeight: 700, fontSize: 14 }}>
                {initials(rawName)}
              </Avatar>
            )}
            <div>
              {/* ✅ was: #111827 */}
              <div style={{ fontWeight: 600, fontSize: 13, color: "var(--bms-text)", lineHeight: 1.3 }}>{name}</div>
              {/* ✅ was: #9ca3af */}
              <div style={{ fontSize: 11, color: "var(--bms-text-3)" }}>{emp.email}</div>
            </div>
          </div>
        );
      },
    },
    {
      title: "Code",
      dataIndex: "employee_code",
      key: "code",
      width: 90,
      render: (v: string) => v ? <Text code style={{ fontSize: 11 }}>{v}</Text> : "—",
    },
    {
      title: "Designation",
      key: "designation",
      width: 180,
      render: (_: any, emp: Employee) => emp.designation_name || emp.designation || "—",
    },
    {
      title: "Department",
      key: "department",
      width: 140,
      render: (_: any, emp: Employee) => {
        const dept = emp.department_name || emp.department || "";
        if (!dept) return "—";
        return (
          <Tag color={deptTagColor(dept)} style={{ fontSize: 11, border: "none", background: deptTagColor(dept) + "18", color: deptTagColor(dept) }}>
            {dept.toLowerCase()}
          </Tag>
        );
      },
    },
    {
      title: "Role",
      dataIndex: "keycloak_group",
      key: "group",
      width: 120,
      render: (v: string) => v ? <Tag color="purple" style={{ fontSize: 11 }}>{v}</Tag> : "—",
    },
    {
      title: "Type",
      key: "emp_type",
      width: 110,
      render: (_: any, emp: Employee) => emp.employment_type_name || "—",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (v: string) => {
        const key = (v || "ACTIVE").toUpperCase();
        return (
          <Badge
            status={STATUS_TAG[key] as any}
            text={<span style={{ fontSize: 12 }}>{key.toLowerCase().replace("_", " ")}</span>}
          />
        );
      },
    },
    {
      title: "Joined",
      dataIndex: "joining_date",
      key: "joined",
      width: 110,
      render: (v: string) => v ? dayjs(v).format("DD MMM YYYY") : "—",
    },
    {
      title: "Shift",
      dataIndex: "shift_applicable",
      key: "shift",
      width: 100,
      render: (v: boolean) => (
        <Tag color={v ? "blue" : "default"} style={{ fontSize: 11 }}>
          {v ? "Shift" : "General"}
        </Tag>
      ),
    },
    {
      title: "",
      key: "action",
      width: 60,
      render: (_: any, emp: Employee) => (
        <Tooltip title="View Profile">
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={(e) => { e.stopPropagation(); onView(emp.id); }}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <Table
      dataSource={employees}
      columns={columns}
      rowKey="id"
      loading={isLoading}
      size="middle"
      pagination={false}
      onRow={(emp) => ({ onClick: () => onView(emp.id), style: { cursor: "pointer" } })}
      style={{ borderRadius: 10, overflow: "hidden" }}
      scroll={{ x: 1100 }}
    />
  );
}

// ── Add Employee Drawer ───────────────────────────────────────────────────────
function EmployeeDrawer({ open, onClose, allEmployees }: { open: boolean; onClose: () => void; allEmployees: any[] }) {
  const [form] = Form.useForm();
  const qc = useQueryClient();
  const shiftApplicable = Form.useWatch("shift_applicable", form);
  const shiftType       = Form.useWatch("shift_type", form);

  const { data: designations = [] } = useQuery({ queryKey: ["dd", "designations"], queryFn: () => designationApi.dropdown(),    staleTime: 60_000 });
  const { data: departments = [] }  = useQuery({ queryKey: ["dd", "departments"],  queryFn: () => departmentApi.dropdown(),     staleTime: 60_000 });
  const { data: locations = [] }    = useQuery({ queryKey: ["dd", "locations"],    queryFn: () => locationApi.dropdown(),       staleTime: 60_000 });
  const { data: grades = [] }       = useQuery({ queryKey: ["dd", "grades"],       queryFn: () => gradeApi.dropdown(),          staleTime: 60_000 });
  const { data: empTypes = [] }     = useQuery({ queryKey: ["dd", "emp-types"],    queryFn: () => employmentTypeApi.dropdown(), staleTime: 60_000 });
  const { data: kcGroups = [] }     = useQuery({ queryKey: ["dd", "kc-groups"],    queryFn: () => employeeGroupApi.list(),      staleTime: 300_000 });
  const { data: shiftCats = [] }    = useQuery({ queryKey: ["dd", "shift-cats"],   queryFn: () => shiftCategoryApi.dropdown(),  staleTime: 60_000 });

  const createMut = useMutation({
    mutationFn: (v: EmployeeCreatePayload) => employeeApi.create(v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employees"] }); message.success("Employee created"); form.resetFields(); onClose(); },
    onError: (e: any) => message.error(apiErrorMsg(e, "Failed to create employee")),
  });

  const recalcTotalExp = () => {
    const jd: dayjs.Dayjs | undefined = form.getFieldValue("joining_date");
    const prior = parseFloat(form.getFieldValue("prior_experience") ?? 0) || 0;
    if (jd) form.setFieldsValue({ total_experience: parseFloat((dayjs().diff(jd, "day") / 365 + prior).toFixed(1)) });
  };

  const onFinish = (values: any) => {
    const groupFlags = values.keycloak_group ? resolveGroupFlags(values.keycloak_group) : {};
    createMut.mutate({
      ...values, ...groupFlags,
      joining_date:       values.joining_date         ? dayjs(values.joining_date).format("YYYY-MM-DD")        : null,
      date_of_birth:      values.date_of_birth        ? dayjs(values.date_of_birth).format("YYYY-MM-DD")        : null,
      custom_shift_start: values.custom_shift_start   ? dayjs(values.custom_shift_start).format("HH:mm:ss")    : null,
      custom_shift_end:   values.custom_shift_end     ? dayjs(values.custom_shift_end).format("HH:mm:ss")      : null,
      shift_category:     values.shift_type === "category" ? values.shift_category : null,
      total_experience:   values.total_experience ?? null,
    });
  };

  const dd  = (arr: any[]) => arr.map((d) => ({ value: d.id, label: d.name }));
  const ff  = (input: string, opt: any) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase());
  const sec = (label: string) => (
    // ✅ was: color: "#5a6a7e"
    <><Typography.Text strong style={{ fontSize: 13, color: "var(--bms-text-3)" }}>{label}</Typography.Text><Divider style={{ margin: "8px 0 16px" }} /></>
  );

  return (
    <Drawer
      title="Add Employee" open={open}
      onClose={() => { form.resetFields(); onClose(); }}
      width={700} destroyOnClose
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button onClick={() => { form.resetFields(); onClose(); }}>Cancel</Button>
          <Button type="primary" loading={createMut.isPending} onClick={() => form.submit()}>Create</Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" onFinish={onFinish} onValuesChange={(c) => { if ("joining_date" in c || "prior_experience" in c) recalcTotalExp(); }}>
        {sec("Role")}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="keycloak_group" label="Role" rules={[{ required: true }]}>
              <Select showSearch allowClear placeholder="Select role" options={(kcGroups as string[]).map((g) => ({ value: g, label: g }))} filterOption={ff as any} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="manager" label="Reporting Manager">
              <Select showSearch allowClear placeholder="Select manager" filterOption={ff}
                options={(allEmployees as any[]).map((e: any) => ({ value: e.id, label: `${e.full_name} (${e.employee_code})` }))} />
            </Form.Item>
          </Col>
        </Row>

        {sec("Personal Information")}
        <Row gutter={16}>
          <Col span={12}><Form.Item name="first_name" label="First Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
          <Col span={12}><Form.Item name="last_name" label="Last Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}><Form.Item name="email" label="Email" rules={[{ required: true, type: "email" }]}><Input prefix={<MailOutlined />} /></Form.Item></Col>
          <Col span={12}>
            <Form.Item name="phone_number" label="Phone" rules={phoneFormRules({ label: "Phone number" })}>
              <PhoneInput />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="alternative_number" label="Alternative Number" rules={phoneFormRules({ label: "Alternative number" })}>
              <PhoneInput />
            </Form.Item>
          </Col>
          <Col span={12}><Form.Item name="gender" label="Gender"><Select allowClear options={[{ value: "M", label: "Male" }, { value: "F", label: "Female" }, { value: "O", label: "Other" }]} /></Form.Item></Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}><Form.Item name="date_of_birth" label="Date of Birth"><DatePicker style={{ width: "100%" }} format="DD MMM YYYY" /></Form.Item></Col>
        </Row>
        <Form.Item name="address" label="Address"><Input.TextArea rows={2} /></Form.Item>

        {sec("Employment Details")}
        <Row gutter={16}>
          <Col span={12}><Form.Item name="designation_ref" label="Designation"><Select showSearch allowClear options={dd(designations as any[])} filterOption={ff} /></Form.Item></Col>
          <Col span={12}><Form.Item name="department_ref" label="Department"><Select showSearch allowClear options={dd(departments as any[])} filterOption={ff} /></Form.Item></Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}><Form.Item name="location" label="Branch / Location"><Select showSearch allowClear options={dd(locations as any[])} filterOption={ff} /></Form.Item></Col>
          <Col span={12}><Form.Item name="employment_type" label="Employment Type"><Select showSearch allowClear options={dd(empTypes as any[])} filterOption={ff} /></Form.Item></Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}><Form.Item name="joining_date" label="Date of Joining"><DatePicker style={{ width: "100%" }} format="DD MMM YYYY" /></Form.Item></Col>
          <Col span={12}><Form.Item name="status" label="Status" initialValue="ACTIVE"><Select options={[{ value: "ACTIVE", label: "Active" }, { value: "INACTIVE", label: "Inactive" }]} /></Form.Item></Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}><Form.Item name="prior_experience" label="Prior Experience (yrs)"><InputNumber style={{ width: "100%" }} min={0} precision={1} /></Form.Item></Col>
          {/* ✅ was: background: "#f8fafc" */}
          <Col span={12}><Form.Item name="total_experience" label="Total Experience (yrs)"><InputNumber style={{ width: "100%", background: "var(--bms-surface-2)" }} disabled /></Form.Item></Col>
        </Row>

        {sec("Shift")}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="shift_applicable" label="Shift Applicable" initialValue={false}>
              <Select options={[{ value: true, label: "Yes" }, { value: false, label: "No" }]} />
            </Form.Item>
          </Col>
          {shiftApplicable && (
            <Col span={12}>
              <Form.Item name="shift_type" label="Shift Type" initialValue="category">
                <Select options={[{ value: "category", label: "From Master (predefined)" }, { value: "custom", label: "Custom timing" }]} />
              </Form.Item>
            </Col>
          )}
        </Row>
        {shiftApplicable && shiftType === "category" && (
          <Form.Item name="shift_category" label="Shift Category">
            <Select showSearch placeholder="Select shift" options={(shiftCats as ShiftCategoryOption[]).map((s) => ({ value: s.id, label: `${s.name}  (${s.start_time.slice(0, 5)} – ${s.end_time.slice(0, 5)})` }))} filterOption={ff} />
          </Form.Item>
        )}
        {shiftApplicable && shiftType === "custom" && (
          <Row gutter={16}>
            <Col span={12}><Form.Item name="custom_shift_start" label="Shift Start"><TimePicker format="HH:mm" style={{ width: "100%" }} /></Form.Item></Col>
            <Col span={12}>
              <Form.Item name="custom_shift_end" label="Shift End" rules={[{ validator: (_, val) => { const s = form.getFieldValue("custom_shift_start"); if (!val || !s) return Promise.resolve(); let e = dayjs(val); if (e.isBefore(dayjs(s))) e = e.add(1, "day"); return Math.abs(e.diff(dayjs(s), "minute") - 540) > 1 ? Promise.reject("Must be 9 hours") : Promise.resolve(); } }]}>
                <TimePicker format="HH:mm" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
        )}
      </Form>
    </Drawer>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function EmployeesPage() {
  const [divisionFilter, setDivisionFilter] = useState<string | null>(null);
  const [addOpen, setAddOpen]               = useState(false);
  const [viewMode, setViewMode]             = useState<"cards" | "table" | "org">("cards");
  const [page, setPage]                     = useState(1);
  const navigate = useNavigate();

  const { data: departments = [] } = useQuery({ queryKey: ["dd", "departments"], queryFn: () => departmentApi.dropdown(), staleTime: 60_000 });

  const { data: pagedData, isLoading, isError } = useQuery({
    queryKey: ["employees", "paged", page, PAGE_SIZE, divisionFilter],
    queryFn: () => employeeApi.listPaged({
      page,
      page_size: PAGE_SIZE,
      ...(divisionFilter ? { department_ref: divisionFilter } : {}),
    }),
    enabled: viewMode !== "org",
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const { data: allEmpData } = useQuery({
    queryKey: ["employees", "dropdown"],
    queryFn: () => employeeApi.listPaged({ page_size: 200 }),
    staleTime: 60_000,
  });
  const allEmployees: Employee[] = (allEmpData as any)?.results ?? [];

  const employees: Employee[] = (pagedData as any)?.results ?? [];
  const totalCount: number    = (pagedData as any)?.count ?? 0;

  const divisionOptions = [
    { value: null, label: "All Divisions" },
    ...(departments as any[]).map((d) => ({ value: d.id, label: d.name })),
  ];

  const handlePageChange = (p: number) => setPage(p);
  const handleDivisionChange = (v: string | null) => { setDivisionFilter(v); setPage(1); };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bms-bg)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--bms-text)" }}>Employees</div>
          <Text style={{ fontSize: 13, color: "var(--bms-text-3)" }}>Team by division</Text>
        </div>
        <Space wrap>
          <Segmented
            value={viewMode}
            onChange={(v) => { setViewMode(v as any); setPage(1); }}
            options={[
              { value: "cards", icon: <AppstoreOutlined />,     label: "Cards"     },
              { value: "table", icon: <UnorderedListOutlined />, label: "Table"     },
              { value: "org",   icon: <ApartmentOutlined />,    label: "Org Chart" },
            ]}
          />
          {viewMode !== "org" && (
            <Select
              value={divisionFilter}
              onChange={handleDivisionChange}
              style={{ width: 160 }}
              options={divisionOptions as any}
              placeholder="All Divisions"
            />
          )}
          <PermGuard permission={PERMS.HRMS_EMPLOYEE_CREATE}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
              Add
            </Button>
          </PermGuard>
        </Space>
      </div>

      {viewMode === "org" && (
        <Card style={{ borderRadius: 12 }}>
          <OrgChart onNavigate={(id) => navigate(`/employees/${id}`)} height={620} />
        </Card>
      )}

      {viewMode !== "org" && isLoading && (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}><Spin size="large" /></div>
      )}
      {viewMode !== "org" && !isLoading && isError && (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
          <Empty description="Failed to load employees. Please refresh." />
        </div>
      )}
      {viewMode !== "org" && !isLoading && !isError && employees.length === 0 && (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
          <Empty description="No employees found" />
        </div>
      )}

      {viewMode === "cards" && !isLoading && !isError && employees.length > 0 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
            {employees.map((emp) => (
              <EmployeeCard key={emp.id} emp={emp} onClick={() => navigate(`/employees/${emp.id}`)} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
            <Pagination
              current={page} pageSize={PAGE_SIZE} total={totalCount}
              onChange={handlePageChange}
              showTotal={(t, r) => `Showing ${r[0]}–${r[1]} of ${t} employees`}
              showSizeChanger={false}
            />
          </div>
        </>
      )}

      {/* ✅ Table card border: was hardcoded #e8edf3 */}
      {viewMode === "table" && !isLoading && !isError && employees.length > 0 && (
        <>
          <Card bodyStyle={{ padding: 0 }} style={{ borderRadius: 10, border: "1px solid var(--bms-border)" }}>
            <EmployeeTable
              employees={employees}
              isLoading={isLoading}
              onView={(id) => navigate(`/employees/${id}`)}
            />
          </Card>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <Pagination
              current={page} pageSize={PAGE_SIZE} total={totalCount}
              onChange={handlePageChange}
              showTotal={(t, r) => `Showing ${r[0]}–${r[1]} of ${t} employees`}
              showSizeChanger={false}
            />
          </div>
        </>
      )}

      <EmployeeDrawer open={addOpen} onClose={() => setAddOpen(false)} allEmployees={allEmployees} />
    </div>
  );
}