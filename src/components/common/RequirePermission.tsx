import { useAuthStore } from "@/store/auth";
import type { PmtPermission } from "@/constants/permissions";
import { hasAnyPermission, hasPermission } from "@/utils/access";

interface Props {
  permission?: PmtPermission;
  anyOf?: PmtPermission[];
  children: React.ReactNode;
}

/**
 * Route guard — renders nothing when permission is missing (menu should already be hidden).
 */
export default function RequirePermission({ permission, anyOf, children }: Props) {
  const user = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);

  const allowed = (() => {
    if (!user) return false;
    if (permission) return hasPermission(user, permissions, permission);
    if (anyOf?.length) return hasAnyPermission(user, permissions, anyOf);
    return true;
  })();

  if (!allowed) return null;

  return <>{children}</>;
}
