import { Progress } from "antd";

export interface HealthSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

interface HealthRingProps {
  segments: HealthSegment[];
  centerLabel?: string;
  centerValue?: string | number;
}

export default function HealthRing({
  segments,
  centerLabel = "Active",
  centerValue,
}: HealthRingProps) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const onTrack = segments.find((s) => s.key === "on_track")?.value ?? 0;
  const pct = total > 0 ? Math.round((onTrack / total) * 100) : 0;

  return (
    <div style={{ textAlign: "center" }}>
      <Progress
        type="dashboard"
        percent={pct}
        strokeColor={{
          "0%": segments.find((s) => s.key === "delayed")?.color ?? "#ff4d4f",
          "50%": segments.find((s) => s.key === "at_risk")?.color ?? "#faad14",
          "100%": segments.find((s) => s.key === "on_track")?.color ?? "#52c41a",
        }}
        size={140}
        format={() => (
          <div>
            <div style={{ fontSize: 11, color: "var(--bms-text-3)" }}>{centerLabel}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--bms-text)" }}>
              {centerValue ?? total}
            </div>
          </div>
        )}
      />
      <div className="dash-health-legend">
        {segments.map((s) => (
          <div key={s.key} className="dash-health-legend__row">
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: s.color,
                  flexShrink: 0,
                }}
              />
              {s.label}
            </span>
            <strong style={{ color: s.color }}>{s.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
