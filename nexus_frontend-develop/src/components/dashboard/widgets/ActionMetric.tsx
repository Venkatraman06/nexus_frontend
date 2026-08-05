import type { ReactNode } from "react";
import { Progress } from "antd";

export interface MetricAction {
  label: string;
  onClick: () => void;
}

export type MetricAccent = "default" | "success" | "warning" | "danger" | "primary" | "purple";

interface ActionMetricProps {
  label: string;
  value: ReactNode;
  sub?: string;
  accent?: MetricAccent;
  icon?: ReactNode;
  progress?: number;
  actions?: MetricAction[];
}

const ACCENT_COLOR: Record<MetricAccent, string> = {
  default: "#64748b",
  success: "#16a34a",
  warning: "#d97706",
  danger: "#dc2626",
  primary: "#1677ff",
  purple: "#7c3aed",
};

export default function ActionMetric({
  label,
  value,
  sub,
  accent = "default",
  icon,
  progress,
  actions = [],
}: ActionMetricProps) {
  const color = ACCENT_COLOR[accent];

  return (
    <div className="dash-metric">
      <div className="dash-metric__body">
        {icon && (
          <div className="dash-metric__icon" style={{ background: `${color}20`, color }}>
            {icon}
          </div>
        )}
        <div className="dash-metric__content">
          <span className="dash-metric__label">{label}</span>
          <span className="dash-metric__value" style={{ color }}>{value}</span>
          {sub && <span className="dash-metric__sub">{sub}</span>}
          {progress !== undefined && (
            <Progress
              percent={progress}
              strokeColor={color}
              showInfo={false}
              size="small"
              className="dash-metric__progress"
            />
          )}
        </div>
      </div>
      {actions.length > 0 && (
        <div className="dash-metric__actions">
          {actions.map((a, i) => (
            <span key={a.label} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {i > 0 && <span className="dash-metric__action-sep">·</span>}
              <button type="button" className="dash-metric__action" onClick={a.onClick}>
                {a.label}
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
