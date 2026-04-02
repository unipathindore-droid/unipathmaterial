import { ClipboardList, FileClock, PackageSearch, Siren, Truck } from "lucide-react";

import { MetricCard } from "@/components/dashboard/metric-card";
import { PageHeader } from "@/components/layout/page-header";
import { StatusPill } from "@/components/layout/status-pill";
import { DataTable } from "@/components/tables/data-table";
import { assertRouteAccess, ROLE_ACCESS } from "@/lib/access";
import { getCurrentUserProfile } from "@/lib/auth";
import { getDashboardData } from "@/lib/data/app-data";
import { t } from "@/lib/i18n";
import { getCurrentLanguage } from "@/lib/i18n-server";
import { formatDate, formatDateTime } from "@/lib/utils";

export default async function DashboardPage() {
  const [data, currentUser, language] = await Promise.all([
    getDashboardData(),
    getCurrentUserProfile(),
    getCurrentLanguage(),
  ]);
  assertRouteAccess(currentUser, [...ROLE_ACCESS.dashboard]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <PageHeader
            eyebrow={t(language, "pages.dashboard.eyebrow")}
            title={t(language, "pages.dashboard.title")}
            description={t(language, "pages.dashboard.description")}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.75rem] border border-teal-100 bg-teal-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
                Approval Load
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                {data.approvalQueue.filter((item) => item.decision === "pending").length}
              </p>
              <p className="mt-2 text-sm text-slate-600">Requests currently waiting for approval action.</p>
            </div>
            <div className="rounded-[1.75rem] border border-sky-100 bg-sky-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                Dispatch Pulse
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                {data.dispatches.filter((item) => item.status !== "delivered").length}
              </p>
              <p className="mt-2 text-sm text-slate-600">Shipments in motion across branches right now.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Active Clients" value={data.metrics.activeClients} helper="Clients currently eligible for request and dispatch workflows." />
        <MetricCard label="Pending Requests" value={data.metrics.pendingRequests} helper="Requests waiting on approval, packing, or final dispatch." />
        <MetricCard label="Dispatches In Flight" value={data.metrics.dispatchesInFlight} helper="Dispatches packed or shipped but not yet marked delivered." />
        <MetricCard label="Expiring In 7 Days" value={data.metrics.expiringSoon} helper="Lots that should trigger review and client email notifications." />
        <MetricCard label="Low Stock Materials" value={data.metrics.lowStockMaterials} helper="Materials currently at or below branch reorder thresholds." />
        <MetricCard label="Deliveries Today" value={data.metrics.deliveriesToday} helper="Dispatches successfully marked delivered today." />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <ClipboardList className="h-5 w-5 text-teal-700" />
            <h2 className="text-xl font-semibold text-slate-950">Pending requests</h2>
          </div>
          <DataTable
            columns={[
              {
                key: "request_number",
                header: "Request",
                render: (row) => (
                  <div>
                    <p className="font-semibold text-slate-900">{row.request_number}</p>
                    <p className="text-slate-500">{row.client_name}</p>
                  </div>
                ),
              },
              { key: "needed_by", header: "Need By", render: (row) => formatDate(row.needed_by) },
              {
                key: "requested_at",
                header: "Submitted",
                render: (row) => formatDateTime(row.requested_at),
              },
              { key: "status", header: "Status", render: (row) => <StatusPill value={row.status} /> },
            ]}
            rows={data.requestQueue}
          />
        </div>

          <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <FileClock className="h-5 w-5 text-indigo-700" />
              <h2 className="text-xl font-semibold text-slate-950">Approval queue</h2>
            </div>
            <div className="space-y-3">
              {data.approvalQueue.map((item) => (
                <div
                  key={item.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">{item.request_number}</p>
                      <p className="text-sm text-slate-600">
                        {item.client_name} | {item.pending_items} pending items
                      </p>
                    </div>
                    <StatusPill value={item.decision} />
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    Submitted by {item.submitted_by} on {formatDateTime(item.submitted_at)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <Truck className="h-5 w-5 text-sky-700" />
              <h2 className="text-xl font-semibold text-slate-950">Dispatch status</h2>
            </div>
            <div className="space-y-3">
              {data.dispatches.map((item) => (
                <div key={item.id} className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">{item.dispatch_number}</p>
                      <p className="text-sm text-slate-500">
                        {item.client_name} | {item.tracking_number ?? "Tracking pending"}
                      </p>
                    </div>
                    <StatusPill value={item.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <Siren className="h-5 w-5 text-rose-700" />
              <h2 className="text-xl font-semibold text-slate-950">Expiry alerts</h2>
            </div>
            <div className="space-y-3">
              {data.expiringStock.map((item) => (
                <div key={item.id} className="rounded-3xl border border-rose-100 bg-rose-50 px-4 py-4">
                  <p className="font-semibold text-slate-900">{item.material_name}</p>
                  <p className="text-sm text-slate-600">
                    Nearest expiry: {formatDate(item.nearest_expiry_date)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <PackageSearch className="h-5 w-5 text-amber-700" />
              <h2 className="text-xl font-semibold text-slate-950">Low stock watchlist</h2>
            </div>
            <div className="space-y-3">
              {data.lowStock.map((item) => (
                <div key={item.id} className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">{item.material_name}</p>
                      <p className="text-sm text-slate-600">
                        Available {item.available_quantity} | Reserved {item.reserved_quantity}
                      </p>
                    </div>
                    <StatusPill value="submitted" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
