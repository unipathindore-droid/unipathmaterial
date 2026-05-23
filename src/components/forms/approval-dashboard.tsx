"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Clock3, Loader2, MessageSquareWarning, XCircle } from "lucide-react";

import { applyApprovalDecisionAction } from "@/app/(app)/approval/actions";
import { StatusPill } from "@/components/layout/status-pill";
import { cn, formatDateTime } from "@/lib/utils";
import { approvalSchema } from "@/lib/validators/approval";
import type { ApprovalQueueItem } from "@/types/domain";

type ApprovalDashboardProps = {
  initialQueue: ApprovalQueueItem[];
};

export function ApprovalDashboard({
  initialQueue,
}: ApprovalDashboardProps) {
  const router = useRouter();
  const [queue, setQueue] = useState(initialQueue);
  const [decisionMap, setDecisionMap] = useState<Record<string, "approved" | "rejected" | "partially_approved">>({});
  const [reasonMap, setReasonMap] = useState<Record<string, string>>({});
  const [errorMap, setErrorMap] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState("");
  const [isPending, startTransition] = useTransition();

  const stats = useMemo(() => {
    return {
      pending: queue.filter((item) => item.decision === "pending").length,
      partial: queue.filter((item) => item.decision === "partially_approved").length,
      approved: queue.filter((item) => item.decision === "approved").length,
      rejected: queue.filter((item) => item.decision === "rejected").length,
    };
  }, [queue]);

  async function handleDecision(request: ApprovalQueueItem) {
    const decision = decisionMap[request.id] ?? "approved";
    const reason = reasonMap[request.id] ?? "";
    const parsed = approvalSchema.safeParse({ decision, reason });

    if (!parsed.success) {
      setErrorMap((current) => ({
        ...current,
        [request.id]: parsed.error.issues[0]?.message ?? "Please review the approval input.",
      }));
      return;
    }

    setErrorMap((current) => ({ ...current, [request.id]: "" }));
    setGlobalError("");

    startTransition(async () => {
      const result = await applyApprovalDecisionAction({
        requestId: request.id,
        decision: parsed.data.decision,
        reason: parsed.data.reason ?? "",
      });

      if (!result.ok) {
        setErrorMap((current) => ({ ...current, [request.id]: result.error }));
        return;
      }

      setQueue((current) =>
        current.map((item) =>
          item.id === request.id
            ? { ...item, decision: parsed.data.decision, partial_reason: parsed.data.reason || null }
            : item,
        ),
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Clock3} label="Pending" value={stats.pending} tone="amber" />
        <StatCard icon={CheckCircle2} label="Approved" value={stats.approved} tone="emerald" />
        <StatCard icon={MessageSquareWarning} label="Partial" value={stats.partial} tone="orange" />
        <StatCard icon={XCircle} label="Rejected" value={stats.rejected} tone="rose" />
      </section>

      {globalError ? (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4" />
          <span>{globalError}</span>
        </div>
      ) : null}

      <section className="grid gap-5">
        {queue.length ? (
          queue.map((request) => (
            <article
              key={request.id}
              className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-sm"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold text-slate-950">{request.request_number}</h2>
                    <StatusPill value={request.decision} />
                  </div>
                  <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                    <p>Client: {request.client_name}</p>
                    <p>Branch: {request.branch_name}</p>
                    <p>Submitted by: {request.submitted_by}</p>
                    <p>Pending items: {request.pending_items}</p>
                    <p>Submitted at: {formatDateTime(request.submitted_at)}</p>
                    <p>Current reason: {request.partial_reason || "Awaiting decision"}</p>
                  </div>
                </div>

                <div className="w-full max-w-xl space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <DecisionButton
                      label="Approve"
                      tone="emerald"
                      active={(decisionMap[request.id] ?? "approved") === "approved"}
                      onClick={() =>
                        setDecisionMap((current) => ({ ...current, [request.id]: "approved" }))
                      }
                    />
                    <DecisionButton
                      label="Partial"
                      tone="orange"
                      active={decisionMap[request.id] === "partially_approved"}
                      onClick={() =>
                        setDecisionMap((current) => ({
                          ...current,
                          [request.id]: "partially_approved",
                        }))
                      }
                    />
                    <DecisionButton
                      label="Reject"
                      tone="rose"
                      active={decisionMap[request.id] === "rejected"}
                      onClick={() =>
                        setDecisionMap((current) => ({ ...current, [request.id]: "rejected" }))
                      }
                    />
                  </div>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700">
                      Reason {decisionMap[request.id] === "rejected" || decisionMap[request.id] === "partially_approved" ? "(required)" : "(optional)"}
                    </span>
                    <textarea
                      rows={3}
                      value={reasonMap[request.id] ?? ""}
                      onChange={(event) =>
                        setReasonMap((current) => ({ ...current, [request.id]: event.target.value }))
                      }
                      placeholder="Explain why the request is rejected or partially approved."
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
                    />
                  </label>

                  {errorMap[request.id] ? (
                    <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      <AlertCircle className="mt-0.5 h-4 w-4" />
                      <span>{errorMap[request.id]}</span>
                    </div>
                  ) : null}

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleDecision(request)}
                      disabled={isPending}
                      className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Save decision
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/80 px-6 py-12 text-center shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Approval queue is empty</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Submitted requests will appear here for admin and branch admin review.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: "amber" | "emerald" | "orange" | "rose";
}) {
  const tones = {
    amber: "bg-amber-50 border-amber-200 text-amber-800",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-800",
    orange: "bg-orange-50 border-orange-200 text-orange-800",
    rose: "bg-rose-50 border-rose-200 text-rose-800",
  };

  return (
    <div className={cn("rounded-[2rem] border p-5 shadow-sm", tones[tone])}>
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5" />
        <p className="text-sm font-medium">{label}</p>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function DecisionButton({
  label,
  tone,
  active,
  onClick,
}: {
  label: string;
  tone: "emerald" | "orange" | "rose";
  active: boolean;
  onClick: () => void;
}) {
  const tones = {
    emerald: active
      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
      : "border-slate-200 bg-white text-slate-700",
    orange: active
      ? "border-orange-300 bg-orange-50 text-orange-800"
      : "border-slate-200 bg-white text-slate-700",
    rose: active
      ? "border-rose-300 bg-rose-50 text-rose-800"
      : "border-slate-200 bg-white text-slate-700",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm font-semibold transition hover:border-slate-300",
        tones[tone],
      )}
    >
      {label}
    </button>
  );
}
