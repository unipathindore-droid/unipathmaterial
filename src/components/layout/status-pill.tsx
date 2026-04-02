import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  inactive: "bg-zinc-200 text-zinc-700",
  draft: "bg-zinc-200 text-zinc-700",
  submitted: "bg-amber-100 text-amber-800",
  partially_approved: "bg-orange-100 text-orange-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
  dispatched: "bg-sky-100 text-sky-800",
  delivered: "bg-emerald-100 text-emerald-800",
  queued: "bg-zinc-200 text-zinc-700",
  packed: "bg-indigo-100 text-indigo-800",
  pending: "bg-amber-100 text-amber-800",
  in_transit: "bg-sky-100 text-sky-800",
  issue: "bg-rose-100 text-rose-800",
  internal: "bg-slate-200 text-slate-800",
  client_email: "bg-cyan-100 text-cyan-800",
};

export function StatusPill({ value }: { value: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize tracking-wide",
        styles[value] ?? "bg-zinc-200 text-zinc-700",
      )}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}
