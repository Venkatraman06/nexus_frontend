import React, { useState, useEffect, useRef } from "react";
import { Modal, Button, Avatar, Tooltip } from "antd";
import {
  AudioMutedOutlined, AudioOutlined, VideoCameraOutlined,
  VideoCameraAddOutlined, PhoneOutlined, DesktopOutlined, TeamOutlined
} from "@ant-design/icons";
import { callSounds } from "@/utils/callSounds";

interface CallOverlayModalProps {
  open: boolean;
  onClose: (durationSecs?: number) => void;
  type: "VOICE" | "VIDEO";
  participantName: string;
  avatarUrl?: string | null;
  isCallAccepted?: boolean;
  acceptedAt?: string | null;
}

export const CallOverlayModal: React.FC<CallOverlayModalProps> = ({
  open,
  onClose,
  type,
  participantName,
  avatarUrl,
  isCallAccepted = false,
  acceptedAt,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(type === "VIDEO");
  const [seconds, setSeconds] = useState(0);
  const [ringingTimeoutCount, setRingingTimeoutCount] = useState(45);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (open) {
      const shouldVideoBeOn = type === "VIDEO";
      setIsVideoOn(shouldVideoBeOn);
      setIsMuted(false);
      if (!isCallAccepted) {
        setSeconds(0);
        setRingingTimeoutCount(45);
      }
      if (shouldVideoBeOn) {
        startLocalCamera();
      } else {
        stopLocalCamera();
      }
    } else {
      setIsVideoOn(false);
      setIsMuted(false);
      setSeconds(0);
      stopLocalCamera();
      callSounds.stopRingtone();
    }
  }, [open, type, isCallAccepted]);

  // 45-Second Auto-Missed-Call Timeout for ringing state
  useEffect(() => {
    if (open && !isCallAccepted) {
      callSounds.playRingback();
      const ringInterval = setInterval(() => {
        setRingingTimeoutCount((prev) => {
          if (prev <= 1) {
            clearInterval(ringInterval);
            callSounds.stopRingtone();
            callSounds.playCutSound();
            onClose(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearInterval(ringInterval);
        callSounds.stopRingtone();
      };
    }
  }, [open, isCallAccepted]);

  // Active call duration timer
  useEffect(() => {
    let timer: any;
    if (open && isCallAccepted) {
      callSounds.stopRingtone();
      const syncSeconds = () => {
        if (acceptedAt) {
          const startTime = new Date(acceptedAt).getTime();
          const nowTime = Date.now();
          const elapsed = Math.max(0, Math.floor((nowTime - startTime) / 1000));
          setSeconds(elapsed);
        } else {
          setSeconds((prev) => prev + 1);
        }
      };
      syncSeconds();
      timer = setInterval(syncSeconds, 1000);
    }
    return () => {
      clearInterval(timer);
    };
  }, [open, isCallAccepted, acceptedAt]);

  const startLocalCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("Call camera unavailable", err);
    }
  };

  const stopLocalCamera = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
  };

  const toggleVideo = () => {
    if (isVideoOn) {
      setIsVideoOn(false);
      stopLocalCamera();
    } else {
      setIsVideoOn(true);
      startLocalCamera();
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <Modal
      open={open}
      onCancel={() => {}}
      maskClosable={false}
      footer={null}
      width={680}
      centered
      styles={{
        content: { padding: 0, borderRadius: 24, overflow: "hidden", background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", boxShadow: "0 25px 60px rgba(0,0,0,0.7)" },
        body: { padding: 0, height: 500, overflow: "hidden", position: "relative" },
      }}
      closeIcon={null}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(145deg, #0f172a 0%, #1e293b 100%)",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          alignItems: "center",
          padding: "24px 20px",
        }}
      >
        {/* Call Header Info */}
        <div style={{ textAlign: "center", zIndex: 10 }}>
          <h3 style={{ margin: 0, color: "#ffffff", fontSize: 22, fontWeight: 700, letterSpacing: "-0.5px" }}>
            {participantName}
          </h3>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              marginTop: 6,
              background: "rgba(255, 255, 255, 0.08)",
              padding: "4px 14px",
              borderRadius: 20,
              fontSize: 13,
              color: "#94a3b8",
              fontWeight: 500,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: !isCallAccepted ? "#f59e0b" : "#22c55e",
                boxShadow: !isCallAccepted ? "0 0 8px #f59e0b" : "0 0 8px #22c55e",
              }}
            />
            {!isCallAccepted ? `Ringing... (${ringingTimeoutCount}s)` : formatTimer(seconds)}
          </div>
        </div>

        {/* Call Video / Visualizer Body */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            position: "relative",
            margin: "12px 0 60px 0",
          }}
        >
          {isVideoOn ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%",
                height: 250,
                maxHeight: 250,
                borderRadius: 16,
                objectFit: "cover",
                background: "#000",
                boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
              }}
            />
          ) : (
            <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
              {/* Glowing Ripple Ring */}
              <div
                style={{
                  position: "absolute",
                  inset: -20,
                  borderRadius: "50%",
                  border: "2px solid rgba(34, 197, 94, 0.4)",
                  animation: "pulse 2s infinite",
                }}
              />
              <Avatar
                size={100}
                src={avatarUrl || undefined}
                icon={<TeamOutlined />}
                style={{
                  background: "#2563eb",
                  fontSize: 44,
                  boxShadow: "0 0 40px rgba(37, 99, 235, 0.4)",
                  border: "4px solid rgba(255, 255, 255, 0.1)",
                }}
              >
                {!avatarUrl ? participantName.charAt(0).toUpperCase() : undefined}
              </Avatar>
              <div style={{ marginTop: 14, fontSize: 13, color: "#94a3b8", fontWeight: 500 }}>
                {type === "VOICE" ? "Audio HD Connected" : "Camera turned off"}
              </div>
            </div>
          )}
        </div>

        {/* Call Action Bar (Floating Absolutely at Bottom Center) */}
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
            background: "rgba(15, 23, 42, 0.95)",
            padding: "10px 24px",
            borderRadius: 40,
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            zIndex: 100,
            boxShadow: "0 10px 30px rgba(0,0,0,0.8)",
          }}
        >
          <Tooltip title={isMuted ? "Unmute Mic" : "Mute Mic"}>
            <Button
              type="default"
              shape="circle"
              size="large"
              icon={isMuted ? <AudioMutedOutlined style={{ color: "#ef4444" }} /> : <AudioOutlined style={{ color: "#fff" }} />}
              onClick={() => setIsMuted(!isMuted)}
              style={{
                width: 44,
                height: 44,
                background: isMuted ? "rgba(239, 68, 68, 0.2)" : "rgba(255,255,255,0.12)",
                border: "none",
              }}
            />
          </Tooltip>

          <Tooltip title={isVideoOn ? "Turn Camera Off" : "Turn Camera On"}>
            <Button
              type="default"
              shape="circle"
              size="large"
              icon={isVideoOn ? <VideoCameraOutlined style={{ color: "#2563eb" }} /> : <VideoCameraAddOutlined style={{ color: "#fff" }} />}
              onClick={toggleVideo}
              style={{
                width: 44,
                height: 44,
                background: isVideoOn ? "rgba(37, 99, 235, 0.2)" : "rgba(255,255,255,0.12)",
                border: "none",
              }}
            />
          </Tooltip>

          <Tooltip title="Screen Share">
            <Button
              type="default"
              shape="circle"
              size="large"
              icon={<DesktopOutlined style={{ color: "#fff" }} />}
              style={{
                width: 44,
                height: 44,
                background: "rgba(255,255,255,0.12)",
                border: "none",
              }}
            />
          </Tooltip>

          <Tooltip title="End Call">
            <Button
              type="primary"
              danger
              shape="circle"
              size="large"
              icon={<PhoneOutlined style={{ transform: "rotate(135deg)", fontSize: 18 }} />}
              onClick={() => {
                stopLocalCamera();
                onClose(seconds);
              }}
              style={{ width: 48, height: 48, background: "#ef4444", boxShadow: "0 4px 15px rgba(239, 68, 68, 0.5)" }}
            />
          </Tooltip>
        </div>
      </div>
    </Modal>
  );
};

export default CallOverlayModal;
