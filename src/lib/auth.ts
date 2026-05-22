import { cache } from "react";

import { getAuthenticatedServerClient } from "@/lib/insforge/server";
import type { UserProfile } from "@/types/domain";

async function getProfileRecord(): Promise<UserProfile | null> {
  const authContext = await getAuthenticatedServerClient();

  if (!authContext?.user) return null;

  const { data, error } = await authContext.insforge.database
    .from("profiles")
    .select(
      "id, full_name, email, role, branch_id, is_active, approval_status, invited_by, approved_by, approved_at, email_verified_at, last_login_at, branch:branches(id, name, code, city)",
    )
    .eq("id", authContext.user.id)
    .single();

  if (error || !data) return null;

  const branch = Array.isArray(data.branch) ? data.branch[0] ?? null : data.branch ?? null;

  return {
    ...(data as Omit<UserProfile, "branch">),
    branch,
  };
}

export const getCurrentUserProfileRecord = cache(getProfileRecord);

export const getCurrentUserProfile = cache(async (): Promise<UserProfile | null> => {
  const profile = await getProfileRecord();

  if (!profile || !profile.is_active || profile.approval_status !== "approved") {
    return null;
  }

  return profile;
});
