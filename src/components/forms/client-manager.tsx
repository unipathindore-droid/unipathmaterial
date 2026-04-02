"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertCircle, Loader2, PencilLine, Plus, RefreshCw, Search } from "lucide-react";

import { createClientSupabaseClient } from "@/lib/supabase/client";
import { clientSchema, type ClientFormValues } from "@/lib/validators/client";
import { cn } from "@/lib/utils";
import type { AppRole, Branch, Client, UserProfile } from "@/types/domain";
import { StatusPill } from "@/components/layout/status-pill";

type ClientManagerProps = {
  initialClients: Client[];
  branches: Branch[];
  currentUser: UserProfile;
};

const defaultForm = (branchId?: string | null): ClientFormValues => ({
  branch_id: branchId ?? "",
  client_code: "",
  name: "",
  email: "",
  phone: "",
  contact_person: "",
  city: "",
  address: "",
  status: "active",
});

function canChooseAnyBranch(role: AppRole) {
  return role === "admin";
}

export function ClientManager({
  initialClients,
  branches,
  currentUser,
}: ClientManagerProps) {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [selectedBranch, setSelectedBranch] = useState(
    canChooseAnyBranch(currentUser.role) ? "all" : (currentUser.branch_id ?? "all"),
  );
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formValues, setFormValues] = useState<ClientFormValues>(defaultForm(currentUser.branch_id));
  const [formError, setFormError] = useState("");
  const [listError, setListError] = useState("");
  const [isPending, startTransition] = useTransition();

  const allowedBranches = useMemo(() => {
    if (canChooseAnyBranch(currentUser.role)) return branches;
    return branches.filter((branch) => branch.id === currentUser.branch_id);
  }, [branches, currentUser.branch_id, currentUser.role]);

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const matchesBranch =
        selectedBranch === "all" ? true : client.branch_id === selectedBranch;
      const haystack = [
        client.name,
        client.client_code,
        client.email ?? "",
        client.city ?? "",
        client.contact_person ?? "",
      ]
        .join(" ")
        .toLowerCase();
      const matchesQuery = haystack.includes(query.trim().toLowerCase());

      return matchesBranch && matchesQuery;
    });
  }, [clients, query, selectedBranch]);

  async function loadClients(branchId = selectedBranch) {
    const supabase = createClientSupabaseClient();
    if (!supabase) {
      setListError("Supabase client is not configured.");
      return;
    }

    setListError("");

    const branchFilter =
      branchId === "all" ? undefined : branchId;

    const queryBuilder = supabase
      .from("clients")
      .select("id, branch_id, client_code, name, email, phone, contact_person, address, city, state, status")
      .order("name");

    const { data, error } = branchFilter
      ? await queryBuilder.eq("branch_id", branchFilter)
      : await queryBuilder;

    if (error) {
      setListError(error.message);
      return;
    }

    setClients((data ?? []) as Client[]);
  }

  function openCreateForm() {
    setEditingClient(null);
    setFormValues(defaultForm(currentUser.branch_id));
    setFormError("");
    setFormOpen(true);
  }

  function openEditForm(client: Client) {
    setEditingClient(client);
    setFormValues({
      id: client.id,
      branch_id: client.branch_id,
      client_code: client.client_code,
      name: client.name,
      email: client.email ?? "",
      phone: client.phone ?? "",
      contact_person: client.contact_person ?? "",
      city: client.city ?? "",
      address: client.address ?? "",
      status: client.status,
    });
    setFormError("");
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingClient(null);
    setFormError("");
    setFormValues(defaultForm(currentUser.branch_id));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const parsed = clientSchema.safeParse(formValues);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Please check the client details.");
      return;
    }

    const payload = {
      branch_id: parsed.data.branch_id,
      client_code: parsed.data.client_code.trim(),
      name: parsed.data.name.trim(),
      email: parsed.data.email?.trim() || null,
      phone: parsed.data.phone?.trim() || null,
      contact_person: parsed.data.contact_person?.trim() || null,
      city: parsed.data.city?.trim() || null,
      address: parsed.data.address?.trim() || null,
      status: parsed.data.status,
    };

    startTransition(async () => {
      const supabase = createClientSupabaseClient();
      if (!supabase) {
        setFormError("Supabase client is not configured.");
        return;
      }

      const response = editingClient
        ? await supabase
            .from("clients")
            .update(payload)
            .eq("id", editingClient.id)
            .select(
              "id, branch_id, client_code, name, email, phone, contact_person, address, city, state, status",
            )
            .single()
        : await supabase
            .from("clients")
            .insert(payload)
            .select(
              "id, branch_id, client_code, name, email, phone, contact_person, address, city, state, status",
            )
            .single();

      if (response.error) {
        setFormError(response.error.message);
        return;
      }

      const saved = response.data as Client;

      setClients((current) => {
        if (editingClient) {
          return current.map((client) => (client.id === editingClient.id ? saved : client));
        }

        return [saved, ...current];
      });

      closeForm();
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-4 md:flex-row">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by client, code, city, email..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-teal-500"
              />
            </label>

            <select
              value={selectedBranch}
              onChange={(event) => {
                const nextBranch = event.target.value;
                setSelectedBranch(nextBranch);
                startTransition(async () => {
                  await loadClients(nextBranch);
                });
              }}
              disabled={!canChooseAnyBranch(currentUser.role)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              {canChooseAnyBranch(currentUser.role) ? <option value="all">All branches</option> : null}
              {allowedBranches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => startTransition(async () => loadClients())}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCw className={cn("h-4 w-4", isPending ? "animate-spin" : "")} />
              Refresh
            </button>
            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Add client
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
                {["Client", "Branch", "Contact", "City", "Status", "Actions"].map((header) => (
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
              {filteredClients.length ? (
                filteredClients.map((client) => (
                  <tr key={client.id}>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-900">{client.name}</p>
                      <p className="text-sm text-slate-500">{client.client_code}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      {branches.find((branch) => branch.id === client.branch_id)?.name ?? "Unknown branch"}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      <p>{client.contact_person || "No contact person"}</p>
                      <p>{client.email || client.phone || "No contact info"}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">{client.city || "Not set"}</td>
                    <td className="px-4 py-4">
                      <StatusPill value={client.status} />
                    </td>
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() => openEditForm(client)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        <PencilLine className="h-4 w-4" />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                    No clients found for the current filters.
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
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-teal-700">
                {editingClient ? "Edit Client" : "New Client"}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                {editingClient ? "Update client details" : "Add a pathology client"}
              </h2>
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
            <FormField label="Branch">
              <select
                value={formValues.branch_id}
                onChange={(event) => setFormValues((current) => ({ ...current, branch_id: event.target.value }))}
                disabled={!canChooseAnyBranch(currentUser.role)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 disabled:bg-slate-100"
              >
                <option value="">Select branch</option>
                {allowedBranches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Client code">
              <input
                value={formValues.client_code}
                onChange={(event) => setFormValues((current) => ({ ...current, client_code: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
                placeholder="CL-1045"
              />
            </FormField>

            <FormField label="Client name">
              <input
                value={formValues.name}
                onChange={(event) => setFormValues((current) => ({ ...current, name: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
                placeholder="Apex Path Labs"
              />
            </FormField>

            <FormField label="Contact person">
              <input
                value={formValues.contact_person}
                onChange={(event) => setFormValues((current) => ({ ...current, contact_person: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
                placeholder="Rohit Jain"
              />
            </FormField>

            <FormField label="Email">
              <input
                value={formValues.email}
                onChange={(event) => setFormValues((current) => ({ ...current, email: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
                placeholder="ops@client.com"
              />
            </FormField>

            <FormField label="Phone">
              <input
                value={formValues.phone}
                onChange={(event) => setFormValues((current) => ({ ...current, phone: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
                placeholder="+91 99999 99999"
              />
            </FormField>

            <FormField label="City">
              <input
                value={formValues.city}
                onChange={(event) => setFormValues((current) => ({ ...current, city: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
                placeholder="Indore"
              />
            </FormField>

            <FormField label="Status">
              <select
                value={formValues.status}
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    status: event.target.value as ClientFormValues["status"],
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </FormField>

            <div className="md:col-span-2">
              <FormField label="Address">
                <textarea
                  value={formValues.address}
                  onChange={(event) => setFormValues((current) => ({ ...current, address: event.target.value }))}
                  rows={4}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
                  placeholder="Full client address"
                />
              </FormField>
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
                {editingClient ? "Save changes" : "Create client"}
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
