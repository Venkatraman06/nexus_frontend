import React, { useState, useEffect } from "react";
import { Layout, Avatar, Dropdown, Typography, Space, Tooltip, Modal, Button } from "antd";
import OrgChart from "@/components/OrgChart";
import GlobalSearch from "@/components/common/GlobalSearch";
import ThemeToggle from "@/components/common/ThemeToggle";
import NotificationBell from "@/components/notifications/NotificationBell";
import WorkspaceCalendarModal from "@/pages/workspace/WorkspaceCalendarModal";
import DailyDueNotification from "@/components/common/DailyDueNotification";
import {
  DashboardOutlined, ProjectOutlined, TeamOutlined, ApartmentOutlined,
  BarChartOutlined, UserOutlined, LogoutOutlined, MenuFoldOutlined,
  MenuUnfoldOutlined, DatabaseOutlined, BankOutlined,
  ClockCircleOutlined, CheckCircleOutlined, RightOutlined,
  HomeOutlined, OrderedListOutlined, CalendarOutlined,
  WalletOutlined, FieldTimeOutlined, SafetyCertificateOutlined, FileProtectOutlined,
  SettingOutlined,
  FileTextOutlined,
  DollarOutlined, FileSearchOutlined, FundOutlined,
  ShopOutlined, CreditCardOutlined, PhoneOutlined, MessageOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import { PERMS, ANY_MASTER_VIEW, ANY_CRM_VIEW, ANY_FINANCE_VIEW, ANY_WORKSPACE_VIEW, type PmtPermission } from "@/constants/permissions";
import { canSeeNavItem, hasAnyPermission } from "@/utils/access";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

function useDarkMode() {
  const [dark, setDark] = useState(
    () => document.documentElement.getAttribute("data-theme") === "dark",
  );
  useEffect(() => {
    const observer = new MutationObserver(() =>
      setDark(document.documentElement.getAttribute("data-theme") === "dark"),
    );
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);
  return dark;
}

function useIsMobile(breakpoint = 960) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= breakpoint,
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handler = () => setIsMobile(mq.matches);
    handler();
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return isMobile;
}

interface NavItem {
  key: string;
  icon?: React.ReactNode;
  label: string;
  permission?: PmtPermission;
  anyOf?: PmtPermission[];
  children?: NavItem[];
  badge?: number;
}

function isChildActive(item: NavItem, pathname: string): boolean {
  if (!item.children) {
    return pathname === item.key || pathname.startsWith(item.key + "/");
  }
  return item.children.some((c) => isChildActive(c, pathname));
}

const NAV_ITEMS_WITHOUT_DASHBOARD: NavItem[] = [
  {
    key: "/hrms",
    icon: <TeamOutlined />,
    label: "HRMS",
    children: [
      { key: "/hrms-dashboard",           icon: <DashboardOutlined />,         label: "Dashboard",        permission: PERMS.DASHBOARD_HRMS },
      { key: "/employees",                icon: <TeamOutlined />,              label: "Employees",        permission: PERMS.HRMS_EMPLOYEE_VIEW },
      { key: "/attendance/tracker", icon: <FieldTimeOutlined />, label: "Attendance", anyOf: [PERMS.DASHBOARD_OWN, PERMS.HRMS_ATTENDANCE_VIEW] },
      { key: "/attendance/admin", icon: <SettingOutlined />, label: "Attendance Requests", permission: PERMS.HRMS_ATTENDANCE_MANAGE },
      { key: "/employees/leave-requests", icon: <CalendarOutlined />, label: "Leave Management", anyOf: [PERMS.DASHBOARD_OWN, PERMS.HRMS_LEAVE_VIEW] },
      { key: "/employees/payroll",        icon: <WalletOutlined />,            label: "Payroll",          permission: PERMS.HRMS_PAYROLL_VIEW },
      { key: "/employees/hr-compliance", icon: <SafetyCertificateOutlined />, label: "HR Compliance", permission: PERMS.HRMS_COMPLIANCE_VIEW },
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
      { key: "/timesheets", label: "Timesheets", anyOf: [PERMS.PROJECT_TIMESHEET_VIEW, PERMS.PROJECT_TIMESHEET_APPROVE] },
      { key: "/reports", icon: <BarChartOutlined />, label: "Reports", permission: PERMS.PROJECT_REPORT_UTILIZATION },
    ],
  },
  {
    key: "/workspace",
    icon: <CheckCircleOutlined />,
    label: "Workspace",
    anyOf: ANY_WORKSPACE_VIEW,
    children: [
      { key: "/workspace/dashboard",  icon: <DashboardOutlined />,   label: "Dashboard", permission: PERMS.CRM_FOLLOWUP_VIEW },
      { key: "/workspace/todos",      icon: <OrderedListOutlined />, label: "To-Do",     permission: PERMS.CRM_FOLLOWUP_VIEW },
      { key: "/workspace/followups",  icon: <PhoneOutlined />,       label: "Follow-up", permission: PERMS.CRM_FOLLOWUP_VIEW },
      { key: "/workspace/meetings",   icon: <CalendarOutlined />,    label: "Meetings",  permission: PERMS.CRM_FOLLOWUP_VIEW },
      { key: "/workspace/calendar",   icon: <CalendarOutlined />,    label: "Calendar",  permission: PERMS.CRM_FOLLOWUP_VIEW },
    ],
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
    ],
  },
  {
    key: "/chat",
    icon: <MessageOutlined />,
    label: "Chat",
    permission: PERMS.CHAT_VIEW,
  },
  {
    key: "/policy-documents",
    icon: <FileProtectOutlined />,
    label: "Policy Documents",
    permission: PERMS.POLICY_VIEW,
  },
  {
    key: "/master",
    icon: <SettingOutlined />,
    label: "Master",
    anyOf: ANY_MASTER_VIEW,
  },
  {
    key: "/settings/roles",
    icon: <SafetyCertificateOutlined />,
    label: "Roles & Permissions",
    permission: PERMS.ROLE_VIEW,
  },
];

