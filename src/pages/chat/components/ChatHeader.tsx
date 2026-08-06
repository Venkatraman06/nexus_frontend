import React from "react";
import { Avatar, Badge, Button, Dropdown, MenuProps, Tooltip } from "antd";
import {
  PhoneOutlined, VideoCameraOutlined, SearchOutlined, MoreOutlined,
  PushpinOutlined, DownloadOutlined, DeleteOutlined, InfoCircleOutlined, TeamOutlined, ProjectOutlined
} from "@ant-design/icons";
import { ConversationListItem } from "@/services/chat";
import { useThemeStore } from "@/store/theme";

interface ChatHeaderProps {
  conversation: ConversationListItem;
  myId?: string;
  isOnline: boolean;
  isPinned: boolean;
  onTogglePin: () => void;
  onStartVoiceCall: () => void;
  onStartVideoCall: () => void;
  onExportChat: () => void;
  onClearChat: () => void;
  onOpenGroupInfo: () => void;
  onToggleSearchInChat: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  conversation,
  myId,
  isOnline,
  isPinned,
  onTogglePin,
  onStartVoiceCall,
  onStartVideoCall,
  onExportChat,
  onClearChat,
  onOpenGroupInfo,
  onToggleSearchInChat,
}) => {
  const isDark = useThemeStore((s) => s.isDark);
  const otherParticipant =
    conversation.type === "DIRECT" && Array.isArray(conversation?.participants)
      ? conversation.participants.find((p) => p?.employee?.id !== myId)
      : undefined;

  const title =
    conversation.type === "GROUP"
      ? conversation.name || "Group Chat"
      : otherParticipant?.employee?.full_name ?? "Direct Message";

  const subtitle =
    conversation.type === "GROUP"
      ? `${conversation.participants?.length || 0} members`
      : isOnline
      ? "Online"
      : "Offline";

  const isProjectChat = conversation.type === "GROUP" && (conversation.name || "").startsWith("Project:");

  const menuItems: MenuProps["items"] = [
    {
      key: "pin",
      icon: <PushpinOutlined />,
      label: isPinned ? "Unpin Chat" : "Pin Chat",
      onClick: onTogglePin,
    },
    {
      key: "export",
      icon: <DownloadOutlined />,
      label: "Export Chat (.txt)",
      onClick: onExportChat,
    },
    {
      key: "clear",
      icon: <DeleteOutlined />,
      danger: true,
      label: "Clear Chat Messages",
      onClick: onClearChat,
    },
    {
      type: "divider",
    },
    {
      key: "info",
      icon: <InfoCircleOutlined />,
      label: conversation.type === "GROUP" ? "Group Info & Members" : "Contact Info",
      onClick: onOpenGroupInfo,
    },
  ];

  return (
    <div
      style={{
        height: 64,
        padding: "0 20px",
        background: isDark ? "#202c33" : "#ffffff",
        borderBottom: isDark ? "1px solid #222d34" : "1px solid #f0f0f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        zIndex: 5,
      }}
    >
      {/* Left: Avatar & Info */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }} onClick={onOpenGroupInfo}>
        <Badge dot={conversation.type === "DIRECT"} status={isOnline ? "success" : "default"} offset={[-4, 34]}>
          <Avatar
            size={42}
            src={conversation.type === "DIRECT" ? otherParticipant?.employee?.profile_picture_url : conversation.avatar_url}
            icon={conversation.type === "GROUP" ? (isProjectChat ? <ProjectOutlined /> : <TeamOutlined />) : undefined}
            style={{
              background: conversation.type === "GROUP" ? (isProjectChat ? "#52c41a" : "#722ed1") : "#1890ff",
              fontWeight: 600
            }}
          >
            {title.charAt(0).toUpperCase()}
          </Avatar>
        </Badge>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, lineHeight: 1.2, color: isDark ? "#e9edef" : "#111b21" }}>{title}</h3>
            {isPinned && <PushpinOutlined style={{ color: "#1890ff", fontSize: 13 }} />}
          </div>
          <span style={{ fontSize: 12, color: isOnline && conversation.type === "DIRECT" ? "#52c41a" : isDark ? "#8696a0" : "#8c8c8c" }}>
            {subtitle}
          </span>
        </div>
      </div>

      {/* Right: Actions Icons (Requirement 7) */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Pin Chat Toggle Icon */}
        <Tooltip title={isPinned ? "Unpin Chat" : "Pin Chat"}>
          <Button
            type={isPinned ? "primary" : "text"}
            shape="circle"
            size="middle"
            icon={<PushpinOutlined style={{ fontSize: 16, color: isPinned ? "#fff" : isDark ? "#aebac1" : "#595959" }} />}
            onClick={onTogglePin}
          />
        </Tooltip>

        {/* Voice Call Icon */}
        <Tooltip title="Voice Call">
          <Button
            type="text"
            shape="circle"
            size="middle"
            icon={<PhoneOutlined style={{ fontSize: 17, color: "#595959" }} />}
            onClick={onStartVoiceCall}
          />
        </Tooltip>

        {/* Video Call Icon */}
        <Tooltip title="Video Call">
          <Button
            type="text"
            shape="circle"
            size="middle"
            icon={<VideoCameraOutlined style={{ fontSize: 17, color: "#595959" }} />}
            onClick={onStartVideoCall}
          />
        </Tooltip>

        {/* Project / Group Info Icon */}
        <Tooltip title={conversation.type === "GROUP" ? "Project & Group Info" : "Contact Info"}>
          <Button
            type="text"
            shape="circle"
            size="middle"
            icon={isProjectChat ? <ProjectOutlined style={{ fontSize: 17, color: "#52c41a" }} /> : <InfoCircleOutlined style={{ fontSize: 17, color: "#595959" }} />}
            onClick={onOpenGroupInfo}
          />
        </Tooltip>

        {/* Search Messages Icon */}
        <Tooltip title="Search Messages">
          <Button
            type="text"
            shape="circle"
            size="middle"
            icon={<SearchOutlined style={{ fontSize: 17, color: "#595959" }} />}
            onClick={onToggleSearchInChat}
          />
        </Tooltip>

        {/* 3-Dot More Menu */}
        <Dropdown menu={{ items: menuItems }} placement="bottomRight" trigger={["click"]}>
          <Button
            type="text"
            shape="circle"
            size="middle"
            icon={<MoreOutlined style={{ fontSize: 18, color: "#595959" }} />}
          />
        </Dropdown>
      </div>
    </div>
  );
};

export default ChatHeader;
