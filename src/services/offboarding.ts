import { get, post, patch, put } from "@/services/api";

export interface OffboardingPreferenceData {
  id?: string;
  offboarding?: string;
  preferred_last_working_day?: string | null;
  reason_for_leaving?: string;
  will_serve_notice_period?: boolean;
  feedback?: string;
  remarks?: string;
}

export interface OffboardingRecord {
  id: string;
  employee: string;
  employee_name: string;
  initiated_by?: string | null;
  initiated_by_name?: string | null;
  resignation_date: string | null;
  last_working_day: string | null;
  reason: string;
  status: string;
  status_display: string;
  remarks: string;
  preference?: OffboardingPreferenceData | null;
  created_at: string;
  updated_at: string;
}

export interface ClearanceNotifyPayload {
  owner_id: string;
  clearance_title: string;
  employee_name: string;
  offboarding_id: string;
  items: string[];
}

export const offboardingApi = {
  list: (params?: Record<string, string>) =>
    get<OffboardingRecord[]>("/offboarding/", params),

  create: (data: Partial<OffboardingRecord>) =>
    post<OffboardingRecord>("/offboarding/", data),

  get: (id: string) =>
    get<OffboardingRecord>(`/offboarding/${id}/`),

  update: (id: string, data: Partial<OffboardingRecord>) =>
    patch<OffboardingRecord>(`/offboarding/${id}/`, data),

  getPreference: (offboardingId: string) =>
    get<OffboardingPreferenceData | null>(`/offboarding/${offboardingId}/preference/`),

  // Backend PreferenceView uses PUT (not PATCH)
  savePreference: (offboardingId: string, data: OffboardingPreferenceData) =>
    put<OffboardingPreferenceData>(`/offboarding/${offboardingId}/preference/`, data),

  // Notify clearance owner via in-app notification
  clearanceNotify: (payload: ClearanceNotifyPayload) =>
    post<{ detail: string }>("/offboarding/clearance-notify/", payload),
};