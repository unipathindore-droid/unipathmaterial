import { RequestManager } from "@/components/forms/request-manager";
import { PageHeader } from "@/components/layout/page-header";
import { assertRouteAccess, ROLE_ACCESS } from "@/lib/access";
import { getCurrentUserProfile } from "@/lib/auth";
import { getClients, getMaterials, getRequests } from "@/lib/data/app-data";
import { t } from "@/lib/i18n";
import { getCurrentLanguage } from "@/lib/i18n-server";

export default async function RequestsPage() {
  const [requests, clients, materials, currentUser, language] = await Promise.all([
    getRequests(),
    getClients(),
    getMaterials(),
    getCurrentUserProfile(),
    getCurrentLanguage(),
  ]);
  assertRouteAccess(currentUser, [...ROLE_ACCESS.requests]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur">
        <PageHeader
          eyebrow={t(language, "pages.requests.eyebrow")}
          title={t(language, "pages.requests.title")}
          description={t(language, "pages.requests.description")}
        />
      </section>

      <RequestManager
        initialRequests={requests}
        clients={clients}
        materials={materials}
        currentUser={currentUser!}
      />
    </div>
  );
}
