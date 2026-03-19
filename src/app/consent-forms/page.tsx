import { UserRole } from "@prisma/client";

import { mutateConsentStatusAction } from "@/app/consent-forms/actions";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { getConsentPageData } from "@/lib/consent";

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Not signed";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export const dynamic = "force-dynamic";

export default async function ConsentFormsPage() {
  const user = await requireUser();
  const consentForms = await getConsentPageData();
  const canManageConsents =
    user.role === UserRole.FRONT_DESK || user.role === UserRole.OWNER;

  return (
    <AppShell>
      <main className="space-y-8">
        <section className="grid gap-8 xl:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[40px] border border-white/35 bg-[linear-gradient(145deg,rgba(255,255,255,0.86),rgba(246,237,221,0.72))] p-8 shadow-[0_20px_70px_rgba(18,16,13,0.08)] backdrop-blur-sm sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">
              Consent records
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-6xl uppercase leading-[0.9] tracking-[0.06em] text-[var(--ink)] sm:text-7xl">
              Waivers now track against real consults and booked sessions.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
              The consent module is now backed by Prisma records linked directly to consultations and appointments, so front desk can see what is sent, signed, or missing before session day.
            </p>
          </div>
          <section className="rounded-[40px] border border-[var(--ink)]/10 bg-[color:rgba(20,17,14,0.94)] p-8 text-[var(--canvas)] shadow-[0_20px_60px_rgba(18,16,13,0.16)] sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
              Consent pulse
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <article className="rounded-[24px] border border-white/10 bg-white/6 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-white/50">Total forms</p>
                <p className="mt-3 font-display text-5xl uppercase tracking-[0.06em] text-white">{consentForms.length}</p>
              </article>
              <article className="rounded-[24px] border border-white/10 bg-white/6 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-white/50">Signed</p>
                <p className="mt-3 font-display text-5xl uppercase tracking-[0.06em] text-white">{consentForms.filter((form) => form.status === "Signed").length}</p>
              </article>
              <article className="rounded-[24px] border border-white/10 bg-white/6 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-white/50">Pending or sent</p>
                <p className="mt-3 font-display text-5xl uppercase tracking-[0.06em] text-white">{consentForms.filter((form) => form.status === "Pending" || form.status === "Sent").length}</p>
              </article>
            </div>
            <p className="mt-5 text-sm leading-7 text-white/72">
              {canManageConsents
                ? "You can send, resend, expire, and mark consent forms signed from this board."
                : "Artists can review consent state, but only front desk or owner can mutate waiver status."}
            </p>
          </section>
        </section>

        <section className="rounded-[40px] border border-white/35 bg-[linear-gradient(135deg,rgba(255,255,255,0.76),rgba(255,255,255,0.52))] p-6 shadow-[0_20px_60px_rgba(18,16,13,0.08)] backdrop-blur-sm sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">
                Consent ledger
              </p>
              <h2 className="mt-3 font-display text-5xl uppercase tracking-[0.08em] text-[var(--ink)] sm:text-6xl">
                Session documentation
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-[var(--muted)]">
              Each record below is linked to a real consultation and, when scheduled, its appointment.
            </p>
          </div>
          <div className="mt-8 overflow-hidden rounded-[28px] border border-[var(--ink)]/8">
            <div className="grid grid-cols-[1fr_0.8fr_1fr_0.8fr_1.1fr_1.1fr_1.2fr] bg-[var(--ink)] px-5 py-4 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--canvas)]">
              <span>Client</span>
              <span>Status</span>
              <span>Artist</span>
              <span>Signed</span>
              <span>Appointment</span>
              <span>Actions</span>
              <span>Health and contact notes</span>
            </div>
            <div className="divide-y divide-[var(--ink)]/8 bg-white/70">
              {consentForms.map((form) => (
                <article key={form.id} className="grid grid-cols-[1fr_0.8fr_1fr_0.8fr_1.1fr_1.1fr_1.2fr] gap-4 px-5 py-4 text-sm text-[var(--ink)]">
                  <div>
                    <p className="font-semibold">{form.clientLegalName}</p>
                    {form.emergencyContact ? (
                      <p className="mt-1 text-[var(--muted)]">Emergency: {form.emergencyContact} · {form.emergencyPhone}</p>
                    ) : null}
                  </div>
                  <span>{form.status}</span>
                  <span>{form.artistName}</span>
                  <span>{formatTimestamp(form.signedAt)}</span>
                  <span>{formatTimestamp(form.appointmentAt)}</span>
                  <div className="flex flex-wrap gap-2">
                    {canManageConsents ? (
                      <>
                        {(form.status === "Pending" || form.status === "Expired") && (
                          <form action={mutateConsentStatusAction}>
                            <input type="hidden" name="consentId" value={form.id} />
                            <input type="hidden" name="action" value="send" />
                            <button type="submit" className="rounded-full bg-[var(--ink)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--canvas)] transition hover:bg-black">
                              Send
                            </button>
                          </form>
                        )}
                        {form.status === "Sent" && (
                          <form action={mutateConsentStatusAction}>
                            <input type="hidden" name="consentId" value={form.id} />
                            <input type="hidden" name="action" value="resend" />
                            <button type="submit" className="rounded-full border border-[var(--ink)]/12 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ink)] transition hover:bg-white">
                              Resend
                            </button>
                          </form>
                        )}
                        {form.status !== "Signed" && (
                          <form action={mutateConsentStatusAction}>
                            <input type="hidden" name="consentId" value={form.id} />
                            <input type="hidden" name="action" value="mark-signed" />
                            <button type="submit" className="rounded-full border border-[var(--teal)]/30 bg-[var(--teal)]/15 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ink)] transition hover:bg-[var(--teal)]/30">
                              Mark signed
                            </button>
                          </form>
                        )}
                        {form.status !== "Expired" && form.status !== "Signed" && (
                          <form action={mutateConsentStatusAction}>
                            <input type="hidden" name="consentId" value={form.id} />
                            <input type="hidden" name="action" value="expire" />
                            <button type="submit" className="rounded-full border border-[var(--ember)]/30 bg-[var(--ember)]/12 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ink)] transition hover:bg-[var(--ember)]/24">
                              Expire
                            </button>
                          </form>
                        )}
                      </>
                    ) : (
                      <div className="space-y-2">
                        <span className="inline-flex rounded-full border border-[var(--ink)]/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                          View only
                        </span>
                        <p className="text-xs text-[var(--muted)]">
                          {form.deliveryLabel ?? `${form.deliveryStatus ?? "Pending"} delivery`}
                        </p>
                        {form.deliveryError ? (
                          <p className="text-xs text-[var(--ember)]">{form.deliveryError}</p>
                        ) : null}
                      </div>
                    )}
                    {canManageConsents ? (
                      <div className="w-full text-xs text-[var(--muted)]">
                        <p>{form.deliveryLabel ?? `${form.deliveryStatus ?? "Pending"} delivery`}</p>
                        {form.deliveryError ? <p className="mt-1 text-[var(--ember)]">{form.deliveryError}</p> : null}
                        {form.deliveryAttempts.length > 0 ? (
                          <div className="mt-2 space-y-1 rounded-[16px] border border-[var(--ink)]/8 bg-[var(--canvas)] px-3 py-2">
                            <p className="uppercase tracking-[0.18em] text-[10px] text-[var(--muted)]">
                              Delivery feed · {Math.max(form.deliveryAttempts.length - 1, 0)} retries
                            </p>
                            {form.deliveryAttempts.slice(0, 3).map((attempt) => (
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
                    ) : null}
                  </div>
                  <div>
                    <p>{form.healthNotes ?? "No additional health notes"}</p>
                    <div className="mt-3 space-y-2">
                      {form.auditEntries.length === 0 ? (
                        <p className="text-xs text-[var(--muted)]">No audit entries yet.</p>
                      ) : (
                        form.auditEntries.map((entry) => (
                          <p key={entry.id} className="text-xs leading-5 text-[var(--muted)]">
                            <span className="font-semibold text-[var(--ink)]">{entry.action}</span>
                            {entry.details ? ` · ${entry.details}` : ""}
                            {` · ${entry.actorName}`}
                            {entry.actorRole ? ` (${entry.actorRole})` : ""}
                            {entry.ipAddress ? ` · IP ${entry.ipAddress}` : ""}
                            {` · ${formatTimestamp(entry.createdAt)}`}
                          </p>
                        ))
                      )}
                      {form.auditEntries.some((entry) => entry.changes.length > 0) ? (
                        <div className="space-y-2 pt-2">
                          {form.auditEntries.map((entry) =>
                            entry.changes.map((change) => (
                              <p key={`${entry.id}-${change.id}`} className="text-[11px] leading-5 text-[var(--muted)]">
                                <span className="font-semibold text-[var(--ink)]">{change.fieldPath}</span>
                                {`: ${change.beforeValue ?? "empty"} -> ${change.afterValue ?? "empty"}`}
                              </p>
                            )),
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </AppShell>
  );
}