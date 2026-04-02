export const LANGUAGE_COOKIE = "app_lang";

export type AppLanguage = "en" | "hi";

export const DEFAULT_LANGUAGE: AppLanguage = "en";

export const dictionary = {
  en: {
    "language.label": "Language",
    "language.english": "English",
    "language.hindi": "Hindi",
    "nav.dashboard": "Dashboard",
    "nav.clients": "Clients",
    "nav.materials": "Materials",
    "nav.requests": "Requests",
    "nav.approval": "Approval",
    "nav.dispatch": "Dispatch",
    "role.admin": "Admin",
    "role.branch_admin": "Branch Admin",
    "role.sales": "Sales",
    "role.phlebotomist": "Sales / Phlebotomist",
    "role.material_team": "Material Team",
    "role.dispatch_manager": "Dispatch Manager",
    "shell.multi_branch": "Multi-branch access",
    "shell.branch_filtering": "Branch-aware data filtering enabled",
    "shell.unread_alerts": "unread alerts",
    "shell.switch_account": "Switch account",
    "notifications.title": "Notifications",
    "notifications.unread": "unread",
    "notifications.mark_all_read": "Mark all read",
    "notifications.read": "Read",
    "notifications.open": "Open",
    "notifications.empty": "No notifications yet.",
    "pages.dashboard.eyebrow": "Admin Dashboard",
    "pages.dashboard.title": "Operational control across requests, approvals, dispatches, and expiry risk.",
    "pages.dashboard.description":
      "A single command center for administrators to monitor branch activity, move pending work, and intervene before stock or expiry issues affect clients.",
    "pages.clients.eyebrow": "Clients",
    "pages.clients.title": "Manage branch-linked pathology clients.",
    "pages.clients.description":
      "Track account ownership, branch allocation, contact details, and client status for every lab or collection partner.",
    "pages.materials.eyebrow": "Materials",
    "pages.materials.title": "Material master with branch inventory risk controls.",
    "pages.materials.description":
      "Define SKUs, expiry rules, reorder levels, and monitor stock signals before branch operations slow down.",
    "pages.requests.eyebrow": "Requests",
    "pages.requests.title": "Track material demand from intake to fulfilment.",
    "pages.requests.description":
      "Capture client demand, urgency, required-by dates, and request progress with branch-aware visibility.",
    "pages.approval.eyebrow": "Approval",
    "pages.approval.title": "Review full and partial approvals with audit-ready reasons.",
    "pages.approval.description":
      "Approvers can allow partial allocations when stock is constrained, with mandatory rationale preserved for traceability.",
    "pages.dispatch.eyebrow": "Dispatch",
    "pages.dispatch.title": "Control packing, expiry compliance, and client communication.",
    "pages.dispatch.description":
      "Only dispatch-ready materials with required expiry dates can move to shipment. Client emails are restricted to dispatch and seven-day expiry notices.",
    "login.badge": "UniPath SupplyOS",
    "login.hero_title": "Pathology material supply management built for branch-led operations.",
    "login.hero_description":
      "Manage clients, materials, approvals, dispatch, delivery, expiry controls, and auto-reorder signals across every branch from one operational workspace.",
    "login.sign_in": "Sign In",
    "login.console_title": "Access your operations console",
    "login.console_description": "Use Supabase Auth credentials for your assigned branch and role.",
    "login.highlights.role.title": "Role-aware controls",
    "login.highlights.role.description":
      "Separate operational lanes for branch admins, sales, material team, and dispatch.",
    "login.highlights.dispatch.title": "Dispatch compliance",
    "login.highlights.dispatch.description":
      "Track approval, expiry, dispatch packing, and proof of delivery in one place.",
    "login.highlights.alerts.title": "Actionable alerts",
    "login.highlights.alerts.description":
      "Internal alerts stay in-app while client email is limited to dispatch and expiry notices.",
  },
  hi: {
    "language.label": "भाषा",
    "language.english": "अंग्रेजी",
    "language.hindi": "हिंदी",
    "nav.dashboard": "डैशबोर्ड",
    "nav.clients": "क्लाइंट्स",
    "nav.materials": "मटेरियल्स",
    "nav.requests": "रिक्वेस्ट्स",
    "nav.approval": "अनुमोदन",
    "nav.dispatch": "डिस्पैच",
    "role.admin": "एडमिन",
    "role.branch_admin": "ब्रांच एडमिन",
    "role.sales": "सेल्स",
    "role.phlebotomist": "सेल्स / फ्लेबोटोमिस्ट",
    "role.material_team": "मटेरियल टीम",
    "role.dispatch_manager": "डिस्पैच मैनेजर",
    "shell.multi_branch": "मल्टी-ब्रांच एक्सेस",
    "shell.branch_filtering": "ब्रांच-आधारित डेटा फ़िल्टरिंग सक्षम है",
    "shell.unread_alerts": "अपठित अलर्ट",
    "shell.switch_account": "अकाउंट बदलें",
    "notifications.title": "सूचनाएं",
    "notifications.unread": "अपठित",
    "notifications.mark_all_read": "सभी पढ़ें",
    "notifications.read": "पढ़ें",
    "notifications.open": "खोलें",
    "notifications.empty": "अभी कोई सूचना नहीं है।",
    "pages.dashboard.eyebrow": "एडमिन डैशबोर्ड",
    "pages.dashboard.title": "रिक्वेस्ट, अनुमोदन, डिस्पैच और एक्सपायरी रिस्क पर ऑपरेशनल कंट्रोल।",
    "pages.dashboard.description":
      "एडमिनिस्ट्रेटर्स के लिए एक सिंगल कमांड सेंटर जहां वे ब्रांच गतिविधि मॉनिटर कर सकें, लंबित काम आगे बढ़ा सकें और स्टॉक या एक्सपायरी समस्याओं से पहले हस्तक्षेप कर सकें।",
    "pages.clients.eyebrow": "क्लाइंट्स",
    "pages.clients.title": "ब्रांच से जुड़े पैथोलॉजी क्लाइंट्स प्रबंधित करें।",
    "pages.clients.description":
      "हर लैब या कलेक्शन पार्टनर के लिए अकाउंट ओनरशिप, ब्रांच अलोकेशन, संपर्क विवरण और क्लाइंट स्टेटस ट्रैक करें।",
    "pages.materials.eyebrow": "मटेरियल्स",
    "pages.materials.title": "ब्रांच इन्वेंटरी रिस्क कंट्रोल के साथ मटेरियल मास्टर।",
    "pages.materials.description":
      "SKU, एक्सपायरी नियम, रीऑर्डर लेवल तय करें और ब्रांच ऑपरेशंस धीमे होने से पहले स्टॉक संकेत मॉनिटर करें।",
    "pages.requests.eyebrow": "रिक्वेस्ट्स",
    "pages.requests.title": "इंटेक से फुलफिलमेंट तक मटेरियल डिमांड ट्रैक करें।",
    "pages.requests.description":
      "क्लाइंट डिमांड, अर्जेंसी, आवश्यक तिथि और रिक्वेस्ट प्रगति को ब्रांच-आधारित विजिबिलिटी के साथ कैप्चर करें।",
    "pages.approval.eyebrow": "अनुमोदन",
    "pages.approval.title": "ऑडिट-रेडी कारणों के साथ पूर्ण और आंशिक अनुमोदन की समीक्षा करें।",
    "pages.approval.description":
      "जब स्टॉक सीमित हो, तब अप्रूवर्स आंशिक आवंटन की अनुमति दे सकते हैं और कारण ट्रेसबिलिटी के लिए सुरक्षित रहता है।",
    "pages.dispatch.eyebrow": "डिस्पैच",
    "pages.dispatch.title": "पैकिंग, एक्सपायरी अनुपालन और क्लाइंट कम्युनिकेशन नियंत्रित करें।",
    "pages.dispatch.description":
      "सिर्फ डिस्पैच-रेडी मटेरियल जिनकी आवश्यक एक्सपायरी तिथि मौजूद हो, उन्हें ही शिपमेंट में भेजा जा सकता है। क्लाइंट ईमेल केवल डिस्पैच और सात-दिन एक्सपायरी नोटिस तक सीमित हैं।",
    "login.badge": "UniPath SupplyOS",
    "login.hero_title": "ब्रांच-आधारित ऑपरेशंस के लिए बनाया गया पैथोलॉजी मटेरियल सप्लाई मैनेजमेंट।",
    "login.hero_description":
      "एक ही ऑपरेशनल वर्कस्पेस से हर ब्रांच में क्लाइंट्स, मटेरियल्स, अनुमोदन, डिस्पैच, डिलीवरी, एक्सपायरी कंट्रोल और ऑटो-रीऑर्डर संकेत प्रबंधित करें।",
    "login.sign_in": "साइन इन",
    "login.console_title": "अपना ऑपरेशंस कंसोल एक्सेस करें",
    "login.console_description": "अपनी असाइन की गई ब्रांच और रोल के लिए Supabase Auth क्रेडेंशियल्स का उपयोग करें।",
    "login.highlights.role.title": "रोल-आधारित कंट्रोल",
    "login.highlights.role.description":
      "ब्रांच एडमिन, सेल्स, मटेरियल टीम और डिस्पैच के लिए अलग-अलग ऑपरेशनल लेन।",
    "login.highlights.dispatch.title": "डिस्पैच अनुपालन",
    "login.highlights.dispatch.description":
      "अनुमोदन, एक्सपायरी, डिस्पैच पैकिंग और प्रूफ ऑफ डिलीवरी एक ही जगह ट्रैक करें।",
    "login.highlights.alerts.title": "कार्रवाई योग्य अलर्ट",
    "login.highlights.alerts.description":
      "इंटरनल अलर्ट ऐप में रहते हैं, जबकि क्लाइंट ईमेल सिर्फ डिस्पैच और एक्सपायरी नोटिस तक सीमित रहते हैं।",
  },
} as const;

export type TranslationKey = keyof typeof dictionary.en;

export function t(language: AppLanguage, key: TranslationKey) {
  return dictionary[language][key] ?? dictionary.en[key];
}
