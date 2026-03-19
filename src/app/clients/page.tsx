import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { getClientPageData } from "@/lib/clients";
import Link from "next/link";

function formatTimestamp(value: string | null) {
  if (!value) {
    return "No appointment booked";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const user = await requireUser();
  const clients = await getClientPageData(user.studioId);

  return (
    <AppShell>
      <main className="space-y-8">
        <section className="grid gap-8 xl:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[40px] border border-white/35 bg-[linear-gradient(145deg,rgba(255,255,255,0.86),rgba(246,237,221,0.72))] p-8 shadow-[0_20px_70px_rgba(18,16,13,0.08)] backdrop-blur-sm sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">
              Real client records
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-6xl uppercase leading-[0.9] tracking-[0.06em] text-[var(--ink)] sm:text-7xl">
              Client history is now tied to real consultations and bookings.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
              This page aggregates tattoo clients from the consultation workflow so artists and front desk can see active stage, paid deposits, and upcoming appointment context in one place.
            </p>
          </div>
          <section className="rounded-[40px] border border-[var(--ink)]/10 bg-[color:rgba(20,17,14,0.94)] p-8 text-[var(--canvas)] shadow-[0_20px_60px_rgba(18,16,13,0.16)] sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
              Client rollup
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <article className="rounded-[24px] border border-white/10 bg-white/6 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-white/50">Clients</p>
                <p className="mt-3 font-display text-5xl uppercase tracking-[0.06em] text-white">{clients.length}</p>
              </article>
              <article className="rounded-[24px] border border-white/10 bg-white/6 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-white/50">Booked</p>
                <p className="mt-3 font-display text-5xl uppercase tracking-[0.06em] text-white">{clients.filter((client) => client.nextAppointmentAt).length}</p>
              </article>
              <article className="rounded-[24px] border border-white/10 bg-white/6 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-white/50">Deposits paid</p>
                <p className="mt-3 font-display text-5xl uppercase tracking-[0.06em] text-white">${clients.reduce((sum, client) => sum + client.totalDepositsPaid, 0)}</p>
              </article>
            </div>
          </section>
        </section>

        <section className="rounded-[40px] border border-white/35 bg-[linear-gradient(135deg,rgba(255,255,255,0.76),rgba(255,255,255,0.52))] p-6 shadow-[0_20px_60px_rgba(18,16,13,0.08)] backdrop-blur-sm sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">
                Client ledger
              </p>
              <h2 className="mt-3 font-display text-5xl uppercase tracking-[0.08em] text-[var(--ink)] sm:text-6xl">
                Studio relationships
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-[var(--muted)]">
              Every row is built from actual consultation and appointment records in the database.
            </p>
          </div>
          <div className="mt-8 overflow-hidden rounded-[28px] border border-[var(--ink)]/8">
            <div className="grid grid-cols-[1.2fr_0.8fr_1fr_0.9fr_1fr_0.8fr] bg-[var(--ink)] px-5 py-4 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--canvas)]">
              <span>Client</span>
              <span>Stage</span>
              <span>Artist</span>
              <span>Latest placement</span>
              <span>Next appointment</span>
              <span>Deposits paid</span>
            </div>
            <div className="divide-y divide-[var(--ink)]/8 bg-white/70">
              {clients.map((client) => (
                <article key={client.id} className="grid grid-cols-[1.2fr_0.8fr_1fr_0.9fr_1fr_0.8fr] gap-4 px-5 py-4 text-sm text-[var(--ink)]">
                  <div>
                    <Link href={`/clients/${client.id}`} className="font-semibold underline-offset-2 hover:underline">
                      {client.clientName}
                    </Link>
                    <p className="mt-1 text-[var(--muted)]">{client.email}</p>
                    <p className="text-[var(--muted)]">{client.phone}</p>
                  </div>
                  <span>{client.activeStage}</span>
                  <span>{client.assignedArtist}</span>
                  <span>{client.latestPlacement}</span>
                  <span>{formatTimestamp(client.nextAppointmentAt)}</span>
                  <span>${client.totalDepositsPaid}</span>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </AppShell>
  );
}