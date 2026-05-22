import { createClient, type InsForgeClient } from "@insforge/sdk";
import { cookies } from "next/headers";

import { getInsForgeEnv, getSuperAdminEmail } from "@/lib/env";
import type { AppRole } from "@/types/domain";

export const INSFORGE_ACCESS_COOKIE = "insforge_access_token";
export const INSFORGE_REFRESH_COOKIE = "insforge_refresh_token";
export const INSFORGE_CODE_VERIFIER_COOKIE = "insforge_code_verifier";
const INSFORGE_REQUEST_TIMEOUT_MS = 10000;

const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export function createServerInsForgeClient(accessToken?: string): InsForgeClient {
  const { url, anonKey } = getInsForgeEnv();

  return createClient({
    baseUrl: url,
    anonKey,
    isServerMode: true,
    edgeFunctionToken: accessToken,
  });
}

export async function withInsForgeTimeout<T>(
  promise: Promise<T>,
  label: string,
  timeoutMs = INSFORGE_REQUEST_TIMEOUT_MS,
): Promise<T> {
  let timeoutId: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`${label} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export async function setAuthCookies(accessToken: string, refreshToken?: string | null) {
  const cookieStore = await cookies();

  cookieStore.set(INSFORGE_ACCESS_COOKIE, accessToken, {
    ...AUTH_COOKIE_OPTIONS,
    maxAge: 60 * 15,
  });

  if (refreshToken) {
    cookieStore.set(INSFORGE_REFRESH_COOKIE, refreshToken, {
      ...AUTH_COOKIE_OPTIONS,
      maxAge: 60 * 60 * 24 * 7,
    });
  }
}

export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(INSFORGE_ACCESS_COOKIE);
  cookieStore.delete(INSFORGE_REFRESH_COOKIE);
  cookieStore.delete(INSFORGE_CODE_VERIFIER_COOKIE);
}

export async function getServerAccessToken() {
  const cookieStore = await cookies();
  return cookieStore.get(INSFORGE_ACCESS_COOKIE)?.value ?? null;
}

export async function getAuthenticatedServerClient() {
  const accessToken = await getServerAccessToken();

  if (!accessToken) {
    return null;
  }

  const insforge = createServerInsForgeClient(accessToken);
  const { data, error } = await withInsForgeTimeout(
    insforge.auth.getCurrentUser(),
    "InsForge getCurrentUser",
  );

  if (error || !data?.user) {
    return null;
  }

  return {
    insforge,
    user: data.user,
  };
}

export async function setCodeVerifierCookie(codeVerifier: string) {
  const cookieStore = await cookies();
  cookieStore.set(INSFORGE_CODE_VERIFIER_COOKIE, codeVerifier, {
    ...AUTH_COOKIE_OPTIONS,
    maxAge: 60 * 10,
  });
}

export async function getCodeVerifierCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(INSFORGE_CODE_VERIFIER_COOKIE)?.value ?? null;
}

export async function clearCodeVerifierCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(INSFORGE_CODE_VERIFIER_COOKIE);
}

export async function writeAuditLog(
  insforge: InsForgeClient,
  entry: {
    actor_user_id: string | null;
    subject_user_id: string | null;
    action: string;
    details?: Record<string, unknown>;
  },
) {
  await insforge.database.from("audit_logs").insert([
    {
      actor_user_id: entry.actor_user_id,
      subject_user_id: entry.subject_user_id,
      action: entry.action,
      details: entry.details ?? {},
    },
  ]);
}

export async function ensureAppProfileForUser(
  user: {
    id: string;
    email?: string | null;
    profile?: { name?: string } | null;
    emailVerified?: boolean;
    metadata?: Record<string, unknown> | null;
  },
  accessToken?: string,
) {
  if (!user.email) {
    return;
  }

  const insforge = createServerInsForgeClient(accessToken);
  const isSuperAdmin = user.email.toLowerCase() === getSuperAdminEmail().toLowerCase();
  const now = new Date().toISOString();
  const { data: existingProfile } = await insforge.database
    .from("profiles")
    .select("role, approval_status, invited_by, approved_by, approved_at")
    .eq("id", user.id)
    .single();
  const assignedRole = typeof user.metadata?.assignedRole === "string" ? user.metadata.assignedRole : null;
  const nextRole: AppRole = isSuperAdmin
    ? "superadmin"
    : existingProfile?.role ??
      (assignedRole === "branch_admin" ||
      assignedRole === "sales" ||
      assignedRole === "phlebotomist" ||
      assignedRole === "material_team" ||
      assignedRole === "dispatch_manager" ||
      assignedRole === "admin"
        ? assignedRole
        : "admin");

  await insforge.database
    .from("profiles")
    .upsert(
      [
        {
          id: user.id,
          full_name: user.profile?.name?.trim() || user.email.split("@")[0],
          email: user.email,
          role: nextRole,
          branch_id: null,
          is_active: true,
          approval_status: existingProfile?.approval_status ?? (isSuperAdmin ? "approved" : "pending"),
          invited_by: existingProfile?.invited_by ?? null,
          approved_by: existingProfile?.approved_by ?? null,
          approved_at: existingProfile?.approved_at ?? (isSuperAdmin ? now : null),
          email_verified_at: user.emailVerified ? now : null,
        },
      ],
      {
        onConflict: "id",
      },
    );
}
