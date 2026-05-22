import { redirect } from "next/navigation";

import type { AppRole, UserProfile } from "@/types/domain";

export const ROLE_ACCESS = {
  dashboard: ["superadmin", "admin", "branch_admin", "sales", "phlebotomist", "material_team", "dispatch_manager"] satisfies AppRole[],
  users: ["superadmin"] satisfies AppRole[],
  clients: ["superadmin", "admin", "branch_admin"] satisfies AppRole[],
  materials: ["superadmin", "admin", "material_team"] satisfies AppRole[],
  requests: ["superadmin", "admin", "branch_admin", "sales", "phlebotomist"] satisfies AppRole[],
  approval: ["superadmin", "admin", "material_team"] satisfies AppRole[],
  dispatch: ["superadmin", "admin", "dispatch_manager"] satisfies AppRole[],
} as const;

export function canAccess(user: UserProfile | null, allowedRoles: AppRole[]) {
  if (!user) return false;
  return allowedRoles.includes(user.role);
}

export function assertRouteAccess(user: UserProfile | null, allowedRoles: AppRole[]) {
  if (!canAccess(user, allowedRoles)) {
    redirect("/dashboard");
  }
}
