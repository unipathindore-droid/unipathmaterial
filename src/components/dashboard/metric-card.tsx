import { formatNumber } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: number;
  helper: string;
}) {
  return (
    <div className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
        {formatNumber(value)}
      </p>
      <p className="mt-2 text-sm text-slate-600">{helper}</p>
    </div>
  );
}
