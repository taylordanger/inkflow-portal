"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth";
import { createConsultationFromSocialLead } from "@/lib/consultations";
import { prisma } from "@/lib/db";
import { getRequestAuditContext } from "@/lib/request-context";
import { guardSocialLeadInStudio } from "@/lib/tenant-scope";

export async function createConsultationFromSocialLeadAction(formData: FormData) {
  const user = await requirePermission("social.convertLead");
  const request = await getRequestAuditContext();
  const socialLeadId = String(formData.get("socialLeadId") ?? "").trim();

  if (!socialLeadId) {
    return;
  }

  if (!(await guardSocialLeadInStudio({
    action: "convert-social-lead",
    actor: { id: user.id, name: user.name ?? "Studio staff", role: user.role },
    request,
    resourceId: socialLeadId,
    studioId: user.studioId,
  }))) {
    return;
  }

  await createConsultationFromSocialLead(socialLeadId, user.id);
  revalidatePath("/social-inbox");
  revalidatePath("/consultations");
}

export async function requestMissingFieldsAction(formData: FormData) {
  const user = await requirePermission("social.requestMissingFields");
  const request = await getRequestAuditContext();
  const socialLeadId = String(formData.get("socialLeadId") ?? "").trim();
  const fieldsNeeded = JSON.parse(formData.get("fieldsNeeded") as string) as string[];
  const message = String(formData.get("message") ?? "").trim();

  if (!socialLeadId || fieldsNeeded.length === 0) {
    return;
  }

  if (!(await guardSocialLeadInStudio({
    action: "request-social-missing-fields",
    actor: { id: user.id, name: user.name ?? "Studio staff", role: user.role },
    request,
    resourceId: socialLeadId,
    studioId: user.studioId,
  }))) {
    return;
  }

  await prisma.socialLead.update({
    where: { id: socialLeadId },
    data: {
      infoRequestedAt: new Date(),
      infoRequestedBy: user.id,
      infoRequestedFields: JSON.stringify(fieldsNeeded),
      infoRequestMessage: message || null,
    },
  });

  // Log the event
  await prisma.socialLeadEvent.create({
    data: {
      socialLeadId,
      type: "info-requested",
      details: `${user.name} requested: ${fieldsNeeded.join(", ")}. Message: ${message}`,
    },
  });

  revalidatePath("/social-inbox");
}