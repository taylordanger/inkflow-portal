import { PublicIntakeForm } from "@/components/public-intake-form";
import { getPublicIntakePageData } from "@/lib/social";

export const dynamic = "force-dynamic";

export default async function ArtistBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ artistSlug: string }>;
  searchParams?: Promise<{ code?: string }>;
}) {
  const { artistSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const pageData = await getPublicIntakePageData({
    artistSlug,
    campaignCode: resolvedSearchParams?.code,
  });

  if (!pageData || !pageData.artistName) {
    return (
      <main className="min-h-screen bg-[var(--canvas)] px-5 py-10 text-[var(--ink)] sm:px-8 lg:px-10">
        <div className="mx-auto max-w-3xl rounded-[40px] border border-[var(--ink)]/10 bg-white/80 p-10 shadow-[0_20px_60px_rgba(18,16,13,0.08)]">
          <h1 className="font-display text-5xl uppercase tracking-[0.08em] text-[var(--ink)]">Artist link unavailable</h1>
          <p className="mt-4 text-lg leading-8 text-[var(--muted)]">This artist booking page is not available right now. Use the studio consult link instead.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--canvas)] px-5 py-10 text-[var(--ink)] sm:px-8 lg:px-10">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_0.95fr]">
        <section className="rounded-[40px] border border-white/35 bg-[linear-gradient(145deg,rgba(255,255,255,0.86),rgba(246,237,221,0.72))] p-8 shadow-[0_20px_70px_rgba(18,16,13,0.08)] backdrop-blur-sm sm:p-10 lg:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">Book with {pageData.artistName}</p>
          <h1 className="mt-4 max-w-3xl font-display text-6xl uppercase leading-[0.9] tracking-[0.06em] text-[var(--ink)] sm:text-7xl">Send your idea straight into {pageData.artistName.split(" ")[0]}&apos;s queue.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">{pageData.artistBio ?? `${pageData.artistName} is accepting consult requests through this page.`}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <article className="rounded-[24px] border border-[var(--ink)]/8 bg-white/65 p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Specialties</p>
              <p className="mt-3 text-sm leading-7 text-[var(--ink)]">{pageData.artistSpecialties ?? "Artist-led consultation and custom piece planning."}</p>
            </article>
            <article className="rounded-[24px] border border-[var(--ink)]/8 bg-white/65 p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Source attribution</p>
              <p className="mt-3 text-sm leading-7 text-[var(--ink)]">
                {pageData.campaignLabel ?? "Artist booking route"}
                {pageData.artistHandle ? ` · @${pageData.artistHandle}` : ""}
                {` · ${pageData.socialPlatform}`}
              </p>
            </article>
          </div>
        </section>
        <section className="rounded-[40px] border border-[var(--ink)]/10 bg-[color:rgba(255,248,237,0.88)] p-8 shadow-[0_20px_60px_rgba(18,16,13,0.08)] sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">Artist intake</p>
          <h2 className="mt-3 font-display text-5xl uppercase tracking-[0.08em] text-[var(--ink)] sm:text-6xl">Request a consult</h2>
          <div className="mt-8">
            <PublicIntakeForm pageData={pageData} />
          </div>
        </section>
      </div>
    </main>
  );
}