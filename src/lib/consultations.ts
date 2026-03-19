import {
  AuditDomain,
  AppointmentStatus as PrismaAppointmentStatus,
  ClientPortalPurpose,
  ConsultationStage as PrismaConsultationStage,
  DeliveryChannel as PrismaDeliveryChannel,
  PortalDeliveryStatus,
  DepositEventType as PrismaDepositEventType,
  DepositStatus as PrismaDepositStatus,
  DesignApprovalStatus as PrismaDesignApprovalStatus,
  SocialPlatform as PrismaSocialPlatform,
  UserRole,
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
  AuditEntryRecord,
  AppointmentRecord,
  ArtistOption,
  BudgetRange,
  ConsultationFormFields,
  ConsultationRecord,
  ConsultationStage,
  DeliveryChannel,
  DeliveryAttemptRecord,
  DepositEventRecord,
  DepositStatus,
  DesignApprovalEventRecord,
  DesignApprovalStatus,
  DesignNoteRecord,
  PreferredArtist,
  SocialPlatform,
} from "@/types/studio";

const consultationStageLabel: Record<PrismaConsultationStage, ConsultationStage> = {
  NEW_INQUIRY: "New inquiry",
  CONSULT_SCHEDULED: "Consult scheduled",
  AWAITING_DEPOSIT: "Awaiting deposit",
  DESIGN_REVIEW: "Design review",
  BOOKED: "Booked",
};

const depositStatusLabel: Record<PrismaDepositStatus, DepositStatus> = {
  NOT_REQUESTED: "Not requested",
  REQUESTED: "Requested",
  PAID: "Paid",
};

const appointmentStatusLabel: Record<
  PrismaAppointmentStatus,
  AppointmentRecord["status"]
