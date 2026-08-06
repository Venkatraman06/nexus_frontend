import React, { useState, useEffect, useMemo } from "react";
import logoImage from "@/assets/logo-HIT.png";
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
  ContactsOutlined, RiseOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation, Outlet, useSearchParams } from "react-router-dom";
import ClientFormPage from "@/pages/clients/ClientFormPage";
import ProjectFormPage from "@/pages/projects/ProjectFormPage";
import { useAuthStore } from "@/store/auth";
import { PERMS, ANY_MASTER_VIEW, ANY_CRM_VIEW, ANY_FINANCE_VIEW, ANY_WORKSPACE_VIEW, type BmsPermission } from "@/constants/permissions";
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
      { key: "/employees/offboarding", icon: <LogoutOutlined />, label: "Offboarding", permission: PERMS.HRMS_OFFBOARDING_VIEW },
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
    children: [
      { key: "/workspace/dashboard",  icon: <DashboardOutlined />,   label: "Dashboard" },
      { key: "/workspace/todos",      icon: <OrderedListOutlined />, label: "To-Do" },
      { key: "/workspace/followups",  icon: <PhoneOutlined />,       label: "Follow-up" },
      { key: "/workspace/meetings",   icon: <CalendarOutlined />,    label: "Meetings" },
      { key: "/workspace/calendar",   icon: <CalendarOutlined />,    label: "Calendar" },
    ],
  },
  {
    key: "/crm",
    icon: <ShopOutlined />,
    label: "CRM",
    anyOf: ANY_CRM_VIEW,
    children: [
      { key: "/crm",                 icon: <ContactsOutlined />,   label: "Lead Management" },
      { key: "/sales",               icon: <RiseOutlined />,       label: "Sales" },
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
      { key: "/expenses",            icon: <CreditCardOutlined />,  label: "Expenses & Reimbursements", anyOf: [PERMS.DASHBOARD_OWN, PERMS.CRM_EXPENSE_VIEW] },
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
  .bms-nav-item {
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
  .bms-nav-item:hover {
    transform: translateX(2px);
    color: #ffffff;
    background: rgba(255,255,255,0.06);
  }
  .bms-nav-item:hover .bms-nav-icon {
    transform: scale(1.1);
  }
  .bms-nav-item.bms-active {
    background: var(--bms-primary, #1a73e8);
    color: #ffffff;
    font-weight: 500;
  }
  .bms-nav-item.bms-active .bms-nav-icon {
    transform: scale(1.05);
  }
  .bms-nav-item.bms-parent-open {
    background: rgba(26, 115, 232, 0.1);
    color: #ffffff;
    font-weight: 500;
    border-left: 3px solid var(--bms-primary);
    border-radius: 0 8px 8px 0;
    padding-left: 11px;
  }
  .bms-nav-item.bms-parent-open:hover {
    transform: translateX(3px);
  }
  .bms-nav-icon {
    font-size: 17px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    transition: transform 0.15s ease-in-out;
  }

  /* Child leaf items */
  .bms-child-item {
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
  .bms-child-item:hover {
    transform: translateX(3px);
    color: #ffffff;
    background: rgba(255,255,255,0.05);
  }

  .bms-child-item.bms-active {
    background: var(--bms-primary, #1a73e8);
    color: #ffffff;
    font-weight: 500;
  }

  .bms-child-pip {
    width: 3px;
    height: 14px;
    border-radius: 4px;
    background: rgba(255,255,255,0.12);
    flex-shrink: 0;
    transition: transform 0.15s ease, background 0.15s ease, height 0.15s ease;
  }
  .bms-child-item:hover .bms-child-pip {
    background: #8ab4f8;
    height: 18px;
  }
  .bms-child-item.bms-active .bms-child-pip {
    background: #ffffff;
    height: 18px;
  }

  /* Arrow rotation */
  .bms-nav-arrow {
    font-size: 9px;
    opacity: 0.5;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.15s ease;
    display: flex;
    align-items: center;
  }
  .bms-nav-item:hover .bms-nav-arrow {
    opacity: 0.8;
  }
  .bms-nav-arrow.open {
    transform: rotate(90deg);
  }

  /* Children container — thin connector line */
  .bms-children {
    margin-left: 20px;
    margin-right: 10px;
    border-left: 1px solid rgba(255,255,255,0.06);
    padding-left: 2px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow: hidden;
    max-height: 0;
    opacity: 0;
    margin-top: 0;
    margin-bottom: 0;
    transition: max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1),
                opacity 0.25s ease-in-out,
                margin 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .bms-children.expanded {
    max-height: 500px;
    opacity: 1;
    margin-top: 2px;
    margin-bottom: 4px;
  }

  /* Collapsed tooltip target */
  .bms-collapsed-item {
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
  .bms-collapsed-item:hover {
    transform: scale(1.08);
    color: #ffffff;
    background: rgba(255,255,255,0.07);
  }
  .bms-collapsed-item.bms-active {
    background: var(--bms-primary, #1a73e8);
    color: #ffffff;
  }

  /* Section label */
  .bms-section-label {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: rgba(255,255,255,0.22);
    padding: 16px 24px 6px;
    text-transform: uppercase;
  }

  /* Scrollbar */
  .bms-nav-scroll::-webkit-scrollbar { width: 3px; }
  .bms-nav-scroll::-webkit-scrollbar-track { background: transparent; }
  .bms-nav-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
  .bms-nav-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.18); }

  /* Header icon buttons */
  .bms-header-icon-btn {
    width: 34px; height: 34px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; border: 1px solid var(--bms-border);
    background: var(--bms-surface);
    transition: all 0.15s ease-in-out;
  }
  .bms-header-icon-btn:hover {
    background: var(--bms-primary-light);
    border-color: var(--bms-primary);
    transform: translateY(-1px);
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
  onNavigate,
  openParentKey,
  setOpenParentKey,
}: {
  item: NavItem;
  collapsed: boolean;
  depth?: number;
  onNavigate?: () => void;
  openParentKey?: string | null;
  setOpenParentKey?: (key: string | null) => void;
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

  const open = openParentKey === item.key;
  const setOpen = (v: boolean | ((prev: boolean) => boolean)) => {
    if (!setOpenParentKey) return;
    if (typeof v === "function") {
      const nextVal = v(open);
      setOpenParentKey(nextVal ? item.key : null);
    } else {
      setOpenParentKey(v ? item.key : null);
    }
  };

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
          className={`bms-collapsed-item${isLeafActive || isParentOpen ? " bms-active" : ""}`}
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
          className={`bms-nav-item${isParentOpen ? " bms-parent-open" : ""}`}
          style={{ justifyContent: "space-between" }}
          onClick={() => setOpen((v) => !v)}
          onKeyDown={(e) => handleKey(e, () => setOpen((v) => !v))}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 11, overflow: "hidden" }}>
            {item.icon != null && <span className="bms-nav-icon">{item.icon}</span>}
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>
          </div>
          <span className={`bms-nav-arrow${open ? " open" : ""}`}>
            <RightOutlined />
          </span>
        </div>

        <div className={`bms-children${open ? " expanded" : ""}`}>
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
        className={`bms-child-item${isLeafActive ? " bms-active" : ""}`}
        onClick={() => go(item.key)}
        onKeyDown={(e) => handleKey(e, () => go(item.key))}
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
      role="button"
      tabIndex={0}
      aria-current={isLeafActive ? "page" : undefined}
      className={`bms-nav-item${isLeafActive ? " bms-active" : ""}`}
      onClick={() => go(item.key)}
      onKeyDown={(e) => handleKey(e, () => go(item.key))}
    >
      {item.icon != null && <span className="bms-nav-icon">{item.icon}</span>}
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
  const [searchParams] = useSearchParams();
  const showAddClient = searchParams.get("add_client") === "true";
  const showAddProject = searchParams.get("add_project") === "true";
  const location = useLocation();
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

  const pageBg       = "var(--bms-bg)";
  const headerBg     = "var(--bms-surface)";
  const headerBorder = "var(--bms-border)";
  const headerShadow = "var(--bms-header-shadow)";
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

  const [openParentKey, setOpenParentKey] = useState<string | null>(() => {
    const activeParent = visibleNavItems.find(
      (item) => item.children && item.children.some((c) => isChildActive(c, location.pathname))
    );
    return activeParent ? activeParent.key : null;
  });

  useEffect(() => {
    const activeParent = visibleNavItems.find(
      (item) => item.children && item.children.some((c) => isChildActive(c, location.pathname))
    );
    setOpenParentKey(activeParent ? activeParent.key : null);
  }, [location.pathname]);

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
      <a href="#bms-main-content" className="bms-skip-link">
        Skip to main content
      </a>

      {isMobile && mobileNavOpen && (
        <div
          className="bms-mobile-backdrop visible"
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
        className={`bms-app-sider${isMobile && mobileNavOpen ? " bms-app-sider--open" : ""}`}
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
            background: "#ffffff",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
            transition: "transform 0.18s cubic-bezier(0.34,1.56,0.64,1)",
            cursor: "pointer",
          }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1.12) rotate(-4deg)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1) rotate(0deg)"; }}
          >
            <img src={logoImage} alt="Logo" width="28" height="28" style={{ objectFit: "contain" }} />
          </div>
          {siderExpanded && (
            <div style={{ overflow: "hidden" }}>
              <div style={{
                color: "#fff", fontWeight: 700, fontSize: 14,
                lineHeight: 1.2, whiteSpace: "nowrap",
              }}>
                BMS
              </div>
              <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, whiteSpace: "nowrap" }}>
                Business Management System
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
          {siderExpanded && (
            <div className="bms-section-label">Navigation</div>
          )}

          {visibleNavItems.map((item) => (
            <SidebarItem
              key={item.key}
              item={item}
              collapsed={!siderExpanded}
              onNavigate={closeMobileNav}
              openParentKey={openParentKey}
              setOpenParentKey={setOpenParentKey}
            />
          ))}

          <div style={{ height: 32 }} />
        </div>
      </Sider>

      {/* ── Main area ───────────────────────────────────────────────────── */}
      <Layout style={{
        marginLeft: mainMargin,
        transition: "margin-left 0.22s cubic-bezier(0.4,0,0.2,1)",
        background: pageBg,
        height: "100vh",
        minWidth: 0,
      }}>

        {/* Header */}
        <Header
          className="bms-app-header"
          style={{
            padding: isMobile ? "0 12px" : "0 24px",
            background: headerBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "nowrap",
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

          <Space size={isMobile ? 6 : 12} className="bms-header-actions-compact">
            <ThemeToggle />

            {!isMobile && canViewWorkspaceCalendar && (
              <Tooltip title="Workspace calendar">
                <button
                  type="button"
                  className="bms-header-icon-btn"
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
                  className="bms-header-icon-btn"
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
                    style={{ background: "var(--bms-primary)", flexShrink: 0 }}
                  />
                  {!isMobile && (
                    <div className="bms-user-name-block" style={{ lineHeight: 1.3, textAlign: "left" }}>
                      <Text style={{
                        fontSize: 13, fontWeight: 600, display: "block",
                        color: "var(--bms-text)",
                      }}>
                        {user?.full_name || user?.username}
                      </Text>
                      <Text style={{ fontSize: 11, color: "var(--bms-text-2)" }}>
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
          id="bms-main-content"
          style={{
            background: pageBg,
            overflow: "auto",
            padding: 24,
            height: "calc(100vh - 64px)",
          }}
        >
          <Outlet />
          {(showAddClient || showAddProject) && (
            <>
              <style>{`
                .ant-modal-root, .ant-drawer {
                  display: none !important;
                }
              `}</style>
              <div style={{
                position: 'fixed',
                top: 64,
                left: isMobile ? 0 : (siderExpanded ? 240 : 64),
                right: 0,
                bottom: 0,
                zIndex: 1040,
                background: pageBg,
                overflow: 'auto',
                padding: 24,
              }}>
                {showAddClient && <ClientFormPage />}
                {showAddProject && <ProjectFormPage />}
              </div>
            </>
          )}
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
