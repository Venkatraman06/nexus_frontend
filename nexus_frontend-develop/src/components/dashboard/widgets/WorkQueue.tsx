import type { ReactNode } from "react";
import { Tag } from "antd";

export interface WorkQueueItem {
  id: string;
  title: string;
  subtitle?: string;
  badge?: { label: string; color?: string };
  meta?: string;
  metaColor?: string;
  onClick?: () => void;
}

interface WorkQueueProps {
  items: WorkQueueItem[];
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
}

export default function WorkQueue({
  items,
  emptyTitle = "Nothing here",
  emptyDescription,
  emptyAction,
}: WorkQueueProps) {
  if (!items.length) {
    return (
      <div className="dash-empty">
        <p className="dash-empty__title">{emptyTitle}</p>
        {emptyDescription && <p className="dash-empty__desc">{emptyDescription}</p>}
        {emptyAction}
      </div>
    );
  }

  return (
    <div role="list">
      {items.map((item) => (
        <div
          key={item.id}
          role="listitem"
          className="dash-queue-item"
          onClick={item.onClick}
          onKeyDown={(e) => e.key === "Enter" && item.onClick?.()}
          tabIndex={item.onClick ? 0 : undefined}
        >
          <div className="dash-queue-item__main">
            <div className="dash-queue-item__title">{item.title}</div>
            {item.subtitle && (
              <div className="dash-queue-item__meta">{item.subtitle}</div>
            )}
          </div>
          <div className="dash-queue-item__aside">
            {item.badge && (
              <Tag color={item.badge.color} style={{ margin: 0 }}>
                {item.badge.label}
              </Tag>
            )}
            {item.meta && (
              <div
                className="dash-queue-item__meta"
                style={{ marginTop: 4, color: item.metaColor ?? "var(--bms-text-2)" }}
              >
                {item.meta}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
