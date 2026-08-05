import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Alert, Tag, Table, Progress, Typography, Button, Collapse,
} from "antd";
import {
  ProjectOutlined, SafetyCertificateOutlined, ClockCircleOutlined, FileDoneOutlined,
} from "@ant-design/icons";
import { Line, Bar } from "@ant-design/charts";
import dayjs from "dayjs";
import { dashboardApi, type PMOAlert, type PMODashboard, type PortfolioProject } from "@/services/dashboard";
import {
  DashboardShell,
  DashboardHeader,
  DashboardGrid,
  DashboardPanel,
  AttentionQueue,
  PeriodControl,
  QuickActionBar,
  ActionMetric,
  HealthRing,
  WorkQueue,
  TrendPanel,
  EmptyGuide,
  DashboardPageSkeleton,
  DashboardAlertModal,
  useDashboardPeriod,
  usePMOQuickActions,
} from "@/components/dashboard";

const { Text } = Typography;

const HEALTH_TAG: Record<string, string> = {
  ON_TRACK: "success",
  AT_RISK: "warning",
  DELAYED: "error",
};

const HEALTH_LABEL: Record<string, string> = {
  ON_TRACK: "On Track",
  AT_RISK: "At Risk",
  DELAYED: "Delayed",
};

const HEALTH_ORDER: Record<string, number> = {
  DELAYED: 0,
  AT_RISK: 1,
  ON_TRACK: 2,
};

function sortPortfolio(projects: PortfolioProject[]) {
  return [...projects].sort((a, b) => {
    const h = (HEALTH_ORDER[a.health] ?? 9) - (HEALTH_ORDER[b.health] ?? 9);
    if (h !== 0) return h;
    if (a.days_left == null && b.days_left == null) return 0;
    if (a.days_left == null) return 1;
    if (b.days_left == null) return -1;
    return a.days_left - b.days_left;
  });
}

