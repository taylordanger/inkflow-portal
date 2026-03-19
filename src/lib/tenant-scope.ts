import { prisma } from "@/lib/db";
import type { AuditActor, AuditRequestContext } from "@/lib/audit";
import { createAuditLog } from "@/lib/audit";

export async function isConsultationInStudio(
  consultationId: string,
  studioId: string,
): Promise<boolean> {
  const consultation = await prisma.consultation.findFirst({
    where: { id: consultationId, studioId },
    select: { id: true },
  });

  return Boolean(consultation);
}

export async function isSocialLeadInStudio(
  socialLeadId: string,
  studioId: string,
): Promise<boolean> {
  const lead = await prisma.socialLead.findFirst({
    where: { id: socialLeadId, studioId },
    select: { id: true },
  });

  return Boolean(lead);
}

export async function isConsentFormInStudio(
  consentId: string,
  studioId: string,
): Promise<boolean> {
  const form = await prisma.consentForm.findFirst({
    where: { id: consentId, consultation: { studioId } },
    select: { id: true },
  });

  return Boolean(form);
}

type GuardInput = {
  resourceId: string;
  actor: AuditActor;
  request?: AuditRequestContext;
  action: string;
  studioId: string;
};

async function recordBlockedCrossStudioMutation(input: {
  actor: AuditActor;
  request?: AuditRequestContext;
  action: string;
  resourceType: "consultation" | "social-lead" | "consent-form";
  resourceId: string;
  studioId: string;
}) {
  await createAuditLog({
    domain: "SECURITY",
    action: "Blocked cross-studio mutation",
    details: `${input.action} denied for ${input.resourceType} ${input.resourceId} outside studio ${input.studioId}.`,
    actor: input.actor,
    request: input.request,
  });
}

export async function guardConsultationInStudio(input: GuardInput): Promise<boolean> {
  const allowed = await isConsultationInStudio(input.resourceId, input.studioId);

  if (allowed) {
    return true;
  }

  await recordBlockedCrossStudioMutation({
    actor: input.actor,
    request: input.request,
    action: input.action,
    resourceType: "consent-form",
    resourceId: input.resourceId,
    studioId: input.studioId,
  });

  return false;
}

export async function guardSocialLeadInStudio(input: GuardInput): Promise<boolean> {
  const allowed = await isSocialLeadInStudio(input.resourceId, input.studioId);

  if (allowed) {
    return true;
  }

  await recordBlockedCrossStudioMutation({
    actor: input.actor,
    request: input.request,
    action: input.action,
    resourceType: "social-lead",
    resourceId: input.resourceId,
    studioId: input.studioId,
  });

  return false;
}

export async function guardConsentFormInStudio(input: GuardInput): Promise<boolean> {
  const allowed = await isConsentFormInStudio(input.resourceId, input.studioId);

  if (allowed) {
    return true;
  }

  await recordBlockedCrossStudioMutation({
    actor: input.actor,
    request: input.request,
    action: input.action,
    resourceType: "consultation",
    resourceId: input.resourceId,
    studioId: input.studioId,
  });

  return false;
}
