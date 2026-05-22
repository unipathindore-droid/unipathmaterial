"use server";

import { redirect } from "next/navigation";

import { getAuthenticatedServerClient, clearAuthCookies } from "@/lib/insforge/server";

export async function markNotificationRead(notificationId: string) {
  const authContext = await getAuthenticatedServerClient();

  if (!authContext) {
    return { ok: false };
  }

  const { error } = await authContext.insforge.database
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId);

  return { ok: !error };
}

export async function signOutAction() {
  await clearAuthCookies();
  redirect("/login");
}
