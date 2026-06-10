"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { isInsForgeConfigured } from "@/lib/env";
import {
  clearAuthCookies,
  createServerInsForgeClient,
  setCodeVerifierCookie,
  setAuthCookies,
  writeAuditLog,
} from "@/lib/insforge/server";

type LoginState = {
  error: string;
  success?: boolean;
};

async function getAppBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

export async function signInAction(_: LoginState, formData: FormData): Promise<LoginState> {
  if (!isInsForgeConfigured()) {
    return { error: "", success: true };
  }

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const insforge = createServerInsForgeClient();
  const { data, error } = await insforge.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error || !data?.accessToken) {
    return { error: error?.message ?? "Sign in failed." };
  }

  await setAuthCookies(data.accessToken, data.refreshToken);

  const authenticatedClient = createServerInsForgeClient(data.accessToken);
  const { data: profile, error: profileError } = await authenticatedClient.database
    .from("profiles")
    .select("id, is_active")
    .eq("id", data.user.id)
    .single();

  if (profileError || !profile) {
    await clearAuthCookies();
    return {
      error:
        profileError?.message ??
        "Login succeeded, but your app profile is missing. Please contact the administrator.",
    };
  }

  if (!profile.is_active) {
    await clearAuthCookies();
    return { error: "Your account is deactivated. Contact admin." };
  }

  await authenticatedClient.database
    .from("profiles")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", data.user.id);

  await writeAuditLog(authenticatedClient, {
    actor_user_id: data.user.id,
    subject_user_id: data.user.id,
    action: "user.login",
    details: { method: "password" },
  });

  revalidatePath("/dashboard");

  return { error: "", success: true };
}

export async function initiateGoogleSignInAction() {
  if (!isInsForgeConfigured()) {
    redirect("/login");
  }

  const insforge = createServerInsForgeClient();
  const redirectTo = `${await getAppBaseUrl()}/api/auth/callback`;
  const { data, error } = await insforge.auth.signInWithOAuth({
    provider: "google",
    redirectTo,
    skipBrowserRedirect: true,
  });

  if (error || !data?.url || !data.codeVerifier) {
    redirect("/login?error=google_oauth_failed");
  }

  await setCodeVerifierCookie(data.codeVerifier);
  redirect(data.url);
}
