import { prisma } from "@/lib/db";
import type {
  AppointmentStatus,
  ClientDetailPageData,
  ClientRecord,
  ConsultationStage,
  DepositStatus,
  LeadSource,
  PreferredArtist,
  SocialPlatform,
} from "@/types/studio";

const consultationStageLabel: Record<string, ConsultationStage> = {
  NEW_INQUIRY: "New inquiry",
  CONSULT_SCHEDULED: "Consult scheduled",
  AWAITING_DEPOSIT: "Awaiting deposit",
  DESIGN_REVIEW: "Design review",
  BOOKED: "Booked",
};

const depositStatusLabel: Record<string, DepositStatus> = {
  NOT_REQUESTED: "Not requested",
  REQUESTED: "Requested",
  PAID: "Paid",
};

const socialPlatformLabel: Record<string, SocialPlatform> = {
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  WEBSITE: "Website",
};

const appointmentStatusLabel: Record<string, AppointmentStatus> = {
  SCHEDULED: "Scheduled",
  RESCHEDULED: "Rescheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

type Viewer = {
  id: string;
  studioId: string;
};

export async function getClientPageData(studioId?: string): Promise<ClientRecord[]> {
  const consultations = await prisma.consultation.findMany({
    where: studioId ? { studioId } : undefined,
    include: {
      assignedArtist: { select: { name: true } },
      appointment: true,
    },
    orderBy: [{ email: "asc" }, { createdAt: "desc" }],
  });

  const grouped = new Map<string, typeof consultations>();

  for (const consultation of consultations) {
    const existing = grouped.get(consultation.email) ?? [];
    existing.push(consultation);
    grouped.set(consultation.email, existing);
  }

  return Array.from(grouped.values()).map((records) => {
    const sorted = [...records].sort(
      (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
    );
    const latest = sorted[0];
    const nextAppointment = sorted
      .map((record) => record.appointment?.startsAt ?? null)
      .filter((value): value is Date => Boolean(value))
      .sort((left, right) => left.getTime() - right.getTime())[0];

    return {
      id: latest.id,
      clientName: latest.clientName,
      email: latest.email,
      phone: latest.phone,
      totalConsultations: records.length,
      activeStage:
        latest.stage === "NEW_INQUIRY"
          ? "New inquiry"
          : latest.stage === "CONSULT_SCHEDULED"
            ? "Consult scheduled"
            : latest.stage === "AWAITING_DEPOSIT"
              ? "Awaiting deposit"
              : latest.stage === "DESIGN_REVIEW"
                ? "Design review"
                : "Booked",
      assignedArtist: latest.assignedArtist?.name ?? "Front desk triage",
      latestPlacement: latest.placement,
      nextAppointmentAt: nextAppointment ? nextAppointment.toISOString() : null,
      totalDepositsPaid: records.reduce(
        (sum, record) => sum + (record.depositStatus === "PAID" ? record.depositAmount ?? 0 : 0),
        0,
      ),
    };
  });
}

export async function getClientDetailPageData(
  viewer: Viewer,
  clientId: string,
): Promise<ClientDetailPageData | null> {
  const anchor = await prisma.consultation.findFirst({
    where: { id: clientId, studioId: viewer.studioId },
    select: { email: true },
  });

  if (!anchor) {
    return null;
  }

  const consultations = await prisma.consultation.findMany({
    where: { studioId: viewer.studioId, email: anchor.email },
    include: {
      assignedArtist: { select: { name: true } },
      createdBy: { select: { name: true } },
      depositEvents: {
        select: {
          id: true,
          type: true,
          amount: true,
          note: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
      appointment: {
        include: {
          artist: { select: { name: true } },
        },
      },
      socialLead: {
        select: {
          id: true,
          platform: true,
          handle: true,
          attributionSummary: true,
          referenceSummary: true,
          createdAt: true,
          campaignLink: { select: { label: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (consultations.length === 0) {
    return null;
  }

  const latest = consultations[0];
  const nextAppointment = consultations
    .map((record) => record.appointment?.startsAt ?? null)
    .filter((value): value is Date => Boolean(value))
    .sort((left, right) => left.getTime() - right.getTime())[0];

  const socialOrigins = consultations
    .filter((consultation) => consultation.socialLead)
    .map((consultation) => consultation.socialLead!)
    .map((lead) => ({
      id: lead.id,
      platform: socialPlatformLabel[lead.platform],
      handle: lead.handle,
      campaignLabel: lead.campaignLink?.label ?? null,
      attributionSummary: lead.attributionSummary,
      referenceSummary: lead.referenceSummary,
      createdAt: lead.createdAt.toISOString(),
    }));

  const appointments = consultations
    .filter((consultation) => consultation.appointment)
    .map((consultation) => consultation.appointment!)
    .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime())
    .map((appointment) => ({
      id: appointment.id,
      consultationId: appointment.consultationId,
      startsAt: appointment.startsAt.toISOString(),
      durationMinutes: appointment.durationMinutes,
      status: appointmentStatusLabel[appointment.status],
      artistName: appointment.artist.name,
      notes: appointment.notes,
    }));

  const timeline = consultations
    .flatMap((consultation) => {
      const consultEvent = {
        id: `consult-${consultation.id}`,
        occurredAt: consultation.createdAt.toISOString(),
        type: "Consultation submitted" as const,
        title: `${consultation.clientName} consultation created`,
        detail: `${consultation.style} on ${consultation.placement.toLowerCase()} · Stage ${consultationStageLabel[consultation.stage]}`,
        consultationId: consultation.id,
      };

      const depositEvents = consultation.depositEvents.map((event) => ({
        id: `deposit-${event.id}`,
        occurredAt: event.createdAt.toISOString(),
        type: "Deposit event" as const,
        title: `${event.type.replaceAll("_", " ").toLowerCase()} recorded`,
        detail: `${event.amount ? `$${event.amount}` : "No amount"}${event.note ? ` · ${event.note}` : ""}`,
        consultationId: consultation.id,
      }));

      const appointmentEvent = consultation.appointment
        ? [{
            id: `appointment-${consultation.appointment.id}`,
            occurredAt: consultation.appointment.startsAt.toISOString(),
            type: "Appointment update" as const,
            title: `${appointmentStatusLabel[consultation.appointment.status]} appointment`,
            detail: `${consultation.appointment.artist.name} · ${consultation.appointment.durationMinutes} min${consultation.appointment.notes ? ` · ${consultation.appointment.notes}` : ""}`,
            consultationId: consultation.id,
          }]
        : [];

      const socialEvent = consultation.socialLead
        ? [{
            id: `social-${consultation.socialLead.id}`,
            occurredAt: consultation.socialLead.createdAt.toISOString(),
            type: "Social origin" as const,
            title: `${socialPlatformLabel[consultation.socialLead.platform]} lead captured`,
            detail: `${consultation.socialLead.handle ? `@${consultation.socialLead.handle}` : "No handle"}${consultation.socialLead.campaignLink?.label ? ` · ${consultation.socialLead.campaignLink.label}` : ""}`,
            consultationId: consultation.id,
          }]
        : [];

      return [consultEvent, ...depositEvents, ...appointmentEvent, ...socialEvent];
    })
    .sort(
      (left, right) =>
        new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
    );

  return {
    id: latest.id,
    clientName: latest.clientName,
    email: latest.email,
    phone: latest.phone,
    totalConsultations: consultations.length,
    totalDepositsPaid: consultations.reduce(
      (sum, consultation) =>
        sum +
        (consultation.depositStatus === "PAID" ? consultation.depositAmount ?? 0 : 0),
      0,
    ),
    nextAppointmentAt: nextAppointment ? nextAppointment.toISOString() : null,
    activeStage: consultationStageLabel[latest.stage],
    consultations: consultations.map((consultation) => ({
      id: consultation.id,
      submittedAt: consultation.createdAt.toISOString(),
      stage: consultationStageLabel[consultation.stage],
      placement: consultation.placement,
      style: consultation.style,
      budgetRange: consultation.budgetRange as ClientDetailPageData["consultations"][number]["budgetRange"],
      preferredArtist: consultation.preferredArtist as PreferredArtist,
      leadSource: consultation.leadSource as LeadSource,
      assignedArtistName: consultation.assignedArtist?.name ?? null,
      createdByName: consultation.createdBy?.name ?? null,
      depositStatus: depositStatusLabel[consultation.depositStatus],
      depositAmount: consultation.depositAmount,
      depositPaidAmount: consultation.depositPaidAmount,
      ideaSummary: consultation.ideaSummary,
      referenceSummary: consultation.referenceSummary,
      socialPlatform: consultation.socialLead
        ? socialPlatformLabel[consultation.socialLead.platform]
        : null,
      socialHandle: consultation.socialLead?.handle ?? null,
      sourceCampaignLabel: consultation.socialLead?.campaignLink?.label ?? null,
    })),
    appointments,
    socialOrigins,
    timeline,
  };
}