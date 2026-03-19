import {
  addApprovalEventAction,
  addDesignNoteAction,
  scheduleAppointmentAction,
  sendApprovalPortalLinkAction,
} from "@/app/consultations/actions";
import Link from "next/link";
import type { ArtistOption, ConsultationRecord } from "@/types/studio";

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function ConsultationReviewDesk({
  consultations,
  artists,
  canAnnotate,
  canSchedule,
}: {
  consultations: ConsultationRecord[];
  artists: ArtistOption[];
  canAnnotate: boolean;
  canSchedule: boolean;
}) {
  const eligible = consultations.filter(
    (consultation) => consultation.depositStatus === "Paid",
  );

  if (eligible.length === 0) {
    return null;
  }

  return (
    <section className="rounded-[40px] border border-white/35 bg-[linear-gradient(135deg,rgba(255,255,255,0.76),rgba(255,255,255,0.52))] p-6 shadow-[0_20px_60px_rgba(18,16,13,0.08)] backdrop-blur-sm sm:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">
            Artist review desk
          </p>
          <h2 className="mt-3 font-display text-5xl uppercase tracking-[0.08em] text-[var(--ink)] sm:text-6xl">
            Paid consult collaboration
          </h2>
        </div>
        <p className="max-w-2xl text-sm leading-7 text-[var(--muted)]">
          Once a deposit is paid, artists can log design notes, capture approval history, and turn the consult into a real scheduled appointment.
        </p>
      </div>

      <div className="mt-8 space-y-6">
        {eligible.map((consultation) => (
          <article
            key={consultation.id}
            className="rounded-[32px] border border-[var(--ink)]/8 bg-[color:rgba(255,248,237,0.82)] p-6 shadow-[0_14px_45px_rgba(18,16,13,0.06)]"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.26em] text-[var(--muted)]">
                  {consultation.assignedArtistId ? (
                    <Link href={`/people/${consultation.assignedArtistId}`} className="underline-offset-2 hover:underline">
                      {consultation.artistAssignment}
                    </Link>
                  ) : (
                    consultation.artistAssignment
                  )}
                  {` · ${consultation.stage}`}
                </p>
                <h3 className="mt-3 font-display text-4xl uppercase tracking-[0.08em] text-[var(--ink)]">
                  <Link href={`/clients/${consultation.id}`} className="underline-offset-4 hover:underline">
                    {consultation.clientName}
                  </Link>
                </h3>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
                  {consultation.ideaSummary}
                </p>
              </div>
              <div className="rounded-[24px] border border-[var(--ink)]/8 bg-white/70 px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                <p>Preferred window: {consultation.requestedWindow}</p>
                <p>Deposit: {consultation.depositAmount ? `$${consultation.depositAmount}` : "TBD"}</p>
                <p>Current next step: {consultation.nextStep}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-5 xl:grid-cols-3">
              <section className="rounded-[24px] border border-[var(--ink)]/8 bg-white/70 p-5">
                <p className="text-xs uppercase tracking-[0.26em] text-[var(--muted)]">
                  Design notes
                </p>
                <div className="mt-4 space-y-3">
                  {consultation.designNotes.length === 0 ? (
                    <p className="text-sm text-[var(--muted)]">No design notes yet.</p>
                  ) : (
                    consultation.designNotes.map((note) => (
                      <article key={note.id} className="rounded-[20px] border border-[var(--ink)]/8 bg-[var(--canvas)] p-4">
                        <p className="text-sm leading-6 text-[var(--ink)]">{note.note}</p>
                        <p className="mt-3 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                          {note.authorName} · {formatTimestamp(note.createdAt)}
                        </p>
                      </article>
                    ))
                  )}
                </div>
                {canAnnotate ? (
                  <form action={addDesignNoteAction} className="mt-4 space-y-3">
                    <input type="hidden" name="consultationId" value={consultation.id} />
                    <textarea
                      name="note"
                      rows={4}
                      className="w-full rounded-[20px] border border-[var(--ink)]/10 bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--brass)]"
                      placeholder="Add artist notes about composition, placement, or revisions."
                    />
                    <button
                      type="submit"
                      className="rounded-full bg-[var(--ink)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--canvas)] transition hover:bg-black"
                    >
                      Save note
                    </button>
                  </form>
                ) : null}
              </section>

              <section className="rounded-[24px] border border-[var(--ink)]/8 bg-white/70 p-5">
                <p className="text-xs uppercase tracking-[0.26em] text-[var(--muted)]">
                  Approval history
                </p>
                <div className="mt-4 space-y-3">
                  {consultation.approvalEvents.length === 0 ? (
                    <p className="text-sm text-[var(--muted)]">No approval history yet.</p>
                  ) : (
                    consultation.approvalEvents.map((event) => (
                      <article key={event.id} className="rounded-[20px] border border-[var(--ink)]/8 bg-[var(--canvas)] p-4">
                        <p className="text-sm font-semibold text-[var(--ink)]">{event.status}</p>
                        {event.note ? (
                          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{event.note}</p>
                        ) : null}
                        <p className="mt-3 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                          {formatTimestamp(event.createdAt)}
                        </p>
                      </article>
                    ))
                  )}
                </div>
                {canAnnotate ? (
                  <form action={addApprovalEventAction} className="mt-4 space-y-3">
                    <input type="hidden" name="consultationId" value={consultation.id} />
                    <select
                      name="status"
                      className="w-full rounded-[20px] border border-[var(--ink)]/10 bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--brass)]"
                      defaultValue="Concept sent"
                    >
                      <option value="Concept sent">Concept sent</option>
                      <option value="Revision requested">Revision requested</option>
                      <option value="Approved">Approved</option>
                      <option value="Finalized">Finalized</option>
                    </select>
                    <textarea
                      name="note"
                      rows={3}
                      className="w-full rounded-[20px] border border-[var(--ink)]/10 bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--brass)]"
                      placeholder="Add context for this approval event."
                    />
                    <button
                      type="submit"
                      className="rounded-full border border-[var(--ink)]/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink)] transition hover:bg-white"
                    >
                      Add approval event
                    </button>
                  </form>
                ) : null}
                <div className="mt-5 rounded-[20px] border border-[var(--ink)]/8 bg-[var(--canvas)] p-4 text-sm leading-6 text-[var(--muted)]">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Client approval delivery</p>
                  {canAnnotate ? (
                    <form action={sendApprovalPortalLinkAction} className="mt-3 flex flex-wrap items-center gap-3">
                      <input type="hidden" name="consultationId" value={consultation.id} />
                      <button
                        type="submit"
                        className="rounded-full bg-[var(--ink)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--canvas)] transition hover:bg-black"
                      >
                        {consultation.approvalDeliveryLabel ? "Resend approval link" : "Send approval link"}
                      </button>
                      <span className="text-sm text-[var(--muted)]">
                        {consultation.approvalDeliveryLabel ?? `${consultation.approvalDeliveryStatus ?? "Pending"} delivery`}
                      </span>
                    </form>
                  ) : (
                    <div className="mt-2 space-y-1">
                      <p>{consultation.approvalDeliveryLabel ?? `${consultation.approvalDeliveryStatus ?? "Pending"} delivery`}</p>
                      {consultation.approvalDeliveryError ? (
                        <p className="text-[var(--ember)]">{consultation.approvalDeliveryError}</p>
                      ) : null}
                    </div>
                  )}
                  {consultation.approvalDeliveryError && canAnnotate ? (
                    <p className="mt-2 text-sm text-[var(--ember)]">{consultation.approvalDeliveryError}</p>
                  ) : null}
                  {consultation.approvalDeliveryAttempts.length > 0 ? (
                    <div className="mt-3 space-y-1 rounded-[16px] border border-[var(--ink)]/8 bg-white/70 px-3 py-3 text-xs text-[var(--muted)]">
                      <p className="uppercase tracking-[0.18em]">
                        Delivery feed · {Math.max(consultation.approvalDeliveryAttempts.length - 1, 0)} retries
                      </p>
                      {consultation.approvalDeliveryAttempts.slice(0, 4).map((attempt) => (
                        <p key={attempt.id}>
                          Attempt {attempt.attemptNumber} · {attempt.status}
                          {attempt.channel ? ` via ${attempt.channel}` : ""}
                          {attempt.target ? ` to ${attempt.target}` : ""}
                          {` · ${formatTimestamp(attempt.attemptedAt)}`}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="rounded-[24px] border border-[var(--ink)]/8 bg-white/70 p-5">
                <p className="text-xs uppercase tracking-[0.26em] text-[var(--muted)]">
                  Appointment handoff
                </p>
                {consultation.appointment ? (
                  <div className="mt-4 rounded-[20px] border border-[var(--ink)]/8 bg-[var(--canvas)] p-4 text-sm leading-7 text-[var(--ink)]">
                    <p className="font-semibold">
                      Scheduled with{" "}
                      <Link href={`/people/${consultation.appointment.artistId}`} className="underline-offset-2 hover:underline">
                        {consultation.appointment.artistName}
                      </Link>
                    </p>
                    <p>{formatTimestamp(consultation.appointment.startsAt)}</p>
                    <p>{consultation.appointment.durationMinutes} minute session</p>
                    {consultation.appointment.notes ? <p>{consultation.appointment.notes}</p> : null}
                  </div>
                ) : canSchedule && !consultation.bookingLocked ? (
                  <form action={scheduleAppointmentAction} className="mt-4 space-y-3">
                    <input type="hidden" name="consultationId" value={consultation.id} />
                    <select
                      name="artistId"
                      className="w-full rounded-[20px] border border-[var(--ink)]/10 bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--brass)]"
                      defaultValue={consultation.assignedArtistId ?? artists[0]?.id}
                    >
                      {artists.map((artist) => (
                        <option key={artist.id} value={artist.id}>
                          {artist.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="datetime-local"
                      name="startsAt"
                      className="w-full rounded-[20px] border border-[var(--ink)]/10 bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--brass)]"
                    />
                    <input
                      type="number"
                      min="30"
                      step="30"
                      name="durationMinutes"
                      defaultValue="180"
                      className="w-full rounded-[20px] border border-[var(--ink)]/10 bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--brass)]"
                    />
                    <textarea
                      name="notes"
                      rows={3}
                      className="w-full rounded-[20px] border border-[var(--ink)]/10 bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--brass)]"
                      placeholder="Prep notes, placement printouts, or client reminders."
                    />
                    <button
                      type="submit"
                      className="rounded-full bg-[var(--ink)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--canvas)] transition hover:bg-black"
                    >
                      Schedule appointment
                    </button>
                  </form>
                ) : (
                  <div className="mt-4 rounded-[20px] border border-dashed border-[var(--ink)]/12 bg-[var(--canvas)] p-4 text-sm leading-7 text-[var(--muted)]">
                    {consultation.bookingLocked
                      ? consultation.bookingLockedReason ?? "Session readiness is currently locked."
                      : "Only front desk or owner can schedule the tattoo session once design review is ready."}
                  </div>
                )}
              </section>
            </div>
            <section className="mt-5 rounded-[24px] border border-[var(--ink)]/8 bg-white/70 p-5">
              <p className="text-xs uppercase tracking-[0.26em] text-[var(--muted)]">
                Approval audit trail
              </p>
              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                {consultation.auditEntries.filter((entry) => entry.domain === "Approval").length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">No approval audit entries yet.</p>
                ) : (
                  consultation.auditEntries
                    .filter((entry) => entry.domain === "Approval")
                    .map((entry) => (
                      <article key={entry.id} className="rounded-[20px] border border-[var(--ink)]/8 bg-[var(--canvas)] p-4">
                        <p className="text-sm font-semibold text-[var(--ink)]">{entry.action}</p>
                        {entry.details ? <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{entry.details}</p> : null}
                        {(entry.ipAddress || entry.userAgent) ? (
                          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                            {entry.ipAddress ? `IP ${entry.ipAddress}` : ""}
                            {entry.ipAddress && entry.userAgent ? " · " : ""}
                            {entry.userAgent ? entry.userAgent : ""}
                          </p>
                        ) : null}
                        {entry.changes.length > 0 ? (
                          <details className="mt-3 text-xs text-[var(--muted)]">
                            <summary className="cursor-pointer uppercase tracking-[0.18em]">Field changes</summary>
                            <div className="mt-2 space-y-1">
                              {entry.changes.map((change) => (
                                <p key={change.id}>
                                  <span className="font-semibold text-[var(--ink)]">{change.fieldPath}</span>
                                  {`: ${change.beforeValue ?? "empty"} -> ${change.afterValue ?? "empty"}`}
                                </p>
                              ))}
                            </div>
                          </details>
                        ) : null}
                        <p className="mt-3 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                          {entry.actorName}{entry.actorRole ? ` · ${entry.actorRole}` : ""} · {formatTimestamp(entry.createdAt)}
                        </p>
                      </article>
                    ))
                )}
              </div>
            </section>
          </article>
        ))}
      </div>
    </section>
  );
}