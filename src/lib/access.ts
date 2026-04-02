import { redirect } from "next/navigation";

import type { AppRole, UserProfile } from "@/types/domain";

export const ROLE_ACCESS = {
  dashboard: ["admin", "branch_admin", "material_team", "dispatch_manager"] satisfies AppRole[],
  clients: ["admin", "branch_admin"] satisfies AppRole[],
  materials: ["admin", "material_team"] satisfies AppRole[],
  requests: ["admin", "branch_admin", "sales", "phlebotomist"] satisfies AppRole[],
  approval: ["admin", "material_team"] satisfies AppRole[],
  dispatch: ["admin", "dispatch_manager"] satisfies AppRole[],
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
