import { useState, useMemo } from "react";
import { useAuthStore } from "@/store/auth";
import {
  PriorityIcon, PriorityLabel, TypeIcon, TypeLabel,
  PRIORITY_SELECT_OPTIONS, TYPE_SELECT_OPTIONS,
} from "@/components/tickets/TicketIcons";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button, Tag, Space, Modal, Form, Input, Select, DatePicker,
  InputNumber, Typography, Card, Row, Col, Tooltip,
  Avatar, Spin, message,
} from "antd";
import {
  PlusOutlined, AppstoreOutlined, UnorderedListOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  ticketsApi,
  TICKET_TYPE_LABELS,
  type TicketListItem, type TicketType, type TicketPriority,
} from "@/services/tickets";
import { projectsApi } from "@/services/projects";
import { workflowStateApi, type WorkflowState } from "@/services/workflow";
import RichTextEditor from "@/components/common/RichTextEditor";
import TicketHierarchyTable from "@/components/tickets/TicketHierarchyTable";
import PermGuard from "@/components/common/PermGuard";
import { PERMS } from "@/constants/permissions";
import { apiErrorMsg } from "@/utils/apiError";
import {
  disableTicketDueDate,
  dueDateHelperText,
  estimateHelperText,
  getMaxOriginalEstimate,
  originalEstimateFormRules,
} from "@/utils/ticketProjectConstraints";

dayjs.extend(relativeTime);
const { Title, Text } = Typography;

const ALL_TYPES: TicketType[] = [
  "EPIC", "STORY", "TASK", "SUBTASK", "BUG",
  "CHANGE_REQUEST", "DEPLOYMENT", "DOCUMENT", "MILESTONE",
];

// ── Priority badge (uses shared icon) ─────────────────────────────────────────
function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const labels: Record<TicketPriority, string> = {
    IMMEDIATE: "Immediate", CRITICAL: "Critical",
    HIGH: "High", MEDIUM: "Medium", DEFERRED: "Deferred",
  };
  return (
    <Tooltip title={labels[priority] ?? priority}>
      <span style={{ display: "inline-flex", cursor: "default" }}>
        <PriorityIcon priority={priority} />
      </span>
    </Tooltip>
  );
}

