import React, { useState, useRef, useEffect } from "react";
import { Button, Input, Dropdown, MenuProps, Popover, Tooltip, Upload } from "antd";
import {
  SendOutlined, PaperClipOutlined, CameraOutlined, AudioOutlined,
  SmileOutlined, PictureOutlined, FileTextOutlined, BarChartOutlined, EnvironmentOutlined, CloseOutlined
} from "@ant-design/icons";
import { ChatMessage } from "@/services/chat";
import { VoiceRecorder } from "./VoiceRecorder";
import { PollModal } from "./PollModal";
import { LocationModal } from "./LocationModal";
import { CameraModal } from "./CameraModal";
import { useThemeStore } from "@/store/theme";

interface ChatInputBarProps {
  onSendMessage: (text: string) => void;
  onSendVoiceNote: (audioBlob: Blob, duration: number) => void;
  onSendAttachment: (file: File, kind?: "image" | "document") => void;
  onCreatePoll: (pollData: { question: string; options: string[]; allowMultiple: boolean }) => void;
  onShareLocation: (locationData: { title: string; address: string; lat: number; lng: number }) => void;
  replyingMessage?: ChatMessage | null;
  onCancelReply?: () => void;
}

const COMMON_EMOJIS = ["👍", "❤️", "😊", "🔥", "🎉", "🙏", "✅", "🙌", "😂", "🚀", "💡", "💯"];

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
  onSendMessage,
  onSendVoiceNote,
  onSendAttachment,
  onCreatePoll,
  onShareLocation,
  replyingMessage,
  onCancelReply,
}) => {
  const isDark = useThemeStore((s) => s.isDark);
  const [text, setText] = useState("");
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [pollModalOpen, setPollModalOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const inputRef = useRef<any>(null);
  const replyTimeRef = useRef<number>(0);

  useEffect(() => {
    if (replyingMessage) {
      replyTimeRef.current = Date.now();
      setTimeout(() => {
        inputRef.current?.focus();
      }, 80);
    }
  }, [replyingMessage]);

  const handleSend = () => {
    if (!text || !text.trim()) return;
    onSendMessage(text.trim());
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (Date.now() - replyTimeRef.current < 350) {
        return;
      }
      handleSend();
    }
  };

  const attachmentMenuItems: MenuProps["items"] = [
    {
      key: "image",
      icon: <PictureOutlined style={{ color: "#2f54eb", fontSize: 18 }} />,
      label: "Image / Photos",
      onClick: () => imageInputRef.current?.click(),
    },
    {
      key: "document",
      icon: <FileTextOutlined style={{ color: "#722ed1", fontSize: 18 }} />,
      label: "Document / File",
      onClick: () => fileInputRef.current?.click(),
    },
    {
      key: "poll",
      icon: <BarChartOutlined style={{ color: "#fa8c16", fontSize: 18 }} />,
      label: "Create Poll",
      onClick: () => setPollModalOpen(true),
    },
    {
      key: "location",
      icon: <EnvironmentOutlined style={{ color: "#ff4d4f", fontSize: 18 }} />,
      label: "Share Location",
      onClick: () => setLocationModalOpen(true),
    },
  ];

  const emojiContent = (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, padding: 8, fontSize: 22 }}>
      {COMMON_EMOJIS.map((emoji) => (
        <span
          key={emoji}
          onClick={() => setText((prev) => prev + emoji)}
          style={{ cursor: "pointer", textAlign: "center", padding: 4, borderRadius: 6 }}
          className="emoji-hover"
        >
          {emoji}
        </span>
      ))}
    </div>
  );

  return (
    <div
      style={{
        padding: "12px 16px",
        background: isDark ? "#202c33" : "#ffffff",
        borderTop: isDark ? "1px solid #222d34" : "1px solid #f0f0f0",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        zIndex: 5,
      }}
    >
      {replyingMessage && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 12px",
            background: isDark ? "#182229" : "#e6f7ff",
            borderLeft: "4px solid #1890ff",
            borderRadius: 8,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1890ff" }}>
              Replying to {replyingMessage.sender?.full_name || "User"}
            </div>
            <div style={{ fontSize: 12, color: isDark ? "#e9edef" : "#595959", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {(() => {
                let textToDisplay = (replyingMessage.body || "").trim();
                while (textToDisplay.startsWith(">")) {
                  textToDisplay = textToDisplay.replace(/^>\s*/, "").trim();
                }
                if (textToDisplay.includes("FILE_ATTACHMENT") || textToDisplay.includes("IMAGE_ATTACHMENT") || textToDisplay.includes("file_url")) {
                  try {
                    const jsonStart = textToDisplay.indexOf("{");
                    if (jsonStart !== -1) {
                      const parsed = JSON.parse(textToDisplay.substring(jsonStart));
                      if (parsed.type === "IMAGE_ATTACHMENT") return `🖼️ Photo: ${parsed.filename || "Image"}`;
                      if (parsed.type === "FILE_ATTACHMENT") return `📄 Document: ${parsed.filename || "File"}`;
                    }
                  } catch (e) {}
                  if (textToDisplay.includes("IMAGE_ATTACHMENT")) return "🖼️ Photo";
                  if (textToDisplay.includes("FILE_ATTACHMENT")) return "📄 Document";
                }
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
                return textToDisplay.length > 120 ? textToDisplay.substring(0, 120) + "…" : textToDisplay;
              })()}
            </div>
          </div>
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined style={{ color: isDark ? "#aebac1" : "#8c8c8c" }} />}
            onClick={onCancelReply}
          />
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={imageInputRef}
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            onSendAttachment(e.target.files[0], "image");
            e.target.value = "";
          }
        }}
      />
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            onSendAttachment(e.target.files[0], "document");
            e.target.value = "";
          }
        }}
      />

      {isRecordingVoice ? (
        <VoiceRecorder
          onSendVoiceNote={(blob, duration) => {
            onSendVoiceNote(blob, duration);
            setIsRecordingVoice(false);
          }}
          onCancel={() => setIsRecordingVoice(false)}
        />
      ) : (
        <>
          {/* Emoji Picker */}
          <Popover content={emojiContent} trigger="click" placement="top">
            <Button
              type="text"
              shape="circle"
              size="large"
              icon={<SmileOutlined style={{ fontSize: 20, color: isDark ? "#aebac1" : "#595959" }} />}
            />
          </Popover>

          {/* Attachment Pin Dropdown */}
          <Dropdown menu={{ items: attachmentMenuItems }} placement="top" trigger={["click"]}>
            <Tooltip title="Attach (Image, Doc, Poll, Location)">
              <Button
                type="text"
                shape="circle"
                size="large"
                icon={<PaperClipOutlined style={{ fontSize: 20, color: isDark ? "#aebac1" : "#595959" }} />}
              />
            </Tooltip>
          </Dropdown>

          {/* Camera Button */}
          <Tooltip title="Camera Snapshot">
            <Button
              type="text"
              shape="circle"
              size="large"
              icon={<CameraOutlined style={{ fontSize: 20, color: isDark ? "#aebac1" : "#595959" }} />}
              onClick={() => setCameraModalOpen(true)}
            />
          </Tooltip>

          {/* Textarea Input */}
          <Input.TextArea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={replyingMessage ? "Type a reply..." : "Type a message..."}
            autoSize={{ minRows: 1, maxRows: 4 }}
            style={{
              flex: 1,
              borderRadius: 20,
              padding: "8px 16px",
              fontSize: 14,
              border: isDark ? "1px solid #2a3942" : "1px solid #d9d9d9",
              background: isDark ? "#2a3942" : "#ffffff",
              color: isDark ? "#e9edef" : "#111b21",
            }}
          />

          {/* Mic OR Send Button */}
          {text.trim() ? (
            <Button
              type="primary"
              shape="circle"
              size="large"
              icon={<SendOutlined />}
              onClick={handleSend}
            />
          ) : (
            <Tooltip title="Record Voice Message">
              <Button
                type="text"
                shape="circle"
                size="large"
                icon={<AudioOutlined style={{ fontSize: 20, color: "#1890ff" }} />}
                onClick={() => setIsRecordingVoice(true)}
              />
            </Tooltip>
          )}
        </>
      )}
      </div>

      {/* Modals */}
      <PollModal
        open={pollModalOpen}
        onClose={() => setPollModalOpen(false)}
        onCreatePoll={onCreatePoll}
      />
      <LocationModal
        open={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        onShareLocation={onShareLocation}
      />
      <CameraModal
        open={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onCapturePhoto={onSendAttachment}
      />
    </div>
  );
};

export default ChatInputBar;
