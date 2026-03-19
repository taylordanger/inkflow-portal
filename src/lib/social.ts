import {
  LeadCaptureMethod as PrismaLeadCaptureMethod,
  SocialAccountScope,
  SocialConnectionStatus,
  SocialLeadStatus as PrismaSocialLeadStatus,
  SocialPlatform as PrismaSocialPlatform,
  UserRole,
} from "@prisma/client";

import { prisma } from "@/lib/db";
import { sendConfirmation } from "./confirmation-service";
import { serializeReferenceImages } from "./file-upload";
import type {
  PreferredArtist,
  LeadCaptureMethod,
  PublicIntakeFormFields,
  PublicIntakePageData,
  ReferenceImage,
  SocialAccountRecord,
  SocialInboxPageData,
  SocialLeadRecord,
  SocialLeadStatus,
  SocialPlatform,
} from "@/types/studio";

type Viewer = {
  id: string;
  role: UserRole;
  studioId: string;
};

const socialPlatformLabel: Record<PrismaSocialPlatform, SocialPlatform> = {
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  WEBSITE: "Website",
};

const socialLeadStatusLabel: Record<PrismaSocialLeadStatus, SocialLeadStatus> = {
  NEW: "New",
  QUALIFIED: "Qualified",
  CONVERTED: "Converted",
  ARCHIVED: "Archived",
  SPAM: "Spam",
};

const leadCaptureMethodLabel: Record<PrismaLeadCaptureMethod, LeadCaptureMethod> = {
  LINK_IN_BIO: "Link in bio",
  LEAD_FORM: "Lead form",
  WEBHOOK: "Webhook",
  MANUAL_IMPORT: "Manual import",
  DM_IMPORT: "DM import",
};

const connectionStatusLabel: Record<SocialConnectionStatus, "Active" | "Expired" | "Revoked" | "Error"> = {
  ACTIVE: "Active",
  EXPIRED: "Expired",
  REVOKED: "Revoked",
  ERROR: "Error",
};

