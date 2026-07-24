import { useState, useEffect } from "react";
import { Drawer, Button, Tag, Space, Typography, Divider, Popconfirm, Input, message } from "antd";
import {
  EditOutlined, DeleteOutlined, CheckOutlined, ClockCircleOutlined,
  UserOutlined, PhoneOutlined, MailOutlined, CalendarOutlined,
  WhatsAppOutlined, EnvironmentOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { FollowUpItem, FOLLOWUP_PRIORITIES, followUpApi } from "@/services/followups";
import PastelTag, { OverdueTag } from "@/components/common/PastelTag";
import { useAuthStore } from "@/store/auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { extractCustomColor } from "@/pages/workspace/workspaceCalendarTheme";


const { Text, Title, Paragraph } = Typography;

const TYPE_ICON: Record<string, React.ReactNode> = {
  EMAIL: <MailOutlined />, CALL: <PhoneOutlined />, MEETING: <CalendarOutlined />,
  WHATSAPP: <WhatsAppOutlined />, SITE_VISIT: <EnvironmentOutlined />,
};

export default function FollowUpDetailDrawer({
  item: propItem, open, onClose, onEdit, onDone, onDelete,
  canUpdate, canDelete, canTransition,
}: {
  item: FollowUpItem | null;
  open: boolean;
  onClose: () => void;
  onEdit: (item: FollowUpItem) => void;
  onDone: (item: FollowUpItem) => void;
  onDelete: (id: string) => void;
  canUpdate: boolean;
  canDelete: boolean;
  canTransition: boolean;
}) {
  const [localItem, setLocalItem] = useState<FollowUpItem | null>(null);

  useEffect(() => {
    setLocalItem(propItem);
  }, [propItem]);

  const item = localItem || propItem;

  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [commentText, setCommentText] = useState("");

  const addCommentMutation = useMutation({
    mutationFn: (newComment: string) => {
      if (!item) throw new Error("No item selected");
      const { color, cleanText } = extractCustomColor(item.comments);
      const formattedTime = dayjs().format("DD MMM YYYY, hh:mm A");
      const authorName = user?.full_name || user?.username || "Unknown User";
      const commentHeader = `${authorName} (${formattedTime})`;
      const newThread = cleanText
        ? `${cleanText}\n\n${commentHeader}:\n${newComment}`
        : `${commentHeader}:\n${newComment}`;
      const finalComments = newThread + (color ? ` <!--color:${color}-->` : "");
      
      return followUpApi.update(item.id, { comments: finalComments });
    },
    onSuccess: (data) => {
      setCommentText("");
      message.success("Comment added");
      setLocalItem((prev) => prev ? { ...prev, comments: data.comments } : null);
      qc.invalidateQueries({ queryKey: ["followups-board"] });
      qc.invalidateQueries({ queryKey: ["followups-list"] });
      qc.invalidateQueries({ queryKey: ["employee-dashboard"] });
      qc.invalidateQueries({ queryKey: ["meetings-list"] });
      qc.invalidateQueries({ queryKey: ["workspace-calendar"] });
    },
    onError: () => {
      message.error("Failed to add comment");
    }
  });

  if (!item) return null;

  const isFinal = item.workflow_state_slug === "completed" || item.workflow_state_slug === "cancelled";
  const pri = FOLLOWUP_PRIORITIES.find((p) => p.value === item.priority) ?? FOLLOWUP_PRIORITIES[2];
  const { color, cleanText } = extractCustomColor(item.comments);

  return (
    <Drawer
      title="Follow-up details"
      open={open}
      onClose={onClose}
      width={400}
      styles={{ body: { paddingTop: 8 } }}
      footer={
        <Space wrap>
          {canUpdate && (
            <Button icon={<EditOutlined />} onClick={() => { onEdit(item); onClose(); }}>
              Edit
            </Button>
          )}
          {canTransition && !isFinal && item.can_transition && (
            <Button type="primary" icon={<CheckOutlined />} onClick={() => { onDone(item); onClose(); }}>
              Mark done
            </Button>
          )}
          {canDelete && (
            <Popconfirm title="Delete this follow-up?" onConfirm={() => { onDelete(item.id); onClose(); }}>
              <Button danger icon={<DeleteOutlined />}>Delete</Button>
            </Popconfirm>
          )}
        </Space>
      }
    >
      <Title level={4} style={{ marginTop: 0, marginBottom: 12 }}>{item.title}</Title>

      <Space wrap size={[6, 6]} style={{ marginBottom: 16 }}>
        <PastelTag tone={pri}>{item.priority_label || pri.label}</PastelTag>
        <Tag icon={TYPE_ICON[item.type]} style={{ background: "#1e3a5f", color: "#fff", border: "1px solid #2d5080", borderRadius: 6 }}>{item.type_label}</Tag>
        <Tag style={{ background: item.workflow_state_color || "#1e3a5f", color: "#fff", border: "none", borderRadius: 6 }}>{item.workflow_state_name}</Tag>
        {item.is_overdue && <OverdueTag />}
      </Space>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <ClockCircleOutlined style={{ color: "#6b7280", marginTop: 2 }} />
          <div>
            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>When</Text>
            <Text>
              {item.start_date ? dayjs(item.start_date).format("dddd, D MMMM YYYY") : "No date set"}
              {item.end_date && item.end_date !== item.start_date && (
                <span style={{ color: "var(--pmt-text-2)" }}> – {dayjs(item.end_date).format("D MMMM YYYY")}</span>
              )}
              {item.start_time && (
                <span style={{ color: "var(--pmt-text-2)" }}> · {(item as { start_time: string }).start_time && item.end_time
                  ? `${dayjs(`2000-01-01T${item.start_time}`).format("h:mm A")} – ${dayjs(`2000-01-01T${item.end_time}`).format("h:mm A")}`
                  : dayjs(`2000-01-01T${item.start_time}`).format("h:mm A")}
                </span>
              )}
            </Text>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <UserOutlined style={{ color: "#6b7280", marginTop: 2 }} />
          <div>
            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>People</Text>
            <Text>Assignees: {(item.assignees_data || []).map(a => a.full_name).join(", ") || "Unassigned"}</Text>
            {item.reporter_name && (
              <div style={{ color: "var(--pmt-text-2)", fontSize: 12 }}>Created by {item.reporter_name}</div>
            )}
          </div>
        </div>
      </div>

      {item.description && (
        <>
          <Divider style={{ margin: "16px 0 12px" }} />
          <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 4 }}>Description</Text>
          <Paragraph style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>{item.description}</Paragraph>
        </>
      )}

      {cleanText && (
        <>
          <Divider style={{ margin: "16px 0 12px" }} />
          <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 4 }}>Comments</Text>
          <Paragraph style={{ marginBottom: 0, whiteSpace: "pre-wrap", color: "var(--pmt-text-2)", fontSize: 12 }}>
            {cleanText}
          </Paragraph>
        </>
      )}

      <Divider style={{ margin: "16px 0 12px" }} />
      <div style={{ marginTop: 12 }}>
        <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 6 }}>Add Comment</Text>
        <Input.TextArea
          rows={3}
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Write a comment..."
          style={{ marginBottom: 8, borderRadius: 6 }}
        />
        <Button
          type="primary"
          size="small"
          onClick={() => {
            if (commentText.trim()) {
              addCommentMutation.mutate(commentText.trim());
            }
          }}
          loading={addCommentMutation.isPending}
          disabled={!commentText.trim()}
          style={{ borderRadius: 6 }}
        >
          Post Comment
        </Button>
      </div>
    </Drawer>
  );
}
