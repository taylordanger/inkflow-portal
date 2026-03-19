import { completeConsentFromPortalAction } from "@/app/portal/consent/[token]/actions";
import { getConsentPortalData } from "@/lib/consent";

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function ConsentPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getConsentPortalData(token);

  if (!data) {
    return (
      <main className="min-h-screen bg-[var(--canvas)] px-5 py-10 text-[var(--ink)] sm:px-8 lg:px-10">
        <div className="mx-auto max-w-3xl rounded-[40px] border border-[var(--ink)]/10 bg-white/80 p-10 shadow-[0_20px_60px_rgba(18,16,13,0.08)]">
          <h1 className="font-display text-5xl uppercase tracking-[0.08em] text-[var(--ink)]">Link unavailable</h1>
          <p className="mt-4 text-lg leading-8 text-[var(--muted)]">
            This consent link has expired or is no longer valid. Contact the studio for a fresh waiver link.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--canvas)] px-5 py-10 text-[var(--ink)] sm:px-8 lg:px-10">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_0.9fr]">
        <section className="rounded-[40px] border border-white/35 bg-[linear-gradient(145deg,rgba(255,255,255,0.86),rgba(246,237,221,0.72))] p-8 shadow-[0_20px_70px_rgba(18,16,13,0.08)] backdrop-blur-sm sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">Inkflow consent</p>
          <h1 className="mt-4 font-display text-6xl uppercase leading-[0.9] tracking-[0.06em] text-[var(--ink)] sm:text-7xl">
            Review and sign your tattoo waiver.
          </h1>
          <p className="mt-6 text-lg leading-8 text-[var(--muted)]">
            This link is tied to your upcoming session with {data.artistName}. Review the session details below, then sign to confirm your waiver.
          </p>
        </section>
        <section className="rounded-[40px] border border-[var(--ink)]/10 bg-[color:rgba(255,248,237,0.88)] p-8 shadow-[0_20px_60px_rgba(18,16,13,0.08)] sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">Session details</p>
          <div className="mt-5 space-y-3 text-sm leading-7 text-[var(--muted)]">
            <p><span className="font-semibold text-[var(--ink)]">Client:</span> {data.clientLegalName}</p>
            <p><span className="font-semibold text-[var(--ink)]">Artist:</span> {data.artistName}</p>
            <p><span className="font-semibold text-[var(--ink)]">Placement:</span> {data.placement}</p>
            <p><span className="font-semibold text-[var(--ink)]">Style:</span> {data.style}</p>
            <p><span className="font-semibold text-[var(--ink)]">Appointment:</span> {formatTimestamp(data.appointmentAt)}</p>
            <p><span className="font-semibold text-[var(--ink)]">Current waiver status:</span> {data.status}</p>
            {data.healthNotes ? <p><span className="font-semibold text-[var(--ink)]">Health notes:</span> {data.healthNotes}</p> : null}
          </div>
          {data.status === "Signed" ? (
            <div className="mt-6 rounded-[24px] border border-[var(--teal)]/30 bg-[var(--teal)]/12 p-5 text-sm leading-7 text-[var(--ink)]">
              Your waiver has already been signed. The studio has your confirmation on file.
            </div>
          ) : (
            <form action={completeConsentFromPortalAction} className="mt-6 space-y-4">
              <input type="hidden" name="token" value={token} />
              <div className="rounded-[24px] border border-[var(--ink)]/8 bg-white/70 p-5 text-sm leading-7 text-[var(--muted)]">
                By signing, you confirm the session details above and acknowledge the studio waiver for this appointment.
              </div>
              <button type="submit" className="rounded-full bg-[var(--ink)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--canvas)] transition hover:bg-black">
                Sign waiver
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}