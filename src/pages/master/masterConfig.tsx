import type { ReactNode } from "react";
import {
  ApartmentOutlined,
  BankOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  ClusterOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  IdcardOutlined,
  PartitionOutlined,
  ProjectOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { PERMS, type PmtPermission } from "@/constants/permissions";

export interface MasterItemDef {
  key: string;
  label: string;
  description: string;
  permission: PmtPermission;
  icon: ReactNode;
  accent: string;
}

export interface MasterCategoryDef {
  key: string;
  title: string;
  items: MasterItemDef[];
}

export const MASTER_CATEGORIES: MasterCategoryDef[] = [
  {
    key: "employee",
    title: "Employee Management",
    items: [
      { key: "designation", label: "Designation", description: "Job titles", permission: PERMS.MASTER_HRMS_VIEW, icon: <IdcardOutlined />, accent: "#3b82f6" },
      { key: "department", label: "Department", description: "Teams & structure", permission: PERMS.MASTER_HRMS_VIEW, icon: <ApartmentOutlined />, accent: "#8b5cf6" },
      { key: "employment-type", label: "Employment Type", description: "Full-time, contract & more", permission: PERMS.MASTER_HRMS_VIEW, icon: <TeamOutlined />, accent: "#0ea5e9" },
      { key: "location", label: "Location", description: "Offices & sites", permission: PERMS.MASTER_HRMS_VIEW, icon: <EnvironmentOutlined />, accent: "#14b8a6" },
    ],
  },
  {
    key: "attendance",
    title: "Attendance & Shifts",
    items: [
      { key: "shift-category", label: "Shifts", description: "Working hours", permission: PERMS.MASTER_HRMS_VIEW, icon: <ClockCircleOutlined />, accent: "#f59e0b" },
      { key: "holiday", label: "Holiday", description: "Calendar & types", permission: PERMS.MASTER_HRMS_VIEW, icon: <CalendarOutlined />, accent: "#10b981" },
    ],
  },
  {
    key: "policy",
    title: "Policy & Leave",
    items: [
      { key: "leave-type", label: "Leave Policy", description: "Types & balances", permission: PERMS.MASTER_HRMS_VIEW, icon: <FileTextOutlined />, accent: "#ec4899" },
    ],
  },
  {
    key: "payroll",
    title: "Payroll & Salary",
    items: [
      { key: "rate-card", label: "Rate Cards", description: "HR & billing rates", permission: PERMS.MASTER_HRMS_VIEW, icon: <DollarOutlined />, accent: "#10b981" },
    ],
  },
  {
    key: "client",
    title: "Client",
    items: [
      { key: "client-category", label: "Client Category", description: "Segment & classify", permission: PERMS.MASTER_CLIENT_VIEW, icon: <ClusterOutlined />, accent: "#06b6d4" },
    ],
  },
  {
    key: "project",
    title: "Project & Billing",
    items: [
      { key: "business-type", label: "Business Type", description: "Project categories", permission: PERMS.MASTER_PROJECT_VIEW, icon: <ProjectOutlined />, accent: "#2563eb" },
      { key: "billing-type", label: "Billing Type", description: "Fixed, T&M & more", permission: PERMS.MASTER_PROJECT_VIEW, icon: <BankOutlined />, accent: "#7c3aed" },
    ],
  },
  {
    key: "workflow",
    title: "Workflow",
    items: [
      { key: "workflow", label: "Workflow States", description: "Project & ticket flows", permission: PERMS.MASTER_WORKFLOW_VIEW, icon: <PartitionOutlined />, accent: "#ef4444" },
    ],
  },
];

export const MASTER_TAB_PERMISSIONS: Record<string, PmtPermission> = Object.fromEntries(
  MASTER_CATEGORIES.flatMap((cat) => cat.items.map((item) => [item.key, item.permission])),
);

export function getMasterItemDef(key: string): MasterItemDef | undefined {
  for (const cat of MASTER_CATEGORIES) {
    const item = cat.items.find((i) => i.key === key);
    if (item) return item;
  }
  return undefined;
}
