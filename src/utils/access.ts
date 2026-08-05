import type { BmsPermission } from "@/constants/permissions";
import { PERMS } from "@/constants/permissions";
import type { AuthUser } from "@/store/auth";

/** Staff / Django superuser bypass Keycloak permission checks. */
export function hasFullAccess(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  return !!(user.is_staff || user.is_superuser);
}

export function hasPermission(
  user: AuthUser | null | undefined,
  permissions: string[],
  permission: BmsPermission,
): boolean {
  if (!user) return false;
  if (hasFullAccess(user)) return true;
  return permissions.includes(permission);
}

export function hasAnyPermission(
  user: AuthUser | null | undefined,
  permissions: string[],
  anyOf: BmsPermission[],
): boolean {
  if (!user) return false;
  if (hasFullAccess(user)) return true;
  return anyOf.some((p) => permissions.includes(p));
}

export function hasAllPermissions(
  user: AuthUser | null | undefined,
  permissions: string[],
  allOf: BmsPermission[],
): boolean {
  if (!user) return false;
  if (hasFullAccess(user)) return true;
  return allOf.every((p) => permissions.includes(p));
}

/** Post-login / default route — Home (my-dashboard) for all users. */
export function resolveLandingPath(
  user: AuthUser | null | undefined,
  permissions: string[],
): string {
  if (hasPermission(user, permissions, PERMS.DASHBOARD_OWN)) return "/my-dashboard";
  if (hasPermission(user, permissions, PERMS.DASHBOARD_PROJECT)) return "/dashboard";
  if (hasPermission(user, permissions, PERMS.DASHBOARD_HRMS)) return "/hrms-dashboard";
  if (hasPermission(user, permissions, PERMS.DASHBOARD_EXECUTIVE)) return "/executive-dashboard";
  return "/my-dashboard";
}

export interface NavPermissionItem {
  permission?: BmsPermission;
  anyOf?: BmsPermission[];
  children?: NavPermissionItem[];
}

/** Whether a sidebar nav item (or any of its children) should be shown. */
export function canSeeNavItem(
  item: NavPermissionItem,
  user: AuthUser | null | undefined,
  permissions: string[],
): boolean {
  if (item.children?.length) {
    return item.children.some((c) => canSeeNavItem(c, user, permissions));
  }
  if (!user) return false;
  if (item.anyOf?.length) return hasAnyPermission(user, permissions, item.anyOf);
  if (!item.permission) return true;
  return hasPermission(user, permissions, item.permission);
}

export function masterCrudPerms(scope: "hrms" | "client" | "project") {
  if (scope === "hrms") {
    return {
      create: PERMS.MASTER_HRMS_CREATE,
      update: PERMS.MASTER_HRMS_UPDATE,
      delete: PERMS.MASTER_HRMS_DELETE,
    };
  }
  if (scope === "client") {
    return {
      create: PERMS.MASTER_CLIENT_CREATE,
      update: PERMS.MASTER_CLIENT_UPDATE,
      delete: PERMS.MASTER_CLIENT_DELETE,
    };
  }
  return {
    create: PERMS.MASTER_PROJECT_CREATE,
    update: PERMS.MASTER_PROJECT_UPDATE,
    delete: PERMS.MASTER_PROJECT_DELETE,
  };
}
