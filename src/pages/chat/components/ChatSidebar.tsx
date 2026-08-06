import React, { useState, useEffect } from "react";
import {
  Avatar, Badge, Button, Dropdown, Input, MenuProps, Tooltip, Typography
} from "antd";
import {
  SearchOutlined, PlusOutlined, PushpinOutlined, TeamOutlined,
  ProjectOutlined, PhoneOutlined, VideoCameraOutlined, ArrowUpOutlined,
  ArrowDownOutlined, MoreOutlined, ClearOutlined, DeleteOutlined, MessageOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { ConversationListItem, CallRecord } from "@/services/chat";
import { useThemeStore } from "@/store/theme";

dayjs.extend(relativeTime);

export type ChatFilterType = "all" | "unread" | "groups" | "projects" | "pinned" | "calls";

interface ChatSidebarProps {
  conversations: ConversationListItem[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onOpenNewChatModal: () => void;
  myId?: string;
  onlineEmployeeIds: Set<string>;
  pinnedConversationIds: string[];
  onTogglePinConversation?: (id: string) => void;
  onClearChat?: (id: string) => void;
  callHistory?: CallRecord[];
  onStartCall?: (recipientId: string, callType: "VOICE" | "VIDEO") => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onOpenNewChatModal,
  myId,
  onlineEmployeeIds,
  pinnedConversationIds,
  onTogglePinConversation,
  onClearChat,
  callHistory = [],
  onStartCall,
}) => {
  const isDark = useThemeStore((s) => s.isDark);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ChatFilterType>("all");

  const getTitle = (c: ConversationListItem) => {
    if (c.type === "GROUP") return c.name || "Group Chat";
    const other = Array.isArray(c?.participants) ? c.participants.find((p) => p.employee?.id !== myId) : undefined;
    return other?.employee?.full_name ?? "Direct Message";
  };

  const getOtherParticipant = (c: ConversationListItem) => {
    return Array.isArray(c?.participants) ? c.participants.find((p) => p.employee?.id !== myId) : undefined;
  };

  const isOnline = (c: ConversationListItem) => {
    if (c.type === "GROUP") return false;
    const other = getOtherParticipant(c);
    return (other && other.employee?.id) ? onlineEmployeeIds.has(other.employee.id) : false;
  };

  const getConversationTime = (c: ConversationListItem) => {
    if (c.last_message_preview?.created_at) {
      return new Date(c.last_message_preview.created_at).getTime();
    }
    if (c.last_message_at) {
      return new Date(c.last_message_at).getTime();
    }
    return 0;
  };

  const uniqueConversations = React.useMemo(() => {
    const seen = new Set<string>();
    const list: ConversationListItem[] = [];

    const sorted = [...(conversations || [])].sort((a, b) => {
      const aIsUuid = a.id && !a.id.startsWith("direct_") && !a.id.startsWith("group_") && !a.id.startsWith("project_");
      const bIsUuid = b.id && !b.id.startsWith("direct_") && !b.id.startsWith("group_") && !b.id.startsWith("project_");
      if (aIsUuid && !bIsUuid) return -1;
      if (!aIsUuid && bIsUuid) return 1;
      return 0;
    });

    sorted.forEach((c) => {
      if (!c || !c.id) return;
      let key = "";
      if (c.type === "GROUP") {
        const title = getTitle(c).trim().toLowerCase();
        key = `group_${title}`;
      } else {
        const other = getOtherParticipant(c);
        const otherId = other?.employee?.id || c.id;
        key = `direct_${otherId}`;
      }
      if (!seen.has(key)) {
        seen.add(key);
        list.push(c);
      }
    });
    return list;
  }, [conversations, myId]);

  const filteredConversations = uniqueConversations.filter((c) => {
    const title = getTitle(c).toLowerCase();
    const matchesSearch = title.includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (filter === "unread") return c.unread_count > 0;
    if (filter === "groups") return c.type === "GROUP" && !(c.name || "").startsWith("Project:");
    if (filter === "projects") return c.type === "GROUP" && (c.name || "").startsWith("Project:");
    if (filter === "pinned") return pinnedConversationIds.includes(c.id);
    return true;
  }).sort((a, b) => getConversationTime(b) - getConversationTime(a));

  const pinnedList = filteredConversations.filter((c) => pinnedConversationIds.includes(c.id));
  const regularList = filteredConversations.filter((c) => !pinnedConversationIds.includes(c.id));
  
  const [lastSeenCallsTime, setLastSeenCallsTime] = useState<number>(() => {
    if (!myId) return Date.now();
    const stored = localStorage.getItem(`chat_${myId}_last_seen_calls`);
    return stored ? parseInt(stored, 10) : Date.now();
  });

  const markCallsAsSeen = () => {
    const now = Date.now();
    setLastSeenCallsTime(now);
    if (myId) {
      localStorage.setItem(`chat_${myId}_last_seen_calls`, String(now));
    }
  };

  useEffect(() => {
    if (filter === "calls") {
      markCallsAsSeen();
    }
  }, [filter]);

  const unreadMissedCallsCount = React.useMemo(() => {
    if (!Array.isArray(callHistory)) return 0;
    return callHistory.filter((c) => {
      const isOutgoing = c.caller_id === myId;
      const isMissed = c.status === "MISSED" || c.status === "DECLINED" || (!c.duration_seconds && c.status !== "ACCEPTED");
      const createdTime = new Date(c.created_at).getTime();
      return !isOutgoing && isMissed && createdTime > lastSeenCallsTime;
    }).length;
  }, [callHistory, myId, lastSeenCallsTime]);

  const filterTabs: Array<{ id: ChatFilterType; label: string; icon?: React.ReactNode }> = [
    { id: "all", label: "All" },
    { id: "unread", label: "Unread" },
    { id: "groups", label: "Groups" },
    { id: "projects", label: "Projects" },
    { id: "pinned", label: "Pinned", icon: <PushpinOutlined /> },
  ];

  return (
    <div
      style={{
        width: 340,
        minWidth: 340,
        height: "100%",
        background: isDark ? "#111b21" : "#ffffff",
        borderRight: isDark ? "1px solid #222d34" : "1px solid #f0f0f0",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          padding: "14px 16px 10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: isDark ? "1px solid #222d34" : "1px solid #f5f5f5",
        }}
      >
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: isDark ? "#e9edef" : "#1f1f1f" }}>
          Chats
        </h2>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Header Call History Button with Badge */}
          <Tooltip title="Call History">
            <Badge count={unreadMissedCallsCount} overflowCount={99} size="small" offset={[-2, 2]}>
              <Button
                type={filter === "calls" ? "primary" : "default"}
                shape="circle"
                icon={<PhoneOutlined />}
                onClick={() => {
                  if (filter === "calls") {
                    setFilter("all");
                  } else {
                    setFilter("calls");
                    markCallsAsSeen();
                  }
                }}
                style={{
                  background: filter === "calls" ? "#2563eb" : isDark ? "#202c33" : "#f5f7fa",
                  borderColor: filter === "calls" ? "#2563eb" : isDark ? "#222d34" : "#e8ecef",
                  color: filter === "calls" ? "#fff" : isDark ? "#e9edef" : "#595959",
                  boxShadow: filter === "calls" ? "0 2px 6px rgba(37, 99, 235, 0.25)" : "none",
                }}
              />
            </Badge>
          </Tooltip>

          {/* New Chat Button */}
          <Tooltip title="New Chat (Staff, Group, Project)">
            <Button
              type="primary"
              shape="circle"
              icon={<PlusOutlined />}
              onClick={onOpenNewChatModal}
              style={{ boxShadow: "0 2px 6px rgba(24, 144, 255, 0.3)" }}
            />
          </Tooltip>
        </div>
      </div>

      {/* Search Input */}
      <div style={{ padding: "10px 16px 8px 16px" }}>
        <Input
          prefix={<SearchOutlined style={{ color: isDark ? "#8696a0" : "#bfbfbf" }} />}
          placeholder="Search chats, calls..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ borderRadius: 20, background: isDark ? "#202c33" : "#f5f7fa", border: isDark ? "1px solid #222d34" : "1px solid #e8ecef", color: isDark ? "#e9edef" : "#111b21" }}
        />
      </div>

      {/* Modern Quick Action Filter Pill Bar (Styling Requirement 7) */}
      <div
        style={{
          padding: "0 12px 10px 12px",
          display: "flex",
          gap: 6,
          overflowX: "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {filterTabs.map((tab) => {
          const isActive = filter === tab.id;
          const showBadge = tab.id === "calls" && unreadMissedCallsCount > 0;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setFilter(tab.id);
                if (tab.id === "calls") markCallsAsSeen();
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 12px",
                borderRadius: 20,
                border: "none",
                fontSize: 12,
                fontWeight: isActive ? 600 : 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.2s ease",
                background: isActive ? "#2563eb" : isDark ? "#202c33" : "#f0f2f5",
                color: isActive ? "#ffffff" : isDark ? "#aebac1" : "#595959",
                boxShadow: isActive ? "0 2px 6px rgba(37, 99, 235, 0.25)" : "none",
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {showBadge && (
                <span
                  style={{
                    background: isActive ? "#ffffff" : "#ef4444",
                    color: isActive ? "#2563eb" : "#ffffff",
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "1px 6px",
                    borderRadius: 10,
                    minWidth: 16,
                    textAlign: "center",
                    lineHeight: "14px",
                  }}
                >
                  {unreadMissedCallsCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content List: Calls History OR Conversations */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 8px" }}>
        {filter === "calls" ? (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: isDark ? "#8696a0" : "#8c8c8c", padding: "6px 8px", textTransform: "uppercase" }}>
              Call History
            </div>
            {callHistory.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 16px", color: isDark ? "#8696a0" : "#8c8c8c" }}>
                No call history yet
              </div>
            ) : (
              callHistory.map((call) => renderCallItem(call))
            )}
          </div>
        ) : (
          <>
            {/* Pinned Section */}
            {pinnedList.length > 0 && filter !== "pinned" && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: isDark ? "#8696a0" : "#8c8c8c", padding: "6px 8px", textTransform: "uppercase" }}>
                  <PushpinOutlined style={{ color: "#1890ff" }} /> Pinned Chats
                </div>
                {pinnedList.map((c) => (
                  <ChatItemRow
                    key={c.id}
                    conversation={c}
                    isActive={c.id === activeConversationId}
                    title={getTitle(c)}
                    other={getOtherParticipant(c)}
                    online={isOnline(c)}
                    isPinned={true}
                    onSelect={() => onSelectConversation(c.id)}
                    onTogglePin={() => onTogglePinConversation?.(c.id)}
                    onClearChat={() => onClearChat?.(c.id)}
                  />
                ))}
              </div>
            )}

            {/* Regular Section */}
            {regularList.length > 0 && (
              <div>
                {pinnedList.length > 0 && filter !== "pinned" && (
                  <div style={{ fontSize: 11, fontWeight: 700, color: isDark ? "#8696a0" : "#8c8c8c", padding: "6px 8px", textTransform: "uppercase" }}>
                    All Messages
                  </div>
                )}
                {regularList.map((c) => (
                  <ChatItemRow
                    key={c.id}
                    conversation={c}
                    isActive={c.id === activeConversationId}
                    title={getTitle(c)}
                    other={getOtherParticipant(c)}
                    online={isOnline(c)}
                    isPinned={false}
                    onSelect={() => onSelectConversation(c.id)}
                    onTogglePin={() => onTogglePinConversation?.(c.id)}
                    onClearChat={() => onClearChat?.(c.id)}
                  />
                ))}
              </div>
            )}

            {filteredConversations.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 16px", color: "#8c8c8c" }}>
                No conversations found
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  function renderCallItem(call: CallRecord) {
    const isOutgoing = call.caller_id === myId;
    const peer = isOutgoing ? call.recipient : call.caller;
    const name = peer?.full_name || (isOutgoing ? "Recipient" : "Caller");
    const avatar = peer?.profile_picture_url;
    const isVideo = call.call_type === "VIDEO";
    const isMissed = call.status === "MISSED" || call.status === "DECLINED" || (!call.duration_seconds && call.status !== "ACCEPTED");

    const formatDuration = (secs: number) => {
      if (!secs) return "Missed";
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return `${m}:${s < 10 ? "0" : ""}${s}`;
    };

    return (
      <div
        key={call._id}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 12px",
          borderRadius: 12,
          marginBottom: 4,
          background: "#fafafa",
          border: "1px solid #f0f0f0",
        }}
      >
        <Avatar size={42} src={avatar || undefined} style={{ background: "#00a884", fontWeight: 600 }}>
          {!avatar ? (name ? String(name).charAt(0).toUpperCase() : "C") : undefined}
        </Avatar>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {name}
            </span>
            <span style={{ fontSize: 11, color: "#8c8c8c" }}>
              {dayjs(call.created_at).format("MMM D, h:mm A")}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
            {isOutgoing ? (
              <ArrowUpOutlined style={{ color: isMissed ? "#ff4d4f" : "#52c41a", fontSize: 11 }} />
            ) : (
              <ArrowDownOutlined style={{ color: isMissed ? "#ff4d4f" : "#52c41a", fontSize: 11 }} />
            )}
            <span style={{ fontSize: 12, color: isMissed ? "#ff4d4f" : "#595959", fontWeight: isMissed ? 600 : 400 }}>
              {isVideo ? "Video Call" : "Voice Call"} ({formatDuration(call.duration_seconds)})
            </span>
          </div>
        </div>

        {peer?.id && onStartCall && (
          <Tooltip title={`Call ${name}`}>
            <Button
              type="text"
              shape="circle"
              icon={isVideo ? <VideoCameraOutlined style={{ color: "#00a884" }} /> : <PhoneOutlined style={{ color: "#00a884" }} />}
              onClick={() => onStartCall(peer.id, call.call_type)}
            />
          </Tooltip>
        )}
      </div>
    );
  }
};

