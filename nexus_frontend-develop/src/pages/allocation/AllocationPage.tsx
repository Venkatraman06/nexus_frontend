import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table, Card, Progress, Tag, Typography, Row, Col, Statistic,
  Select, Space, Button, Modal, Form, InputNumber, Input,
  Tabs, Popconfirm, Tooltip, message, Slider, Avatar, Badge,
  DatePicker,
} from "antd";
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { get } from "@/services/api";
import { ENDPOINTS } from "@/constants/api";
import { employeeApi, type SimpleDropdownEmployee } from "@/services/employees";
import {
  allocationApi,
  type Allocation,
  type AllocationCreatePayload,
  type ProjectDropdown,
} from "@/services/allocation";
import PermGuard from "@/components/common/PermGuard";
import { PERMS } from "@/constants/permissions";
import { apiErrorMsg } from "@/utils/apiError";

const { Title, Text } = Typography;
const { TextArea } = Input;

function getAllocationStatus(rec: Allocation): { label: string; color: "success" | "error" | "processing" | "default" } {
  const today = dayjs();
  const start = dayjs(rec.start_date);
  const end = rec.end_date ? dayjs(rec.end_date) : null;
  if (end && today.isAfter(end, "day")) return { label: "Ended", color: "default" };
  if (today.isBefore(start, "day")) return { label: "Future", color: "processing" };
  return { label: "Active", color: "success" };
}

