import { ClientManager } from "@/components/forms/client-manager";
import { PageHeader } from "@/components/layout/page-header";
import { assertRouteAccess, ROLE_ACCESS } from "@/lib/access";
import { getCurrentUserProfile } from "@/lib/auth";
import { getBranches, getClients } from "@/lib/data/app-data";
import { t } from "@/lib/i18n";
import { getCurrentLanguage } from "@/lib/i18n-server";

export default async function ClientsPage() {
  const [clients, branches, currentUser, language] = await Promise.all([
    getClients(),
    getBranches(),
    getCurrentUserProfile(),
    getCurrentLanguage(),
  ]);

  assertRouteAccess(currentUser, [...ROLE_ACCESS.clients]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur">
        <PageHeader
          eyebrow={t(language, "pages.clients.eyebrow")}
          title={t(language, "pages.clients.title")}
          description={t(language, "pages.clients.description")}
        />
      </section>

      <ClientManager
        initialClients={clients}
        branches={branches}
        currentUser={currentUser!}
      />
    </div>
  );
}
