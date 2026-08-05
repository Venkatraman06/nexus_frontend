import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { PERMS } from "@/constants/permissions";
import { get } from "@/services/api";
import { resolveLandingPath } from "@/utils/access";
import AppLayout from "@/components/layout/AppLayout";
import RequirePermission from "@/components/common/RequirePermission";
import LoginPage from "@/pages/auth/LoginPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import VerifyCodePage from "@/pages/auth/VerifyCodePage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
import SetPasswordPage from "@/pages/auth/SetPasswordPage";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import ProjectsPage from "@/pages/projects/ProjectsPage";
import ProjectDetailPage from "@/pages/projects/ProjectDetailPage";
import TicketsPage from "@/pages/tickets/TicketsPage";
import TicketDetailPage from "@/pages/tickets/TicketDetailPage";
import MyTimesheetPage from "@/pages/timesheets/MyTimesheetPage";
import ReportingTimesheetPage from "@/pages/timesheets/ReportingTimesheetPage";
import AllocationPage from "@/pages/allocation/AllocationPage";
import EmployeesPage from "@/pages/employees/EmployeesPage";
import EmployeeDetailPage from "@/pages/employees/EmployeeDetailPage";
import ReportsPage from "@/pages/reports/ReportsPage";
import ClientPage from "@/pages/clients/ClientPage";
import MasterPage from "@/pages/master/MasterPage";
import EmployeeDashboardPage from "@/pages/dashboard/EmployeeDashboardPage";
import HRMSDashboardPage from "@/pages/dashboard/HRMSDashboardPage";
import LeaveRequestsPage from "@/pages/employees/LeaveRequestsPage";
import PayrollPage from "@/pages/employees/PayrollPage";
import AttendanceTrackerPage from "@/pages/attendance/AttendanceTrackerPage";
import SettingsPage from "@/pages/settings/SettingsPage";
import RoleManagementPage from "@/pages/settings/RoleManagementPage";
import RoleDetailPage from "@/pages/settings/RoleDetailPage";
import HRCompliancePage from "@/pages/employees/HRCompliancePage";
import PolicyDocumentsPage from "@/pages/policies/PolicyDocumentsPage";
import FinanceListPage from "@/pages/finance/FinanceListPage";
import FinanceFormPage from "@/pages/finance/FinanceFormPage";
import PaymentDashboardPage from "@/pages/payment/PaymentDashboardPage";
import InvoiceListPage from "@/pages/payment/InvoiceListPage";
import InvoiceDetailPage from "@/pages/payment/InvoiceDetailPage";
import PaymentListPage from "@/pages/payment/PaymentListPage";
import MilestoneListPage from "@/pages/payment/MilestoneListPage";
import ReceivableSummaryPage from "@/pages/payment/ReceivableSummaryPage";
import ExpensesPage from "@/pages/expenses/ExpensesPage";
import FollowUpsPage from "@/pages/followups/FollowUpsPage";
import ExecutiveDashboardPage from "@/pages/dashboard/ExecutiveDashboardPage";
import MyLeavesPage from "@/pages/employees/MyLeavesPage";
function RequireAuth({ children }: { children: React.ReactNode }) {
  const token       = useAuthStore((s) => s.token);
  const user        = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);
  const setUser     = useAuthStore((s) => s.setUser);
  const setPerms    = useAuthStore((s) => s.setPermissions);

  // Re-hydrate profile/permissions after reload or when cached user is missing last_login.
  useEffect(() => {
    const needsRefresh =
      token && (
        permissions.length === 0
        || !permissions.includes(PERMS.DASHBOARD_OWN)
        || user?.last_login == null
      );
    if (needsRefresh) {
      get<any>("/users/me/")
        .then((me) => { setUser(me); setPerms(me.permissions ?? []); })
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function DefaultLanding() {
  const user = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);
  return <Navigate to={resolveLandingPath(user, permissions)} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/verify-code" element={<VerifyCodePage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/set-password" element={<SetPasswordPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<DefaultLanding />} />
        <Route path="executive-dashboard" element={<RequirePermission permission={PERMS.DASHBOARD_EXECUTIVE}><ExecutiveDashboardPage /></RequirePermission>} />
        <Route path="dashboard" element={<RequirePermission permission={PERMS.DASHBOARD_PROJECT}><DashboardPage /></RequirePermission>} />
        <Route path="hrms-dashboard" element={<RequirePermission permission={PERMS.DASHBOARD_HRMS}><HRMSDashboardPage /></RequirePermission>} />
        <Route path="my-dashboard" element={<RequirePermission permission={PERMS.DASHBOARD_OWN}><EmployeeDashboardPage /></RequirePermission>} />
        <Route path="my-leaves" element={<RequirePermission permission={PERMS.DASHBOARD_OWN}><MyLeavesPage /></RequirePermission>} />
        <Route path="employees" element={<RequirePermission permission={PERMS.HRMS_EMPLOYEE_VIEW}><EmployeesPage /></RequirePermission>} />
        <Route path="employees/leave-requests" element={<RequirePermission permission={PERMS.HRMS_LEAVE_VIEW}><LeaveRequestsPage /></RequirePermission>} />
        <Route path="employees/payroll" element={<RequirePermission permission={PERMS.HRMS_PAYROLL_VIEW}><PayrollPage /></RequirePermission>} />
        <Route path="attendance/tracker" element={<RequirePermission permission={PERMS.HRMS_ATTENDANCE_VIEW}><AttendanceTrackerPage /></RequirePermission>} />
        <Route path="employees/:id" element={<RequirePermission permission={PERMS.HRMS_EMPLOYEE_VIEW}><EmployeeDetailPage /></RequirePermission>} />
        <Route path="clients" element={<RequirePermission permission={PERMS.PROJECT_CLIENT_VIEW}><ClientPage /></RequirePermission>} />
        <Route path="projects" element={<RequirePermission permission={PERMS.PROJECT_VIEW}><ProjectsPage /></RequirePermission>} />
        <Route path="projects/:id" element={<RequirePermission permission={PERMS.PROJECT_VIEW}><ProjectDetailPage /></RequirePermission>} />
        <Route path="tickets" element={<RequirePermission permission={PERMS.PROJECT_TICKET_VIEW}><TicketsPage /></RequirePermission>} />
        <Route path="tickets/:id" element={<RequirePermission permission={PERMS.PROJECT_TICKET_VIEW}><TicketDetailPage /></RequirePermission>} />
        <Route path="allocation" element={<RequirePermission permission={PERMS.PROJECT_ALLOCATION_VIEW}><AllocationPage /></RequirePermission>} />
        <Route path="timesheets" element={<RequirePermission permission={PERMS.PROJECT_TIMESHEET_VIEW}><MyTimesheetPage /></RequirePermission>} />
        <Route path="timesheets/reporting" element={<RequirePermission permission={PERMS.PROJECT_TIMESHEET_APPROVE}><ReportingTimesheetPage /></RequirePermission>} />
        <Route path="reports" element={<RequirePermission anyOf={[PERMS.PROJECT_REPORT_UTILIZATION, PERMS.PROJECT_REPORT_PORTFOLIO, PERMS.PROJECT_REPORT_ALLOCATION]}><ReportsPage /></RequirePermission>} />
        <Route path="master" element={<Navigate to="/master/designation" replace />} />
        <Route path="master/designation" element={<RequirePermission permission={PERMS.MASTER_HRMS_VIEW}><MasterPage defaultTab="designation" /></RequirePermission>} />
        <Route path="master/department" element={<RequirePermission permission={PERMS.MASTER_HRMS_VIEW}><MasterPage defaultTab="department" /></RequirePermission>} />
        <Route path="master/location" element={<RequirePermission permission={PERMS.MASTER_HRMS_VIEW}><MasterPage defaultTab="location" /></RequirePermission>} />
        <Route path="master/grade" element={<RequirePermission permission={PERMS.MASTER_HRMS_VIEW}><MasterPage defaultTab="grade" /></RequirePermission>} />
        <Route path="master/employment-type" element={<RequirePermission permission={PERMS.MASTER_HRMS_VIEW}><MasterPage defaultTab="employment-type" /></RequirePermission>} />
        <Route path="master/shift-category" element={<RequirePermission permission={PERMS.MASTER_HRMS_VIEW}><MasterPage defaultTab="shift-category" /></RequirePermission>} />
        <Route path="master/rate-card" element={<RequirePermission permission={PERMS.MASTER_HRMS_VIEW}><MasterPage defaultTab="rate-card" /></RequirePermission>} />
        <Route path="master/client-category" element={<RequirePermission permission={PERMS.MASTER_CLIENT_VIEW}><MasterPage defaultTab="client-category" /></RequirePermission>} />
        <Route path="master/business-type" element={<RequirePermission permission={PERMS.MASTER_PROJECT_VIEW}><MasterPage defaultTab="business-type" /></RequirePermission>} />
        <Route path="master/billing-type" element={<RequirePermission permission={PERMS.MASTER_PROJECT_VIEW}><MasterPage defaultTab="billing-type" /></RequirePermission>} />
        <Route path="master/workflow" element={<RequirePermission permission={PERMS.MASTER_WORKFLOW_VIEW}><MasterPage defaultTab="workflow" /></RequirePermission>} />
        <Route path="employees/hr-compliance" element={<RequirePermission permission={PERMS.HRMS_COMPLIANCE_VIEW}><HRCompliancePage /></RequirePermission>} />
        <Route path="policy-documents" element={<RequirePermission permission={PERMS.POLICY_VIEW}><PolicyDocumentsPage /></RequirePermission>} />
        <Route path="finance/documents" element={<RequirePermission permission={PERMS.FINANCE_DOCUMENT_VIEW}><FinanceListPage /></RequirePermission>} />
        <Route path="finance/documents/new" element={<RequirePermission permission={PERMS.FINANCE_DOCUMENT_CREATE}><FinanceFormPage /></RequirePermission>} />
        <Route path="finance/documents/:id" element={<RequirePermission permission={PERMS.FINANCE_DOCUMENT_VIEW}><FinanceFormPage /></RequirePermission>} />
        {/* Payment & Receivables */}
        <Route path="payment/dashboard"          element={<RequirePermission permission={PERMS.PAYMENT_DASHBOARD_VIEW}><PaymentDashboardPage /></RequirePermission>} />
        <Route path="payment/invoices"           element={<RequirePermission permission={PERMS.PAYMENT_INVOICE_VIEW}><InvoiceListPage /></RequirePermission>} />
        <Route path="payment/invoices/:id"       element={<RequirePermission permission={PERMS.PAYMENT_INVOICE_VIEW}><InvoiceDetailPage /></RequirePermission>} />
        <Route path="payment/payments"           element={<RequirePermission permission={PERMS.PAYMENT_PAYMENT_VIEW}><PaymentListPage /></RequirePermission>} />
        <Route path="payment/milestones"         element={<RequirePermission permission={PERMS.PAYMENT_INVOICE_VIEW}><MilestoneListPage /></RequirePermission>} />
        <Route path="payment/receivables"        element={<RequirePermission permission={PERMS.PAYMENT_DASHBOARD_VIEW}><ReceivableSummaryPage /></RequirePermission>} />
        <Route path="payment/client-receivables" element={<Navigate to="/payment/receivables" replace />} />
        <Route path="payment/project-receivables" element={<Navigate to="/payment/receivables" replace />} />
        <Route path="expenses" element={<RequirePermission permission={PERMS.CRM_EXPENSE_VIEW}><ExpensesPage /></RequirePermission>} />
        <Route path="followups" element={<RequirePermission permission={PERMS.CRM_FOLLOWUP_VIEW}><FollowUpsPage /></RequirePermission>} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="settings/roles" element={<RequirePermission permission={PERMS.ROLE_VIEW}><RoleManagementPage /></RequirePermission>} />
        <Route path="settings/roles/:roleId" element={<RequirePermission permission={PERMS.ROLE_VIEW}><RoleDetailPage /></RequirePermission>} />
      </Route>
      <Route path="*" element={<DefaultLanding />} />
    </Routes>
  );
}
