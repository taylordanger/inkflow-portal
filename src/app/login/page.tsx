import { redirect } from "next/navigation";

import { SignInForm } from "@/components/sign-in-form";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

function getSafeRedirectTarget(from: string | undefined) {
  if (!from || !from.startsWith("/") || from.startsWith("//")) {
    return "/consultations";
  }

  return from;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ from?: string }>;
}) {
  const session = await auth();
  const resolvedSearchParams = await searchParams;
  const redirectTarget = getSafeRedirectTarget(resolvedSearchParams?.from);

  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });

    if (user) {
      redirect(redirectTarget);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--canvas)] px-5 py-10 text-[var(--ink)] sm:px-8 lg:px-10">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[40px] border border-white/35 bg-[linear-gradient(145deg,rgba(255,255,255,0.86),rgba(246,237,221,0.72))] p-8 shadow-[0_20px_70px_rgba(18,16,13,0.08)] backdrop-blur-sm sm:p-10 lg:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">
            Inkflow access
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-6xl uppercase leading-[0.9] tracking-[0.06em] text-[var(--ink)] sm:text-7xl">
            Multi-user studio workflow starts with a real login.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
            This version now uses a real SQLite database and role-aware authentication so consultations, appointments, notes, and approvals can belong to actual studio staff.
          </p>
        </section>
        <section className="rounded-[40px] border border-[var(--ink)]/10 bg-[color:rgba(255,248,237,0.88)] p-8 shadow-[0_20px_60px_rgba(18,16,13,0.08)] sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">
            Sign in
          </p>
          <h2 className="mt-3 font-display text-5xl uppercase tracking-[0.08em] text-[var(--ink)] sm:text-6xl">
            Studio portal
          </h2>
          <div className="mt-8">
            <SignInForm redirectTo={redirectTarget} />
          </div>
        </section>
      </div>
    </main>
  );
}