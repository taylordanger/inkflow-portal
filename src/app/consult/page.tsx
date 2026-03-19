import { PublicIntakeForm } from "@/components/public-intake-form";
import { getPublicIntakePageData } from "@/lib/social";

export const dynamic = "force-dynamic";

export default async function PublicConsultPage({
  searchParams,
}: {
  searchParams?: Promise<{ code?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const pageData = await getPublicIntakePageData({ campaignCode: resolvedSearchParams?.code });

  if (!pageData) {
    return (
      <main className="min-h-screen bg-[var(--canvas)] px-5 py-10 text-[var(--ink)] sm:px-8 lg:px-10">
        <div className="mx-auto max-w-3xl rounded-[40px] border border-[var(--ink)]/10 bg-white/80 p-10 shadow-[0_20px_60px_rgba(18,16,13,0.08)]">
          <h1 className="font-display text-5xl uppercase tracking-[0.08em] text-[var(--ink)]">Booking link unavailable</h1>
          <p className="mt-4 text-lg leading-8 text-[var(--muted)]">This studio booking route is not configured yet. Contact the studio directly for a consult link.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--canvas)] px-5 py-10 text-[var(--ink)] sm:px-8 lg:px-10">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_0.95fr]">
        <section className="rounded-[40px] border border-white/35 bg-[linear-gradient(145deg,rgba(255,255,255,0.86),rgba(246,237,221,0.72))] p-8 shadow-[0_20px_70px_rgba(18,16,13,0.08)] backdrop-blur-sm sm:p-10 lg:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">{pageData.studioName}</p>
          <h1 className="mt-4 max-w-3xl font-display text-6xl uppercase leading-[0.9] tracking-[0.06em] text-[var(--ink)] sm:text-7xl">Start your tattoo consult request.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">Share the piece direction, budget, and timing once. The studio will route your request to the right artist and keep the rest of the process moving from there.</p>
          <div className="mt-8 rounded-[28px] border border-[var(--ink)]/8 bg-[color:rgba(20,17,14,0.94)] p-6 text-[var(--canvas)]">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">Attribution</p>
            <p className="mt-4 text-sm leading-7 text-white/72">
              {pageData.campaignLabel ?? "Public studio consult route"}
              {pageData.artistHandle ? ` · @${pageData.artistHandle}` : ""}
              {` · ${pageData.socialPlatform}`}
            </p>
          </div>
        </section>
        <section className="rounded-[40px] border border-[var(--ink)]/10 bg-[color:rgba(255,248,237,0.88)] p-8 shadow-[0_20px_60px_rgba(18,16,13,0.08)] sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">Client intake</p>
          <h2 className="mt-3 font-display text-5xl uppercase tracking-[0.08em] text-[var(--ink)] sm:text-6xl">Consult request</h2>
          <div className="mt-8">
            <PublicIntakeForm pageData={pageData} />
          </div>
        </section>
      </div>
    </main>
  );
}