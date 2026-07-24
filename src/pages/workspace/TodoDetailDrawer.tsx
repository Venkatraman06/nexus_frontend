import { Drawer, Button, Tag, Space, Typography, Divider, Popconfirm } from "antd";
import {
  EditOutlined, DeleteOutlined, CheckOutlined, ClockCircleOutlined, UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { TodoItem, TODO_PRIORITIES } from "@/services/todos";
import PastelTag, { OverdueTag } from "@/components/common/PastelTag";
import { formatTimeRange } from "@/pages/followups/followupCalendarUtils";
import { extractCustomColor } from "./workspaceCalendarTheme";

const { Text, Title, Paragraph } = Typography;

export default function TodoDetailDrawer({
  item, open, onClose, onEdit, onDone, onDelete,
  canUpdate, canDelete, canTransition,
}: {
  item: TodoItem | null;
  open: boolean;
  onClose: () => void;
  onEdit: (item: TodoItem) => void;
  onDone: (item: TodoItem) => void;
  onDelete: (id: string) => void;
  canUpdate: boolean;
  canDelete: boolean;
  canTransition: boolean;
}) {
  if (!item) return null;

  const isFinal = item.workflow_state_slug === "done" || item.workflow_state_slug === "cancelled";
  const pri = TODO_PRIORITIES.find((p) => p.value === item.priority) ?? TODO_PRIORITIES[1];
  const timeRange = formatTimeRange(item.start_time, item.end_time);

  return (
    <Drawer
      title="To-do details"
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
            <Popconfirm title="Delete this to-do?" onConfirm={() => { onDelete(item.id); onClose(); }}>
              <Button danger icon={<DeleteOutlined />}>Delete</Button>
            </Popconfirm>
          )}
        </Space>
      }
    >
      <Title level={4} style={{ marginTop: 0, marginBottom: 12 }}>{item.title}</Title>

      <Space wrap size={[6, 6]} style={{ marginBottom: 16 }}>
        <PastelTag tone={pri}>{item.priority_label || pri.label}</PastelTag>
        <Tag color={item.workflow_state_color}>{item.workflow_state_name}</Tag>
        {item.is_overdue && <OverdueTag />}
      </Space>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <ClockCircleOutlined style={{ color: "#6b7280", marginTop: 2 }} />
          <div>
            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>When</Text>
            <Text>
              {item.start_date ? (
                <>
                  {dayjs(item.start_date).format("dddd, D MMMM YYYY")}
                  {item.due_date && item.due_date !== item.start_date && (
                    <span style={{ color: "var(--pmt-text-2)" }}> – {dayjs(item.due_date).format("D MMMM YYYY")}</span>
                  )}
                </>
              ) : item.due_date ? (
                dayjs(item.due_date).format("dddd, D MMMM YYYY")
              ) : (
                "No date set"
              )}
              {timeRange && <span style={{ color: "var(--pmt-text-2)" }}> · {timeRange}</span>}
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

      {item.description && extractCustomColor(item.description).cleanText && (
        <>
          <Divider style={{ margin: "16px 0 12px" }} />
          <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 4 }}>Description</Text>
          <Paragraph style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>{extractCustomColor(item.description).cleanText}</Paragraph>
        </>
      )}
    </Drawer>
  );
}
