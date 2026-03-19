import {
  AppointmentStatus as PrismaAppointmentStatus,
  ConsultationStage as PrismaConsultationStage,
  SocialLeadStatus as PrismaSocialLeadStatus,
  SocialPlatform as PrismaSocialPlatform,
  UserRole,
} from "@prisma/client";

import { prisma } from "@/lib/db";
import type {
  AppointmentStatus,
  ConsultationStage,
  PersonDetailPageData,
  PersonSummaryRecord,
  SocialLeadStatus,
  SocialPlatform,
  StaffRoleLabel,
} from "@/types/studio";

type Viewer = {
  id: string;
  role: UserRole;
  studioId: string;
};

const roleLabel: Record<UserRole, StaffRoleLabel> = {
  OWNER: "Owner",
  FRONT_DESK: "Front desk",
  ARTIST: "Artist",
};

const consultationStageLabel: Record<PrismaConsultationStage, ConsultationStage> = {
  NEW_INQUIRY: "New inquiry",
  CONSULT_SCHEDULED: "Consult scheduled",
  AWAITING_DEPOSIT: "Awaiting deposit",
  DESIGN_REVIEW: "Design review",
  BOOKED: "Booked",
};

const appointmentStatusLabel: Record<PrismaAppointmentStatus, AppointmentStatus> = {
  SCHEDULED: "Scheduled",
  RESCHEDULED: "Rescheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const socialLeadStatusLabel: Record<PrismaSocialLeadStatus, SocialLeadStatus> = {
  NEW: "New",
  QUALIFIED: "Qualified",
  CONVERTED: "Converted",
  ARCHIVED: "Archived",
  SPAM: "Spam",
};

const socialPlatformLabel: Record<PrismaSocialPlatform, SocialPlatform> = {
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  WEBSITE: "Website",
};

async function resolveStudioId(viewer: Viewer): Promise<string | null> {
  if (viewer.studioId?.trim()) {
    return viewer.studioId.trim();
  }

  const user = await prisma.user.findUnique({
    where: { id: viewer.id },
    select: { studioId: true },
  });

  return user?.studioId ?? null;
}

export async function getPeoplePageData(viewer: Viewer): Promise<PersonSummaryRecord[]> {
  const studioId = await resolveStudioId(viewer);
  if (!studioId) {
    return [];
  }

  const users = await prisma.user.findMany({
    where: { studioId },
    include: {
      artistProfile: {
        select: {
          id: true,
          slug: true,
          displayName: true,
        },
      },
      _count: {
        select: {
          consultationsAssigned: true,
          consultationsCreated: true,
          appointments: true,
        },
      },
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: roleLabel[user.role],
    isActive: user.isActive,
    deactivatedAt: user.deactivatedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    artistProfileId: user.artistProfile?.id ?? null,
    artistSlug: user.artistProfile?.slug ?? null,
    artistDisplayName: user.artistProfile?.displayName ?? null,
    assignedConsultations: user._count.consultationsAssigned,
    createdConsultations: user._count.consultationsCreated,
    appointments: user._count.appointments,
  }));
}

export async function getPersonDetailPageData(
  viewer: Viewer,
  userId: string,
): Promise<PersonDetailPageData | null> {
  const studioId = await resolveStudioId(viewer);
  if (!studioId) {
    return null;
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, studioId },
    include: {
      artistProfile: {
        include: {
          socialAccounts: {
            orderBy: [{ platform: "asc" }, { handle: "asc" }],
          },
          socialLeads: {
            orderBy: { createdAt: "desc" },
          },
        },
      },
      consultationsAssigned: {
        select: {
          id: true,
          clientName: true,
          stage: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
      consultationsCreated: {
        select: {
          id: true,
          clientName: true,
          stage: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
      appointments: {
        include: {
          consultation: { select: { clientName: true } },
        },
        orderBy: { startsAt: "desc" },
      },
      designNotes: {
        include: {
          consultation: { select: { clientName: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: roleLabel[user.role],
    isActive: user.isActive,
    deactivatedAt: user.deactivatedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    artistProfile: user.artistProfile
      ? {
          id: user.artistProfile.id,
          displayName: user.artistProfile.displayName,
          slug: user.artistProfile.slug,
          bio: user.artistProfile.bio,
          specialties: user.artistProfile.specialties,
          socialHandles: user.artistProfile.socialAccounts.map((account) => `@${account.handle}`),
        }
      : null,
    assignedConsultations: user.consultationsAssigned.map((consultation) => ({
      id: consultation.id,
      clientName: consultation.clientName,
      stage: consultationStageLabel[consultation.stage],
      submittedAt: consultation.createdAt.toISOString(),
    })),
    createdConsultations: user.consultationsCreated.map((consultation) => ({
      id: consultation.id,
      clientName: consultation.clientName,
      stage: consultationStageLabel[consultation.stage],
      submittedAt: consultation.createdAt.toISOString(),
    })),
    appointments: user.appointments.map((appointment) => ({
      id: appointment.id,
      clientName: appointment.consultation.clientName,
      startsAt: appointment.startsAt.toISOString(),
      durationMinutes: appointment.durationMinutes,
      status: appointmentStatusLabel[appointment.status],
    })),
    designNotes: user.designNotes.map((note) => ({
      id: note.id,
      clientName: note.consultation.clientName,
      note: note.note,
      createdAt: note.createdAt.toISOString(),
    })),
    socialLeads: (user.artistProfile?.socialLeads ?? []).map((lead) => ({
      id: lead.id,
      clientName: lead.clientName,
      handle: lead.handle,
      status: socialLeadStatusLabel[lead.status],
      platform: socialPlatformLabel[lead.platform],
      createdAt: lead.createdAt.toISOString(),
    })),
  };
}
