"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  addApprovalEvent,
  addDesignNote,
  captureDepositPayment,
  captureOutstandingDeposit,
  createConsultation,
  recordFailedDeposit,
  refundDeposit,
  requestDeposit,
  scheduleAppointment,
  sendApprovalPortalLink,
  updateConsultationWorkflow,
} from "@/lib/consultations";
import { requirePermission, requireUser } from "@/lib/auth";
import { getRequestAuditContext } from "@/lib/request-context";
import { guardConsultationInStudio } from "@/lib/tenant-scope";
import type { ConsultationFormFields, ConsultationFormState } from "@/types/studio";

const consultationSchema = z.object({
  clientName: z.string().trim().min(2, "Client name is required."),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z.string().trim().min(7, "Phone number is required."),
  placement: z.string().trim().min(2, "Placement is required."),
  style: z.string().trim().min(2, "Tattoo style is required."),
  budgetRange: z.enum(["$150-$300", "$300-$600", "$600-$1,000", "$1,000+"]),
  preferredArtist: z.enum(["Kai", "Mara", "Sol", "First available"]),
  leadSource: z.enum(["Instagram", "TikTok", "Walk-in", "Referral", "Website", "Returning client"]),
  requestedWindow: z.string().trim().min(2, "Requested timing is required."),
  ideaSummary: z.string().trim().min(20, "Add a short description of the tattoo idea."),
  referenceSummary: z.string().trim().min(10, "Describe the references or direction you have."),
});

