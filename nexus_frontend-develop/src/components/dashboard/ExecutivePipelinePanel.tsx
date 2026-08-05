import { Typography } from "antd";
import type { ExecutiveProjectPipeline } from "@/services/dashboard";

const { Text } = Typography;

interface Props {
  pipeline: ExecutiveProjectPipeline;
}

const STAGE_SHORT: Record<string, string> = {
  pipeline: "Enquiry",
  active: "In business",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function ExecutivePipelinePanel({ pipeline }: Props) {
  const segments = pipeline.breakdown.filter((b) => b.count > 0);

  return (
    <div className="exec-funnel">
      <div className="exec-funnel-bar" aria-label="Project pipeline distribution">
        {segments.length > 0 ? (
          segments.map((b) => (
            <div
              key={b.key}
              className="exec-funnel-bar__seg"
              style={{ flex: b.count, background: b.color }}
              title={`${b.label}: ${b.count} (${b.pct}%)`}
            >
              {b.pct >= 10 && <span>{b.pct}%</span>}
            </div>
          ))
        ) : (
          <div className="exec-funnel-bar__seg exec-funnel-bar__seg--empty" />
        )}
      </div>

      <div className="exec-funnel-stages">
        {pipeline.breakdown.map((b, idx) => (
          <div
            key={b.key}
            className={`exec-funnel-stage${b.count === 0 ? " exec-funnel-stage--empty" : ""}`}
          >
            {idx > 0 && <div className="exec-funnel-stage__arrow" aria-hidden />}
            <div className="exec-funnel-stage__icon" style={{ background: `${b.color}20`, color: b.color }}>
              {b.count}
            </div>
            <div className="exec-funnel-stage__label">{STAGE_SHORT[b.key] ?? b.label}</div>
            <Text type="secondary" className="exec-funnel-stage__pct">{b.pct}% of portfolio</Text>
          </div>
        ))}
      </div>

      <div className="exec-funnel-kpis">
        <div className="exec-funnel-kpis__item">
          <Text type="secondary">Enquiry → business</Text>
          <strong style={{ color: "var(--bms-success)" }}>{pipeline.conversion_pct}%</strong>
        </div>
        <div className="exec-funnel-kpis__item">
          <Text type="secondary">Completed</Text>
          <strong style={{ color: "#059669" }}>{pipeline.completion_pct}%</strong>
        </div>
        <div className="exec-funnel-kpis__item">
          <Text type="secondary">Win vs cancelled</Text>
          <strong style={{ color: pipeline.win_pct >= 50 ? "var(--bms-success)" : "var(--bms-warning)" }}>
            {pipeline.win_pct}%
          </strong>
        </div>
        <div className="exec-funnel-kpis__item">
          <Text type="secondary">New this FY</Text>
          <strong style={{ color: "var(--bms-primary)" }}>{pipeline.fy_new}</strong>
        </div>
      </div>
    </div>
  );
}
