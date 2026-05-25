import { MonthlyStockPanel } from "@/components/forms/monthly-stock-panel";
import { PageHeader } from "@/components/layout/page-header";
import { assertRouteAccess, ROLE_ACCESS } from "@/lib/access";
import { getCurrentUserProfile } from "@/lib/auth";
import { getBranches, getMaterials, getMonthlyStockUpdates } from "@/lib/data/app-data";
import { t } from "@/lib/i18n";
import { getCurrentLanguage } from "@/lib/i18n-server";

export default async function StockUpdatesPage() {
  const [currentUser, language] = await Promise.all([getCurrentUserProfile(), getCurrentLanguage()]);
  assertRouteAccess(currentUser, [...ROLE_ACCESS.stockUpdates]);

  const [rows, branches, materials] = await Promise.all([
    getMonthlyStockUpdates(currentUser),
    getBranches(false),
    getMaterials(),
  ]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur">
        <PageHeader
          eyebrow={t(language, "pages.stock_updates.eyebrow")}
          title={t(language, "pages.stock_updates.title")}
          description={t(language, "pages.stock_updates.description")}
        />
      </section>

      <MonthlyStockPanel initialRows={rows} branches={branches} materials={materials} />
    </div>
  );
}
