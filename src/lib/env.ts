const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const insforgeUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
const insforgeAnonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY ?? process.env.INSFORGE_ANON_KEY;
const superAdminEmail = process.env.SUPER_ADMIN_EMAIL ?? "unipath.indore@gmail.com";

export function isSupabaseConfigured() {
  return Boolean(publicUrl && publicAnonKey);
}

export function getSupabaseEnv() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return {
    url: publicUrl!,
    anonKey: publicAnonKey!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

export function isInsForgeConfigured() {
  return Boolean(insforgeUrl && insforgeAnonKey);
}

export function getInsForgeEnv() {
  if (!isInsForgeConfigured()) {
    throw new Error(
      "Missing InsForge environment variables. Set NEXT_PUBLIC_INSFORGE_URL and NEXT_PUBLIC_INSFORGE_ANON_KEY.",
    );
  }

  return {
    url: insforgeUrl!,
    anonKey: insforgeAnonKey!,
  };
}

export function getSuperAdminEmail() {
  return superAdminEmail;
}
