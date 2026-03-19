import Link from "next/link";
import type { ReactNode } from "react";

import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";

const navItems = [
  { href: "/clients", label: "Clients" },
  { href: "/consultations", label: "Consults" },
  { href: "/people", label: "People" },
  { href: "/social-inbox", label: "Social" },
  { href: "/design-approvals", label: "Approvals" },
  { href: "/appointments", label: "Schedule" },
];

export async function AppShell({ children }: { children: ReactNode }) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 pb-10 pt-5 sm:px-8 lg:px-10">
        <header className="sticky top-0 z-20 mb-8 rounded-full border border-white/30 bg-[color:rgba(247,241,230,0.82)] px-4 py-3 backdrop-blur-md shadow-[0_10px_40px_rgba(18,16,13,0.08)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="inline-flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--ink)]/15 bg-[var(--ink)] text-sm font-semibold uppercase tracking-[0.35em] text-[var(--canvas)]">
                  IF
                </span>
                <div>
                  <p className="font-display text-3xl uppercase leading-none tracking-[0.16em]">
                    Inkflow
                  </p>
                  <p className="text-xs uppercase tracking-[0.35em] text-[var(--muted)]">
                    Studio portal
                  </p>
                </div>
              </Link>
            </div>
            <div className="flex flex-col gap-3 lg:items-end">
              <nav className="flex flex-wrap gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-full border border-[var(--ink)]/10 px-4 py-2 transition hover:border-[var(--ink)]/25 hover:bg-white/60 hover:text-[var(--ink)]"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                {session?.user?.id ? (
                  <>
                    <span className="rounded-full border border-[var(--ink)]/10 px-3 py-2">
                      {session.user.name} · {session.user.role.replaceAll("_", " ")}
                    </span>
                    <SignOutButton />
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="rounded-full border border-[var(--ink)]/10 px-4 py-2 transition hover:border-[var(--ink)]/25 hover:bg-white/60 hover:text-[var(--ink)]"
                  >
                    Sign in
                  </Link>
                )}
              </div>
            </div>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}