> = {
  SCHEDULED: "Scheduled",
  RESCHEDULED: "Rescheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const designApprovalStatusLabel: Record<
  PrismaDesignApprovalStatus,
  DesignApprovalStatus
> = {
  CONCEPT_SENT: "Concept sent",
  REVISION_REQUESTED: "Revision requested",
  APPROVED: "Approved",
  FINALIZED: "Finalized",
};

const designApprovalStatusValue: Record<
  DesignApprovalStatus,
  PrismaDesignApprovalStatus
> = {
  "Concept sent": "CONCEPT_SENT",
  "Revision requested": "REVISION_REQUESTED",
  Approved: "APPROVED",
  Finalized: "FINALIZED",
};

type ConsultationStats = {
  total: number;
  newInquiries: number;
  awaitingDeposit: number;
  assignedArtists: number;
  paidDeposits: number;
  bookedAppointments: number;
};

export type ConsultationWorkflowAction =
  | "schedule-consult";

export type ConsultationPageData = {
  consultations: ConsultationRecord[];
  groupedConsultations: Record<ConsultationStage, ConsultationRecord[]>;
  stats: ConsultationStats;
  artists: ArtistOption[];
};

type Viewer = {
  id: string;
  role: UserRole;
  studioId: string;
};

export type ScheduleAppointmentInput = {
  consultationId: string;
  artistId: string;
  startsAt: string;
  durationMinutes: number;
  notes?: string;
};

export type DesignReviewInput = {
  consultationId: string;
  note: string;
};

export type ApprovalEventInput = {
  consultationId: string;
  status: DesignApprovalStatus;
  note?: string;
};

export type DepositPaymentInput = {
  consultationId: string;
  amount: number;
  note?: string;
  externalReference?: string;
};

export type DepositFailureInput = {
  consultationId: string;
  reason: string;
  externalReference?: string;
};

const depositEventTypeLabel: Record<PrismaDepositEventType, DepositEventRecord["type"]> = {
  REQUEST: "Request",
  PARTIAL_PAYMENT: "Partial payment",
  PAYMENT: "Payment",
  REFUND: "Refund",
  FAILED: "Failed",
};

const auditDomainLabel: Record<AuditDomain, AuditEntryRecord["domain"]> = {
  DEPOSIT: "Deposit",
  CONSENT: "Consent",
  APPROVAL: "Approval",
  SECURITY: "Security",
};

const deliveryChannelLabel: Record<PrismaDeliveryChannel, DeliveryChannel> = {
  EMAIL: "Email",
  SMS: "SMS",
};

const deliveryStatusLabel: Record<PortalDeliveryStatus, import("@/types/studio").DeliveryStatus> = {
  PENDING: "Pending",
  SENT: "Sent",
  FAILED: "Failed",
  UNAVAILABLE: "Unavailable",
};

const socialPlatformLabel: Record<PrismaSocialPlatform, SocialPlatform> = {
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  WEBSITE: "Website",
};

function getLeadSourceFromSocialPlatform(platform: PrismaSocialPlatform): ConsultationRecord["leadSource"] {
  if (platform === PrismaSocialPlatform.INSTAGRAM) {
    return "Instagram";
  }

  if (platform === PrismaSocialPlatform.TIKTOK) {
    return "TikTok";
  }

  return "Website";
}

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

function getBookingLockState(input: {
  depositAmount: number | null;
  depositPaidAmount: number;
  depositFailureReason: string | null;
}) {
  if (input.depositFailureReason) {
    return {
      locked: true,
      reason: `Blocked after failed payment: ${input.depositFailureReason}`,
    };
  }

  if ((input.depositAmount ?? 0) > input.depositPaidAmount) {
    const balanceDue = (input.depositAmount ?? 0) - input.depositPaidAmount;
    return {
      locked: true,
      reason: `Blocked until the remaining $${balanceDue} deposit balance is collected.`,
    };
  }

  return {
    locked: false,
    reason: null,
  };
}

async function syncAppointmentReadiness(consultationId: string, locked: boolean) {
  const appointment = await prisma.appointment.findUnique({
    where: { consultationId },
  });

  if (!appointment) {
    return;
  }

  await prisma.appointment.update({
    where: { consultationId },
    data: {
      status: locked ? "RESCHEDULED" : "SCHEDULED",
    },
  });
}

function suggestDepositAmount(budgetRange: BudgetRange) {
  switch (budgetRange) {
    case "$150-$300":
      return 80;
    case "$300-$600":
      return 120;
    case "$600-$1,000":
      return 200;
    case "$1,000+":
      return 300;
    default:
      return 100;
  }
}

function mapDesignNotes(
  notes: Array<{ id: string; note: string; createdAt: Date; author: { name: string } }>,
): DesignNoteRecord[] {
  return notes.map((note) => ({
    id: note.id,
    note: note.note,
    authorName: note.author.name,
    createdAt: note.createdAt.toISOString(),
  }));
}

function mapApprovalEvents(
  events: Array<{
    id: string;
    status: PrismaDesignApprovalStatus;
    note: string | null;
    createdAt: Date;
  }>,
): DesignApprovalEventRecord[] {
  return events.map((event) => ({
    id: event.id,
    status: designApprovalStatusLabel[event.status],
    note: event.note,
    createdAt: event.createdAt.toISOString(),
  }));
}

function mapDepositEvents(
  events: Array<{
    id: string;
    type: PrismaDepositEventType;
    amount: number | null;
    note: string | null;
    createdAt: Date;
    actor: { name: string } | null;
  }>,
): DepositEventRecord[] {
  return events.map((event) => ({
    id: event.id,
    type: depositEventTypeLabel[event.type],
    amount: event.amount,
    note: event.note,
    actorName: event.actor?.name ?? null,
    createdAt: event.createdAt.toISOString(),
  }));
}

function mapAuditEntries(
  entries: Array<{
    id: string;
    domain: AuditDomain;
    action: string;
    details: string | null;
    actorName: string;
    actorRole: UserRole | null;
    ipAddress: string | null;
    userAgent: string | null;
    changes: Array<{
      id: string;
      fieldPath: string;
      beforeValue: string | null;
      afterValue: string | null;
    }>;
    createdAt: Date;
  }>,
): AuditEntryRecord[] {
  return entries.map((entry) => ({
    id: entry.id,
    domain: auditDomainLabel[entry.domain],
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
  }));
}

function mapAppointment(appointment: {
  id: string;
  consultationId: string;
  startsAt: Date;
  durationMinutes: number;
  status: PrismaAppointmentStatus;
  notes: string | null;
  artist: { id: string; name: string };
  consultation: { clientName: string };
}): AppointmentRecord {
  return {
    id: appointment.id,
    consultationId: appointment.consultationId,
    clientName: appointment.consultation.clientName,
    artistId: appointment.artist.id,
    artistName: appointment.artist.name,
    startsAt: appointment.startsAt.toISOString(),
    durationMinutes: appointment.durationMinutes,
    status: appointmentStatusLabel[appointment.status],
    notes: appointment.notes,
  };
}

function mapConsultation(consultation: {
  id: string;
  clientName: string;
  email: string;
  phone: string;
  placement: string;
  style: string;
  budgetRange: string;
  preferredArtist: string;
  leadSource: string;
  requestedWindow: string;
  ideaSummary: string;
  referenceSummary: string;
  stage: PrismaConsultationStage;
  depositStatus: PrismaDepositStatus;
  depositAmount: number | null;
  depositPaidAmount: number;
  depositFailureReason: string | null;
  bookingLocked: boolean;
  bookingLockedReason: string | null;
  nextStep: string;
  createdAt: Date;
  createdBy: { id: string; name: string } | null;
  assignedArtist: { id: string; name: string } | null;
  socialLead:
    | {
        handle: string | null;
        platform: PrismaSocialPlatform;
        artistProfile: { displayName: string } | null;
        campaignLink: { label: string } | null;
      }
    | null;
  appointment:
    | {
        id: string;
        consultationId: string;
        startsAt: Date;
        durationMinutes: number;
        status: PrismaAppointmentStatus;
        notes: string | null;
        artist: { id: string; name: string };
        consultation: { clientName: string };
      }
    | null;
  designNotes: Array<{ id: string; note: string; createdAt: Date; author: { name: string } }>;
  depositEvents: Array<{
    id: string;
    type: PrismaDepositEventType;
    amount: number | null;
    note: string | null;
    createdAt: Date;
    actor: { name: string } | null;
  }>;
  auditLogs: Array<{
    id: string;
    domain: AuditDomain;
    action: string;
    details: string | null;
    actorName: string;
    actorRole: UserRole | null;
    ipAddress: string | null;
    userAgent: string | null;
    changes: Array<{
      id: string;
      fieldPath: string;
      beforeValue: string | null;
      afterValue: string | null;
    }>;
    createdAt: Date;
  }>;
  portalLinks: Array<{
    purpose: ClientPortalPurpose;
    token: string;
    deliveryChannel: PrismaDeliveryChannel | null;
    deliveryStatus: PortalDeliveryStatus;
    deliveryTarget: string | null;
    lastDeliveryError: string | null;
    deliveryAttempts: Array<{
      id: string;
      attemptNumber: number;
      status: PortalDeliveryStatus;
      channel: PrismaDeliveryChannel | null;
      target: string | null;
      errorMessage: string | null;
      attemptedAt: Date;
    }>;
  }>;
  approvalEvents: Array<{
    id: string;
    status: PrismaDesignApprovalStatus;
    note: string | null;
    createdAt: Date;
  }>;
}): ConsultationRecord {
  return {
    id: consultation.id,
    clientName: consultation.clientName,
    email: consultation.email,
    phone: consultation.phone,
    placement: consultation.placement,
    style: consultation.style,
    budgetRange: consultation.budgetRange as ConsultationRecord["budgetRange"],
    preferredArtist: consultation.preferredArtist as PreferredArtist,
    leadSource: consultation.leadSource as ConsultationRecord["leadSource"],
    requestedWindow: consultation.requestedWindow,
    ideaSummary: consultation.ideaSummary,
    referenceSummary: consultation.referenceSummary,
    stage: consultationStageLabel[consultation.stage],
    depositStatus: depositStatusLabel[consultation.depositStatus],
    depositAmount: consultation.depositAmount,
    depositPaidAmount: consultation.depositPaidAmount,
    depositFailureReason: consultation.depositFailureReason,
    bookingLocked: consultation.bookingLocked,
    bookingLockedReason: consultation.bookingLockedReason,
    assignedArtistId: consultation.assignedArtist?.id ?? null,
    createdById: consultation.createdBy?.id ?? null,
    artistAssignment: consultation.assignedArtist?.name ?? "Front desk triage",
    nextStep: consultation.nextStep,
    submittedAt: consultation.createdAt.toISOString(),
    createdByName: consultation.createdBy?.name ?? null,
    socialPlatform: consultation.socialLead ? socialPlatformLabel[consultation.socialLead.platform] : null,
    socialHandle: consultation.socialLead?.handle ?? null,
    sourceCampaignLabel: consultation.socialLead?.campaignLink?.label ?? null,
    sourceArtistProfile: consultation.socialLead?.artistProfile?.displayName ?? null,
    appointment: consultation.appointment ? mapAppointment(consultation.appointment) : null,
    designNotes: mapDesignNotes(consultation.designNotes),
    depositEvents: mapDepositEvents(consultation.depositEvents),
    auditEntries: mapAuditEntries(consultation.auditLogs),
    approvalPortalPath:
      consultation.portalLinks.find((link) => link.purpose === ClientPortalPurpose.APPROVAL)
        ? getPortalPath(
            ClientPortalPurpose.APPROVAL,
            consultation.portalLinks.find((link) => link.purpose === ClientPortalPurpose.APPROVAL)!.token,
          )
        : null,
    approvalDeliveryLabel:
      consultation.portalLinks.find((link) => link.purpose === ClientPortalPurpose.APPROVAL)?.deliveryChannel
        ? `${deliveryChannelLabel[
            consultation.portalLinks.find((link) => link.purpose === ClientPortalPurpose.APPROVAL)!.deliveryChannel!
          ]} sent to ${consultation.portalLinks.find((link) => link.purpose === ClientPortalPurpose.APPROVAL)!.deliveryTarget}`
        : null,
    approvalDeliveryStatus:
      consultation.portalLinks.find((link) => link.purpose === ClientPortalPurpose.APPROVAL)?.deliveryStatus
        ? deliveryStatusLabel[
            consultation.portalLinks.find((link) => link.purpose === ClientPortalPurpose.APPROVAL)!.deliveryStatus
          ]
        : null,
    approvalDeliveryError:
      consultation.portalLinks.find((link) => link.purpose === ClientPortalPurpose.APPROVAL)?.lastDeliveryError ?? null,
    approvalDeliveryAttempts: mapDeliveryAttempts(
      consultation.portalLinks.find((link) => link.purpose === ClientPortalPurpose.APPROVAL)?.deliveryAttempts ?? [],
    ),
    approvalEvents: mapApprovalEvents(consultation.approvalEvents),
  };
}

async function findPreferredArtist(preferredArtist: PreferredArtist, studioId: string) {
  if (preferredArtist === "First available") {
    return null;
  }

  return prisma.user.findFirst({
    where: {
      studioId,
      role: UserRole.ARTIST,
      name: { startsWith: preferredArtist },
    },
  });
}

function determineNextStep(preferredArtist: ConsultationFormFields["preferredArtist"]) {
  if (preferredArtist === "First available") {
    return "Route to an available artist and confirm consult fit.";
  }

  return `Review intake with ${preferredArtist} and offer consult windows.`;
}

function normalizePreferredArtist(name: string | null | undefined): PreferredArtist {
  if (!name) {
    return "First available";
  }

  if (name.startsWith("Kai")) {
    return "Kai";
  }

  if (name.startsWith("Mara")) {
    return "Mara";
  }

  if (name.startsWith("Sol")) {
    return "Sol";
  }

  return "First available";
}

export async function getArtistOptions(studioId?: string): Promise<ArtistOption[]> {
  const artists = await prisma.user.findMany({
    where: { role: UserRole.ARTIST, studioId },
    orderBy: { name: "asc" },
  });

  return artists.map((artist) => ({
    id: artist.id,
    name: artist.name,
    email: artist.email,
  }));
}

export async function createConsultation(
  values: ConsultationFormFields,
  createdById: string,
): Promise<ConsultationRecord> {
  const createdBy = await prisma.user.findUnique({
    where: { id: createdById },
    select: { studioId: true },
  });

  if (!createdBy) {
    throw new Error("Unable to resolve the staff member creating the consultation.");
  }

  const assignedArtist = await findPreferredArtist(values.preferredArtist, createdBy.studioId);
  const consultation = await prisma.consultation.create({
    data: {
      studioId: createdBy.studioId,
      clientName: values.clientName,
      email: values.email,
      phone: values.phone,
      placement: values.placement,
      style: values.style,
      budgetRange: values.budgetRange,
      preferredArtist: values.preferredArtist,
      leadSource: values.leadSource,
      requestedWindow: values.requestedWindow,
      ideaSummary: values.ideaSummary,
      referenceSummary: values.referenceSummary,
      stage: "NEW_INQUIRY",
      depositStatus: "NOT_REQUESTED",
      depositPaidAmount: 0,
      bookingLocked: true,
      bookingLockedReason: "Schedule the consult before the studio can request a deposit.",
      nextStep: determineNextStep(values.preferredArtist),
      createdById,
      assignedArtistId: assignedArtist?.id,
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      assignedArtist: { select: { id: true, name: true } },
      socialLead: {
        select: {
          handle: true,
          platform: true,
          artistProfile: { select: { displayName: true } },
          campaignLink: { select: { label: true } },
        },
      },
      appointment: {
        include: {
          artist: { select: { id: true, name: true } },
          consultation: { select: { clientName: true } },
        },
      },
      designNotes: {
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      depositEvents: {
        include: { actor: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      portalLinks: {
        select: {
          purpose: true,
          token: true,
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
      auditLogs: { include: { changes: true }, orderBy: { createdAt: "desc" } },
      approvalEvents: { orderBy: { createdAt: "desc" } },
    },
  });

  return mapConsultation(consultation);
}

export async function createConsultationFromSocialLead(
  socialLeadId: string,
  createdById: string,
): Promise<ConsultationRecord | null> {
  const [createdBy, socialLead] = await Promise.all([
    prisma.user.findUnique({
      where: { id: createdById },
      select: { studioId: true },
    }),
    prisma.socialLead.findUnique({
      where: { id: socialLeadId },
      select: {
        id: true,
        studioId: true,
        artistProfile: {
          select: {
            displayName: true,
            user: { select: { id: true, name: true } },
          },
        },
        campaignLink: { select: { label: true } },
        consultation: { select: { id: true } },
        handle: true,
        platform: true,
        preferredArtistName: true,
        placement: true,
        style: true,
        budgetRange: true,
        requestedWindow: true,
        referenceSummary: true,
        attributionSummary: true,
        messageBody: true,
        clientName: true,
        email: true,
        phone: true,
      },
    }),
  ]);

  if (!createdBy || !socialLead || socialLead.studioId !== createdBy.studioId) {
    return null;
  }

  if (socialLead.consultation) {
    return null;
  }

  if (!socialLead.email || !socialLead.phone) {
    return null;
  }

  const preferredArtist = normalizePreferredArtist(
    socialLead.preferredArtistName ?? socialLead.artistProfile?.displayName,
  );
  const consultation = await prisma.consultation.create({
    data: {
      studioId: createdBy.studioId,
      socialLeadId: socialLead.id,
      clientName: socialLead.clientName ?? socialLead.handle ?? "Social lead",
      email: socialLead.email,
      phone: socialLead.phone,
      placement: socialLead.placement ?? "Placement to confirm during consult.",
      style: socialLead.style ?? "Style direction from social lead.",
      budgetRange: (socialLead.budgetRange as BudgetRange | null) ?? "$300-$600",
      preferredArtist,
      leadSource: getLeadSourceFromSocialPlatform(socialLead.platform),
      requestedWindow: socialLead.requestedWindow ?? "Follow up from social inbox and confirm timing.",
      ideaSummary: socialLead.messageBody ?? "Imported from social lead inbox.",
      referenceSummary:
        socialLead.referenceSummary ??
        socialLead.attributionSummary ??
        socialLead.campaignLink?.label ??
        "Captured from artist social channel.",
      stage: "NEW_INQUIRY",
      depositStatus: "NOT_REQUESTED",
      depositPaidAmount: 0,
      bookingLocked: true,
      bookingLockedReason: "Schedule the consult before the studio can request a deposit.",
      nextStep: determineNextStep(preferredArtist),
      createdById,
      assignedArtistId: socialLead.artistProfile?.user?.id,
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      assignedArtist: { select: { id: true, name: true } },
      socialLead: {
        select: {
          handle: true,
          platform: true,
          artistProfile: { select: { displayName: true } },
          campaignLink: { select: { label: true } },
        },
      },
      appointment: {
        include: {
          artist: { select: { id: true, name: true } },
          consultation: { select: { clientName: true } },
        },
      },
      designNotes: {
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      depositEvents: {
        include: { actor: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      portalLinks: {
        select: {
          purpose: true,
          token: true,
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
      auditLogs: { include: { changes: true }, orderBy: { createdAt: "desc" } },
      approvalEvents: { orderBy: { createdAt: "desc" } },
    },
  });

  await prisma.socialLead.update({
    where: { id: socialLead.id },
    data: {
      status: "CONVERTED",
      events: {
        create: {
          type: "consultation-created",
          details: `Converted into consultation ${consultation.id}`,
        },
      },
    },
  });

  return mapConsultation(consultation);
}

export async function updateConsultationWorkflow(
  consultationId: string,
): Promise<ConsultationRecord | null> {
  const existing = await prisma.consultation.findUnique({ where: { id: consultationId } });

  if (!existing) {
    return null;
  }

  const updateData = {
    stage: "CONSULT_SCHEDULED" as const,
    bookingLocked: true,
    bookingLockedReason: "Deposit must be requested and collected before booking can proceed.",
    nextStep:
      "Send consult time options and confirm preferred references before the call.",
  };

  const consultation = await prisma.consultation.update({
    where: { id: consultationId },
    data: updateData,
    include: {
      createdBy: { select: { id: true, name: true } },
      assignedArtist: { select: { id: true, name: true } },
      socialLead: {
        select: {
          handle: true,
          platform: true,
          artistProfile: { select: { displayName: true } },
          campaignLink: { select: { label: true } },
        },
      },
      appointment: {
        include: {
          artist: { select: { id: true, name: true } },
          consultation: { select: { clientName: true } },
        },
      },
      designNotes: {
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      depositEvents: {
        include: { actor: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      portalLinks: {
        select: {
          purpose: true,
          token: true,
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
      auditLogs: { include: { changes: true }, orderBy: { createdAt: "desc" } },
      approvalEvents: { orderBy: { createdAt: "desc" } },
    },
  });

  return mapConsultation(consultation);
}

export async function addDesignNote(
  input: DesignReviewInput,
  authorId: string,
): Promise<void> {
  await prisma.designNote.create({
    data: {
      consultationId: input.consultationId,
      authorId,
      note: input.note,
    },
  });
}

export async function addApprovalEvent(
  input: ApprovalEventInput,
  actor: AuditActor,
  request?: import("@/lib/audit").AuditRequestContext,
): Promise<void> {
  const beforeConsultation = await prisma.consultation.findUnique({
    where: { id: input.consultationId },
    select: { nextStep: true },
  });

  await prisma.designApprovalEvent.create({
    data: {
      consultationId: input.consultationId,
      status: designApprovalStatusValue[input.status],
      note: input.note?.trim() ? input.note.trim() : null,
    },
  });

  const nextStep =
    input.status === "Approved"
      ? "Ready to schedule the tattoo session and lock the stencil packet."
      : input.status === "Finalized"
        ? "Final artwork locked. Schedule the tattoo session."
        : input.status === "Revision requested"
          ? "Update the concept based on client feedback and resend for review."
          : "Concept sent. Awaiting client review.";

  await prisma.consultation.update({
    where: { id: input.consultationId },
    data: { nextStep },
  });

  await createAuditLog({
    domain: AuditDomain.APPROVAL,
    action: input.status,
    details: input.note?.trim() ? input.note.trim() : null,
    actor,
    request,
    changes: createAuditDiff(beforeConsultation ?? {}, { nextStep }),
    consultationId: input.consultationId,
  });
}

export async function requestDeposit(
  consultationId: string,
  actor: AuditActor,
  request?: import("@/lib/audit").AuditRequestContext,
): Promise<void> {
  const consultation = await prisma.consultation.findUnique({ where: { id: consultationId } });

  if (!consultation) {
    return;
  }

  const depositAmount = consultation.depositAmount ?? suggestDepositAmount(consultation.budgetRange as BudgetRange);
  const lockState = getBookingLockState({
    depositAmount,
    depositPaidAmount: consultation.depositPaidAmount,
    depositFailureReason: null,
  });

  await prisma.$transaction([
    prisma.consultation.update({
      where: { id: consultationId },
      data: {
        stage: "AWAITING_DEPOSIT",
        depositStatus: "REQUESTED",
        depositAmount,
        depositFailureReason: null,
        bookingLocked: lockState.locked,
        bookingLockedReason: lockState.reason,
        nextStep: `Collect the $${depositAmount} deposit before opening session booking.`,
      },
    }),
    prisma.depositEvent.create({
      data: {
        consultationId,
        actorId: actor.id ?? null,
        type: "REQUEST",
        amount: depositAmount,
        note: `Deposit request opened for $${depositAmount}.`,
      },
    }),
  ]);

  await createAuditLog({
    domain: AuditDomain.DEPOSIT,
    action: "Deposit requested",
    details: `Requested $${depositAmount} deposit`,
    actor,
    request,
    changes: createAuditDiff({
      depositStatus: consultation.depositStatus,
      depositAmount: consultation.depositAmount,
      depositPaidAmount: consultation.depositPaidAmount,
      bookingLocked: consultation.bookingLocked,
      bookingLockedReason: consultation.bookingLockedReason,
    }, {
      depositStatus: "REQUESTED",
      depositAmount,
      depositPaidAmount: consultation.depositPaidAmount,
      bookingLocked: lockState.locked,
      bookingLockedReason: lockState.reason,
    }),
    consultationId,
  });
}

export async function captureDepositPayment(
  input: DepositPaymentInput,
  actor: AuditActor,
  request?: import("@/lib/audit").AuditRequestContext,
): Promise<void> {
  const consultation = await prisma.consultation.findUnique({ where: { id: input.consultationId } });

  if (!consultation) {
    return;
  }

  const targetAmount = consultation.depositAmount ?? suggestDepositAmount(consultation.budgetRange as BudgetRange);
  const updatedPaidAmount = consultation.depositPaidAmount + input.amount;
  const fullyPaid = updatedPaidAmount >= targetAmount;
  const lockState = getBookingLockState({
    depositAmount: targetAmount,
    depositPaidAmount: updatedPaidAmount,
    depositFailureReason: null,
  });
  const eventType = fullyPaid ? "PAYMENT" : "PARTIAL_PAYMENT";
  const nextStep = fullyPaid
    ? "Deposit complete. Share the approval link or prepare the first concept set."
    : `Partial payment captured. $${targetAmount - updatedPaidAmount} still due before design review.`;

  await prisma.$transaction([
    prisma.consultation.update({
      where: { id: input.consultationId },
      data: {
        stage: fullyPaid ? "DESIGN_REVIEW" : "AWAITING_DEPOSIT",
        depositStatus: fullyPaid ? "PAID" : "REQUESTED",
        depositAmount: targetAmount,
        depositPaidAmount: updatedPaidAmount,
        depositFailureReason: null,
        bookingLocked: lockState.locked,
        bookingLockedReason: lockState.reason,
        nextStep,
      },
    }),
    prisma.depositEvent.create({
      data: {
        consultationId: input.consultationId,
        actorId: actor.id ?? null,
        type: eventType,
        amount: input.amount,
        externalReference: input.externalReference ?? null,
        note: input.note?.trim() ? input.note.trim() : null,
      },
    }),
  ]);

  if (fullyPaid) {
    await ensurePortalLink({
      purpose: ClientPortalPurpose.APPROVAL,
      consultationId: input.consultationId,
    });
  }

  await syncAppointmentReadiness(input.consultationId, lockState.locked);

  await createAuditLog({
    domain: AuditDomain.DEPOSIT,
    action: fullyPaid ? "Deposit paid" : "Partial payment recorded",
    details: input.note?.trim() ? `${input.note.trim()} ($${input.amount})` : `$${input.amount}`,
    actor,
    request,
    changes: createAuditDiff({
      depositStatus: consultation.depositStatus,
      depositPaidAmount: consultation.depositPaidAmount,
      depositFailureReason: consultation.depositFailureReason,
      bookingLocked: consultation.bookingLocked,
      bookingLockedReason: consultation.bookingLockedReason,
    }, {
      depositStatus: fullyPaid ? "PAID" : "REQUESTED",
      depositPaidAmount: updatedPaidAmount,
      depositFailureReason: null,
      bookingLocked: lockState.locked,
      bookingLockedReason: lockState.reason,
    }),
    consultationId: input.consultationId,
  });
}

export async function captureOutstandingDeposit(
  consultationId: string,
  actor: AuditActor,
  request?: import("@/lib/audit").AuditRequestContext,
): Promise<void> {
  const consultation = await prisma.consultation.findUnique({ where: { id: consultationId } });

  if (!consultation) {
    return;
  }

  const targetAmount = consultation.depositAmount ?? suggestDepositAmount(consultation.budgetRange as BudgetRange);
  const remaining = Math.max(targetAmount - consultation.depositPaidAmount, 0);

  if (remaining === 0) {
    return;
  }

  await captureDepositPayment(
    {
      consultationId,
      amount: remaining,
      note: "Remaining balance cleared.",
    },
    actor,
    request,
  );
}

export async function refundDeposit(
  input: DepositPaymentInput,
  actor: AuditActor,
  request?: import("@/lib/audit").AuditRequestContext,
): Promise<void> {
  const consultation = await prisma.consultation.findUnique({ where: { id: input.consultationId } });

  if (!consultation) {
    return;
  }

  const targetAmount = consultation.depositAmount ?? suggestDepositAmount(consultation.budgetRange as BudgetRange);
  const updatedPaidAmount = Math.max(consultation.depositPaidAmount - input.amount, 0);
  const lockState = getBookingLockState({
    depositAmount: targetAmount,
    depositPaidAmount: updatedPaidAmount,
    depositFailureReason: consultation.depositFailureReason,
  });
  const stillCovered = !lockState.locked;

  await prisma.$transaction([
    prisma.consultation.update({
      where: { id: input.consultationId },
      data: {
        stage: consultation.stage === "BOOKED" ? "BOOKED" : stillCovered ? "DESIGN_REVIEW" : "AWAITING_DEPOSIT",
        depositStatus: stillCovered ? "PAID" : "REQUESTED",
        depositPaidAmount: updatedPaidAmount,
        bookingLocked: lockState.locked,
        bookingLockedReason: lockState.reason,
        nextStep: stillCovered
          ? "Refund logged while keeping the paid deposit threshold intact."
          : `Refund logged. $${Math.max(targetAmount - updatedPaidAmount, 0)} now due to restore the deposit.`,
      },
    }),
    prisma.depositEvent.create({
      data: {
        consultationId: input.consultationId,
        actorId: actor.id ?? null,
        type: "REFUND",
        amount: input.amount,
        externalReference: input.externalReference ?? null,
        note: input.note?.trim() ? input.note.trim() : null,
      },
    }),
  ]);

  await syncAppointmentReadiness(input.consultationId, lockState.locked);

  await createAuditLog({
    domain: AuditDomain.DEPOSIT,
    action: "Refund recorded",
    details: input.note?.trim() ? `${input.note.trim()} ($${input.amount})` : `$${input.amount}`,
    actor,
    request,
    changes: createAuditDiff({
      depositStatus: consultation.depositStatus,
      depositPaidAmount: consultation.depositPaidAmount,
      bookingLocked: consultation.bookingLocked,
      bookingLockedReason: consultation.bookingLockedReason,
    }, {
      depositStatus: stillCovered ? "PAID" : "REQUESTED",
      depositPaidAmount: updatedPaidAmount,
      bookingLocked: lockState.locked,
      bookingLockedReason: lockState.reason,
    }),
    consultationId: input.consultationId,
  });
}

export async function recordFailedDeposit(
  input: DepositFailureInput,
  actor: AuditActor,
  request?: import("@/lib/audit").AuditRequestContext,
): Promise<void> {
  const consultation = await prisma.consultation.findUnique({
    where: { id: input.consultationId },
  });

  if (!consultation) {
    return;
  }

  const lockState = getBookingLockState({
    depositAmount: consultation.depositAmount,
    depositPaidAmount: consultation.depositPaidAmount,
    depositFailureReason: input.reason,
  });

  await prisma.$transaction([
    prisma.consultation.update({
      where: { id: input.consultationId },
      data: {
        stage: "AWAITING_DEPOSIT",
        depositStatus: "REQUESTED",
        depositFailureReason: input.reason,
        bookingLocked: lockState.locked,
        bookingLockedReason: lockState.reason,
        nextStep: `Retry deposit collection. Latest failure: ${input.reason}`,
      },
    }),
    prisma.depositEvent.create({
      data: {
        consultationId: input.consultationId,
        actorId: actor.id ?? null,
        type: "FAILED",
        externalReference: input.externalReference ?? null,
        note: input.reason,
      },
    }),
  ]);

  await syncAppointmentReadiness(input.consultationId, lockState.locked);

  await createAuditLog({
    domain: AuditDomain.DEPOSIT,
    action: "Payment failed",
    details: input.reason,
    actor,
    request,
    changes: createAuditDiff({
      depositStatus: consultation.depositStatus,
      depositFailureReason: consultation.depositFailureReason,
      bookingLocked: consultation.bookingLocked,
      bookingLockedReason: consultation.bookingLockedReason,
    }, {
      depositStatus: "REQUESTED",
      depositFailureReason: input.reason,
      bookingLocked: lockState.locked,
      bookingLockedReason: lockState.reason,
    }),
    consultationId: input.consultationId,
  });
}

export async function scheduleAppointment(
  input: ScheduleAppointmentInput,
  actor?: AuditActor,
  request?: import("@/lib/audit").AuditRequestContext,
): Promise<void> {
  const consultation = await prisma.consultation.findUnique({
    where: { id: input.consultationId },
  });

  if (
    !consultation ||
    consultation.depositStatus !== "PAID" ||
    consultation.bookingLocked ||
    consultation.depositFailureReason ||
    consultation.depositPaidAmount < (consultation.depositAmount ?? 0)
  ) {
    return;
  }

  await prisma.$transaction([
    prisma.appointment.upsert({
      where: { consultationId: input.consultationId },
      create: {
        consultationId: input.consultationId,
        artistId: input.artistId,
        startsAt: new Date(input.startsAt),
        durationMinutes: input.durationMinutes,
        notes: input.notes?.trim() ? input.notes.trim() : null,
      },
      update: {
        artistId: input.artistId,
        startsAt: new Date(input.startsAt),
        durationMinutes: input.durationMinutes,
        notes: input.notes?.trim() ? input.notes.trim() : null,
        status: "SCHEDULED",
      },
    }),
    prisma.consultation.update({
      where: { id: input.consultationId },
      data: {
        stage: "BOOKED",
        assignedArtistId: input.artistId,
        nextStep:
          "Appointment scheduled. Prepare consent, stencil packet, and pre-session reminders.",
      },
    }),
  ]);

  const appointment = await prisma.appointment.findUnique({
    where: { consultationId: input.consultationId },
  });

  const consentForm = await prisma.consentForm.upsert({
    where: { consultationId: input.consultationId },
    create: {
      consultationId: input.consultationId,
      appointmentId: appointment?.id,
      status: "PENDING",
      clientLegalName: consultation.clientName,
      healthNotes: "Review studio waiver and confirm any updated health information.",
    },
    update: {
      appointmentId: appointment?.id,
    },
  });

  await ensurePortalLink({
    purpose: ClientPortalPurpose.CONSENT,
    consultationId: input.consultationId,
    consentFormId: consentForm.id,
  });

  if (actor) {
    await createAuditLog({
      domain: AuditDomain.CONSENT,
      action: "Appointment scheduled",
      details: `Session booked for ${new Date(input.startsAt).toISOString()} (${input.durationMinutes} min)`,
      actor,
      request,
      changes: createAuditDiff(
        { stage: consultation.stage, bookingLocked: consultation.bookingLocked },
        { stage: "BOOKED", bookingLocked: false },
      ),
      consultationId: input.consultationId,
      consentFormId: consentForm.id,
    });
  }
}

export async function sendApprovalPortalLink(
  consultationId: string,
  actor: AuditActor,
  request?: import("@/lib/audit").AuditRequestContext,
) {
  const consultation = await prisma.consultation.findUnique({
    where: { id: consultationId },
    select: {
      id: true,
      clientName: true,
      email: true,
      phone: true,
      depositStatus: true,
      depositPaidAmount: true,
      depositAmount: true,
      bookingLocked: true,
      bookingLockedReason: true,
    },
  });

  if (
    !consultation ||
    consultation.depositStatus !== "PAID" ||
    consultation.bookingLocked ||
    consultation.depositPaidAmount < (consultation.depositAmount ?? 0)
  ) {
    return null;
  }

  const link = await ensurePortalLink({
    purpose: ClientPortalPurpose.APPROVAL,
    consultationId,
  });
  const delivery = await deliverPortalLink({
    purpose: ClientPortalPurpose.APPROVAL,
    token: link.token,
    clientName: consultation.clientName,
    email: consultation.email,
    phone: consultation.phone,
  });

  if (delivery.status !== "sent") {
    await recordPortalDeliveryFailure({
      linkId: link.id,
      status:
        delivery.status === "failed"
          ? PortalDeliveryStatus.FAILED
          : PortalDeliveryStatus.UNAVAILABLE,
      error: delivery.reason,
    });

    await createAuditLog({
      domain: AuditDomain.APPROVAL,
      action: "Approval link delivery failed",
      details: delivery.reason,
      actor,
      request,
      changes: createAuditDiff(
        {
          deliveryStatus: link.deliveryStatus,
          lastDeliveryError: link.lastDeliveryError,
        },
        {
          deliveryStatus:
            delivery.status === "failed"
              ? PortalDeliveryStatus.FAILED
              : PortalDeliveryStatus.UNAVAILABLE,
          lastDeliveryError: delivery.reason,
        },
      ),
      consultationId,
    });

    return delivery;
  }

  await recordPortalDelivery({
    linkId: link.id,
    channel: delivery.channel,
    target: delivery.target,
  });

  await createAuditLog({
    domain: AuditDomain.APPROVAL,
    action: "Approval link delivered",
    details: `${delivery.channel.toLowerCase()} to ${delivery.target}`,
    actor,
    request,
    changes: createAuditDiff(
      {
        deliveryChannel: link.deliveryChannel,
        deliveryStatus: link.deliveryStatus,
        deliveryTarget: link.deliveryTarget,
        lastDeliveryError: link.lastDeliveryError,
      },
      {
        deliveryChannel: delivery.channel,
        deliveryStatus: PortalDeliveryStatus.SENT,
        deliveryTarget: delivery.target,
        lastDeliveryError: null,
      },
    ),
    consultationId,
  });

  return delivery;
}

export async function getConsultationPageData(
  viewer?: Viewer,
): Promise<ConsultationPageData> {
  const [consultationsRaw, artists] = await Promise.all([
    prisma.consultation.findMany({
      where: viewer
        ? viewer.role === UserRole.ARTIST
          ? { studioId: viewer.studioId, assignedArtistId: viewer.id }
          : { studioId: viewer.studioId }
        : undefined,
      include: {
        createdBy: { select: { id: true, name: true } },
        assignedArtist: { select: { id: true, name: true } },
        socialLead: {
          select: {
            handle: true,
            platform: true,
            artistProfile: { select: { displayName: true } },
            campaignLink: { select: { label: true } },
          },
        },
        appointment: {
          include: {
            artist: { select: { id: true, name: true } },
            consultation: { select: { clientName: true } },
          },
        },
        designNotes: {
          include: { author: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        },
        depositEvents: {
          include: { actor: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        },
        portalLinks: {
          select: {
            purpose: true,
            token: true,
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
        auditLogs: { include: { changes: true }, orderBy: { createdAt: "desc" } },
        approvalEvents: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    getArtistOptions(viewer?.studioId),
  ]);

  const consultations = consultationsRaw.map(mapConsultation);
  const groupedConsultations: Record<ConsultationStage, ConsultationRecord[]> = {
    "New inquiry": [],
    "Consult scheduled": [],
    "Awaiting deposit": [],
    "Design review": [],
    Booked: [],
  };

  for (const consultation of consultations) {
    groupedConsultations[consultation.stage].push(consultation);
  }

  const stats: ConsultationStats = {
    total: consultations.length,
    newInquiries: groupedConsultations["New inquiry"].length,
    awaitingDeposit: groupedConsultations["Awaiting deposit"].length,
    assignedArtists: new Set(
      consultations
        .map((consultation) => consultation.artistAssignment)
        .filter((artist) => artist !== "Front desk triage"),
    ).size,
    paidDeposits: consultations.filter((consultation) => consultation.depositStatus === "Paid").length,
    bookedAppointments: consultations.filter((consultation) => consultation.appointment).length,
  };

  return {
    consultations,
    groupedConsultations,
    stats,
    artists,
  };
}

export function getConsultationDepositLabel(record: ConsultationRecord) {
  if (record.depositStatus === "Requested" && record.depositAmount) {
    return `$${record.depositPaidAmount}/$${record.depositAmount} collected`;
  }

  if (record.depositStatus === "Paid" && record.depositAmount) {
    return `$${record.depositPaidAmount || record.depositAmount} deposit paid`;
  }

  return "Deposit not requested";
}

export async function getApprovalPortalData(token: string) {
  const link = await getPortalLinkByToken(token, ClientPortalPurpose.APPROVAL);

  if (!link) {
    return null;
  }

  const consultation = await prisma.consultation.findUnique({
    where: { id: link.consultationId },
    include: {
      assignedArtist: { select: { name: true } },
      approvalEvents: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!consultation) {
    return null;
  }

  return {
    clientName: consultation.clientName,
    artistName: consultation.assignedArtist?.name ?? "Studio team",
    style: consultation.style,
    placement: consultation.placement,
    ideaSummary: consultation.ideaSummary,
    approvalEvents: mapApprovalEvents(consultation.approvalEvents),
    consultationId: consultation.id,
  };
}

export async function submitPortalApprovalDecision(input: {
  token: string;
  status: DesignApprovalStatus;
  note?: string;
  request?: import("@/lib/audit").AuditRequestContext;
}) {
  const link = await getPortalLinkByToken(input.token, ClientPortalPurpose.APPROVAL);

  if (!link) {
    return false;
  }

  const consultation = await prisma.consultation.findUnique({
    where: { id: link.consultationId },
  });

  if (!consultation) {
    return false;
  }

  await addApprovalEvent(
    {
      consultationId: consultation.id,
      status: input.status,
      note: input.note,
    },
    {
      name: `${consultation.clientName} (client portal)`,
    },
    input.request,
  );

  return true;
}