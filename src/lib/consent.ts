import {
  AuditDomain,
  ClientPortalPurpose,
  DeliveryChannel as PrismaDeliveryChannel,
  PortalDeliveryStatus,
  ConsentStatus as PrismaConsentStatus,
} from "@prisma/client";

import { createAuditDiff, createAuditLog, type AuditActor } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { deliverPortalLink } from "@/lib/delivery";
import {
  ensurePortalLink,
  getPortalLinkByToken,
  getPortalPath,
  recordPortalDeliveryFailure,
  recordPortalDelivery,
} from "@/lib/portals";
import type {
  ConsentFormRecord,
  ConsentStatus,
  DeliveryChannel,
  DeliveryAttemptRecord,
  DeliveryStatus,
} from "@/types/studio";

const consentStatusLabel: Record<PrismaConsentStatus, ConsentStatus> = {
  PENDING: "Pending",
  SENT: "Sent",
  SIGNED: "Signed",
  EXPIRED: "Expired",
};

const deliveryChannelLabel: Record<PrismaDeliveryChannel, DeliveryChannel> = {
  EMAIL: "Email",
  SMS: "SMS",
};

const deliveryStatusLabel: Record<PortalDeliveryStatus, DeliveryStatus> = {
  PENDING: "Pending",
  SENT: "Sent",
  FAILED: "Failed",
  UNAVAILABLE: "Unavailable",
};

function mapDeliveryAttempts(
  attempts: Array<{
    id: string;
    attemptNumber: number;
    status: PortalDeliveryStatus;
    channel: PrismaDeliveryChannel | null;
    target: string | null;
    errorMessage: string | null;
    attemptedAt: Date;
  }>,
): DeliveryAttemptRecord[] {
  return attempts.map((attempt) => ({
    id: attempt.id,
    attemptNumber: attempt.attemptNumber,
    status: deliveryStatusLabel[attempt.status],
    channel: attempt.channel ? deliveryChannelLabel[attempt.channel] : null,
    target: attempt.target,
    errorMessage: attempt.errorMessage,
    attemptedAt: attempt.attemptedAt.toISOString(),
  }));
}

type ConsentMutation = "send" | "resend" | "expire" | "mark-signed";

