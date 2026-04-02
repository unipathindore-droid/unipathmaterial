import type { AppRole } from "@/types/domain";
import type { TranslationKey } from "@/lib/i18n";

export const APP_NAME = "UniPath SupplyOS";

export const ROLE_LABEL_KEYS: Record<AppRole, TranslationKey> = {
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
  { href: "/dashboard", labelKey: "nav.dashboard", roles: ["admin", "branch_admin", "material_team", "dispatch_manager"] },
  { href: "/clients", labelKey: "nav.clients", roles: ["admin", "branch_admin"] },
  { href: "/materials", labelKey: "nav.materials", roles: ["admin", "material_team"] },
  { href: "/requests", labelKey: "nav.requests", roles: ["admin", "branch_admin", "sales", "phlebotomist"] },
  { href: "/approval", labelKey: "nav.approval", roles: ["admin", "material_team"] },
  { href: "/dispatch", labelKey: "nav.dispatch", roles: ["admin", "dispatch_manager"] },
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
