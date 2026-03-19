import type { Metric } from "@/types/studio";

export function MetricCard({ metric }: { metric: Metric }) {
  return (
    <article className="rounded-[28px] border border-white/40 bg-[color:rgba(255,255,255,0.62)] p-5 shadow-[0_14px_45px_rgba(18,16,13,0.08)] backdrop-blur-sm">
      <p className="text-xs uppercase tracking-[0.26em] text-[var(--muted)]">
        {metric.label}
      </p>
      <div className="mt-4 flex items-end justify-between gap-4">
        <p className="font-display text-5xl uppercase leading-none tracking-[0.06em] text-[var(--ink)]">
          {metric.value}
        </p>
        <p className="max-w-[10rem] text-right text-sm font-semibold text-[var(--muted)]">
          {metric.delta}
        </p>
      </div>
    </article>
  );
}