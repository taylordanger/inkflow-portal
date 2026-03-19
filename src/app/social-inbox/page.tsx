import { UserRole } from "@prisma/client";
import Link from "next/link";

import { createConsultationFromSocialLeadAction, requestMissingFieldsAction } from "@/app/social-inbox/actions";
import { MissingFieldsModal } from "@/components/missing-fields-modal";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { getSocialInboxPageData } from "@/lib/social";

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export const dynamic = "force-dynamic";

export default async function SocialInboxPage() {
  const user = await requireUser();
  const data = await getSocialInboxPageData(user);
  const canConvert = user.role === UserRole.FRONT_DESK || user.role === UserRole.OWNER;

  return (
    <AppShell>
      <main className="space-y-8">
        <section className="grid gap-8 xl:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[40px] border border-white/35 bg-[linear-gradient(145deg,rgba(255,255,255,0.86),rgba(246,237,221,0.72))] p-8 shadow-[0_20px_70px_rgba(18,16,13,0.08)] backdrop-blur-sm sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">
              Social acquisition
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-6xl uppercase leading-[0.9] tracking-[0.06em] text-[var(--ink)] sm:text-7xl">
              Artist channels now roll into one triage-ready inbox.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
              Track which artist account or campaign created demand, keep front desk on the handoff, and convert qualified social leads into consultations without losing attribution.
            </p>
          </div>
          <section className="rounded-[40px] border border-[var(--ink)]/10 bg-[color:rgba(20,17,14,0.94)] p-8 text-[var(--canvas)] shadow-[0_20px_60px_rgba(18,16,13,0.16)] sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
              {data.studioName}
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <article className="rounded-[24px] border border-white/10 bg-white/6 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-white/50">Connected accounts</p>
                <p className="mt-3 font-display text-5xl uppercase tracking-[0.06em] text-white">{data.stats.connectedAccounts}</p>
              </article>
              <article className="rounded-[24px] border border-white/10 bg-white/6 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-white/50">New social leads</p>
                <p className="mt-3 font-display text-5xl uppercase tracking-[0.06em] text-white">{data.stats.newLeads}</p>
              </article>
              <article className="rounded-[24px] border border-white/10 bg-white/6 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-white/50">Converted</p>
                <p className="mt-3 font-display text-5xl uppercase tracking-[0.06em] text-white">{data.stats.convertedLeads}</p>
              </article>
            </div>
          </section>
        </section>

        <section className="rounded-[40px] border border-white/35 bg-[linear-gradient(135deg,rgba(255,255,255,0.76),rgba(255,255,255,0.52))] p-6 shadow-[0_20px_60px_rgba(18,16,13,0.08)] backdrop-blur-sm sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">
                Connected profiles
              </p>
              <h2 className="mt-3 font-display text-5xl uppercase tracking-[0.08em] text-[var(--ink)] sm:text-6xl">
                Artist social identities
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-[var(--muted)]">
              This first slice tracks which channels belong to the studio and which belong to individual artists.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {data.connectedAccounts.map((account) => (
              <article key={account.id} className="rounded-[24px] border border-[var(--ink)]/8 bg-white/70 p-5 text-sm text-[var(--ink)]">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">{account.platform} · {account.scope}</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-12 w-12 overflow-hidden rounded-full border border-[var(--ink)]/10 bg-[var(--canvas)]">
                    {account.profileImageUrl ? (
                      <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${account.profileImageUrl})` }} />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                        {account.platform}
                      </div>
                    )}
                  </div>
                  <p className="font-semibold">@{account.handle}</p>
                </div>
                <p className="mt-2 text-[var(--muted)]">
                  {account.artistProfileName ? (
                    account.artistUserId ? (
                      <Link href={`/people/${account.artistUserId}`} className="underline-offset-2 hover:underline">
                        {account.artistProfileName}
                      </Link>
                    ) : (
                      account.artistProfileName
                    )
                  ) : (
                    "Studio brand account"
                  )}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {Array.from({ length: 4 }).map((_, index) => {
                    const imageUrl = account.instagramPreviewImages[index] ?? null;

                    return (
                      <div key={`${account.id}-${index}`} className="h-20 overflow-hidden rounded-[14px] border border-[var(--ink)]/8 bg-[var(--canvas)]">
                        {imageUrl ? (
                          <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${imageUrl})` }} />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                            No post
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{account.status}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {account.frontPagePath ? (
                    <Link
                      href={account.frontPagePath}
                      className="rounded-full border border-[var(--ink)]/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink)] transition hover:bg-[var(--ink)] hover:text-[var(--canvas)]"
                    >
                      Open front page
                    </Link>
                  ) : null}
                  {account.instagramProfileUrl ? (
                    <a
                      href={account.instagramProfileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-[var(--ink)]/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink)] transition hover:bg-[var(--ink)] hover:text-[var(--canvas)]"
                    >
                      Open Instagram
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[40px] border border-white/35 bg-[linear-gradient(135deg,rgba(255,255,255,0.76),rgba(255,255,255,0.52))] p-6 shadow-[0_20px_60px_rgba(18,16,13,0.08)] backdrop-blur-sm sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">
                Social lead inbox
              </p>
              <h2 className="mt-3 font-display text-5xl uppercase tracking-[0.08em] text-[var(--ink)] sm:text-6xl">
                Lead attribution ledger
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-[var(--muted)]">
              Front desk can convert fully-qualified social leads into consultations while preserving which artist handle and campaign generated the request.
            </p>
          </div>
          <div className="mt-8 space-y-4">
            {data.leads.map((lead) => (
              <article key={lead.id} className="rounded-[28px] border border-[var(--ink)]/8 bg-white/70 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                      {lead.platform} · {lead.captureMethod} · {lead.status}
                    </p>
                    <h3 className="mt-3 font-display text-3xl uppercase tracking-[0.08em] text-[var(--ink)]">
                      {lead.consultationId ? (
                        <Link href={`/clients/${lead.consultationId}`} className="underline-offset-4 hover:underline">
                          {lead.clientName ?? lead.handle ?? "Unnamed social lead"}
                        </Link>
                      ) : (
                        lead.clientName ?? lead.handle ?? "Unnamed social lead"
                      )}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                      {lead.artistProfileName ? (
                        lead.artistUserId ? (
                          <Link href={`/people/${lead.artistUserId}`} className="underline-offset-2 hover:underline">
                            {lead.artistProfileName}
                          </Link>
                        ) : (
                          lead.artistProfileName
                        )
                      ) : (
                        "Shared studio queue"
                      )}
                      {lead.socialAccountHandle ? ` · @${lead.socialAccountHandle}` : ""}
                      {lead.campaignLabel ? ` · ${lead.campaignLabel}` : ""}
                    </p>
                  </div>
                  <div className="rounded-[20px] border border-[var(--ink)]/8 bg-[var(--canvas)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                    <p>{lead.email ?? "Email not captured yet"}</p>
                    <p>{lead.phone ?? "Phone not captured yet"}</p>
                    <p>{formatTimestamp(lead.createdAt)}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                  <div>
                    <p className="text-sm leading-7 text-[var(--ink)]">{lead.messageBody ?? "No inbound message body captured."}</p>
                    {lead.referenceImages && lead.referenceImages.length > 0 ? (
                      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {lead.referenceImages.slice(0, 6).map((image, index) => (
                          <div key={`${lead.id}-${index}`} className="h-24 overflow-hidden rounded-[14px] border border-[var(--ink)]/8 bg-[var(--canvas)]">
                            <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${image.url})` }} />
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {lead.attributionSummary ? <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{lead.attributionSummary}</p> : null}
                    {lead.sourceUrl ? (
                      <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Source URL · {lead.sourceUrl}</p>
                    ) : null}
                  </div>
                  <div className="rounded-[20px] border border-[var(--ink)]/8 bg-[var(--canvas)] p-4">
                    {lead.infoRequestedAt ? (
                      <div className="space-y-3 rounded-[16px] border border-[var(--ember)]/20 bg-[var(--ember)]/5 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ember)]">
                          ⏳ Awaiting: {lead.infoRequestedFields?.join(", ") ?? "fields"}
                        </p>
                        {lead.infoRequestMessage && (
                          <p className="text-sm leading-6 text-[var(--muted)]">{lead.infoRequestMessage}</p>
                        )}
                        <p className="text-xs text-[var(--muted)]/70">
                          Requested by {lead.infoRequestedByName ?? "staff"}
                        </p>
                      </div>
                    ) : lead.consultationId ? (
                      <p className="text-sm leading-7 text-[var(--muted)]">Already converted into consultation {lead.consultationId}.</p>
                    ) : canConvert ? (
                      lead.email && lead.phone ? (
                        <form action={createConsultationFromSocialLeadAction} className="space-y-3">
                          <input type="hidden" name="socialLeadId" value={lead.id} />
                          <p className="text-sm leading-7 text-[var(--muted)]">Create a triage-ready consultation and keep the social attribution attached to the lead.</p>
                          <button type="submit" className="rounded-full bg-[var(--ink)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--canvas)] transition hover:bg-black">
                            Convert to consultation
                          </button>
                        </form>
                      ) : (
                        <MissingFieldsModal lead={lead} action={requestMissingFieldsAction} />
                      )
                    ) : (
                      <p className="text-sm leading-7 text-[var(--muted)]">Front desk or owner converts qualified social leads into consultations.</p>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </AppShell>
  );
}