function deliveryQueueMeta(project: PortfolioProject): { meta: string; metaColor?: string } {
  if (project.days_left == null) return { meta: `${project.open_tickets} open tickets` };
  if (project.days_left < 0) {
    return {
      meta: `${Math.abs(project.days_left)}d overdue · ${project.completion_pct}% done`,
      metaColor: "var(--bms-danger)",
    };
  }
  if (project.days_left < 14) {
    return {
      meta: `${project.days_left}d left · ${project.open_tickets} open`,
      metaColor: "var(--bms-warning)",
    };
  }
  return { meta: `${project.days_left}d left · ${project.open_tickets} open tickets` };
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { period, setPeriod, year, month, label } = useDashboardPeriod();
  const quickActions = usePMOQuickActions();
  const [activeAlert, setActiveAlert] = useState<PMOAlert | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["pmo-dashboard", year, month],
    queryFn: () => dashboardApi.pmo(year, month),
    staleTime: 60_000,
  });

  const trendChartData = useMemo(() => {
    if (!data?.logging.weekly_trend) return [];
    return data.logging.weekly_trend.flatMap((w) => [
      { week: w.label, type: "Total", hours: w.total_hours },
      { week: w.label, type: "Billable", hours: w.billable_hours },
    ]);
  }, [data]);

  const deliveryItems = useMemo(() => {
    if (!data) return [];
    return sortPortfolio(data.portfolio.projects)
      .slice(0, 8)
      .map((p) => {
        const { meta, metaColor } = deliveryQueueMeta(p);
        return {
          id: p.id,
          title: `${p.code} — ${p.name}`,
          subtitle: p.client ?? "No client",
          badge: { label: HEALTH_LABEL[p.health], color: HEALTH_TAG[p.health] },
          meta,
          metaColor,
          onClick: () => navigate(`/projects/${p.id}`),
        };
      });
  }, [data, navigate]);

  const timesheetCompliancePct = useMemo(() => {
    if (!data) return 0;
    const tw = data.timesheet_week;
    const total = tw.approved + tw.submitted + tw.draft + tw.rejected + tw.missing;
    if (total === 0) return 0;
    return Math.round((tw.approved / total) * 100);
  }, [data]);

  if (isLoading) {
    return (
      <DashboardShell>
        <DashboardPageSkeleton />
      </DashboardShell>
    );
  }

  if (error || !data) {
    return (
      <DashboardShell>
        <Alert type="error" message="Failed to load project dashboard" showIcon />
      </DashboardShell>
    );
  }

  const d: PMODashboard = data;

  const projectColumns = [
    {
      title: "Project", key: "name", ellipsis: true,
      render: (_: unknown, r: PortfolioProject) => (
        <div>
          <code style={{ fontSize: 11, color: "var(--bms-primary)", marginRight: 6 }}>{r.code}</code>
          <Text strong style={{ fontSize: 13 }}>{r.name}</Text>
          <div><Text type="secondary" style={{ fontSize: 11 }}>{r.client ?? "—"}</Text></div>
        </div>
      ),
    },
    {
      title: "Health", dataIndex: "health", width: 100,
      render: (h: string) => <Tag color={HEALTH_TAG[h]}>{HEALTH_LABEL[h]}</Tag>,
    },
    {
      title: "Completion", dataIndex: "completion_pct", width: 120,
      render: (v: number) => (
        <Progress
          percent={v}
          size="small"
          strokeColor={v >= 70 ? "var(--bms-success)" : v >= 40 ? "var(--bms-warning)" : "var(--bms-danger)"}
        />
      ),
    },
    {
      title: "Tickets", key: "tickets", width: 90,
      render: (_: unknown, r: PortfolioProject) => (
        <span style={{ fontSize: 12 }}>{r.open_tickets} / {r.total_tickets}</span>
      ),
    },
    {
      title: "Hours", key: "hours", width: 100,
      render: (_: unknown, r: PortfolioProject) => (
        <span style={{ fontSize: 12 }}>{r.logged_hours_month}h</span>
      ),
    },
    {
      title: "Due", key: "due", width: 90,
      render: (_: unknown, r: PortfolioProject) => {
        if (r.days_left == null) return "—";
        const color = r.days_left < 0 ? "var(--bms-danger)" : r.days_left < 14 ? "var(--bms-warning)" : undefined;
        return (
          <span style={{ fontSize: 12, color }}>
            {r.days_left < 0 ? `${Math.abs(r.days_left)}d late` : `${r.days_left}d`}
          </span>
        );
      },
    },
  ];

  const handleAlertClick = (alert: PMOAlert) => setActiveAlert(alert);

  const openFirstAlert = (key: PMOAlert["key"]) => {
    const found = d.alerts.find((a) => a.key === key);
    if (found) setActiveAlert(found);
  };

  return (
    <DashboardShell>
      <DashboardHeader
        title="Portfolio Command Center"
        subtitle={`Delivery, resources & compliance — ${label}`}
        periodControl={<PeriodControl value={period} onChange={setPeriod} />}
        actions={<QuickActionBar actions={quickActions} />}
      />

      <AttentionQueue
        items={d.alerts}
        onItemClick={handleAlertClick}
        emptyMessage="All clear — no items need immediate attention this period."
      />

      <div className="dash-metrics">
        <ActionMetric
          label="Active projects"
          value={d.projects.active}
          sub={`${d.projects.total} in portfolio`}
          accent="primary"
          icon={<ProjectOutlined />}
          actions={[
            { label: "View all", onClick: () => navigate("/projects") },
            { label: "Allocation", onClick: () => navigate("/allocation") },
          ]}
        />
        <ActionMetric
          label="Delivery health"
          value={`${d.projects.on_track} on track`}
          sub={`${d.projects.at_risk} at risk · ${d.projects.delayed} delayed`}
          accent={d.projects.delayed > 0 ? "danger" : d.projects.at_risk > 0 ? "warning" : "success"}
          icon={<SafetyCertificateOutlined />}
          actions={[
            ...(d.projects.delayed > 0
              ? [{ label: "Review delayed", onClick: () => openFirstAlert("delayed_projects") }]
              : []),
            ...(d.projects.at_risk > 0
              ? [{ label: "View at risk", onClick: () => openFirstAlert("at_risk_projects") }]
              : []),
          ]}
        />
        <ActionMetric
          label="Billable utilization"
          value={`${Math.round(d.logging.billing_utilization_percent)}%`}
          sub={`${d.logging.billable_hours}h billable this month`}
          accent="success"
          icon={<ClockCircleOutlined />}
          progress={Math.min(100, Math.round(d.logging.billing_utilization_percent))}
          actions={[
            { label: "Reports", onClick: () => navigate("/reports") },
            { label: "Timesheets", onClick: () => navigate("/timesheets/reporting") },
          ]}
        />
        <ActionMetric
          label="Timesheet compliance"
          value={`${timesheetCompliancePct}%`}
          sub={`${d.timesheet_week.missing} missing · week of ${dayjs(d.timesheet_week.week_start).format("DD MMM")}`}
          accent={d.timesheet_week.missing > 0 ? "warning" : "primary"}
          icon={<FileDoneOutlined />}
          progress={timesheetCompliancePct}
          actions={[
            { label: "Review queue", onClick: () => navigate("/timesheets/reporting") },
            ...(d.timesheet_week.missing > 0
              ? [{ label: "View missing", onClick: () => openFirstAlert("missing_timesheets") }]
              : []),
          ]}
        />
      </div>

      <DashboardGrid
        primary={
          <>
            <DashboardPanel
              title="Delivery queue"
              meta="Sorted by urgency — delayed and at-risk first"
              extra={
                <Button type="link" size="small" onClick={() => navigate("/projects")}>
                  All projects
                </Button>
              }
              flush
            >
              <WorkQueue
                items={deliveryItems}
                emptyTitle="No active projects"
                emptyDescription="Create a project or adjust filters to see delivery work here."
                emptyAction={
                  <Button type="primary" onClick={() => navigate("/projects")}>
                    View projects
                  </Button>
                }
              />
            </DashboardPanel>

            {d.logging.hours_by_project.length > 0 && (
              <DashboardPanel title="Hours by project" meta={label}>
                <Bar
                  data={d.logging.hours_by_project}
                  xField="code"
                  yField="hours"
                  legend={false}
                  height={Math.max(160, d.logging.hours_by_project.length * 36)}
                  color="var(--bms-primary)"
                  label={{ text: "hours", position: "right", style: { fontSize: 11 } }}
                  axis={{ x: { title: "Hours" } }}
                />
              </DashboardPanel>
            )}
          </>
        }
        secondary={
          <>
            <DashboardPanel title="Portfolio health" meta={`${d.projects.active} active projects`}>
              <HealthRing
                centerLabel="Active"
                centerValue={d.projects.active}
                segments={[
                  { key: "on_track", label: "On track", value: d.projects.on_track, color: "#52c41a" },
                  { key: "at_risk", label: "At risk", value: d.projects.at_risk, color: "#faad14" },
                  { key: "delayed", label: "Delayed", value: d.projects.delayed, color: "#ff4d4f" },
                ]}
              />
            </DashboardPanel>

            <DashboardPanel title="Weekly hours trend" meta="Last 8 weeks">
              {trendChartData.length > 0 ? (
                <TrendPanel
                  footer={
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <Text type="secondary">Team avg utilization</Text>
                      <Text strong>{d.team.avg_utilization_percent}%</Text>
                    </div>
                  }
                >
                  <Line
                    data={trendChartData}
                    xField="week"
                    yField="hours"
                    colorField="type"
                    shapeField="smooth"
                    height={220}
                    color={["var(--bms-primary)", "var(--bms-success)"]}
                    legend={{ position: "top-right" }}
                    axis={{ y: { title: "Hours" } }}
                    point={{ size: 3 }}
                  />
                </TrendPanel>
              ) : (
                <EmptyGuide
                  title="No time logged yet"
                  description="Hours will appear here once the team logs work this period."
                  actionLabel="Open timesheets"
                  onAction={() => navigate("/timesheets")}
                />
              )}
            </DashboardPanel>

            <DashboardPanel title="Work pipeline" meta={`${d.work_items.overdue} overdue`}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { label: "Open", value: d.work_items.open, color: "var(--bms-text-3)" },
                  { label: "In progress", value: d.work_items.in_progress, color: "var(--bms-primary)" },
                  { label: "Done", value: d.work_items.done, color: "var(--bms-success)" },
                  { label: "Overdue", value: d.work_items.overdue, color: "var(--bms-danger)" },
                ].map((item) => (
                  <div key={item.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                      <span>{item.label}</span>
                      <strong style={{ color: item.color }}>{item.value}</strong>
                    </div>
                    <Progress
                      percent={d.work_items.total ? Math.round((item.value / d.work_items.total) * 100) : 0}
                      showInfo={false}
                      strokeColor={item.color}
                      size="small"
                    />
                  </div>
                ))}
                {d.work_items.overdue > 0 && (
                  <Button
                    size="small"
                    type="link"
                    style={{ padding: 0, alignSelf: "flex-start" }}
                    onClick={() => openFirstAlert("overdue_tickets")}
                  >
                    Triage overdue tickets →
                  </Button>
                )}
              </div>
            </DashboardPanel>
          </>
        }
      />

      <div style={{ marginTop: 16 }}>
        <Collapse
          defaultActiveKey={["portfolio"]}
          items={[
            {
              key: "portfolio",
              label: (
                <span style={{ fontWeight: 600 }}>
                  Full portfolio ({d.portfolio.projects.length} projects)
                </span>
              ),
              children: (
                <div className="dash-table-wrap">
                  <Table
                    dataSource={sortPortfolio(d.portfolio.projects)}
                    columns={projectColumns}
                    rowKey="id"
                    size="small"
                    pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ["10", "20", "50"] }}
                    scroll={{ x: 800, y: 420 }}
                    onRow={(r) => ({
                      style: { cursor: "pointer" },
                      onClick: () => navigate(`/projects/${r.id}`),
                    })}
                  />
                </div>
              ),
            },
          ]}
        />
      </div>

      <DashboardAlertModal
        alert={activeAlert}
        data={d}
        open={!!activeAlert}
        onClose={() => setActiveAlert(null)}
        onNavigate={(path) => {
          setActiveAlert(null);
          navigate(path);
        }}
      />
    </DashboardShell>
  );
}
