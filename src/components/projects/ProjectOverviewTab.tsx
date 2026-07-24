import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Progress, Tag, Typography,
} from "antd";
import {
  CalendarOutlined, TeamOutlined, BankOutlined,
  IssuesCloseOutlined, TagOutlined, SafetyCertificateOutlined, ClockCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  DashboardPanel,
  ActionMetric,
  HealthRing,
  WorkQueue,
  AttentionQueue,
  type AttentionItem,
} from "@/components/dashboard";
import ProjectBudgetSummary from "@/components/payment/ProjectBudgetSummary";
import WorkflowChip from "@/components/projects/WorkflowChip";
import { projectsApi, type Project, type ProjectBillingSummary } from "@/services/projects";
import { reportsApi } from "@/services/dashboard";

const { Text } = Typography;

const HEALTH_LABEL: Record<string, string> = {
  ON_TRACK: "On Track",
  AT_RISK: "At Risk",
  DELAYED: "Delayed",
};

const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: "error",
  HIGH: "warning",
  MEDIUM: "processing",
  LOW: "default",
};

function fmtBudget(n?: number | null) {
  if (n == null) return "—";
  return `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const TERMINAL_PROJECT_SLUGS = new Set(["close", "cancelled"]);

function computeHealth(
  project: Project,
  openTickets: number,
  totalTickets: number,
): "ON_TRACK" | "AT_RISK" | "DELAYED" {
  const today = dayjs();
  if (project.workflow_state_slug && TERMINAL_PROJECT_SLUGS.has(project.workflow_state_slug)) {
    return "ON_TRACK";
  }
  if (project.end_date && dayjs(project.end_date).isBefore(today, "day")) return "DELAYED";
  if (!project.end_date) return "ON_TRACK";

  const daysLeft = dayjs(project.end_date).diff(today, "day");
  const totalDays = project.start_date
    ? dayjs(project.end_date).diff(dayjs(project.start_date), "day")
    : null;
  const openRatio = totalTickets > 0 ? openTickets / totalTickets : 0;

  if (totalDays && totalDays > 0 && daysLeft / totalDays < 0.2 && openRatio > 0.4) return "DELAYED";
  if ((totalDays && totalDays > 0 && daysLeft / totalDays < 0.35) || openRatio > 0.6) return "AT_RISK";
  return "ON_TRACK";
}

interface ProjectOverviewTabProps {
  project: Project;
  projectId: string;
  billingSummary?: ProjectBillingSummary;
}

export default function ProjectOverviewTab({
  project,
  projectId,
  billingSummary,
}: ProjectOverviewTabProps) {
  const navigate = useNavigate();

  const { data: summary } = useQuery({
    queryKey: ["project-summary", projectId],
    queryFn: () => projectsApi.summary(projectId),
    staleTime: 60_000,
  });

  const { data: team = [] } = useQuery({
    queryKey: ["project-allocated", projectId],
    queryFn: () => projectsApi.allocatedEmployees(projectId),
    staleTime: 60_000,
  });

  const { data: progress } = useQuery({
    queryKey: ["project-progress", projectId],
    queryFn: () => reportsApi.projectProgress(projectId),
    staleTime: 60_000,
    retry: false,
  });

  const openTickets = progress?.tickets.open ?? summary?.open_tickets ?? 0;
  const totalTickets = progress?.tickets.total ?? summary?.total_tickets ?? 0;
  const doneTickets = progress?.tickets.done ?? Math.max(0, totalTickets - openTickets);
  const loggedHours = progress?.logged_hours ?? project.logged_hours ?? 0;
  const health = computeHealth(project, openTickets, totalTickets);
  const completionPct = totalTickets > 0 ? Math.round((doneTickets / totalTickets) * 100) : 0;
  const hoursPct = project.estimated_hours > 0
    ? Math.min(100, Math.round((loggedHours / project.estimated_hours) * 100))
    : 0;
  const isTerminal = !!(project.workflow_state_slug && TERMINAL_PROJECT_SLUGS.has(project.workflow_state_slug));
  const daysLeft = isTerminal
    ? null
    : (project.end_date ? dayjs(project.end_date).diff(dayjs(), "day") : null);

  const attentionItems = useMemo((): AttentionItem[] => {
    const items: AttentionItem[] = [];
    if (health === "DELAYED") {
      items.push({
        key: "delayed",
        severity: "error",
        title: "Project overdue",
        count: daysLeft != null ? Math.abs(daysLeft) : 1,
        detail: daysLeft != null && daysLeft < 0
          ? `${Math.abs(daysLeft)} days past end date`
          : "Past scheduled end date",
      });
    } else if (health === "AT_RISK") {
      items.push({
        key: "at-risk",
        severity: "warning",
        title: "Delivery at risk",
        count: openTickets,
        detail: `${openTickets} open tickets · ${completionPct}% complete`,
      });
    }
    if (hoursPct > 100) {
      items.push({
        key: "hours",
        severity: "warning",
        title: "Hours over estimate",
        count: Math.round(loggedHours - project.estimated_hours),
        detail: `${loggedHours}h logged vs ${project.estimated_hours}h estimated`,
      });
    }
    if (billingSummary && billingSummary.invoice_remaining <= 0 && billingSummary.budget > 0) {
      items.push({
        key: "budget",
        severity: "info",
        title: "Budget fully invoiced",
        count: 100,
        detail: "No invoice headroom remaining on project budget",
      });
    }
    if (!project.manager_name) {
      items.push({
        key: "manager",
        severity: "info",
        title: "No manager assigned",
        count: 1,
        detail: "Assign a project manager for accountability",
      });
    }
    return items;
  }, [health, daysLeft, openTickets, completionPct, hoursPct, loggedHours, project, billingSummary]);

  const teamQueue = useMemo(
    () => team.map((e) => ({
      id: e.id,
      title: e.full_name,
      subtitle: e.designation || e.employee_code,
      badge: { label: e.employee_code, color: "processing" as const },
      onClick: () => navigate(`/employees/${e.id}`),
    })),
    [team, navigate],
  );

  const priorityQueue = useMemo(() => {
    if (!progress?.tickets.by_priority?.length) return [];
    return progress.tickets.by_priority
      .filter((p) => p.count > 0)
      .slice(0, 6)
      .map((p) => ({
        id: p.priority,
        title: p.priority,
        subtitle: "Ticket count",
        badge: { label: String(p.count), color: PRIORITY_COLOR[p.priority] ?? "default" },
        meta: `${Math.round((p.count / Math.max(totalTickets, 1)) * 100)}% of total`,
        onClick: () => navigate(`/tickets?project=${projectId}`),
      }));
  }, [progress, totalTickets, projectId, navigate]);

  return (
    <div className="project-overview">
      <AttentionQueue
        items={attentionItems}
        onItemClick={() => {}}
        emptyMessage="Delivery looks healthy — no issues flagged for this project."
      />

      <div className="dash-metrics" style={{ marginBottom: 16 }}>
        <ActionMetric
          label="Delivery health"
          value={HEALTH_LABEL[health]}
          sub={`${completionPct}% tickets done · ${openTickets} open`}
          accent={health === "DELAYED" ? "danger" : health === "AT_RISK" ? "warning" : "success"}
          icon={<SafetyCertificateOutlined />}
        />
        <ActionMetric
          label="Hours"
          value={`${loggedHours}h`}
          sub={`${hoursPct}% of ${project.estimated_hours}h estimated`}
          accent={hoursPct > 100 ? "warning" : hoursPct >= 70 ? "primary" : "default"}
          icon={<ClockCircleOutlined />}
          progress={hoursPct}
        />
        <ActionMetric
          label="Timeline"
          value={
            isTerminal
              ? (project.workflow_state_name ?? "Closed")
              : daysLeft == null
                ? "No end date"
                : daysLeft < 0
                  ? `${Math.abs(daysLeft)}d overdue`
                  : `${daysLeft}d left`
          }
          sub={
            project.start_date && project.end_date
              ? `${dayjs(project.start_date).format("DD MMM")} → ${dayjs(project.end_date).format("DD MMM YYYY")}`
              : "Dates not set"
          }
          accent={daysLeft != null && daysLeft < 14 ? "warning" : "default"}
          icon={<CalendarOutlined />}
        />
        <ActionMetric
          label="Budget"
          value={fmtBudget(project.budget)}
          sub={project.client_name ?? "No client"}
          accent={project.budget > 0 ? "purple" : "default"}
          icon={<BankOutlined />}
        />
      </div>

      <div className="dash-grid dash-grid--primary">
        <div className="dash-stack">
          <DashboardPanel title="Delivery snapshot">
            <HealthRing
              centerLabel="Tickets"
              centerValue={totalTickets}
              segments={[
                { key: "on_track", label: "Done", value: doneTickets, color: "#059669" },
                { key: "at_risk", label: "Open", value: openTickets, color: "#f97316" },
              ]}
            />
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Hours consumed</Text>
                <Text strong style={{ fontSize: 12 }}>{hoursPct}%</Text>
              </div>
              <Progress
                percent={hoursPct}
                strokeColor={
                  hoursPct > 100 ? "var(--pmt-danger)"
                    : hoursPct > 85 ? "var(--pmt-warning)"
                      : "var(--pmt-success)"
                }
                showInfo={false}
                size="small"
              />
            </div>
          </DashboardPanel>

          {priorityQueue.length > 0 && (
            <DashboardPanel title="Tickets by priority">
              <WorkQueue items={priorityQueue} emptyTitle="No tickets" />
            </DashboardPanel>
          )}

          {project.description && (
            <DashboardPanel title="Scope">
              <div
                className="rte-content project-overview__desc"
                dangerouslySetInnerHTML={{ __html: project.description }}
              />
            </DashboardPanel>
          )}
        </div>

        <div className="dash-stack">
          <DashboardPanel title="Project details">
            <div className="project-overview__meta">
              {[
                { icon: <BankOutlined />, label: "Client", value: project.client_name ?? "—" },
                { icon: <TeamOutlined />, label: "Manager", value: project.manager_name ?? "—" },
                { icon: <TagOutlined />, label: "Business", value: project.business_type_name ?? "—" },
                { icon: <TagOutlined />, label: "Billing", value: project.billing_type_name ?? "—" },
                {
                  icon: <IssuesCloseOutlined />,
                  label: "Status",
                  value: !project.is_active ? (
                    <Tag color="default">Inactive</Tag>
                  ) : project.workflow_state_name ? (
                    <WorkflowChip name={project.workflow_state_name} color={project.workflow_state_color} />
                  ) : "—",
                },
              ].map(({ icon, label, value }) => (
                <div key={label} className="project-overview__meta-row">
                  <span className="project-overview__meta-icon">{icon}</span>
                  <Text type="secondary" style={{ fontSize: 12, minWidth: 72 }}>{label}</Text>
                  <div style={{ fontSize: 13, flex: 1, textAlign: "right" }}>{value}</div>
                </div>
              ))}
            </div>
          </DashboardPanel>

          <DashboardPanel
            title="Allocated team"
            extra={<Text type="secondary" style={{ fontSize: 12 }}>{team.length} members</Text>}
          >
            <WorkQueue
              items={teamQueue}
              emptyTitle="No allocations"
              emptyDescription="Team members allocated to this project appear here."
            />
          </DashboardPanel>

          {billingSummary && billingSummary.budget > 0 && (
            <DashboardPanel title="Billing vs budget">
              <ProjectBudgetSummary summary={billingSummary} compact />
            </DashboardPanel>
          )}
        </div>
      </div>
    </div>
  );
}
