import React, { useEffect, useState } from "react";
import { Modal, Button, Avatar } from "antd";
import { PhoneOutlined, VideoCameraOutlined, CloseOutlined, CheckOutlined } from "@ant-design/icons";
import { CallRecord } from "@/services/chat";
import { callSounds } from "@/utils/callSounds";

interface IncomingCallModalProps {
  call: CallRecord | null;
  onAccept: () => void;
  onDecline: () => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  call,
  onAccept,
  onDecline,
}) => {
  const [countdown, setCountdown] = useState(45);

  useEffect(() => {
    if (call && call.status === "RINGING") {
      callSounds.playIncomingRingtone();
      setCountdown(45);

      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            callSounds.stopRingtone();
            callSounds.playCutSound();
            onDecline();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearInterval(timer);
        callSounds.stopRingtone();
      };
    } else {
      callSounds.stopRingtone();
    }
  }, [call?._id, call?.status]);

  if (!call || call.status !== "RINGING") return null;

  const callerName = call.caller?.full_name || "Unknown User";
  const avatarUrl = call.caller?.profile_picture_url;
  const isVideo = call.call_type === "VIDEO";

  return (
    <Modal
      open={true}
      maskClosable={false}
      footer={null}
      closable={false}
      centered
      width={420}
      bodyStyle={{ padding: 0, borderRadius: 24, overflow: "hidden", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}
    >
      <div
        style={{
          background: "linear-gradient(145deg, #0f172a 0%, #1e293b 100%)",
          color: "#fff",
          padding: "40px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          position: "relative",
        }}
      >
        {/* Pulsing Avatar Container */}
        <div style={{ position: "relative", marginBottom: 24 }}>
          <div
            style={{
              position: "absolute",
              inset: -14,
              borderRadius: "50%",
              border: "2px solid #22c55e",
              animation: "pulse 1.5s infinite",
              opacity: 0.6,
            }}
          />
          <Avatar
            size={100}
            src={avatarUrl || undefined}
            style={{
              background: "#2563eb",
              fontSize: 40,
              fontWeight: 700,
              border: "4px solid rgba(255,255,255,0.1)",
              boxShadow: "0 0 30px rgba(37, 99, 235, 0.4)",
            }}
          >
            {!avatarUrl ? callerName.charAt(0).toUpperCase() : undefined}
          </Avatar>
        </div>

        <h2 style={{ color: "#fff", fontSize: 24, fontWeight: 700, margin: "0 0 6px 0", letterSpacing: "-0.5px" }}>
          {callerName}
        </h2>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(255,255,255,0.08)",
            padding: "6px 18px",
            borderRadius: 20,
            fontSize: 13,
            color: "#94a3b8",
            marginBottom: 36,
          }}
        >
          {isVideo ? <VideoCameraOutlined style={{ color: "#22c55e" }} /> : <PhoneOutlined style={{ color: "#22c55e" }} />}
          <span>Incoming {isVideo ? "Video" : "Voice"} Call... ({countdown}s)</span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: 48, width: "100%", justifyContent: "center" }}>
          {/* Decline Button */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <Button
              type="primary"
              danger
              shape="circle"
              size="large"
              icon={<CloseOutlined style={{ fontSize: 20 }} />}
              onClick={() => {
                callSounds.stopRingtone();
                callSounds.playCutSound();
                onDecline();
              }}
              style={{ width: 60, height: 60, background: "#ef4444", boxShadow: "0 4px 20px rgba(239, 68, 68, 0.4)" }}
            />
            <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>Decline</span>
          </div>

          {/* Accept Button */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <Button
              type="primary"
              shape="circle"
              size="large"
              icon={<CheckOutlined style={{ fontSize: 22 }} />}
              onClick={() => {
                callSounds.stopRingtone();
                onAccept();
              }}
              style={{ width: 60, height: 60, background: "#22c55e", borderColor: "#22c55e", boxShadow: "0 4px 20px rgba(34, 197, 94, 0.4)" }}
            />
            <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>Accept</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default IncomingCallModal;