interface ChatItemRowProps {
  conversation: ConversationListItem;
  isActive: boolean;
  title: string;
  other?: any;
  online: boolean;
  isPinned: boolean;
  onSelect: () => void;
  onTogglePin?: () => void;
  onClearChat?: () => void;
}

const ChatItemRow: React.FC<ChatItemRowProps> = ({
  conversation,
  isActive,
  title,
  other,
  online,
  isPinned,
  onSelect,
  onTogglePin,
  onClearChat,
}) => {
  const isDark = useThemeStore((s) => s.isDark);
  const [isHovered, setIsHovered] = useState(false);

  let lastMsgText = conversation.last_message_preview?.body || "No messages yet";
  const rawTrimmed = lastMsgText.trim();
  if (rawTrimmed.includes("FILE_ATTACHMENT")) {
    try {
      const parsed = JSON.parse(rawTrimmed);
      lastMsgText = "📄 Document: " + (parsed.filename || "File");
    } catch (e) {
      lastMsgText = "📄 Document";
    }
  } else if (rawTrimmed.includes("IMAGE_ATTACHMENT")) {
    try {
      const parsed = JSON.parse(rawTrimmed);
      lastMsgText = "🖼️ Photo: " + (parsed.filename || "Image");
    } catch (e) {
      lastMsgText = "🖼️ Photo";
    }
  } else if (rawTrimmed.includes("VOICE_NOTE") || rawTrimmed.includes("audio_url")) {
    lastMsgText = "🎤 Voice Message";
  } else if (rawTrimmed.includes("LOCATION") || rawTrimmed.includes("latitude")) {
    lastMsgText = "📍 Shared Location";
  } else if (rawTrimmed.includes("POLL") || rawTrimmed.includes("question")) {
    try {
      const parsed = JSON.parse(rawTrimmed);
      lastMsgText = "📊 Poll: " + (parsed.poll?.question || "Poll");
    } catch (e) {
      lastMsgText = "📊 Poll";
    }
  } else if (rawTrimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(rawTrimmed);
      if (parsed.type === "FILE_ATTACHMENT") lastMsgText = "📄 Document: " + (parsed.filename || "");
      else if (parsed.type === "IMAGE_ATTACHMENT") lastMsgText = "🖼️ Photo: " + (parsed.filename || "");
      else if (parsed.type === "VOICE_NOTE") lastMsgText = "🎤 Voice Message";
      else if (parsed.type === "POLL") lastMsgText = "📊 Poll: " + (parsed.poll?.question || "");
      else if (parsed.type === "LOCATION") lastMsgText = "📍 Shared Location";
    } catch (e) {}
  }

  const formattedTime = conversation.last_message_preview?.created_at
    ? dayjs(conversation.last_message_preview.created_at).format("h:mm A")
    : "";

  const menuItems: MenuProps["items"] = [
    {
      key: "pin",
      icon: <PushpinOutlined />,
      label: isPinned ? "Unpin Chat" : "Pin Chat",
      onClick: (e) => {
        e.domEvent.stopPropagation();
        onTogglePin?.();
      },
    },
    {
      key: "clear",
      icon: <ClearOutlined />,
      danger: true,
      label: "Clear Chat",
      onClick: (e) => {
        e.domEvent.stopPropagation();
        onClearChat?.();
      },
    },
  ];

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onSelect}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 12px",
        borderRadius: 12,
        cursor: "pointer",
        marginBottom: 4,
        background: isActive ? (isDark ? "#2a3942" : "#e6f7ff") : isHovered ? (isDark ? "#202c33" : "#f5f7fa") : "transparent",
        borderLeft: isActive ? "3px solid #1890ff" : "3px solid transparent",
        transition: "all 0.15s ease",
        position: "relative",
      }}
    >
      <Badge dot={conversation.type === "DIRECT"} status={online ? "success" : "default"} offset={[-2, 32]}>
        <Avatar
          size={42}
          src={conversation.type === "DIRECT" ? other?.employee?.profile_picture_url : conversation.avatar_url}
          icon={
            conversation.type === "GROUP" ? (
              (conversation.name || "").startsWith("Project:") ? (
                <ProjectOutlined />
              ) : (
                <TeamOutlined />
              )
            ) : undefined
          }
          style={{
            background: conversation.type === "GROUP" ? ((conversation.name || "").startsWith("Project:") ? "#52c41a" : "#722ed1") : "#1890ff",
            fontWeight: 600,
          }}
        >
          {title ? String(title).charAt(0).toUpperCase() : "C"}
        </Avatar>
      </Badge>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
          <span style={{ fontWeight: isActive ? 700 : 600, fontSize: 14, color: isDark ? "#e9edef" : "#111b21", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {title}
          </span>
          <span style={{ fontSize: 11, color: isDark ? "#8696a0" : "#8c8c8c" }}>{formattedTime}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span
            style={{
              fontSize: 12,
              color: conversation.unread_count > 0 ? (isDark ? "#e9edef" : "#262626") : (isDark ? "#8696a0" : "#8c8c8c"),
              fontWeight: conversation.unread_count > 0 ? 600 : 400,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: isHovered ? 140 : 170,
            }}
          >
            {lastMsgText}
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: 4 }} onClick={(e) => e.stopPropagation()}>
            {(!isActive && conversation.unread_count > 0) && (
              <Badge count={conversation.unread_count} style={{ backgroundColor: "#1890ff" }} />
            )}
            {isPinned && <PushpinOutlined style={{ fontSize: 12, color: "#1890ff" }} />}
            
            {/* Requirement 10: Hover 3-dot dropdown menu */}
            {isHovered && (
              <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
                <Button
                  type="text"
                  size="small"
                  shape="circle"
                  icon={<MoreOutlined style={{ fontSize: 14, color: "#595959" }} />}
                  style={{ marginLeft: 4 }}
                />
              </Dropdown>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatSidebar;
