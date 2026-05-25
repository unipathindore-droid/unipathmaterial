import { MailCheck } from "lucide-react";

import { DispatchManager } from "@/components/forms/dispatch-manager";
import { PageHeader } from "@/components/layout/page-header";
import { assertRouteAccess, ROLE_ACCESS } from "@/lib/access";
import { getCurrentUserProfile } from "@/lib/auth";
import {
  getDispatchEmailEvents,
  getDispatches,
  getRequests,
} from "@/lib/data/app-data";
import { t } from "@/lib/i18n";
import { getCurrentLanguage } from "@/lib/i18n-server";

export default async function DispatchPage() {
  const [currentUser, language] = await Promise.all([getCurrentUserProfile(), getCurrentLanguage()]);
  assertRouteAccess(currentUser, [...ROLE_ACCESS.dispatch]);
  const [dispatches, emailEvents, requests] = await Promise.all([
    getDispatches(currentUser),
    getDispatchEmailEvents(),
    getRequests(currentUser),
  ]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur">
        <PageHeader
          eyebrow={t(language, "pages.dispatch.eyebrow")}
          title={t(language, "pages.dispatch.title")}
          description={t(language, "pages.dispatch.description")}
        />
      </section>

      <DispatchManager
        initialDispatches={dispatches}
        initialRequests={requests}
        initialNotifications={emailEvents}
      />

      <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <MailCheck className="h-5 w-5 text-cyan-700" />
          <h2 className="text-xl font-semibold text-slate-950">Dispatch rules enforced</h2>
        </div>
        <ul className="space-y-3 text-sm leading-6 text-slate-600">
          <li>Only approved requests are available for dispatch creation.</li>
          <li>If a material requires expiry, the dispatch form blocks save until `expiry_date` is provided.</li>
          <li>Dispatch header and dispatch item rows are saved together, with request status updated to `dispatched`.</li>
          <li>After successful dispatch, a client email event is recorded in-app.</li>
        </ul>
      </section>
    </div>
  );
}
