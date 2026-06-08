"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, MailCheck, RefreshCw, Truck } from "lucide-react";

import {
  createDispatchAction,
  getDispatchDraftAction,
} from "@/app/(app)/dispatch/actions";
import { StatusPill } from "@/components/layout/status-pill";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { dispatchSchema, type DispatchFormValues } from "@/lib/validators/dispatch";
import type { DispatchRecord, NotificationRecord, RequestRecord } from "@/types/domain";

type DispatchManagerProps = {
  initialDispatches: DispatchRecord[];
  initialRequests: RequestRecord[];
  initialNotifications: NotificationRecord[];
};

type DispatchLine = DispatchFormValues["items"][number];

export function DispatchManager({
  initialDispatches,
  initialRequests,
  initialNotifications,
}: DispatchManagerProps) {
  const router = useRouter();
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [formValues, setFormValues] = useState<DispatchFormValues>({
    request_id: "",
    dispatch_date: new Date().toISOString().slice(0, 10),
    dispatch_from_branch_id: "",
    dispatch_to_branch_id: "",
    destination_name: "",
    dispatch_type: "courier",
    person_name: "",
    bus_name: "",
    bus_number: "",
    courier_name: "",
    lr_number: "",
    tracking_number: "",
    contact_number: "",
    remarks: "",
    dispatch_status: "queued",
    received_confirmation: false,
    received_by: "",
    received_date: "",
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

  async function refreshDispatches() {
    setListError("");
    router.refresh();
  }

  async function loadRequestItems(requestId: string) {
    setSelectedRequestId(requestId);
    const request = approvedRequests.find((item) => item.id === requestId);
    setFormValues((current) => ({
      ...current,
      request_id: requestId,
      dispatch_from_branch_id: request?.branch_id ?? current.dispatch_from_branch_id,
      items: [],
    }));
    setFormError("");

    if (!requestId) {
      return;
    }

    const draft = await getDispatchDraftAction(requestId);
    if (!draft.ok) {
      setFormError(draft.error);
      return;
    }

    setFormValues((current) => ({
      ...current,
      request_id: requestId,
      items: draft.items,
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

    startTransition(async () => {
      const result = await createDispatchAction(parsed.data);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }

      setSelectedRequestId("");
      setFormValues({
        request_id: "",
        dispatch_date: new Date().toISOString().slice(0, 10),
        dispatch_from_branch_id: "",
        dispatch_to_branch_id: "",
        destination_name: "",
        dispatch_type: "courier",
        person_name: "",
        bus_name: "",
        bus_number: "",
        courier_name: "",
        lr_number: "",
        tracking_number: "",
        contact_number: "",
        remarks: "",
        dispatch_status: "queued",
        received_confirmation: false,
        received_by: "",
        received_date: "",
        eta_date: "",
        items: [],
      });
      router.refresh();
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
            <Field label="Dispatch date">
              <input
                type="date"
                value={formValues.dispatch_date}
                onChange={(event) =>
                  setFormValues((current) => ({ ...current, dispatch_date: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
              />
            </Field>

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

            <Field label="Dispatch type">
              <select
                value={formValues.dispatch_type}
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    dispatch_type: event.target.value as DispatchFormValues["dispatch_type"],
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
              >
                <option value="person">By Person</option>
                <option value="bus">By Bus</option>
                <option value="courier">By Courier Service</option>
              </select>
            </Field>

            <Field label="Dispatch to branch / destination">
              <input
                value={formValues.destination_name}
                onChange={(event) =>
                  setFormValues((current) => ({ ...current, destination_name: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
                placeholder="Branch or destination name"
              />
            </Field>

            <Field label="Courier company name">
              <input
                value={formValues.courier_name}
                onChange={(event) =>
                  setFormValues((current) => ({ ...current, courier_name: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
                placeholder="BlueDart"
              />
            </Field>

            <Field label="Tracking number / LR number">
              <input
                value={formValues.tracking_number}
                onChange={(event) =>
                  setFormValues((current) => ({ ...current, tracking_number: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
                placeholder="BD12345678"
              />
            </Field>

            <Field label="Person name">
              <input
                value={formValues.person_name}
                onChange={(event) =>
                  setFormValues((current) => ({ ...current, person_name: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
                placeholder="Dispatch person"
              />
            </Field>

            <Field label="Bus name / number">
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={formValues.bus_name}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, bus_name: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
                  placeholder="Bus name"
                />
                <input
                  value={formValues.bus_number}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, bus_number: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
                  placeholder="Bus number"
                />
              </div>
            </Field>

            <Field label="Contact number">
              <input
                value={formValues.contact_number}
                onChange={(event) =>
                  setFormValues((current) => ({ ...current, contact_number: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
                placeholder="9876543210"
              />
            </Field>

            <Field label="Dispatch status">
              <select
                value={formValues.dispatch_status}
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    dispatch_status: event.target.value as DispatchFormValues["dispatch_status"],
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
              >
                <option value="queued">Queued</option>
                <option value="packed">Packed</option>
                <option value="dispatched">Dispatched</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </Field>
          </div>

          <Field label="Remarks">
            <textarea
              value={formValues.remarks}
              onChange={(event) =>
                setFormValues((current) => ({ ...current, remarks: event.target.value }))
              }
              className="min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
              placeholder="Optional movement notes"
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={formValues.received_confirmation}
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    received_confirmation: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-slate-300"
              />
              <span>Received confirmation</span>
            </label>

            <Field label="Received by">
              <input
                value={formValues.received_by}
                onChange={(event) =>
                  setFormValues((current) => ({ ...current, received_by: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
                placeholder="Receiver name"
              />
            </Field>

            <Field label="Received date">
              <input
                type="date"
                value={formValues.received_date}
                onChange={(event) =>
                  setFormValues((current) => ({ ...current, received_date: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
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
              onClick={() => startTransition(async () => refreshDispatches())}
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
                  {["Dispatch", "Client", "Mode", "Tracking", "Dispatched", "ETA", "Status"].map((header) => (
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
                {initialDispatches.length ? (
                  initialDispatches.map((dispatch) => (
                    <tr key={dispatch.id}>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900">{dispatch.dispatch_number}</p>
                        <p className="text-sm text-slate-500">{dispatch.request_number}</p>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">{dispatch.client_name}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {dispatch.dispatch_type ?? "Pending"}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {dispatch.tracking_number || dispatch.lr_number || "Pending"}
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
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
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
            {initialNotifications
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
