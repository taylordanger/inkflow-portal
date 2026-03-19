import {
  markDepositPaidAction,
  requestDepositAction,
  scheduleConsultAction,
} from "@/app/consultations/actions";
import Link from "next/link";
import { getConsultationDepositLabel } from "@/lib/consultations";
import type {
  ConsultationRecord,
  ConsultationStage,
} from "@/types/studio";

const stageDescriptions: Record<ConsultationStage, string> = {
  "New inquiry": "Fresh leads waiting for triage and first response.",
  "Consult scheduled": "Qualified leads with a consult slot on the board.",
  "Awaiting deposit": "Consults that need money locked before booking opens.",
  "Design review": "Clients who are reviewing art direction or revisions.",
  Booked: "Paid consults that now have a real appointment on the calendar.",
};

const stageOrder: ConsultationStage[] = [
  "New inquiry",
  "Consult scheduled",
  "Awaiting deposit",
  "Design review",
  "Booked",
];

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function ConsultationCardAction({ consultation }: { consultation: ConsultationRecord }) {
  if (consultation.stage === "New inquiry") {
    return (
      <form action={scheduleConsultAction}>
        <input type="hidden" name="consultationId" value={consultation.id} />
        <button
          type="submit"
          className="rounded-full border border-white/12 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white hover:text-[var(--ink)]"
        >
          Schedule consult
        </button>
      </form>
    );
  }

  if (consultation.stage === "Consult scheduled") {
    return (
      <form action={requestDepositAction}>
        <input type="hidden" name="consultationId" value={consultation.id} />
        <button
          type="submit"
          className="rounded-full border border-[var(--brass)]/55 bg-[var(--brass)]/15 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--canvas)] transition hover:bg-[var(--brass)] hover:text-[var(--ink)]"
        >
          Request deposit
        </button>
      </form>
    );
  }

  if (consultation.stage === "Awaiting deposit") {
    return (
      <form action={markDepositPaidAction}>
        <input type="hidden" name="consultationId" value={consultation.id} />
        <button
          type="submit"
          className="rounded-full border border-[var(--teal)]/55 bg-[var(--teal)]/18 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--canvas)] transition hover:bg-[var(--teal)] hover:text-[var(--ink)]"
        >
          Mark deposit paid
        </button>
      </form>
    );
  }

  return (
    <span className="rounded-full border border-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
      {consultation.appointment ? "Appointment scheduled" : "Waiting on artwork review"}
    </span>
  );
}

