import React, { useState, useRef, useEffect } from "react";
import { Modal, Button, message as toast } from "antd";
import { CameraOutlined, RedoOutlined, CheckOutlined } from "@ant-design/icons";

interface CameraModalProps {
  open: boolean;
  onClose: () => void;
  onCapturePhoto: (file: File) => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({ open, onClose, onCapturePhoto }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [open]);

  const startCamera = async () => {
    try {
      setCapturedImage(null);
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
    } catch (err) {
      toast.error("Camera access denied or unequipped");
      onClose();
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const takeSnapshot = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setCapturedImage(dataUrl);
      }
    }
  };

  const handleSendPhoto = () => {
    if (canvasRef.current && capturedImage) {
      canvasRef.current.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `camera_photo_${Date.now()}.jpg`, { type: "image/jpeg" });
          onCapturePhoto(file);
          onClose();
        }
      }, "image/jpeg");
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CameraOutlined style={{ color: "#1890ff" }} />
          <span>Camera Snapshot</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={640}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div
          style={{
            width: "100%",
            height: 380,
            background: "#000",
            borderRadius: 12,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {!capturedImage ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <img
              src={capturedImage}
              alt="Snapshot"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          )}

          <canvas ref={canvasRef} style={{ display: "none" }} />
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          {!capturedImage ? (
            <Button
              type="primary"
              size="large"
              shape="circle"
              icon={<CameraOutlined style={{ fontSize: 24 }} />}
              onClick={takeSnapshot}
              style={{ width: 56, height: 56, background: "#1890ff" }}
            />
          ) : (
            <>
              <Button
                size="large"
                icon={<RedoOutlined />}
                onClick={() => setCapturedImage(null)}
              >
                Retake
              </Button>
              <Button
                type="primary"
                size="large"
                icon={<CheckOutlined />}
                onClick={handleSendPhoto}
              >
                Send Photo
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default CameraModal;
