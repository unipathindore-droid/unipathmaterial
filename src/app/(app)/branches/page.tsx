import { BranchManagementPanel } from "@/components/forms/branch-management-panel";
import { PageHeader } from "@/components/layout/page-header";
import { assertRouteAccess, ROLE_ACCESS } from "@/lib/access";
import { getCurrentUserProfile } from "@/lib/auth";
import { getBranches } from "@/lib/data/app-data";
import { t } from "@/lib/i18n";
import { getCurrentLanguage } from "@/lib/i18n-server";

export default async function BranchesPage() {
  const [currentUser, branches, language] = await Promise.all([
    getCurrentUserProfile(),
    getBranches(),
    getCurrentLanguage(),
  ]);

  assertRouteAccess(currentUser, [...ROLE_ACCESS.branches]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur">
        <PageHeader
          eyebrow={t(language, "pages.branches.eyebrow")}
          title={t(language, "pages.branches.title")}
          description={t(language, "pages.branches.description")}
        />
      </section>

      <BranchManagementPanel initialBranches={branches} currentUser={currentUser!} />
    </div>
  );
}
