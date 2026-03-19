"use client";

import { useEffect, useMemo, useState } from "react";

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function LiveDateTime({
  variant = "compact",
  className,
}: {
  variant?: "compact" | "hero";
  className?: string;
}) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());

    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const values = useMemo(
    () => ({
      time: now ? formatTime(now) : "--:--:-- --",
      date: now ? formatDate(now) : "Loading local studio date",
    }),
    [now],
  );

  if (variant === "hero") {
    return (
      <aside className={`rounded-[28px] border border-[var(--ink)]/10 bg-white/65 p-5 ${className ?? ""}`.trim()}>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Studio clock</p>
        <p className="mt-2 font-display text-6xl uppercase leading-none tracking-[0.08em] text-[var(--ink)] sm:text-7xl">
          {values.time}
        </p>
        <p className="mt-2 text-sm text-[var(--muted)]">{values.date}</p>
      </aside>
    );
  }

  return (
    <div className={`rounded-full border border-[var(--ink)]/10 bg-white/70 px-4 py-2 ${className ?? ""}`.trim()}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Local studio time</p>
      <p className="font-display text-2xl uppercase leading-none tracking-[0.08em] text-[var(--ink)]">{values.time}</p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">{values.date}</p>
    </div>
  );
}
