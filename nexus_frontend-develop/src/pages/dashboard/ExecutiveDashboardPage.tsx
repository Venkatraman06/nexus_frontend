import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Alert, Collapse, Progress, Select, Table, Tag, Typography, Modal, Spin,
} from "antd";
import {
  TeamOutlined, ShopOutlined, ProjectOutlined, DollarOutlined,
  RiseOutlined, FallOutlined, GlobalOutlined, CheckCircleOutlined,
  FunnelPlotOutlined,
} from "@ant-design/icons";
import { Column } from "@ant-design/charts";
import {
  DashboardShell,
  DashboardHeader,
  DashboardGrid,
  DashboardPanel,
  AttentionQueue,
  QuickActionBar,
  ActionMetric,
  WorkQueue,
  TrendPanel,
  DashboardPageSkeleton,
  type AttentionItem,
  type QuickAction,
} from "@/components/dashboard";
import ExecutiveClientMap from "@/components/dashboard/ExecutiveClientMap";
import ExecutivePipelinePanel from "@/components/dashboard/ExecutivePipelinePanel";
import ExecutiveMarginRank from "@/components/dashboard/ExecutiveMarginRank";
import {
  dashboardApi,
  type ExecutiveDashboard,
  type ExecutiveProjectRow,
  type ExecutiveProjectDetail,
} from "@/services/dashboard";

const { Text } = Typography;

