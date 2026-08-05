import { Drawer, Button, Tag, Space, Typography, Divider, Popconfirm } from "antd";
import {
  EditOutlined, DeleteOutlined, CheckOutlined, ClockCircleOutlined,
  UserOutlined, PhoneOutlined, MailOutlined, CalendarOutlined,
  WhatsAppOutlined, EnvironmentOutlined, WarningOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { FollowUpItem, FOLLOWUP_PRIORITIES } from "@/services/followups";
import { formatTimeRange, priorityColor, statusColor } from "./followupCalendarUtils";

const { Text, Title, Paragraph } = Typography;

const TYPE_ICON: Record<string, React.ReactNode> = {
  EMAIL: <MailOutlined />, CALL: <PhoneOutlined />, MEETING: <CalendarOutlined />,
  WHATSAPP: <WhatsAppOutlined />, SITE_VISIT: <EnvironmentOutlined />,
};

export default function FollowUpDetailDrawer({
  item, open, onClose, onEdit, onDone, onDelete,
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
  if (!item) return null;

  const isFinal = item.workflow_state_slug === "completed" || item.workflow_state_slug === "cancelled";
  const pri = FOLLOWUP_PRIORITIES.find((p) => p.value === item.priority) ?? FOLLOWUP_PRIORITIES[2];
  const timeRange = formatTimeRange(item.start_time, item.end_time);

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
        <Tag color={priorityColor(item.priority)}>{item.priority_label || pri.label}</Tag>
        <Tag icon={TYPE_ICON[item.type]}>{item.type_label}</Tag>
        <Tag color={statusColor(item.workflow_state_slug)}>{item.workflow_state_name}</Tag>
        {item.is_overdue && (
          <Tag color="error" icon={<WarningOutlined />}>Overdue</Tag>
        )}
      </Space>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <ClockCircleOutlined style={{ color: "#6b7280", marginTop: 2 }} />
          <div>
            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>When</Text>
            <Text>
              {item.start_date ? dayjs(item.start_date).format("dddd, D MMMM YYYY") : "No date set"}
              {item.end_date && item.end_date !== item.start_date && (
                <span> - {dayjs(item.end_date).format("dddd, D MMMM YYYY")}</span>
              )}
              {timeRange && <span style={{ color: "var(--bms-text-2)" }}> · {timeRange}</span>}
            </Text>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <UserOutlined style={{ color: "#6b7280", marginTop: 2 }} />
          <div>
            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>People</Text>
            <Text>Assignee: {item.assignee_name || "Unassigned"}</Text>
            {item.reporter_name && (
              <div style={{ color: "var(--bms-text-2)", fontSize: 12 }}>Created by {item.reporter_name}</div>
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

      {item.comments && (
        <>
          <Divider style={{ margin: "16px 0 12px" }} />
          <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 4 }}>Comments</Text>
          <Paragraph style={{ marginBottom: 0, whiteSpace: "pre-wrap", color: "var(--bms-text-2)" }}>
            {item.comments}
          </Paragraph>
        </>
      )}
    </Drawer>
  );
}
