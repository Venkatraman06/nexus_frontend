import { get, put } from "./api";

export interface PermissionItem {
  name: string;
  description: string;
  label: string;
}

export interface PermissionCategory {
  category: string;
  category_label: string;
  permissions: PermissionItem[];
}

export interface RoleSummary {
  id: string;
  name: string;
  path: string;
  users_assigned: number;
  status: string;
}

export interface RoleDetail extends RoleSummary {
  description: string;
  permissions: string[];
  categories: PermissionCategory[];
}

export const rolesApi = {
  list: () =>
    get<{ count: number; results: RoleSummary[] }>("/roles/"),

  get: (roleId: string) =>
    get<RoleDetail>(`/roles/${roleId}/`),

  catalog: () =>
    get<{ categories: PermissionCategory[] }>("/permissions/catalog/"),

  updatePermissions: (roleId: string, permissions: string[]) =>
    put<{ message: string; permissions: string[] }>(
      `/roles/${roleId}/permissions/`,
      { permissions },
    ),
};