function fmt(n: number) {
  return `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtHours(n: number) {
  return `${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 1 })}h`;
}

function fmtMarginAxis(n: number) {
  const abs = Math.abs(n);
  if (abs >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (abs >= 1_000) return `₹${Math.round(n / 1_000)}k`;
  return `₹${Math.round(n)}`;
}

function currentFyStart(): number {
  const now = new Date();
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
}

function ProjectDetailModal({
  projectId,
  fyStartYear,
  open,
  onClose,
}: {
  projectId: string | null;
  fyStartYear: number;
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery<ExecutiveProjectDetail>({
    queryKey: ["exec-project", projectId, fyStartYear],
    queryFn: () => dashboardApi.executiveProject(projectId!, fyStartYear),
    enabled: open && !!projectId,
  });

  const f = data?.financials;
  const marginColor = (f?.gross_margin ?? 0) >= 0 ? "var(--bms-success)" : "var(--bms-danger)";

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={640}
      title={data ? `${data.project.code} — ${data.project.name}` : "Project financials"}
      destroyOnClose
      styles={{ body: { paddingTop: 12 } }}
    >
      {isLoading && <div style={{ textAlign: "center", padding: 40 }}><Spin /></div>}
      {data && f && (
        <div className="exec-project-detail">
          <Text type="secondary" className="exec-project-detail__fy">
            {data.fy.label} · {data.fy.start_date} → {data.fy.end_date}
          </Text>

          <div className="dash-metrics dash-metrics--modal">
            <ActionMetric
              label="Logged (FY)"
              value={`${data.hours.logged_fy}h`}
              sub={`Est. ${data.project.estimated_hours}h`}
              accent="primary"
              icon={<ProjectOutlined />}
            />
            <ActionMetric
              label="Invoiced"
              value={fmt(f.revenue_invoiced)}
              accent="primary"
              icon={<DollarOutlined />}
            />
            <ActionMetric
              label="Received"
              value={fmt(f.revenue_received)}
              accent="success"
              icon={<CheckCircleOutlined />}
            />
            <ActionMetric
              label="Gross margin"
              value={fmt(f.gross_margin)}
              sub={f.gross_margin_pct != null ? `${f.gross_margin_pct}%` : undefined}
              accent={(f.gross_margin ?? 0) >= 0 ? "success" : "danger"}
              icon={(f.gross_margin ?? 0) >= 0 ? <RiseOutlined /> : <FallOutlined />}
            />
          </div>

          <div className="exec-project-detail__breakdown">
            {[
              { label: "Billable hours", value: `${data.hours.billable_fy} h` },
              { label: "Non-billable", value: `${data.hours.non_billable_fy} h` },
              { label: "Employee cost", value: fmt(f.employee_cost) },
              { label: "Expenses", value: fmt(f.expense_cost) },
            ].map(({ label, value }) => (
              <div key={label} className="exec-project-detail__stat">
                <span className="exec-project-detail__stat-label">{label}</span>
                <span className="exec-project-detail__stat-value">{value}</span>
              </div>
            ))}
          </div>

          <div className="exec-project-detail__formula">
            {(f.gross_margin ?? 0) >= 0 ? (
              <RiseOutlined className="exec-project-detail__formula-icon" style={{ color: marginColor }} />
            ) : (
              <FallOutlined className="exec-project-detail__formula-icon" style={{ color: marginColor }} />
            )}
            <Text strong style={{ color: marginColor }}>
              Gross margin = Invoiced − (employee cost + expenses)
            </Text>
          </div>

          <div className="exec-project-detail__footer">
            <button
              type="button"
              className="dash-quick-btn dash-quick-btn--primary"
              onClick={() => { onClose(); navigate(`/projects/${data.project.id}`); }}
            >
              Open project
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function ExecutiveDashboardPage() {
  const navigate = useNavigate();
  const [fyStartYear, setFyStartYear] = useState(currentFyStart());
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<ExecutiveDashboard>({
    queryKey: ["executive-dashboard", fyStartYear],
    queryFn: () => dashboardApi.executive(fyStartYear),
    staleTime: 60_000,
  });

  const attentionItems = useMemo((): AttentionItem[] => {
    if (!data) return [];
    const items: AttentionItem[] = [];
    const negativeMargin = data.project_portfolio.filter((p) => p.gross_margin < 0);
    if (negativeMargin.length > 0) {
      items.push({
        key: "negative-margin",
        severity: "error",
        title: "Negative margin projects",
        count: negativeMargin.length,
        detail: "Projects where costs exceed invoiced revenue this FY",
      });
    }
    const collectionPct = data.finance.invoiced > 0
      ? (data.finance.received / data.finance.invoiced) * 100
      : 100;
    if (collectionPct < 80 && data.finance.invoiced > 0) {
      items.push({
        key: "collection",
        severity: "warning",
        title: "FY collection gap",
        count: Math.round(100 - collectionPct),
        detail: `${fmt(data.finance.pending)} pending of ${fmt(data.finance.invoiced)} invoiced`,
        path: "/payment/dashboard",
      });
    }
    const overHours = data.project_portfolio.filter(
      (p) => p.estimated_hours > 0 && p.logged_hours_fy > p.estimated_hours * 1.1,
    );
    if (overHours.length > 0) {
      items.push({
        key: "hours",
        severity: "warning",
        title: "Hours over estimate",
        count: overHours.length,
        detail: "Projects logged >110% of estimated hours this FY",
      });
    }
    if (data.clients_map.length === 0 && data.projects.active > 0) {
      items.push({
        key: "map",
        severity: "info",
        title: "Clients missing geo",
        count: 1,
        detail: "Add latitude/longitude on Clients page for map view",
        path: "/clients",
      });
    }
    return items;
  }, [data]);

  const portfolioQueue = useMemo(() => {
    if (!data) return [];
    return [...data.project_portfolio]
      .sort((a, b) => a.gross_margin - b.gross_margin)
      .slice(0, 8)
      .map((p) => ({
        id: p.id,
        title: `${p.code} — ${p.name}`,
        subtitle: p.client_name ?? "No client",
        badge: {
          label: p.gross_margin >= 0 ? "Profitable" : "Loss",
          color: p.gross_margin >= 0 ? "success" : "error",
        },
        meta: `${fmt(p.gross_margin)} margin · ${fmtHours(p.logged_hours_fy)} logged`,
        metaColor: p.gross_margin < 0 ? "var(--bms-danger)" : undefined,
        onClick: () => setSelectedProject(p.id),
      }));
  }, [data]);

  const quickActions = useMemo((): QuickAction[] => [
    { key: "projects", label: "Projects", icon: <ProjectOutlined />, onClick: () => navigate("/projects"), primary: true },
    { key: "finance", label: "Finance", icon: <DollarOutlined />, onClick: () => navigate("/payment/dashboard") },
    { key: "clients", label: "Clients", icon: <ShopOutlined />, onClick: () => navigate("/clients") },
    { key: "employees", label: "Team", icon: <TeamOutlined />, onClick: () => navigate("/employees") },
  ], [navigate]);

  const paymentChartData = useMemo(() => {
    if (!data?.payment_monthly) return [];
    return data.payment_monthly.flatMap((m) => [
      { month: m.label, type: "Invoiced", amount: m.invoiced },
      { month: m.label, type: "Received", amount: m.received },
    ]);
  }, [data]);

  const billingChartData = useMemo(() => {
    if (!data?.billing_monthly) return [];
    return data.billing_monthly.flatMap((m) => [
      { month: m.label, type: "Billable", hours: m.billable_hours },
      { month: m.label, type: "Non-Billable", hours: m.non_billable_hours },
    ]);
  }, [data]);

  const marginChartData = useMemo(() => {
    if (!data?.project_portfolio) return [];
    return [...data.project_portfolio]
      .sort((a, b) => b.gross_margin - a.gross_margin)
      .slice(0, 5);
  }, [data]);

  const collectionPct = data && data.finance.invoiced > 0
    ? Math.round((data.finance.received / data.finance.invoiced) * 100)
    : 0;

  const projectColumns = [
    {
      title: "Project", key: "name", ellipsis: true,
      render: (_: unknown, r: ExecutiveProjectRow) => (
        <div>
          <code style={{ fontSize: 11, color: "var(--bms-primary)", marginRight: 6 }}>{r.code}</code>
          <Text strong style={{ fontSize: 13 }}>{r.name}</Text>
          {r.client_name && <div><Text type="secondary" style={{ fontSize: 11 }}>{r.client_name}</Text></div>}
        </div>
      ),
    },
    {
      title: "Hours (FY)", key: "hours", width: 120,
      render: (_: unknown, r: ExecutiveProjectRow) => (
        <span style={{ fontSize: 12 }}>{fmtHours(r.logged_hours_fy)} / {fmtHours(r.estimated_hours)}</span>
      ),
    },
    {
      title: "Revenue", dataIndex: "revenue_invoiced", width: 100, align: "right" as const,
      render: (v: number) => <span style={{ fontSize: 12 }}>{fmt(v)}</span>,
    },
    {
      title: "Cost", dataIndex: "total_cost", width: 100, align: "right" as const,
      render: (v: number) => <span style={{ fontSize: 12 }}>{fmt(v)}</span>,
    },
    {
      title: "Margin", key: "margin", width: 130,
      render: (_: unknown, r: ExecutiveProjectRow) => (
        <Tag color={r.gross_margin >= 0 ? "success" : "error"}>
          {fmt(r.gross_margin)}
          {r.gross_margin_pct != null && ` (${r.gross_margin_pct}%)`}
        </Tag>
      ),
    },
  ];

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
        <Alert type="error" message="Failed to load executive dashboard" showIcon />
      </DashboardShell>
    );
  }

  const fyOptions = data.available_fy_years.map((y) => ({
    value: y,
    label: `FY ${y}-${String(y + 1).slice(-2)}`,
  }));

  return (
    <DashboardShell>
      <DashboardHeader
        title="Executive Overview"
        subtitle={`${data.fy.label} · ${data.fy.start_date} → ${data.fy.end_date}`}
        periodControl={
          <Select
            value={fyStartYear}
            onChange={setFyStartYear}
            options={fyOptions}
            style={{ width: 148 }}
          />
        }
        actions={<QuickActionBar actions={quickActions} />}
      />

      <AttentionQueue
        items={attentionItems}
        onItemClick={(item) => {
          if (item.path) navigate(item.path);
          else document.getElementById("exec-portfolio")?.scrollIntoView({ behavior: "smooth" });
        }}
        emptyMessage="FY performance is on track — no executive alerts."
      />

      <div className="dash-metrics">
        <ActionMetric
          label="FY invoiced"
          value={fmt(data.finance.invoiced)}
          sub={`${collectionPct}% collected · ${fmt(data.finance.pending)} pending`}
          accent="primary"
          icon={<DollarOutlined />}
          progress={collectionPct}
          actions={[{ label: "Finance", onClick: () => navigate("/payment/dashboard") }]}
        />
        <ActionMetric
          label="Active projects"
          value={data.projects.active}
          sub={`${data.projects.total} total · ${data.project_portfolio.length} in FY portfolio`}
          accent="primary"
          icon={<ProjectOutlined />}
          actions={[{ label: "View all", onClick: () => navigate("/projects") }]}
        />
        <ActionMetric
          label="Team"
          value={data.employees.active}
          sub={`${data.employees.total} employees · ${data.vendors.active} vendors`}
          accent="purple"
          icon={<TeamOutlined />}
        />
        <ActionMetric
          label="FY expenses"
          value={fmt(data.finance.expenses)}
          sub={`Budget ${fmt(data.finance.budget_total)} across portfolio`}
          accent={data.finance.expenses > data.finance.received * 0.5 ? "warning" : "default"}
          icon={<ShopOutlined />}
        />
      </div>

      <div className="exec-dash-section">
      <DashboardGrid
        primary={
          <DashboardPanel
            title="Project enquiry pipeline"
            meta={`${data.project_pipeline.total} projects in portfolio`}
            extra={<FunnelPlotOutlined style={{ color: "var(--bms-text-3)" }} />}
          >
            <ExecutivePipelinePanel pipeline={data.project_pipeline} />
          </DashboardPanel>
        }
        secondary={
          <DashboardPanel title="FY collection">
            <div className="exec-finance-panel">
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Received vs invoiced</Text>
                  <Text strong style={{ fontSize: 18, color: "var(--bms-success)" }}>{collectionPct}%</Text>
                </div>
                <Progress percent={collectionPct} strokeColor="var(--bms-success)" showInfo={false} size="small" />
              </div>
              <div className="exec-finance-pills">
                {[
                  { label: "Invoiced", value: fmt(data.finance.invoiced), color: "var(--bms-primary)" },
                  { label: "Received", value: fmt(data.finance.received), color: "var(--bms-success)" },
                  { label: "Pending", value: fmt(data.finance.pending), color: "var(--bms-warning)" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="exec-finance-pills__item">
                    <div style={{ fontSize: 11, color: "var(--bms-text-2)" }}>{label}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </DashboardPanel>
        }
      />
      </div>

      <div className="exec-dash-section">
      <DashboardGrid
        primary={
          <DashboardPanel
            title="Clients on map"
            extra={<GlobalOutlined style={{ color: "var(--bms-text-3)" }} />}
          >
            {data.clients_map.length > 0 ? (
              <ExecutiveClientMap clients={data.clients_map} />
            ) : (
              <div className="exec-map-empty">
                <GlobalOutlined style={{ fontSize: 32, color: "var(--bms-text-3)", marginBottom: 12 }} />
                <Text type="secondary">No clients with geo coordinates yet</Text>
                <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 4 }}>
                  Add latitude / longitude on the Clients page to plot them here
                </Text>
                <button type="button" className="dash-quick-btn" style={{ marginTop: 16 }} onClick={() => navigate("/clients")}>
                  Manage clients
                </button>
              </div>
            )}
          </DashboardPanel>
        }
        secondary={
          <div className="dash-stack dash-stack--equal">
            <DashboardPanel title="Invoice vs payment (monthly)" className="exec-chart-panel">
              <TrendPanel>
                {paymentChartData.length > 0 ? (
                  <Column
                    data={paymentChartData}
                    xField="month"
                    yField="amount"
                    colorField="type"
                    isGroup
                    height={200}
                    color={["#6366f1", "#16a34a"]}
                    legend={{ position: "top-right" }}
                    axis={{
                      y: {
                        labelFormatter: (v: number) => fmtMarginAxis(v),
                      },
                    }}
                  />
                ) : (
                  <Text type="secondary">No payment data for this FY</Text>
                )}
              </TrendPanel>
            </DashboardPanel>

            <DashboardPanel title="Billable vs non-billable hours (monthly)" className="exec-chart-panel">
              <TrendPanel>
                {billingChartData.length > 0 ? (
                  <Column
                    data={billingChartData}
                    xField="month"
                    yField="hours"
                    colorField="type"
                    isStack
                    height={200}
                    color={["#16a34a", "#94a3b8"]}
                    legend={{ position: "top-right" }}
                  />
                ) : (
                  <Text type="secondary">No timesheet hours for this FY</Text>
                )}
              </TrendPanel>
            </DashboardPanel>
          </div>
        }
      />
      </div>

      <div className="exec-dash-section exec-portfolio-grid" id="exec-portfolio">
        <DashboardGrid
          primary={
            <DashboardPanel
              title="Portfolio margin queue"
              extra={<Text type="secondary" style={{ fontSize: 12 }}>Lowest margin first</Text>}
            >
              <WorkQueue
                items={portfolioQueue}
                emptyTitle="No projects in portfolio"
                emptyDescription="Active billing projects appear here for the selected FY."
              />
            </DashboardPanel>
          }
          secondary={
            <DashboardPanel
              title="Margin by project (top 5)"
              extra={<Text type="secondary" style={{ fontSize: 12 }}>Highest first</Text>}
            >
              <ExecutiveMarginRank
                projects={marginChartData}
                limit={5}
                onProjectClick={setSelectedProject}
              />
            </DashboardPanel>
          }
        />
      </div>

      <Collapse
        ghost
        className="exec-dash-section"
        items={[{
          key: "portfolio-table",
          label: <Text strong>Full project portfolio ({data.project_portfolio.length})</Text>,
          children: (
            <div className="dash-table-wrap">
              <Table
                dataSource={data.project_portfolio}
                columns={projectColumns}
                rowKey="id"
                size="small"
                pagination={{ pageSize: 10, hideOnSinglePage: true }}
                scroll={{ x: 700 }}
                onRow={(r) => ({
                  style: { cursor: "pointer" },
                  onClick: () => setSelectedProject(r.id),
                })}
              />
            </div>
          ),
        }]}
      />

      <ProjectDetailModal
        projectId={selectedProject}
        fyStartYear={fyStartYear}
        open={!!selectedProject}
        onClose={() => setSelectedProject(null)}
      />
    </DashboardShell>
  );
}
