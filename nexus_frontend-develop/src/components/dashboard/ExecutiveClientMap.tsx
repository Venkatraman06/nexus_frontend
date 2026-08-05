import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ExecutiveClientMapPoint } from "@/services/dashboard";

function fmt(n: number) {
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

interface Props {
  clients: ExecutiveClientMapPoint[];
}

export default function ExecutiveClientMap({ clients }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(containerRef.current, { scrollWheelZoom: false });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    if (clients.length === 0) {
      map.setView([20.5937, 78.9629], 4);
      requestAnimationFrame(() => map.invalidateSize());
      return () => {
        map.remove();
        mapRef.current = null;
      };
    }

    const bounds: L.LatLngTuple[] = [];
    clients.forEach((c) => {
      const latlng: L.LatLngTuple = [c.latitude, c.longitude];
      bounds.push(latlng);
      const marker = L.circleMarker(latlng, {
        radius: 8,
        color: "#1677ff",
        fillColor: "#1677ff",
        fillOpacity: 0.85,
        weight: 2,
      }).addTo(map);
      marker.bindPopup(`
        <div style="font-family:sans-serif;font-size:13px;line-height:1.5;min-width:160px">
          <strong>${c.name}</strong><br/>
          <span style="color:#6b7280;font-size:12px">${c.code}</span><br/>
          ${c.project_count} project(s)<br/>
          FY invoiced: <strong>${fmt(c.invoiced_fy)}</strong>
          ${c.address ? `<br/><span style="font-size:11px;color:#9ca3af">${c.address}</span>` : ""}
        </div>
      `);
    });

    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });

    // Leaflet needs a size recalc when rendered inside dashboard panels
    requestAnimationFrame(() => map.invalidateSize());

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [clients]);

  return (
    <div
      ref={containerRef}
      style={{ height: 380, width: "100%", borderRadius: 10, overflow: "hidden", background: "#f0f2f5" }}
    />
  );
}
