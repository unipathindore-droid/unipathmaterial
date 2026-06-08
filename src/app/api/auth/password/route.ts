import { NextResponse } from "next/server";

import { isInsForgeConfigured } from "@/lib/env";
import {
  AUTH_COOKIE_OPTIONS,
  createServerInsForgeClient,
  INSFORGE_ACCESS_COOKIE,
  INSFORGE_REFRESH_COOKIE,
  withInsForgeTimeout,
  writeAuditLog,
} from "@/lib/insforge/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const LOGIN_ERROR = "Unable to sign in with those credentials.";

export async function POST(request: Request) {
  if (!isInsForgeConfigured()) {
    return NextResponse.json({ ok: true });
  }

  const ip = getClientIp(request.headers);

  const body = (await request.json().catch(() => null)) as {
    email?: string;
    password?: string;
  } | null;

  const email = body?.email?.trim();
  const password = body?.password ?? "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }

  const rateLimit = checkRateLimit(`password:${ip}:${email.toLowerCase()}`, {
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many sign-in attempts. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  try {
  const insforge = createServerInsForgeClient();
  const { data, error } = await withInsForgeTimeout(
    insforge.auth.signInWithPassword({
      email,
      password,
    }),
    "InsForge password sign-in",
  );

  if (error || !data?.accessToken) {
    const message =
      error?.statusCode === 403
        ? "Your email is not verified yet. Open /verify-email, enter the 6-digit code from your inbox, and then sign in again."
        : LOGIN_ERROR;

    return NextResponse.json({ error: message }, { status: 401 });
  }

  const authenticatedClient = createServerInsForgeClient(data.accessToken);
  const { data: profile, error: profileError } = await withInsForgeTimeout(
    Promise.resolve(
      authenticatedClient.database
        .from("profiles")
        .select("id, is_active, approval_status")
        .eq("id", data.user.id)
        .single(),
    ),
    "InsForge login profile lookup",
  );

  if (profileError || !profile) {
    return NextResponse.json(
      {
        error:
          profileError?.message ??
          "Login succeeded, but your app profile is missing. Please contact the administrator.",
      },
      { status: 403 },
    );
  }

  if (!profile.is_active) {
    return NextResponse.json(
      { error: "Your account is inactive. Please contact the administrator." },
      { status: 403 },
    );
  }

  if (profile.approval_status !== "approved") {
    return NextResponse.json(
      {
        error:
          profile.approval_status === "rejected"
            ? "Your account request was rejected. Please contact the Super Admin."
            : "Your email is verified, but a Super Admin still needs to approve your login.",
      },
      { status: 403 },
    );
  }

  await withInsForgeTimeout(
    Promise.resolve(
      authenticatedClient.database
        .from("profiles")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", data.user.id),
    ),
    "InsForge last login update",
  ).catch(() => null);

  await withInsForgeTimeout(
    writeAuditLog(authenticatedClient, {
      actor_user_id: data.user.id,
      subject_user_id: data.user.id,
      action: "user.login",
      details: { method: "password" },
    }),
    "InsForge login audit log",
  ).catch(() => null);

  const response = NextResponse.json({ ok: true });

  response.cookies.set(INSFORGE_ACCESS_COOKIE, data.accessToken, {
    ...AUTH_COOKIE_OPTIONS,
    maxAge: 60 * 15,
  });

  if (data.refreshToken) {
    response.cookies.set(INSFORGE_REFRESH_COOKIE, data.refreshToken, {
      ...AUTH_COOKIE_OPTIONS,
      maxAge: 60 * 60 * 24 * 7,
    });
  }

  return response;
  } catch (error) {
    console.error("Password sign-in failed", error);
    return NextResponse.json(
      {
        error: "Unable to sign in right now. Please try again.",
      },
      { status: 504 },
    );
  }
}
