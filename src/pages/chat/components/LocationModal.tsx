import React, { useState } from "react";
import { Modal, Input, Button, message as toast } from "antd";
import { EnvironmentOutlined, SendOutlined } from "@ant-design/icons";

interface LocationModalProps {
  open: boolean;
  onClose: () => void;
  onShareLocation: (locationData: { title: string; address: string; lat: number; lng: number }) => void;
}

export const LocationModal: React.FC<LocationModalProps> = ({ open, onClose, onShareLocation }) => {
  const [title, setTitle] = useState("");
  const [address, setAddress] = useState("");

  const handleShareCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onShareLocation({
          title: title || "Current Location",
          address: address || `Lat: ${pos.coords.latitude.toFixed(4)}, Lng: ${pos.coords.longitude.toFixed(4)}`,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        onClose();
      },
      (err) => {
        toast.error("Could not fetch location. Please enter manually.");
      }
    );
  };

  const handleManualShare = () => {
    if (!title.trim() && !address.trim()) {
      toast.error("Please enter a location name or address");
      return;
    }
    onShareLocation({
      title: title || "Shared Location",
      address: address || title,
      lat: 12.9716, // fallback sample coordinates
      lng: 77.5946,
    });
    onClose();
  };

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <EnvironmentOutlined style={{ color: "#ff4d4f" }} />
          <span>Share Location</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      onOk={handleManualShare}
      okText="Share Location"
      cancelText="Cancel"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 12 }}>
        <Button
          type="primary"
          icon={<EnvironmentOutlined />}
          onClick={handleShareCurrentLocation}
          style={{ background: "#ff4d4f", borderColor: "#ff4d4f" }}
        >
          Send My Current Live Location
        </Button>

        <div style={{ textAlign: "center", fontSize: 12, opacity: 0.6 }}>— OR ENTER MANUALLY —</div>

        <div>
          <label style={{ fontWeight: 600, fontSize: 13, display: "block", marginBottom: 6 }}>
            Place Name / Title
          </label>
          <Input
            placeholder="e.g. Main Office, Client Site, HQ..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label style={{ fontWeight: 600, fontSize: 13, display: "block", marginBottom: 6 }}>
            Address / Details
          </label>
          <Input.TextArea
            placeholder="Enter address details..."
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
};

export default LocationModal;
