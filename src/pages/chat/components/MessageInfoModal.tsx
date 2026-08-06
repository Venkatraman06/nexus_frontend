import React from "react";
import { Drawer, Avatar, Typography, Badge, Tag } from "antd";
import { CheckOutlined, ClockCircleOutlined, EyeOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { ChatMessage, ConversationParticipant } from "@/services/chat";

dayjs.extend(relativeTime);

const { Text, Title } = Typography;

interface MessageInfoModalProps {
  open: boolean;
  onClose: () => void;
  message: ChatMessage | null;
  participants: ConversationParticipant[];
  myId?: string;
}

export const MessageInfoModal: React.FC<MessageInfoModalProps> = ({
  open,
  onClose,
  message,
  participants,
  myId,
}) => {
  if (!message) return null;

  const sentTime = dayjs(message.created_at).format("D MMM YYYY, h:mm A");

  // Determine read status & seen timing
  const otherParticipants = participants.filter((p) => p.employee.id !== myId);

  return (
    <Drawer
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <EyeOutlined style={{ color: "#1890ff" }} />
          <span>Message Info</span>
        </div>
      }
      placement="right"
      width={360}
      onClose={onClose}
      open={open}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Message Card Preview */}
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            background: "#1890ff",
            color: "#fff",
            boxShadow: "0 2px 8px rgba(24, 144, 255, 0.2)",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 14 }}>{message.body || "[Attachment Message]"}</Text>
          <div style={{ textAlign: "right", fontSize: 11, color: "rgba(255,255,255,0.8)", marginTop: 4 }}>
            {dayjs(message.created_at).format("h:mm A")}
          </div>
        </div>

        <div>
          <Title level={5} style={{ fontSize: 13, textTransform: "uppercase", color: "#8c8c8c", letterSpacing: 0.5 }}>
            Message Sent
          </Title>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <ClockCircleOutlined style={{ color: "#8c8c8c" }} />
            <span>{sentTime} ({dayjs(message.created_at).fromNow()})</span>
          </div>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid #f0f0f0", margin: 0 }} />

        {/* Read / Seen Receipts */}
        <div>
          <Title level={5} style={{ fontSize: 13, textTransform: "uppercase", color: "#8c8c8c", letterSpacing: 0.5, marginBottom: 12 }}>
            Seen By ({otherParticipants.length})
          </Title>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {otherParticipants.map((p) => {
              const lastRead = p.last_read_at;
              const isRead = lastRead && dayjs(lastRead).isAfter(dayjs(message.created_at));
              const seenFormatted = isRead
                ? `Seen ${dayjs(lastRead).fromNow()}`
                : "Delivered";

              return (
                <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar src={p.employee.profile_picture_url}>
                      {p.employee.full_name.charAt(0)}
                    </Avatar>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{p.employee.full_name}</div>
                      <div style={{ fontSize: 11, color: isRead ? "#52c41a" : "#8c8c8c" }}>
                        {seenFormatted}
                      </div>
                    </div>
                  </div>

                  <Tag color={isRead ? "blue" : "default"} icon={<CheckOutlined />}>
                    {isRead ? "Seen" : "Delivered"}
                  </Tag>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Drawer>
  );
};

export default MessageInfoModal;
