import { AlertTriangle, Boxes } from "lucide-react";

import { MaterialManager } from "@/components/forms/material-manager";
import { PageHeader } from "@/components/layout/page-header";
import { assertRouteAccess, ROLE_ACCESS } from "@/lib/access";
import { getCurrentUserProfile } from "@/lib/auth";
import { getBranches, getInventorySignals, getMaterials, getMaterialStockRows } from "@/lib/data/app-data";
import { t } from "@/lib/i18n";
import { getCurrentLanguage } from "@/lib/i18n-server";
import { formatDate } from "@/lib/utils";

export default async function MaterialsPage() {
  const [currentUser, language] = await Promise.all([getCurrentUserProfile(), getCurrentLanguage()]);
  assertRouteAccess(currentUser, [...ROLE_ACCESS.materials]);
  const [materials, inventory, branches, stockRows] = await Promise.all([
    getMaterials(),
    getInventorySignals(),
    getBranches(false),
    getMaterialStockRows(currentUser),
  ]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur">
        <PageHeader
          eyebrow={t(language, "pages.materials.eyebrow")}
          title={t(language, "pages.materials.title")}
          description={t(language, "pages.materials.description")}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <MaterialManager
            initialMaterials={materials}
            initialStockRows={stockRows}
            branches={branches}
            currentUser={currentUser!}
          />
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-700" />
              <h2 className="text-xl font-semibold text-slate-950">Reorder signals</h2>
            </div>
            <div className="space-y-3">
              {inventory.stock
                .filter((item) => item.available_quantity <= item.reorder_level)
                .map((item) => (
                  <div key={item.id} className="rounded-3xl border border-amber-100 bg-amber-50 px-4 py-4">
                    <p className="font-semibold text-slate-900">{item.material_name}</p>
                    <p className="text-sm text-slate-600">
                      Available {item.available_quantity}, reorder threshold {item.reorder_level}
                    </p>
                  </div>
                ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <Boxes className="h-5 w-5 text-rose-700" />
              <h2 className="text-xl font-semibold text-slate-950">Expiring inventory</h2>
            </div>
            <div className="space-y-3">
              {inventory.stock
                .filter((item) => item.nearest_expiry_date)
                .map((item) => (
                  <div key={item.id} className="rounded-3xl border border-rose-100 bg-rose-50 px-4 py-4">
                    <p className="font-semibold text-slate-900">{item.material_name}</p>
                    <p className="text-sm text-slate-600">
                      Nearest expiry {formatDate(item.nearest_expiry_date)}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
