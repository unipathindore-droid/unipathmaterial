import { NextRequest, NextResponse } from "next/server";

import {
  clearAuthCookies,
  clearCodeVerifierCookie,
  createServerInsForgeClient,
  ensureAppProfileForUser,
  getCodeVerifierCookie,
  setAuthCookies,
  writeAuditLog,
} from "@/lib/insforge/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("insforge_code");
  const error = request.nextUrl.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL(`/login?error=${error ?? "oauth_failed"}`, request.url));
  }

  const codeVerifier = await getCodeVerifierCookie();

  if (!codeVerifier) {
    return NextResponse.redirect(new URL("/login?error=missing_verifier", request.url));
  }

  const insforge = createServerInsForgeClient();
  const { data, error: exchangeError } = await insforge.auth.exchangeOAuthCode(code, codeVerifier);

  if (exchangeError || !data?.accessToken || !data.user) {
    return NextResponse.redirect(
      new URL(`/login?error=${exchangeError?.message ?? "exchange_failed"}`, request.url),
    );
  }

  await setAuthCookies(data.accessToken, data.refreshToken);
  await ensureAppProfileForUser(data.user, data.accessToken);
  const authenticatedClient = createServerInsForgeClient(data.accessToken);
  const { data: profile } = await authenticatedClient.database
    .from("profiles")
    .select("id, approval_status, is_active")
    .eq("id", data.user.id)
    .single();

  await writeAuditLog(authenticatedClient, {
    actor_user_id: data.user.id,
    subject_user_id: data.user.id,
    action: "user.login",
    details: { method: "google" },
  });

  await clearCodeVerifierCookie();

  if (!profile || !profile.is_active || profile.approval_status !== "approved") {
    await clearAuthCookies();
    return NextResponse.redirect(new URL("/login?verified=1", request.url));
  }

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
