"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  moveAppointmentAction,
  reassignAppointmentAction,
  updateAppointmentStatusAction,
} from "@/app/appointments/actions";
import type { AppointmentRecord } from "@/types/studio";

const slotTimes = ["10:00", "12:00", "14:00", "16:00", "18:00"];

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() - copy.getDay());
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function getWeekDays(referenceDate: Date) {
  const weekStart = startOfWeek(referenceDate);
  const days: Date[] = [];

  const cursor = new Date(weekStart);
  for (let i = 0; i < 7; i += 1) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function shiftDays(date: Date, deltaDays: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + deltaDays);
  return next;
}

function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function overlaps(a: AppointmentRecord, b: AppointmentRecord) {
  const aStart = new Date(a.startsAt).getTime();
  const aEnd = aStart + a.durationMinutes * 60_000;
  const bStart = new Date(b.startsAt).getTime();
  const bEnd = bStart + b.durationMinutes * 60_000;
  return aStart < bEnd && aEnd > bStart;
}

function titleForWeek(days: Date[]) {
  if (days.length === 0) {
    return "";
  }

  const first = days[0];
  const last = days[days.length - 1];
  const firstLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(first);
  const lastLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(last);
  return `${firstLabel} - ${lastLabel}`;
}

export function WeeklyArtistScheduler({
  appointments,
  canManage,
}: {
  appointments: AppointmentRecord[];
  canManage: boolean;
}) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [draggingAppointmentId, setDraggingAppointmentId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [activeAppointmentId, setActiveAppointmentId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const anchorDate = useMemo(() => shiftDays(new Date(), weekOffset * 7), [weekOffset]);
  const days = useMemo(() => getWeekDays(anchorDate), [anchorDate]);
  const dayKeys = useMemo(() => new Set(days.map((day) => dateKey(day))), [days]);

  const weekAppointments = useMemo(
    () => appointments.filter((appointment) => dayKeys.has(dateKey(new Date(appointment.startsAt)))),
    [appointments, dayKeys],
  );

  const artists = useMemo(() => {
    const map = new Map<string, string>();
    for (const appointment of appointments) {
      map.set(appointment.artistId, appointment.artistName);
    }

    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [appointments]);

  const appointmentsByArtistDay = useMemo(() => {
    const map = new Map<string, AppointmentRecord[]>();

    for (const appointment of weekAppointments) {
      const key = `${appointment.artistId}::${dateKey(new Date(appointment.startsAt))}`;
      const existing = map.get(key) ?? [];
      existing.push(appointment);
      map.set(key, existing);
    }

    for (const entries of map.values()) {
      entries.sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
    }

    return map;
  }, [weekAppointments]);

  const conflictIds = useMemo(() => {
    const conflicts = new Set<string>();

    for (const entries of appointmentsByArtistDay.values()) {
      for (let i = 0; i < entries.length; i += 1) {
        for (let j = i + 1; j < entries.length; j += 1) {
          if (overlaps(entries[i], entries[j])) {
            conflicts.add(entries[i].id);
            conflicts.add(entries[j].id);
          }
        }
      }
    }

    return conflicts;
  }, [appointmentsByArtistDay]);

  const selectedAppointment = useMemo(
    () => appointments.find((appointment) => appointment.id === selectedAppointmentId) ?? null,
    [appointments, selectedAppointmentId],
  );

  async function runAction(action: (formData: FormData) => Promise<unknown>, formData: FormData) {
    startTransition(() => {
      void action(formData)
        .then((result) => {
          if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            navigator.vibrate(
              result && typeof result === "object" && "ok" in result && (result as { ok: boolean }).ok === false
                ? [18, 30, 18]
                : [12],
            );
          }

          if (feedbackTimer.current) {
            clearTimeout(feedbackTimer.current);
          }

          if (
            result &&
            typeof result === "object" &&
            "ok" in result &&
            (result as { ok: boolean }).ok === false &&
            "reason" in result
          ) {
            setFeedback({
              tone: "error",
              message: String((result as { reason: string }).reason),
            });
          } else {
            setFeedback({
              tone: "success",
              message: "Schedule updated.",
            });
          }

          feedbackTimer.current = setTimeout(() => {
            setFeedback(null);
            setActiveAppointmentId(null);
          }, 2200);

          router.refresh();
        })
        .catch(() => {
          setFeedback({
            tone: "error",
            message: "Could not update schedule. Please retry.",
          });
        });
    });
  }

  function openActionSheetOnLongPress(appointmentId: string) {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
    }

    pressTimer.current = setTimeout(() => {
      setSelectedAppointmentId(appointmentId);
    }, 420);
  }

  function clearLongPress() {
    if (!pressTimer.current) {
      return;
    }

    clearTimeout(pressTimer.current);
    pressTimer.current = null;
  }

  function dropIntoLane(artistId: string, dayId: string, targetTime?: string) {
    if (!canManage || !draggingAppointmentId) {
      return;
    }

    setActiveAppointmentId(draggingAppointmentId);

    const formData = new FormData();
    formData.set("appointmentId", draggingAppointmentId);
    formData.set("targetArtistId", artistId);
    formData.set("targetDate", dayId);
    if (targetTime) {
      formData.set("targetTime", targetTime);
    }

    void runAction(reassignAppointmentAction, formData);
    setDraggingAppointmentId(null);
  }

  return (
    <div className="mt-8 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[var(--ink)]/10 bg-white/70 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Week of {titleForWeek(days)}</p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setWeekOffset((value) => value - 1)} className="rounded-full border border-[var(--ink)]/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink)]">Prev</button>
          <button type="button" onClick={() => setWeekOffset(0)} className="rounded-full border border-[var(--ink)]/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink)]">Today</button>
          <button type="button" onClick={() => setWeekOffset((value) => value + 1)} className="rounded-full border border-[var(--ink)]/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink)]">Next</button>
        </div>
      </div>

      {feedback ? (
        <p className={`rounded-[16px] border px-4 py-3 text-sm ${feedback.tone === "error" ? "border-[var(--ember)]/25 bg-[var(--ember)]/10 text-[var(--ember)]" : "border-[var(--teal)]/25 bg-[var(--teal)]/10 text-[var(--ink)]"}`}>
          {feedback.message}
        </p>
      ) : null}

      {artists.map((artist) => (
        <section key={artist.id} className="rounded-[24px] border border-[var(--ink)]/10 bg-white/75 p-4">
          <h3 className="font-display text-3xl uppercase tracking-[0.08em] text-[var(--ink)]">{artist.name}</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
            {days.map((day) => {
              const dayId = dateKey(day);
              const laneKey = `${artist.id}::${dayId}`;
              const entries = appointmentsByArtistDay.get(laneKey) ?? [];

              return (
                <div
                  key={laneKey}
                  className="rounded-[16px] border border-[var(--ink)]/10 bg-[var(--canvas)] p-3"
                  onDragOver={(event) => {
                    if (!canManage) {
                      return;
                    }
                    event.preventDefault();
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    dropIntoLane(artist.id, dayId);
                  }}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{formatDayLabel(day)}</p>

                  {canManage ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {slotTimes.map((slot) => (
                        <button
                          key={`${laneKey}-${slot}`}
                          type="button"
                          onDragOver={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            dropIntoLane(artist.id, dayId, slot);
                          }}
                          className="rounded-full border border-[var(--ink)]/12 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]"
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-3 space-y-2">
                    {entries.length === 0 ? (
                      <p className="text-xs text-[var(--muted)]">Open slot</p>
                    ) : (
                      entries.map((appointment) => (
                        <article
                          key={appointment.id}
                          draggable={canManage}
                          onDragStart={() => setDraggingAppointmentId(appointment.id)}
                          onPointerDown={() => openActionSheetOnLongPress(appointment.id)}
                          onPointerUp={clearLongPress}
                          onPointerCancel={clearLongPress}
                          onPointerLeave={clearLongPress}
                          className={`rounded-[14px] border bg-white px-3 py-3 transition ${activeAppointmentId === appointment.id ? "animate-[pulse_500ms_ease-out_1] ring-2 ring-[var(--brass)]/35" : ""} ${conflictIds.has(appointment.id) ? "border-[var(--ember)]/40" : "border-[var(--ink)]/10"}`}
                        >
                          <p className="text-sm font-semibold text-[var(--ink)]">
                            <Link href={`/clients/${appointment.consultationId}`} className="underline-offset-2 hover:underline">
                              {appointment.clientName}
                            </Link>
                          </p>
                          <p className="mt-1 text-xs text-[var(--muted)]">{formatTime(appointment.startsAt)} · {appointment.durationMinutes} min</p>
                          <p className="mt-1 text-xs text-[var(--muted)]">{appointment.status}</p>
                          {conflictIds.has(appointment.id) ? (
                            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ember)]">Conflict</p>
                          ) : null}

                          {canManage ? (
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => {
                                  setActiveAppointmentId(appointment.id);
                                  const formData = new FormData();
                                  formData.set("appointmentId", appointment.id);
                                  formData.set("deltaMinutes", "-30");
                                  void runAction(moveAppointmentAction, formData);
                                }}
                                className="rounded-full border border-[var(--ink)]/15 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink)]"
                              >
                                -30m
                              </button>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => {
                                  setActiveAppointmentId(appointment.id);
                                  const formData = new FormData();
                                  formData.set("appointmentId", appointment.id);
                                  formData.set("deltaMinutes", "30");
                                  void runAction(moveAppointmentAction, formData);
                                }}
                                className="rounded-full border border-[var(--ink)]/15 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink)]"
                              >
                                +30m
                              </button>
                            </div>
                          ) : null}
                        </article>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {selectedAppointment && canManage ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--ink)]/10 bg-[color:rgba(20,17,14,0.96)] p-4 text-[var(--canvas)] shadow-[0_-20px_40px_rgba(18,16,13,0.25)]">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Quick actions</p>
            <p className="text-sm text-white">
              {selectedAppointment.clientName} · {formatTime(selectedAppointment.startsAt)} · {selectedAppointment.artistName}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button
                type="button"
                onClick={() => {
                  setActiveAppointmentId(selectedAppointment.id);
                  const formData = new FormData();
                  formData.set("appointmentId", selectedAppointment.id);
                  formData.set("deltaMinutes", "-30");
                  void runAction(moveAppointmentAction, formData);
                  setSelectedAppointmentId(null);
                }}
                className="rounded-full border border-white/20 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em]"
              >
                Earlier -30m
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveAppointmentId(selectedAppointment.id);
                  const formData = new FormData();
                  formData.set("appointmentId", selectedAppointment.id);
                  formData.set("deltaMinutes", "30");
                  void runAction(moveAppointmentAction, formData);
                  setSelectedAppointmentId(null);
                }}
                className="rounded-full border border-white/20 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em]"
              >
                Later +30m
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveAppointmentId(selectedAppointment.id);
                  const formData = new FormData();
                  formData.set("appointmentId", selectedAppointment.id);
                  formData.set("status", "COMPLETED");
                  void runAction(updateAppointmentStatusAction, formData);
                  setSelectedAppointmentId(null);
                }}
                className="rounded-full border border-[var(--teal)]/45 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em]"
              >
                Mark complete
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveAppointmentId(selectedAppointment.id);
                  const formData = new FormData();
                  formData.set("appointmentId", selectedAppointment.id);
                  formData.set("status", "CANCELLED");
                  void runAction(updateAppointmentStatusAction, formData);
                  setSelectedAppointmentId(null);
                }}
                className="rounded-full border border-[var(--ember)]/45 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ember)]"
              >
                Cancel
              </button>
            </div>
            <button
              type="button"
              onClick={() => setSelectedAppointmentId(null)}
              className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/70"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
