import React from "react";
import { EnvironmentOutlined, GlobalOutlined } from "@ant-design/icons";

export interface LocationData {
  title: string;
  address: string;
  lat: number;
  lng: number;
}

interface LocationWidgetProps {
  location: LocationData;
  isSentByMe?: boolean;
}

export const LocationWidget: React.FC<LocationWidgetProps> = ({ location, isSentByMe = false }) => {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`;

  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex",
        flexDirection: "column",
        textDecoration: "none",
        color: "inherit",
        borderRadius: 14,
        overflow: "hidden",
        background: isSentByMe ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.04)",
        border: `1px solid ${isSentByMe ? "rgba(255, 255, 255, 0.2)" : "rgba(0,0,0,0.08)"}`,
        width: 240,
      }}
    >
      <div
        style={{
          height: 100,
          background: "linear-gradient(135deg, #1890ff 0%, #096dd9 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          position: "relative",
        }}
      >
        <EnvironmentOutlined style={{ fontSize: 36, color: "#ff4d4f" }} />
        <span style={{ position: "absolute", bottom: 6, right: 8, fontSize: 11, background: "rgba(0,0,0,0.4)", padding: "2px 6px", borderRadius: 4 }}>
          Map Location
        </span>
      </div>

      <div style={{ padding: "10px 12px" }}>
        <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: isSentByMe ? "#fff" : "inherit" }}>
          {location.title}
        </h4>
        <p style={{ margin: "4px 0 0 0", fontSize: 11, opacity: 0.8, lineHeight: 1.3 }}>
          {location.address}
        </p>
        <div style={{ marginTop: 6, fontSize: 11, color: isSentByMe ? "#91caff" : "#1890ff", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
          <GlobalOutlined /> Open in Google Maps
        </div>
      </div>
    </a>
  );
};

export default LocationWidget;
