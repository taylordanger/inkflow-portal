"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requirePermission } from "@/lib/auth";
import {
  moveAppointmentByMinutes,
  reassignAppointmentToArtistDay,
  setAppointmentStatus,
} from "@/lib/appointments";

const moveSchema = z.object({
  appointmentId: z.string().min(1),
  deltaMinutes: z.coerce.number().int(),
});

const statusSchema = z.object({
  appointmentId: z.string().min(1),
  status: z.enum(["COMPLETED", "CANCELLED", "SCHEDULED"]),
});

const reassignSchema = z.object({
  appointmentId: z.string().min(1),
  targetArtistId: z.string().min(1),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  targetTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

export async function moveAppointmentAction(formData: FormData) {
  const user = await requirePermission("appointment.schedule");

  const parsed = moveSchema.safeParse({
    appointmentId: String(formData.get("appointmentId") ?? ""),
    deltaMinutes: formData.get("deltaMinutes"),
  });

  if (!parsed.success) {
    return;
  }

  await moveAppointmentByMinutes({
    appointmentId: parsed.data.appointmentId,
    studioId: user.studioId,
    deltaMinutes: parsed.data.deltaMinutes,
  });

  revalidatePath("/appointments");
}

export async function updateAppointmentStatusAction(formData: FormData) {
  const user = await requirePermission("appointment.schedule");

  const parsed = statusSchema.safeParse({
    appointmentId: String(formData.get("appointmentId") ?? ""),
    status: String(formData.get("status") ?? "SCHEDULED"),
  });

  if (!parsed.success) {
    return;
  }

  await setAppointmentStatus({
    appointmentId: parsed.data.appointmentId,
    studioId: user.studioId,
    status: parsed.data.status,
  });

  revalidatePath("/appointments");
}

export async function reassignAppointmentAction(formData: FormData) {
  const user = await requirePermission("appointment.schedule");

  const parsed = reassignSchema.safeParse({
    appointmentId: String(formData.get("appointmentId") ?? ""),
    targetArtistId: String(formData.get("targetArtistId") ?? ""),
    targetDate: String(formData.get("targetDate") ?? ""),
    targetTime: String(formData.get("targetTime") ?? "") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, reason: "Invalid move payload." };
  }

  const result = await reassignAppointmentToArtistDay({
    appointmentId: parsed.data.appointmentId,
    studioId: user.studioId,
    targetArtistId: parsed.data.targetArtistId,
    targetDate: parsed.data.targetDate,
    targetTime: parsed.data.targetTime,
  });

  if (result.ok) {
    revalidatePath("/appointments");
  }

  return result;
}
