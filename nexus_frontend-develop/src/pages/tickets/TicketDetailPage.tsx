import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Tag, Typography, Button, Spin, Space, Empty,
  Select, Avatar, Tooltip, Input, Upload, message,
  DatePicker, InputNumber, Switch, Tabs, Modal,
} from "antd";
import {
  ArrowLeftOutlined, EditOutlined, PaperClipOutlined, SendOutlined,
  DeleteOutlined, UserOutlined,
  CalendarOutlined, ClockCircleOutlined, FlagOutlined, LinkOutlined, DownloadOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  ticketsApi,
  TICKET_TYPE_LABELS, PRIORITY_ICONS,
  type TicketDetail, type TicketComment, type TicketHistoryEntry,
  type TicketType, type TicketPriority,
} from "@/services/tickets";
import { employeeApi } from "@/services/employees";
import RichTextEditor from "@/components/common/RichTextEditor";
import {
  PriorityLabel, TypeIcon,
  PRIORITY_SELECT_OPTIONS,
} from "@/components/tickets/TicketIcons";
import PermGuard from "@/components/common/PermGuard";
import { PERMS } from "@/constants/permissions";
import { apiErrorMsg } from "@/utils/apiError";
import { projectsApi } from "@/services/projects";
import {
  disableTicketDueDate,
  getMaxOriginalEstimate,
} from "@/utils/ticketProjectConstraints";
import "./TicketDetailPage.css";

dayjs.extend(relativeTime);
const { Title, Text } = Typography;
const { TextArea } = Input;

// ── Status transition dropdown ─────────────────────────────────────────────────
function StatusTransition({ ticket, onTransitioned }: {
  ticket: TicketDetail; onTransitioned: () => void;
}) {
  const qc = useQueryClient();
  const transMut = useMutation({
    mutationFn: ({ dest, comments }: { dest: string; comments?: string }) =>
      ticketsApi.transition(ticket.id, dest, comments),
    onSuccess: () => {
      message.success("Status updated");
      qc.invalidateQueries({ queryKey: ["ticket", ticket.id] });
      onTransitioned();
    },
    onError: (e: any) => message.error(apiErrorMsg(e, "Transition failed")),
  });

  const lozengeColor = ticket.workflow_state_color || "#dfe1e6";
  const lozengeText  = ticket.workflow_state_color || "#42526e";

  if (!ticket.available_states?.length) {
    return (
      <span
        className="jira-status-lozenge"
        style={{ background: `${lozengeColor}33`, color: lozengeText }}
      >
        <span className="jira-status-lozenge__dot" style={{ background: lozengeColor }} />
        {ticket.workflow_state_name || "No Status"}
      </span>
    );
  }

  return (
    <PermGuard permission={PERMS.PROJECT_TICKET_TRANSITION} fallback={
      <span
        className="jira-status-lozenge"
        style={{ background: `${lozengeColor}33`, color: lozengeText }}
      >
        <span className="jira-status-lozenge__dot" style={{ background: lozengeColor }} />
        {ticket.workflow_state_name || "No Status"}
      </span>
    }>
      <Select
        className="jira-status-select"
        value={ticket.workflow_state || undefined}
        onChange={(val) => {
          const state = ticket.available_states.find((s) => s.id === val || s.slug === val);
          if (state) transMut.mutate({ dest: state.slug });
        }}
        loading={transMut.isPending}
        style={{ minWidth: 140 }}
        placeholder="Set status"
        options={[
          {
            label: <span style={{ fontSize: 11, color: "#9ca3af" }}>CURRENT</span>,
            options: ticket.workflow_state_name ? [{
              value: ticket.workflow_state,
              label: (
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: ticket.workflow_state_color || "#9ca3af" }} />
                  {ticket.workflow_state_name}
                </span>
              ),
              disabled: true,
            }] : [],
          },
          {
            label: <span style={{ fontSize: 11, color: "#9ca3af" }}>TRANSITION TO</span>,
            options: ticket.available_states.map((s) => ({
              value: s.slug,
              label: (
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color || "#9ca3af" }} />
                  {s.name}
                </span>
              ),
            })),
          },
        ]}
      />
    </PermGuard>
  );
}

