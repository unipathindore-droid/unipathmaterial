"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertCircle, Boxes, Loader2, Plus, RefreshCw, Search } from "lucide-react";

import { StatusPill } from "@/components/layout/status-pill";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { materialSchema, type MaterialFormValues } from "@/lib/validators/material";
import type { Material } from "@/types/domain";

type MaterialManagerProps = {
  initialMaterials: Material[];
};

const defaultForm: MaterialFormValues = {
  sku: "",
  name: "",
  category: "",
  unit_of_measure: "unit",
  expiry_required: false,
  min_threshold: 0,
  active: true,
};

export function MaterialManager({ initialMaterials }: MaterialManagerProps) {
  const [materials, setMaterials] = useState(initialMaterials);
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [formValues, setFormValues] = useState<MaterialFormValues>(defaultForm);
  const [formError, setFormError] = useState("");
  const [listError, setListError] = useState("");
  const [isPending, startTransition] = useTransition();

  const filteredMaterials = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return materials;

    return materials.filter((material) =>
      [material.name, material.sku, material.category, material.unit_of_measure]
        .join(" ")
        .toLowerCase()
        .includes(value),
    );
  }, [materials, query]);

  async function loadMaterials() {
    const supabase = createClientSupabaseClient();
    if (!supabase) {
      setListError("Supabase client is not configured.");
      return;
    }

    const { data, error } = await supabase
      .from("materials")
      .select(
        "id, sku, name, category, unit_of_measure, expiry_required:requires_expiry_before_dispatch, min_threshold:reorder_level, active",
      )
      .order("name");

    if (error) {
      setListError(error.message);
      return;
    }

    setListError("");
    setMaterials((data ?? []) as Material[]);
  }

  function closeForm() {
    setFormOpen(false);
    setFormValues(defaultForm);
    setFormError("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const parsed = materialSchema.safeParse(formValues);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Please review the material details.");
      return;
    }

    const payload = {
      sku: parsed.data.sku.trim(),
      name: parsed.data.name.trim(),
      category: parsed.data.category.trim(),
      unit_of_measure: parsed.data.unit_of_measure.trim(),
      requires_expiry_before_dispatch: parsed.data.expiry_required,
      reorder_level: parsed.data.min_threshold,
      active: parsed.data.active,
    };

    startTransition(async () => {
      const supabase = createClientSupabaseClient();
      if (!supabase) {
        setFormError("Supabase client is not configured.");
        return;
      }

      const { data, error } = await supabase
        .from("materials")
        .insert(payload)
        .select(
          "id, sku, name, category, unit_of_measure, expiry_required:requires_expiry_before_dispatch, min_threshold:reorder_level, active",
        )
        .single();

      if (error) {
        setFormError(error.message);
        return;
      }

      setMaterials((current) => [data as Material, ...current]);
      closeForm();
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by material, SKU, category..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-teal-500"
            />
          </label>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => startTransition(async () => loadMaterials())}
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

        {listError ? (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4" />
            <span>{listError}</span>
          </div>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {["Material", "Category", "Unit", "Expiry Required", "Min Threshold", "Status"].map(
                  (header) => (
                    <th
                      key={header}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
                    >
                      {header}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMaterials.length ? (
                filteredMaterials.map((material) => (
                  <tr key={material.id}>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-900">{material.name}</p>
                      <p className="text-sm text-slate-500">{material.sku}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">{material.category}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{material.unit_of_measure}</td>
                    <td className="px-4 py-4">
                      <StatusPill value={material.expiry_required ? "approved" : "draft"} />
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">{material.min_threshold}</td>
                    <td className="px-4 py-4">
                      <StatusPill value={material.active ? "active" : "inactive"} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                    No materials found for the current search.
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
                  New Material
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Add material master
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
            <FormField label="SKU">
              <input
                value={formValues.sku}
                onChange={(event) => setFormValues((current) => ({ ...current, sku: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
                placeholder="MAT-1001"
              />
            </FormField>

            <FormField label="Material name">
              <input
                value={formValues.name}
                onChange={(event) => setFormValues((current) => ({ ...current, name: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
                placeholder="EDTA Blood Collection Tubes"
              />
            </FormField>

            <FormField label="Category">
              <input
                value={formValues.category}
                onChange={(event) => setFormValues((current) => ({ ...current, category: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
                placeholder="Collection"
              />
            </FormField>

            <FormField label="Unit of measure">
              <input
                value={formValues.unit_of_measure}
                onChange={(event) =>
                  setFormValues((current) => ({ ...current, unit_of_measure: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
                placeholder="box"
              />
            </FormField>

            <FormField label="Minimum threshold">
              <input
                type="number"
                min={0}
                value={formValues.min_threshold}
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    min_threshold: Number(event.target.value),
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <ToggleCard
                label="Expiry required"
                description="Require expiry date before dispatch."
                checked={formValues.expiry_required}
                onChange={(checked) =>
                  setFormValues((current) => ({ ...current, expiry_required: checked }))
                }
              />
              <ToggleCard
                label="Active material"
                description="Show in request and dispatch workflows."
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
