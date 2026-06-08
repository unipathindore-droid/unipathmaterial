"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Boxes,
  Download,
  FileSpreadsheet,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";

import {
  deleteMaterialAction,
  saveMaterialAction,
  uploadMaterialsWorkbookAction,
} from "@/app/(app)/materials/actions";
import { StatusPill } from "@/components/layout/status-pill";
import { cn } from "@/lib/utils";
import { materialSchema, type MaterialFormValues } from "@/lib/validators/material";
import type { Branch, Material, StockSnapshot, UserProfile } from "@/types/domain";

type MaterialManagerProps = {
  initialMaterials: Material[];
  initialStockRows: StockSnapshot[];
  branches: Branch[];
  currentUser: UserProfile;
};

const defaultForm: MaterialFormValues = {
  sku: "",
  material_code: "",
  name: "",
  category: "",
  unit_of_measure: "unit",
  expiry_required: false,
  min_threshold: 0,
  opening_stock: 0,
  current_stock: 0,
  branch_id: "",
  active: true,
};

export function MaterialManager({
  initialMaterials,
  initialStockRows,
  branches,
  currentUser,
}: MaterialManagerProps) {
  const router = useRouter();
  const [materials, setMaterials] = useState(initialMaterials);
  const [stockRows, setStockRows] = useState(initialStockRows);
  const [query, setQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [formValues, setFormValues] = useState<MaterialFormValues>({
    ...defaultForm,
    branch_id: currentUser.branch_id ?? branches[0]?.id ?? "",
  });
  const [formError, setFormError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [isPending, startTransition] = useTransition();

  const filteredRows = useMemo(() => {
    const value = query.trim().toLowerCase();
    return stockRows.filter((row) => {
      const branchMatch = branchFilter ? row.branch_id === branchFilter : true;
      const searchMatch = value
        ? [
            row.material_name,
            row.material_code ?? "",
            row.branch_name ?? "",
            row.status ?? "",
          ]
            .join(" ")
            .toLowerCase()
            .includes(value)
        : true;

      return branchMatch && searchMatch;
    });
  }, [branchFilter, query, stockRows]);

  const activeBranchOptions = useMemo(
    () => branches.filter((branch) => branch.is_active !== false),
    [branches],
  );
  const inputClassName =
    "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500";

  function closeForm() {
    setFormOpen(false);
    setFormValues({
      ...defaultForm,
      branch_id: currentUser.branch_id ?? branches[0]?.id ?? "",
    });
    setFormError("");
  }

  function refreshPage() {
    setFormError("");
    setUploadError("");
    setUploadSuccess("");
    router.refresh();
  }

  function startEdit(material: Material) {
    const row = stockRows.find((item) => item.material_id === material.id);
    setFormValues({
      id: material.id,
      sku: material.sku,
      material_code: material.material_code ?? "",
      name: material.name,
      category: material.category,
      unit_of_measure: material.unit_of_measure,
      expiry_required: material.expiry_required,
      min_threshold: material.min_threshold,
      opening_stock: row?.opening_stock ?? row?.available_quantity ?? 0,
      current_stock: row?.available_quantity ?? 0,
      branch_id: row?.branch_id ?? currentUser.branch_id ?? branches[0]?.id ?? "",
      active: material.active,
    });
    setFormError("");
    setFormOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const parsed = materialSchema.safeParse(formValues);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Please review the material details.");
      return;
    }

    startTransition(async () => {
      const result = await saveMaterialAction(parsed.data);

      if (!result.ok) {
        setFormError(result.error);
        return;
      }

      setMaterials((current) => {
        const exists = current.some((item) => item.id === result.material.id);
        if (!exists) {
          return [result.material, ...current];
        }

        return current.map((item) => (item.id === result.material.id ? result.material : item));
      });

      refreshPage();
      closeForm();
    });
  }

  async function handleDelete(materialId: string) {
    setFormError("");
    startTransition(async () => {
      const result = await deleteMaterialAction(materialId);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }

      setMaterials((current) => current.filter((item) => item.id !== materialId));
      setStockRows((current) => current.filter((item) => item.material_id !== materialId));
      router.refresh();
    });
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setUploadError("");
    setUploadSuccess("");

    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      const result = await uploadMaterialsWorkbookAction(formData);
      if (!result.ok) {
        setUploadError(result.error);
        return;
      }

      setUploadSuccess(`${result.imported} material row(s) imported successfully.`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid flex-1 gap-4 md:grid-cols-[1fr_220px]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by material, code, branch, or status..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-teal-500"
              />
            </label>
            <select
              value={branchFilter}
              onChange={(event) => setBranchFilter(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
            >
              <option value="">All branches</option>
              {activeBranchOptions.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
              <FileSpreadsheet className="h-4 w-4" />
              Upload Excel
              <input type="file" accept=".xlsx" onChange={handleUpload} className="hidden" />
            </label>
            <a
              href="/api/exports/materials"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Export Excel
            </a>
            <button
              type="button"
              onClick={() => startTransition(async () => refreshPage())}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCw className={cn("h-4 w-4", isPending ? "animate-spin" : "")} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => {
                setFormOpen(true);
                setFormError("");
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Add material
            </button>
          </div>
        </div>

        {uploadError ? (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4" />
            <span>{uploadError}</span>
          </div>
        ) : null}

        {uploadSuccess ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {uploadSuccess}
          </div>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {[
                  "Material",
                  "Branch",
                  "Unit",
                  "Opening",
                  "Current",
                  "Minimum",
                  "Status",
                  "Actions",
                ].map((header) => (
                  <th
                    key={header}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length ? (
                filteredRows.map((row) => {
                  const material = materials.find((item) => item.id === row.material_id);
                  return (
                    <tr key={row.id}>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900">{row.material_name}</p>
                        <p className="text-sm text-slate-500">
                          {row.material_code ?? material?.material_code ?? material?.sku ?? "No code"}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">{row.branch_name ?? "Not assigned"}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {material?.unit_of_measure ?? "unit"}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">{row.opening_stock ?? 0}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">{row.available_quantity}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">{row.reorder_level}</td>
                      <td className="px-4 py-4">
                        <StatusPill value={row.status ?? (material?.active ? "active" : "inactive")} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {material ? (
                            <button
                              type="button"
                              onClick={() => startEdit(material)}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => void handleDelete(row.material_id)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">
                    No materials found for the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {formOpen ? (
        <section className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Boxes className="h-5 w-5 text-teal-700" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-teal-700">
                  Material Master
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  {formValues.id ? "Edit material" : "Add material master"}
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Close
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <FormField label="Material code">
              <input value={formValues.material_code} onChange={(event) => setFormValues((current) => ({ ...current, material_code: event.target.value }))} className={inputClassName} placeholder="MAT-1001" />
            </FormField>

            <FormField label="SKU">
              <input value={formValues.sku} onChange={(event) => setFormValues((current) => ({ ...current, sku: event.target.value }))} className={inputClassName} placeholder="SKU-1001" />
            </FormField>

            <FormField label="Material name">
              <input value={formValues.name} onChange={(event) => setFormValues((current) => ({ ...current, name: event.target.value }))} className={inputClassName} placeholder="Red Tube" />
            </FormField>

            <FormField label="Category">
              <input value={formValues.category} onChange={(event) => setFormValues((current) => ({ ...current, category: event.target.value }))} className={inputClassName} placeholder="Consumable" />
            </FormField>

            <FormField label="Unit">
              <input value={formValues.unit_of_measure} onChange={(event) => setFormValues((current) => ({ ...current, unit_of_measure: event.target.value }))} className={inputClassName} placeholder="box" />
            </FormField>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Branch</span>
              <select
                value={formValues.branch_id}
                onChange={(event) => setFormValues((current) => ({ ...current, branch_id: event.target.value }))}
                className={inputClassName}
              >
                <option value="">Select branch</option>
                {activeBranchOptions.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>

            <FormField label="Opening stock">
              <input type="number" min={0} value={formValues.opening_stock} onChange={(event) => setFormValues((current) => ({ ...current, opening_stock: Number(event.target.value) }))} className={inputClassName} />
            </FormField>

            <FormField label="Current stock">
              <input type="number" min={0} value={formValues.current_stock} onChange={(event) => setFormValues((current) => ({ ...current, current_stock: Number(event.target.value) }))} className={inputClassName} />
            </FormField>

            <FormField label="Minimum stock alert level">
              <input type="number" min={0} value={formValues.min_threshold} onChange={(event) => setFormValues((current) => ({ ...current, min_threshold: Number(event.target.value) }))} className={inputClassName} />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2 md:col-span-2">
              <ToggleCard
                label="Expiry required"
                description="Require expiry date before dispatch."
                checked={formValues.expiry_required}
                onChange={(checked) => setFormValues((current) => ({ ...current, expiry_required: checked }))}
              />
              <ToggleCard
                label="Active material"
                description="Allow material in branch workflows."
                checked={formValues.active}
                onChange={(checked) => setFormValues((current) => ({ ...current, active: checked }))}
              />
            </div>

            {formError ? (
              <div className="md:col-span-2 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4" />
                <span>{formError}</span>
              </div>
            ) : null}

            <div className="md:col-span-2 flex items-center justify-end gap-3">
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
                Save material
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function ToggleCard({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "rounded-2xl border px-4 py-4 text-left transition",
        checked
          ? "border-teal-300 bg-teal-50"
          : "border-slate-200 bg-slate-50 hover:border-slate-300",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-slate-900">{label}</p>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
        <span
          className={cn(
            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
            checked ? "bg-emerald-100 text-emerald-800" : "bg-zinc-200 text-zinc-700",
          )}
        >
          {checked ? "On" : "Off"}
        </span>
      </div>
    </button>
  );
}