// ── Inline field editor ────────────────────────────────────────────────────────
function FieldRow({ label, icon, children }: {
  label: string; icon: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="jira-field">
      <div className="jira-field__label">
        <span className="jira-field__label-icon">{icon}</span>
        {label}
      </div>
      <div className="jira-field__value">{children}</div>
    </div>
  );
}

// ── Comment item ───────────────────────────────────────────────────────────────
function CommentItem({ comment, ticketId, onDelete }: {
  comment: TicketComment; ticketId: string; onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);
  const qc = useQueryClient();

  const editMut = useMutation({
    mutationFn: (body: string) => ticketsApi.updateComment(ticketId, comment.id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket-comments", ticketId] });
      setEditing(false);
    },
    onError: (e: any) => message.error(apiErrorMsg(e)),
  });

  const deleteMut = useMutation({
    mutationFn: () => ticketsApi.deleteComment(ticketId, comment.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket-comments", ticketId] });
      onDelete();
    },
  });

  return (
    <div className="jira-comment">
      <Avatar
        size={32}
        className="jira-comment__avatar"
        src={comment.author_avatar ?? undefined}
        icon={<UserOutlined />}
      >
        {comment.author_name?.charAt(0)}
      </Avatar>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="jira-comment__header">
          <Space size={6}>
            <span className="jira-comment__author">{comment.author_name || "Unknown"}</span>
            {comment.is_edited && <Text type="secondary" style={{ fontSize: 11 }}>(edited)</Text>}
            <Tooltip title={dayjs(comment.created_at).format("DD MMM YYYY, hh:mm A")}>
              <span className="jira-comment__time">{dayjs(comment.created_at).fromNow()}</span>
            </Tooltip>
          </Space>
          <Space size={0}>
            <Button size="small" type="text" icon={<EditOutlined />} onClick={() => { setEditing(true); setEditBody(comment.body); }} />
            <Button size="small" type="text" danger icon={<DeleteOutlined />} loading={deleteMut.isPending}
              onClick={() => Modal.confirm({
                title: "Delete comment?",
                onOk: () => deleteMut.mutateAsync(),
              })} />
          </Space>
        </div>
        {editing ? (
          <div style={{ marginTop: 8 }}>
            <TextArea rows={3} className="jira-comment-compose__input" value={editBody} onChange={(e) => setEditBody(e.target.value)} />
            <Space style={{ marginTop: 8 }}>
              <Button size="small" type="primary" loading={editMut.isPending}
                onClick={() => editMut.mutate(editBody)}>Save</Button>
              <Button size="small" onClick={() => setEditing(false)}>Cancel</Button>
            </Space>
          </div>
        ) : (
          <div className="jira-comment__body">{comment.body}</div>
        )}
      </div>
    </div>
  );
}

