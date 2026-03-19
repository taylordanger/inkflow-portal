import { submitPortalApprovalDecisionAction } from "@/app/portal/design-approval/[token]/actions";
import { getApprovalPortalData } from "@/lib/consultations";

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function DesignApprovalPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getApprovalPortalData(token);

  if (!data) {
    return (
      <main className="min-h-screen bg-[var(--canvas)] px-5 py-10 text-[var(--ink)] sm:px-8 lg:px-10">
        <div className="mx-auto max-w-3xl rounded-[40px] border border-[var(--ink)]/10 bg-white/80 p-10 shadow-[0_20px_60px_rgba(18,16,13,0.08)]">
          <h1 className="font-display text-5xl uppercase tracking-[0.08em] text-[var(--ink)]">Link unavailable</h1>
          <p className="mt-4 text-lg leading-8 text-[var(--muted)]">
            This approval link has expired or is no longer valid. Contact the studio if you need a new review link.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--canvas)] px-5 py-10 text-[var(--ink)] sm:px-8 lg:px-10">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_0.9fr]">
        <section className="rounded-[40px] border border-white/35 bg-[linear-gradient(145deg,rgba(255,255,255,0.86),rgba(246,237,221,0.72))] p-8 shadow-[0_20px_70px_rgba(18,16,13,0.08)] backdrop-blur-sm sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">Inkflow approval</p>
          <h1 className="mt-4 font-display text-6xl uppercase leading-[0.9] tracking-[0.06em] text-[var(--ink)] sm:text-7xl">
            Review your tattoo design direction.
          </h1>
          <p className="mt-6 text-lg leading-8 text-[var(--muted)]">
            This review link is connected to your piece with {data.artistName}. You can approve the current direction or send a revision request directly back into the studio workflow.
          </p>
        </section>
        <section className="rounded-[40px] border border-[var(--ink)]/10 bg-[color:rgba(255,248,237,0.88)] p-8 shadow-[0_20px_60px_rgba(18,16,13,0.08)] sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">Piece summary</p>
          <div className="mt-5 space-y-3 text-sm leading-7 text-[var(--muted)]">
            <p><span className="font-semibold text-[var(--ink)]">Client:</span> {data.clientName}</p>
            <p><span className="font-semibold text-[var(--ink)]">Artist:</span> {data.artistName}</p>
            <p><span className="font-semibold text-[var(--ink)]">Placement:</span> {data.placement}</p>
            <p><span className="font-semibold text-[var(--ink)]">Style:</span> {data.style}</p>
            <p><span className="font-semibold text-[var(--ink)]">Concept:</span> {data.ideaSummary}</p>
          </div>
          <div className="mt-6 space-y-3 rounded-[24px] border border-[var(--ink)]/8 bg-white/70 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Recent review history</p>
            {data.approvalEvents.map((event) => (
              <article key={event.id} className="rounded-[18px] border border-[var(--ink)]/8 bg-[var(--canvas)] p-4">
                <p className="text-sm font-semibold text-[var(--ink)]">{event.status}</p>
                {event.note ? <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{event.note}</p> : null}
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{formatTimestamp(event.createdAt)}</p>
              </article>
            ))}
          </div>
          <form action={submitPortalApprovalDecisionAction} className="mt-6 space-y-4">
            <input type="hidden" name="token" value={token} />
            <select name="status" defaultValue="Approved" className="w-full rounded-[20px] border border-[var(--ink)]/10 bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--brass)]">
              <option value="Approved">Approve design direction</option>
              <option value="Revision requested">Request revision</option>
            </select>
            <textarea name="note" rows={4} placeholder="Optional feedback for the artist" className="w-full rounded-[20px] border border-[var(--ink)]/10 bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--brass)]" />
            <button type="submit" className="rounded-full bg-[var(--ink)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--canvas)] transition hover:bg-black">
              Submit review
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}