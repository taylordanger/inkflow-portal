import { UserRole } from "@prisma/client";

import { AppShell } from "@/components/app-shell";
import { ConsultationReviewDesk } from "@/components/consultation-review-desk";
import { requireUser } from "@/lib/auth";
import { getConsultationPageData } from "@/lib/consultations";

export const dynamic = "force-dynamic";

export default async function DesignApprovalsPage() {
  const user = await requireUser();
  const { consultations, artists } = await getConsultationPageData(user);
  const reviewConsultations = consultations.filter(
    (consultation) => consultation.depositStatus === "Paid",
  );

  return (
    <AppShell>
      <main className="space-y-8">
        <section className="grid gap-8 xl:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[40px] border border-white/35 bg-[linear-gradient(145deg,rgba(255,255,255,0.86),rgba(246,237,221,0.72))] p-8 shadow-[0_20px_70px_rgba(18,16,13,0.08)] backdrop-blur-sm sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">
              Design approvals
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-6xl uppercase leading-[0.9] tracking-[0.06em] text-[var(--ink)] sm:text-7xl">
              Approval history and artwork notes now live in their own workspace.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
              This page is powered by the same Prisma consultation records, but focused specifically on paid consults that are in art review or already booked.
            </p>
          </div>
          <section className="rounded-[40px] border border-[var(--ink)]/10 bg-[color:rgba(20,17,14,0.94)] p-8 text-[var(--canvas)] shadow-[0_20px_60px_rgba(18,16,13,0.16)] sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
              Role view
            </p>
            <p className="mt-5 text-sm leading-7 text-white/72">
              {user.role === UserRole.ARTIST
                ? "You are seeing only the approval work assigned to you. Artists and owner can add notes and approval events; front desk can still schedule booked sessions from this workspace."
                : "Owner and front desk can oversee all approval work. Artists retain note and approval controls on assigned pieces."}
            </p>
          </section>
        </section>

        <ConsultationReviewDesk
          consultations={reviewConsultations}
          artists={artists}
          canAnnotate={user.role === UserRole.ARTIST || user.role === UserRole.OWNER}
          canSchedule={user.role === UserRole.FRONT_DESK || user.role === UserRole.OWNER}
        />
      </main>
    </AppShell>
  );
}