export default function AllocationPage() {
  const today = dayjs();
  const [year, setYear] = useState(today.year());
  const [month, setMonth] = useState(today.month() + 1);
  const [activeTab, setActiveTab] = useState("capacity");

  // Manage Allocations state
  const [modalOpen, setModalOpen] = useState(false);
  const [editAllocation, setEditAllocation] = useState<Allocation | null>(null);
  const [filterEmployee, setFilterEmployee] = useState<string | undefined>();
  const [filterProject, setFilterProject] = useState<string | undefined>();
  const [allocationPct, setAllocationPct] = useState(50);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // ─── Queries ──────────────────────────────────────────────────────────────

  const { data: capacityData, isLoading: capacityLoading } = useQuery({
    queryKey: ["employee-capacity", year, month],
    queryFn: () => get<any>(ENDPOINTS.EMPLOYEE_CAPACITY, { year, month }),
  });

  const { data: allocations = [], isLoading: allocLoading, refetch } = useQuery<Allocation[]>({
    queryKey: ["allocations", filterEmployee, filterProject],
    queryFn: () =>
      allocationApi.list({
        ...(filterEmployee ? { employee: filterEmployee } : {}),
        ...(filterProject ? { project: filterProject } : {}),
        page_size: 500,
      }),
    enabled: activeTab === "manage",
  });

  const { data: employees = [] } = useQuery<SimpleDropdownEmployee[]>({
    queryKey: ["dd", "employees-simple"],
    queryFn: () => employeeApi.simpleDropdown(),
    staleTime: 60_000,
  });

  const { data: projects = [] } = useQuery<ProjectDropdown[]>({
    queryKey: ["dd", "projects-dropdown"],
    queryFn: () => allocationApi.projectDropdown(),
    staleTime: 60_000,
  });

  // ─── Mutations ────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (data: AllocationCreatePayload) => allocationApi.create(data),
    onSuccess: () => {
      message.success("Allocation created");
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
      queryClient.invalidateQueries({ queryKey: ["employee-capacity"] });
      closeModal();
    },
    onError: (e: any) => message.error(apiErrorMsg(e, "Failed to create allocation")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AllocationCreatePayload> }) =>
      allocationApi.update(id, data),
    onSuccess: () => {
      message.success("Allocation updated");
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
      queryClient.invalidateQueries({ queryKey: ["employee-capacity"] });
      closeModal();
    },
    onError: (e: any) => message.error(apiErrorMsg(e, "Failed to update allocation")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => allocationApi.delete(id),
    onSuccess: () => {
      message.success("Allocation removed");
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
      queryClient.invalidateQueries({ queryKey: ["employee-capacity"] });
    },
    onError: (e: any) => message.error(apiErrorMsg(e, "Failed to remove allocation")),
  });

  // ─── Modal helpers ────────────────────────────────────────────────────────

  function openCreate() {
    setEditAllocation(null);
    setAllocationPct(50);
    form.resetFields();
    form.setFieldValue("allocation_percentage", 50);
    setModalOpen(true);
  }

  function openEdit(rec: Allocation) {
    setEditAllocation(rec);
    const pct = Number(rec.allocation_percentage);
    setAllocationPct(pct);
    form.setFieldsValue({
      employee: rec.employee,
      project: rec.project,
      allocation_percentage: pct,
      start_date: dayjs(rec.start_date),
      end_date: rec.end_date ? dayjs(rec.end_date) : null,
      notes: rec.notes,
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditAllocation(null);
    form.resetFields();
  }

  function handleSubmit() {
    form.validateFields().then((vals) => {
      const payload: AllocationCreatePayload = {
        employee: vals.employee,
        project: vals.project,
        allocation_percentage: vals.allocation_percentage,
        start_date: vals.start_date.format("YYYY-MM-DD"),
        end_date: vals.end_date ? vals.end_date.format("YYYY-MM-DD") : null,
        notes: vals.notes || "",
      };
      if (editAllocation) {
        updateMutation.mutate({ id: editAllocation.id, data: payload });
      } else {
        createMutation.mutate(payload);
      }
    });
  }

  // ─── Capacity Matrix ──────────────────────────────────────────────────────

  const rows = Array.isArray(capacityData) ? capacityData : [];
  const overAllocated = rows.filter((r: any) => r.is_over_allocated).length;
  const avgUtil = rows.length
    ? Math.round(rows.reduce((s: number, r: any) => s + r.utilization_percent, 0) / rows.length)
    : 0;
  const totalLogged = rows.reduce((s: number, r: any) => s + r.logged_hours, 0);

  const capacityColumns = [
    {
      title: "Employee",
      dataIndex: "employee_name",
      key: "employee_name",
      render: (name: string) => (
        <Space>
          <Avatar size={28} icon={<UserOutlined />} style={{ background: "#1677ff", flexShrink: 0 }} />
          <Text style={{ fontWeight: 500 }}>{name}</Text>
        </Space>
      ),
    },
    { title: "Working Days", dataIndex: "working_days", key: "working_days", width: 120 },
    {
      title: "Capacity",
      dataIndex: "total_capacity_hours",
      key: "total_capacity_hours",
      width: 100,
      render: (v: number) => `${v}h`,
    },
    {
      title: "Allocated",
      dataIndex: "allocated_hours",
      key: "allocated_hours",
      width: 100,
      render: (v: number) => `${v}h`,
    },
    {
      title: "Logged",
      dataIndex: "logged_hours",
      key: "logged_hours",
      width: 100,
      render: (v: number) => `${v}h`,
    },
    {
      title: "Utilization",
      key: "utilization",
      width: 160,
      render: (_: any, r: any) => (
        <div>
          <Progress
            percent={Math.min(Math.round(r.utilization_percent), 100)}
            status={r.utilization_percent > 100 ? "exception" : "normal"}
            size="small"
          />
          <Text style={{ fontSize: 11, color: "var(--bms-text-3)" }}>
            {r.utilization_percent.toFixed(1)}%
          </Text>
        </div>
      ),
    },
    {
      title: "Billing Util.",
      dataIndex: "billing_utilization_percent",
      key: "billing_util",
      width: 110,
      render: (v: number) => (
        <Tag color={v >= 70 ? "success" : v >= 40 ? "warning" : "error"}>
          {v?.toFixed(0)}%
        </Tag>
      ),
    },
    {
      title: "Allocation",
      key: "allocation_status",
      width: 190,
      render: (_: any, r: any) =>
        r.is_over_allocated ? (
          <Tag color="error" style={{ fontWeight: 500 }}>
            Over-allocated · {r.allocation_percent}%
          </Tag>
        ) : (
          <Tag color={r.allocation_percent >= 80 ? "warning" : "success"}>
            {r.allocation_percent}%
          </Tag>
        ),
    },
  ];

  // ─── Allocations Table ────────────────────────────────────────────────────

  const allocationColumns = [
    {
      title: "Employee",
      key: "employee",
      render: (_: any, r: Allocation) => (
        <Space>
          <Avatar size={32} icon={<UserOutlined />} style={{ background: "#1677ff", flexShrink: 0 }} />
          <div>
            <Text style={{ fontWeight: 500, display: "block" }}>{r.employee_name}</Text>
            <Text style={{ fontSize: 11, color: "var(--bms-text-3)" }}>
              {r.employee_code}
              {r.designation_name ? ` · ${r.designation_name}` : ""}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Project",
      key: "project",
      render: (_: any, r: Allocation) => (
        <div>
          <Text style={{ fontWeight: 500, display: "block" }}>{r.project_name}</Text>
          <Tag style={{ fontSize: 11, marginTop: 2 }}>{r.project_code}</Tag>
        </div>
      ),
    },
    {
      title: "Allocation",
      key: "allocation_pct",
      width: 160,
      render: (_: any, r: Allocation) => (
        <div>
          <Progress
            percent={Number(r.allocation_percentage)}
            size="small"
            status={Number(r.allocation_percentage) >= 100 ? "exception" : "normal"}
            style={{ width: 120 }}
          />
          <Text style={{ fontSize: 11, color: "var(--bms-text-3)" }}>
            {r.daily_hours.toFixed(1)}h/day
          </Text>
        </div>
      ),
    },
    {
      title: "Period",
      key: "period",
      render: (_: any, r: Allocation) => (
        <div>
          <Text style={{ fontSize: 13 }}>{dayjs(r.start_date).format("DD MMM YYYY")}</Text>
          <br />
          <Text style={{ fontSize: 12, color: "var(--bms-text-3)" }}>
            {r.end_date ? `→ ${dayjs(r.end_date).format("DD MMM YYYY")}` : "→ Ongoing"}
          </Text>
        </div>
      ),
    },
    {
      title: "Status",
      key: "status",
      width: 90,
      render: (_: any, r: Allocation) => {
        const { label, color } = getAllocationStatus(r);
        return <Badge status={color} text={label} />;
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 90,
      render: (_: any, r: Allocation) => (
        <Space>
          <PermGuard permission={PERMS.PROJECT_ALLOCATION_UPDATE}>
            <Tooltip title="Edit">
              <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
            </Tooltip>
          </PermGuard>
          <PermGuard permission={PERMS.PROJECT_ALLOCATION_DELETE}>
            <Popconfirm
              title="Remove this allocation?"
              description="This action cannot be undone."
              onConfirm={() => deleteMutation.mutate(r.id)}
              okText="Remove"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Delete">
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          </PermGuard>
        </Space>
      ),
    },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>Resource Allocation</Title>
          <Text style={{ color: "var(--bms-text-3)" }}>Manage and monitor team capacity</Text>
        </Col>
        <Col>
          <PermGuard permission={PERMS.PROJECT_ALLOCATION_CREATE}>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Add Allocation
            </Button>
          </PermGuard>
        </Col>
      </Row>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "capacity",
            label: "Capacity Matrix",
            children: (
              <>
                <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                  <Col>
                    <Space>
                      <Select
                        value={month}
                        onChange={setMonth}
                        style={{ width: 140 }}
                        options={Array.from({ length: 12 }, (_, i) => ({
                          value: i + 1,
                          label: dayjs().month(i).format("MMMM"),
                        }))}
                      />
                      <Select
                        value={year}
                        onChange={setYear}
                        style={{ width: 100 }}
                        options={[-1, 0, 1].map((d) => {
                          const y = today.year() + d;
                          return { value: y, label: String(y) };
                        })}
                      />
                    </Space>
                  </Col>
                </Row>

                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col xs={12} sm={6}>
                    <Card className="stat-card" size="small">
                      <Statistic title="Total Employees" value={rows.length} />
                    </Card>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Card className="stat-card" size="small">
                      <Statistic
                        title="Over-Allocated"
                        value={overAllocated}
                        valueStyle={{ color: overAllocated > 0 ? "#ff4d4f" : undefined }}
                      />
                    </Card>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Card className="stat-card" size="small">
                      <Statistic title="Avg Utilization" value={avgUtil} suffix="%" />
                    </Card>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Card className="stat-card" size="small">
                      <Statistic
                        title="Total Logged Hours"
                        value={totalLogged.toFixed(1)}
                        suffix="h"
                      />
                    </Card>
                  </Col>
                </Row>

                <Card>
                  <Table
                    columns={capacityColumns}
                    dataSource={rows}
                    rowKey="employee_id"
                    loading={capacityLoading}
                    size="middle"
                    pagination={{ pageSize: 20, showSizeChanger: true }}
                    rowClassName={(r: any) => (r.is_over_allocated ? "ant-table-row-danger" : "")}
                  />
                </Card>
              </>
            ),
          },
          {
            key: "manage",
            label: "Manage Allocations",
            children: (
              <>
                <Row gutter={12} style={{ marginBottom: 16 }}>
                  <Col>
                    <Space wrap>
                      <Select
                        allowClear
                        showSearch
                        placeholder="Filter by employee"
                        style={{ width: 230 }}
                        value={filterEmployee}
                        onChange={setFilterEmployee}
                        optionFilterProp="label"
                        options={employees.map((e) => ({
                          value: e.id,
                          label: `${e.employee_code} – ${e.full_name}`,
                        }))}
                      />
                      <Select
                        allowClear
                        showSearch
                        placeholder="Filter by project"
                        style={{ width: 230 }}
                        value={filterProject}
                        onChange={setFilterProject}
                        optionFilterProp="label"
                        options={projects.map((p) => ({
                          value: p.id,
                          label: `${p.code} – ${p.name}`,
                        }))}
                      />
                      <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
                        Refresh
                      </Button>
                    </Space>
                  </Col>
                </Row>

                <Card>
                  <Table
                    columns={allocationColumns}
                    dataSource={allocations}
                    rowKey="id"
                    loading={allocLoading}
                    size="middle"
                    pagination={{ pageSize: 20, showSizeChanger: true }}
                    locale={{ emptyText: "No allocations found. Use the filters above or add a new allocation." }}
                  />
                </Card>
              </>
            ),
          },
        ]}
      />

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        title={editAllocation ? "Edit Allocation" : "Add Allocation"}
        onCancel={closeModal}
        onOk={handleSubmit}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        okText={editAllocation ? "Update" : "Create"}
        width={520}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="employee"
            label="Employee"
            rules={[{ required: true, message: "Select an employee" }]}
          >
            <Select
              showSearch
              placeholder="Search by name or code..."
              optionFilterProp="label"
              disabled={!!editAllocation}
              options={employees.map((e) => ({
                value: e.id,
                label: `${e.employee_code} – ${e.full_name}`,
                description: e.designation_name,
              }))}
              optionRender={(opt) => (
                <div>
                  <Text style={{ fontSize: 13 }}>{opt.data.label}</Text>
                  {opt.data.description && (
                    <Text style={{ fontSize: 11, color: "var(--bms-text-3)", display: "block" }}>
                      {opt.data.description}
                    </Text>
                  )}
                </div>
              )}
            />
          </Form.Item>

          <Form.Item
            name="project"
            label="Project"
            rules={[{ required: true, message: "Select a project" }]}
          >
            <Select
              showSearch
              placeholder="Search by project name or code..."
              optionFilterProp="label"
              options={projects.map((p) => ({
                value: p.id,
                label: `${p.code} – ${p.name}`,
              }))}
            />
          </Form.Item>

          <Form.Item
            label={`Allocation Percentage · ${allocationPct}% = ${((allocationPct / 100) * 8).toFixed(1)}h/day`}
            style={{ marginBottom: 8 }}
          >
            <Slider
              min={1}
              max={100}
              value={allocationPct}
              onChange={(v) => {
                setAllocationPct(v);
                form.setFieldValue("allocation_percentage", v);
              }}
              marks={{ 25: "25%", 50: "50%", 75: "75%", 100: "100%" }}
            />
          </Form.Item>

          <Form.Item
            name="allocation_percentage"
            rules={[
              { required: true, message: "Set allocation percentage" },
              { type: "number", min: 1, max: 100, message: "Must be 1–100" },
            ]}
            style={{ marginTop: -8 }}
          >
            <InputNumber
              min={1}
              max={100}
              addonAfter="%"
              style={{ width: 130 }}
              onChange={(v) => {
                if (v != null) setAllocationPct(v);
              }}
            />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="start_date"
                label="Start Date"
                rules={[{ required: true, message: "Required" }]}
              >
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="end_date" label="End Date (optional)">
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="notes" label="Notes">
            <TextArea rows={3} placeholder="Optional notes..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
