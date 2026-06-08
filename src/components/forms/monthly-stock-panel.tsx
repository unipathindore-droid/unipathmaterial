"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Download, FileSpreadsheet, Loader2, Plus, RefreshCw } from "lucide-react";

import {
  saveMonthlyStockUpdateAction,
  uploadMonthlyStockWorkbookAction,
} from "@/app/(app)/stock-updates/actions";
import { monthlyStockUpdateSchema, type MonthlyStockUpdateFormValues } from "@/lib/validators/stock-update";
import { DataTable } from "@/components/tables/data-table";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { Branch, Material, MonthlyStockUpdateRecord } from "@/types/domain";

const defaultForm: MonthlyStockUpdateFormValues = {
  branch_id: "",
  material_id: "",
  month: new Date().toISOString().slice(0, 7),
  opening_stock: 0,
  received_stock: 0,
  used_stock: 0,
  damaged_stock: 0,
  remarks: "",
};

export function MonthlyStockPanel({
  initialRows,
  branches,
  materials,
}: {
  initialRows: MonthlyStockUpdateRecord[];
  branches: Branch[];
  materials: Material[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [formValues, setFormValues] = useState<MonthlyStockUpdateFormValues>({
    ...defaultForm,
    branch_id: branches[0]?.id ?? "",
    material_id: materials[0]?.id ?? "",
  });
  const [formError, setFormError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const closingStock = useMemo(
    () =>
      Number(formValues.opening_stock) +
      Number(formValues.received_stock) -
      Number(formValues.used_stock) -
      Number(formValues.damaged_stock),
    [formValues],
  );

  function closeForm() {
    setIsOpen(false);
    setFormError("");
    setFormValues({
      ...defaultForm,
      branch_id: branches[0]?.id ?? "",
      material_id: materials[0]?.id ?? "",
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const parsed = monthlyStockUpdateSchema.safeParse(formValues);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Please review the stock details.");
      return;
    }

    startTransition(async () => {
      const result = await saveMonthlyStockUpdateAction(parsed.data);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }

      setRows((current) => [result.record, ...current.filter((row) => row.id !== result.record.id)]);
      closeForm();
      router.refresh();
    });
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setUploadError("");
    setUploadSuccess("");
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      const result = await uploadMonthlyStockWorkbookAction(formData);
      if (!result.ok) {
        setUploadError(result.error);
        return;
      }

      setUploadSuccess(`${result.imported} stock row(s) imported successfully.`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Monthly branch stock update</h2>
            <p className="mt-2 text-sm text-slate-600">
              Closing stock = Opening stock + Received stock - Used stock - Damaged stock.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
              <FileSpreadsheet className="h-4 w-4" />
              Upload Excel
              <input type="file" accept=".xlsx" onChange={handleUpload} className="hidden" />
            </label>
            <a
              href="/api/exports/stock-updates"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Export Excel
            </a>
            <button
              type="button"
              onClick={() => router.refresh()}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Add monthly update
            </button>
          </div>
        </div>

        {uploadError ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {uploadError}
          </div>
        ) : null}
        {uploadSuccess ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {uploadSuccess}
          </div>
        ) : null}
      </section>

      {isOpen ? (
        <section className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Branch</span>
              <select
                value={formValues.branch_id}
                onChange={(event) => setFormValues((current) => ({ ...current, branch_id: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
              >
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Material</span>
              <select
                value={formValues.material_id}
                onChange={(event) => setFormValues((current) => ({ ...current, material_id: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
              >
                {materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Month</span>
              <input
                type="month"
                value={formValues.month}
                onChange={(event) => setFormValues((current) => ({ ...current, month: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
              />
            </label>

            {[
              ["opening_stock", "Opening stock"],
              ["received_stock", "Received stock"],
              ["used_stock", "Used stock"],
              ["damaged_stock", "Damaged stock"],
            ].map(([name, label]) => (
              <label key={name} className="space-y-2">
                <span className="text-sm font-medium text-slate-700">{label}</span>
                <input
                  type="number"
                  min={0}
                  value={formValues[name as keyof MonthlyStockUpdateFormValues] as number}
                  onChange={(event) =>
                    setFormValues((current) => ({
                      ...current,
                      [name]: Number(event.target.value),
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
                />
              </label>
            ))}

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Closing stock</span>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                {closingStock}
              </div>
            </label>

            <label className="space-y-2 md:col-span-2 xl:col-span-3">
              <span className="text-sm font-medium text-slate-700">Remarks</span>
              <textarea
                value={formValues.remarks}
                onChange={(event) => setFormValues((current) => ({ ...current, remarks: event.target.value }))}
                className="min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
              />
            </label>

            {formError ? (
              <div className="md:col-span-2 xl:col-span-3 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4" />
                <span>{formError}</span>
              </div>
            ) : null}

            <div className="md:col-span-2 xl:col-span-3 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeForm}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save update
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <DataTable
        columns={[
          { key: "branch", header: "Branch", render: (row) => row.branch_name ?? row.branch_id },
          { key: "material", header: "Material", render: (row) => row.material_name ?? row.material_id },
          { key: "month", header: "Month", render: (row) => formatDate(`${row.month}-01`) },
          { key: "opening", header: "Opening", render: (row) => row.opening_stock },
          { key: "received", header: "Received", render: (row) => row.received_stock },
          { key: "used", header: "Used", render: (row) => row.used_stock },
          { key: "damaged", header: "Damaged", render: (row) => row.damaged_stock },
          { key: "closing", header: "Closing", render: (row) => row.closing_stock },
          { key: "time", header: "Updated", render: (row) => formatDateTime(row.updated_at ?? row.created_at) },
        ]}
        rows={rows}
      />
    </div>
  );
}
