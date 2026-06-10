import { getAuthenticatedServerClient } from "@/lib/insforge/server";
import type { AppRole, UserProfile } from "@/types/domain";

type AuthorizedActor = Pick<
  UserProfile,
  | "id"
  | "full_name"
  | "email"
  | "role"
  | "branch_id"
  | "managed_branch_ids"
  | "permissions"
  | "is_active"
>;

export async function requireAuthorizedActor(allowedRoles: AppRole[]) {
  const authContext = await getAuthenticatedServerClient();

  if (!authContext?.user) {
    throw new Error("You must be signed in.");
  }

  const { data: actor } = await authContext.insforge.database
    .from("profiles")
    .select("id, full_name, email, role, branch_id, managed_branch_ids, permissions, is_active")
    .eq("id", authContext.user.id)
    .single();

  if (!actor || !actor.is_active) {
    throw new Error("Your account is deactivated. Contact admin.");
  }

  if (!allowedRoles.includes(actor.role as AppRole)) {
    throw new Error("You are not allowed to perform this action.");
  }

  return {
    authContext,
    actor: actor as AuthorizedActor,
  };
}

export function hasGlobalAccess(role: AppRole) {
  return role === "superadmin" || role === "admin";
}

export function canAccessBranch(
  actor: Pick<UserProfile, "role" | "branch_id" | "managed_branch_ids">,
  branchId: string,
) {
  if (actor.role === "superadmin") return true;
  if (actor.role === "admin") {
    const managed = actor.managed_branch_ids ?? [];
    return managed.length ? managed.includes(branchId) : true;
  }

  return actor.branch_id === branchId;
}

export function hasPermission(
  actor: Pick<UserProfile, "role" | "permissions">,
  permission: keyof NonNullable<UserProfile["permissions"]>,
) {
  if (actor.role === "superadmin" || actor.role === "admin") {
    return true;
  }

  return Boolean(actor.permissions?.[permission]);
}
