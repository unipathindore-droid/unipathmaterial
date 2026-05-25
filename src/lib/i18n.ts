export const LANGUAGE_COOKIE = "app_lang";

export type AppLanguage = "en" | "hi";

export const DEFAULT_LANGUAGE: AppLanguage = "en";

const en = {
  "language.label": "Language",
  "language.english": "English",
  "language.hindi": "Hindi",
  "nav.dashboard": "Dashboard",
  "nav.users": "Users",
  "nav.branches": "Branches",
  "nav.clients": "Clients",
  "nav.materials": "Materials",
  "nav.requests": "Requests",
  "nav.approval": "Approval",
  "nav.dispatch": "Dispatch",
  "nav.stock_updates": "Stock Updates",
  "nav.reports": "Reports",
  "role.superadmin": "Super Admin",
  "role.admin": "Admin",
  "role.branch_admin": "Branch Admin",
  "role.sales": "Sales",
  "role.phlebotomist": "Sales / Phlebotomist",
  "role.material_team": "Material Team",
  "role.dispatch_manager": "Dispatch Manager",
  "shell.multi_branch": "System-wide access",
  "shell.branch_filtering": "Branch filtering, approval control, and audit logging enabled",
  "shell.unread_alerts": "unread alerts",
  "shell.switch_account": "Switch account",
  "notifications.title": "Notifications",
  "notifications.unread": "unread",
  "notifications.mark_all_read": "Mark all read",
  "notifications.read": "Read",
  "notifications.open": "Open",
  "notifications.empty": "No notifications yet.",
  "pages.dashboard.eyebrow": "Operations Dashboard",
  "pages.dashboard.title": "Manage approvals, stock visibility, and dispatch readiness in one place.",
  "pages.dashboard.description":
    "The operations console keeps branch activity visible for admins and surfaces stock, request, and dispatch signals before work slows down.",
  "pages.users.eyebrow": "User Management",
  "pages.users.title": "Create, approve, and manage branch access.",
  "pages.users.description":
    "Super Admin and Admin can create users, approve access after email verification, and keep every major change visible in the audit trail.",
  "pages.branches.eyebrow": "Branches",
  "pages.branches.title": "Create and govern branches with role-aware restrictions.",
  "pages.branches.description":
    "Only Super Admin and Admin can manage branches. Super Admin can control every branch, while Admin can work only on assigned branches when restrictions are enabled.",
  "pages.clients.eyebrow": "Clients",
  "pages.clients.title": "Manage branch-linked pathology clients.",
  "pages.clients.description":
    "Track client ownership, branch mapping, contact details, and operational status for every pathology partner.",
  "pages.materials.eyebrow": "Materials",
  "pages.materials.title": "Material master and branch-wise stock management.",
  "pages.materials.description":
    "Maintain material codes, categories, stock thresholds, and branch allocations with manual edits plus Excel upload and export.",
  "pages.requests.eyebrow": "Requests",
  "pages.requests.title": "Track material demand from request to fulfilment.",
  "pages.requests.description":
    "Capture branch demand, client linkage, urgency, required-by dates, and request progress with operational visibility.",
  "pages.approval.eyebrow": "Approval",
  "pages.approval.title": "Review full and partial approvals with clear audit reasons.",
  "pages.approval.description":
    "Approvers can allow partial allocations when stock is constrained, and the rationale stays visible for traceability.",
  "pages.dispatch.eyebrow": "Dispatch",
  "pages.dispatch.title": "Move materials by person, bus, or courier with delivery tracking.",
  "pages.dispatch.description":
    "Track dispatch source, destination, transport details, quantity, and delivery confirmation with branch-aware access control.",
  "pages.stock_updates.eyebrow": "Monthly Stock",
  "pages.stock_updates.title": "Record monthly branch stock updates with history and Excel support.",
  "pages.stock_updates.description":
    "Capture opening, received, used, damaged, and closing stock month by month and keep the branch history export-ready.",
  "pages.reports.eyebrow": "Reports",
  "pages.reports.title": "Review stock, dispatch, activity, upload, and deletion reports.",
  "pages.reports.description":
    "Branch stock, monthly stock, usage, low stock, dispatch movement, user activity, upload history, and deleted material logs are available in one reporting surface.",
  "login.badge": "UniPath SupplyOS",
  "login.hero_title": "Simple access control for UniPath operations.",
  "login.hero_description":
    "Super Admin creates users, users verify email, approvals happen inside the app, and every important action is written to the audit log.",
  "login.sign_in": "Sign In",
  "login.console_title": "Access your operations console",
  "login.console_description": "Sign in with your approved UniPath account credentials.",
  "login.highlights.role.title": "Role-aware controls",
  "login.highlights.role.description":
    "Super Admin and Admin manage access, while branch teams work only inside the permissions they are given.",
  "login.highlights.dispatch.title": "Approval workflow",
  "login.highlights.dispatch.description":
    "Users verify email first, then Admin or Super Admin approval unlocks access.",
  "login.highlights.alerts.title": "Actionable alerts",
  "login.highlights.alerts.description":
    "Invites, approvals, stock updates, and sign-ins are recorded in a simple audit trail.",
} as const;

const hi: Record<keyof typeof en, string> = {
  ...en,
  "language.label": "भाषा",
  "language.english": "अंग्रेज़ी",
  "language.hindi": "हिंदी",
  "nav.dashboard": "डैशबोर्ड",
  "nav.users": "यूज़र",
  "nav.branches": "ब्रांच",
  "nav.clients": "क्लाइंट",
  "nav.materials": "मटेरियल",
  "nav.requests": "रिक्वेस्ट",
  "nav.approval": "अनुमोदन",
  "nav.dispatch": "डिस्पैच",
  "nav.stock_updates": "मासिक स्टॉक",
  "nav.reports": "रिपोर्ट्स",
  "role.superadmin": "सुपर एडमिन",
  "role.admin": "एडमिन",
  "pages.users.eyebrow": "यूज़र प्रबंधन",
  "pages.branches.eyebrow": "ब्रांच",
  "pages.materials.eyebrow": "मटेरियल",
  "pages.stock_updates.eyebrow": "मासिक स्टॉक",
  "pages.reports.eyebrow": "रिपोर्ट्स",
  "login.sign_in": "साइन इन",
  "login.console_title": "अपना ऑपरेशंस कंसोल खोलें",
  "login.console_description": "अपने अनुमोदित UniPath अकाउंट से साइन इन करें।",
};

export const dictionary = {
  en,
  hi,
} as const;

export type TranslationKey = keyof typeof en;

export function t(language: AppLanguage, key: TranslationKey) {
  return dictionary[language][key] ?? dictionary.en[key];
}
