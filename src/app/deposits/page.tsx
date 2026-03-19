import { UserRole } from "@prisma/client";
import Link from "next/link";

import {
  markDepositPaidAction,
  recordFailedDepositAction,
  recordPartialDepositAction,
  refundDepositAction,
  requestDepositAction,
} from "@/app/consultations/actions";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { getConsultationDepositLabel, getConsultationPageData } from "@/lib/consultations";

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export const dynamic = "force-dynamic";

export default async function DepositsPage() {
  const user = await requireUser();
  const { consultations } = await getConsultationPageData(user);
  const depositConsultations = consultations.filter(
    (consultation) =>
      consultation.stage === "Consult scheduled" ||
      consultation.stage === "Awaiting deposit" ||
      consultation.depositStatus === "Paid",
  );
  const canManageDeposits =
    user.role === UserRole.FRONT_DESK || user.role === UserRole.OWNER;

  return (
    <AppShell>
      <main className="space-y-8">
        <section className="grid gap-8 xl:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[40px] border border-white/35 bg-[linear-gradient(145deg,rgba(255,255,255,0.86),rgba(246,237,221,0.72))] p-8 shadow-[0_20px_70px_rgba(18,16,13,0.08)] backdrop-blur-sm sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">
              Deposit control
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-6xl uppercase leading-[0.9] tracking-[0.06em] text-[var(--ink)] sm:text-7xl">
              Deposit requests are now tracked as dedicated workflow records.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
              This page shows the consultations that matter for cash flow: consults ready for a request, payments in flight, and deposits already captured.
            </p>
          </div>
          <section className="rounded-[40px] border border-[var(--ink)]/10 bg-[color:rgba(20,17,14,0.94)] p-8 text-[var(--canvas)] shadow-[0_20px_60px_rgba(18,16,13,0.16)] sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
              Permission model
            </p>
            <p className="mt-5 text-sm leading-7 text-white/72">
              {canManageDeposits
                ? "You can request deposits and mark them paid from this board."
                : "Artists can see deposit state for their assigned consultations, but only front desk or owner can change it."}
            </p>
          </section>
        </section>

        <section className="rounded-[40px] border border-white/35 bg-[linear-gradient(135deg,rgba(255,255,255,0.76),rgba(255,255,255,0.52))] p-6 shadow-[0_20px_60px_rgba(18,16,13,0.08)] backdrop-blur-sm sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">
                Deposit ledger
              </p>
              <h2 className="mt-3 font-display text-5xl uppercase tracking-[0.08em] text-[var(--ink)] sm:text-6xl">
                Payment queue
              </h2>
            </div>
          </div>
          <div className="mt-8 grid gap-4 xl:grid-cols-3">
            {depositConsultations.map((consultation) => (
              <article key={consultation.id} className="rounded-[28px] border border-[var(--ink)]/8 bg-white/70 p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                  {consultation.artistAssignment} · {consultation.stage}
                </p>
                <h3 className="mt-3 font-display text-4xl uppercase tracking-[0.08em] text-[var(--ink)]">
                  <Link href={`/clients/${consultation.id}`} className="underline-offset-4 hover:underline">
                    {consultation.clientName}
                  </Link>
                </h3>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                  {consultation.style} on the {consultation.placement.toLowerCase()}.
                </p>
                <p className="mt-4 text-sm font-semibold text-[var(--ink)]">
                  {getConsultationDepositLabel(consultation)}
                </p>
                {consultation.bookingLocked ? (
                  <p className="mt-2 text-sm text-[var(--ember)]">
                    Session lock: {consultation.bookingLockedReason ?? "Deposit state blocks session readiness."}
                  </p>
                ) : null}
                {consultation.depositFailureReason ? (
                  <p className="mt-2 text-sm text-[var(--ember)]">
                    Latest failure: {consultation.depositFailureReason}
                  </p>
                ) : null}
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{consultation.nextStep}</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  {consultation.stage === "Consult scheduled" && canManageDeposits ? (
                    <form action={requestDepositAction}>
                      <input type="hidden" name="consultationId" value={consultation.id} />
                      <button type="submit" className="rounded-full bg-[var(--ink)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--canvas)] transition hover:bg-black">
                        Request deposit
                      </button>
                    </form>
                  ) : null}
                  {consultation.stage === "Awaiting deposit" && canManageDeposits ? (
                    <form action={markDepositPaidAction}>
                      <input type="hidden" name="consultationId" value={consultation.id} />
                      <button type="submit" className="rounded-full border border-[var(--teal)]/40 bg-[var(--teal)]/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink)] transition hover:bg-[var(--teal)]/30">
                        Mark paid
                      </button>
                    </form>
                  ) : null}
                  {!canManageDeposits ? (
                    <span className="rounded-full border border-[var(--ink)]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                      View only
                    </span>
                  ) : null}
                </div>
                {canManageDeposits ? (
                  <div className="mt-5 grid gap-4 border-t border-[var(--ink)]/8 pt-5">
                    <form action={recordPartialDepositAction} className="grid gap-3 rounded-[24px] border border-[var(--ink)]/8 bg-[var(--canvas)] p-4">
                      <input type="hidden" name="consultationId" value={consultation.id} />
                      <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Record payment</p>
                      <input
                        type="number"
                        min="1"
                        name="amount"
                        defaultValue={Math.max((consultation.depositAmount ?? 0) - consultation.depositPaidAmount, 25)}
                        className="rounded-[18px] border border-[var(--ink)]/10 bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--brass)]"
                      />
                      <input
                        type="text"
                        name="note"
                        placeholder="Card payment, cash top-up, split payment, etc."
                        className="rounded-[18px] border border-[var(--ink)]/10 bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--brass)]"
                      />
                      <button type="submit" className="rounded-full bg-[var(--ink)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--canvas)] transition hover:bg-black">
                        Save payment
                      </button>
                    </form>

                    <form action={refundDepositAction} className="grid gap-3 rounded-[24px] border border-[var(--ink)]/8 bg-[var(--canvas)] p-4">
                      <input type="hidden" name="consultationId" value={consultation.id} />
                      <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Refund</p>
                      <input
                        type="number"
                        min="1"
                        name="amount"
                        defaultValue={consultation.depositPaidAmount || 25}
                        className="rounded-[18px] border border-[var(--ink)]/10 bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--brass)]"
                      />
                      <input
                        type="text"
                        name="note"
                        placeholder="Reason for refund"
                        className="rounded-[18px] border border-[var(--ink)]/10 bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--brass)]"
                      />
                      <button type="submit" className="rounded-full border border-[var(--ember)]/35 bg-[var(--ember)]/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink)] transition hover:bg-[var(--ember)]/24">
                        Record refund
                      </button>
                    </form>

                    <form action={recordFailedDepositAction} className="grid gap-3 rounded-[24px] border border-[var(--ink)]/8 bg-[var(--canvas)] p-4">
                      <input type="hidden" name="consultationId" value={consultation.id} />
                      <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Payment failure</p>
                      <input
                        type="text"
                        name="reason"
                        placeholder="Card declined, invoice expired, client no-show, etc."
                        className="rounded-[18px] border border-[var(--ink)]/10 bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--brass)]"
                      />
                      <button type="submit" className="rounded-full border border-[var(--ink)]/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink)] transition hover:bg-white">
                        Save failure reason
                      </button>
                    </form>
                  </div>
                ) : null}
                <div className="mt-5 grid gap-4 border-t border-[var(--ink)]/8 pt-5 lg:grid-cols-2">
                  <section>
                    <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Deposit history</p>
                    <div className="mt-3 space-y-3">
                      {consultation.depositEvents.length === 0 ? (
                        <p className="text-sm text-[var(--muted)]">No deposit events yet.</p>
                      ) : (
                        consultation.depositEvents.map((event) => (
                          <article key={event.id} className="rounded-[20px] border border-[var(--ink)]/8 bg-[var(--canvas)] p-4">
                            <p className="text-sm font-semibold text-[var(--ink)]">{event.type}</p>
                            <p className="mt-1 text-sm text-[var(--muted)]">
                              {event.amount ? `$${event.amount}` : "No amount"}
                              {event.note ? ` · ${event.note}` : ""}
                            </p>
                            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                              {event.actorName ?? "System"} · {formatTimestamp(event.createdAt)}
                            </p>
                          </article>
                        ))
                      )}
                    </div>
                  </section>
                  <section>
                    <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Audit trail</p>
                    <div className="mt-3 space-y-3">
                      {consultation.auditEntries.filter((entry) => entry.domain === "Deposit").length === 0 ? (
                        <p className="text-sm text-[var(--muted)]">No audit entries yet.</p>
                      ) : (
                        consultation.auditEntries
                          .filter((entry) => entry.domain === "Deposit")
                          .map((entry) => (
                            <article key={entry.id} className="rounded-[20px] border border-[var(--ink)]/8 bg-[var(--canvas)] p-4">
                              <p className="text-sm font-semibold text-[var(--ink)]">{entry.action}</p>
                              {entry.details ? <p className="mt-1 text-sm text-[var(--muted)]">{entry.details}</p> : null}
                              {(entry.ipAddress || entry.userAgent) ? (
                                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                                  {entry.ipAddress ? `IP ${entry.ipAddress}` : ""}
                                  {entry.ipAddress && entry.userAgent ? " · " : ""}
                                  {entry.userAgent ? entry.userAgent : ""}
                                </p>
                              ) : null}
                              {entry.changes.length > 0 ? (
                                <details className="mt-2 text-xs text-[var(--muted)]">
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
                              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                                {entry.actorName}{entry.actorRole ? ` · ${entry.actorRole}` : ""} · {formatTimestamp(entry.createdAt)}
                              </p>
                            </article>
                          ))
                      )}
                    </div>
                  </section>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </AppShell>
  );
}