export function ConsultationPipeline({
  groupedConsultations,
  consultations,
  canRequestDeposits,
}: {
  groupedConsultations: Record<ConsultationStage, ConsultationRecord[]>;
  consultations: ConsultationRecord[];
  canRequestDeposits: boolean;
}) {
  return (
    <div className="space-y-8">
      <section className="rounded-[40px] border border-[var(--ink)]/10 bg-[color:rgba(20,17,14,0.94)] p-6 text-[var(--canvas)] shadow-[0_20px_60px_rgba(18,16,13,0.16)] sm:p-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
              Live pipeline
            </p>
            <h2 className="mt-3 font-display text-5xl uppercase tracking-[0.08em] text-white sm:text-6xl">
              Consult queue
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-white/68">
            Every intake lands in a stage with a visible next step, so front desk and artists are not rebuilding context from DMs.
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-4">
          {stageOrder.map((stage) => (
            <section
              key={stage}
              className="rounded-[28px] border border-white/10 bg-white/6 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-3xl uppercase tracking-[0.08em] text-white">
                    {stage}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-white/55">
                    {stageDescriptions[stage]}
                  </p>
                </div>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
                  {groupedConsultations[stage].length}
                </span>
              </div>
              <div className="mt-5 space-y-4">
                {groupedConsultations[stage].length === 0 ? (
                  <p className="rounded-[20px] border border-dashed border-white/12 p-4 text-sm leading-6 text-white/45">
                    No leads in this stage yet.
                  </p>
                ) : (
                  groupedConsultations[stage].map((consultation) => (
                    <article
                      key={consultation.id}
                      className="rounded-[24px] border border-white/10 bg-black/12 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-base font-semibold text-white">
                          <Link href={`/clients/${consultation.id}`} className="underline-offset-2 hover:underline">
                            {consultation.clientName}
                          </Link>
                        </p>
                        <span className="text-xs uppercase tracking-[0.24em] text-white/45">
                          {consultation.assignedArtistId ? (
                            <Link href={`/people/${consultation.assignedArtistId}`} className="underline-offset-2 hover:underline">
                              {consultation.artistAssignment}
                            </Link>
                          ) : (
                            consultation.artistAssignment
                          )}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-white/68">
                        {consultation.style} on the {consultation.placement.toLowerCase()}.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-[0.2em] text-white/55">
                        <span>{consultation.budgetRange}</span>
                        <span>{getConsultationDepositLabel(consultation)}</span>
                        {consultation.socialPlatform ? <span>{consultation.socialPlatform}</span> : null}
                      </div>
                      {consultation.socialHandle || consultation.sourceCampaignLabel ? (
                        <p className="mt-3 text-xs uppercase tracking-[0.18em] text-white/55">
                          {consultation.socialHandle ? `@${consultation.socialHandle}` : "Social lead"}
                          {consultation.sourceArtistProfile ? ` · ${consultation.sourceArtistProfile}` : ""}
                          {consultation.sourceCampaignLabel ? ` · ${consultation.sourceCampaignLabel}` : ""}
                        </p>
                      ) : null}
                      <p className="mt-4 text-sm leading-6 text-white/80">
                        {consultation.nextStep}
                      </p>
                      {consultation.appointment ? (
                        <p className="mt-4 text-xs uppercase tracking-[0.2em] text-white/55">
                          <Link href={`/people/${consultation.appointment.artistId}`} className="underline-offset-2 hover:underline">
                            {consultation.appointment.artistName}
                          </Link>
                          {` · ${formatTimestamp(consultation.appointment.startsAt)} · ${consultation.appointment.durationMinutes} min`}
                        </p>
                      ) : null}
                      <div className="mt-5">
                        {consultation.stage === "Consult scheduled" || consultation.stage === "Awaiting deposit" ? (
                          canRequestDeposits ? (
                            <ConsultationCardAction consultation={consultation} />
                          ) : (
                            <span className="rounded-full border border-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
                              Front desk or owner only
                            </span>
                          )
                        ) : (
                          <ConsultationCardAction consultation={consultation} />
                        )}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      </section>

      <section className="rounded-[40px] border border-white/35 bg-[linear-gradient(135deg,rgba(255,255,255,0.76),rgba(255,255,255,0.52))] p-6 shadow-[0_20px_60px_rgba(18,16,13,0.08)] backdrop-blur-sm sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">
              Latest submissions
            </p>
            <h2 className="mt-3 font-display text-5xl uppercase tracking-[0.08em] text-[var(--ink)] sm:text-6xl">
              Intake ledger
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-[var(--muted)]">
            This is the first real data surface in the app. New consults submitted through the form write into the local project data store and show up here immediately.
          </p>
        </div>
        <div className="mt-8 overflow-hidden rounded-[28px] border border-[var(--ink)]/8">
          <div className="grid grid-cols-[1.3fr_0.8fr_0.9fr_1fr_1fr] bg-[var(--ink)] px-5 py-4 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--canvas)]">
            <span>Client</span>
            <span>Stage</span>
            <span>Lead source</span>
            <span>Deposit</span>
            <span>Submitted</span>
          </div>
          <div className="divide-y divide-[var(--ink)]/8 bg-white/70">
            {consultations.map((consultation) => (
              <article
                key={consultation.id}
                className="grid grid-cols-[1.3fr_0.8fr_0.9fr_1fr_1fr] gap-4 px-5 py-4 text-sm text-[var(--ink)]"
              >
                <div>
                  <p className="font-semibold">
                    <Link href={`/clients/${consultation.id}`} className="underline-offset-2 hover:underline">
                      {consultation.clientName}
                    </Link>
                  </p>
                  <p className="mt-1 text-[var(--muted)]">{consultation.email}</p>
                </div>
                <span>{consultation.stage}</span>
                <span>
                  {consultation.leadSource}
                  {consultation.socialHandle ? ` · @${consultation.socialHandle}` : ""}
                </span>
                <span>{getConsultationDepositLabel(consultation)}</span>
                <span>{formatTimestamp(consultation.submittedAt)}</span>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}