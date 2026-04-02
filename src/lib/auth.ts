import { cache } from "react";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/types/domain";

export const getCurrentUserProfile = cache(async (): Promise<UserProfile | null> => {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, role, branch_id, branch:branches(id, name, code, city)",
    )
    .eq("id", user.id)
    .single();

  if (!data) return null;

  const branch = Array.isArray(data.branch) ? data.branch[0] ?? null : data.branch ?? null;

  return {
    ...(data as Omit<UserProfile, "branch">),
    branch,
  };
});