function getPreferredArtistOption(name: string | null | undefined): PreferredArtist {
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

const defaultInstagramPreviewImages = [
  "https://images.unsplash.com/photo-1565058379802-bbe93b2f703a?auto=format&fit=crop&w=700&q=80",
  "https://images.unsplash.com/photo-1542727365-19732a80dcfd?auto=format&fit=crop&w=700&q=80",
  "https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?auto=format&fit=crop&w=700&q=80",
  "https://images.unsplash.com/photo-1581306172247-4b2b2f90f39e?auto=format&fit=crop&w=700&q=80",
];

function readSocialVisuals(
  metadataJson: string | null,
  platform: PrismaSocialPlatform,
): {
  profileImageUrl: string | null;
  recentImages: string[];
} {
  if (!metadataJson) {
    const fallback = platform === PrismaSocialPlatform.INSTAGRAM ? defaultInstagramPreviewImages : [];
    return {
      profileImageUrl: fallback[0] ?? null,
      recentImages: fallback,
    };
  }

  try {
    const parsed = JSON.parse(metadataJson) as {
      recentImages?: unknown;
      profileImageUrl?: unknown;
      avatarUrl?: unknown;
    };

    const recentImages = Array.isArray(parsed.recentImages)
      ? parsed.recentImages
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .slice(0, 4)
      : [];

    const profileImageFromMetadata =
      typeof parsed.profileImageUrl === "string" && parsed.profileImageUrl.length > 0
        ? parsed.profileImageUrl
        : typeof parsed.avatarUrl === "string" && parsed.avatarUrl.length > 0
          ? parsed.avatarUrl
          : null;

    const fallback =
      platform === PrismaSocialPlatform.INSTAGRAM && recentImages.length === 0
        ? defaultInstagramPreviewImages
        : recentImages;

    return {
      profileImageUrl: profileImageFromMetadata ?? fallback[0] ?? null,
      recentImages: fallback,
    };
  } catch {
    const fallback = platform === PrismaSocialPlatform.INSTAGRAM ? defaultInstagramPreviewImages : [];
    return {
      profileImageUrl: fallback[0] ?? null,
      recentImages: fallback,
    };
  }
}

export async function getSocialInboxPageData(viewer: Viewer): Promise<SocialInboxPageData> {
  let resolvedStudioId = viewer.studioId?.trim() ? viewer.studioId.trim() : null;

  if (!resolvedStudioId) {
    const user = await prisma.user.findUnique({
      where: { id: viewer.id },
      select: { studioId: true },
    });
    resolvedStudioId = user?.studioId ?? null;
  }

  let studio = resolvedStudioId
    ? await prisma.studio.findUnique({
        where: { id: resolvedStudioId },
        include: {
          socialAccounts: {
            where:
              viewer.role === UserRole.ARTIST
                ? { artistProfile: { userId: viewer.id } }
                : undefined,
            include: {
              artistProfile: { select: { displayName: true, slug: true, userId: true } },
              campaignLinks: {
                select: { code: true },
                orderBy: { createdAt: "asc" },
              },
            },
            orderBy: [{ platform: "asc" }, { handle: "asc" }],
          },
          socialLeads: {
            where:
              viewer.role === UserRole.ARTIST
                ? { artistProfile: { userId: viewer.id } }
                : undefined,
            include: {
              artistProfile: { select: { displayName: true, userId: true } },
              socialAccount: { select: { handle: true } },
              campaignLink: { select: { label: true } },
              consultation: { select: { id: true } },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      })
    : null;

  if (!studio) {
    const user = await prisma.user.findUnique({
      where: { id: viewer.id },
      select: { studioId: true },
    });

    if (user?.studioId && user.studioId !== resolvedStudioId) {
      studio = await prisma.studio.findUnique({
        where: { id: user.studioId },
        include: {
          socialAccounts: {
            where:
              viewer.role === UserRole.ARTIST
                ? { artistProfile: { userId: viewer.id } }
                : undefined,
            include: {
              artistProfile: { select: { displayName: true, slug: true, userId: true } },
              campaignLinks: {
                select: { code: true },
                orderBy: { createdAt: "asc" },
              },
            },
            orderBy: [{ platform: "asc" }, { handle: "asc" }],
          },
          socialLeads: {
            where:
              viewer.role === UserRole.ARTIST
                ? { artistProfile: { userId: viewer.id } }
                : undefined,
            include: {
              artistProfile: { select: { displayName: true, userId: true } },
              socialAccount: { select: { handle: true } },
              campaignLink: { select: { label: true } },
              consultation: { select: { id: true } },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });
    }
  }

  if (!studio) {
    console.error("[Social] Unable to resolve studio for viewer", {
      viewerId: viewer.id,
      viewerRole: viewer.role,
      attemptedStudioId: viewer.studioId,
    });

    return {
      studioName: "Studio setup required",
      connectedAccounts: [],
      leads: [],
      stats: {
        totalLeads: 0,
        newLeads: 0,
        convertedLeads: 0,
        connectedAccounts: 0,
      },
    };
  }

  const hydratedStudio = studio;
  const connectedAccounts: SocialAccountRecord[] = hydratedStudio.socialAccounts.map((account) => {
    const visuals = readSocialVisuals(account.metadataJson, account.platform);
    const campaignCode = account.campaignLinks[0]?.code ?? null;
    const frontPagePath =
      account.scope === SocialAccountScope.STUDIO
        ? campaignCode
          ? `/consult?code=${encodeURIComponent(campaignCode)}`
          : "/consult"
        : account.artistProfile?.slug
          ? campaignCode
            ? `/book/${account.artistProfile.slug}?code=${encodeURIComponent(campaignCode)}`
            : `/book/${account.artistProfile.slug}`
          : null;

    return {
      id: account.id,
      platform: socialPlatformLabel[account.platform],
      handle: account.handle,
      scope: account.scope === SocialAccountScope.STUDIO ? "Studio" : "Artist",
      status: connectionStatusLabel[account.status],
      artistProfileName: account.artistProfile?.displayName ?? null,
      artistUserId: account.artistProfile?.userId ?? null,
      profileImageUrl: visuals.profileImageUrl,
      frontPagePath,
      instagramProfileUrl:
        account.platform === PrismaSocialPlatform.INSTAGRAM
          ? `https://instagram.com/${account.handle}`
          : null,
      instagramPreviewImages: visuals.recentImages,
    };
  });

  const leads = hydratedStudio.socialLeads.map((lead) => {
    // Parse reference images and info requested fields from JSON strings
    let referenceImages: ReferenceImage[] | null = null;
    try {
      if (lead.referenceImages) {
        referenceImages = JSON.parse(lead.referenceImages) as ReferenceImage[];
      }
    } catch {
      // Ignore JSON parse errors
    }

    let infoRequestedFields: string[] | null = null;
    try {
      if (lead.infoRequestedFields) {
        infoRequestedFields = JSON.parse(lead.infoRequestedFields) as string[];
      }
    } catch {
      // Ignore JSON parse errors
    }

    return {
      id: lead.id,
      platform: socialPlatformLabel[lead.platform],
      captureMethod: leadCaptureMethodLabel[lead.captureMethod],
      status: socialLeadStatusLabel[lead.status],
      clientName: lead.clientName,
      preferredArtistName: lead.preferredArtistName,
      handle: lead.handle,
      email: lead.email,
      phone: lead.phone,
      placement: lead.placement,
      style: lead.style,
      budgetRange: lead.budgetRange,
      requestedWindow: lead.requestedWindow,
      messageBody: lead.messageBody,
      referenceSummary: lead.referenceSummary,
      sourceUrl: lead.sourceUrl,
      attributionSummary: lead.attributionSummary,
      createdAt: lead.createdAt.toISOString(),
      artistProfileName: lead.artistProfile?.displayName ?? null,
      artistUserId: lead.artistProfile?.userId ?? null,
      socialAccountHandle: lead.socialAccount?.handle ?? null,
      campaignLabel: lead.campaignLink?.label ?? null,
      consultationId: lead.consultation?.id ?? null,
      referenceImages,
      confirmationSentAt: lead.confirmationSentAt?.toISOString() ?? null,
      confirmationSentVia: lead.confirmationSentVia ? (lead.confirmationSentVia === "EMAIL" ? "Email" : "SMS") : null,
      infoRequestedAt: lead.infoRequestedAt?.toISOString() ?? null,
      infoRequestedBy: lead.infoRequestedBy,
      infoRequestedByName: null,
      infoRequestedFields,
      infoRequestMessage: lead.infoRequestMessage,
    } as SocialLeadRecord;
  });

  // Batch-fetch users for info requests to populate names
  const userIds = [...new Set(leads.map((l) => l.infoRequestedBy).filter(Boolean))] as string[];
  const userMap = new Map<string, string>();

  if (userIds.length > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });

    users.forEach((user) => {
      userMap.set(user.id, user.name);
    });

    // Update leads with fetched user names
    leads.forEach((lead) => {
      if (lead.infoRequestedBy) {
        lead.infoRequestedByName = userMap.get(lead.infoRequestedBy) ?? null;
      }
    });
  }

  return {
    studioName: hydratedStudio.name,
    connectedAccounts,
    leads,
    stats: {
      totalLeads: leads.length,
      newLeads: leads.filter((lead) => lead.status === "New").length,
      convertedLeads: leads.filter((lead) => lead.status === "Converted").length,
      connectedAccounts: connectedAccounts.length,
    },
  };
}

export async function getPublicIntakePageData(input?: {
  artistSlug?: string;
  campaignCode?: string;
}): Promise<PublicIntakePageData | null> {
  const campaignLink = input?.campaignCode
    ? await prisma.campaignLink.findUnique({
        where: { code: input.campaignCode },
        include: {
          studio: true,
          artistProfile: true,
          socialAccount: true,
        },
      })
    : null;

  const artistProfile = input?.artistSlug
    ? await prisma.artistProfile.findFirst({
        where: { slug: input.artistSlug },
        include: {
          studio: true,
          socialAccounts: {
            where: { status: SocialConnectionStatus.ACTIVE },
            orderBy: { createdAt: "asc" },
          },
          campaignLinks: {
            orderBy: { createdAt: "asc" },
          },
        },
      })
    : null;

  const studio = campaignLink?.studio ?? artistProfile?.studio ?? (await prisma.studio.findFirst({ orderBy: { createdAt: "asc" } }));

  if (!studio) {
    return null;
  }

  const resolvedArtistProfile = campaignLink?.artistProfile ?? artistProfile ?? null;
  const resolvedCampaign = campaignLink ?? artistProfile?.campaignLinks?.[0] ?? null;
  const resolvedSocialAccount =
    campaignLink?.socialAccount ??
    artistProfile?.socialAccounts?.[0] ??
    (await prisma.socialAccount.findFirst({
      where: { studioId: studio.id, scope: SocialAccountScope.STUDIO, status: SocialConnectionStatus.ACTIVE },
      orderBy: { createdAt: "asc" },
    }));

  return {
    studioName: studio.name,
    studioSlug: studio.slug,
    artistName: resolvedArtistProfile?.displayName ?? null,
    artistBio: resolvedArtistProfile?.bio ?? null,
    artistSpecialties: resolvedArtistProfile?.specialties ?? null,
    artistHandle: resolvedSocialAccount?.handle ?? null,
    socialPlatform: resolvedSocialAccount ? socialPlatformLabel[resolvedSocialAccount.platform] : "Website",
    defaultPreferredArtist: getPreferredArtistOption(resolvedArtistProfile?.displayName),
    artistOptions: ["First available", "Kai", "Mara", "Sol"],
    campaignCode: resolvedCampaign?.code ?? null,
    campaignLabel: resolvedCampaign?.label ?? null,
    socialAccountId: resolvedSocialAccount?.id ?? null,
    artistProfileId: resolvedArtistProfile?.id ?? null,
    campaignLinkId: resolvedCampaign?.id ?? null,
    destinationPath: resolvedArtistProfile ? `/book/${resolvedArtistProfile.slug}` : "/consult",
  };
}

export async function createPublicSocialLead(input: {
  studioSlug: string;
  socialPlatform: SocialPlatform;
  socialAccountId?: string | null;
  artistProfileId?: string | null;
  campaignLinkId?: string | null;
  values: PublicIntakeFormFields;
  referenceImages?: ReferenceImage[] | null;
  confirmationChannel?: "Email" | "SMS" | null;
}) {
  const studio = await prisma.studio.findUnique({
    where: { slug: input.studioSlug },
  });

  if (!studio) {
    throw new Error("Unable to resolve the studio for this public intake.");
  }

  const platformMap: Record<SocialPlatform, PrismaSocialPlatform> = {
    Instagram: PrismaSocialPlatform.INSTAGRAM,
    TikTok: PrismaSocialPlatform.TIKTOK,
    Website: PrismaSocialPlatform.WEBSITE,
  };

  const lead = await prisma.socialLead.create({
    data: {
      studioId: studio.id,
      artistProfileId: input.artistProfileId ?? null,
      socialAccountId: input.socialAccountId ?? null,
      campaignLinkId: input.campaignLinkId ?? null,
      platform: platformMap[input.socialPlatform],
      captureMethod:
        input.socialPlatform === "Website"
          ? PrismaLeadCaptureMethod.LEAD_FORM
          : PrismaLeadCaptureMethod.LINK_IN_BIO,
      status: PrismaSocialLeadStatus.NEW,
      clientName: input.values.clientName,
      preferredArtistName: input.values.preferredArtist,
      email: input.values.email,
      phone: input.values.phone,
      placement: input.values.placement,
      style: input.values.style,
      budgetRange: input.values.budgetRange,
      requestedWindow: input.values.requestedWindow,
      messageBody: input.values.ideaSummary,
      referenceSummary: input.values.referenceSummary,
      sourceUrl: input.campaignLinkId ? `/${studio.slug}/${input.campaignLinkId}` : null,
      attributionSummary:
        input.values.preferredArtist === "First available"
          ? "Public intake submitted for first-available artist routing."
          : `Public intake requested ${input.values.preferredArtist}.`,
      referenceImages: input.referenceImages
        ? serializeReferenceImages(input.referenceImages)
        : null,
      events: {
        create: {
          type: "public-intake-submitted",
          details: `${input.socialPlatform} intake submitted from ${input.campaignLinkId ? "tracked campaign" : "public consult route"}.`,
        },
      },
    },
  });

  // Send confirmation email/SMS if requested and contact info available
  if (
    input.confirmationChannel &&
    (input.confirmationChannel === "Email" ? input.values.email : input.values.phone)
  ) {
    const confirmResult = await sendConfirmation(input.confirmationChannel, {
      clientName: input.values.clientName,
      contactTarget:
        input.confirmationChannel === "Email"
          ? input.values.email!
          : input.values.phone!,
      studioName: studio.name,
      artistName:
        input.values.preferredArtist !== "First available"
          ? input.values.preferredArtist
          : undefined,
      campaignLabel: input.campaignLinkId ? "Campaign lead" : undefined,
      estimatedReplyTime: "24-48 hours",
    });

    // Update confirmation timestamp if successful
    if (confirmResult.success) {
      await prisma.socialLead.update({
        where: { id: lead.id },
        data: {
          confirmationSentAt: new Date(),
          confirmationSentVia: input.confirmationChannel === "Email" ? "EMAIL" : "SMS",
        },
      });

      // Log the event
      await prisma.socialLeadEvent.create({
        data: {
          socialLeadId: lead.id,
          type: "confirmation-sent",
          details: `${input.confirmationChannel} confirmation sent to ${
            input.confirmationChannel === "Email"
              ? input.values.email
              : input.values.phone
          }`,
        },
      });
    }
  }

  return lead;
}