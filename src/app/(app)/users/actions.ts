"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { canAccessBranch, requireAuthorizedActor } from "@/app/(app)/action-utils";
import { createServerInsForgeClient, writeAuditLog } from "@/lib/insforge/server";
import type { AppRole, UserPermissionSet } from "@/types/domain";

type UserActionState = {
  error: string;
  success: string;
};

const initialState: UserActionState = {
  error: "",
  success: "",
};

const nonAdminRoles: AppRole[] = [
  "branch_admin",
  "sales",
  "phlebotomist",
  "material_team",
  "dispatch_manager",
];

const superAdminAssignableRoles: AppRole[] = ["admin", ...nonAdminRoles];
const adminAssignableRoles: AppRole[] = nonAdminRoles;
const adminManagedRoles = new Set<AppRole>(nonAdminRoles);

function parseBranchIds(raw: FormDataEntryValue | null) {
  const value = String(raw ?? "").trim();
  return value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function parsePermissions(formData: FormData): UserPermissionSet {
  return {
    view_materials: formData.get("permission_view_materials") === "on",
    manage_materials: formData.get("permission_manage_materials") === "on",
    view_dispatch: formData.get("permission_view_dispatch") === "on",
    manage_dispatch: formData.get("permission_manage_dispatch") === "on",
    manage_stock: formData.get("permission_manage_stock") === "on",
    view_reports: formData.get("permission_view_reports") === "on",
    create_requests: formData.get("permission_create_requests") === "on",
    manage_clients: formData.get("permission_manage_clients") === "on",
  };
}

function isUserAlreadyExistsError(error?: { message?: string | null; statusCode?: number | null } | null) {
  return error?.statusCode === 409 || error?.message?.toLowerCase().includes("already exists");
}

function canManageUser(actorRole: AppRole, targetRole: AppRole) {
  if (actorRole === "superadmin") {
    return true;
  }

  return adminManagedRoles.has(targetRole);
}

async function getManagerContext() {
  const { authContext, actor } = await requireAuthorizedActor(["superadmin", "admin"]);

  return { authContext, actor };
}

async function getTargetProfile(userId: string) {
  if (!userId) {
    throw new Error("Missing user id.");
  }

  const { authContext, actor } = await getManagerContext();
  const { data: targetProfile, error: targetError } = await authContext.insforge.database
    .from("profiles")
    .select("id, full_name, email, role, branch_id, is_active, approved_by, approved_at")
    .eq("id", userId)
    .single();

  if (targetError || !targetProfile) {
    throw new Error(targetError?.message ?? "User not found.");
  }

  if (!canManageUser(actor.role, targetProfile.role as AppRole)) {
    throw new Error("You are not allowed to manage this user.");
  }

  if (
    actor.role !== "superadmin" &&
    targetProfile.branch_id &&
    !canAccessBranch(actor, targetProfile.branch_id)
  ) {
    throw new Error("You can manage only users from your managed branches.");
  }

  return { authContext, actor, targetProfile };
}

export async function createUserAction(
  _: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  try {
    const { authContext, actor } = await getManagerContext();
    const fullName = String(formData.get("full_name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const mobileNumber = String(formData.get("mobile_number") ?? "").trim();
    const role = String(formData.get("role") ?? "") as AppRole;
    const branchId = String(formData.get("branch_id") ?? "").trim() || null;
    const managedBranchIds = parseBranchIds(formData.get("managed_branch_ids"));
    const isActive = String(formData.get("status") ?? "active") === "active";
    const permissions = parsePermissions(formData);

    const allowedRoles = actor.role === "superadmin" ? superAdminAssignableRoles : adminAssignableRoles;

    if (!fullName || !email || !password || !allowedRoles.includes(role)) {
      return { ...initialState, error: "Fill all fields and choose a valid role." };
    }

    if (password.length < 8) {
      return { ...initialState, error: "Password must be at least 8 characters." };
    }

    const nextManagedBranches =
      role === "admin"
        ? managedBranchIds
        : branchId
          ? [branchId]
          : actor.branch_id
            ? [actor.branch_id]
            : [];

    const nextBranchId = role === "admin" ? branchId : branchId ?? actor.branch_id ?? null;

    const existingProfile = await authContext.insforge.database
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingProfile.error) {
      return {
        ...initialState,
        error: existingProfile.error.message,
      };
    }

    if (existingProfile.data) {
      return {
        ...initialState,
        error: "A user profile already exists for this email. Use the existing user list.",
      };
    }

    const signupClient = createServerInsForgeClient();
    const { data, error } = await signupClient.auth.signUp({
      email,
      password,
      name: fullName,
    });

    if (error || !data?.user?.id) {
      if (isUserAlreadyExistsError(error)) {
        const repairProfile = await authContext.insforge.database
          .rpc("create_or_repair_user_profile", {
            p_email: email,
            p_full_name: fullName,
            p_mobile_number: mobileNumber || "",
            p_role: role,
            p_branch_id: nextBranchId,
            p_managed_branch_ids: nextManagedBranches,
            p_permissions: permissions,
            p_is_active: isActive,
            p_invited_by: actor.id,
          })
          .single();

        if (repairProfile.error) {
          return {
            ...initialState,
            error: `This email already has an auth account, but the profile could not be repaired: ${repairProfile.error.message}`,
          };
        }

        const repaired = (repairProfile.data as { repaired: boolean }).repaired;

        revalidatePath("/users");
        revalidatePath("/dashboard");

        return {
          error: "",
          success: repaired
            ? "Existing auth account repaired. The user can sign in immediately if active."
            : "A user already exists for this email. Check the existing users list.",
        };
      }

      return {
        ...initialState,
        error: error?.message ?? "Unable to create the user account.",
      };
    }

    const { error: profileError } = await authContext.insforge.database
      .rpc("create_or_repair_user_profile", {
        p_email: email,
        p_full_name: fullName,
        p_mobile_number: mobileNumber || "",
        p_role: role,
        p_branch_id: nextBranchId,
        p_managed_branch_ids: nextManagedBranches,
        p_permissions: permissions,
        p_is_active: isActive,
        p_invited_by: actor.id,
      })
      .single();

    if (profileError) {
      return {
        ...initialState,
        error: profileError.message,
      };
    }

    const requestHeaders = await headers();
    await writeAuditLog(authContext.insforge, {
      actor_user_id: actor.id,
      subject_user_id: data.user.id,
      action: "user.created",
      module_name: "users",
      record_id: data.user.id,
      new_value: {
        full_name: fullName,
        email,
        mobile_number: mobileNumber || null,
        role,
        branch_id: nextBranchId,
        managed_branch_ids: nextManagedBranches,
        permissions,
        is_active: isActive,
      },
      user_role: actor.role,
      ip_address: requestHeaders.get("x-forwarded-for") ?? null,
      device_info: requestHeaders.get("user-agent") ?? null,
      details: { email, role },
    });

    revalidatePath("/users");
    revalidatePath("/dashboard");

    return {
      error: "",
      success: "User created. They can sign in immediately with the password you set.",
    };
  } catch (error) {
    return {
      ...initialState,
      error: error instanceof Error ? error.message : "Unable to create the user.",
    };
  }
}

export async function resetUserPasswordAction(formData: FormData) {
  const userId = String(formData.get("user_id") ?? "");
  const password = String(formData.get("password") ?? "");

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const { authContext, actor, targetProfile } = await getTargetProfile(userId);
  const { error } = await authContext.insforge.database.rpc("admin_reset_user_password", {
    p_user_id: userId,
    p_new_password: password,
  });

  if (error) {
    throw new Error(error.message);
  }

  const requestHeaders = await headers();
  await writeAuditLog(authContext.insforge, {
    actor_user_id: actor.id,
    subject_user_id: userId,
    action: "user.password_reset",
    module_name: "users",
    record_id: userId,
    user_role: actor.role,
    ip_address: requestHeaders.get("x-forwarded-for") ?? null,
    device_info: requestHeaders.get("user-agent") ?? null,
    details: { email: targetProfile.email },
  });

  revalidatePath("/users");
  revalidatePath("/dashboard");
}

export async function setUserStatusAction(formData: FormData) {
  const userId = String(formData.get("user_id") ?? "");
  const nextStatus = String(formData.get("next_status") ?? "");

  if (nextStatus !== "active" && nextStatus !== "inactive") {
    throw new Error("Invalid user status.");
  }

  const { authContext, actor, targetProfile } = await getTargetProfile(userId);

  if (actor.id === userId && nextStatus === "inactive") {
    throw new Error("You cannot deactivate your own account.");
  }

  const nextActive = nextStatus === "active";
  const { error } = await authContext.insforge.database
    .from("profiles")
    .update({
      approval_status: "approved",
      approved_at: nextActive ? new Date().toISOString() : targetProfile.approved_at,
      approved_by: nextActive ? actor.id : targetProfile.approved_by,
      is_active: nextActive,
    })
    .eq("id", userId);

  if (error) {
    throw new Error(error.message);
  }

  const requestHeaders = await headers();
  await writeAuditLog(authContext.insforge, {
    actor_user_id: actor.id,
    subject_user_id: userId,
    action: nextActive ? "user.activated" : "user.deactivated",
    module_name: "users",
    record_id: userId,
    old_value: { is_active: targetProfile.is_active },
    new_value: { is_active: nextActive },
    user_role: actor.role,
    ip_address: requestHeaders.get("x-forwarded-for") ?? null,
    device_info: requestHeaders.get("user-agent") ?? null,
    details: { email: targetProfile.email },
  });

  revalidatePath("/users");
  revalidatePath("/dashboard");
}

export async function deleteUserAction(formData: FormData) {
  const userId = String(formData.get("user_id") ?? "");
  const { authContext, actor, targetProfile } = await getTargetProfile(userId);

  if (actor.id === userId) {
    throw new Error("You cannot delete your own account.");
  }

  const requestHeaders = await headers();
  await writeAuditLog(authContext.insforge, {
    actor_user_id: actor.id,
    subject_user_id: userId,
    action: "user.deleted",
    module_name: "users",
    record_id: userId,
    old_value: {
      full_name: targetProfile.full_name,
      email: targetProfile.email,
      role: targetProfile.role,
      is_active: targetProfile.is_active,
    },
    user_role: actor.role,
    ip_address: requestHeaders.get("x-forwarded-for") ?? null,
    device_info: requestHeaders.get("user-agent") ?? null,
    details: { email: targetProfile.email },
  });

  const { error } = await authContext.insforge.database.rpc("admin_delete_user", {
    p_user_id: userId,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/users");
  revalidatePath("/dashboard");
}
