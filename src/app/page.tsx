import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { LiveDateTime } from "@/components/live-date-time";
import { MetricCard } from "@/components/metric-card";
import { WorkflowColumn } from "@/components/workflow-column";
import {
  moduleCards,
  studioMetrics,
  studioTimeline,
  workflowColumns,
} from "@/lib/mock-data";

export default function Home() {
  return (
    <AppShell>
      <main className="space-y-8">
        <section className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[40px] border border-white/35 bg-[linear-gradient(145deg,rgba(255,255,255,0.86),rgba(246,237,221,0.74))] p-8 shadow-[0_20px_70px_rgba(18,16,13,0.08)] backdrop-blur-sm sm:p-10 lg:p-12">
            <p className="text-xs font-semibold uppercase tracking-[0.38em] text-[var(--muted)]">
              Tattoo studio operating system
            </p>
            <h1 className="mt-5 max-w-4xl font-display text-6xl uppercase leading-[0.88] tracking-[0.06em] text-[var(--ink)] sm:text-7xl lg:text-[6.5rem]">
              Keep inquiries, deposits, approvals, and aftercare inside one studio flow.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)] sm:text-xl">
              Inkflow is a purpose-built portal for tattoo studios that need sharper intake, cleaner artist handoffs, and fewer revenue leaks between consultation and session day.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/consult"
                className="rounded-full border border-[var(--ink)]/15 px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink)] transition hover:border-[var(--ink)]/30 hover:bg-white/45"
              >
                Open public intake
              </Link>
              <Link
                href="/consultations"
                className="rounded-full border border-[var(--ink)]/15 px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink)] transition hover:border-[var(--ink)]/30 hover:bg-white/45"
              >
                Open consult pipeline
              </Link>
              <Link
                href="/design-approvals"
                className="rounded-full border border-[var(--ink)]/15 px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink)] transition hover:border-[var(--ink)]/30 hover:bg-white/45"
              >
                Review artwork flow
              </Link>
            </div>
            <div className="mt-8 max-w-xl">
              <LiveDateTime variant="hero" />
            </div>
          </div>

          <aside className="rounded-[40px] border border-[var(--ink)]/8 bg-[color:rgba(20,17,14,0.94)] p-8 text-[var(--canvas)] shadow-[0_20px_70px_rgba(18,16,13,0.16)] sm:p-10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
                  Today at the studio
                </p>
                <h2 className="mt-3 font-display text-5xl uppercase tracking-[0.08em] text-white">
                  Daily pulse
                </h2>
              </div>
              <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
                Live mock data
              </span>
            </div>
            <div className="mt-8 space-y-4">
              {studioTimeline.map((event) => (
                <article
                  key={event.time}
                  className="rounded-[24px] border border-white/10 bg-white/6 p-5"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-display text-3xl uppercase tracking-[0.08em] text-white">
                      {event.time}
                    </p>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>
                  <p className="mt-4 text-lg font-semibold text-white">{event.title}</p>
                  <p className="mt-2 text-sm leading-6 text-white/68">{event.detail}</p>
                </article>
              ))}
            </div>
          </aside>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {studioMetrics.map((metric) => (
            <MetricCard key={metric.label} metric={metric} />
          ))}
        </section>

        <section className="rounded-[40px] border border-white/35 bg-[linear-gradient(135deg,rgba(255,255,255,0.72),rgba(255,255,255,0.48))] p-6 shadow-[0_20px_60px_rgba(18,16,13,0.08)] backdrop-blur-sm sm:p-8">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">
                Studio workflow
              </p>
              <h2 className="mt-3 font-display text-5xl uppercase tracking-[0.08em] text-[var(--ink)] sm:text-6xl">
                Move every piece with less chaos
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
              The first version centers on the parts that usually leak time or money: intake, consult follow-through, deposit enforcement, design signoff, consent, and post-session care.
            </p>
          </div>
          <div className="grid gap-4 xl:grid-cols-4">
            {workflowColumns.map((column) => (
              <WorkflowColumn key={column.stage} column={column} />
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {moduleCards.map((module) => (
            <Link
              key={module.name}
              href={module.href}
              className="group rounded-[32px] border border-[var(--ink)]/8 bg-[color:rgba(255,248,237,0.82)] p-6 shadow-[0_18px_55px_rgba(18,16,13,0.07)] transition hover:-translate-y-1 hover:border-[var(--ink)]/18 hover:bg-white"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">
                {module.eyebrow}
              </p>
              <h3 className="mt-4 font-display text-4xl uppercase tracking-[0.08em] text-[var(--ink)]">
                {module.name}
              </h3>
              <p className="mt-4 text-base leading-7 text-[var(--muted)]">
                {module.summary}
              </p>
              <span className="mt-6 inline-flex items-center text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink)] transition group-hover:translate-x-1">
                Open module
              </span>
            </Link>
          ))}
        </section>
      </main>
    </AppShell>
  );
}