// ── Kanban card ────────────────────────────────────────────────────────────────
function KanbanCard({ ticket, onClick, onDragStart, onDragEnd, isDragging }: {
  ticket: TicketListItem;
  onClick: () => void;
  onDragStart: (t: TicketListItem) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}) {
  const isOverdue = ticket.due_date && dayjs(ticket.due_date).isBefore(dayjs(), "day");
  return (
    <div
      draggable
      onClick={onClick}
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; onDragStart(ticket); }}
      onDragEnd={onDragEnd}
      style={{
        background: "var(--bms-bg, #fff)",
        opacity: isDragging ? 0.45 : 1,
        cursor: "grab",
        borderRadius: 8,
        border: "1px solid var(--bms-border, #e5e7eb)",
        padding: "10px 12px",
        cursor: "pointer",
        transition: "box-shadow 0.15s, border-color 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.10)";
        e.currentTarget.style.borderColor = "#1677ff44";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = "var(--bms-border, #e5e7eb)";
      }}
    >
      {/* Type + Priority row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "#6b7280", fontWeight: 500 }}>
          <TypeIcon type={ticket.type} size={12} />
          {TICKET_TYPE_LABELS[ticket.type]}
        </span>
        <PriorityBadge priority={ticket.priority} />
      </div>

      {/* Title */}
      <Text style={{ fontSize: 13, fontWeight: 500, display: "block", lineHeight: 1.4, marginBottom: 10, color: "var(--bms-text, #111827)" }}>
        {ticket.title}
      </Text>

      {/* Footer: ID + due + assignee */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
        <code style={{ fontSize: 10, color: "#9ca3af", fontWeight: 500 }}>{ticket.ticket_id}</code>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {ticket.due_date && (
            <span style={{ fontSize: 10, color: isOverdue ? "#ef4444" : "#9ca3af" }}>
              {dayjs(ticket.due_date).format("DD MMM")}
            </span>
          )}
          {ticket.assignee_name && (
            <Tooltip title={ticket.assignee_name}>
              <Avatar size={20} style={{ background: "#1677ff", fontSize: 9, lineHeight: "20px" }}>
                {ticket.assignee_name.charAt(0).toUpperCase()}
              </Avatar>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Kanban column ──────────────────────────────────────────────────────────────
function KanbanColumn({ state, tickets, onCardClick, onCreateHere,
  onDragStart, onDragEnd, onDrop, draggedTicket }: {
  state: WorkflowState;
  tickets: TicketListItem[];
  onCardClick: (t: TicketListItem) => void;
  onCreateHere: () => void;
  onDragStart: (t: TicketListItem) => void;
  onDragEnd: () => void;
  onDrop: (stateSlug: string) => void;
  draggedTicket: TicketListItem | null;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const isFinal = state.is_final;
  const dotColor = state.color_code || "#9ca3af";
  const canDrop = draggedTicket && draggedTicket.workflow_state_slug !== state.slug;

  return (
    <div
      onDragOver={(e) => { if (canDrop) { e.preventDefault(); setIsDragOver(true); } }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (canDrop) onDrop(state.slug);
      }}
      style={{
        minWidth: 272, width: 272, flexShrink: 0,
        display: "flex", flexDirection: "column",
        background: isDragOver ? `${dotColor}12` : "var(--bms-surface, #f4f5f7)",
        borderRadius: 10,
        border: isDragOver ? `2px dashed ${dotColor}` : "1px solid var(--bms-border, #e5e7eb)",
        maxHeight: "calc(100vh - 240px)",
        transition: "border 0.15s, background 0.15s",
      }}
    >
      {/* Column header */}
      <div style={{
        padding: "10px 12px 10px 14px",
        display: "flex", alignItems: "center", gap: 8,
        borderBottom: `2px solid ${dotColor}`,
        borderRadius: "10px 10px 0 0",
        background: `${dotColor}10`,
        flexShrink: 0,
      }}>
        <span style={{
          width: 9, height: 9, borderRadius: "50%",
          background: dotColor, flexShrink: 0,
          boxShadow: `0 0 0 2px ${dotColor}33`,
        }} />
        <Text strong style={{ fontSize: 13, flex: 1 }}>{state.name}</Text>
        <span style={{
          minWidth: 22, height: 22, borderRadius: 11,
          background: tickets.length ? dotColor : "#e5e7eb",
          color: tickets.length ? "#fff" : "#9ca3af",
          fontSize: 11, fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "0 6px",
        }}>
          {tickets.length}
        </span>
      </div>

      {/* Cards */}
      <div style={{
        flex: 1, overflowY: "auto", padding: 8,
        display: "flex", flexDirection: "column", gap: 8,
      }}>
        {tickets.map((t) => (
          <KanbanCard
            key={t.id}
            ticket={t}
            onClick={() => onCardClick(t)}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            isDragging={draggedTicket?.id === t.id}
          />
        ))}

        {isDragOver && canDrop && (
          <div style={{
            textAlign: "center", padding: "20px 12px",
            color: dotColor, fontSize: 12, fontWeight: 600,
            border: `2px dashed ${dotColor}`, borderRadius: 8,
            background: `${dotColor}08`,
          }}>
            Drop to move here
          </div>
        )}

        {tickets.length === 0 && !isDragOver && (
          <div style={{
            textAlign: "center", padding: "32px 12px",
            color: "#d1d5db", fontSize: 12,
            border: "1.5px dashed #e5e7eb", borderRadius: 8,
          }}>
            No tickets
          </div>
        )}
      </div>

      {/* Add button at bottom */}
      {!isFinal && (
        <div style={{ padding: "6px 8px", borderTop: "1px solid var(--bms-border, #e5e7eb)", flexShrink: 0 }}>
          <Button
            type="text" size="small" block
            style={{ color: "#9ca3af", fontSize: 12, textAlign: "left" }}
            onClick={onCreateHere}
          >
            + Add ticket
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Create Ticket Modal ────────────────────────────────────────────────────────
function CreateTicketModal({ open, onClose, defaultProjectId }: {
  open: boolean; onClose: () => void; defaultProjectId?: string;
}) {
  const [form] = Form.useForm();
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [selectedProject, setSelectedProject] = useState<string>(defaultProjectId ?? "");

  // Minimal project dropdown — id/name/code only
  const { data: projects = [] } = useQuery({
    queryKey: ["dd", "projects-dropdown-minimal"],
    queryFn: () => projectsApi.dropdown(),
    enabled: open,
    staleTime: 60_000,
  });

  // Project bounds for due date / estimate validation
  const { data: projectDetail } = useQuery({
    queryKey: ["project", selectedProject],
    queryFn: () => projectsApi.get(selectedProject),
    enabled: open && !!selectedProject,
    staleTime: 60_000,
  });

  const maxEstimate = getMaxOriginalEstimate(projectDetail);

  // Allocated employees for selected project only
  const { data: allocatedEmployees = [], isFetching: empLoading } = useQuery({
    queryKey: ["dd", "project-allocated-employees", selectedProject],
    queryFn: () => projectsApi.allocatedEmployees(selectedProject),
    enabled: open && !!selectedProject,
    staleTime: 30_000,
  });

  const createMut = useMutation({
    mutationFn: ticketsApi.create,
    onSuccess: () => {
      message.success("Ticket created");
      qc.invalidateQueries({ queryKey: ["tickets"] });
      onClose();
      form.resetFields();
      setSelectedProject(defaultProjectId ?? "");
    },
    onError: (e: any) => message.error(apiErrorMsg(e, "Failed to create ticket")),
  });

  const toEmpOptions = (arr: any[]) => arr.map((e: any) => ({
    value: e.id,
    label: (
      <Space size={6}>
        <Avatar size={18} style={{ background: "#1677ff", fontSize: 10, flexShrink: 0 }}>
          {e.full_name?.charAt(0).toUpperCase()}
        </Avatar>
        <span>{e.full_name}</span>
        {e.designation && <span style={{ color: "#9ca3af", fontSize: 11 }}>({e.designation})</span>}
      </Space>
    ),
    searchLabel: e.full_name,
  }));

  const handleProjectChange = (val: string) => {
    setSelectedProject(val);
    form.setFieldsValue({
      assignee: undefined,
      notify_users: [],
      due_date: undefined,
      original_estimate: undefined,
    });
  };

  return (
    <Modal
      title={<span><PlusOutlined style={{ marginRight: 6, color: "#1677ff" }} />Create Ticket</span>}
      open={open}
      onCancel={() => { onClose(); form.resetFields(); setSelectedProject(defaultProjectId ?? ""); }}
      onOk={() => form.submit()}
      confirmLoading={createMut.isPending}
      width={720}
      destroyOnClose
      afterOpenChange={(vis) => {
        if (vis && defaultProjectId) {
          form.setFieldValue("project", defaultProjectId);
          setSelectedProject(defaultProjectId);
        }
      }}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ type: "TASK", priority: "MEDIUM" }}
        onFinish={(v) => createMut.mutate({
          ...v,
          due_date: v.due_date ? dayjs(v.due_date).format("YYYY-MM-DD") : null,
        })}
      >
        <Form.Item name="project" label="Project" rules={[{ required: true }]}>
          <Select
            showSearch
            placeholder="Select project"
            onChange={handleProjectChange}
            filterOption={(input, opt) =>
              (opt?.searchLabel as string ?? "").toLowerCase().includes(input.toLowerCase())
            }
            options={projects.map((p) => ({
              value: p.id,
              label: (
                <Space size={6}>
                  <code style={{ fontSize: 11, color: "#4f46e5", background: "#eff0ff", padding: "1px 5px", borderRadius: 4 }}>
                    {p.code}
                  </code>
                  <span>{p.name}</span>
                </Space>
              ),
              searchLabel: `${p.code} ${p.name}`,
            }))}
          />
        </Form.Item>

        <Form.Item name="title" label="Title" rules={[{ required: true }]}>
          <Input placeholder="Short, descriptive title" size="large" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="type" label="Type" rules={[{ required: true }]}>
              <Select
                options={TYPE_SELECT_OPTIONS}
                optionRender={(opt) => <TypeLabel type={opt.value as TicketType} />}
                labelRender={(opt) => opt.value ? <TypeLabel type={opt.value as TicketType} /> : null}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="priority" label="Priority">
              <Select
                options={PRIORITY_SELECT_OPTIONS}
                optionRender={(opt) => <PriorityLabel priority={opt.value as TicketPriority} />}
                labelRender={(opt) => opt.value ? <PriorityLabel priority={opt.value as TicketPriority} /> : null}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="description" label="Description">
          <RichTextEditor placeholder="Describe the ticket..." minHeight={140} />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="assignee" label={
              <Space size={4}>
                <span>Assignee</span>
                {!selectedProject && <Text type="secondary" style={{ fontSize: 11 }}>(select project first)</Text>}
              </Space>
            }>
              <Select
                showSearch
                placeholder={selectedProject ? "Assign to…" : "Select project first"}
                disabled={!selectedProject}
                loading={empLoading}
                options={toEmpOptions(allocatedEmployees)}
                filterOption={(i, o) => (o?.searchLabel as string)?.toLowerCase().includes(i.toLowerCase())}
                allowClear
                notFoundContent={
                  selectedProject
                    ? <span style={{ fontSize: 12, color: "#9ca3af" }}>No active allocations on this project</span>
                    : null
                }
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Reporter">
              <div style={{
                padding: "5px 11px", borderRadius: 6,
                background: "#f5f5f5", border: "1px solid #d9d9d9",
                color: "#1f2937", fontSize: 14, minHeight: 32,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <Avatar size={20} style={{ background: "#1677ff", fontSize: 11, flexShrink: 0 }}>
                  {(currentUser?.full_name || currentUser?.username || "?").charAt(0).toUpperCase()}
                </Avatar>
                <span>{currentUser?.full_name || currentUser?.username || "You"}</span>
                <Tag style={{ marginLeft: "auto", fontSize: 10 }} color="default">Auto</Tag>
              </div>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="original_estimate"
              label="Original Estimate (hours)"
              rules={originalEstimateFormRules(projectDetail)}
              extra={estimateHelperText(projectDetail)}
            >
              <InputNumber
                min={0}
                max={maxEstimate}
                step={0.5}
                style={{ width: "100%" }}
                addonAfter="h"
                disabled={!selectedProject}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="due_date"
              label="Due Date"
              extra={dueDateHelperText(projectDetail)}
            >
              <DatePicker
                style={{ width: "100%" }}
                format="DD MMM YYYY"
                disabled={!selectedProject}
                disabledDate={(current) => disableTicketDueDate(current, projectDetail)}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="notify_users" label={
          <Space size={4}>
            <span>Notify Users</span>
            {!selectedProject && <Text type="secondary" style={{ fontSize: 11 }}>(select project first)</Text>}
          </Space>
        }>
          <Select
            mode="multiple"
            showSearch
            placeholder={selectedProject ? "Select users to notify…" : "Select project first"}
            disabled={!selectedProject}
            loading={empLoading}
            options={toEmpOptions(allocatedEmployees)}
            filterOption={(i, o) => (o?.searchLabel as string)?.toLowerCase().includes(i.toLowerCase())}
            maxTagCount="responsive"
            allowClear
            style={{ width: "100%" }}
            notFoundContent={
              selectedProject
                ? <span style={{ fontSize: 12, color: "#9ca3af" }}>No active allocations on this project</span>
                : null
            }
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ── Main Tickets Page ──────────────────────────────────────────────────────────
export default function TicketsPage({ projectId }: { projectId?: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [view, setView] = useState<"list" | "board">("list");
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [selectedProject, setSelectedProject] = useState<string>(projectId ?? "");
  const [draggedTicket, setDraggedTicket] = useState<TicketListItem | null>(null);

  const transitionMut = useMutation({
    mutationFn: ({ ticketId, destSlug }: { ticketId: string; destSlug: string }) =>
      ticketsApi.transition(ticketId, destSlug),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      message.success("Ticket status updated");
    },
    onError: (e: any) => message.error(apiErrorMsg(e, "Cannot move ticket — check permissions")),
  });

  const queryParams: Record<string, any> = {
    page_size: 200,
    ...(selectedProject ? { project: selectedProject } : {}),
    ...(typeFilter ? { type: typeFilter } : {}),
    ...(priorityFilter ? { priority: priorityFilter } : {}),
  };

  const { data, isLoading } = useQuery({
    queryKey: ["tickets", queryParams],
    queryFn: () => ticketsApi.list(queryParams),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["dd", "projects-dropdown-minimal"],
    queryFn: () => projectsApi.dropdown(),
    staleTime: 60_000,
  });

  // Fetch all ticket workflow states for Kanban columns
  const { data: workflowStates = [] } = useQuery({
    queryKey: ["ticket-workflow-states"],
    queryFn: () => workflowStateApi.list("tickets", "ticket"),
    staleTime: 300_000,
  });

  const tickets: TicketListItem[] = useMemo(() => {
    const all = (data as any)?.results ?? [];
    if (!search) return all;
    const lower = search.toLowerCase();
    return all.filter((t: TicketListItem) =>
      t.ticket_id.toLowerCase().includes(lower) ||
      t.title.toLowerCase().includes(lower)
    );
  }, [data, search]);

  // Map tickets into workflow state columns (all states shown even if empty)
  const kanbanColumns = useMemo(() => {
    const ticketsByState = new Map<string, TicketListItem[]>();
    tickets.forEach((t) => {
      const key = t.workflow_state_slug || "__none__";
      if (!ticketsByState.has(key)) ticketsByState.set(key, []);
      ticketsByState.get(key)!.push(t);
    });
    return (workflowStates as WorkflowState[])
      .sort((a, b) => a.order - b.order)
      .map((state) => ({
        state,
        tickets: ticketsByState.get(state.slug) ?? [],
      }));
  }, [workflowStates, tickets]);

  return (
    <div>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>Tickets</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {(data as any)?.count ?? 0} total
          </Text>
        </Col>
        <Col>
          <Space>
            <div style={{
              display: "inline-flex", border: "1px solid #e5e7eb",
              borderRadius: 8, overflow: "hidden",
            }}>
              {([
                { key: "board", icon: <AppstoreOutlined />, label: "Board" },
                { key: "list",  icon: <UnorderedListOutlined />, label: "List"  },
              ] as const).map(({ key, icon, label }) => (
                <button
                  key={key}
                  onClick={() => setView(key)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "5px 14px", border: "none", cursor: "pointer",
                    fontSize: 13, fontWeight: view === key ? 600 : 400,
                    background: view === key ? "#1677ff" : "#fff",
                    color: view === key ? "#fff" : "#374151",
                    transition: "background 0.15s, color 0.15s",
                    borderRight: key === "board" ? "1px solid #e5e7eb" : "none",
                  }}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
            <PermGuard permission={PERMS.PROJECT_TICKET_CREATE}>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
                Create Ticket
              </Button>
            </PermGuard>
          </Space>
        </Col>
      </Row>

      {/* Filters */}
      <Card size="small" style={{ marginBottom: 16, borderRadius: 10 }}>
        <Row gutter={12} align="middle">
          <Col flex="200px">
            <Input
              prefix={<SearchOutlined style={{ color: "#9ca3af" }} />}
              placeholder="Search tickets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
            />
          </Col>
          {!projectId && (
            <Col flex="220px">
              <Select
                placeholder="All Projects"
                value={selectedProject || undefined}
                onChange={(v) => setSelectedProject(v ?? "")}
                allowClear
                showSearch
                style={{ width: "100%" }}
                options={(projects as any[]).map((p: any) => ({
                  value: p.id, label: `${p.code} — ${p.name}`,
                }))}
                filterOption={(i, o) => (o?.label as string)?.toLowerCase().includes(i.toLowerCase())}
              />
            </Col>
          )}
          <Col>
            <Select
              placeholder="All Types"
              value={typeFilter || undefined}
              onChange={(v) => setTypeFilter(v ?? "")}
              allowClear
              style={{ width: 150 }}
              options={ALL_TYPES.map((t) => ({
                value: t,
                label: <TypeLabel type={t} />,
              }))}
            />
          </Col>
          <Col>
            <Select
              placeholder="All Priorities"
              value={priorityFilter || undefined}
              onChange={(v) => setPriorityFilter(v ?? "")}
              allowClear
              style={{ width: 150 }}
              options={PRIORITY_SELECT_OPTIONS}
            />
          </Col>
        </Row>
      </Card>

      {/* Content */}
      {isLoading ? (
        <div style={{ textAlign: "center", paddingTop: 60 }}><Spin size="large" /></div>
      ) : view === "list" ? (
        <TicketHierarchyTable tickets={tickets} search={search} />
      ) : (
        <div style={{
          display: "flex", gap: 14, overflowX: "auto",
          paddingBottom: 16, alignItems: "flex-start",
          minHeight: 400,
        }}>
          {kanbanColumns.length === 0 ? (
            <div style={{ textAlign: "center", width: "100%", paddingTop: 60, color: "#9ca3af" }}>
              No workflow states configured. Go to Master → Workflow to set up ticket states.
            </div>
          ) : (
            kanbanColumns.map(({ state, tickets: colTickets }) => (
              <KanbanColumn
                key={state.id}
                state={state}
                tickets={colTickets}
                onCardClick={(t) => navigate(`/tickets/${t.id}`)}
                onCreateHere={() => setCreateOpen(true)}
                draggedTicket={draggedTicket}
                onDragStart={(t) => setDraggedTicket(t)}
                onDragEnd={() => setDraggedTicket(null)}
                onDrop={(destSlug) => {
                  if (!draggedTicket) return;
                  transitionMut.mutate({ ticketId: draggedTicket.id, destSlug });
                  setDraggedTicket(null);
                }}
              />
            ))
          )}
        </div>
      )}

      <CreateTicketModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultProjectId={selectedProject || projectId}
      />
    </div>
  );
}
