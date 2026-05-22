import type { AppRole } from "@/types/domain";
import type { TranslationKey } from "@/lib/i18n";

export const APP_NAME = "UniPath SupplyOS";

export const ROLE_LABEL_KEYS: Record<AppRole, TranslationKey> = {
  superadmin: "role.superadmin",
  admin: "role.admin",
  branch_admin: "role.branch_admin",
  sales: "role.sales",
  phlebotomist: "role.phlebotomist",
  material_team: "role.material_team",
  dispatch_manager: "role.dispatch_manager",
} as const;

export const NAV_ITEMS: ReadonlyArray<{
  href: string;
  labelKey: TranslationKey;
  roles: AppRole[];
}> = [
  { href: "/dashboard", labelKey: "nav.dashboard", roles: ["superadmin", "admin", "branch_admin", "sales", "phlebotomist", "material_team", "dispatch_manager"] },
  { href: "/users", labelKey: "nav.users", roles: ["superadmin"] },
  { href: "/clients", labelKey: "nav.clients", roles: ["superadmin", "admin", "branch_admin"] },
  { href: "/materials", labelKey: "nav.materials", roles: ["superadmin", "admin", "material_team"] },
  { href: "/requests", labelKey: "nav.requests", roles: ["superadmin", "admin", "branch_admin", "sales", "phlebotomist"] },
  { href: "/approval", labelKey: "nav.approval", roles: ["superadmin", "admin", "material_team"] },
  { href: "/dispatch", labelKey: "nav.dispatch", roles: ["superadmin", "admin", "dispatch_manager"] },
] as const;

export const NOTIFICATION_CHANNELS = {
  INTERNAL: "internal",
  CLIENT_EMAIL: "client_email",
} as const;

export const REQUEST_STATUSES = [
  "draft",
  "submitted",
  "partially_approved",
  "approved",
  "rejected",
  "dispatched",
  "delivered",
] as const;
