"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ClipboardPlus, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";

import { createRequestAction } from "@/app/(app)/requests/actions";
import { StatusPill } from "@/components/layout/status-pill";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { requestSchema, type RequestFormValues } from "@/lib/validators/request";
import type { Client, Material, RequestRecord, UserProfile } from "@/types/domain";

type RequestManagerProps = {
  initialRequests: RequestRecord[];
  clients: Client[];
  materials: Material[];
  currentUser: UserProfile;
};

const defaultItem = () => ({
  material_id: "",
  requested_qty: 1,
  remarks: "",
});

const defaultForm: RequestFormValues = {
  client_id: "",
  required_by: "",
  notes: "",
  items: [defaultItem()],
};

export function RequestManager({
  initialRequests,
  clients,
  materials,
  currentUser,
}: RequestManagerProps) {
  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests);
  const [formValues, setFormValues] = useState<RequestFormValues>(defaultForm);
  const [formError, setFormError] = useState("");
  const [listError, setListError] = useState("");
  const [isPending, startTransition] = useTransition();

  const allowedClients = useMemo(() => {
    if (currentUser.role === "superadmin" || currentUser.role === "admin") return clients;
    return clients.filter((client) => client.branch_id === currentUser.branch_id);
  }, [clients, currentUser.branch_id, currentUser.role]);

  const activeMaterials = useMemo(
    () => materials.filter((material) => material.active),
    [materials],
  );

  async function refreshRequests() {
    setListError("");
    router.refresh();
  }

  function updateItem(index: number, key: keyof RequestFormValues["items"][number], value: string | number) {
    setFormValues((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));
  }

  function addItemRow() {
    setFormValues((current) => ({
      ...current,
      items: [...current.items, defaultItem()],
    }));
  }

  function removeItemRow(index: number) {
    setFormValues((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function resetForm() {
    setFormValues(defaultForm);
    setFormError("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const parsed = requestSchema.safeParse(formValues);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Please review the request details.");
      return;
    }

    const selectedClient = allowedClients.find((client) => client.id === parsed.data.client_id);
    if (!selectedClient) {
      setFormError("Selected client is not available for your branch.");
      return;
    }

    startTransition(async () => {
      const result = await createRequestAction(parsed.data);

      if (!result.ok) {
        setFormError(result.error);
        return;
      }

      setRequests((current) => [result.request, ...current]);

      resetForm();
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ClipboardPlus className="h-5 w-5 text-teal-700" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-teal-700">
                Create Request
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Add a new material request
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => startTransition(async () => refreshRequests())}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCw className={cn("h-4 w-4", isPending ? "animate-spin" : "")} />
            Refresh
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Client">
              <select
                value={formValues.client_id}
                onChange={(event) =>
                  setFormValues((current) => ({ ...current, client_id: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
              >
                <option value="">Select client</option>
                {allowedClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} ({client.client_code})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Required by">
              <input
                type="date"
                value={formValues.required_by}
                onChange={(event) =>
                  setFormValues((current) => ({ ...current, required_by: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
              />
            </Field>
          </div>

          <Field label="Notes">
            <textarea
              rows={3}
              value={formValues.notes}
              onChange={(event) =>
                setFormValues((current) => ({ ...current, notes: event.target.value }))
              }
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
              placeholder="Optional request notes"
            />
          </Field>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">Request items</h3>
                <p className="text-sm text-slate-600">
                  Add one or more materials with requested quantities.
                </p>
              </div>
              <button
                type="button"
                onClick={addItemRow}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" />
                Add item
              </button>
            </div>

            {formValues.items.map((item, index) => (
              <div
                key={index}
                className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1.4fr_0.6fr_1fr_auto]"
              >
                <Field label={`Material ${index + 1}`}>
                  <select
                    value={item.material_id}
                    onChange={(event) => updateItem(index, "material_id", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
                  >
                    <option value="">Select material</option>
                    {activeMaterials.map((material) => (
                      <option key={material.id} value={material.id}>
                        {material.name} ({material.sku})
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Quantity">
                  <input
                    type="number"
                    min={1}
                    value={item.requested_qty}
                    onChange={(event) =>
                      updateItem(index, "requested_qty", Number(event.target.value))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
                  />
                </Field>

                <Field label="Remarks">
                  <input
                    value={item.remarks}
                    onChange={(event) => updateItem(index, "remarks", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
                    placeholder="Optional"
                  />
                </Field>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeItemRow(index)}
                    disabled={formValues.items.length === 1}
                    className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {formError ? (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4" />
              <span>{formError}</span>
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save request
            </button>
          </div>
        </form>
      </section>

      {listError ? (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4" />
          <span>{listError}</span>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {["Request", "Submitted", "Need By", "Items", "Quantity", "Status"].map((header) => (
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
              {requests.length ? (
                requests.map((request) => (
                  <tr key={request.id}>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-900">{request.request_number}</p>
                      <p className="text-sm text-slate-500">{request.client_name}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      {formatDateTime(request.requested_at)}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">{formatDate(request.needed_by)}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{request.total_items}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{request.total_requested_quantity}</td>
                    <td className="px-4 py-4">
                      <StatusPill value={request.status} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                    No requests created yet.
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
