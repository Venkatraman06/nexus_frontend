/**
 * PMT permission constants — must match backend/permissions.json names.
 * Grouped by category for navigation and guards.
 */
export const PERMS = {
  // Dashboard
  DASHBOARD_OWN:              "pmt.dashboard.own.view",
  DASHBOARD_PROJECT:          "pmt.dashboard.project.view",
  DASHBOARD_HRMS:             "pmt.dashboard.hrms.view",
  DASHBOARD_EXECUTIVE:        "pmt.dashboard.executive.view",

  // Master — HRMS
  MASTER_HRMS_VIEW:           "pmt.master.hrms.view",
  MASTER_HRMS_CREATE:         "pmt.master.hrms.create",
  MASTER_HRMS_UPDATE:         "pmt.master.hrms.update",
  MASTER_HRMS_DELETE:         "pmt.master.hrms.delete",

  // Master — Client
  MASTER_CLIENT_VIEW:         "pmt.master.client.view",
  MASTER_CLIENT_CREATE:       "pmt.master.client.create",
  MASTER_CLIENT_UPDATE:       "pmt.master.client.update",
  MASTER_CLIENT_DELETE:       "pmt.master.client.delete",

  // Master — Project
  MASTER_PROJECT_VIEW:        "pmt.master.project.view",
  MASTER_PROJECT_CREATE:      "pmt.master.project.create",
  MASTER_PROJECT_UPDATE:      "pmt.master.project.update",
  MASTER_PROJECT_DELETE:      "pmt.master.project.delete",

  // Master — Workflow
  MASTER_WORKFLOW_VIEW:       "pmt.master.workflow.view",
  MASTER_WORKFLOW_MANAGE:     "pmt.master.workflow.manage",

  // Role
  ROLE_VIEW:                  "pmt.role.view",
  ROLE_PERMISSION_ASSIGN:     "pmt.role.permission.assign",

  // HRMS — Employee
  HRMS_EMPLOYEE_VIEW:         "pmt.hrms.employee.view",
  HRMS_EMPLOYEE_CREATE:       "pmt.hrms.employee.create",
  HRMS_EMPLOYEE_UPDATE:       "pmt.hrms.employee.update",
  HRMS_EMPLOYEE_DELETE:       "pmt.hrms.employee.delete",
  HRMS_EMPLOYEE_SYNC:         "pmt.hrms.employee.sync",

  // HRMS — Attendance / Leave / Payroll / Compliance
  HRMS_ATTENDANCE_VIEW:       "pmt.hrms.attendance.view",
  HRMS_ATTENDANCE_MANAGE:     "pmt.hrms.attendance.manage",
  HRMS_LEAVE_VIEW:            "pmt.hrms.leave.view",
  HRMS_LEAVE_APPROVE:         "pmt.hrms.leave.approve",
  HRMS_LEAVE_MANAGE:          "pmt.hrms.leave.manage",
  HRMS_PAYROLL_VIEW:          "pmt.hrms.payroll.view",
  HRMS_PAYROLL_CREATE:        "pmt.hrms.payroll.create",
  HRMS_PAYROLL_UPDATE:        "pmt.hrms.payroll.update",
  HRMS_PAYROLL_DELETE:        "pmt.hrms.payroll.delete",
  HRMS_PAYROLL_APPROVE:       "pmt.hrms.payroll.approve",
  HRMS_COMPLIANCE_VIEW:       "pmt.hrms.compliance.view",
  HRMS_COMPLIANCE_CREATE:     "pmt.hrms.compliance.create",
  HRMS_COMPLIANCE_UPDATE:     "pmt.hrms.compliance.update",
  HRMS_COMPLIANCE_DELETE:     "pmt.hrms.compliance.delete",

  // Chat
  CHAT_VIEW:                  "pmt.chat.view",

  // Policy Document
  POLICY_VIEW:                "pmt.policy.view",
  POLICY_CREATE:              "pmt.policy.create",
  POLICY_UPDATE:              "pmt.policy.update",
  POLICY_DELETE:              "pmt.policy.delete",

  // Project MS
  PROJECT_VIEW:               "pmt.project.view",
  PROJECT_VIEW_ALL:           "pmt.project.view_all",
  PROJECT_CREATE:             "pmt.project.create",
  PROJECT_UPDATE:             "pmt.project.update",
  PROJECT_DELETE:             "pmt.project.delete",

  PROJECT_CLIENT_VIEW:        "pmt.project.client.view",
  PROJECT_CLIENT_CREATE:      "pmt.project.client.create",
  PROJECT_CLIENT_UPDATE:      "pmt.project.client.update",
  PROJECT_CLIENT_DELETE:      "pmt.project.client.delete",

  PROJECT_ALLOCATION_VIEW:    "pmt.project.allocation.view",
  PROJECT_ALLOCATION_CREATE:  "pmt.project.allocation.create",
  PROJECT_ALLOCATION_UPDATE:  "pmt.project.allocation.update",
  PROJECT_ALLOCATION_DELETE:  "pmt.project.allocation.delete",

  PROJECT_WORKITEM_VIEW:      "pmt.project.workitem.view",
  PROJECT_WORKITEM_CREATE:    "pmt.project.workitem.create",
  PROJECT_WORKITEM_UPDATE:    "pmt.project.workitem.update",
  PROJECT_WORKITEM_DELETE:    "pmt.project.workitem.delete",
  PROJECT_WORKITEM_TRANSITION:"pmt.project.workitem.transition",

  PROJECT_TICKET_VIEW:        "pmt.project.workitem.view",
  PROJECT_TICKET_CREATE:      "pmt.project.workitem.create",
  PROJECT_TICKET_UPDATE:      "pmt.project.workitem.update",
  PROJECT_TICKET_DELETE:      "pmt.project.workitem.delete",
  PROJECT_TICKET_TRANSITION:  "pmt.project.workitem.transition",

  PROJECT_TIMESHEET_VIEW:     "pmt.project.timesheet.view",
  PROJECT_TIMESHEET_CREATE:   "pmt.project.timesheet.create",
  PROJECT_TIMESHEET_UPDATE:   "pmt.project.timesheet.update",
  PROJECT_TIMESHEET_DELETE:   "pmt.project.timesheet.delete",
  PROJECT_TIMESHEET_SUBMIT:   "pmt.project.timesheet.submit",
  PROJECT_TIMESHEET_APPROVE:  "pmt.project.timesheet.approve",

  PROJECT_REPORT_UTILIZATION: "pmt.project.report.utilization",
  PROJECT_REPORT_PORTFOLIO:   "pmt.project.report.portfolio",
  PROJECT_REPORT_ALLOCATION:  "pmt.project.report.allocation",

  // Payment & Receivables
  PAYMENT_DASHBOARD_VIEW:     "pmt.payment.dashboard.view",
  PAYMENT_INVOICE_VIEW:       "pmt.payment.invoice.view",
  PAYMENT_INVOICE_CREATE:     "pmt.payment.invoice.create",
  PAYMENT_INVOICE_UPDATE:     "pmt.payment.invoice.update",
  PAYMENT_INVOICE_DELETE:     "pmt.payment.invoice.delete",
  PAYMENT_PAYMENT_VIEW:       "pmt.payment.payment.view",
  PAYMENT_PAYMENT_CREATE:     "pmt.payment.payment.create",
  PAYMENT_PAYMENT_UPDATE:     "pmt.payment.payment.update",
  PAYMENT_PAYMENT_DELETE:     "pmt.payment.payment.delete",

  // Finance Documents
  FINANCE_DOCUMENT_VIEW:   "pmt.finance.document.view",
  FINANCE_DOCUMENT_CREATE: "pmt.finance.document.create",
  FINANCE_DOCUMENT_UPDATE: "pmt.finance.document.update",
  FINANCE_DOCUMENT_DELETE: "pmt.finance.document.delete",

  // CRM — Company Expenses
  CRM_EXPENSE_VIEW:   "pmt.crm.expense.view",
  CRM_EXPENSE_CREATE: "pmt.crm.expense.create",
  CRM_EXPENSE_UPDATE: "pmt.crm.expense.update",
  CRM_EXPENSE_DELETE: "pmt.crm.expense.delete",
  CRM_EXPENSE_APPROVE:"pmt.crm.expense.approve",

  // CRM — Follow-up (also gates workspace To-Do)
  CRM_FOLLOWUP_VIEW:       "pmt.crm.followup.view",
  CRM_FOLLOWUP_VIEW_ALL:   "pmt.crm.followup.view_all",
  CRM_FOLLOWUP_CREATE:     "pmt.crm.followup.create",
  CRM_FOLLOWUP_UPDATE:     "pmt.crm.followup.update",
  CRM_FOLLOWUP_DELETE:     "pmt.crm.followup.delete",
  CRM_FOLLOWUP_TRANSITION: "pmt.crm.followup.transition",

  WORKSPACE_CALENDAR_VIEW:   "pmt.workspace.calendar.view",

  // Social Feed
  SOCIAL_FEED_VIEW:       "pmt.social_feed.view",
  SOCIAL_FEED_CREATE:     "pmt.social_feed.create",
  SOCIAL_FEED_UPDATE:     "pmt.social_feed.update",
  SOCIAL_FEED_DELETE:     "pmt.social_feed.delete",
  SOCIAL_FEED_TRANSITION: "pmt.social_feed.transition",
  SOCIAL_FEED_MANAGE:     "pmt.social_feed.manage",
} as const;

