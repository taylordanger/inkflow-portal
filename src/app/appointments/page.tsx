import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { getAppointmentPageData } from "@/lib/appointments";
import { WeeklyArtistScheduler } from "@/components/weekly-artist-scheduler";

export const dynamic = "force-dynamic";

export default async function AppointmentsPage() {
  const user = await requireUser();
  const appointments = await getAppointmentPageData(user);
  const canManage = user.role === "OWNER" || user.role === "FRONT_DESK";

  return (
    <AppShell>
      <main className="space-y-8">
        <section className="grid gap-8 xl:grid-cols-[1fr_0.85fr]">
          <div className="rounded-[40px] border border-white/35 bg-[linear-gradient(145deg,rgba(255,255,255,0.86),rgba(246,237,221,0.72))] p-8 shadow-[0_20px_70px_rgba(18,16,13,0.08)] backdrop-blur-sm sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">
              Live booking board
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-6xl uppercase leading-[0.9] tracking-[0.06em] text-[var(--ink)] sm:text-7xl">
              Paid consultations now become real appointments.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
              {user.role === "ARTIST"
                ? "This page is filtered to your assigned sessions so artists only see their own booked work."
                : "This page now reflects booked sessions generated from the consultation workflow, complete with artist assignment, start time, and duration."}
            </p>
          </div>
          <section className="rounded-[40px] border border-[var(--ink)]/10 bg-[color:rgba(20,17,14,0.94)] p-8 text-[var(--canvas)] shadow-[0_20px_60px_rgba(18,16,13,0.16)] sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
              Scheduling notes
            </p>
            <ul className="mt-5 space-y-4 text-sm leading-7 text-white/72">
              <li>Appointments can only be created after a deposit is marked paid.</li>
              <li>Artist assignment carries from the consultation flow but can be adjusted when booking.</li>
              <li>Prep notes travel with the appointment so stencil and front-desk context stay intact.</li>
            </ul>
          </section>
        </section>

        <section className="rounded-[40px] border border-white/35 bg-[linear-gradient(135deg,rgba(255,255,255,0.76),rgba(255,255,255,0.52))] p-6 shadow-[0_20px_60px_rgba(18,16,13,0.08)] backdrop-blur-sm sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">
                Upcoming appointments
              </p>
              <h2 className="mt-3 font-display text-5xl uppercase tracking-[0.08em] text-[var(--ink)] sm:text-6xl">
                Weekly touch board
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-[var(--muted)]">
              Large cards and quick buttons are optimized for iPad/front-desk usage during busy studio hours.
            </p>
          </div>
          <WeeklyArtistScheduler appointments={appointments} canManage={canManage} />
        </section>
      </main>
    </AppShell>
  );
}