function readValues(formData: FormData): ConsultationFormFields {
  return {
    clientName: String(formData.get("clientName") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    placement: String(formData.get("placement") ?? "").trim(),
    style: String(formData.get("style") ?? "").trim(),
    budgetRange: String(formData.get("budgetRange") ?? "$150-$300") as ConsultationFormFields["budgetRange"],
    preferredArtist: String(formData.get("preferredArtist") ?? "First available") as ConsultationFormFields["preferredArtist"],
    leadSource: String(formData.get("leadSource") ?? "Website") as ConsultationFormFields["leadSource"],
    requestedWindow: String(formData.get("requestedWindow") ?? "").trim(),
    ideaSummary: String(formData.get("ideaSummary") ?? "").trim(),
    referenceSummary: String(formData.get("referenceSummary") ?? "").trim(),
  };
}

export async function createConsultationAction(
  _previousState: ConsultationFormState,
  formData: FormData,
): Promise<ConsultationFormState> {
  const user = await requireUser();
  const values = readValues(formData);
  const result = consultationSchema.safeParse(values);

  if (!result.success) {
    return {
      status: "error",
      message: "Fix the highlighted fields before submitting the intake.",
      fieldErrors: result.error.flatten().fieldErrors,
      values,
    };
  }

  const consultation = await createConsultation(result.data, user.id);
  revalidatePath("/consultations");

  return {
    status: "success",
    message: `Intake added for ${consultation.clientName}. The lead is now in New inquiry.`,
  };
}

export async function scheduleConsultAction(formData: FormData) {
  const user = await requirePermission("consultation.create");
  const request = await getRequestAuditContext();
  const consultationId = String(formData.get("consultationId") ?? "").trim();

  if (!consultationId) {
    return;
  }

  if (!(await guardConsultationInStudio({
    action: "schedule-consult",
    actor: { id: user.id, name: user.name ?? "Studio staff", role: user.role },
    request,
    resourceId: consultationId,
    studioId: user.studioId,
  }))) {
    return;
  }

  await updateConsultationWorkflow(consultationId);
  revalidatePath("/consultations");
}

export async function requestDepositAction(formData: FormData) {
  const user = await requirePermission("deposit.manage");
  const request = await getRequestAuditContext();
  const consultationId = String(formData.get("consultationId") ?? "").trim();

  if (!consultationId) {
    return;
  }

  if (!(await guardConsultationInStudio({
    action: "request-deposit",
    actor: { id: user.id, name: user.name ?? "Studio staff", role: user.role },
    request,
    resourceId: consultationId,
    studioId: user.studioId,
  }))) {
    return;
  }

  await requestDeposit(consultationId, {
    id: user.id,
    name: user.name ?? "Studio staff",
    role: user.role,
  }, request);
  revalidatePath("/consultations");
  revalidatePath("/deposits");
}

export async function markDepositPaidAction(formData: FormData) {
  const user = await requirePermission("deposit.manage");
  const request = await getRequestAuditContext();
  const consultationId = String(formData.get("consultationId") ?? "").trim();

  if (!consultationId) {
    return;
  }

  if (!(await guardConsultationInStudio({
    action: "mark-deposit-paid",
    actor: { id: user.id, name: user.name ?? "Studio staff", role: user.role },
    request,
    resourceId: consultationId,
    studioId: user.studioId,
  }))) {
    return;
  }

  await captureOutstandingDeposit(consultationId, {
    id: user.id,
    name: user.name ?? "Studio staff",
    role: user.role,
  }, request);
  revalidatePath("/consultations");
  revalidatePath("/deposits");
  revalidatePath("/design-approvals");
}

const designNoteSchema = z.object({
  consultationId: z.string().min(1),
  note: z.string().trim().min(10),
});

const approvalEventSchema = z.object({
  consultationId: z.string().min(1),
  status: z.enum(["Concept sent", "Revision requested", "Approved", "Finalized"]),
  note: z.string().trim().optional(),
});

const appointmentSchema = z.object({
  consultationId: z.string().min(1),
  artistId: z.string().min(1),
  startsAt: z.string().min(1),
  durationMinutes: z.coerce.number().int().min(30).max(480),
  notes: z.string().trim().optional(),
});

const depositPaymentSchema = z.object({
  consultationId: z.string().min(1),
  amount: z.coerce.number().positive(),
  note: z.string().trim().optional(),
});

const depositFailureSchema = z.object({
  consultationId: z.string().min(1),
  reason: z.string().trim().min(5),
});

export async function addDesignNoteAction(formData: FormData) {
  const user = await requirePermission("design.annotate");
  const request = await getRequestAuditContext();

  const parsed = designNoteSchema.safeParse({
    consultationId: String(formData.get("consultationId") ?? ""),
    note: String(formData.get("note") ?? ""),
  });

  if (!parsed.success) {
    return;
  }

  if (!(await guardConsultationInStudio({
    action: "add-design-note",
    actor: { id: user.id, name: user.name ?? "Studio staff", role: user.role },
    request,
    resourceId: parsed.data.consultationId,
    studioId: user.studioId,
  }))) {
    return;
  }

  await addDesignNote(parsed.data, user.id);
  revalidatePath("/consultations");
}

export async function addApprovalEventAction(formData: FormData) {
  const user = await requirePermission("design.annotate");
  const request = await getRequestAuditContext();

  const parsed = approvalEventSchema.safeParse({
    consultationId: String(formData.get("consultationId") ?? ""),
    status: String(formData.get("status") ?? "Concept sent"),
    note: String(formData.get("note") ?? ""),
  });

  if (!parsed.success) {
    return;
  }

  if (!(await guardConsultationInStudio({
    action: "add-approval-event",
    actor: { id: user.id, name: user.name ?? "Studio staff", role: user.role },
    request,
    resourceId: parsed.data.consultationId,
    studioId: user.studioId,
  }))) {
    return;
  }

  await addApprovalEvent(parsed.data, {
    id: user.id,
    name: user.name ?? "Studio staff",
    role: user.role,
  }, request);
  revalidatePath("/consultations");
  revalidatePath("/design-approvals");
}

export async function scheduleAppointmentAction(formData: FormData) {
  const user = await requirePermission("appointment.schedule");
  const request = await getRequestAuditContext();

  const parsed = appointmentSchema.safeParse({
    consultationId: String(formData.get("consultationId") ?? ""),
    artistId: String(formData.get("artistId") ?? ""),
    startsAt: String(formData.get("startsAt") ?? ""),
    durationMinutes: formData.get("durationMinutes"),
    notes: String(formData.get("notes") ?? ""),
  });

  if (!parsed.success) {
    return;
  }

  if (!(await guardConsultationInStudio({
    action: "schedule-appointment",
    actor: { id: user.id, name: user.name ?? "Studio staff", role: user.role },
    request,
    resourceId: parsed.data.consultationId,
    studioId: user.studioId,
  }))) {
    return;
  }

  await scheduleAppointment(parsed.data, {
    id: user.id,
    name: user.name ?? "Studio staff",
    role: user.role,
  }, request);
  revalidatePath("/consultations");
  revalidatePath("/appointments");
  revalidatePath("/consent-forms");
}

export async function recordPartialDepositAction(formData: FormData) {
  const user = await requirePermission("deposit.manage");
  const request = await getRequestAuditContext();
  const parsed = depositPaymentSchema.safeParse({
    consultationId: String(formData.get("consultationId") ?? ""),
    amount: formData.get("amount"),
    note: String(formData.get("note") ?? ""),
  });

  if (!parsed.success) {
    return;
  }

  if (!(await guardConsultationInStudio({
    action: "record-partial-deposit",
    actor: { id: user.id, name: user.name ?? "Studio staff", role: user.role },
    request,
    resourceId: parsed.data.consultationId,
    studioId: user.studioId,
  }))) {
    return;
  }

  await captureDepositPayment(parsed.data, {
    id: user.id,
    name: user.name ?? "Studio staff",
    role: user.role,
  }, request);
  revalidatePath("/consultations");
  revalidatePath("/deposits");
  revalidatePath("/design-approvals");
}

export async function refundDepositAction(formData: FormData) {
  const user = await requirePermission("deposit.manage");
  const request = await getRequestAuditContext();
  const parsed = depositPaymentSchema.safeParse({
    consultationId: String(formData.get("consultationId") ?? ""),
    amount: formData.get("amount"),
    note: String(formData.get("note") ?? ""),
  });

  if (!parsed.success) {
    return;
  }

  if (!(await guardConsultationInStudio({
    action: "refund-deposit",
    actor: { id: user.id, name: user.name ?? "Studio staff", role: user.role },
    request,
    resourceId: parsed.data.consultationId,
    studioId: user.studioId,
  }))) {
    return;
  }

  await refundDeposit(parsed.data, {
    id: user.id,
    name: user.name ?? "Studio staff",
    role: user.role,
  }, request);
  revalidatePath("/consultations");
  revalidatePath("/deposits");
}

export async function recordFailedDepositAction(formData: FormData) {
  const user = await requirePermission("deposit.manage");
  const request = await getRequestAuditContext();
  const parsed = depositFailureSchema.safeParse({
    consultationId: String(formData.get("consultationId") ?? ""),
    reason: String(formData.get("reason") ?? ""),
  });

  if (!parsed.success) {
    return;
  }

  if (!(await guardConsultationInStudio({
    action: "record-failed-deposit",
    actor: { id: user.id, name: user.name ?? "Studio staff", role: user.role },
    request,
    resourceId: parsed.data.consultationId,
    studioId: user.studioId,
  }))) {
    return;
  }

  await recordFailedDeposit(parsed.data, {
    id: user.id,
    name: user.name ?? "Studio staff",
    role: user.role,
  }, request);
  revalidatePath("/consultations");
  revalidatePath("/deposits");
}

export async function sendApprovalPortalLinkAction(formData: FormData) {
  const user = await requirePermission("approval.sendPortal");
  const request = await getRequestAuditContext();
  const consultationId = String(formData.get("consultationId") ?? "").trim();

  if (!consultationId) {
    return;
  }

  if (!(await guardConsultationInStudio({
    action: "send-approval-portal-link",
    actor: { id: user.id, name: user.name ?? "Studio staff", role: user.role },
    request,
    resourceId: consultationId,
    studioId: user.studioId,
  }))) {
    return;
  }

  await sendApprovalPortalLink(
    consultationId,
    {
      id: user.id,
      name: user.name ?? "Studio staff",
      role: user.role,
    },
    request,
  );

  revalidatePath("/consultations");
  revalidatePath("/design-approvals");
}