/** Top-level dashboard links — each shown separately when the user has permission. */
const TOP_DASHBOARD_NAV_ITEMS: NavItem[] = [
  { key: "/executive-dashboard", icon: <BarChartOutlined />, label: "Executive Dashboard", permission: PERMS.DASHBOARD_EXECUTIVE },
  { key: "/my-dashboard",       icon: <HomeOutlined />,        label: "Home",              permission: PERMS.DASHBOARD_OWN },
];

function visibleTopDashboardNavItems(
  user: ReturnType<typeof useAuthStore.getState>["user"],
  permissions: string[],
): NavItem[] {
  return TOP_DASHBOARD_NAV_ITEMS.filter((item) =>
    canSeeNavItem(item, user, permissions),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar CSS injected once — keeps all animation logic in one place
// ─────────────────────────────────────────────────────────────────────────────
const SIDEBAR_CSS = `
  .pmt-nav-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    margin: 3px 10px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 400;
    color: rgba(255,255,255,0.6);
    transition:
      transform 0.15s ease-in-out,
      background 0.15s ease-in-out,
      color 0.15s ease-in-out;
    transform-origin: left center;
    user-select: none;
    white-space: nowrap;
    overflow: hidden;
  }
  .pmt-nav-item:hover {
    transform: translateX(2px);
    color: #ffffff;
    background: rgba(255,255,255,0.06);
  }
  .pmt-nav-item:hover .pmt-nav-icon {
    transform: scale(1.1);
  }
  .pmt-nav-item.pmt-active {
    background: var(--pmt-primary, #1a73e8);
    color: #ffffff;
    font-weight: 500;
  }
  .pmt-nav-item.pmt-active .pmt-nav-icon {
    transform: scale(1.05);
  }
  .pmt-nav-item.pmt-parent-open {
    background: rgba(26, 115, 232, 0.1);
    color: #ffffff;
    font-weight: 500;
    border-left: 3px solid var(--pmt-primary);
    border-radius: 0 8px 8px 0;
    padding-left: 11px;
  }
  .pmt-nav-item.pmt-parent-open:hover {
    transform: translateX(3px);
  }
  .pmt-nav-icon {
    font-size: 17px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    transition: transform 0.15s ease-in-out;
  }

  /* Child leaf items */
  .pmt-child-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px 8px 14px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13.5px;
    color: rgba(255,255,255,0.5);
    transition:
      transform 0.15s ease-in-out,
      background 0.15s ease-in-out,
      color 0.15s ease-in-out;
    transform-origin: left center;
    user-select: none;
    white-space: nowrap;
    overflow: hidden;
  }
  .pmt-child-item:hover {
    transform: translateX(3px);
    color: #ffffff;
    background: rgba(255,255,255,0.05);
  }

  .pmt-child-item.pmt-active {
    background: var(--pmt-primary, #1a73e8);
    color: #ffffff;
    font-weight: 500;
  }

  .pmt-child-pip {
    width: 3px;
    height: 14px;
    border-radius: 4px;
    background: rgba(255,255,255,0.12);
    flex-shrink: 0;
    transition: transform 0.15s ease, background 0.15s ease, height 0.15s ease;
  }
  .pmt-child-item:hover .pmt-child-pip {
    background: #8ab4f8;
    height: 18px;
  }
  .pmt-child-item.pmt-active .pmt-child-pip {
    background: #ffffff;
    height: 18px;
  }

  /* Arrow rotation */
  .pmt-nav-arrow {
    font-size: 9px;
    opacity: 0.5;
    transition: transform 0.2s ease, opacity 0.15s ease;
    display: flex;
    align-items: center;
  }
  .pmt-nav-item:hover .pmt-nav-arrow {
    opacity: 0.8;
  }
  .pmt-nav-arrow.open {
    transform: rotate(90deg);
  }

  /* Children container — thin connector line */
  .pmt-children {
    margin: 2px 10px 4px 20px;
    border-left: 1px solid rgba(255,255,255,0.06);
    padding-left: 2px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  /* Collapsed tooltip target */
  .pmt-collapsed-item {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px 0;
    margin: 2px 8px;
    border-radius: 8px;
    cursor: pointer;
    color: rgba(255,255,255,0.6);
    transition:
      transform 0.15s ease-in-out,
      background 0.15s ease-in-out,
      color 0.15s ease-in-out;
    transform-origin: center;
  }
  .pmt-collapsed-item:hover {
    transform: scale(1.08);
    color: #ffffff;
    background: rgba(255,255,255,0.07);
  }
  .pmt-collapsed-item.pmt-active {
    background: var(--pmt-primary, #1a73e8);
    color: #ffffff;
  }

  /* Section label */
  .pmt-section-label {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: rgba(255,255,255,0.22);
    padding: 16px 24px 6px;
    text-transform: uppercase;
  }

  /* Scrollbar */
  .pmt-nav-scroll::-webkit-scrollbar { width: 3px; }
  .pmt-nav-scroll::-webkit-scrollbar-track { background: transparent; }
  .pmt-nav-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
  .pmt-nav-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.18); }

  /* Header icon buttons */
  .pmt-header-icon-btn {
    width: 34px; height: 34px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; border: 1px solid var(--pmt-border);
    background: var(--pmt-surface);
    transition: all 0.15s ease-in-out;
  }
  .pmt-header-icon-btn:hover {
    background: var(--pmt-primary-light);
    border-color: var(--pmt-primary);
    transform: translateY(-1px);
  }

`;

// Inject CSS once
if (typeof document !== "undefined" && !document.getElementById("pmt-sidebar-css")) {
  const style = document.createElement("style");
  style.id = "pmt-sidebar-css";
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
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  depth?: number;
  onNavigate?: () => void;
}) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const user      = useAuthStore((s) => s.user);
  const userPerms = useAuthStore((s) => s.permissions);

  const go = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  const handleKey = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      action();
    }
  };

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
    const firstVisibleChild = item.children?.find((c) =>
      canSeeNavItem(c, user, userPerms)
    );

    return (
      <Tooltip title={item.label} placement="right">
        <div
          role="button"
          tabIndex={0}
          aria-label={item.label}
          className={`pmt-collapsed-item${isLeafActive || isParentOpen ? " pmt-active" : ""}`}
          onClick={() => {
            // Navigate to first child if parent, otherwise navigate to the leaf
            if (firstVisibleChild) {
              go(firstVisibleChild.key);
            } else if (!item.children) {
              go(item.key);
            }
          }}
          onKeyDown={(e) => handleKey(e, () => {
            if (firstVisibleChild) {
              go(firstVisibleChild.key);
            } else if (!item.children) {
              go(item.key);
            }
          })}
        >
          <span style={{ fontSize: 17 }}>{item.icon ?? <span style={{ width: 17 }} />}</span>
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
          role="button"
          tabIndex={0}
          aria-expanded={open}
          className={`pmt-nav-item${isParentOpen ? " pmt-parent-open" : ""}`}
          style={{ justifyContent: "space-between" }}
          onClick={() => setOpen((v) => !v)}
          onKeyDown={(e) => handleKey(e, () => setOpen((v) => !v))}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 11, overflow: "hidden" }}>
            {item.icon != null && <span className="pmt-nav-icon">{item.icon}</span>}
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>
          </div>
          <span className={`pmt-nav-arrow${open ? " open" : ""}`}>
            <RightOutlined />
          </span>
        </div>

        {open && (
          <div className="pmt-children">
            {visibleChildren.map((child) => (
              <SidebarItem
                key={child.key}
                item={child}
                collapsed={false}
                depth={depth + 1}
                onNavigate={onNavigate}
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
        role="button"
        tabIndex={0}
        aria-current={isLeafActive ? "page" : undefined}
        className={`pmt-child-item${isLeafActive ? " pmt-active" : ""}`}
        onClick={() => go(item.key)}
        onKeyDown={(e) => handleKey(e, () => go(item.key))}
      >
        <span className="pmt-child-pip" />
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
      role="button"
      tabIndex={0}
      aria-current={isLeafActive ? "page" : undefined}
      className={`pmt-nav-item${isLeafActive ? " pmt-active" : ""}`}
      onClick={() => go(item.key)}
      onKeyDown={(e) => handleKey(e, () => go(item.key))}
    >
      {item.icon != null && <span className="pmt-nav-icon">{item.icon}</span>}
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [orgOpen, setOrgOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const isMobile = useIsMobile();
  const navigate  = useNavigate();
  const dark      = useDarkMode();
  const { user, permissions, logout } = useAuthStore();

  useEffect(() => {
    if (!isMobile) setMobileNavOpen(false);
  }, [isMobile]);

  const closeMobileNav = () => {
    if (isMobile) setMobileNavOpen(false);
  };

  const toggleSidebar = () => {
    if (isMobile) setMobileNavOpen((open) => !open);
    else setCollapsed((c) => !c);
  };

  const canViewWorkspaceCalendar = hasAnyPermission(user, permissions, [
    PERMS.CRM_FOLLOWUP_VIEW,
    PERMS.WORKSPACE_CALENDAR_VIEW,
  ]);

  const pageBg       = "var(--pmt-bg)";
  const headerBg     = "var(--pmt-surface)";
  const headerBorder = "var(--pmt-border)";
  const headerShadow = "var(--pmt-header-shadow)";
  const iconColor    = dark ? "#8c9ab0" : "#5a6a7e";

  const siderExpanded = isMobile ? true : !collapsed;
  const siderWidth = siderExpanded ? 240 : 64;
  const mainMargin = isMobile ? 0 : siderWidth;

  const visibleNavItems = [
    ...visibleTopDashboardNavItems(user, permissions),
    ...NAV_ITEMS_WITHOUT_DASHBOARD.filter((item) =>
      canSeeNavItem(item, user, permissions),
    ),
  ];

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

  return (
    <Layout style={{ minHeight: "100vh", background: pageBg }}>
      <a href="#pmt-main-content" className="pmt-skip-link">
        Skip to main content
      </a>

      {isMobile && mobileNavOpen && (
        <div
          className="pmt-mobile-backdrop visible"
          aria-hidden
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <Sider
        width={240}
        collapsedWidth={64}
        collapsed={!siderExpanded}
        trigger={null}
        className={`pmt-app-sider${isMobile && mobileNavOpen ? " pmt-app-sider--open" : ""}`}
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
          padding: siderExpanded ? "0 16px" : "0 14px",
          justifyContent: siderExpanded ? "flex-start" : "center",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
          gap: 10,
          overflow: "hidden",
        }}>
          <div style={{
            width: 34, height: 34,
            borderRadius: 9,
            background: "#1a73e8",
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
          {siderExpanded && (
            <div style={{ overflow: "hidden" }}>
              <div style={{
                color: "#fff", fontWeight: 700, fontSize: 14,
                lineHeight: 1.2, whiteSpace: "nowrap",
              }}>
                PMT
              </div>
              <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, whiteSpace: "nowrap" }}>
                Project Management
              </div>
            </div>
          )}
        </div>

        {/* ── Scrollable nav ── */}
        <div
          className="pmt-nav-scroll"
          style={{
            height: "calc(100vh - 64px)",
            overflowY: "auto",
            overflowX: "hidden",
            padding: "10px 0 24px",
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(255,255,255,0.1) transparent",
          }}
        >
          {siderExpanded && (
            <div className="pmt-section-label">Navigation</div>
          )}

          {visibleNavItems.map((item) => (
            <SidebarItem
              key={item.key}
              item={item}
              collapsed={!siderExpanded}
              onNavigate={closeMobileNav}
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
        height: "100vh",
      }}>

        {/* Header */}
        <Header
          className="pmt-app-header"
          style={{
            padding: "0 24px",
            background: headerBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: isMobile ? "wrap" : "nowrap",
            rowGap: 8,
            borderBottom: `1px solid ${headerBorder}`,
            height: 64,
            minHeight: 64,
            position: "sticky",
            top: 0,
            zIndex: 99,
            boxShadow: headerShadow,
          }}
        >
          <Space size={isMobile ? 8 : 16} style={{ minWidth: 0 }}>
            <Button
              type="text"
              aria-label={isMobile ? (mobileNavOpen ? "Close navigation" : "Open navigation") : (collapsed ? "Expand sidebar" : "Collapse sidebar")}
              icon={React.createElement(
                isMobile ? MenuUnfoldOutlined : (collapsed ? MenuUnfoldOutlined : MenuFoldOutlined),
                { style: { fontSize: 18, color: iconColor } },
              )}
              onClick={toggleSidebar}
            />
            {!isMobile && <GlobalSearch />}
          </Space>

          <Space size={isMobile ? 6 : 12} wrap className="pmt-header-actions-compact">
            {!isMobile && <ThemeToggle />}

            {!isMobile && canViewWorkspaceCalendar && (
              <Tooltip title="Workspace calendar">
                <button
                  type="button"
                  className="pmt-header-icon-btn"
                  aria-label="Workspace calendar"
                  onClick={() => setCalendarOpen(true)}
                >
                  <CalendarOutlined style={{ fontSize: 16, color: iconColor }} />
                </button>
              </Tooltip>
            )}

            {!isMobile && (
              <Tooltip title="Org Chart">
                <button
                  type="button"
                  className="pmt-header-icon-btn"
                  aria-label="Organisation chart"
                  onClick={() => setOrgOpen(true)}
                >
                  <ApartmentOutlined style={{ fontSize: 16, color: iconColor }} />
                </button>
              </Tooltip>
            )}

            <NotificationBell iconColor={iconColor} />

            <Dropdown
              menu={{ items: userMenu }}
              trigger={["click"]}
              placement="bottomRight"
            >
              <button
                type="button"
                aria-label="User menu"
                style={{
                  cursor: "pointer",
                  padding: isMobile ? "4px" : "4px 8px",
                  borderRadius: 8,
                  transition: "background 0.15s",
                  border: "none",
                  background: "transparent",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Space>
                  <Avatar
                    size={32}
                    src={user?.profile_picture_url || undefined}
                    icon={!user?.profile_picture_url ? <UserOutlined /> : undefined}
                    style={{ background: "var(--pmt-primary)", flexShrink: 0 }}
                  />
                  {!isMobile && (
                    <div className="pmt-user-name-block" style={{ lineHeight: 1.3, textAlign: "left" }}>
                      <Text style={{
                        fontSize: 13, fontWeight: 600, display: "block",
                        color: "var(--pmt-text)",
                      }}>
                        {user?.full_name || user?.username}
                      </Text>
                      <Text style={{ fontSize: 11, color: "var(--pmt-text-2)" }}>
                        {user?.designation || (user?.is_pmo ? "PMO" : user?.is_manager ? "Manager" : "Member")}
                      </Text>
                    </div>
                  )}
                </Space>
              </button>
            </Dropdown>
          </Space>
        </Header>

        {/* Page content */}
        <Content
          id="pmt-main-content"
          style={{
            background: pageBg,
            overflow: "auto",
            padding: 24,
            height: "calc(100vh - 64px)",
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
            <ApartmentOutlined style={{ color: "#1a73e8" }} />
            <span>Organisation Chart</span>
          </div>
        }
        destroyOnClose
      >
        <div style={{ height: "100%", overflow: "hidden" }}>
          <OrgChart />
        </div>
      </Modal>

      {canViewWorkspaceCalendar && (
        <WorkspaceCalendarModal
          open={calendarOpen}
          onClose={() => setCalendarOpen(false)}
        />
      )}
      <DailyDueNotification />
    </Layout>
  );
}
