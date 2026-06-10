import { cache } from "react";

import { getAuthenticatedServerClient, withInsForgeTimeout } from "@/lib/insforge/server";
import type { UserProfile } from "@/types/domain";

async function getProfileRecord(): Promise<UserProfile | null> {
  const authContext = await getAuthenticatedServerClient();

  if (!authContext?.user) return null;

  const { data, error } = await withInsForgeTimeout(
    Promise.resolve(
      authContext.insforge.database
        .from("profiles")
        .select(
          "id, full_name, email, mobile_number, role, branch_id, managed_branch_ids, permissions, is_active, approval_status, invited_by, approved_by, approved_at, email_verified_at, last_login_at, branch:branches!profiles_branch_id_fkey(id, name, code, address, city, state, pincode, contact_person, contact_number, is_active, deleted_at)",
        )
        .eq("id", authContext.user.id)
        .single(),
    ),
    "InsForge profile lookup",
  );

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

  if (!profile || !profile.is_active) {
    return null;
  }

  return profile;
});
