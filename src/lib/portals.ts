import { randomBytes } from "node:crypto";

import {
  ClientPortalPurpose,
  DeliveryChannel,
  PortalDeliveryStatus,
} from "@prisma/client";

import { prisma } from "@/lib/db";

function createToken() {
  return randomBytes(24).toString("hex");
}

export function getPortalPath(purpose: ClientPortalPurpose, token: string) {
  return purpose === ClientPortalPurpose.CONSENT
    ? `/portal/consent/${token}`
    : `/portal/design-approval/${token}`;
}

export async function ensurePortalLink(input: {
  purpose: ClientPortalPurpose;
  consultationId: string;
  consentFormId?: string | null;
  expiresInDays?: number;
}) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (input.expiresInDays ?? 14));

  const existing = await prisma.clientPortalLink.findUnique({
    where: {
      consultationId_purpose: {
        consultationId: input.consultationId,
        purpose: input.purpose,
      },
    },
  });

  if (existing) {
    if (existing.expiresAt > new Date()) {
      return existing;
    }

    return prisma.clientPortalLink.update({
      where: { id: existing.id },
      data: {
        token: createToken(),
        expiresAt,
        consentFormId: input.consentFormId ?? existing.consentFormId,
      },
    });
  }

  return prisma.clientPortalLink.create({
    data: {
      token: createToken(),
      purpose: input.purpose,
      consultationId: input.consultationId,
      consentFormId: input.consentFormId ?? null,
      expiresAt,
    },
  });
}

export async function stampPortalSent(linkId: string) {
  await prisma.clientPortalLink.update({
    where: { id: linkId },
    data: { lastSentAt: new Date() },
  });
}

export async function recordPortalDelivery(input: {
  linkId: string;
  channel: DeliveryChannel;
  target: string;
}) {
  const attemptNumber = (await prisma.portalDeliveryAttempt.count({
    where: { portalLinkId: input.linkId },
  })) + 1;

  await prisma.$transaction([
    prisma.portalDeliveryAttempt.create({
      data: {
        portalLinkId: input.linkId,
        attemptNumber,
        status: PortalDeliveryStatus.SENT,
        channel: input.channel,
        target: input.target,
      },
    }),
    prisma.clientPortalLink.update({
      where: { id: input.linkId },
      data: {
        lastSentAt: new Date(),
        deliveryChannel: input.channel,
        deliveryStatus: PortalDeliveryStatus.SENT,
        deliveryTarget: input.target,
        lastDeliveryError: null,
      },
    }),
  ]);
}

export async function recordPortalDeliveryFailure(input: {
  linkId: string;
  status: PortalDeliveryStatus;
  error: string;
}) {
  const attemptNumber = (await prisma.portalDeliveryAttempt.count({
    where: { portalLinkId: input.linkId },
  })) + 1;

  await prisma.$transaction([
    prisma.portalDeliveryAttempt.create({
      data: {
        portalLinkId: input.linkId,
        attemptNumber,
        status: input.status,
        errorMessage: input.error,
      },
    }),
    prisma.clientPortalLink.update({
      where: { id: input.linkId },
      data: {
        deliveryStatus: input.status,
        lastDeliveryError: input.error,
      },
    }),
  ]);
}

export async function getPortalLinkByToken(token: string, purpose: ClientPortalPurpose) {
  return prisma.clientPortalLink.findFirst({
    where: {
      token,
      purpose,
      expiresAt: { gt: new Date() },
    },
  });
}