export async function getConsentPageData(): Promise<ConsentFormRecord[]> {
  const consentForms = await prisma.consentForm.findMany({
    include: {
      consultation: {
        include: {
          assignedArtist: { select: { name: true } },
        },
      },
      appointment: true,
      portalLinks: {
        select: {
          token: true,
          purpose: true,
          deliveryChannel: true,
          deliveryStatus: true,
          deliveryTarget: true,
          lastDeliveryError: true,
          deliveryAttempts: {
            select: {
              id: true,
              attemptNumber: true,
              status: true,
              channel: true,
              target: true,
              errorMessage: true,
              attemptedAt: true,
            },
            orderBy: { attemptedAt: "desc" },
          },
        },
      },
      auditLogs: {
        include: { changes: true },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });

  return consentForms.map((form) => ({
    id: form.id,
    consultationId: form.consultationId,
    clientLegalName: form.clientLegalName,
    artistName: form.consultation.assignedArtist?.name ?? "Unassigned",
    appointmentAt: form.appointment?.startsAt.toISOString() ?? null,
    status: consentStatusLabel[form.status],
    signedAt: form.signedAt?.toISOString() ?? null,
    emergencyContact: form.emergencyContact ?? null,
    emergencyPhone: form.emergencyPhone ?? null,
    healthNotes: form.healthNotes ?? null,
    consentPortalPath:
      form.portalLinks.find((link) => link.purpose === ClientPortalPurpose.CONSENT)
        ? getPortalPath(
            ClientPortalPurpose.CONSENT,
            form.portalLinks.find((link) => link.purpose === ClientPortalPurpose.CONSENT)!.token,
          )
        : null,
    deliveryLabel:
      form.portalLinks.find((link) => link.purpose === ClientPortalPurpose.CONSENT)?.deliveryChannel
        ? `${deliveryChannelLabel[
            form.portalLinks.find((link) => link.purpose === ClientPortalPurpose.CONSENT)!.deliveryChannel!
          ]} sent to ${form.portalLinks.find((link) => link.purpose === ClientPortalPurpose.CONSENT)!.deliveryTarget}`
        : null,
    deliveryStatus:
      form.portalLinks.find((link) => link.purpose === ClientPortalPurpose.CONSENT)?.deliveryStatus
        ? deliveryStatusLabel[
            form.portalLinks.find((link) => link.purpose === ClientPortalPurpose.CONSENT)!.deliveryStatus
          ]
        : null,
    deliveryError:
      form.portalLinks.find((link) => link.purpose === ClientPortalPurpose.CONSENT)?.lastDeliveryError ?? null,
    deliveryAttempts: mapDeliveryAttempts(
      form.portalLinks.find((link) => link.purpose === ClientPortalPurpose.CONSENT)?.deliveryAttempts ?? [],
    ),
    auditEntries: form.auditLogs.map((entry) => ({
      id: entry.id,
      domain: "Consent",
      action: entry.action,
      details: entry.details,
      actorName: entry.actorName,
      actorRole: entry.actorRole ? entry.actorRole.replaceAll("_", " ") : null,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      changes: entry.changes.map((change) => ({
        id: change.id,
        fieldPath: change.fieldPath,
        beforeValue: change.beforeValue,
        afterValue: change.afterValue,
      })),
      createdAt: entry.createdAt.toISOString(),
    })),
  }));
}

export async function updateConsentStatus(
  consentId: string,
  action: ConsentMutation,
  actor: AuditActor,
  request?: import("@/lib/audit").AuditRequestContext,
): Promise<void> {
  const consentForm = await prisma.consentForm.findUnique({
    where: { id: consentId },
  });

  if (!consentForm) {
    return;
  }

  let deliveryDetails: { channel: PrismaDeliveryChannel; target: string } | null = null;
  let deliveryFailure: { status: PortalDeliveryStatus; reason: string } | null = null;

  if (action === "send" || action === "resend") {
    const link = await ensurePortalLink({
      purpose: ClientPortalPurpose.CONSENT,
      consultationId: consentForm.consultationId,
      consentFormId: consentForm.id,
    });
    const consultation = await prisma.consultation.findUnique({
      where: { id: consentForm.consultationId },
      select: { clientName: true, email: true, phone: true },
    });

    if (consultation) {
      const delivery = await deliverPortalLink({
        purpose: ClientPortalPurpose.CONSENT,
        token: link.token,
        clientName: consultation.clientName,
        email: consultation.email,
        phone: consultation.phone,
      });

      if (delivery.status === "sent") {
        await recordPortalDelivery({
          linkId: link.id,
          channel: delivery.channel,
          target: delivery.target,
        });
        deliveryDetails = delivery;
      } else {
        const status =
          delivery.status === "failed"
            ? PortalDeliveryStatus.FAILED
            : PortalDeliveryStatus.UNAVAILABLE;

        await recordPortalDeliveryFailure({
          linkId: link.id,
          status,
          error: delivery.reason,
        });

        deliveryFailure = {
          status,
          reason: delivery.reason,
        };
      }
    }

    if (!deliveryDetails) {
      await createAuditLog({
        domain: AuditDomain.CONSENT,
        action: action === "resend" ? "Waiver resend failed" : "Waiver send failed",
        details: deliveryFailure?.reason ?? "Delivery attempt did not complete.",
        actor,
        request,
        changes: createAuditDiff(
          {
            deliveryStatus: "PENDING",
            lastDeliveryError: null,
          },
          {
            deliveryStatus: deliveryFailure?.status ?? PortalDeliveryStatus.UNAVAILABLE,
            lastDeliveryError: deliveryFailure?.reason ?? "Delivery attempt did not complete.",
          },
        ),
        consultationId: consentForm.consultationId,
        consentFormId: consentForm.id,
      });
      return;
    }
  }

  const updateData =
    action === "expire"
      ? { status: "EXPIRED" as const }
      : action === "mark-signed"
        ? { status: "SIGNED" as const, signedAt: new Date() }
        : { status: "SENT" as const };

  await prisma.consentForm.update({ where: { id: consentId }, data: updateData });

  const updated = await prisma.consentForm.findUnique({ where: { id: consentId } });

  await createAuditLog({
    domain: AuditDomain.CONSENT,
    action:
      action === "mark-signed"
        ? "Waiver marked signed"
        : action === "expire"
          ? "Waiver expired"
          : action === "resend"
            ? "Waiver resent"
            : "Waiver sent",
              details: deliveryDetails ? `${deliveryDetails.channel.toLowerCase()} to ${deliveryDetails.target}` : null,
    actor,
    request,
    changes: createAuditDiff(
      {
        status: consentForm.status,
        signedAt: consentForm.signedAt,
      },
      {
        status: updated?.status,
        signedAt: updated?.signedAt,
      },
    ),
    consultationId: consentForm.consultationId,
    consentFormId: consentForm.id,
  });
}

export async function getConsentPortalData(token: string) {
  const link = await getPortalLinkByToken(token, ClientPortalPurpose.CONSENT);

  if (!link) {
    return null;
  }

  const consentForm = await prisma.consentForm.findUnique({
    where: { id: link.consentFormId ?? undefined },
    include: {
      consultation: {
        include: {
          assignedArtist: { select: { name: true } },
        },
      },
      appointment: true,
    },
  });

  if (!consentForm) {
    return null;
  }

  return {
    consentId: consentForm.id,
    clientLegalName: consentForm.clientLegalName,
    artistName: consentForm.consultation.assignedArtist?.name ?? "Studio team",
    placement: consentForm.consultation.placement,
    style: consentForm.consultation.style,
    appointmentAt: consentForm.appointment?.startsAt.toISOString() ?? null,
    status: consentStatusLabel[consentForm.status],
    healthNotes: consentForm.healthNotes,
    emergencyContact: consentForm.emergencyContact,
    emergencyPhone: consentForm.emergencyPhone,
  };
}

export async function completeConsentFromPortal(
  token: string,
  request?: import("@/lib/audit").AuditRequestContext,
) {
  const link = await getPortalLinkByToken(token, ClientPortalPurpose.CONSENT);

  if (!link || !link.consentFormId) {
    return false;
  }

  const consentForm = await prisma.consentForm.findUnique({
    where: { id: link.consentFormId },
  });

  if (!consentForm) {
    return false;
  }

  await prisma.consentForm.update({
    where: { id: consentForm.id },
    data: {
      status: "SIGNED",
      signedAt: new Date(),
    },
  });

  await createAuditLog({
    domain: AuditDomain.CONSENT,
    action: "Waiver signed from portal",
    details: null,
    actor: {
      name: `${consentForm.clientLegalName} (client portal)`,
    },
    request,
    changes: createAuditDiff(
      {
        status: consentForm.status,
        signedAt: consentForm.signedAt,
      },
      {
        status: "SIGNED",
        signedAt: new Date(),
      },
    ),
    consultationId: consentForm.consultationId,
    consentFormId: consentForm.id,
  });

  return true;
}