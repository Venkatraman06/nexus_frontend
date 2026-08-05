import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table, Button, Tag, Space, Modal, Form, Input, Select,
  DatePicker, InputNumber, Tooltip, Typography, Card, Row, Col,
  message, Spin, Switch, Segmented,
} from "antd";
import {
  PlusOutlined, EditOutlined, EyeOutlined, ReloadOutlined,
  AppstoreOutlined, UnorderedListOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { projectsApi, type Project, type ClientDropdownItem } from "@/services/projects";
import { workflowStateApi, workflowTransitionApi } from "@/services/workflow";
import { employeeApi, type SimpleDropdownEmployee } from "@/services/employees";
import ProjectBoard from "@/components/projects/ProjectBoard";
import { useAuthStore } from "@/store/auth";
import RichTextEditor from "@/components/common/RichTextEditor";
import { businessTypeApi, billingTypeApi, type BusinessTypeDropdown, type DropdownOption } from "@/services/master";
import PermGuard from "@/components/common/PermGuard";
import { PERMS } from "@/constants/permissions";
import dayjs from "dayjs";
import { apiErrorMsg } from "@/utils/apiError";

const { Title, Text } = Typography;

function fmtBudget(n?: number | null) {
  if (n == null) return "—";
  return `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}


type ViewMode = "board" | "list";

export default function ProjectsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("board");
  const [modalOpen, setModalOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  // ── Master dropdowns ────────────────────────────────────────────────────────
  const { data: businessTypes = [] } = useQuery<BusinessTypeDropdown[]>({
    queryKey: ["dd", "business-types"],
    queryFn: () => businessTypeApi.dropdown(),
    staleTime: 60_000,
  });
  const { data: billingTypes = [] } = useQuery<DropdownOption[]>({
    queryKey: ["dd", "billing-types"],
    queryFn: () => billingTypeApi.dropdown(),
    staleTime: 60_000,
  });
  const { data: clients = [] } = useQuery<ClientDropdownItem[]>({
    queryKey: ["dd", "clients"],
    queryFn: () => projectsApi.clientDropdown(),
    staleTime: 60_000,
  });

  // ── Projects list ───────────────────────────────────────────────────────────
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectsApi.list({ page_size: 200 }),
  });

  const { data: workflowStates = [] } = useQuery({
    queryKey: ["wf-states", "projects", "project"],
    queryFn: () => workflowStateApi.list("projects", "project"),
    staleTime: 60_000,
  });

  const { data: workflowTransitions = [] } = useQuery({
    queryKey: ["wf-transitions", "projects", "project"],
    queryFn: () => workflowTransitionApi.list("projects", "project"),
    staleTime: 60_000,
  });

  const { data: employees = [] } = useQuery<SimpleDropdownEmployee[]>({
    queryKey: ["dd", "employees-simple"],
    queryFn: () => employeeApi.simpleDropdown(),
    staleTime: 60_000,
  });

  // ── Mutations ───────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (values: any) =>
      editProject
        ? projectsApi.update(editProject.id, values)
        : projectsApi.create(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setModalOpen(false);
      form.resetFields();
      setEditProject(null);
      message.success(editProject ? "Project updated" : "Project created");
    },
    onError: (e: any) => message.error(apiErrorMsg(e, "Failed to save project")),
  });

  const transitionMutation = useMutation({
    mutationFn: ({
      id,
      destinationSlug,
      comments,
      managerId,
    }: {
      id: string;
      destinationSlug: string;
      comments?: string;
      managerId?: string;
    }) => projectsApi.transition(id, destinationSlug, comments, managerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      message.success("Project moved to new workflow stage");
    },
    onError: (e: any) => message.error(apiErrorMsg(e, "Cannot move project — check workflow permissions")),
  });

  // ── Code generation ─────────────────────────────────────────────────────────
  const generateCode = async (businessTypeId?: string) => {
    if (editProject) return; // no auto-gen on edit
    setGeneratingCode(true);
    try {
      const { code } = await projectsApi.generateCode(businessTypeId);
      form.setFieldValue("code", code);
    } catch {
      // silently ignore
    } finally {
      setGeneratingCode(false);
    }
  };

  // ── Modal open helpers ──────────────────────────────────────────────────────
  const openCreate = async () => {
    setEditProject(null);
    form.resetFields();
    form.setFieldsValue({ is_active: true });
    setModalOpen(true);
    await generateCode();
  };

  const openEdit = (p: Project) => {
    setEditProject(p);
    form.setFieldsValue({
      ...p,
      start_date: p.start_date ? dayjs(p.start_date) : null,
      end_date:   p.end_date   ? dayjs(p.end_date)   : null,
    });
    setModalOpen(true);
  };

  const onBusinessTypeChange = (btId: string) => {
    if (!editProject) generateCode(btId);
  };

  // ── Table data ───────────────────────────────────────────────────────────────
  const projects: Project[] = (data as any)?.results ?? [];

  const columns = [
    {
      title: "Code", dataIndex: "code", key: "code", width: 120,
      render: (v: string) => (
        <Text style={{ fontFamily: "monospace", fontWeight: 600, color: "#4f46e5" }}>{v}</Text>
      ),
    },
    {
      title: "Project Name", dataIndex: "name", key: "name",
      render: (v: string, r: Project) => (
        <div>
          <Text strong style={{ display: "block" }}>{v}</Text>
          {r.client_name && <Text type="secondary" style={{ fontSize: 12 }}>{r.client_name}</Text>}
        </div>
      ),
    },
    {
      title: "Status", dataIndex: "is_active", key: "is_active", width: 100,
      render: (v: boolean) => (
        <Tag color={v ? "success" : "default"} style={{ fontWeight: 600 }}>
          {v ? "Active" : "Inactive"}
        </Tag>
      ),
    },
    {
      title: "Workflow", key: "workflow", width: 120,
      render: (_: any, r: Project) => r.workflow_state_name
        ? <Tag color={r.workflow_state_color || "default"} style={{ fontWeight: 600 }}>{r.workflow_state_name}</Tag>
        : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>,
    },
    {
      title: "Business Type", dataIndex: "business_type_name", key: "btype", width: 130,
      render: (v: string) => v ? <Tag color="geekblue">{v}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: "Billing Type", dataIndex: "billing_type_name", key: "biltype", width: 120,
      render: (v: string) => v ? <Tag color="purple">{v}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: "Budget", dataIndex: "budget", key: "budget", width: 120, align: "right" as const,
      render: (v: number) => (
        <Text style={{ fontWeight: 600 }}>{fmtBudget(v)}</Text>
      ),
    },
    {
      title: "Est. Hours", key: "hours", width: 110, align: "right" as const,
      render: (_: any, r: Project) => (
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 600 }}>{r.estimated_hours}h</div>
          {(r.logged_hours ?? 0) > 0 && (
            <Text type="secondary" style={{ fontSize: 11 }}>{r.logged_hours}h logged</Text>
          )}
        </div>
      ),
    },
    {
      title: "Timeline", key: "timeline", width: 160,
      render: (_: any, r: Project) => (
        <div style={{ fontSize: 12 }}>
          {r.start_date && <div>{dayjs(r.start_date).format("DD MMM YY")}</div>}
          {r.end_date   && <Text type="secondary">→ {dayjs(r.end_date).format("DD MMM YY")}</Text>}
          {!r.start_date && !r.end_date && <Text type="secondary">—</Text>}
        </div>
      ),
    },
    {
      title: "Actions", key: "actions", width: 140,
      render: (_: any, record: Project) => (
        <Space size={4}>
          <Tooltip title="View Detail">
            <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/projects/${record.id}`)} />
          </Tooltip>
          <PermGuard permission={PERMS.PROJECT_UPDATE}>
            <Tooltip title="Edit">
              <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
            </Tooltip>
          </PermGuard>
        </Space>
      ),
    },
  ];

  const toOptions = (arr: any[]) => arr.map((x: any) => ({ value: x.id, label: x.name }));
  const filterOpt = (input: string, opt: any) =>
    (opt?.label as string)?.toLowerCase().includes(input.toLowerCase());

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>Projects</Title>
          <Text type="secondary">{projects.length} project{projects.length !== 1 ? "s" : ""}</Text>
        </Col>
        <Col>
          <Space>
            <Tooltip title="Refresh">
              <Button
                icon={<ReloadOutlined spin={isFetching} />}
                onClick={() => refetch()}
                loading={isFetching}
              />
            </Tooltip>
            <Segmented
              value={viewMode}
              onChange={(v) => setViewMode(v as ViewMode)}
              options={[
                { value: "board", icon: <AppstoreOutlined />, label: "Board" },
                { value: "list", icon: <UnorderedListOutlined />, label: "List" },
              ]}
            />
            <PermGuard permission={PERMS.PROJECT_CREATE}>
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                New Project
              </Button>
            </PermGuard>
          </Space>
        </Col>
      </Row>

      {viewMode === "board" ? (
        <Card styles={{ body: { padding: 16 } }}>
          <ProjectBoard
            projects={projects}
            states={workflowStates}
            transitions={workflowTransitions}
            user={user}
            loading={isLoading}
            moving={transitionMutation.isPending}
            employees={employees}
            onMove={(id, slug, comments, managerId) =>
              transitionMutation.mutateAsync({ id, destinationSlug: slug, comments, managerId }).then(() => {})
            }
          />
        </Card>
      ) : (
        <Card>
          <Table
            columns={columns}
            dataSource={projects}
            rowKey="id"
            loading={isLoading}
            pagination={{ pageSize: 20, showTotal: (t, r) => `Showing ${r[0]}-${r[1]} of ${t}` }}
            size="middle"
            scroll={{ x: 1100 }}
          />
        </Card>
      )}

      {/* ── Create / Edit Modal ── */}
      <Modal
        title={
          <Space>
            {editProject ? <EditOutlined /> : <PlusOutlined />}
            {editProject ? `Edit Project — ${editProject.code}` : "New Project"}
          </Space>
        }
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditProject(null); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={saveMutation.isPending}
        width={760}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) => {
            const payload = {
              ...v,
              start_date: v.start_date ? v.start_date.format("YYYY-MM-DD") : null,
              end_date:   v.end_date   ? v.end_date.format("YYYY-MM-DD")   : null,
            };
            saveMutation.mutate(payload);
          }}
        >
          {/* Row 1: Name */}
          <Form.Item name="name" label="Project Name" rules={[{ required: true, message: "Project name is required" }]}>
            <Input placeholder="e.g. E-Commerce Platform Development" size="large" />
          </Form.Item>

          {/* Row 2: Code + Status */}
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="code"
                label={
                  <Space size={4}>
                    Project Code
                    {editProject && (
                      <Tag color="orange" style={{ fontSize: 11, fontWeight: 500, margin: 0 }}>Locked</Tag>
                    )}
                  </Space>
                }
                rules={[{ required: true, message: "Project code is required" }]}
                tooltip={editProject ? "Project code cannot be changed after creation." : "Auto-generated based on business type. You can override it."}
              >
                {editProject ? (
                  <Input
                    readOnly
                    style={{ fontFamily: "monospace", fontWeight: 700, color: "#4f46e5", background: "#f8f9ff", cursor: "not-allowed" }}
                  />
                ) : (
                  <Input
                    placeholder="e.g. PRJ-260001"
                    style={{ fontFamily: "monospace", textTransform: "uppercase", fontWeight: 600 }}
                    onChange={(e) => form.setFieldValue("code", e.target.value.toUpperCase())}
                    addonAfter={
                      <Tooltip title="Re-generate code">
                        <Button
                          type="text" size="small" icon={generatingCode ? <Spin size="small" /> : <ReloadOutlined />}
                          onClick={() => generateCode(form.getFieldValue("business_type"))}
                          style={{ border: "none", padding: "0 4px" }}
                        />
                      </Tooltip>
                    }
                  />
                )}
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="is_active" label="Status" valuePropName="checked" initialValue={true}>
                <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
              </Form.Item>
            </Col>
          </Row>

          {/* Row 3: Business Type + Billing Type — locked after creation */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="business_type"
                label={
                  <Space size={4}>
                    Business Type
                    {editProject && (
                      <Tag color="orange" style={{ fontSize: 11, fontWeight: 500, margin: 0 }}>Locked</Tag>
                    )}
                  </Space>
                }
              >
                <Select
                  showSearch
                  placeholder="Select business type"
                  options={toOptions(businessTypes as any[])}
                  filterOption={filterOpt}
                  onChange={onBusinessTypeChange}
                  allowClear
                  disabled={!!editProject}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="billing_type"
                label={
                  <Space size={4}>
                    Billing Type
                    {editProject && (
                      <Tag color="orange" style={{ fontSize: 11, fontWeight: 500, margin: 0 }}>Locked</Tag>
                    )}
                  </Space>
                }
              >
                <Select
                  showSearch
                  placeholder="Select billing type"
                  options={toOptions(billingTypes as any[])}
                  filterOption={filterOpt}
                  allowClear
                  disabled={!!editProject}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Row 4: Client (optional) */}
          <Form.Item name="client" label="Client" tooltip="Optional — link this project to a client">
            <Select
              showSearch
              placeholder="Select client (optional)"
              options={toOptions(clients as any[])}
              filterOption={filterOpt}
              allowClear
            />
          </Form.Item>

          {/* Row 5: Start Date + End Date */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="start_date" label="Start Date">
                <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="end_date" label="End Date">
                <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" />
              </Form.Item>
            </Col>
          </Row>

          {/* Row 6: Estimated Hours + Budget */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="estimated_hours" label="Estimated Hours" initialValue={0}>
                <InputNumber min={0} step={8} style={{ width: "100%" }} addonAfter="hours" placeholder="e.g. 160" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="budget"
                label="Project Budget"
                initialValue={0}
                rules={[{ type: "number", min: 0, message: "Budget cannot be negative" }]}
              >
                <InputNumber
                  min={0}
                  step={10000}
                  style={{ width: "100%" }}
                  prefix="₹"
                  placeholder="e.g. 500000"
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                  parser={(v) => Number(v?.replace(/,/g, "") || 0)}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Row 7: Description — rich text */}
          <Form.Item name="description" label="Description">
            <RichTextEditor
              placeholder="Brief description of the project scope and objectives..."
              minHeight={160}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
