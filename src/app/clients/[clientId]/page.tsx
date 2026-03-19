import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { getClientDetailPageData } from "@/lib/clients";

function formatTimestamp(value: string | null) {
  if (!value) {
    return "No appointment booked";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const viewer = await requireUser();
  const client = await getClientDetailPageData(viewer, clientId);

  if (!client) {
    notFound();
  }

  return (
    <AppShell>
      <main className="space-y-8">
        <section className="grid gap-8 xl:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[40px] border border-white/35 bg-[linear-gradient(145deg,rgba(255,255,255,0.86),rgba(246,237,221,0.72))] p-8 shadow-[0_20px_70px_rgba(18,16,13,0.08)] backdrop-blur-sm sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">
              Client profile
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-6xl uppercase leading-[0.9] tracking-[0.06em] text-[var(--ink)] sm:text-7xl">
              {client.clientName}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
              {client.email} · {client.phone}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-full border border-[var(--ink)]/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                {client.totalConsultations} consultations
              </span>
              <span className="rounded-full border border-[var(--ink)]/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                Stage: {client.activeStage}
              </span>
              <span className="rounded-full border border-[var(--ink)]/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                Deposits paid: ${client.totalDepositsPaid}
              </span>
            </div>
            <p className="mt-4 text-sm text-[var(--muted)]">
              Next appointment: {formatTimestamp(client.nextAppointmentAt)}
            </p>
            <div className="mt-6">
              <Link href="/clients" className="rounded-full border border-[var(--ink)]/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink)] transition hover:bg-white/70">
                Back to clients
              </Link>
            </div>
          </div>

          <section className="rounded-[40px] border border-[var(--ink)]/10 bg-[color:rgba(20,17,14,0.94)] p-8 text-[var(--canvas)] shadow-[0_20px_60px_rgba(18,16,13,0.16)] sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
              Why involved with the shop
            </p>
            <div className="mt-5 space-y-4 text-sm leading-7 text-white/72">
              {client.socialOrigins.length > 0 ? (
                client.socialOrigins.slice(0, 3).map((origin) => (
                  <article key={origin.id} className="rounded-[20px] border border-white/10 bg-white/6 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/55">
                      {origin.platform}
                      {origin.handle ? ` · @${origin.handle}` : ""}
                      {origin.campaignLabel ? ` · ${origin.campaignLabel}` : ""}
                    </p>
                    <p className="mt-2">{origin.attributionSummary ?? origin.referenceSummary ?? "Entered through social intake pipeline."}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-white/50">{formatTimestamp(origin.createdAt)}</p>
                  </article>
                ))
              ) : (
                <p>Client originated through studio intake and consultation workflow records.</p>
              )}
            </div>
          </section>
        </section>

        <section className="rounded-[40px] border border-white/35 bg-[linear-gradient(135deg,rgba(255,255,255,0.76),rgba(255,255,255,0.52))] p-6 shadow-[0_20px_60px_rgba(18,16,13,0.08)] backdrop-blur-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">
            Client timeline
          </p>
          <h2 className="mt-3 font-display text-5xl uppercase tracking-[0.08em] text-[var(--ink)] sm:text-6xl">
            Relationship history
          </h2>
          <div className="mt-8 space-y-3">
            {client.timeline.map((event) => (
              <article key={event.id} className="rounded-[20px] border border-[var(--ink)]/8 bg-white/75 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                  {event.type} · {formatTimestamp(event.occurredAt)}
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--ink)]">{event.title}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{event.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[40px] border border-white/35 bg-[linear-gradient(135deg,rgba(255,255,255,0.76),rgba(255,255,255,0.52))] p-6 shadow-[0_20px_60px_rgba(18,16,13,0.08)] backdrop-blur-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">
            Consultation history
          </p>
          <h2 className="mt-3 font-display text-5xl uppercase tracking-[0.08em] text-[var(--ink)] sm:text-6xl">
            What they are getting
          </h2>
          <div className="mt-8 space-y-4">
            {client.consultations.map((consultation) => (
              <article key={consultation.id} className="rounded-[24px] border border-[var(--ink)]/8 bg-white/75 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                  {consultation.stage} · {formatTimestamp(consultation.submittedAt)}
                </p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {consultation.leadSource}
                  {consultation.socialPlatform ? ` · ${consultation.socialPlatform}` : ""}
                  {consultation.socialHandle ? ` · @${consultation.socialHandle}` : ""}
                  {consultation.sourceCampaignLabel ? ` · ${consultation.sourceCampaignLabel}` : ""}
                </p>
                <p className="mt-3 text-sm leading-7 text-[var(--ink)]">
                  {consultation.style} on {consultation.placement.toLowerCase()} · {consultation.budgetRange}
                </p>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                  Preferred artist: {consultation.preferredArtist}
                  {consultation.assignedArtistName ? ` · Assigned: ${consultation.assignedArtistName}` : ""}
                  {consultation.createdByName ? ` · Created by: ${consultation.createdByName}` : ""}
                </p>
                <p className="mt-3 text-sm leading-7 text-[var(--ink)]">{consultation.ideaSummary}</p>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{consultation.referenceSummary}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                  Deposit: {consultation.depositStatus}
                  {consultation.depositAmount ? ` ($${consultation.depositAmount})` : ""}
                  {consultation.depositPaidAmount > 0 ? ` · Paid so far $${consultation.depositPaidAmount}` : ""}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[40px] border border-white/35 bg-[linear-gradient(135deg,rgba(255,255,255,0.76),rgba(255,255,255,0.52))] p-6 shadow-[0_20px_60px_rgba(18,16,13,0.08)] backdrop-blur-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">
            Appointment history
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {client.appointments.length === 0 ? (
              <p className="rounded-[20px] border border-dashed border-[var(--ink)]/15 bg-white/60 px-4 py-6 text-sm text-[var(--muted)]">
                No appointments booked yet.
              </p>
            ) : (
              client.appointments.map((appointment) => (
                <article key={appointment.id} className="rounded-[20px] border border-[var(--ink)]/8 bg-white/75 p-4 text-sm text-[var(--ink)]">
                  <p className="font-semibold">{formatTimestamp(appointment.startsAt)}</p>
                  <p className="mt-1 text-[var(--muted)]">{appointment.durationMinutes} min · {appointment.status}</p>
                  <p className="mt-1 text-[var(--muted)]">Artist: {appointment.artistName}</p>
                  {appointment.notes ? <p className="mt-2 text-[var(--muted)]">{appointment.notes}</p> : null}
                </article>
              ))
            )}
          </div>
        </section>
      </main>
    </AppShell>
  );
}
