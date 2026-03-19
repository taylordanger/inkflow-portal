import {
  AppointmentStatus as PrismaAppointmentStatus,
  UserRole,
} from "@prisma/client";

import { prisma } from "@/lib/db";
import type { AppointmentRecord } from "@/types/studio";

const appointmentStatusLabel: Record<PrismaAppointmentStatus, AppointmentRecord["status"]> = {
  SCHEDULED: "Scheduled",
  RESCHEDULED: "Rescheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

type Viewer = {
  id: string;
  role: UserRole;
  studioId: string;
};

type MutationInput = {
  appointmentId: string;
  studioId: string;
};

type ReassignInput = MutationInput & {
  targetArtistId: string;
  targetDate: string;
  targetTime?: string;
};

export async function getAppointmentPageData(viewer?: Viewer): Promise<AppointmentRecord[]> {
  const appointments = await prisma.appointment.findMany({
    where: viewer
      ? viewer.role === UserRole.ARTIST
        ? { artistId: viewer.id, consultation: { studioId: viewer.studioId } }
        : { consultation: { studioId: viewer.studioId } }
      : undefined,
    include: {
      artist: { select: { id: true, name: true } },
      consultation: { select: { clientName: true } },
    },
    orderBy: { startsAt: "asc" },
  });

  return appointments.map((appointment) => ({
    id: appointment.id,
    consultationId: appointment.consultationId,
    clientName: appointment.consultation.clientName,
    artistId: appointment.artist.id,
    artistName: appointment.artist.name,
    startsAt: appointment.startsAt.toISOString(),
    durationMinutes: appointment.durationMinutes,
    status: appointmentStatusLabel[appointment.status],
    notes: appointment.notes,
  }));
}

export async function moveAppointmentByMinutes(
  input: MutationInput & { deltaMinutes: number },
): Promise<boolean> {
  const appointment = await prisma.appointment.findFirst({
    where: {
      id: input.appointmentId,
      consultation: { studioId: input.studioId },
    },
    select: { id: true, startsAt: true, status: true },
  });

  if (!appointment || appointment.status === "COMPLETED" || appointment.status === "CANCELLED") {
    return false;
  }

  const nextStart = new Date(appointment.startsAt);
  nextStart.setMinutes(nextStart.getMinutes() + input.deltaMinutes);

  await prisma.appointment.update({
    where: { id: appointment.id },
    data: {
      startsAt: nextStart,
      status: "RESCHEDULED",
    },
  });

  return true;
}

export async function setAppointmentStatus(
  input: MutationInput & { status: "COMPLETED" | "CANCELLED" | "SCHEDULED" },
): Promise<boolean> {
  const appointment = await prisma.appointment.findFirst({
    where: {
      id: input.appointmentId,
      consultation: { studioId: input.studioId },
    },
    select: { id: true },
  });

  if (!appointment) {
    return false;
  }

  await prisma.appointment.update({
    where: { id: appointment.id },
    data: { status: input.status },
  });

  return true;
}

export async function reassignAppointmentToArtistDay(
  input: ReassignInput,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const appointment = await prisma.appointment.findFirst({
    where: {
      id: input.appointmentId,
      consultation: { studioId: input.studioId },
    },
    include: {
      consultation: { select: { studioId: true } },
    },
  });

  if (!appointment) {
    return { ok: false, reason: "Appointment not found." };
  }

  const artist = await prisma.user.findFirst({
    where: {
      id: input.targetArtistId,
      studioId: input.studioId,
      role: UserRole.ARTIST,
      isActive: true,
    },
    select: { id: true },
  });

  if (!artist) {
    return { ok: false, reason: "Target artist is unavailable." };
  }

  const [year, month, day] = input.targetDate.split("-").map((value) => Number(value));
  if (!year || !month || !day) {
    return { ok: false, reason: "Invalid target day." };
  }

  const currentStart = appointment.startsAt;
  const [hourFromTime, minuteFromTime] = input.targetTime
    ? input.targetTime.split(":").map((value) => Number(value))
    : [currentStart.getHours(), currentStart.getMinutes()];
  const targetStart = new Date(
    year,
    month - 1,
    day,
    hourFromTime,
    minuteFromTime,
    0,
    0,
  );
  const targetEnd = new Date(targetStart.getTime() + appointment.durationMinutes * 60 * 1000);

  const artistAppointments = await prisma.appointment.findMany({
    where: {
      artistId: artist.id,
      id: { not: appointment.id },
      status: { not: "CANCELLED" },
      consultation: { studioId: input.studioId },
    },
    select: {
      startsAt: true,
      durationMinutes: true,
    },
  });

  const overlap = artistAppointments.some((entry) => {
    const entryStart = entry.startsAt;
    const entryEnd = new Date(entryStart.getTime() + entry.durationMinutes * 60 * 1000);
    return entryStart < targetEnd && entryEnd > targetStart;
  });

  if (overlap) {
    return { ok: false, reason: "Schedule conflict for this artist and time." };
  }

  await prisma.appointment.update({
    where: { id: appointment.id },
    data: {
      artistId: artist.id,
      startsAt: targetStart,
      status: "RESCHEDULED",
    },
  });

  await prisma.consultation.update({
    where: { id: appointment.consultationId },
    data: {
      assignedArtistId: artist.id,
    },
  });

  return { ok: true };
}