import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/tables/data-table";
import { assertRouteAccess, ROLE_ACCESS } from "@/lib/access";
import { getCurrentUserProfile } from "@/lib/auth";
import {
  getDeletedMaterialLogs,
  getDispatches,
  getExcelActivityLogs,
  getMaterialStockRows,
  getMonthlyStockUpdates,
} from "@/lib/data/app-data";
import { t } from "@/lib/i18n";
import { getCurrentLanguage } from "@/lib/i18n-server";
import { formatDate, formatDateTime } from "@/lib/utils";

export default async function ReportsPage() {
  const [currentUser, language] = await Promise.all([getCurrentUserProfile(), getCurrentLanguage()]);
  assertRouteAccess(currentUser, [...ROLE_ACCESS.reports]);

  const [stockRows, monthlyRows, dispatches, uploadLogs, deletedMaterials] = await Promise.all([
    getMaterialStockRows(currentUser),
    getMonthlyStockUpdates(currentUser),
    getDispatches(currentUser),
    getExcelActivityLogs(),
    getDeletedMaterialLogs(),
  ]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur">
        <PageHeader
          eyebrow={t(language, "pages.reports.eyebrow")}
          title={t(language, "pages.reports.title")}
          description={t(language, "pages.reports.description")}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <ReportLink href="/api/exports/materials" title="Branch-wise material stock" description="Export active stock branch by branch." />
        <ReportLink href="/api/exports/stock-updates" title="Monthly stock update" description="Export month-wise closing stock history." />
        <ReportLink href="/api/exports/dispatches" title="Dispatch report" description="Export dispatch movement and tracking details." />
      </section>

      <Section title="Branch-wise material stock">
        <DataTable
          columns={[
            { key: "branch", header: "Branch", render: (row) => row.branch_name ?? row.branch_id },
            { key: "material", header: "Material", render: (row) => row.material_name },
            { key: "code", header: "Code", render: (row) => row.material_code ?? "-" },
            { key: "current", header: "Current", render: (row) => row.available_quantity },
            { key: "minimum", header: "Minimum", render: (row) => row.reorder_level },
            { key: "expiry", header: "Expiry", render: (row) => formatDate(row.nearest_expiry_date) },
          ]}
          rows={stockRows}
        />
      </Section>

      <Section title="Monthly stock update report">
        <DataTable
          columns={[
            { key: "branch", header: "Branch", render: (row) => row.branch_name ?? row.branch_id },
            { key: "material", header: "Material", render: (row) => row.material_name ?? row.material_id },
            { key: "month", header: "Month", render: (row) => formatDate(`${row.month}-01`) },
            { key: "closing", header: "Closing", render: (row) => row.closing_stock },
            { key: "remarks", header: "Remarks", render: (row) => row.remarks ?? "-" },
            { key: "updated", header: "Updated", render: (row) => formatDateTime(row.updated_at ?? row.created_at) },
          ]}
          rows={monthlyRows}
        />
      </Section>

      <Section title="Dispatch report">
        <DataTable
          columns={[
            { key: "dispatch", header: "Dispatch", render: (row) => row.dispatch_number },
            { key: "from", header: "From", render: (row) => row.dispatch_from_branch_name ?? row.branch_name },
            { key: "to", header: "To", render: (row) => row.dispatch_to_branch_name ?? row.destination_name ?? "-" },
            { key: "mode", header: "Mode", render: (row) => row.dispatch_type ?? "-" },
            { key: "tracking", header: "Tracking", render: (row) => row.tracking_number ?? row.lr_number ?? "-" },
            { key: "status", header: "Status", render: (row) => row.status },
          ]}
          rows={dispatches}
        />
      </Section>

      <Section title="Excel upload history">
        <DataTable
          columns={[
            { key: "module", header: "Module", render: (row) => row.module_name },
            { key: "operation", header: "Operation", render: (row) => row.operation },
            { key: "file", header: "File", render: (row) => row.file_name ?? "-" },
            { key: "rows", header: "Rows", render: (row) => row.row_count },
            { key: "time", header: "Time", render: (row) => formatDateTime(row.created_at) },
          ]}
          rows={uploadLogs}
        />
      </Section>

      <Section title="Deleted material log">
        <DataTable
          columns={[
            { key: "material", header: "Material", render: (row) => String(row.material_snapshot.name ?? row.material_snapshot.material_code ?? row.material_id ?? "-") },
            { key: "code", header: "Code", render: (row) => String(row.material_snapshot.material_code ?? row.material_snapshot.sku ?? "-") },
            { key: "deleted_by", header: "Deleted By", render: (row) => row.deleted_by_name ?? "-" },
            { key: "deleted_at", header: "Deleted At", render: (row) => formatDateTime(row.deleted_at) },
          ]}
          rows={deletedMaterials}
        />
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
      {children}
    </section>
  );
}

function ReportLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <a href={href} className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <p className="text-base font-semibold text-slate-950">{title}</p>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </a>
  );
}
