import React, { useState, useRef, useEffect } from "react";
import { Button, message as toast } from "antd";
import { AudioOutlined, DeleteOutlined, SendOutlined, StopOutlined } from "@ant-design/icons";

interface VoiceRecorderProps {
  onSendVoiceNote: (audioBlob: Blob, durationSeconds: number) => void;
  onCancel: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSendVoiceNote, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    let active = true;

    const startRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          setRecordedBlob(audioBlob);
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start(200);
        setIsRecording(true);
        startTimeRef.current = Date.now();
        setSeconds(0);

        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          const elapsedSecs = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setSeconds(elapsedSecs);
        }, 1000);
      } catch (err) {
        toast.error("Microphone access denied or unavailable");
        onCancel();
      }
    };

    startRecording();

    return () => {
      active = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleSend = () => {
    stopRecording();
    const finalSecs = Math.max(1, seconds);
    setTimeout(() => {
      if (recordedBlob) {
        onSendVoiceNote(recordedBlob, finalSecs);
      } else if (audioChunksRef.current.length > 0) {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        onSendVoiceNote(audioBlob, finalSecs);
      } else {
        toast.warning("Voice recording is empty");
        onCancel();
      }
    }, 150);
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        padding: "8px 16px",
        background: "rgba(37, 99, 235, 0.08)",
        borderRadius: 24,
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: isRecording ? "#ff4d4f" : "#2563eb",
            boxShadow: isRecording ? "0 0 8px #ff4d4f" : "none",
          }}
        />
        <span style={{ fontWeight: 700, fontFamily: "monospace", fontSize: 15, color: "#ff4d4f" }}>
          {formatTimer(seconds)}
        </span>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
        {Array.from({ length: 18 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 3,
              height: isRecording ? Math.floor(Math.sin(i + seconds * 1.5) * 10 + 14) : 8,
              background: "#2563eb",
              borderRadius: 2,
              transition: "height 0.25s ease",
            }}
          />
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Button
          type="text"
          danger
          shape="circle"
          icon={<DeleteOutlined style={{ fontSize: 18 }} />}
          onClick={() => {
            stopRecording();
            onCancel();
          }}
        />

        {isRecording && (
          <Button
            type="primary"
            shape="circle"
            icon={<StopOutlined />}
            onClick={stopRecording}
            style={{ background: "#fa8c16", borderColor: "#fa8c16" }}
          />
        )}

        <Button
          type="primary"
          shape="circle"
          icon={<SendOutlined />}
          onClick={handleSend}
          style={{ background: "#2563eb" }}
        />
      </div>
    </div>
  );
};

export default VoiceRecorder;
