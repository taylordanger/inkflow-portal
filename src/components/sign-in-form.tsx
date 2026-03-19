"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function SignInForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setIsPending(true);

    const result = await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirect: false,
      callbackUrl: redirectTo,
    });

    setIsPending(false);

    if (!result || result.error) {
      setError("Invalid credentials. Use one of the seeded studio accounts.");
      return;
    }

    router.push(result.url ?? redirectTo);
    router.refresh();
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      <label className="block text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        Email
        <input
          name="email"
          type="email"
          className="mt-2 w-full rounded-[20px] border border-[var(--ink)]/10 bg-white/70 px-4 py-3 text-base text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)]/60 focus:border-[var(--brass)] focus:bg-white"
          placeholder="frontdesk@inkflow.local"
          defaultValue="frontdesk@inkflow.local"
        />
      </label>
      <label className="block text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        Password
        <input
          name="password"
          type="password"
          className="mt-2 w-full rounded-[20px] border border-[var(--ink)]/10 bg-white/70 px-4 py-3 text-base text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)]/60 focus:border-[var(--brass)] focus:bg-white"
          placeholder="inkflow-demo"
          defaultValue="inkflow-demo"
        />
      </label>
      <div className="rounded-[24px] border border-[var(--ink)]/8 bg-white/65 p-4 text-sm leading-7 text-[var(--muted)]">
        Seeded accounts include front desk, owner, and artist roles. The default password for all seeded users is <span className="font-semibold text-[var(--ink)]">inkflow-demo</span>.
      </div>
      {error ? <p className="text-sm text-[var(--ember)]">{error}</p> : null}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-[var(--ink)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--canvas)] transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Signing in..." : "Enter the studio"}
      </button>
    </form>
  );
}