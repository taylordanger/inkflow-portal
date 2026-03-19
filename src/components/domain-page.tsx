import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import type { DomainPageContent } from "@/types/studio";

export function DomainPage({ content }: { content: DomainPageContent }) {
  return (
    <AppShell>
      <main className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[40px] border border-white/35 bg-[linear-gradient(135deg,rgba(255,255,255,0.76),rgba(255,255,255,0.52))] p-8 shadow-[0_20px_60px_rgba(18,16,13,0.08)] backdrop-blur-sm sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">
            {content.eyebrow}
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-6xl uppercase leading-[0.92] tracking-[0.06em] text-[var(--ink)] sm:text-7xl">
            {content.title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
            {content.description}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-full bg-[var(--ink)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--canvas)] transition hover:bg-black"
            >
              Back to overview
            </Link>
            <a
              href="#checklist"
              className="rounded-full border border-[var(--ink)]/15 px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink)] transition hover:border-[var(--ink)]/30 hover:bg-white/50"
            >
              View MVP scope
            </a>
          </div>
        </section>

        <section className="rounded-[40px] border border-[var(--ink)]/10 bg-[color:rgba(255,248,237,0.86)] p-8 shadow-[0_20px_60px_rgba(18,16,13,0.08)] sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">
            Why this module matters
          </p>
          <div className="mt-6 space-y-4">
            {content.highlights.map((highlight) => (
              <article
                key={highlight}
                className="rounded-[24px] border border-[var(--ink)]/8 bg-white/65 p-5"
              >
                <p className="text-base leading-7 text-[var(--ink)]">{highlight}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="checklist"
          className="rounded-[40px] border border-[var(--ink)]/10 bg-[color:rgba(20,17,14,0.94)] p-8 text-[var(--canvas)] shadow-[0_20px_60px_rgba(18,16,13,0.16)] sm:p-10 lg:col-span-2"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/55">
                MVP scope
              </p>
              <h2 className="mt-3 font-display text-5xl uppercase tracking-[0.08em] text-white sm:text-6xl">
                First shippable slice
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-white/70">
              Keep the first release narrow enough to ship, but structured so it can evolve into a real multi-artist SaaS later.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {content.checklist.map((item, index) => (
              <article
                key={item}
                className="rounded-[26px] border border-white/10 bg-white/6 p-5"
              >
                <p className="text-xs uppercase tracking-[0.35em] text-white/45">
                  Step {index + 1}
                </p>
                <p className="mt-3 text-lg font-semibold text-white">{item}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </AppShell>
  );
}