import { cookies } from "next/headers";

import { DEFAULT_LANGUAGE, type AppLanguage, LANGUAGE_COOKIE } from "@/lib/i18n";

export async function getCurrentLanguage(): Promise<AppLanguage> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LANGUAGE_COOKIE)?.value;
  return value === "hi" ? "hi" : DEFAULT_LANGUAGE;
}
