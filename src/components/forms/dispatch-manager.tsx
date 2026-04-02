"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertCircle, Loader2, MailCheck, RefreshCw, Truck } from "lucide-react";

import { StatusPill } from "@/components/layout/status-pill";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { dispatchSchema, type DispatchFormValues } from "@/lib/validators/dispatch";
import type { Client, DispatchRecord, NotificationRecord, RequestRecord } from "@/types/domain";

type DispatchManagerProps = {
  initialDispatches: DispatchRecord[];
  initialRequests: RequestRecord[];
  clients: Client[];
  initialNotifications: NotificationRecord[];
};

type DispatchLine = DispatchFormValues["items"][number];

type RequestItemRow = {
  id: string;
  material_id: string;
  approved_quantity: number | null;
  materials:
    | { name: string | null; requires_expiry_before_dispatch: boolean | null; unit_of_measure?: string | null }[]
    | { name: string | null; requires_expiry_before_dispatch: boolean | null; unit_of_measure?: string | null }
    | null;
};

type InventoryRow = {
  id: string;
  material_id: string;
};

function buildDispatchNumber() {
  const now = new Date();
  return `DSP-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate(),
  ).padStart(2, "0")}-${String(now.getTime()).slice(-5)}`;
}

export function DispatchManager({
  initialDispatches,
  initialRequests,
  clients,
  initialNotifications,
}: DispatchManagerProps) {
  const [dispatches, setDispatches] = useState(initialDispatches);
  const [emailEvents, setEmailEvents] = useState(initialNotifications);
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [formValues, setFormValues] = useState<DispatchFormValues>({
    request_id: "",
    courier_name: "",
    tracking_number: "",
    eta_date: "",
    items: [],
  });
  const [formError, setFormError] = useState("");
  const [listError, setListError] = useState("");
  const [isPending, startTransition] = useTransition();

  const approvedRequests = useMemo(
    () => initialRequests.filter((request) => request.status === "approved"),
    [initialRequests],
  );

  async function loadDispatches() {
    const supabase = createClientSupabaseClient();
    if (!supabase) {
      setListError("Supabase client is not configured.");
      return;
    }

    const [dispatchResponse, notificationResponse] = await Promise.all([
      supabase
        .from("dispatch_overview")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("email_events")
        .select("id, event_type, recipient_email, created_at, sent_at")
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

    if (dispatchResponse.error) {
      setListError(dispatchResponse.error.message);
      return;
    }

    if (notificationResponse.error) {
      setListError(notificationResponse.error.message);
      return;
    }

    setDispatches((dispatchResponse.data ?? []) as DispatchRecord[]);
    setEmailEvents(
      ((notificationResponse.data ?? []) as Array<{
        id: string;
        event_type: "dispatch_notice" | "expiry_warning";
        recipient_email: string;
        created_at: string;
        sent_at?: string | null;
      }>).map((item) => ({
        id: item.id,
        title: item.event_type === "dispatch_notice" ? "Dispatch email queued" : "Expiry warning email queued",
        body: `${item.event_type === "dispatch_notice" ? "Dispatch" : "Expiry"} email queued for ${item.recipient_email}.`,
        kind: "client_email",
        created_at: item.created_at,
        read_at: item.sent_at ?? null,
        route: "/dispatch",
      })),
    );
    setListError("");
  }

  async function loadRequestItems(requestId: string) {
    setSelectedRequestId(requestId);
    setFormValues((current) => ({ ...current, request_id: requestId, items: [] }));
    setFormError("");

    if (!requestId) {
      return;
    }

    const supabase = createClientSupabaseClient();
    if (!supabase) {
      setFormError("Supabase client is not configured.");
      return;
    }

    const selectedRequest = approvedRequests.find((request) => request.id === requestId);
    if (!selectedRequest) {
      setFormError("Request details could not be loaded.");
      return;
    }

    const { data, error } = await supabase
      .from("material_request_items")
      .select("id, material_id, approved_quantity, materials(name, requires_expiry_before_dispatch)")
      .eq("request_id", requestId);

    if (error) {
      setFormError(error.message);
      return;
    }

    const materialIds = ((data ?? []) as RequestItemRow[]).map((item) => item.material_id);
    const inventoryResponse = await supabase
      .from("branch_inventory")
      .select("id, material_id")
      .eq("branch_id", selectedRequest.branch_id)
      .in("material_id", materialIds);

    if (inventoryResponse.error) {
      setFormError(inventoryResponse.error.message);
      return;
    }

    const inventoryMap = new Map(
      ((inventoryResponse.data ?? []) as InventoryRow[]).map((item) => [item.material_id, item.id]),
    );

    const rows = ((data ?? []) as RequestItemRow[]).map((item) => {
      const materialRelation = Array.isArray(item.materials) ? item.materials[0] : item.materials;
      const branchInventoryId = inventoryMap.get(item.material_id);

      return {
        request_item_id: item.id,
        material_id: item.material_id,
        branch_inventory_id: branchInventoryId ?? "",
        material_name: materialRelation?.name ?? "Unknown material",
        expiry_required: Boolean(materialRelation?.requires_expiry_before_dispatch),
        quantity: Number(item.approved_quantity ?? 1),
        batch_number: "",
        expiry_date: "",
      };
    }).filter((item) => item.quantity > 0);

    setFormValues((current) => ({
      ...current,
      request_id: requestId,
      items: rows,
    }));
  }

  function updateItem(index: number, key: keyof DispatchLine, value: string | number | boolean) {
    setFormValues((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const parsed = dispatchSchema.safeParse(formValues);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Please review the dispatch details.");
      return;
    }

    const request = approvedRequests.find((item) => item.id === parsed.data.request_id);
    if (!request || request.status !== "approved") {
      setFormError("Only approved requests can be dispatched.");
      return;
    }

    const client = clients.find((item) => item.id === request.client_id);
    if (!client) {
      setFormError("Client information is missing for this request.");
      return;
    }

    const dispatchNumber = buildDispatchNumber();

    startTransition(async () => {
      const supabase = createClientSupabaseClient();
      if (!supabase) {
        setFormError("Supabase client is not configured.");
        return;
      }

      const dispatchInsert = await supabase
        .from("dispatches")
        .insert({
          request_id: request.id,
          branch_id: request.branch_id,
          client_id: request.client_id,
          dispatch_number: dispatchNumber,
          status: "queued",
          prepared_by: null,
          courier_name: parsed.data.courier_name || null,
          tracking_number: parsed.data.tracking_number || null,
          eta_date: parsed.data.eta_date || null,
        })
        .select("id")
        .single();

      if (dispatchInsert.error || !dispatchInsert.data) {
        setFormError(dispatchInsert.error?.message ?? "Unable to create dispatch.");
        return;
      }

      const dispatchId = dispatchInsert.data.id as string;

      const itemsInsert = await supabase.from("dispatch_items").insert(
        parsed.data.items.map((item) => ({
          dispatch_id: dispatchId,
          request_item_id: item.request_item_id,
          material_id: item.material_id,
          branch_inventory_id: item.branch_inventory_id,
          quantity: item.quantity,
          batch_number: item.batch_number || null,
          expiry_date: item.expiry_date || null,
        })),
      );

      if (itemsInsert.error) {
        await supabase.from("dispatches").delete().eq("id", dispatchId);
        setFormError(itemsInsert.error.message);
        return;
      }

      const requestUpdate = await supabase
        .from("material_requests")
        .update({ status: "dispatched" })
        .eq("id", request.id);

      if (requestUpdate.error) {
        setFormError(requestUpdate.error.message);
        return;
      }

      const dispatchStatusUpdate = await supabase
        .from("dispatches")
        .update({
          status: "dispatched",
          dispatched_by: null,
          dispatched_at: new Date().toISOString(),
        })
        .eq("id", dispatchId);

      if (dispatchStatusUpdate.error) {
        setFormError(dispatchStatusUpdate.error.message);
        return;
      }

      const notificationInsert = await supabase.from("notifications").insert([
        {
          branch_id: request.branch_id,
          recipient_user_id: null,
          title: `Dispatch ${dispatchNumber} created`,
          body: `${client.name} is ready for shipment under request ${request.request_number}.`,
          kind: "internal",
          route: "/dispatch",
        },
      ]);

      if (notificationInsert.error) {
        setFormError(notificationInsert.error.message);
      }

      setDispatches((current) => [
        {
          id: dispatchId,
          dispatch_number: dispatchNumber,
          request_number: request.request_number,
          client_name: client.name,
          branch_name: "Branch",
          status: "dispatched",
          courier_name: parsed.data.courier_name || null,
          tracking_number: parsed.data.tracking_number || null,
          dispatched_at: new Date().toISOString(),
          eta_date: parsed.data.eta_date || null,
        },
        ...current,
      ]);
      setEmailEvents((current) => [
        {
          id: `email-${dispatchId}`,
          title: "Dispatch email queued",
          body: `Dispatch update queued for ${client.name}${client.email ? ` (${client.email})` : ""}.`,
          kind: "client_email",
          created_at: new Date().toISOString(),
          read_at: null,
          route: "/dispatch",
        },
        ...current,
      ]);

      setSelectedRequestId("");
      setFormValues({
        request_id: "",
        courier_name: "",
        tracking_number: "",
        eta_date: "",
        items: [],
      });
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <Truck className="h-5 w-5 text-teal-700" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-teal-700">
              Dispatch Form
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Create a dispatch from approved requests
            </h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Approved request">
              <select
                value={selectedRequestId}
                onChange={(event) => void loadRequestItems(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
              >
                <option value="">Select approved request</option>
                {approvedRequests.map((request) => (
                  <option key={request.id} value={request.id}>
                    {request.request_number} - {request.client_name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="ETA date">
              <input
                type="date"
                value={formValues.eta_date}
                onChange={(event) =>
                  setFormValues((current) => ({ ...current, eta_date: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
              />
            </Field>

            <Field label="Courier name">
              <input
                value={formValues.courier_name}
                onChange={(event) =>
                  setFormValues((current) => ({ ...current, courier_name: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
                placeholder="BlueDart"
              />
            </Field>

            <Field label="Tracking number">
              <input
                value={formValues.tracking_number}
                onChange={(event) =>
                  setFormValues((current) => ({ ...current, tracking_number: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
                placeholder="BD12345678"
              />
            </Field>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-950">Dispatch items</h3>
            {formValues.items.length ? (
              formValues.items.map((item, index) => (
                <div
                  key={item.request_item_id}
                  className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1.2fr_0.7fr_1fr_1fr]"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-slate-900">{item.material_name}</p>
                    <p className="text-sm text-slate-500">
                      {item.expiry_required ? "Expiry required" : "Expiry optional"}
                    </p>
                  </div>

                  <Field label="Quantity">
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(event) => updateItem(index, "quantity", Number(event.target.value))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
                    />
                  </Field>

                  <Field label="Batch number">
                    <input
                      value={item.batch_number}
                      onChange={(event) => updateItem(index, "batch_number", event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
                      placeholder="LOT-001"
                    />
                  </Field>

                  <Field label={`Expiry date${item.expiry_required ? " *" : ""}`}>
                    <input
                      type="date"
                      value={item.expiry_date}
                      onChange={(event) => updateItem(index, "expiry_date", event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
                    />
                  </Field>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Select an approved request to load dispatchable materials.
              </div>
            )}
          </div>

          {formError ? (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4" />
              <span>{formError}</span>
            </div>
          ) : null}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending || !formValues.items.length}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save dispatch
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

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h3 className="text-lg font-semibold text-slate-950">Recent dispatches</h3>
            <button
              type="button"
              onClick={() => startTransition(async () => loadDispatches())}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCw className={cn("h-4 w-4", isPending ? "animate-spin" : "")} />
              Refresh
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {["Dispatch", "Client", "Courier", "Dispatched", "ETA", "Status"].map((header) => (
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
                {dispatches.length ? (
                  dispatches.map((dispatch) => (
                    <tr key={dispatch.id}>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900">{dispatch.dispatch_number}</p>
                        <p className="text-sm text-slate-500">{dispatch.request_number}</p>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">{dispatch.client_name}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {dispatch.courier_name || "Pending"}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {formatDateTime(dispatch.dispatched_at)}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">{formatDate(dispatch.eta_date)}</td>
                      <td className="px-4 py-4">
                        <StatusPill value={dispatch.status} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                      No dispatches found yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <MailCheck className="h-5 w-5 text-cyan-700" />
            <h2 className="text-xl font-semibold text-slate-950">Client email events</h2>
          </div>
          <div className="space-y-3">
            {emailEvents
              .filter((item) => item.kind === "client_email")
              .map((item) => (
                <div key={item.id} className="rounded-3xl border border-cyan-100 bg-cyan-50 px-4 py-4">
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.body}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.25em] text-slate-500">
                    {formatDateTime(item.created_at)}
                  </p>
                </div>
              ))}
          </div>
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
