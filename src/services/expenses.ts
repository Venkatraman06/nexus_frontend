import { get, post, patch, del } from "./api";
import { ENDPOINTS } from "@/constants/api";

export interface ExpenseListItem {
  id: string;
  expense_number: string;
  date: string;
  category: string;
  category_label: string;
  description: string;
  amount: number;
  paid_by: string;
  paid_by_name: string;
  project: string | null;
  project_name: string | null;
  project_code: string | null;
  client: string | null;
  client_name: string | null;
  payment_mode: string;
  payment_mode_label: string;
  reference_number: string;
  status: string;
  status_label: string;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface ExpenseDetail extends ExpenseListItem {
  attachment: string | null;
  rejection_reason: string;
  notes: string;
  is_active: boolean;
  updated_at: string;
}

export interface ExpenseCreate {
  date: string;
  category: string;
  description: string;
  amount: number;
  paid_by: string;
  project?: string | null;
  client?: string | null;
  payment_mode: string;
  reference_number?: string;
  notes?: string;
}

export interface ExpenseSummary {
  total_amount: number;
  total_count: number;
  by_status: Record<string, { count: number; amount: number }>;
}

export interface ExpenseListResponse {
  summary: ExpenseSummary;
  results: ExpenseListItem[];
  count: number;
}

export const expenseApi = {
  list: (params?: Record<string, string>) =>
    get<ExpenseListResponse>(ENDPOINTS.CRM_EXPENSES, params),

  retrieve: (id: string) =>
    get<ExpenseDetail>(`${ENDPOINTS.CRM_EXPENSES}${id}/`),

  create: (data: ExpenseCreate) =>
    post<ExpenseDetail>(ENDPOINTS.CRM_EXPENSES, data),

  update: (id: string, data: Partial<ExpenseCreate>) =>
    patch<ExpenseDetail>(`${ENDPOINTS.CRM_EXPENSES}${id}/`, data),

  delete: (id: string) =>
    del(`${ENDPOINTS.CRM_EXPENSES}${id}/`),

  submit: (id: string) =>
    post<ExpenseDetail>(`${ENDPOINTS.CRM_EXPENSES}${id}/submit/`, {}),

  approve: (id: string) =>
    post<ExpenseDetail>(`${ENDPOINTS.CRM_EXPENSES}${id}/approve/`, {}),

  reject: (id: string, reason: string) =>
    post<ExpenseDetail>(`${ENDPOINTS.CRM_EXPENSES}${id}/reject/`, { reason }),

  reimburse: (id: string) =>
    post<ExpenseDetail>(`${ENDPOINTS.CRM_EXPENSES}${id}/reimburse/`, {}),

  summary: () =>
    get<{
      total_all_time: number;
      total_this_month: number;
      pending_approval: { count: number; amount: number };
      by_category: Array<{ category: string; count: number; amount: number }>;
    }>(ENDPOINTS.CRM_EXPENSE_SUMMARY),
};
