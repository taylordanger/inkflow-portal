import Link from "next/link";

import { createAccountAction, deactivateAccountAction, deleteAccountAction } from "@/app/people/actions";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { getPeoplePageData } from "@/lib/people";
import { canPerform } from "@/lib/permissions";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export const dynamic = "force-dynamic";

export default async function PeoplePage({
  searchParams,
}: {
  searchParams?: Promise<{ notice?: string; status?: string }>;
}) {
  const user = await requireUser();
  const people = await getPeoplePageData(user);
  const canManage = canPerform(user.role, "accounts.manage");
  const canRunDestructiveActions = canPerform(user.role, "accounts.destructive");
  const resolvedSearchParams = await searchParams;
  const notice = resolvedSearchParams?.notice;
  const statusFilter = resolvedSearchParams?.status === "inactive"
    ? "inactive"
    : resolvedSearchParams?.status === "active"
      ? "active"
      : "all";

  const filteredPeople = people.filter((person) => {
    if (statusFilter === "active") {
      return person.isActive;
    }

    if (statusFilter === "inactive") {
      return !person.isActive;
    }

    return true;
  });

  return (
    <AppShell>
      <main className="space-y-8">
        <section className="grid gap-8 xl:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[40px] border border-white/35 bg-[linear-gradient(145deg,rgba(255,255,255,0.86),rgba(246,237,221,0.72))] p-8 shadow-[0_20px_70px_rgba(18,16,13,0.08)] backdrop-blur-sm sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">Team directory</p>
            <h1 className="mt-4 max-w-3xl font-display text-6xl uppercase leading-[0.9] tracking-[0.06em] text-[var(--ink)] sm:text-7xl">
              Manage artist and studio accounts in one place.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
              Add new artists or desk staff, remove unused accounts, and open each person profile to see every appointment, consultation, lead, and note tied to them.
            </p>
            {notice ? (
              <p className="mt-6 rounded-[20px] border border-[var(--ink)]/10 bg-white/70 px-4 py-3 text-sm text-[var(--ink)]">
                {notice}
              </p>
            ) : null}
          </div>

          <section className="rounded-[40px] border border-[var(--ink)]/10 bg-[color:rgba(20,17,14,0.94)] p-8 text-[var(--canvas)] shadow-[0_20px_60px_rgba(18,16,13,0.16)] sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">Team stats</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <article className="rounded-[24px] border border-white/10 bg-white/6 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-white/50">Total accounts</p>
                <p className="mt-3 font-display text-5xl uppercase tracking-[0.06em] text-white">{people.length}</p>
              </article>
              <article className="rounded-[24px] border border-white/10 bg-white/6 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-white/50">Artists</p>
                <p className="mt-3 font-display text-5xl uppercase tracking-[0.06em] text-white">
                  {people.filter((person) => person.role === "Artist").length}
                </p>
              </article>
              <article className="rounded-[24px] border border-white/10 bg-white/6 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-white/50">Desk + owners</p>
                <p className="mt-3 font-display text-5xl uppercase tracking-[0.06em] text-white">
                  {people.filter((person) => person.role !== "Artist").length}
                </p>
              </article>
            </div>
          </section>
        </section>

        {canManage ? (
          <section className="rounded-[40px] border border-white/35 bg-[linear-gradient(135deg,rgba(255,255,255,0.76),rgba(255,255,255,0.52))] p-6 shadow-[0_20px_60px_rgba(18,16,13,0.08)] backdrop-blur-sm sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">Create account</p>
            <h2 className="mt-3 font-display text-5xl uppercase tracking-[0.08em] text-[var(--ink)] sm:text-6xl">Add artist or staff member</h2>
            <form action={createAccountAction} className="mt-8 grid gap-4 md:grid-cols-2">
              <input name="name" placeholder="Full name" className="rounded-[18px] border border-[var(--ink)]/10 bg-white/75 px-4 py-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--brass)]" required />
              <input name="email" type="email" placeholder="email@studio.com" className="rounded-[18px] border border-[var(--ink)]/10 bg-white/75 px-4 py-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--brass)]" required />
              <input name="password" type="password" placeholder="Temporary password (min 8 chars)" className="rounded-[18px] border border-[var(--ink)]/10 bg-white/75 px-4 py-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--brass)]" required />
              <select name="role" defaultValue="ARTIST" className="rounded-[18px] border border-[var(--ink)]/10 bg-white/75 px-4 py-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--brass)]">
                <option value="ARTIST">Artist</option>
                <option value="FRONT_DESK">Front desk</option>
                {canRunDestructiveActions ? <option value="OWNER">Owner</option> : null}
              </select>
              <input name="artistDisplayName" placeholder="Artist display name (artists only)" className="rounded-[18px] border border-[var(--ink)]/10 bg-white/75 px-4 py-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--brass)]" />
              <input name="instagramHandle" placeholder="Instagram handle (artists only)" className="rounded-[18px] border border-[var(--ink)]/10 bg-white/75 px-4 py-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--brass)]" />
              <input name="artistSpecialties" placeholder="Specialties (artists only)" className="rounded-[18px] border border-[var(--ink)]/10 bg-white/75 px-4 py-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--brass)] md:col-span-2" />
              <textarea name="artistBio" rows={3} placeholder="Bio (artists only)" className="rounded-[18px] border border-[var(--ink)]/10 bg-white/75 px-4 py-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--brass)] md:col-span-2" />
              <div className="md:col-span-2">
                <button type="submit" className="rounded-full bg-[var(--ink)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--canvas)] transition hover:bg-black">
                  Create account
                </button>
              </div>
            </form>
          </section>
        ) : null}

        <section className="rounded-[40px] border border-white/35 bg-[linear-gradient(135deg,rgba(255,255,255,0.76),rgba(255,255,255,0.52))] p-6 shadow-[0_20px_60px_rgba(18,16,13,0.08)] backdrop-blur-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">Accounts</p>
          <h2 className="mt-3 font-display text-5xl uppercase tracking-[0.08em] text-[var(--ink)] sm:text-6xl">People in this studio</h2>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href="/people?status=all"
              className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${statusFilter === "all" ? "border-[var(--ink)]/30 bg-[var(--ink)] text-[var(--canvas)]" : "border-[var(--ink)]/12 text-[var(--ink)] hover:bg-white/70"}`}
            >
              All ({people.length})
            </Link>
            <Link
              href="/people?status=active"
              className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${statusFilter === "active" ? "border-[var(--ink)]/30 bg-[var(--ink)] text-[var(--canvas)]" : "border-[var(--ink)]/12 text-[var(--ink)] hover:bg-white/70"}`}
            >
              Active ({people.filter((person) => person.isActive).length})
            </Link>
            <Link
              href="/people?status=inactive"
              className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${statusFilter === "inactive" ? "border-[var(--ink)]/30 bg-[var(--ink)] text-[var(--canvas)]" : "border-[var(--ink)]/12 text-[var(--ink)] hover:bg-white/70"}`}
            >
              Inactive ({people.filter((person) => !person.isActive).length})
            </Link>
          </div>
          <div className="mt-8 space-y-4">
            {filteredPeople.map((person) => (
              <article key={person.id} className="rounded-[24px] border border-[var(--ink)]/8 bg-white/75 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <Link href={`/people/${person.id}`} className="font-display text-3xl uppercase tracking-[0.08em] text-[var(--ink)] underline-offset-4 hover:underline">
                      {person.name}
                    </Link>
                    <p className="mt-2 text-sm text-[var(--muted)]">{person.email} · {person.role} · Added {formatDate(person.createdAt)}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                      {person.isActive ? "Active" : `Deactivated ${person.deactivatedAt ? formatDate(person.deactivatedAt) : ""}`}
                    </p>
                    {person.artistDisplayName ? (
                      <p className="mt-2 text-sm text-[var(--muted)]">Artist profile: {person.artistDisplayName}{person.artistSlug ? ` (${person.artistSlug})` : ""}</p>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                    <span className="rounded-full border border-[var(--ink)]/10 px-3 py-2 text-center">Assigned {person.assignedConsultations}</span>
                    <span className="rounded-full border border-[var(--ink)]/10 px-3 py-2 text-center">Created {person.createdConsultations}</span>
                    <span className="rounded-full border border-[var(--ink)]/10 px-3 py-2 text-center">Appointments {person.appointments}</span>
                  </div>
                </div>
                {canRunDestructiveActions ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <form action={deactivateAccountAction}>
                      <input type="hidden" name="userId" value={person.id} />
                      <button type="submit" className="rounded-full border border-[var(--ink)]/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink)] transition hover:bg-[var(--ink)]/8">
                        {person.isActive ? "Deactivate account" : "Reactivate account"}
                      </button>
                    </form>
                    <form action={deleteAccountAction}>
                      <input type="hidden" name="userId" value={person.id} />
                      <button type="submit" className="rounded-full border border-[var(--ember)]/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ember)] transition hover:bg-[var(--ember)]/10">
                        Delete account
                      </button>
                    </form>
                  </div>
                ) : canManage ? (
                  <p className="mt-4 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Owner-only destructive controls</p>
                ) : null}
              </article>
            ))}
            {filteredPeople.length === 0 ? (
              <p className="rounded-[24px] border border-dashed border-[var(--ink)]/15 bg-white/60 px-4 py-6 text-sm text-[var(--muted)]">
                No accounts in this filter yet.
              </p>
            ) : null}
          </div>
        </section>
      </main>
    </AppShell>
  );
}
