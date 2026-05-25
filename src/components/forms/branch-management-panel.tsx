"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Building2, Pencil, Plus, Power, RefreshCw, Search, Trash2 } from "lucide-react";

import {
  deleteBranchAction,
  saveBranchAction,
  toggleBranchStatusAction,
} from "@/app/(app)/branches/actions";
import { StatusPill } from "@/components/layout/status-pill";
import { branchSchema, type BranchFormValues } from "@/lib/validators/branch";
import { cn } from "@/lib/utils";
import type { Branch, UserProfile } from "@/types/domain";

const defaultForm: BranchFormValues = {
  name: "",
  code: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  contact_person: "",
  contact_number: "",
  status: "active",
};

export function BranchManagementPanel({
  initialBranches,
  currentUser,
}: {
  initialBranches: Branch[];
  currentUser: UserProfile;
}) {
  const router = useRouter();
  const [branches, setBranches] = useState(initialBranches);
  const [query, setQuery] = useState("");
  const [formValues, setFormValues] = useState<BranchFormValues>(defaultForm);
  const [formError, setFormError] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filteredBranches = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return branches;

    return branches.filter((branch) =>
      [
        branch.name,
        branch.code,
        branch.city,
        branch.state ?? "",
        branch.contact_person ?? "",
        branch.contact_number ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(value),
    );
  }, [branches, query]);

  function resetForm() {
    setFormValues(defaultForm);
    setFormError("");
    setIsOpen(false);
  }

  function startEdit(branch: Branch) {
    setFormValues({
      id: branch.id,
      name: branch.name,
      code: branch.code,
      address: branch.address ?? "",
      city: branch.city ?? "",
      state: branch.state ?? "",
      pincode: branch.pincode ?? "",
      contact_person: branch.contact_person ?? "",
      contact_number: branch.contact_number ?? "",
      status: branch.is_active ? "active" : "inactive",
    });
    setFormError("");
    setIsOpen(true);
  }

  function upsertBranch(branch: Branch) {
    setBranches((current) => {
      const exists = current.some((item) => item.id === branch.id);
      if (!exists) {
        return [branch, ...current];
      }

      return current.map((item) => (item.id === branch.id ? branch : item));
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const parsed = branchSchema.safeParse(formValues);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Please review the branch details.");
      return;
    }

    startTransition(async () => {
      const result = await saveBranchAction(parsed.data);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }

      upsertBranch(result.branch);
      resetForm();
      router.refresh();
    });
  }

  function handleStatus(branchId: string, nextActive: boolean) {
    startTransition(async () => {
      const result = await toggleBranchStatusAction(branchId, nextActive);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }

      setBranches((current) =>
        current.map((branch) => (branch.id === branchId ? { ...branch, is_active: nextActive } : branch)),
      );
      router.refresh();
    });
  }

  function handleDelete(branchId: string) {
    startTransition(async () => {
      const result = await deleteBranchAction(branchId);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }

      setBranches((current) => current.filter((branch) => branch.id !== branchId));
      router.refresh();
    });
  }

  const canDelete = currentUser.role === "superadmin";
  const inputClassName =
    "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500";

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by branch name, code, city, or contact..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-teal-500"
            />
          </label>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.refresh()}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCw className={cn("h-4 w-4", isPending ? "animate-spin" : "")} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => {
                setFormValues(defaultForm);
                setFormError("");
                setIsOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Add branch
            </button>
          </div>
        </div>
      </section>

      {isOpen ? (
        <section className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-teal-700" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-teal-700">
                  Branch Setup
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  {formValues.id ? "Edit branch" : "Create new branch"}
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Close
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Branch name">
              <input value={formValues.name} onChange={(event) => setFormValues((current) => ({ ...current, name: event.target.value }))} className={inputClassName} placeholder="Demo Branch XY" />
            </Field>
            <Field label="Branch code">
              <input value={formValues.code} onChange={(event) => setFormValues((current) => ({ ...current, code: event.target.value }))} className={inputClassName} placeholder="XY" />
            </Field>
            <Field label="Contact person">
              <input value={formValues.contact_person} onChange={(event) => setFormValues((current) => ({ ...current, contact_person: event.target.value }))} className={inputClassName} placeholder="Branch manager" />
            </Field>
            <Field label="Contact number">
              <input value={formValues.contact_number} onChange={(event) => setFormValues((current) => ({ ...current, contact_number: event.target.value }))} className={inputClassName} placeholder="9876543210" />
            </Field>
            <Field label="City">
              <input value={formValues.city} onChange={(event) => setFormValues((current) => ({ ...current, city: event.target.value }))} className={inputClassName} placeholder="Indore" />
            </Field>
            <Field label="State">
              <input value={formValues.state} onChange={(event) => setFormValues((current) => ({ ...current, state: event.target.value }))} className={inputClassName} placeholder="Madhya Pradesh" />
            </Field>
            <Field label="Pincode">
              <input value={formValues.pincode} onChange={(event) => setFormValues((current) => ({ ...current, pincode: event.target.value }))} className={inputClassName} placeholder="452001" />
            </Field>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Status</span>
              <select
                value={formValues.status}
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    status: event.target.value as BranchFormValues["status"],
                  }))
                }
                className={inputClassName}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label className="space-y-2 md:col-span-2 xl:col-span-3">
              <span className="text-sm font-medium text-slate-700">Address</span>
              <textarea
                value={formValues.address}
                onChange={(event) => setFormValues((current) => ({ ...current, address: event.target.value }))}
                className="min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
                placeholder="Complete branch address"
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
                onClick={resetForm}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {formValues.id ? "Save branch" : "Create branch"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {["Branch", "Code", "City", "Contact", "Status", "Actions"].map((header) => (
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
              {filteredBranches.length ? (
                filteredBranches.map((branch) => (
                  <tr key={branch.id}>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-900">{branch.name}</p>
                      <p className="text-sm text-slate-500">{branch.address ?? "Address not set"}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">{branch.code}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      {[branch.city, branch.state].filter(Boolean).join(", ") || "Not set"}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      <p>{branch.contact_person ?? "No contact"}</p>
                      <p className="text-slate-500">{branch.contact_number ?? "No number"}</p>
                    </td>
                    <td className="px-4 py-4">
                      <StatusPill value={branch.is_active ? "active" : "inactive"} />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <button type="button" onClick={() => startEdit(branch)} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatus(branch.id, !branch.is_active)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          <Power className="h-3.5 w-3.5" />
                          {branch.is_active ? "Deactivate" : "Activate"}
                        </button>
                        {canDelete ? (
                          <button
                            type="button"
                            onClick={() => handleDelete(branch.id)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                    No branches found for the current search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Field({
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
