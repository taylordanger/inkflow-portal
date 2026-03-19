import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { getPersonDetailPageData } from "@/lib/people";

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export const dynamic = "force-dynamic";

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const viewer = await requireUser();
  const person = await getPersonDetailPageData(viewer, userId);

  if (!person) {
    notFound();
  }

  return (
    <AppShell>
      <main className="space-y-8">
        <section className="grid gap-8 xl:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[40px] border border-white/35 bg-[linear-gradient(145deg,rgba(255,255,255,0.86),rgba(246,237,221,0.72))] p-8 shadow-[0_20px_70px_rgba(18,16,13,0.08)] backdrop-blur-sm sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">Person profile</p>
            <h1 className="mt-4 max-w-3xl font-display text-6xl uppercase leading-[0.9] tracking-[0.06em] text-[var(--ink)] sm:text-7xl">{person.name}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
              {person.role} · {person.email}
            </p>
            <p className="mt-2 text-sm uppercase tracking-[0.16em] text-[var(--muted)]">Joined {formatTimestamp(person.createdAt)}</p>
            <p className="mt-2 text-sm uppercase tracking-[0.16em] text-[var(--muted)]">
              {person.isActive ? "Active account" : `Deactivated ${person.deactivatedAt ? formatTimestamp(person.deactivatedAt) : ""}`}
            </p>
            <div className="mt-6">
              <Link href="/people" className="rounded-full border border-[var(--ink)]/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink)] transition hover:bg-white/70">
                Back to people
              </Link>
            </div>
          </div>
          <section className="rounded-[40px] border border-[var(--ink)]/10 bg-[color:rgba(20,17,14,0.94)] p-8 text-[var(--canvas)] shadow-[0_20px_60px_rgba(18,16,13,0.16)] sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">Artist identity</p>
            {person.artistProfile ? (
              <div className="mt-5 space-y-3 text-sm leading-7 text-white/75">
                <p><span className="font-semibold text-white">Display name:</span> {person.artistProfile.displayName}</p>
                <p><span className="font-semibold text-white">Slug:</span> {person.artistProfile.slug}</p>
                <p><span className="font-semibold text-white">Specialties:</span> {person.artistProfile.specialties ?? "Not set"}</p>
                <p><span className="font-semibold text-white">Bio:</span> {person.artistProfile.bio ?? "Not set"}</p>
                <p><span className="font-semibold text-white">Social:</span> {person.artistProfile.socialHandles.length > 0 ? person.artistProfile.socialHandles.join(", ") : "None connected"}</p>
              </div>
            ) : (
              <p className="mt-5 text-sm leading-7 text-white/70">No artist profile attached.</p>
            )}
          </section>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <article className="rounded-[28px] border border-[var(--ink)]/8 bg-white/75 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Assigned consultations</p>
            <div className="mt-4 space-y-2">
              {person.assignedConsultations.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">No assigned consultations.</p>
              ) : (
                person.assignedConsultations.map((consultation) => (
                  <div key={consultation.id} className="rounded-[14px] border border-[var(--ink)]/8 bg-[var(--canvas)] px-3 py-2 text-sm">
                    <p className="font-semibold text-[var(--ink)]">{consultation.clientName}</p>
                    <p className="text-[var(--muted)]">{consultation.stage} · {formatTimestamp(consultation.submittedAt)}</p>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="rounded-[28px] border border-[var(--ink)]/8 bg-white/75 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Created consultations</p>
            <div className="mt-4 space-y-2">
              {person.createdConsultations.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">No created consultations.</p>
              ) : (
                person.createdConsultations.map((consultation) => (
                  <div key={consultation.id} className="rounded-[14px] border border-[var(--ink)]/8 bg-[var(--canvas)] px-3 py-2 text-sm">
                    <p className="font-semibold text-[var(--ink)]">{consultation.clientName}</p>
                    <p className="text-[var(--muted)]">{consultation.stage} · {formatTimestamp(consultation.submittedAt)}</p>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="rounded-[28px] border border-[var(--ink)]/8 bg-white/75 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Appointments</p>
            <div className="mt-4 space-y-2">
              {person.appointments.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">No appointments.</p>
              ) : (
                person.appointments.map((appointment) => (
                  <div key={appointment.id} className="rounded-[14px] border border-[var(--ink)]/8 bg-[var(--canvas)] px-3 py-2 text-sm">
                    <p className="font-semibold text-[var(--ink)]">{appointment.clientName}</p>
                    <p className="text-[var(--muted)]">{formatTimestamp(appointment.startsAt)} · {appointment.durationMinutes} min · {appointment.status}</p>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="rounded-[28px] border border-[var(--ink)]/8 bg-white/75 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Design notes</p>
            <div className="mt-4 space-y-2">
              {person.designNotes.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">No design notes.</p>
              ) : (
                person.designNotes.map((note) => (
                  <div key={note.id} className="rounded-[14px] border border-[var(--ink)]/8 bg-[var(--canvas)] px-3 py-2 text-sm">
                    <p className="font-semibold text-[var(--ink)]">{note.clientName}</p>
                    <p className="mt-1 text-[var(--muted)]">{note.note}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{formatTimestamp(note.createdAt)}</p>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>

        {person.socialLeads.length > 0 ? (
          <section className="rounded-[28px] border border-[var(--ink)]/8 bg-white/75 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Artist social leads</p>
            <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {person.socialLeads.map((lead) => (
                <div key={lead.id} className="rounded-[14px] border border-[var(--ink)]/8 bg-[var(--canvas)] px-3 py-2 text-sm">
                  <p className="font-semibold text-[var(--ink)]">{lead.clientName ?? lead.handle ?? "Unnamed lead"}</p>
                  <p className="text-[var(--muted)]">{lead.platform} · {lead.status}</p>
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{formatTimestamp(lead.createdAt)}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </AppShell>
  );
}
