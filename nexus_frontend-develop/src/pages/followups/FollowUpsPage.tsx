import { useState, useMemo } from "react";
import {
  Button, Modal, Form, Input, Select, DatePicker, TimePicker, Tag, Space,
  Popconfirm, message, Typography, Segmented, Empty, Spin, Row, Col, Tooltip, Divider,
} from "antd";
import {
  PlusOutlined, EditOutlined, DeleteOutlined, CheckOutlined,
  PhoneOutlined, MailOutlined, CalendarOutlined, WhatsAppOutlined,
  EnvironmentOutlined, ClockCircleOutlined, WarningOutlined,
  AppstoreOutlined, UnorderedListOutlined, HolderOutlined, UserOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { followUpApi, FollowUpItem, FollowUpCreate, FOLLOWUP_PRIORITIES } from "@/services/followups";
import { get } from "@/services/api";
import { ENDPOINTS } from "@/constants/api";
import { PERMS } from "@/constants/permissions";
import { useAuthStore } from "@/store/auth";
import { useSearchParams } from "react-router-dom";
import FollowUpCalendarView from "./FollowUpCalendarView";
import FollowUpDetailDrawer from "./FollowUpDetailDrawer";
import { parseTime, formatTimeRange } from "./followupCalendarUtils";

type ViewMode = "board" | "list" | "calendar";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const TYPE_OPTIONS = [
  { value: "EMAIL",      label: "Email",      icon: <MailOutlined /> },
  { value: "CALL",       label: "Call",       icon: <PhoneOutlined /> },
  { value: "MEETING",    label: "Meeting",    icon: <CalendarOutlined /> },
  { value: "WHATSAPP",   label: "WhatsApp",   icon: <WhatsAppOutlined /> },
  { value: "SITE_VISIT", label: "Site Visit", icon: <EnvironmentOutlined /> },
];

const BOARD_COLUMNS = [
  { slug: "planning",   label: "Planning",    color: "#14B8A6" },
  { slug: "inprogress", label: "In Progress", color: "#3B82F6" },
  { slug: "completed",  label: "Completed",   color: "#10B981" },
  { slug: "cancelled",  label: "Cancelled",   color: "#EF4444" },
];

const FOLLOWUP_MOVES: Record<string, string[]> = {
  planning: ["inprogress", "completed"],
  inprogress: ["completed", "planning"],
  completed: ["cancelled"],
  cancelled: ["planning"],
};

function userCanViewFollowUp(item: FollowUpItem, userId: string | undefined): boolean {
  if (!userId) return false;
  return item.assignee === userId || item.reporter === userId;
}

function filterItemsForUser(items: FollowUpItem[], userId: string | undefined, viewAll: boolean): FollowUpItem[] {
  if (viewAll || !userId) return items;
  return items.filter((item) => userCanViewFollowUp(item, userId));
}

function canDropOnColumn(item: FollowUpItem, destSlug: string): boolean {
  if (item.workflow_state_slug === destSlug) return false;
  if (Array.isArray(item.allowed_destination_slugs) && item.allowed_destination_slugs.length > 0) {
    return item.allowed_destination_slugs.includes(destSlug);
  }
  return (FOLLOWUP_MOVES[item.workflow_state_slug] ?? []).includes(destSlug);
}

function TypeIcon({ type }: { type: string }) {
  const opt = TYPE_OPTIONS.find((t) => t.value === type);
  return opt ? <span style={{ marginRight: 4 }}>{opt.icon}</span> : null;
}

function PriorityTag({ priority, label, size = "default" }: { priority: string; label?: string; size?: "default" | "small" }) {
  const cfg = FOLLOWUP_PRIORITIES.find((p) => p.value === priority) ?? FOLLOWUP_PRIORITIES[2];
  return (
    <Tag
      color={cfg.color}
      style={{
        margin: 0,
        borderRadius: 6,
        fontSize: size === "small" ? 10 : 11,
        lineHeight: size === "small" ? "18px" : "20px",
        fontWeight: 600,
      }}
    >
      {label ?? cfg.label}
    </Tag>
  );
}

function PriorityPicker({ value, onChange }: { value?: string; onChange?: (v: string) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
      {FOLLOWUP_PRIORITIES.map((p) => {
        const active = (value ?? "MEDIUM") === p.value;
        return (
          <button
            key={p.value}
            type="button"
            onClick={() => onChange?.(p.value)}
            style={{
              padding: "8px 4px",
              borderRadius: 8,
              border: `2px solid ${active ? p.color : "var(--bms-border)"}`,
              background: active ? `${p.color}14` : "var(--bms-surface)",
              color: active ? p.color : "var(--bms-text-2)",
              fontWeight: active ? 700 : 500,
              fontSize: 12,
              cursor: "pointer",
              transition: "all 0.15s ease",
              textAlign: "center",
            }}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

function priorityAccent(priority: string) {
  return FOLLOWUP_PRIORITIES.find((p) => p.value === priority)?.color ?? "#d97706";
}

function FollowUpCard({
  item, onEdit, onDone, onDelete, canUpdate, canDelete, canTransition,
  onDragStart, onDragEnd, isDragging, draggable,
}: {
  item: FollowUpItem;
  onEdit: () => void;
  onDone: () => void;
  onDelete: () => void;
  canUpdate: boolean;
  canDelete: boolean;
  canTransition: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  draggable?: boolean;
}) {
  const isFinal = item.workflow_state_slug === "completed" || item.workflow_state_slug === "cancelled";
  const accent = priorityAccent(item.priority || "MEDIUM");
  const timeRange = formatTimeRange(item.start_time, item.end_time);

  return (
    <div style={{
      background: "var(--bms-surface)",
      border: "1px solid var(--bms-border)",
      borderLeft: `3px solid ${accent}`,
      borderRadius: 10,
      padding: "10px 12px 8px",
      marginBottom: 10,
      boxShadow: isDragging ? "0 8px 20px rgba(0,0,0,0.12)" : "0 1px 3px rgba(0,0,0,0.04)",
      opacity: isDragging ? 0.55 : 1,
      transition: "box-shadow 0.15s, opacity 0.15s",
    }}>
      {draggable && (
        <div
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", item.id);
            onDragStart?.();
          }}
          onDragEnd={() => onDragEnd?.()}
          style={{
            display: "flex", alignItems: "center", gap: 6, marginBottom: 8,
            cursor: "grab", color: "var(--bms-text-3)", userSelect: "none",
            padding: "2px 0",
          }}
          title="Drag to another column"
        >
          <HolderOutlined style={{ fontSize: 12 }} />
          <span style={{ fontSize: 10, letterSpacing: 0.2 }}>Drag to move</span>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
        <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.35, flex: 1, minWidth: 0 }}>{item.title}</div>
        <PriorityTag priority={item.priority || "MEDIUM"} label={item.priority_label} size="small" />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        <span style={{
          fontSize: 11, color: "var(--bms-text-2)", background: "var(--bms-surface-2)",
          border: "1px solid var(--bms-border)", borderRadius: 6, padding: "2px 8px",
          display: "inline-flex", alignItems: "center", gap: 4,
        }}>
          <TypeIcon type={item.type} />
          {item.type_label}
        </span>
        <span style={{
          fontSize: 11, color: "var(--bms-text-2)", background: "var(--bms-surface-2)",
          border: "1px solid var(--bms-border)", borderRadius: 6, padding: "2px 8px",
          display: "inline-flex", alignItems: "center", gap: 4,
        }}>
          <UserOutlined style={{ fontSize: 10 }} />
          Assignee: {item.assignee_name || "Unassigned"}
        </span>
        {item.reporter_name && item.reporter_name !== item.assignee_name && (
          <span style={{
            fontSize: 11, color: "var(--bms-text-2)", background: "var(--bms-surface-2)",
            border: "1px solid var(--bms-border)", borderRadius: 6, padding: "2px 8px",
            display: "inline-flex", alignItems: "center", gap: 4,
          }}>
            Created by {item.reporter_name}
          </span>
        )}
      </div>

      <div style={{
        fontSize: 11,
        color: item.is_overdue ? "#dc2626" : "var(--bms-text-3)",
        marginBottom: item.description ? 8 : 0,
        display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
      }}>
        <ClockCircleOutlined style={{ fontSize: 11, color: item.is_overdue ? "#dc2626" : "#9ca3af" }} />
        <span>{item.start_date ? dayjs(item.start_date).format("DD MMM YYYY") : "No start date"}</span>
        {item.end_date && item.end_date !== item.start_date && (
          <span> - {dayjs(item.end_date).format("DD MMM YYYY")}</span>
        )}
        {timeRange && <span style={{ color: "var(--bms-text-2)" }}>· {timeRange}</span>}
        {item.is_overdue && (
          <Tag color="error" style={{ margin: 0, fontSize: 10, lineHeight: "16px", padding: "0 6px" }}>Overdue</Tag>
        )}
      </div>

      {item.description && (
        <Paragraph ellipsis={{ rows: 2 }} style={{ fontSize: 11, color: "var(--bms-text-2)", marginBottom: 8 }}>
          {item.description}
        </Paragraph>
      )}

      <div style={{
        display: "flex", alignItems: "center", gap: 4,
        marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--bms-border)",
      }}>
        {canUpdate && (
          <Tooltip title="Edit">
            <Button size="small" type="text" icon={<EditOutlined />} onClick={onEdit} style={{ padding: "0 6px" }} />
          </Tooltip>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          {canTransition && !isFinal && (
            <Button size="small" type="primary" icon={<CheckOutlined />} onClick={onDone} style={{ fontSize: 12 }}>
              Done
            </Button>
          )}
          {canDelete && (
            <Popconfirm title="Delete this follow-up?" okText="Delete" okButtonProps={{ danger: true }} onConfirm={onDelete}>
              <Tooltip title="Delete">
                <Button size="small" type="text" danger icon={<DeleteOutlined />} style={{ padding: "0 6px" }} />
              </Tooltip>
            </Popconfirm>
          )}
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({
  col, items, draggedItem, canTransitionGlobally,
  onDragStart, onDragEnd, onDrop,
  onEdit, onDone, onDelete, canUpdate, canDelete,
}: {
  col: typeof BOARD_COLUMNS[number];
  items: FollowUpItem[];
  draggedItem: FollowUpItem | null;
  canTransitionGlobally: boolean;
  onDragStart: (item: FollowUpItem) => void;
  onDragEnd: () => void;
  onDrop: (destSlug: string) => void;
  onEdit: (item: FollowUpItem) => void;
  onDone: (item: FollowUpItem) => void;
  onDelete: (id: string) => void;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const canDrop = Boolean(
    draggedItem &&
    canDropOnColumn(draggedItem, col.slug) &&
    canTransitionGlobally &&
    draggedItem.can_transition,
  );

  return (
    <div
      onDragOver={(e) => {
        if (canDrop) {
          e.preventDefault();
          setIsDragOver(true);
        }
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (canDrop) onDrop(col.slug);
      }}
      style={{
        minWidth: 280, flex: "1 0 280px",
        borderRadius: 10,
        padding: isDragOver ? 8 : 0,
        background: isDragOver ? `${col.color}14` : "transparent",
        border: isDragOver ? `2px dashed ${col.color}` : "2px dashed transparent",
        transition: "background 0.15s, border 0.15s",
      }}
    >
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 12px", marginBottom: 10,
        background: "var(--bms-surface-2)", borderRadius: 8,
      }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: col.color, flexShrink: 0 }} />
        <span style={{ fontWeight: 600, fontSize: 13 }}>{col.label}</span>
        <Tag style={{ marginLeft: "auto", borderRadius: 12 }}>{items.length}</Tag>
      </div>
      {items.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={isDragOver ? "Drop here" : "No items"}
          style={{ marginTop: 20 }}
        />
      ) : (
        items.map((item) => (
          <FollowUpCard
            key={item.id}
            item={item}
            onEdit={() => onEdit(item)}
            onDone={() => onDone(item)}
            onDelete={() => onDelete(item.id)}
            canUpdate={canUpdate}
            canDelete={canDelete}
            canTransition={canTransitionGlobally && item.can_transition}
            draggable={
              canTransitionGlobally && item.can_transition &&
              (item.allowed_destination_slugs?.length ?? (FOLLOWUP_MOVES[item.workflow_state_slug]?.length ?? 0)) > 0
            }
            isDragging={draggedItem?.id === item.id}
            onDragStart={() => onDragStart(item)}
            onDragEnd={onDragEnd}
          />
        ))
      )}
    </div>
  );
}

export default function FollowUpsPage() {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const permissions = useAuthStore((s) => s.permissions);
  const userId = useAuthStore((s) => s.user?.id);
  const canCreate  = permissions.includes(PERMS.CRM_FOLLOWUP_CREATE as never);
  const canUpdate  = permissions.includes(PERMS.CRM_FOLLOWUP_UPDATE as never);
  const canDelete  = permissions.includes(PERMS.CRM_FOLLOWUP_DELETE as never);
  const canTransition = permissions.includes(PERMS.CRM_FOLLOWUP_TRANSITION as never);
  const canViewAll = permissions.includes(PERMS.CRM_FOLLOWUP_VIEW_ALL as never);

  const initialView = (searchParams.get("view") as ViewMode) || "board";
  const [viewMode, setViewMode] = useState<ViewMode>(
    ["board", "list", "calendar"].includes(initialView) ? initialView : "board",
  );
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FollowUpItem | null>(null);
  const [detailItem, setDetailItem] = useState<FollowUpItem | null>(null);
  const [draggedItem, setDraggedItem] = useState<FollowUpItem | null>(null);
  const [form] = Form.useForm();

  const setView = (mode: ViewMode) => {
    setViewMode(mode);
    setSearchParams(mode === "board" ? {} : { view: mode }, { replace: true });
  };

  const params: Record<string, string> = {};
  if (statusFilter) params.status = statusFilter;

  const { data: boardData, isLoading: boardLoading } = useQuery({
    queryKey: ["followups-board", userId, params],
    queryFn: () => followUpApi.board(params),
    enabled: viewMode === "board" && Boolean(userId),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ["followups-list", userId, params],
    queryFn: () => followUpApi.list(params),
    enabled: (viewMode === "list" || viewMode === "calendar") && Boolean(userId),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: employees } = useQuery({
    queryKey: ["employees-dropdown"],
    queryFn: () => get<Array<{ id: string; full_name: string }>>(ENDPOINTS.EMPLOYEES_DROPDOWN),
    staleTime: 60_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["followups-board"] });
    qc.invalidateQueries({ queryKey: ["followups-list"] });
    qc.invalidateQueries({ queryKey: ["employee-dashboard"] });
  };

  const createMutation = useMutation({
    mutationFn: (data: FollowUpCreate) => followUpApi.create(data),
    onSuccess: () => { message.success("Follow-up scheduled"); setModalOpen(false); form.resetFields(); invalidate(); },
    onError: () => message.error("Failed to create follow-up"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FollowUpCreate> }) => followUpApi.update(id, data),
    onSuccess: () => { message.success("Follow-up updated"); setModalOpen(false); setEditing(null); form.resetFields(); invalidate(); },
    onError: () => message.error("Failed to update follow-up"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => followUpApi.delete(id),
    onSuccess: () => { message.success("Follow-up deleted"); invalidate(); },
    onError: () => message.error("Failed to delete"),
  });

  const transitionMutation = useMutation({
    mutationFn: ({ id, state }: { id: string; state: string }) => followUpApi.transition(id, state),
    onSuccess: () => { invalidate(); },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      message.error(msg || "Cannot move to this stage");
    },
    onSettled: () => setDraggedItem(null),
  });

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ type: "CALL", priority: "MEDIUM" });
    setModalOpen(true);
  };

  const openEdit = (item: FollowUpItem) => {
    setEditing(item);
    form.setFieldsValue({
      title: item.title,
      type: item.type,
      priority: item.priority || "MEDIUM",
      description: item.description,
      comments: item.comments,
      assignee: item.assignee,
      start_date: item.start_date ? dayjs(item.start_date) : null,
      end_date: item.end_date ? dayjs(item.end_date) : null,
      start_time: parseTime(item.start_time),
      end_time: parseTime(item.end_time),
    });
    setModalOpen(true);
  };

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      const payload: FollowUpCreate = {
        title: values.title,
        type: values.type,
        priority: values.priority || "MEDIUM",
        description: values.description || "",
        comments: values.comments || "",
        assignee: values.assignee || undefined,
        start_date: values.start_date ? values.start_date.format("YYYY-MM-DD") : null,
        end_date: values.end_date ? values.end_date.format("YYYY-MM-DD") : null,
        start_time: values.start_time ? values.start_time.format("HH:mm:ss") : null,
        end_time: values.end_time ? values.end_time.format("HH:mm:ss") : null,
      };
      if (editing) {
        updateMutation.mutate({ id: editing.id, data: payload });
      } else {
        createMutation.mutate(payload);
      }
    });
  };

  const handleDone = (item: FollowUpItem) => {
    transitionMutation.mutate(
      { id: item.id, state: "completed" },
      { onSuccess: () => message.success("Marked as done") },
    );
  };

  const handleDrop = (destSlug: string) => {
    if (!draggedItem) return;
    if (!canDropOnColumn(draggedItem, destSlug)) {
      message.warning("This follow-up cannot move to that stage");
      setDraggedItem(null);
      return;
    }
    transitionMutation.mutate(
      { id: draggedItem.id, state: destSlug },
      { onSuccess: () => message.success("Follow-up moved") },
    );
  };

  const isLoading = viewMode === "board" ? boardLoading : listLoading;

  const columns = useMemo(() => {
    const raw = boardData?.columns ?? {};
    if (canViewAll) return raw;
    const scoped: Record<string, FollowUpItem[]> = {};
    for (const [slug, items] of Object.entries(raw)) {
      const visible = filterItemsForUser(items, userId, false);
      if (visible.length > 0) scoped[slug] = visible;
    }
    return scoped;
  }, [boardData?.columns, canViewAll, userId]);

  const listItems = useMemo(
    () => filterItemsForUser(listData ?? [], userId, canViewAll),
    [listData, userId, canViewAll],
  );

  return (
    <div style={{ padding: "0 4px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Follow-up Board</Title>
          <Text type="secondary">
            {canViewAll
              ? "Manage all client follow-ups"
              : "Only follow-ups assigned to you or created by you are shown"}
          </Text>
        </div>
        <Space wrap>
          <Segmented
            value={viewMode}
            onChange={(v) => setView(v as ViewMode)}
            options={[
              { value: "board", icon: <AppstoreOutlined />, label: "Board" },
              { value: "list",  icon: <UnorderedListOutlined />, label: "List" },
              { value: "calendar", icon: <CalendarOutlined />, label: "Calendar" },
            ]}
          />
          <Select
            placeholder="All Stages"
            allowClear
            style={{ width: 160 }}
            value={statusFilter || undefined}
            onChange={(v) => setStatusFilter(v || "")}
            options={BOARD_COLUMNS.map((c) => ({ value: c.slug, label: c.label }))}
          />
          {canCreate && (
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Schedule
            </Button>
          )}
        </Space>
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: 60 }}><Spin size="large" /></div>
      ) : viewMode === "board" ? (
        <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 8, alignItems: "flex-start" }}>
          {BOARD_COLUMNS.map((col) => (
            <KanbanColumn
              key={col.slug}
              col={col}
              items={columns[col.slug] ?? []}
              draggedItem={draggedItem}
              canTransitionGlobally={canTransition}
              onDragStart={setDraggedItem}
              onDragEnd={() => setDraggedItem(null)}
              onDrop={handleDrop}
              onEdit={openEdit}
              onDone={handleDone}
              onDelete={(id) => deleteMutation.mutate(id)}
              canUpdate={canUpdate}
              canDelete={canDelete}
            />
          ))}
        </div>
      ) : viewMode === "calendar" ? (
        <FollowUpCalendarView
          items={listItems}
          loading={listLoading}
          onSelect={(item) => setDetailItem(item)}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {listItems.length === 0 ? (
            <Empty description="No follow-ups assigned to you" />
          ) : (
            listItems.map((item) => (
              <div key={item.id} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 16px", background: "var(--bms-surface)",
                border: "1px solid var(--bms-border)",
                borderLeft: `3px solid ${priorityAccent(item.priority || "MEDIUM")}`,
                borderRadius: 10,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: item.is_overdue ? "#dc2626" : item.workflow_state_color || "#9ca3af", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <Text strong>{item.title}</Text>
                    <PriorityTag priority={item.priority || "MEDIUM"} label={item.priority_label} />
                    <Tag icon={<TypeIcon type={item.type} />}>{item.type_label}</Tag>
                    <Tag color={item.workflow_state_color}>{item.workflow_state_name}</Tag>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--bms-text-2)", marginTop: 4 }}>
                    {item.is_overdue && <Text type="danger" strong><WarningOutlined /> OVERDUE </Text>}
                    {item.start_date && <span>{dayjs(item.start_date).format("DD MMM YYYY")}{item.end_date && item.end_date !== item.start_date ? ` - ${dayjs(item.end_date).format("DD MMM YYYY")}` : ''} · </span>}
                    {formatTimeRange(item.start_time, item.end_time) && (
                      <span>{formatTimeRange(item.start_time, item.end_time)} · </span>
                    )}
                    {item.description && <span>{item.description} · </span>}
                    Assignee: {item.assignee_name}
                    {item.reporter_name && item.reporter_name !== item.assignee_name && (
                      <span> · Created by {item.reporter_name}</span>
                    )}
                  </div>
                </div>
                <Space>
                  {canTransition && item.can_transition && item.workflow_state_slug !== "completed" && item.workflow_state_slug !== "cancelled" && (
                    <Button size="small" icon={<CheckOutlined />} onClick={() => handleDone(item)}>Done</Button>
                  )}
                  {canUpdate && <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(item)}>Edit</Button>}
                  {canDelete && (
                    <Popconfirm title="Delete?" onConfirm={() => deleteMutation.mutate(item.id)}>
                      <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  )}
                </Space>
              </div>
            ))
          )}
        </div>
      )}

      <FollowUpDetailDrawer
        item={detailItem}
        open={Boolean(detailItem)}
        onClose={() => setDetailItem(null)}
        onEdit={openEdit}
        onDone={handleDone}
        onDelete={(id) => deleteMutation.mutate(id)}
        canUpdate={canUpdate}
        canDelete={canDelete}
        canTransition={canTransition}
      />

      {/* Create / Edit Modal */}
      <Modal
        title={editing ? "Edit Follow-up" : "Schedule Follow-up"}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditing(null); form.resetFields(); }}
        onOk={handleSubmit}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        okText={editing ? "Save changes" : "Schedule follow-up"}
        cancelText="Cancel"
        width={560}
        destroyOnClose
        styles={{ body: { paddingTop: 8 } }}
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark="optional"
          initialValues={{ type: "CALL", priority: "MEDIUM" }}
        >
          <Form.Item name="title" label="Title" rules={[{ required: true, message: "Title is required" }]}>
            <Input placeholder="e.g. Client call — project scope review" size="large" />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="type" label="Type" rules={[{ required: true }]}>
                <Select
                  size="large"
                  options={TYPE_OPTIONS.map((t) => ({
                    value: t.value,
                    label: t.label,
                    icon: t.icon,
                  }))}
                  optionRender={(opt) => (
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {TYPE_OPTIONS.find((t) => t.value === opt.value)?.icon}
                      {opt.label}
                    </span>
                  )}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="start_date" label="Start date">
                <DatePicker style={{ width: "100%" }} size="large" format="DD MMM YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="end_date" label="End date">
                <DatePicker style={{ width: "100%" }} size="large" format="DD MMM YYYY" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="priority" label="Priority" rules={[{ required: true }]}>
            <PriorityPicker />
          </Form.Item>

          <div style={{
            background: "var(--bms-surface-2)", border: "1px solid var(--bms-border)",
            borderRadius: 10, padding: "12px 14px", marginBottom: 16,
          }}>
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 10 }}>
              Time window <Text type="secondary" style={{ fontSize: 11 }}>(optional)</Text>
            </Text>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="start_time" label="Start" style={{ marginBottom: 0 }}>
                  <TimePicker
                    style={{ width: "100%" }}
                    format="h:mm A"
                    use12Hours
                    minuteStep={5}
                    placeholder="Start time"
                    needConfirm={false}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="end_time"
                  label="End"
                  style={{ marginBottom: 0 }}
                  dependencies={["start_time"]}
                  rules={[
                    ({ getFieldValue }) => ({
                      validator(_, end) {
                        const start = getFieldValue("start_time");
                        if (start && end && !end.isAfter(start)) {
                          return Promise.reject(new Error("End must be after start"));
                        }
                        return Promise.resolve();
                      },
                    }),
                  ]}
                >
                  <TimePicker
                    style={{ width: "100%" }}
                    format="h:mm A"
                    use12Hours
                    minuteStep={5}
                    placeholder="End time"
                    needConfirm={false}
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <Form.Item name="assignee" label="Assign to">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              size="large"
              placeholder="Defaults to you if left empty"
              options={(employees ?? []).map((e) => ({ value: e.id, label: e.full_name }))}
            />
          </Form.Item>

          <Divider style={{ margin: "4px 0 16px" }} />

          <Form.Item name="description" label="Description">
            <TextArea rows={3} placeholder="What needs to be done?" showCount maxLength={500} />
          </Form.Item>
          <Form.Item name="comments" label="Comments" style={{ marginBottom: 0 }}>
            <TextArea rows={2} placeholder="Additional notes (optional)" showCount maxLength={300} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
