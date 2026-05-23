import { ApprovalDashboard } from "@/components/forms/approval-dashboard";
import { PageHeader } from "@/components/layout/page-header";
import { assertRouteAccess, ROLE_ACCESS } from "@/lib/access";
import { getCurrentUserProfile } from "@/lib/auth";
import { getApprovalQueue } from "@/lib/data/app-data";
import { t } from "@/lib/i18n";
import { getCurrentLanguage } from "@/lib/i18n-server";

export default async function ApprovalPage() {
  const [approvals, currentUser, language] = await Promise.all([
    getApprovalQueue(),
    getCurrentUserProfile(),
    getCurrentLanguage(),
  ]);
  assertRouteAccess(currentUser, [...ROLE_ACCESS.approval]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur">
        <PageHeader
          eyebrow={t(language, "pages.approval.eyebrow")}
          title={t(language, "pages.approval.title")}
          description={t(language, "pages.approval.description")}
        />
      </section>

      <ApprovalDashboard
        initialQueue={approvals}
      />
    </div>
  );
}