// ── History entry ──────────────────────────────────────────────────────────────
function HistoryItem({ entry }: { entry: TicketHistoryEntry }) {
  const changeKeys = Object.keys(entry.changes ?? {});
  return (
    <div className="jira-history-item">
      <Avatar size={28} className="jira-comment__avatar" icon={<UserOutlined />} />
      <div style={{ flex: 1 }}>
        <Space size={6} wrap>
          <Text strong style={{ fontSize: 13 }}>{entry.changed_by_name}</Text>
          <Tag color={entry.action === "create" ? "green" : entry.action === "transition" ? "blue" : "default"} style={{ fontSize: 10 }}>
            {entry.action === "create" ? "Created" : entry.action === "transition" ? "Transitioned" : "Updated"}
          </Tag>
          <Tooltip title={dayjs(entry.changed_at).format("DD MMM YYYY, hh:mm A")}>
            <Text type="secondary" style={{ fontSize: 12 }}>{dayjs(entry.changed_at).fromNow()}</Text>
          </Tooltip>
          {entry.comments && <Text type="secondary" style={{ fontSize: 12 }}>"{entry.comments}"</Text>}
        </Space>
        {changeKeys.map((label) => {
          const { old: oldVal, new: newVal } = entry.changes[label];
          return (
            <div key={label} style={{ marginTop: 4, fontSize: 12, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <Text strong style={{ color: "#374151" }}>{label}</Text>
              {entry.action === "create" ? (
                <>
                  <Text type="secondary">set to</Text>
                  <Tag color="green" style={{ margin: 0 }}>{newVal ?? "—"}</Tag>
                </>
              ) : (
                <>
                  <Tag style={{ margin: 0, color: "#6b7280", borderColor: "#e5e7eb", background: "#f3f4f6" }}>{oldVal ?? "—"}</Tag>
                  <Text type="secondary">→</Text>
                  <Tag color="blue" style={{ margin: 0 }}>{newVal ?? "—"}</Tag>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Detail Page ───────────────────────────────────────────────────────────
export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [commentBody, setCommentBody] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [descValue, setDescValue] = useState("");

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => ticketsApi.retrieve(id!),
    enabled: !!id,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["ticket-comments", id],
    queryFn: () => ticketsApi.getComments(id!),
    enabled: !!id,
  });

  const { data: history = [] } = useQuery({
    queryKey: ["ticket-history", id],
    queryFn: () => ticketsApi.getHistory(id!),
    enabled: !!id,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["dd", "employees-simple"],
    queryFn: () => employeeApi.simpleDropdown(),
    staleTime: 60_000,
  });

  const { data: allTickets = [] } = useQuery({
    queryKey: ["tickets-dropdown", ticket?.project],
    queryFn: () => ticketsApi.list({ project: ticket?.project, page_size: 200 }),
    select: (d: any) => d.results ?? [],
    enabled: !!ticket?.project,
  });

  const { data: projectDetail } = useQuery({
    queryKey: ["project", ticket?.project],
    queryFn: () => projectsApi.get(ticket!.project),
    enabled: !!ticket?.project,
    staleTime: 60_000,
  });

  const maxEstimate = getMaxOriginalEstimate(projectDetail);

  const updateMut = useMutation({
    mutationFn: (data: any) => ticketsApi.update(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket", id] });
      qc.invalidateQueries({ queryKey: ["tickets"] });
      setEditingTitle(false);
      setEditingDesc(false);
    },
    onError: (e: any) => message.error(apiErrorMsg(e, "Update failed")),
  });

  const commentMut = useMutation({
    mutationFn: (body: string) => ticketsApi.addComment(id!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket-comments", id] });
      setCommentBody("");
    },
    onError: (e: any) => message.error(apiErrorMsg(e)),
  });

  const uploadMut = useMutation({
    mutationFn: (file: File) => ticketsApi.uploadAttachment(id!, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket", id] });
      message.success("Attachment uploaded");
    },
    onError: (e: any) => message.error(apiErrorMsg(e, "Upload failed")),
  });

  const deleteAttachMut = useMutation({
    mutationFn: (attachId: string) => ticketsApi.deleteAttachment(id!, attachId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket", id] });
      message.success("Attachment removed");
    },
  });

  const toEmpOptions = (arr: any[]) => arr.map((e: any) => ({ value: e.id, label: e.full_name }));

  if (isLoading) {
    return <div style={{ textAlign: "center", paddingTop: 100 }}><Spin size="large" /></div>;
  }
  if (!ticket) {
    return <Empty description="Ticket not found" />;
  }

  const fileIconMap: Record<string, string> = {
    "application/pdf": "📄",
    "application/msword": "📝",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "📝",
    "application/vnd.ms-excel": "📊",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "📊",
    "text/csv": "📊",
  };
  const getFileIcon = (ct: string) => {
    if (ct.startsWith("image/")) return "🖼️";
    return fileIconMap[ct] || "📎";
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="jira-issue">
      <nav className="jira-issue__breadcrumb">
        <Button type="text" size="small" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ marginRight: 4 }} />
        <Link to="/tickets">Tickets</Link>
        <span className="jira-issue__breadcrumb-sep">/</span>
        <Link to={`/projects/${ticket.project}`}>{ticket.project_code}</Link>
        <span className="jira-issue__breadcrumb-sep">/</span>
        <span className="jira-issue__breadcrumb-current">{ticket.ticket_id}</span>
      </nav>

      <div className="jira-issue__layout">
        <main className="jira-issue__main">
          <div className="jira-issue__type-row">
            <span className="jira-issue__type-badge">
              <TypeIcon type={ticket.type} size={16} />
              {TICKET_TYPE_LABELS[ticket.type]}
            </span>
            <span className="jira-issue__key">{ticket.ticket_id}</span>
          </div>

          <div className="jira-issue__title-wrap">
            {editingTitle ? (
              <Space.Compact style={{ width: "100%" }}>
                <Input
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  size="large"
                  className="jira-issue__title"
                  onPressEnter={() => updateMut.mutate({ title: titleValue })}
                  autoFocus
                />
                <Button type="primary" loading={updateMut.isPending}
                  onClick={() => updateMut.mutate({ title: titleValue })}>Save</Button>
                <Button onClick={() => setEditingTitle(false)}>Cancel</Button>
              </Space.Compact>
            ) : (
              <div
                className="jira-issue__title-edit"
                onClick={() => { setTitleValue(ticket.title); setEditingTitle(true); }}
              >
                <Title level={2} className="jira-issue__title">{ticket.title}</Title>
                <PermGuard permission={PERMS.PROJECT_TICKET_UPDATE}>
                  <Button size="small" type="text" icon={<EditOutlined />} className="jira-issue__title-edit-btn" />
                </PermGuard>
              </div>
            )}
          </div>

          <div className="jira-issue__toolbar">
            <StatusTransition ticket={ticket} onTransitioned={() => {
              qc.invalidateQueries({ queryKey: ["ticket", id] });
              qc.invalidateQueries({ queryKey: ["ticket-history", id] });
            }} />
          </div>

          <section className="jira-section">
            <div className="jira-section__header">
              <h2 className="jira-section__title">Description</h2>
              <PermGuard permission={PERMS.PROJECT_TICKET_UPDATE}>
                <Button type="text" size="small" className="jira-section__action" icon={<EditOutlined />}
                  onClick={() => { setDescValue(ticket.description || ""); setEditingDesc(true); }}>
                  Edit
                </Button>
              </PermGuard>
            </div>
            <div className="jira-section__body">
              {editingDesc ? (
                <div>
                  <RichTextEditor
                    value={descValue}
                    onChange={setDescValue}
                    placeholder="Describe the ticket..."
                    minHeight={160}
                  />
                  <Space style={{ marginTop: 10 }}>
                    <Button type="primary" size="small" loading={updateMut.isPending}
                      onClick={() => updateMut.mutate({ description: descValue })}>Save</Button>
                    <Button size="small" onClick={() => setEditingDesc(false)}>Cancel</Button>
                  </Space>
                </div>
              ) : ticket.description ? (
                <div
                  className="rte-content jira-section__body--rte"
                  dangerouslySetInnerHTML={{ __html: ticket.description }}
                  onClick={() => { setDescValue(ticket.description || ""); setEditingDesc(true); }}
                />
              ) : (
                <div
                  className="jira-section__body--empty"
                  onClick={() => { setDescValue(""); setEditingDesc(true); }}
                >
                  Add a description…
                </div>
              )}
            </div>
          </section>

          <section className="jira-section">
            <div className="jira-section__header">
              <h2 className="jira-section__title">
                <PaperClipOutlined style={{ marginRight: 8, fontSize: 14 }} />
                Attachments
                <span className="jira-attachments__count">{ticket.attachments?.length ?? 0}</span>
              </h2>
              <PermGuard permission={PERMS.PROJECT_TICKET_UPDATE}>
                <Upload
                  showUploadList={false}
                  beforeUpload={(file) => {
                    uploadMut.mutate(file);
                    return false;
                  }}
                >
                  <Button size="small" className="jira-section__action" loading={uploadMut.isPending}>
                    Attach file
                  </Button>
                </Upload>
              </PermGuard>
            </div>
            {(ticket.attachments?.length ?? 0) === 0 && (
              <Text type="secondary" style={{ fontSize: 13 }}>No attachments yet.</Text>
            )}
            <div className="jira-attachment-grid">
              {ticket.attachments?.map((att) => (
                <div key={att.id} className="jira-attachment-item">
                  <span className="jira-attachment-item__icon">{getFileIcon(att.content_type)}</span>
                  <div className="jira-attachment-item__meta">
                    <div className="jira-attachment-item__name">{att.file_name}</div>
                    <div className="jira-attachment-item__size">{formatBytes(att.file_size)}</div>
                  </div>
                  <Space size={0}>
                    {att.file_url && (
                      <a href={att.file_url} target="_blank" rel="noreferrer" download={att.file_name}>
                        <Button size="small" type="text" icon={<DownloadOutlined />} title="Download File" />
                      </a>
                    )}
                    <PermGuard permission={PERMS.PROJECT_TICKET_UPDATE}>
                      <Button size="small" type="text" danger icon={<DeleteOutlined />}
                        onClick={() => Modal.confirm({
                          title: "Remove attachment?",
                          onOk: () => deleteAttachMut.mutateAsync(att.id),
                        })} />
                    </PermGuard>
                  </Space>
                </div>
              ))}
            </div>
          </section>

          {ticket.children_count > 0 && (
            <ChildrenPanel ticketId={id!} navigate={navigate} />
          )}

          <section className="jira-section jira-activity">
            <h2 className="jira-section__title" style={{ marginBottom: 0 }}>Activity</h2>
            <Tabs
              defaultActiveKey="comments"
              items={[
                {
                  key: "comments",
                  label: (
                    <span>
                      Comments
                      <span className="jira-activity__count">{(comments as TicketComment[]).length}</span>
                    </span>
                  ),
                  children: (
                    <div>
                      {(comments as TicketComment[]).map((c) => (
                        <CommentItem
                          key={c.id}
                          comment={c}
                          ticketId={id!}
                          onDelete={() => qc.invalidateQueries({ queryKey: ["ticket-comments", id] })}
                        />
                      ))}
                      <div className="jira-comment-compose">
                        <Avatar size={32} className="jira-comment__avatar" icon={<UserOutlined />} />
                        <div style={{ flex: 1 }}>
                          <TextArea
                            rows={3}
                            className="jira-comment-compose__input"
                            placeholder="Add a comment…"
                            value={commentBody}
                            onChange={(e) => setCommentBody(e.target.value)}
                          />
                          <div className="jira-comment-compose__actions">
                            <Button
                              type="primary" size="small" icon={<SendOutlined />}
                              loading={commentMut.isPending}
                              disabled={!commentBody.trim()}
                              onClick={() => commentMut.mutate(commentBody)}
                            >
                              Comment
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ),
                },
                {
                  key: "history",
                  label: "History",
                  children: (
                    <div>
                      {(history as TicketHistoryEntry[]).length === 0 && (
                        <Empty description="No history" style={{ padding: "24px 0" }} />
                      )}
                      {(history as TicketHistoryEntry[]).map((h) => (
                        <HistoryItem key={h.id} entry={h} />
                      ))}
                    </div>
                  ),
                },
              ]}
            />
          </section>
        </main>

        <aside className="jira-details">
          <h3 className="jira-details__title">Details</h3>
          <FieldRow label="Project" icon={<LinkOutlined />}>
            <span className="jira-project-link" onClick={() => navigate(`/projects/${ticket.project}`)}>
              {ticket.project_code}
            </span>
            <span className="jira-project-name">{ticket.project_name}</span>
          </FieldRow>

          <FieldRow label="Assignee" icon={<UserOutlined />}>
                <PermGuard permission={PERMS.PROJECT_TICKET_UPDATE} fallback={
                  <Text style={{ fontSize: 13 }}>{ticket.assignee_name || "Unassigned"}</Text>
                }>
                  <Select
                    value={ticket.assignee || undefined}
                    onChange={(v) => updateMut.mutate({ assignee: v ?? null })}
                    size="small" style={{ width: "100%" }}
                    showSearch allowClear placeholder="Unassigned"
                    options={toEmpOptions(employees as any[])}
                    filterOption={(i, o) => (o?.label as string)?.toLowerCase().includes(i.toLowerCase())}
                  />
                </PermGuard>
          </FieldRow>

          <FieldRow label="Reporter" icon={<UserOutlined />}>
            <Text style={{ fontSize: 13 }}>{ticket.reporter_name || "—"}</Text>
          </FieldRow>

          <FieldRow label="Priority" icon={<FlagOutlined />}>
                <PermGuard permission={PERMS.PROJECT_TICKET_UPDATE} fallback={
                  <PriorityLabel priority={ticket.priority} />
                }>
                  <Select
                    value={ticket.priority}
                    onChange={(v) => updateMut.mutate({ priority: v })}
                    size="small" style={{ width: "100%" }}
                    options={PRIORITY_SELECT_OPTIONS}
                    optionRender={(opt) => <PriorityLabel priority={opt.value as TicketPriority} />}
                    labelRender={(opt) => opt.value ? <PriorityLabel priority={opt.value as TicketPriority} /> : null}
                  />
                </PermGuard>
          </FieldRow>

          <FieldRow label="Due Date" icon={<CalendarOutlined />}>
                <PermGuard permission={PERMS.PROJECT_TICKET_UPDATE} fallback={
                  <Text style={{ fontSize: 13, color: ticket.due_date && dayjs(ticket.due_date).isBefore(dayjs()) ? "#ef4444" : "inherit" }}>
                    {ticket.due_date ? dayjs(ticket.due_date).format("DD MMM YYYY") : "—"}
                  </Text>
                }>
                  <DatePicker
                    value={ticket.due_date ? dayjs(ticket.due_date) : null}
                    onChange={(d) => updateMut.mutate({ due_date: d ? d.format("YYYY-MM-DD") : null })}
                    size="small" style={{ width: "100%" }}
                    format="DD MMM YYYY"
                    disabledDate={(current) => disableTicketDueDate(current, projectDetail)}
                  />
                </PermGuard>
          </FieldRow>

          <FieldRow label="Estimate" icon={<ClockCircleOutlined />}>
                <PermGuard permission={PERMS.PROJECT_TICKET_UPDATE} fallback={
                  <Text style={{ fontSize: 13 }}>{ticket.original_estimate || 0}h</Text>
                }>
                  <InputNumber
                    value={Number(ticket.original_estimate) || 0}
                    onChange={(v) => {
                      if (maxEstimate != null && v != null && v > maxEstimate) {
                        message.error(`Original estimate cannot exceed project estimate of ${maxEstimate}h`);
                        return;
                      }
                      updateMut.mutate({ original_estimate: v });
                    }}
                    size="small" style={{ width: "100%" }} addonAfter="h" min={0} max={maxEstimate} step={0.5}
                  />
                </PermGuard>
          </FieldRow>

          <FieldRow label="Parent" icon={<LinkOutlined />}>
                <PermGuard permission={PERMS.PROJECT_TICKET_UPDATE} fallback={
                  <Text style={{ fontSize: 13 }}>{ticket.parent_ticket_id || "—"}</Text>
                }>
                  <Select
                    value={ticket.parent || undefined}
                    onChange={(v) => updateMut.mutate({ parent: v ?? null })}
                    size="small" style={{ width: "100%" }}
                    showSearch allowClear placeholder="No parent"
                    options={(allTickets as any[])
                      .filter((t: any) => t.id !== id)
                      .map((t: any) => ({ value: t.id, label: `${t.ticket_id} — ${t.title}` }))}
                    filterOption={(i, o) => (o?.label as string)?.toLowerCase().includes(i.toLowerCase())}
                  />
                </PermGuard>
          </FieldRow>

          <FieldRow label="Approved" icon={<CheckCircleOutlined />}>
                <PermGuard permission={PERMS.PROJECT_TICKET_UPDATE} fallback={
                  <Tag color={ticket.approved ? "success" : "default"}>
                    {ticket.approved ? "Yes" : "No"}
                  </Tag>
                }>
                  <Switch
                    checked={ticket.approved}
                    onChange={(v) => updateMut.mutate({ approved: v })}
                    checkedChildren="Yes" unCheckedChildren="No"
                    size="small"
                  />
                </PermGuard>
          </FieldRow>

          <FieldRow label="Notify" icon={<UserOutlined />}>
                <PermGuard permission={PERMS.PROJECT_TICKET_UPDATE} fallback={
                  <Text style={{ fontSize: 12 }}>
                    {ticket.notify_users_info?.map((u) => u.name).join(", ") || "—"}
                  </Text>
                }>
                  <Select
                    mode="multiple"
                    value={ticket.notify_users}
                    onChange={(v) => updateMut.mutate({ notify_users: v })}
                    size="small" style={{ width: "100%" }}
                    showSearch
                    placeholder="Select users to notify…"
                    options={toEmpOptions(employees as any[])}
                    filterOption={(i, o) => (o?.label as string)?.toLowerCase().includes(i.toLowerCase())}
                    maxTagCount="responsive"
                    allowClear
                  />
                </PermGuard>
          </FieldRow>

          <div className="jira-details__meta">
            <div>Created {dayjs(ticket.created_at).format("DD MMM YYYY, hh:mm A")}</div>
            <div>Updated {dayjs(ticket.updated_at).fromNow()}</div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ── Children sub-panel ─────────────────────────────────────────────────────────
function ChildrenPanel({ ticketId, navigate }: { ticketId: string; navigate: (to: string) => void }) {
  const { data: children = [], isLoading } = useQuery({
    queryKey: ["ticket-children", ticketId],
    queryFn: () => ticketsApi.getChildren(ticketId),
  });

  return (
    <section className="jira-section">
      <div className="jira-section__header">
        <h2 className="jira-section__title">
          <LinkOutlined style={{ marginRight: 8, fontSize: 14 }} />
          Child work items
          <span className="jira-attachments__count">{children.length}</span>
        </h2>
      </div>
      {isLoading && <Spin />}
      {(children as any[]).map((c: any) => (
        <div key={c.id} className="jira-child-item" onClick={() => navigate(`/tickets/${c.id}`)}>
          <TypeIcon type={c.type as TicketType} size={14} />
          <span className="jira-child-item__key">{c.ticket_id}</span>
          <Text style={{ fontSize: 13, flex: 1, minWidth: 0 }} ellipsis>{c.title}</Text>
          {c.workflow_state_name && (
            <span className="jira-child-item__status" style={{ color: c.workflow_state_color || undefined }}>
              {c.workflow_state_name}
            </span>
          )}
        </div>
      ))}
    </section>
  );
}
