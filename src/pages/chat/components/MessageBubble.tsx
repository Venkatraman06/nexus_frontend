import React, { useState } from "react";
import { Avatar, Dropdown, MenuProps, Tooltip } from "antd";
import {
  CheckOutlined, PushpinOutlined, StarFilled, StarOutlined, EyeOutlined,
  DeleteOutlined, StopOutlined, MoreOutlined, RollbackOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { ChatMessage, ConversationParticipant } from "@/services/chat";
import AudioPlayer from "./AudioPlayer";
import PollWidget, { PollData } from "./PollWidget";
import LocationWidget, { LocationData } from "./LocationWidget";
import AttachmentCard from "@/components/common/AttachmentCard";
import { useThemeStore } from "@/store/theme";

dayjs.extend(relativeTime);

interface MessageBubbleProps {
  message: ChatMessage;
  myId?: string;
  isGroup: boolean;
  participants: ConversationParticipant[];
  isPinned: boolean;
  onPinMessage: (message: ChatMessage) => void;
  onStarMessage: (messageId: string) => void;
  onDeleteForMe: (messageId: string) => void;
  onDeleteForEveryone: (messageId: string) => void;
  onShowSeenInfo: (message: ChatMessage) => void;
  onVotePoll: (messageId: string, optionId: string) => void;
  onReply: (message: ChatMessage) => void;
  replyToMessage?: ChatMessage | null;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  myId,
  isGroup,
  participants = [],
  isPinned,
  onPinMessage,
  onStarMessage,
  onDeleteForMe,
  onDeleteForEveryone,
  onShowSeenInfo,
  onVotePoll,
  onReply,
  replyToMessage,
}) => {
  const isDark = useThemeStore((s) => s.isDark);
  const [isHovered, setIsHovered] = useState(false);
  const senderId = typeof message?.sender === "string" ? message.sender : message?.sender?.id;
  const isSentByMe = Boolean(
    (senderId && myId && String(senderId).toLowerCase() === String(myId).toLowerCase()) ||
    message?.sender === null ||
    message?.sender?.full_name === "You" ||
    !message?.sender
  );

  let rawBody = (message?.body || "").trim();
  let quotedText: string | null = null;
  let quotedSenderName: string | null = null;

  if (replyToMessage) {
    quotedText = replyToMessage.body;
    quotedSenderName = replyToMessage.sender?.full_name || "User";
  } else if (rawBody.startsWith("> ")) {
    const lines = rawBody.split("\n");
    const quoteLines: string[] = [];
    const restLines: string[] = [];
    let inQuote = true;
    for (const line of lines) {
      if (inQuote && (line.startsWith("> ") || line.startsWith(">"))) {
        quoteLines.push(line.replace(/^>\s*/, ""));
      } else {
        inQuote = false;
        restLines.push(line);
      }
    }
    if (quoteLines.length > 0) {
      quotedText = quoteLines.join(" ");
      quotedSenderName = "Replied Message";
      rawBody = restLines.join("\n").trim();
    }
  }

  let voiceData: { audioUrl: string; duration: number } | null = null;
  let pollData: PollData | null = null;
  let locationData: LocationData | null = null;

  if (rawBody && (rawBody.startsWith("{") || rawBody.includes("POLL") || rawBody.includes("VOICE_NOTE") || rawBody.includes("LOCATION"))) {
    try {
      const jsonStart = rawBody.indexOf("{");
      if (jsonStart !== -1) {
        const parsed = JSON.parse(rawBody.substring(jsonStart));
        if (parsed.type === "VOICE_NOTE") {
          voiceData = parsed;
        } else if (parsed.type === "POLL") {
          pollData = parsed.poll;
        } else if (parsed.type === "LOCATION") {
          locationData = parsed.location;
        }
      }
    } catch (e) {}
  }

  // Parse attachments from message.attachments, IMAGE_ATTACHMENT JSON, FILE_ATTACHMENT JSON, OR [Attachment: filename]
  const parsedAttachments = React.useMemo(() => {
    if (!message) return [];
    if (message.attachments && message.attachments.length > 0) {
      return message.attachments.map((att: any) => ({
        id: att.id || `att_${Math.random()}`,
        original_filename: att.original_filename || att.filename || "Attachment",
        content_type: att.content_type || (att.original_filename?.endsWith(".png") ? "image/png" : "application/octet-stream"),
        size_bytes: att.size_bytes || att.size || 0,
        scan_status: "CLEAN" as const,
        download_url: att.download_url || att.url || null,
        force_document: false,
      }));
    }
    if (rawBody && rawBody.includes("FILE_ATTACHMENT")) {
      try {
        const jsonStart = rawBody.indexOf("{");
        if (jsonStart !== -1) {
          const parsed = JSON.parse(rawBody.substring(jsonStart));
          if (parsed.type === "FILE_ATTACHMENT") {
            const filename = parsed.filename || "Document";
            if (parsed.file_url) {
              try {
                localStorage.setItem(`chat_file_${filename}`, parsed.file_url);
              } catch (e) {}
            }
            return [
              {
                id: `att_doc_${message.id}`,
                original_filename: filename,
                content_type: parsed.content_type || "application/octet-stream",
                size_bytes: parsed.size_bytes || 0,
                scan_status: "CLEAN" as const,
                download_url: parsed.file_url || null,
                force_document: true,
              },
            ];
          }
        }
      } catch (e) {}
    }
    if (rawBody && rawBody.includes("IMAGE_ATTACHMENT")) {
      try {
        const jsonStart = rawBody.indexOf("{");
        if (jsonStart !== -1) {
          const parsed = JSON.parse(rawBody.substring(jsonStart));
          if (parsed.type === "IMAGE_ATTACHMENT") {
            const filename = parsed.filename || "Photo.png";
            if (parsed.file_url) {
              try {
                localStorage.setItem(`chat_img_${filename}`, parsed.file_url);
              } catch (e) {}
            }
            return [
              {
                id: `att_img_${message.id}`,
                original_filename: filename,
                content_type: "image/png",
                size_bytes: parsed.size_bytes || 0,
                scan_status: "CLEAN" as const,
                download_url: parsed.file_url || null,
                force_document: false,
              },
            ];
          }
        }
      } catch (e) {}
    }
    if (rawBody && (rawBody.startsWith("[Attachment:") || rawBody.startsWith("Attachment:"))) {
      const match = rawBody.match(/\[?Attachment:\s*([^\]]+)\]?/i);
      if (match && match[1]) {
        const filename = match[1].trim();
        const ext = filename.lastIndexOf(".") !== -1 ? filename.slice(filename.lastIndexOf(".") + 1).toLowerCase() : "";
        const isImg = ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext);
        return [
          {
            id: `att_parsed_${message.id}`,
            original_filename: filename,
            content_type: isImg ? `image/${ext === "jpg" ? "jpeg" : ext}` : "application/octet-stream",
            size_bytes: 1024 * 250,
            scan_status: "CLEAN" as const,
            download_url: (message as any).download_url || (message as any).file_url || (message as any).url || null,
            force_document: false,
          },
        ];
      }
    }
    return [];
  }, [message, rawBody]);

  // Render deleted message bubble (WhatsApp style) AFTER ALL HOOKS
  if (message.is_deleted) {
    return (
      <div
        id={`msg-${message.id}`}
        style={{
          display: "flex",
          justifyContent: isSentByMe ? "flex-end" : "flex-start",
          margin: "6px 0",
          width: "100%",
        }}
      >
        <div
          style={{
            padding: "8px 14px",
            borderRadius: 12,
            background: isSentByMe ? (isDark ? "#005c4b" : "#e6f7ff") : (isDark ? "#202c33" : "#ffffff"),
            color: isDark ? "#8696a0" : "#8c8c8c",
            fontStyle: "italic",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 6,
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            border: isDark ? "1px solid #222d34" : "1px solid #e8e8e8",
          }}
        >
          <StopOutlined style={{ fontSize: 13, color: isDark ? "#8696a0" : "#8c8c8c" }} />
          <span>{isSentByMe ? "You deleted this message" : "This message was deleted"}</span>
          <span style={{ fontSize: 10, marginLeft: 8, fontStyle: "normal", opacity: 0.7 }}>
            {dayjs(message.created_at).format("h:mm A")}
          </span>
        </div>
      </div>
    );
  }
  const otherParticipants = (participants || []).filter((p) => p?.employee?.id !== myId);
  const seenCount = otherParticipants.filter(
    (p) => p?.last_read_at && dayjs(p.last_read_at).isAfter(dayjs(message.created_at))
  ).length;
  const isSeenByAll = otherParticipants.length > 0 && seenCount === otherParticipants.length;

  const contextMenuItems: MenuProps["items"] = [
    {
      key: "reply",
      label: "Reply",
      onClick: () => onReply(message),
    },
    {
      key: "pin",
      icon: <PushpinOutlined />,
      label: isPinned ? "Unpin Message" : "Pin Message",
      onClick: () => onPinMessage(message),
    },
    {
      key: "star",
      icon: message.is_starred_by_me ? <StarFilled style={{ color: "#faad14" }} /> : <StarOutlined />,
      label: message.is_starred_by_me ? "Unstar Message" : "Star Message",
      onClick: () => onStarMessage(message.id),
    },
    {
      key: "info",
      icon: <EyeOutlined />,
      label: "Seen Details",
      onClick: () => onShowSeenInfo(message),
    },
    { type: "divider" as const },
    {
      key: "delete_me",
      icon: <DeleteOutlined />,
      label: "Delete for me",
      onClick: () => onDeleteForMe(message.id),
    },
    ...(isSentByMe
      ? [
          {
            key: "delete_everyone",
            icon: <DeleteOutlined />,
            danger: true,
            label: "Delete for everyone",
            onClick: () => onDeleteForEveryone(message.id),
          },
        ]
      : []),
  ];

  return (
    <div
      id={`msg-${message.id}`}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isSentByMe ? "flex-end" : "flex-start",
        margin: "8px 0",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 8,
          maxWidth: "75%",
          flexDirection: isSentByMe ? "row-reverse" : "row",
          position: "relative",
        }}
      >
        {!isSentByMe && isGroup && (
          <Avatar
            size={32}
            src={message.sender?.profile_picture_url}
            style={{ background: "#2563eb", marginTop: 4 }}
          >
            {message.sender?.full_name?.charAt(0) || "U"}
          </Avatar>
        )}

        <Dropdown menu={{ items: contextMenuItems }} trigger={["contextMenu"]}>
          <div
            className="message-bubble-container"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
              padding: "10px 14px",
              paddingRight: isHovered ? 28 : 14,
              borderRadius: isSentByMe ? "16px 16px 2px 16px" : "16px 16px 16px 2px",
              background: isSentByMe ? (isDark ? "#005c4b" : "#2563eb") : (isDark ? "#202c33" : "#ffffff"),
              color: isSentByMe ? "#ffffff" : (isDark ? "#e9edef" : "#262626"),
              boxShadow: "0 1.5px 4px rgba(0,0,0,0.06)",
              border: isSentByMe ? "none" : isDark ? "1px solid #222d34" : "1px solid #e8e8e8",
              position: "relative",
              wordBreak: "break-word",
              transition: "padding 0.15s ease",
            }}
          >
            {/* WhatsApp Hover 3-Dots Button */}
            <Dropdown menu={{ items: contextMenuItems }} trigger={["click"]}>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                }}
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  opacity: isHovered ? 1 : 0,
                  transition: "opacity 0.15s ease, transform 0.15s ease",
                  transform: isHovered ? "scale(1)" : "scale(0.8)",
                  cursor: "pointer",
                  background: isSentByMe ? "rgba(0, 0, 0, 0.15)" : "rgba(0, 0, 0, 0.06)",
                  borderRadius: "50%",
                  width: 22,
                  height: 22,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 10,
                }}
              >
                <MoreOutlined style={{ color: isSentByMe ? "#ffffff" : "#595959", fontSize: 13 }} />
              </div>
            </Dropdown>

            {/* Sender Name in Group */}
            {!isSentByMe && isGroup && message.sender && (
              <div style={{ fontSize: 11, fontWeight: 700, color: "#1890ff", marginBottom: 4 }}>
                {message.sender.full_name}
              </div>
            )}

            {/* Pinned Indicator Badge */}
            {isPinned && (
              <div style={{ fontSize: 10, opacity: 0.8, display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                <PushpinOutlined /> Pinned
              </div>
            )}

            {/* WhatsApp / Instagram Replied Message Quote Card */}
            {(quotedText || replyToMessage) && (
              <div
                style={{
                  padding: "6px 10px",
                  marginBottom: 6,
                  borderRadius: 8,
                  background: isSentByMe ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.05)",
                  borderLeft: `4px solid ${isSentByMe ? "#ffffff" : "#1890ff"}`,
                  fontSize: 12,
                }}
              >
                <div style={{ fontWeight: 700, opacity: 0.9, marginBottom: 2 }}>
                  {quotedSenderName || replyToMessage?.sender?.full_name || "User"}
                </div>
                <div style={{ opacity: 0.85, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {(() => {
                    let textToDisplay = (quotedText || replyToMessage?.body || "").trim();
                    textToDisplay = textToDisplay.replace(/^>\s*/, "").trim();

                    if (textToDisplay.includes("POLL")) {
                      try {
                        const jsonStart = textToDisplay.indexOf("{");
                        if (jsonStart !== -1) {
                          const parsed = JSON.parse(textToDisplay.substring(jsonStart));
                          return `📊 Poll: ${parsed.poll?.question || ""}`;
                        }
                      } catch (e) {}
                      return "📊 Poll";
                    }
                    if (textToDisplay.includes("VOICE_NOTE")) return "🎙️ Voice Message";
                    if (textToDisplay.includes("LOCATION")) return "📍 Shared Location";
                    return textToDisplay;
                  })()}
                </div>
              </div>
            )}

            {/* Content Types */}
            {voiceData ? (
              <AudioPlayer src={voiceData.audioUrl} durationText={`${voiceData.duration}s`} isSentByMe={isSentByMe} />
            ) : pollData ? (
              <PollWidget
                poll={pollData}
                currentUserId={myId}
                onVote={(pollId, optionId) => onVotePoll(message.id, optionId)}
                isSentByMe={isSentByMe}
              />
            ) : locationData ? (
              <LocationWidget location={locationData} isSentByMe={isSentByMe} />
            ) : (
              <div>
                {rawBody && parsedAttachments.length === 0 && (
                  <div style={{ fontSize: 14, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>
                    {rawBody}
                  </div>
                )}
              </div>
            )}

            {/* Message Attachments (Files, Images) */}
            {parsedAttachments.length > 0 && (
              <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 6 }}>
                {parsedAttachments.map((att: any) => (
                  <AttachmentCard key={att.id} attachment={att} mine={isSentByMe} forceDocumentView={att.force_document} />
                ))}
              </div>
            )}

            {/* Bottom Info: Time & Seen Receipts */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 4,
                marginTop: 4,
                fontSize: 10,
                opacity: isSentByMe ? 0.85 : 0.6,
                cursor: "pointer",
              }}
              onClick={() => onShowSeenInfo(message)}
            >
              {message.is_starred_by_me && <StarFilled style={{ color: "#faad14", fontSize: 10 }} />}
              <span>{dayjs(message.created_at).format("h:mm A")}</span>

              {isSentByMe && (
                <Tooltip title={isSeenByAll ? "Seen by everyone" : `Seen by ${seenCount}/${otherParticipants.length}`}>
                  <span style={{ display: "inline-flex", marginLeft: 2 }}>
                    {/* WhatsApp style double tick */}
                    <CheckOutlined style={{ fontSize: 11, color: isSeenByAll ? "#52c41a" : "inherit" }} />
                    <CheckOutlined style={{ fontSize: 11, marginLeft: -5, color: isSeenByAll ? "#52c41a" : "inherit" }} />
                  </span>
                </Tooltip>
              )}
            </div>
          </div>
        </Dropdown>
      </div>
    </div>
  );
};

export default MessageBubble;
