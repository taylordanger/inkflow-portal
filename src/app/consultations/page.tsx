import { UserRole } from "@prisma/client";

import { AppShell } from "@/components/app-shell";
import { ConsultationIntakeForm } from "@/components/consultation-intake-form";
import { ConsultationPipeline } from "@/components/consultation-pipeline";
import { ConsultationReviewDesk } from "@/components/consultation-review-desk";
import { requireUser } from "@/lib/auth";
import { getConsultationPageData } from "@/lib/consultations";

export const dynamic = "force-dynamic";

export default async function ConsultationsPage() {
  const user = await requireUser();
  const { consultations, groupedConsultations, stats, artists } =
    await getConsultationPageData(user);

  return (
    <AppShell>
      <main className="space-y-8">
        <section className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[40px] border border-white/35 bg-[linear-gradient(145deg,rgba(255,255,255,0.86),rgba(246,237,221,0.72))] p-8 shadow-[0_20px_70px_rgba(18,16,13,0.08)] backdrop-blur-sm sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">
              Live intake workflow
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-6xl uppercase leading-[0.9] tracking-[0.06em] text-[var(--ink)] sm:text-7xl">
              Turn new tattoo requests into qualified consults.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
              This module is now the first real operational slice in Inkflow. Front desk can capture intake, artists can see assignment context, and the pipeline reflects saved records instead of static marketing copy.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <article className="rounded-[24px] border border-[var(--ink)]/8 bg-white/65 p-5">
                <p className="text-xs uppercase tracking-[0.26em] text-[var(--muted)]">
                  Total leads
                </p>
                <p className="mt-3 font-display text-5xl uppercase tracking-[0.06em] text-[var(--ink)]">
                  {stats.total}
                </p>
              </article>
              <article className="rounded-[24px] border border-[var(--ink)]/8 bg-white/65 p-5">
                <p className="text-xs uppercase tracking-[0.26em] text-[var(--muted)]">
                  New inquiries
                </p>
                <p className="mt-3 font-display text-5xl uppercase tracking-[0.06em] text-[var(--ink)]">
                  {stats.newInquiries}
                </p>
              </article>
              <article className="rounded-[24px] border border-[var(--ink)]/8 bg-white/65 p-5">
                <p className="text-xs uppercase tracking-[0.26em] text-[var(--muted)]">
                  Awaiting deposit
                </p>
                <p className="mt-3 font-display text-5xl uppercase tracking-[0.06em] text-[var(--ink)]">
                  {stats.awaitingDeposit}
                </p>
              </article>
              <article className="rounded-[24px] border border-[var(--ink)]/8 bg-white/65 p-5">
                <p className="text-xs uppercase tracking-[0.26em] text-[var(--muted)]">
                  Paid deposits
                </p>
                <p className="mt-3 font-display text-5xl uppercase tracking-[0.06em] text-[var(--ink)]">
                  {stats.paidDeposits}
                </p>
              </article>
              <article className="rounded-[24px] border border-[var(--ink)]/8 bg-white/65 p-5">
                <p className="text-xs uppercase tracking-[0.26em] text-[var(--muted)]">
                  Booked sessions
                </p>
                <p className="mt-3 font-display text-5xl uppercase tracking-[0.06em] text-[var(--ink)]">
                  {stats.bookedAppointments}
                </p>
              </article>
            </div>
            <div className="mt-8 rounded-[28px] border border-[var(--ink)]/8 bg-[color:rgba(20,17,14,0.94)] p-6 text-[var(--canvas)]">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
                Why this matters
              </p>
              <ul className="mt-5 space-y-4 text-sm leading-7 text-white/72">
                <li>Collect inquiry context once, then reuse it for consults, deposits, and design review.</li>
                <li>Let front desk move a lead forward from the queue instead of tracking stage changes somewhere else.</li>
                <li>Make deposit collection visible before the booking handoff, which is where studios often lose revenue.</li>
              </ul>
            </div>
          </div>

          <section className="rounded-[40px] border border-[var(--ink)]/10 bg-[color:rgba(255,248,237,0.88)] p-8 shadow-[0_20px_60px_rgba(18,16,13,0.08)] sm:p-10">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">
                  {user.role === UserRole.ARTIST ? "Assigned workload" : "New consult intake"}
                </p>
                <h2 className="mt-3 font-display text-5xl uppercase tracking-[0.08em] text-[var(--ink)] sm:text-6xl">
                  {user.role === UserRole.ARTIST ? "Artist view" : "Front desk form"}
                </h2>
              </div>
              <p className="max-w-xs text-right text-sm leading-6 text-[var(--muted)]">
                Assigned artists: {stats.assignedArtists}
              </p>
            </div>
            {user.role === UserRole.ARTIST ? (
              <div className="rounded-[28px] border border-[var(--ink)]/8 bg-white/70 p-6 text-sm leading-7 text-[var(--muted)]">
                You are only seeing consultations assigned to you. Deposit requests and appointment scheduling remain front-desk or owner actions.
              </div>
            ) : (
              <ConsultationIntakeForm />
            )}
          </section>
        </section>

        <ConsultationPipeline
          consultations={consultations}
          groupedConsultations={groupedConsultations}
          canRequestDeposits={user.role === UserRole.FRONT_DESK || user.role === UserRole.OWNER}
        />

        <ConsultationReviewDesk
          consultations={consultations}
          artists={artists}
          canAnnotate={user.role === UserRole.ARTIST || user.role === UserRole.OWNER}
          canSchedule={user.role === UserRole.FRONT_DESK || user.role === UserRole.OWNER}
        />
      </main>
    </AppShell>
  );
}