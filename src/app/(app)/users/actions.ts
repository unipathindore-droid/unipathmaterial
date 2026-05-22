"use server";

import { revalidatePath } from "next/cache";

import { getAuthenticatedServerClient, createServerInsForgeClient, writeAuditLog } from "@/lib/insforge/server";
import type { AppRole } from "@/types/domain";

type UserActionState = {
  error: string;
  success: string;
};

const initialState: UserActionState = {
  error: "",
  success: "",
};

const assignableRoles: AppRole[] = [
  "admin",
  "branch_admin",
  "sales",
  "phlebotomist",
  "material_team",
  "dispatch_manager",
];

async function getSuperAdminContext() {
  const authContext = await getAuthenticatedServerClient();

  if (!authContext?.user) {
    throw new Error("You must be signed in.");
  }

  const { data: actor } = await authContext.insforge.database
    .from("profiles")
    .select("id, role, full_name, email, approval_status, is_active")
    .eq("id", authContext.user.id)
    .single();

  if (!actor || actor.role !== "superadmin" || !actor.is_active || actor.approval_status !== "approved") {
    throw new Error("Only the Super Admin can manage users.");
  }

  return { authContext, actor };
}

export async function createUserAction(
  _: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  try {
    const { authContext, actor } = await getSuperAdminContext();
    const fullName = String(formData.get("full_name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const role = String(formData.get("role") ?? "") as AppRole;

    if (!fullName || !email || !password || !assignableRoles.includes(role)) {
      return { ...initialState, error: "Fill all fields and choose a valid role." };
    }

    if (password.length < 8) {
      return { ...initialState, error: "Temporary password must be at least 8 characters." };
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
    const { error: profileError } = await authContext.insforge.database.from("profiles").upsert(
      [
        {
          id: data.user.id,
          full_name: fullName,
          email,
          role,
          branch_id: null,
          is_active: true,
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

    await writeAuditLog(authContext.insforge, {
      actor_user_id: actor.id,
      subject_user_id: data.user.id,
      action: "user.invited",
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
  const { authContext, actor } = await getSuperAdminContext();
  const userId = String(formData.get("user_id") ?? "");

  if (!userId) {
    throw new Error("Missing user id.");
  }

  await authContext.insforge.database
    .from("profiles")
    .update({
      approval_status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: actor.id,
    })
    .eq("id", userId);

  await writeAuditLog(authContext.insforge, {
    actor_user_id: actor.id,
    subject_user_id: userId,
    action: "user.approved",
    details: {},
  });

  revalidatePath("/users");
  revalidatePath("/dashboard");
}
