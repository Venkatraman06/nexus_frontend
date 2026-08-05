import React, { useState, useEffect } from "react";

function useDarkMode() {
  const [dark, setDark] = useState(
    document.documentElement.getAttribute("data-theme") === "dark"
  );
  useEffect(() => {
    const observer = new MutationObserver(() =>
      setDark(document.documentElement.getAttribute("data-theme") === "dark")
    );
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);
  return dark;
}

import { Layout, Avatar, Dropdown, Typography, Space, Tooltip, Modal } from "antd";
import OrgChart from "@/components/OrgChart";
import GlobalSearch from "@/components/common/GlobalSearch";
import ThemeToggle from "@/components/common/ThemeToggle";
import NotificationBell from "@/components/notifications/NotificationBell";
import {
  DashboardOutlined, ProjectOutlined, TeamOutlined, ApartmentOutlined,
  BarChartOutlined, UserOutlined, LogoutOutlined, MenuFoldOutlined,
  MenuUnfoldOutlined, DatabaseOutlined, BankOutlined,
  ClockCircleOutlined, CheckCircleOutlined, RightOutlined,
  TagOutlined, HomeOutlined, OrderedListOutlined, CalendarOutlined,
  WalletOutlined, FieldTimeOutlined, SafetyCertificateOutlined, FileProtectOutlined,
  MedicineBoxOutlined, SettingOutlined,
  ApartmentOutlined as WorkflowIcon, FileTextOutlined,
  DollarOutlined, FileSearchOutlined, FundOutlined,
  ShopOutlined, CreditCardOutlined, PhoneOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import { PERMS, ANY_MASTER_VIEW, ANY_CRM_VIEW, ANY_FINANCE_VIEW, type BmsPermission } from "@/constants/permissions";
import { canSeeNavItem } from "@/utils/access";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

interface NavItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  permission?: BmsPermission;
  anyOf?: BmsPermission[];
  children?: NavItem[];
  badge?: number;
}

function isChildActive(item: NavItem, pathname: string): boolean {
  if (!item.children) {
    return pathname === item.key || pathname.startsWith(item.key + "/");
  }
  return item.children.some((c) => isChildActive(c, pathname));
}

const NAV_ITEMS: NavItem[] = [
  {
    key: "/dashboards",
    icon: <DashboardOutlined />,
    label: "Dashboard",
    children: [
      { key: "/executive-dashboard", icon: <BarChartOutlined />, label: "Executive Dashboard", permission: PERMS.DASHBOARD_EXECUTIVE },
      { key: "/my-dashboard",       icon: <HomeOutlined />,        label: "My Dashboard",      permission: PERMS.DASHBOARD_OWN },
    ],
  },
  {
    key: "/hrms",
    icon: <TeamOutlined />,
    label: "HRMS",
    children: [
      { key: "/hrms-dashboard",           icon: <DashboardOutlined />,         label: "Dashboard",        permission: PERMS.DASHBOARD_HRMS },
      { key: "/employees",                icon: <TeamOutlined />,              label: "Employees",        permission: PERMS.HRMS_EMPLOYEE_VIEW },
      { key: "/attendance/tracker",       icon: <FieldTimeOutlined />,         label: "Attendance",       permission: PERMS.HRMS_ATTENDANCE_VIEW },
      { key: "/employees/leave-requests", icon: <CalendarOutlined />,          label: "Leave Management", permission: PERMS.HRMS_LEAVE_VIEW },
      { key: "/my-leaves",                icon: <CalendarOutlined />,          label: "My Leaves",        permission: PERMS.DASHBOARD_OWN },
      { key: "/employees/payroll",        icon: <WalletOutlined />,            label: "Payroll",          permission: PERMS.HRMS_PAYROLL_VIEW },
      { key: "/employees/hr-compliance",    icon: <SafetyCertificateOutlined />, label: "HR Compliance",    permission: PERMS.HRMS_COMPLIANCE_VIEW },
    ],
  },
  {
    key: "/project-ms",
    icon: <ProjectOutlined />,
    label: "Project MS",
    children: [
      { key: "/dashboard",    icon: <DashboardOutlined />,   label: "Dashboard",  permission: PERMS.DASHBOARD_PROJECT },
      { key: "/projects",     icon: <ProjectOutlined />,     label: "Projects",   permission: PERMS.PROJECT_VIEW },
      { key: "/tickets",      icon: <DatabaseOutlined />,    label: "Tickets",    permission: PERMS.PROJECT_TICKET_VIEW },
      { key: "/allocation",   icon: <ApartmentOutlined />,   label: "Allocation", permission: PERMS.PROJECT_ALLOCATION_VIEW },
      {
        key: "/timesheets-group",
        icon: <ClockCircleOutlined />,
        label: "Timesheets",
        anyOf: [PERMS.PROJECT_TIMESHEET_VIEW, PERMS.PROJECT_TIMESHEET_APPROVE],
        children: [
          { key: "/timesheets",           icon: <ClockCircleOutlined />, label: "My Timesheet",        permission: PERMS.PROJECT_TIMESHEET_VIEW },
          { key: "/timesheets/reporting", icon: <CheckCircleOutlined />, label: "Reporting Timesheet", permission: PERMS.PROJECT_TIMESHEET_APPROVE },
        ],
      },
      { key: "/reports", icon: <BarChartOutlined />, label: "Reports", permission: PERMS.PROJECT_REPORT_UTILIZATION },
    ],
  },
  {
    key: "/followups",
    icon: <PhoneOutlined />,
    label: "Todo / Follow-up",
    permission: PERMS.CRM_FOLLOWUP_VIEW,
  },
  {
    key: "/crm",
    icon: <ShopOutlined />,
    label: "CRM",
    anyOf: ANY_CRM_VIEW,
    children: [
      { key: "/clients",             icon: <BankOutlined />,       label: "Client",     permission: PERMS.PROJECT_CLIENT_VIEW },
      { key: "/finance/documents",   icon: <FileTextOutlined />,   label: "Quotation",  permission: PERMS.FINANCE_DOCUMENT_VIEW },
    ],
  },
  {
    key: "/finance",
    icon: <DollarOutlined />,
    label: "Finance",
    anyOf: ANY_FINANCE_VIEW,
    children: [
      { key: "/payment/dashboard",   icon: <FundOutlined />,        label: "Dashboard",          permission: PERMS.PAYMENT_DASHBOARD_VIEW },
      { key: "/payment/invoices",    icon: <FileSearchOutlined />,  label: "Invoice",            permission: PERMS.PAYMENT_INVOICE_VIEW },
      { key: "/payment/payments",    icon: <WalletOutlined />,      label: "Payment",            permission: PERMS.PAYMENT_PAYMENT_VIEW },
      { key: "/payment/milestones",  icon: <OrderedListOutlined />, label: "Milestone Billing",  permission: PERMS.PAYMENT_INVOICE_VIEW },
      { key: "/expenses",            icon: <CreditCardOutlined />,  label: "Company Expenses",   permission: PERMS.CRM_EXPENSE_VIEW },
      { key: "/payment/receivables", icon: <BarChartOutlined />,    label: "Receivable Summary", permission: PERMS.PAYMENT_DASHBOARD_VIEW },
      { key: "/policy-documents",    icon: <FileProtectOutlined />, label: "Policy Documents",   permission: PERMS.POLICY_VIEW },
    ],
  },
  {
    key: "/configuration",
    icon: <SettingOutlined />,
    label: "Master",
    anyOf: ANY_MASTER_VIEW,
    children: [
      {
        key: "/master/hrms",
        icon: <MedicineBoxOutlined />,
        label: "HRMS Master",
        permission: PERMS.MASTER_HRMS_VIEW,
        children: [
          { key: "/master/designation",     icon: <TagOutlined />,         label: "Designation",      permission: PERMS.MASTER_HRMS_VIEW },
          { key: "/master/department",      icon: <OrderedListOutlined />, label: "Department",       permission: PERMS.MASTER_HRMS_VIEW },
          { key: "/master/location",        icon: <HomeOutlined />,        label: "Location",         permission: PERMS.MASTER_HRMS_VIEW },
          { key: "/master/employment-type", icon: <TagOutlined />,         label: "Employment Type",  permission: PERMS.MASTER_HRMS_VIEW },
          { key: "/master/shift-category",  icon: <FieldTimeOutlined />,   label: "Shift Categories", permission: PERMS.MASTER_HRMS_VIEW },
          { key: "/master/rate-card",       icon: <WalletOutlined />,      label: "Rate Cards",       permission: PERMS.MASTER_HRMS_VIEW },
        ],
      },
      {
        key: "/master/client",
        icon: <BankOutlined />,
        label: "Client Master",
        permission: PERMS.MASTER_CLIENT_VIEW,
        children: [
          { key: "/master/client-category", icon: <TagOutlined />, label: "Category", permission: PERMS.MASTER_CLIENT_VIEW },
        ],
      },
      {
        key: "/master/project",
        icon: <ProjectOutlined />,
        label: "Project Master",
        permission: PERMS.MASTER_PROJECT_VIEW,
        children: [
          { key: "/master/business-type", icon: <TagOutlined />, label: "Business Type", permission: PERMS.MASTER_PROJECT_VIEW },
          { key: "/master/billing-type",  icon: <TagOutlined />, label: "Billing Type",  permission: PERMS.MASTER_PROJECT_VIEW },
        ],
      },
    ],
  },
  {
    key: "/master/workflow",
    icon: <WorkflowIcon />,
    label: "Workflow",
    permission: PERMS.MASTER_WORKFLOW_VIEW,
  },
  {
    key: "/settings/roles",
    icon: <SafetyCertificateOutlined />,
    label: "Roles & Permissions",
    permission: PERMS.ROLE_VIEW,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar CSS injected once — keeps all animation logic in one place
// ─────────────────────────────────────────────────────────────────────────────
const SIDEBAR_CSS = `
  .bms-nav-item {
    display: flex;
    align-items: center;
    gap: 13px;
    padding: 15px 18px;
    margin: 3px 8px;
    border-radius: 11px;
    cursor: pointer;
    font-size: 15px;
    font-weight: 400;
    color: rgba(255,255,255,0.52);
    transition:
      transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1),
      background 0.15s ease,
      color 0.15s ease;
    transform-origin: left center;
    user-select: none;
    white-space: nowrap;
    overflow: hidden;
  }
  .bms-nav-item:hover {
    transform: scale(1.045) translateX(3px);
    color: rgba(255,255,255,0.95);
    background: rgba(255,255,255,0.07);
  }
  .bms-nav-item:hover .bms-nav-icon {
    transform: scale(1.22);
  }
  .bms-nav-item.bms-active {
    background: #1677ff;
    color: #fff;
    font-weight: 600;
    transform: scale(1.03) translateX(2px);
  }
  .bms-nav-item.bms-active .bms-nav-icon {
    transform: scale(1.15);
  }
  .bms-nav-item.bms-parent-open {
    background: rgba(56,189,248,0.13);
    color: rgba(255,255,255,0.9);
    font-weight: 600;
    border-left: 3px solid #38bdf8;
    border-radius: 0 11px 11px 0;
    padding-left: 15px;
  }
  .bms-nav-item.bms-parent-open:hover {
    transform: scale(1.03) translateX(3px);
  }
  .bms-nav-icon {
    font-size: 19px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  /* Child leaf items */
  .bms-child-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 12px 11px 14px;
    border-radius: 9px;
    cursor: pointer;
    font-size: 14px;
    color: rgba(255,255,255,0.45);
    transition:
      transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1),
      background 0.15s ease,
      color 0.15s ease;
    transform-origin: left center;
    user-select: none;
    white-space: nowrap;
    overflow: hidden;
  }
  .bms-child-item:hover {
    transform: scale(1.05) translateX(4px);
    color: rgba(255,255,255,0.9);
    background: rgba(255,255,255,0.06);
  }

  .bms-child-item.bms-active {
    background: #1677ff;
    color: #fff;
    font-weight: 600;
    transform: scale(1.04) translateX(3px);
  }

  .bms-child-pip {
    width: 3px;
    height: 22px;
    border-radius: 4px;
    background: rgba(255,255,255,0.15);
    flex-shrink: 0;
    transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.18s ease, height 0.18s ease;
  }
  .bms-child-item:hover .bms-child-pip {
    background: #38bdf8;
    height: 28px;
    transform: scaleY(1.1);
  }
  .bms-child-item.bms-active .bms-child-pip {
    background: #fff;
    height: 28px;
  }

  /* Arrow rotation */
  .bms-nav-arrow {
    font-size: 10px;
    opacity: 0.45;
    transition: transform 0.22s ease, opacity 0.15s ease;
    display: flex;
    align-items: center;
  }
  .bms-nav-item:hover .bms-nav-arrow {
    opacity: 0.85;
  }
  .bms-nav-arrow.open {
    transform: rotate(90deg);
  }

  /* Children container — thin connector line */
  .bms-children {
    margin: 0 8px 2px 16px;
    border-left: 1px solid rgba(255,255,255,0.07);
    padding-left: 4px;
  }

  /* Collapsed tooltip target */
  .bms-collapsed-item {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px 0;
    margin: 1px 8px;
    border-radius: 9px;
    cursor: pointer;
    color: rgba(255,255,255,0.52);
    transition:
      transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1),
      background 0.15s ease,
      color 0.15s ease;
    transform-origin: center;
  }
  .bms-collapsed-item:hover {
    transform: scale(1.18);
    color: #fff;
    background: rgba(255,255,255,0.08);
  }
  .bms-collapsed-item.bms-active {
    background: #1677ff;
    color: #fff;
    transform: scale(1.1);
  }

  /* Section label */
  .bms-section-label {
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: rgba(255,255,255,0.2);
    padding: 6px 20px 4px;
    text-transform: uppercase;
  }

  /* Scrollbar */
  .bms-nav-scroll::-webkit-scrollbar { width: 3px; }
  .bms-nav-scroll::-webkit-scrollbar-track { background: transparent; }
  .bms-nav-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
  .bms-nav-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

  /* Header icon buttons */
  .bms-header-icon-btn {
    width: 36px; height: 36px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    background: var(--bms-surface-2);
    transition: background 0.15s, transform 0.15s cubic-bezier(0.34,1.56,0.64,1);
  }
  .bms-header-icon-btn:hover {
    background: var(--bms-primary-light);
    transform: scale(1.12);
  }
`;

// Inject CSS once
if (typeof document !== "undefined" && !document.getElementById("bms-sidebar-css")) {
  const style = document.createElement("style");
  style.id = "bms-sidebar-css";
  style.textContent = SIDEBAR_CSS;
  document.head.appendChild(style);
}

// ─────────────────────────────────────────────────────────────────────────────
// SidebarItem
// ─────────────────────────────────────────────────────────────────────────────
function SidebarItem({
  item,
  collapsed,
  depth = 0,
}: {
  item: NavItem;
  collapsed: boolean;
  depth?: number;
}) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const user      = useAuthStore((s) => s.user);
  const userPerms = useAuthStore((s) => s.permissions);

  const [open, setOpen] = useState(() =>
    (item.children ?? []).some((c) => isChildActive(c, location.pathname))
  );

  // Re-open when navigating directly to a child
  useEffect(() => {
    if (item.children && (item.children ?? []).some((c) => isChildActive(c, location.pathname))) {
      setOpen(true);
    }
  }, [location.pathname]);

  const isLeafActive = !item.children && (
    location.pathname === item.key ||
    (depth === 0 && location.pathname.startsWith(item.key + "/"))
  );
  const isParentOpen = !!item.children &&
    (item.children ?? []).some((c) => isChildActive(c, location.pathname));

  // ── Collapsed mode: icon only with tooltip ──────────────────────────────
  if (collapsed) {
    return (
      <Tooltip title={item.label} placement="right">
        <div
          className={`bms-collapsed-item${isLeafActive || isParentOpen ? " bms-active" : ""}`}
          onClick={() => {
            if (!item.children) navigate(item.key);
          }}
        >
          <span style={{ fontSize: 17 }}>{item.icon}</span>
        </div>
      </Tooltip>
    );
  }

  // ── Parent (group) row ──────────────────────────────────────────────────
  if (item.children) {
    const visibleChildren = (item.children ?? []).filter((child) =>
      canSeeNavItem(child, user, userPerms)
    );
    if (!visibleChildren.length) return null;

    return (
      <div>
        <div
          className={`bms-nav-item${isParentOpen ? " bms-parent-open" : ""}`}
          style={{ justifyContent: "space-between" }}
          onClick={() => setOpen((v) => !v)}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 11, overflow: "hidden" }}>
            <span className="bms-nav-icon">{item.icon}</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>
          </div>
          <span className={`bms-nav-arrow${open ? " open" : ""}`}>
            <RightOutlined />
          </span>
        </div>

        {open && (
          <div className="bms-children">
            {visibleChildren.map((child) => (
              <SidebarItem
                key={child.key}
                item={child}
                collapsed={false}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Leaf item (depth 0 = top-level, depth > 0 = child) ─────────────────
  if (depth > 0) {
    return (
      <div
        className={`bms-child-item${isLeafActive ? " bms-active" : ""}`}
        onClick={() => navigate(item.key)}
      >
        <span className="bms-child-pip" />
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
          {item.label}
        </span>
        {item.badge != null && (
          <span style={{
            background: "rgba(22,119,255,0.25)",
            color: "#60a5fa",
            fontSize: 10,
            padding: "1px 6px",
            borderRadius: 20,
            fontWeight: 600,
            flexShrink: 0,
          }}>
            {item.badge}
          </span>
        )}
      </div>
    );
  }

  // Top-level leaf (no children)
  return (
    <div
      className={`bms-nav-item${isLeafActive ? " bms-active" : ""}`}
      onClick={() => navigate(item.key)}
    >
      <span className="bms-nav-icon">{item.icon}</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
        {item.label}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// App Layout
// ─────────────────────────────────────────────────────────────────────────────
export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [orgOpen, setOrgOpen]     = useState(false);
  const navigate  = useNavigate();
  const dark      = useDarkMode();
  const { user, permissions, logout } = useAuthStore();

  const pageBg       = dark ? "#0f1419" : "#f5f7fa";
  const headerBg     = dark ? "#1a2236" : "#ffffff";
  const headerBorder = dark ? "#2a3548" : "#e8edf3";
  const headerShadow = dark
    ? "0 1px 4px rgba(0,0,0,0.35)"
    : "0 1px 4px rgba(0,0,0,0.04)";
  const iconColor    = dark ? "#8c9ab0" : "#5a6a7e";

  const visibleNavItems = NAV_ITEMS.filter((item) =>
    canSeeNavItem(item, user, permissions)
  );

  const lastLoginLabel = user?.last_login
    ? (() => {
        const d = new Date(user.last_login);
        return d.toLocaleString("en-IN", {
          day: "2-digit", month: "2-digit", year: "numeric",
          hour: "2-digit", minute: "2-digit", hour12: true,
        });
      })()
    : null;

  const userMenu = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "My Profile",
      onClick: () => navigate("/settings"),
    },
    ...(lastLoginLabel
      ? [
          { type: "divider" as const },
          {
            key: "last-login",
            icon: <ClockCircleOutlined style={{ color: "#8c9ab0" }} />,
            disabled: true,
            label: (
              <span style={{ fontSize: 12, color: "#5a6a7e" }}>
                Last login:{" "}
                <strong style={{ fontWeight: 500 }}>{lastLoginLabel}</strong>
              </span>
            ),
          },
        ]
      : []),
    { type: "divider" as const },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Sign Out",
      onClick: logout,
      danger: true,
    },
  ];

  const siderWidth = collapsed ? 64 : 240;

  return (
    <Layout style={{ minHeight: "100vh", background: pageBg }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <Sider
        width={siderWidth}
        collapsedWidth={64}
        collapsed={collapsed}
        trigger={null}
        style={{
          background: "#0a1628",
          position: "fixed",
          height: "100vh",
          left: 0, top: 0, bottom: 0,
          zIndex: 100,
          transition: "width 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderRight: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        {/* Logo */}
        <div style={{
          height: 64,
          display: "flex",
          alignItems: "center",
          padding: collapsed ? "0 14px" : "0 16px",
          justifyContent: collapsed ? "center" : "flex-start",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
          gap: 10,
          overflow: "hidden",
        }}>
          <div style={{
            width: 34, height: 34,
            borderRadius: 9,
            background: "#1677ff",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
            transition: "transform 0.18s cubic-bezier(0.34,1.56,0.64,1)",
            cursor: "pointer",
          }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1.12) rotate(-4deg)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1) rotate(0deg)"; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 4h2v-2h2v2h2v2h-2v2h-2v-2h-2v-2z" />
            </svg>
          </div>
          {!collapsed && (
            <div style={{ overflow: "hidden" }}>
              <div style={{
                color: "#fff", fontWeight: 700, fontSize: 14,
                lineHeight: 1.2, whiteSpace: "nowrap",
              }}>
                PMO & Tracker
              </div>
              <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, whiteSpace: "nowrap" }}>
                Project Management
              </div>
            </div>
          )}
        </div>

        {/* ── Scrollable nav ── */}
        <div
          className="bms-nav-scroll"
          style={{
            height: "calc(100vh - 64px)",
            overflowY: "auto",
            overflowX: "hidden",
            padding: "10px 0 24px",
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(255,255,255,0.1) transparent",
          }}
        >
          {!collapsed && (
            <div className="bms-section-label">Navigation</div>
          )}

          {visibleNavItems.map((item) => (
            <SidebarItem
              key={item.key}
              item={item}
              collapsed={collapsed}
            />
          ))}

          <div style={{ height: 32 }} />
        </div>
      </Sider>

      {/* ── Main area ───────────────────────────────────────────────────── */}
      <Layout style={{
        marginLeft: siderWidth,
        transition: "margin-left 0.22s cubic-bezier(0.4,0,0.2,1)",
        background: pageBg,
      }}>

        {/* Header */}
        <Header
          style={{
            padding: "0 24px",
            background: headerBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: `1px solid ${headerBorder}`,
            height: 64,
            position: "sticky",
            top: 0,
            zIndex: 99,
            boxShadow: headerShadow,
          }}
        >
          <Space size={16}>
            {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
              style: {
                fontSize: 18,
                cursor: "pointer",
                color: iconColor,
                transition: "transform 0.18s cubic-bezier(0.34,1.56,0.64,1)",
              },
              onClick: () => setCollapsed(!collapsed),
              onMouseEnter: (e: React.MouseEvent) => {
                (e.currentTarget as HTMLElement).style.transform = "scale(1.2)";
              },
              onMouseLeave: (e: React.MouseEvent) => {
                (e.currentTarget as HTMLElement).style.transform = "scale(1)";
              },
            })}
            <GlobalSearch />
          </Space>

          <Space size={12}>
            <ThemeToggle />

            <Tooltip title="Org Chart">
              <div className="bms-header-icon-btn" onClick={() => setOrgOpen(true)}>
                <ApartmentOutlined style={{ fontSize: 16, color: iconColor }} />
              </div>
            </Tooltip>

            <NotificationBell iconColor={iconColor} />

            <Dropdown
              menu={{ items: userMenu }}
              trigger={["click"]}
              placement="bottomRight"
            >
              <Space
                style={{
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: 8,
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                <Avatar
                  size={32}
                  icon={<UserOutlined />}
                  style={{ background: "#1677ff", flexShrink: 0 }}
                />
                <div style={{ lineHeight: 1.3 }}>
                  <Text style={{
                    fontSize: 13, fontWeight: 600, display: "block",
                    color: dark ? "#e8edf3" : "#1a2332",
                  }}>
                    {user?.full_name || user?.username}
                  </Text>
                  <Text style={{ fontSize: 11, color: dark ? "#8c9ab0" : "#5a6a7e" }}>
                    {user?.is_pmo ? "PMO" : user?.is_manager ? "Manager" : "Member"}
                  </Text>
                </div>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        {/* Page content */}
        <Content
          style={{
            background: pageBg,
            overflow: "auto",
            padding: 24,
            minHeight: "calc(100vh - 64px)",
          }}
        >
          <Outlet />
        </Content>
      </Layout>

      {/* Org Chart modal */}
      <Modal
        open={orgOpen}
        onCancel={() => setOrgOpen(false)}
        footer={null}
        width="90vw"
        style={{ top: 20 }}
        styles={{ body: { padding: 0, height: "80vh", overflow: "hidden" } }}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ApartmentOutlined style={{ color: "#1677ff" }} />
            <span>Organisation Chart</span>
          </div>
        }
        destroyOnClose
      >
        <div style={{ height: "100%", overflow: "hidden" }}>
          <OrgChart />
        </div>
      </Modal>
    </Layout>
  );
}