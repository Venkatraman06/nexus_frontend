import { get, post, patch, del, upload } from "./api";

const BASE = "/employees";

export interface SimpleDropdownEmployee {
  id: string;
  keycloak_id: string | null;
  email: string;
  full_name: string;
  employee_code: string;
  designation_name: string | null;
}

export interface Employee {
  id: string;
  keycloak_id: string | null;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  employee_code: string;
  designation: string;
  department: string;
  designation_ref: string | null;
  designation_name: string | null;
  department_ref: string | null;
  department_name: string | null;
  location: string | null;
  location_name: string | null;
  grade: string | null;
  grade_name: string | null;
  employment_type: string | null;
  employment_type_name: string | null;
  gender: string;
  date_of_birth: string | null;
  joining_date: string | null;
  phone_number: string;
  status: string;
  is_active: boolean;
  is_pmo: boolean;
  is_manager: boolean;
  is_staff: boolean;
  profile_picture: string | null;
  shift_applicable: boolean;
  keycloak_group: string;
  manager: string | null;
  manager_name: string | null;
  created_at: string;
}

export interface EmployeeDetail extends Employee {
  wfh_allowed: any;
  retirement_date: string | null;
  location_city: string | null;
  location_state: string | null;
  bio: string;
  company: string;
  total_experience: string | null;
  prior_experience: string | null;
  profile_picture_url: string | null;
  updated_at: string;
}

export interface EmployeeCreatePayload {
  username?: string;
  email: string;
  first_name: string;
  last_name: string;
  designation_ref?: string | null;
  department_ref?: string | null;
  location?: string | null;
  grade?: string | null;
  employment_type?: string | null;
  joining_date?: string | null;
  date_of_birth?: string | null;
  gender?: string;
  phone_number?: string;
  bio?: string;
  company?: string;
  total_experience?: number | null;
  prior_experience?: number | null;
  shift_applicable?: boolean;
  status?: string;
  keycloak_group?: string;
  is_pmo?: boolean;
  is_manager?: boolean;
  manager?: string | null;
  alternative_number?: string;
  address?: string;
  shift_category?: string | null;
  custom_shift_start?: string | null;
  custom_shift_end?: string | null;
}

export type EmployeeUpdatePayload = Omit<EmployeeCreatePayload, "username" | "email">;

export interface Certificate {
  id: string;
  employee: string;
  title: string;
  issuing_organization: string;
  issue_date: string | null;
  expiry_date: string | null;
  credential_id: string;
  file: string | null;
  file_url: string | null;
  created_at: string;
}

export const employeeApi = {
  list: (params?: Record<string, unknown>) =>
    get<any>(`${BASE}/`, params).then((r: any) => (Array.isArray(r) ? r : r.results ?? r)),
  listPaged: (params?: Record<string, unknown>) =>
    get<{ results: Employee[]; count: number }>(`${BASE}/`, params),
  get: (id: string) => get<EmployeeDetail>(`${BASE}/${id}/`),
  create: (data: EmployeeCreatePayload) => post<EmployeeDetail>(`${BASE}/`, data),
  update: (id: string, data: EmployeeUpdatePayload) => patch<EmployeeDetail>(`${BASE}/${id}/`, data),
  delete: (id: string) => del(`${BASE}/${id}/`),
  dropdown: () =>
    get<any>(`${BASE}/`, { dropdown: true, page_size: 500 }).then((r: any) =>
      Array.isArray(r) ? r : r.results ?? r
    ),
  simpleDropdown: () =>
    get<SimpleDropdownEmployee[]>(`${BASE}/simple-dropdown/`),
};

export const employeeGroupApi = {
  list: () => get<{ groups: string[] }>("/keycloak-groups/").then((r) => (r as any).groups ?? []),
};

export const certificateApi = {
  list: (employeeId: string) =>
    get<any>("/employee-certificates/", { employee: employeeId }).then((r: any) =>
      Array.isArray(r) ? r : r.results ?? r
    ),
  create: (formData: FormData) => upload<Certificate>("/employee-certificates/", formData),
  delete: (id: string) => del(`/employee-certificates/${id}/`),
};