export type PmtPermission = (typeof PERMS)[keyof typeof PERMS];

/** Any master view permission (shows Master menu — data masters only). */
export const ANY_MASTER_VIEW: PmtPermission[] = [
  PERMS.MASTER_HRMS_VIEW,
  PERMS.MASTER_CLIENT_VIEW,
  PERMS.MASTER_PROJECT_VIEW,
];

/** Any payment view permission (shows Payment & AR menu). */
export const ANY_PAYMENT_VIEW: PmtPermission[] = [
  PERMS.PAYMENT_DASHBOARD_VIEW,
  PERMS.PAYMENT_INVOICE_VIEW,
  PERMS.PAYMENT_PAYMENT_VIEW,
];

/** Any workspace view permission (shows Workspace menu). */
export const ANY_WORKSPACE_VIEW: PmtPermission[] = [
  PERMS.CRM_FOLLOWUP_VIEW,
];

/** Any CRM view permission (shows CRM top-level menu). */
export const ANY_CRM_VIEW: PmtPermission[] = [
  PERMS.PROJECT_CLIENT_VIEW,
  PERMS.FINANCE_DOCUMENT_VIEW,
];

/** Any finance view permission (shows Finance menu). */
export const ANY_FINANCE_VIEW: PmtPermission[] = [
  PERMS.PAYMENT_DASHBOARD_VIEW,
  PERMS.PAYMENT_INVOICE_VIEW,
  PERMS.PAYMENT_PAYMENT_VIEW,
  PERMS.CRM_EXPENSE_VIEW,
];
