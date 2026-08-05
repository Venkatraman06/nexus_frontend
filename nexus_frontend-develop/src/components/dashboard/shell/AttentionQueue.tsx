import { Tag } from "antd";

export interface AttentionItem {
  key: string;
  severity: "error" | "warning" | "info";
  title: string;
  count: number;
  detail: string;
  path?: string;
}

interface AttentionQueueProps {
  items: AttentionItem[];
  onItemClick: (item: AttentionItem) => void;
  emptyMessage?: string;
}

const SEVERITY_CLASS: Record<string, string> = {
  error: "dash-attention__chip--error",
  warning: "dash-attention__chip--warning",
  info: "dash-attention__chip--info",
};

export default function AttentionQueue({
  items,
  onItemClick,
  emptyMessage,
}: AttentionQueueProps) {
  if (!items.length) {
    if (!emptyMessage) return null;
    return (
      <div
        className="dash-panel"
        style={{ marginBottom: 16, padding: "12px 16px", fontSize: 13, color: "var(--bms-text-2)" }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="dash-attention" role="list" aria-label="Items needing attention">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          role="listitem"
          className={`dash-attention__chip ${SEVERITY_CLASS[item.severity] ?? ""}`}
          onClick={() => onItemClick(item)}
        >
          <div className="dash-attention__chip-top">
            <span className="dash-attention__chip-title">{item.title}</span>
            <Tag
              color={item.severity === "error" ? "error" : item.severity === "warning" ? "warning" : "processing"}
              style={{ margin: 0 }}
            >
              {item.count}
            </Tag>
          </div>
          <span className="dash-attention__chip-detail">{item.detail}</span>
          <span className="dash-attention__chip-action">Review →</span>
        </button>
      ))}
    </div>
  );
}
