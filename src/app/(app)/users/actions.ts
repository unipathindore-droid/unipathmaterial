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

async function getManagerContext() {
  const { authContext, actor } = await requireAuthorizedActor(["superadmin", "admin"]);

  return { authContext, actor };
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

    const signupClient = createServerInsForgeClient();
    const { data, error } = await signupClient.auth.signUp({
      email,
      password,
      name: fullName,
    });

    if (error || !data?.user?.id) {
      return {
        ...initialState,
        error: error?.message ?? "Unable to create the user account.",
      };
    }

    const now = new Date().toISOString();
    const nextManagedBranches =
      role === "admin"
        ? managedBranchIds
        : branchId
          ? [branchId]
          : actor.branch_id
            ? [actor.branch_id]
            : [];

    const nextBranchId = role === "admin" ? branchId : branchId ?? actor.branch_id ?? null;

    const { error: profileError } = await authContext.insforge.database.from("profiles").upsert(
      [
        {
          id: data.user.id,
          full_name: fullName,
          email,
          mobile_number: mobileNumber || null,
          role,
          branch_id: nextBranchId,
          managed_branch_ids: nextManagedBranches,
          permissions,
          is_active: isActive,
          approval_status: "pending",
          invited_by: actor.id,
          approved_by: null,
          approved_at: null,
          email_verified_at: data.user.emailVerified ? now : null,
        },
      ],
      { onConflict: "id" },
    );

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
      success:
        "User created. Ask them to verify their email code first. After that, approve the account from the pending list.",
    };
  } catch (error) {
    return {
      ...initialState,
      error: error instanceof Error ? error.message : "Unable to create the user.",
    };
  }
}

export async function approveUserAction(formData: FormData) {
  const { authContext, actor } = await getManagerContext();
  const userId = String(formData.get("user_id") ?? "");

  if (!userId) {
    throw new Error("Missing user id.");
  }

  const { data: targetProfile, error: targetError } = await authContext.insforge.database
    .from("profiles")
    .select("id, role, branch_id")
    .eq("id", userId)
    .single();

  if (targetError || !targetProfile) {
    throw new Error(targetError?.message ?? "User not found.");
  }

  if (actor.role !== "superadmin" && targetProfile.role === "admin") {
    throw new Error("Admin users cannot approve another admin account.");
  }

  if (
    actor.role !== "superadmin" &&
    targetProfile.branch_id &&
    !canAccessBranch(actor, targetProfile.branch_id)
  ) {
    throw new Error("You can approve only users from your managed branches.");
  }

  await authContext.insforge.database
    .from("profiles")
    .update({
      approval_status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: actor.id,
      is_active: true,
    })
    .eq("id", userId);

  const requestHeaders = await headers();
  await writeAuditLog(authContext.insforge, {
    actor_user_id: actor.id,
    subject_user_id: userId,
    action: "user.approved",
    module_name: "users",
    record_id: userId,
    user_role: actor.role,
    ip_address: requestHeaders.get("x-forwarded-for") ?? null,
    device_info: requestHeaders.get("user-agent") ?? null,
    details: {},
  });

  revalidatePath("/users");
  revalidatePath("/dashboard");
}
