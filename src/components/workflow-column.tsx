import type { WorkflowColumn as WorkflowColumnType } from "@/types/studio";

export function WorkflowColumn({ column }: { column: WorkflowColumnType }) {
  return (
    <section className="rounded-[32px] border border-[var(--ink)]/8 bg-[color:rgba(20,17,14,0.92)] p-5 text-[var(--canvas)] shadow-[0_18px_60px_rgba(18,16,13,0.18)]">
      <div className={`mb-4 h-24 rounded-[24px] bg-gradient-to-br ${column.accent}`} />
      <div className="mb-5 flex items-center justify-between gap-4">
        <h3 className="font-display text-3xl uppercase tracking-[0.1em]">
          {column.stage}
        </h3>
        <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
          {column.cards.length} active
        </span>
      </div>
      <div className="space-y-4">
        {column.cards.map((card) => (
          <article
            key={`${column.stage}-${card.client}`}
            className="rounded-[24px] border border-white/10 bg-white/6 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-base font-semibold tracking-[0.02em] text-white">
                {card.client}
              </p>
              <span className="text-xs uppercase tracking-[0.22em] text-white/55">
                {card.artist}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/72">{card.note}</p>
          </article>
        ))}
      </div>
    </section>
  );
}