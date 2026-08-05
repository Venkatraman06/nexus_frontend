import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, Button, Tooltip, Typography } from "antd";
import { CaretRightOutlined, EyeOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import {
  PriorityIcon, TypeIcon,
} from "@/components/tickets/TicketIcons";
import type { TicketListItem, TicketPriority } from "@/services/tickets";
import {
  buildTicketTree,
  filterTicketsWithAncestors,
  flattenTicketTree,
} from "@/utils/ticketTree";
import "./TicketHierarchyTable.css";

const { Text } = Typography;

function StatusChip({ name, color }: { name: string; color?: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 10px", borderRadius: 20,
      background: color ? `${color}22` : "#f3f4f6",
      border: `1px solid ${color || "#d1d5db"}`,
      fontSize: 11, fontWeight: 600, color: color || "#6b7280",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color || "#9ca3af" }} />
      {name}
    </span>
  );
}

interface TicketHierarchyTableProps {
  tickets: TicketListItem[];
  search?: string;
  loading?: boolean;
}

export default function TicketHierarchyTable({
  tickets,
  search = "",
}: TicketHierarchyTableProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [animateIds, setAnimateIds] = useState<Set<string>>(new Set());

  const { tree, autoExpand } = useMemo(() => {
    const trimmed = search.trim();
    if (!trimmed) {
      return { tree: buildTicketTree(tickets), autoExpand: new Set<string>() };
    }

    const lower = trimmed.toLowerCase();
    const { tickets: filtered, expandIds } = filterTicketsWithAncestors(
      tickets,
      (t) =>
        t.ticket_id.toLowerCase().includes(lower) ||
        t.title.toLowerCase().includes(lower),
    );

    return { tree: buildTicketTree(filtered), autoExpand: expandIds };
  }, [tickets, search]);

  useEffect(() => {
    if (autoExpand.size > 0) {
      setExpanded((prev) => new Set([...prev, ...autoExpand]));
    }
  }, [autoExpand]);

  const rows = useMemo(
    () => flattenTicketTree(tree, expanded, animateIds),
    [tree, expanded, animateIds],
  );

  const toggleExpand = (id: string, childIds: string[], e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        setAnimateIds(new Set(childIds));
        window.setTimeout(() => setAnimateIds(new Set()), 280);
      }
      return next;
    });
  };

  if (!rows.length) {
    return (
      <div className="ticket-hierarchy">
        <div className="ticket-hierarchy__empty">No tickets found</div>
      </div>
    );
  }

  return (
    <div className="ticket-hierarchy">
      <div className="ticket-hierarchy__head">
        <span>Work item</span>
        <span>ID</span>
        <span>Status</span>
        <span />
        <span>Assignee</span>
        <span>Due</span>
        <span>Est</span>
        <span />
      </div>

      <div className="ticket-hierarchy__body">
        {rows.map(({ node, depth, hasChildren, isExpanded, animate }) => (
          <div
            key={node.id}
            className={`ticket-hierarchy__row${animate ? " ticket-hierarchy__row--animate" : ""}`}
            onDoubleClick={() => navigate(`/tickets/${node.id}`)}
          >
            <div className="ticket-hierarchy__title-cell">
              <span className="ticket-hierarchy__indent" style={{ width: depth * 20 }} />
              {hasChildren ? (
                <button
                  type="button"
                  className={`ticket-hierarchy__toggle${isExpanded ? " ticket-hierarchy__toggle--expanded" : ""}`}
                  onClick={(e) => toggleExpand(node.id, node.children.map((c) => c.id), e)}
                  aria-label={isExpanded ? "Collapse" : "Expand"}
                >
                  <CaretRightOutlined style={{ fontSize: 11 }} />
                </button>
              ) : (
                <span className="ticket-hierarchy__toggle-spacer" />
              )}
              <span className="ticket-hierarchy__type">
                <TypeIcon type={node.type} size={14} />
              </span>
              <Tooltip title={node.title}>
                <Button
                  type="link"
                  className="ticket-hierarchy__title-link"
                  onClick={() => navigate(`/tickets/${node.id}`)}
                >
                  {node.title}
                </Button>
              </Tooltip>
            </div>

            <span className="ticket-hierarchy__id">{node.ticket_id}</span>

            <span className="ticket-hierarchy__status">
              {node.workflow_state_name ? (
                <StatusChip name={node.workflow_state_name} color={node.workflow_state_color} />
              ) : (
                <Text type="secondary">—</Text>
              )}
            </span>

            <span className="ticket-hierarchy__priority">
              <PriorityIcon priority={node.priority as TicketPriority} />
            </span>

            <span className="ticket-hierarchy__assignee">
              {node.assignee_name ? (
                <>
                  <Avatar size={22} style={{ background: "#1677ff", fontSize: 10 }}>
                    {node.assignee_name.charAt(0)}
                  </Avatar>
                  <Tooltip title={node.assignee_name}>
                    <span className="ticket-hierarchy__assignee-name">{node.assignee_name}</span>
                  </Tooltip>
                </>
              ) : (
                <Text type="secondary" style={{ fontSize: 12 }}>Unassigned</Text>
              )}
            </span>

            <span className="ticket-hierarchy__due">
              {node.due_date ? (
                <Text style={{
                  fontSize: 12,
                  color: dayjs(node.due_date).isBefore(dayjs()) ? "#ef4444" : "inherit",
                }}>
                  {dayjs(node.due_date).format("DD MMM")}
                </Text>
              ) : (
                <Text type="secondary">—</Text>
              )}
            </span>

            <span className="ticket-hierarchy__est">
              <Text style={{ fontSize: 12 }}>{node.original_estimate || 0}h</Text>
            </span>

            <span className="ticket-hierarchy__action">
              <Button
                size="small"
                type="text"
                icon={<EyeOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/tickets/${node.id}`);
                }}
              />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
