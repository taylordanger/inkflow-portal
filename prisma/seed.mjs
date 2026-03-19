import { randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.paymentWebhookEvent.deleteMany();
  await prisma.portalDeliveryAttempt.deleteMany();
  await prisma.socialLeadEvent.deleteMany();
  await prisma.socialLead.deleteMany();
  await prisma.campaignLink.deleteMany();
  await prisma.socialAccount.deleteMany();
  await prisma.artistProfile.deleteMany();
  await prisma.auditLogChange.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.clientPortalLink.deleteMany();
  await prisma.depositEvent.deleteMany();
  await prisma.consentForm.deleteMany();
  await prisma.designApprovalEvent.deleteMany();
  await prisma.designNote.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.consultation.deleteMany();
  await prisma.user.deleteMany();
  await prisma.studio.deleteMany();

  const passwordHash = await hash("inkflow-demo", 10);

  const studio = await prisma.studio.create({
    data: {
      name: "Inkflow Demo Studio",
      slug: "inkflow-demo-studio",
    },
  });

  const [owner, frontDesk, kai, mara, sol] = await Promise.all([
    prisma.user.create({
      data: {
        studioId: studio.id,
        name: "Nika Vale",
        email: "owner@inkflow.local",
        passwordHash,
        role: "OWNER",
      },
    }),
    prisma.user.create({
      data: {
        studioId: studio.id,
        name: "Jules Mercer",
        email: "frontdesk@inkflow.local",
        passwordHash,
        role: "FRONT_DESK",
      },
    }),
    prisma.user.create({
      data: {
        studioId: studio.id,
        name: "Kai Moreno",
        email: "kai@inkflow.local",
        passwordHash,
        role: "ARTIST",
      },
    }),
    prisma.user.create({
      data: {
        studioId: studio.id,
        name: "Mara Quinn",
        email: "mara@inkflow.local",
        passwordHash,
        role: "ARTIST",
      },
    }),
    prisma.user.create({
      data: {
        studioId: studio.id,
        name: "Sol Vega",
        email: "sol@inkflow.local",
        passwordHash,
        role: "ARTIST",
      },
    }),
  ]);

  const [kaiProfile, maraProfile, solProfile] = await Promise.all([
    prisma.artistProfile.create({
      data: {
        studioId: studio.id,
        userId: kai.id,
        displayName: "Kai Moreno",
        slug: "kai-moreno",
        bio: "Botanical blackwork and organic composition.",
        specialties: "Blackwork, botanical, shoulder and sleeve flow",
      },
    }),
    prisma.artistProfile.create({
      data: {
        studioId: studio.id,
        userId: mara.id,
        displayName: "Mara Quinn",
        slug: "mara-quinn",
        bio: "Fine line memorial and script-led pieces.",
        specialties: "Fine line, memorial, script, florals",
      },
    }),
    prisma.artistProfile.create({
      data: {
        studioId: studio.id,
        userId: sol.id,
        displayName: "Sol Vega",
        slug: "sol-vega",
        bio: "Illustrative color and large composition work.",
        specialties: "Illustrative color, ornamental, thigh and torso placements",
      },
    }),
  ]);

  const [studioInstagram, kaiInstagram, maraTikTok, solInstagram] = await Promise.all([
    prisma.socialAccount.create({
      data: {
        studioId: studio.id,
        platform: "INSTAGRAM",
        scope: "STUDIO",
        handle: "inkflowstudio",
        platformUserId: "ig_studio_001",
        metadataJson: JSON.stringify({
          followers: 12840,
          profileImageUrl: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=300&q=80",
          recentImages: [
            "https://images.unsplash.com/photo-1565058379802-bbe93b2f703a?auto=format&fit=crop&w=700&q=80",
            "https://images.unsplash.com/photo-1542727365-19732a80dcfd?auto=format&fit=crop&w=700&q=80",
            "https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?auto=format&fit=crop&w=700&q=80",
            "https://images.unsplash.com/photo-1581306172247-4b2b2f90f39e?auto=format&fit=crop&w=700&q=80",
          ],
        }),
      },
    }),
    prisma.socialAccount.create({
      data: {
        studioId: studio.id,
        artistProfileId: kaiProfile.id,
        platform: "INSTAGRAM",
        scope: "ARTIST",
        handle: "kaimoreno.ink",
        platformUserId: "ig_kai_001",
        metadataJson: JSON.stringify({
          followers: 6410,
          profileImageUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80",
          recentImages: [
            "https://images.unsplash.com/photo-1517559421643-54f96b39b8b1?auto=format&fit=crop&w=700&q=80",
            "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=700&q=80",
            "https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?auto=format&fit=crop&w=700&q=80",
          ],
        }),
      },
    }),
    prisma.socialAccount.create({
      data: {
        studioId: studio.id,
        artistProfileId: maraProfile.id,
        platform: "TIKTOK",
        scope: "ARTIST",
        handle: "maraquinnlines",
        platformUserId: "tt_mara_001",
        metadataJson: JSON.stringify({
          followers: 9320,
          profileImageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80",
        }),
      },
    }),
    prisma.socialAccount.create({
      data: {
        studioId: studio.id,
        artistProfileId: solProfile.id,
        platform: "INSTAGRAM",
        scope: "ARTIST",
        handle: "solvega.color",
        platformUserId: "ig_sol_001",
        metadataJson: JSON.stringify({
          followers: 7840,
          profileImageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
          recentImages: [
            "https://images.unsplash.com/photo-1550534791-2677533605ab?auto=format&fit=crop&w=700&q=80",
            "https://images.unsplash.com/photo-1605106702734-205df224ecce?auto=format&fit=crop&w=700&q=80",
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=700&q=80",
          ],
        }),
      },
    }),
  ]);

  const [kaiBookingLink, maraFlashLink, studioConsultLink] = await Promise.all([
    prisma.campaignLink.create({
      data: {
        studioId: studio.id,
        artistProfileId: kaiProfile.id,
        socialAccountId: kaiInstagram.id,
        code: "kai-spring-blackwork",
        label: "Kai spring blackwork consult link",
        destinationPath: "/consultations",
        sourceUrl: "https://instagram.com/kaimoreno.ink",
      },
    }),
    prisma.campaignLink.create({
      data: {
        studioId: studio.id,
        artistProfileId: maraProfile.id,
        socialAccountId: maraTikTok.id,
        code: "mara-fine-line-flash-drop",
        label: "Mara fine line flash drop",
        destinationPath: "/consultations",
        sourceUrl: "https://tiktok.com/@maraquinnlines",
      },
    }),
    prisma.campaignLink.create({
      data: {
        studioId: studio.id,
        socialAccountId: studioInstagram.id,
        code: "studio-consult-link",
        label: "Studio consult bio link",
        destinationPath: "/consultations",
        sourceUrl: "https://instagram.com/inkflowstudio",
      },
    }),
  ]);

  const [kaiSocialLead, maraSocialLead, studioLead, solLead] = await Promise.all([
    prisma.socialLead.create({
      data: {
        studioId: studio.id,
        artistProfileId: kaiProfile.id,
        socialAccountId: kaiInstagram.id,
        campaignLinkId: kaiBookingLink.id,
        platform: "INSTAGRAM",
        externalLeadId: "ig-lead-kai-001",
        captureMethod: "LINK_IN_BIO",
        status: "CONVERTED",
        clientName: "Rhea Morrow",
        handle: "rhea.draws",
        email: "rhea@example.com",
        phone: "503-555-0184",
        messageBody: "Loved Kai's shoulder blackwork reel. Looking for a botanical shoulder cap that can later extend into a half sleeve.",
        referenceSummary: "Inspired by botanical shoulder cap reference set with stippled leaves and flowing peony petals.",
        referenceImages: JSON.stringify([
          {
            url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=700&q=80",
            fileName: "botanical-shoulder-reference-1.jpg",
            uploadedAt: new Date().toISOString(),
          },
          {
            url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=700&q=80",
            fileName: "botanical-shoulder-reference-2.jpg",
            uploadedAt: new Date().toISOString(),
          },
        ]),
        sourceUrl: "https://instagram.com/kaimoreno.ink",
        attributionSummary: "Captured from Kai's spring blackwork consult link.",
      },
    }),
    prisma.socialLead.create({
      data: {
        studioId: studio.id,
        artistProfileId: maraProfile.id,
        socialAccountId: maraTikTok.id,
        campaignLinkId: maraFlashLink.id,
        platform: "TIKTOK",
        externalLeadId: "tt-lead-mara-001",
        captureMethod: "LEAD_FORM",
        status: "CONVERTED",
        clientName: "Devin Torres",
        handle: "devin.torres",
        email: "devin@example.com",
        phone: "971-555-0142",
        messageBody: "Found Mara's memorial flash post on TikTok and want to adapt it into a forearm script-and-flower piece.",
        referenceSummary: "Wants script + birth flower composition similar to memorial set on IG/TikTok post.",
        referenceImages: JSON.stringify([
          {
            url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=700&q=80",
            fileName: "memorial-script-reference-1.jpg",
            uploadedAt: new Date().toISOString(),
          },
        ]),
        sourceUrl: "https://tiktok.com/@maraquinnlines",
        attributionSummary: "Submitted through Mara's flash drop lead form.",
      },
    }),
    prisma.socialLead.create({
      data: {
        studioId: studio.id,
        socialAccountId: studioInstagram.id,
        campaignLinkId: studioConsultLink.id,
        platform: "INSTAGRAM",
        externalLeadId: "ig-lead-studio-001",
        captureMethod: "DM_IMPORT",
        status: "NEW",
        clientName: "Nora Bishop",
        handle: "nora.bishop",
        email: "nora@example.com",
        phone: "206-555-0145",
        messageBody: "Looking for first-available artist for a delicate sternum ornamental piece. Can send references.",
        referenceSummary: "Delicate sternum ornamental geometry with soft negative space.",
        referenceImages: JSON.stringify([
          {
            url: "https://images.unsplash.com/photo-1521119989659-a83eee488004?auto=format&fit=crop&w=700&q=80",
            fileName: "sternum-ornamental-reference-1.jpg",
            uploadedAt: new Date().toISOString(),
          },
          {
            url: "https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?auto=format&fit=crop&w=700&q=80",
            fileName: "sternum-ornamental-reference-2.jpg",
            uploadedAt: new Date().toISOString(),
          },
        ]),
        sourceUrl: "https://instagram.com/inkflowstudio",
        attributionSummary: "Imported from the studio Instagram inbox.",
      },
    }),
    prisma.socialLead.create({
      data: {
        studioId: studio.id,
        artistProfileId: solProfile.id,
        socialAccountId: solInstagram.id,
        platform: "INSTAGRAM",
        externalLeadId: "ig-lead-sol-001",
        captureMethod: "DM_IMPORT",
        status: "QUALIFIED",
        clientName: "Janel Reed",
        handle: "janelreed",
        email: "janel@example.com",
        phone: null,
        messageBody: "Interested in Sol for a color luna moth on upper thigh, need to talk budget and timing first.",
        sourceUrl: "https://instagram.com/solvega.color",
        attributionSummary: "Qualified in artist inbox but still missing phone number.",
      },
    }),
  ]);

  const consultScheduled = await prisma.consultation.create({
    data: {
      studioId: studio.id,
      socialLeadId: kaiSocialLead.id,
      clientName: "Rhea Morrow",
      email: "rhea@example.com",
      phone: "503-555-0184",
      placement: "Left shoulder cap",
      style: "Botanical blackwork",
      budgetRange: "$300-$600",
      preferredArtist: "Kai",
      leadSource: "Instagram",
      requestedWindow: "Friday afternoon next week",
      ideaSummary:
        "Blackwork floral piece wrapping over the shoulder with room to extend into a half sleeve later.",
      referenceSummary:
        "Saved peonies, stippled leaves, and one existing studio piece for line weight direction.",
      stage: "CONSULT_SCHEDULED",
      depositStatus: "NOT_REQUESTED",
      bookingLocked: true,
      bookingLockedReason: "Deposit must be requested and collected before booking can proceed.",
      nextStep: "Confirm final consult time and pre-qualify reference set.",
      createdById: frontDesk.id,
      assignedArtistId: kai.id,
      createdAt: new Date("2026-03-09T16:30:00.000Z"),
    },
  });

  const awaitingDeposit = await prisma.consultation.create({
    data: {
      studioId: studio.id,
      socialLeadId: maraSocialLead.id,
      clientName: "Devin Torres",
      email: "devin@example.com",
      phone: "971-555-0142",
      placement: "Outer forearm",
      style: "Fine line memorial",
      budgetRange: "$150-$300",
      preferredArtist: "Mara",
      leadSource: "Referral",
      requestedWindow: "Evenings after 6 PM",
      ideaSummary:
        "Fine line memorial piece with handwriting and a small birth flower under it.",
      referenceSummary:
        "Has handwriting sample and two flower references, needs help simplifying composition.",
      stage: "AWAITING_DEPOSIT",
      depositStatus: "REQUESTED",
      depositAmount: 100,
      depositPaidAmount: 0,
      bookingLocked: true,
      bookingLockedReason: "Blocked until the remaining $100 deposit balance is collected.",
      nextStep: "Collect deposit before opening the calendar slot.",
      createdById: frontDesk.id,
      assignedArtistId: mara.id,
      createdAt: new Date("2026-03-10T20:05:00.000Z"),
    },
  });

  const designReview = await prisma.consultation.create({
    data: {
      studioId: studio.id,
      clientName: "Micah Patel",
      email: "micah@example.com",
      phone: "360-555-0199",
      placement: "Upper thigh",
      style: "Illustrative color",
      budgetRange: "$600-$1,000",
      preferredArtist: "Sol",
      leadSource: "Website",
      requestedWindow: "Weekend consult",
      ideaSummary:
        "Illustrative luna moth with warm color pops and ornamental framing.",
      referenceSummary:
        "Shared moodboard and wants artist-led composition after consult.",
      stage: "DESIGN_REVIEW",
      depositStatus: "PAID",
      depositAmount: 200,
      depositPaidAmount: 200,
      bookingLocked: false,
      nextStep: "Prepare the first concept set and capture any placement revisions.",
      createdById: frontDesk.id,
      assignedArtistId: sol.id,
      createdAt: new Date("2026-03-11T01:15:00.000Z"),
    },
  });

  await prisma.designNote.createMany({
    data: [
      {
        consultationId: designReview.id,
        authorId: sol.id,
        note: "Shared a first concept with warmer wing gradients and lighter ornamental framing.",
      },
      {
        consultationId: designReview.id,
        authorId: sol.id,
        note: "Placement looks best with a slight inward rotation to preserve motion across the thigh.",
      },
    ],
  });

  await prisma.designApprovalEvent.createMany({
    data: [
      {
        consultationId: designReview.id,
        status: "CONCEPT_SENT",
        note: "First color concept sent for review.",
      },
      {
        consultationId: designReview.id,
        status: "REVISION_REQUESTED",
        note: "Client asked for a warmer palette and less dense border detail.",
      },
    ],
  });

  const bookedConsultation = await prisma.consultation.create({
    data: {
      studioId: studio.id,
      clientName: "Sage Navarro",
      email: "sage@example.com",
      phone: "503-555-0123",
      placement: "Right calf",
      style: "Neo-traditional botanical",
      budgetRange: "$600-$1,000",
      preferredArtist: "Kai",
      leadSource: "Returning client",
      requestedWindow: "April weekends",
      ideaSummary:
        "Peony and dagger composition to connect into an existing calf piece.",
      referenceSummary:
        "Needs placement integration with existing work and stronger stem flow.",
      stage: "BOOKED",
      depositStatus: "PAID",
      depositAmount: 200,
      depositPaidAmount: 200,
      bookingLocked: false,
      nextStep: "Prep final stencil packet for the session day.",
      createdById: frontDesk.id,
      assignedArtistId: kai.id,
      appointment: {
        create: {
          artistId: kai.id,
          startsAt: new Date("2026-04-12T19:00:00.000Z"),
          durationMinutes: 180,
          notes: "Bring calf placement printouts and prior session photos.",
        },
      },
    },
    include: {
      appointment: true,
    },
  });

  await prisma.socialLeadEvent.createMany({
    data: [
      {
        socialLeadId: kaiSocialLead.id,
        type: "lead-captured",
        details: "Captured from Kai's Instagram consult bio link.",
      },
      {
        socialLeadId: kaiSocialLead.id,
        type: "consultation-created",
        details: `Converted into consultation ${consultScheduled.id}`,
      },
      {
        socialLeadId: maraSocialLead.id,
        type: "lead-captured",
        details: "Captured from Mara's TikTok flash drop form.",
      },
      {
        socialLeadId: maraSocialLead.id,
        type: "consultation-created",
        details: `Converted into consultation ${awaitingDeposit.id}`,
      },
      {
        socialLeadId: studioLead.id,
        type: "lead-captured",
        details: "Imported from the studio Instagram inbox for front desk follow-up.",
      },
      {
        socialLeadId: solLead.id,
        type: "lead-qualified",
        details: "Artist replied and requested phone number before converting to a consult.",
      },
    ],
  });

  await prisma.consentForm.createMany({
    data: [
      {
        consultationId: designReview.id,
        status: "SENT",
        clientLegalName: "Micah Patel",
        emergencyContact: "Avery Patel",
        emergencyPhone: "360-555-0101",
        healthNotes: "No latex sensitivity reported. Client requested extra aftercare emphasis for thigh placement.",
      },
      {
        consultationId: bookedConsultation.id,
        appointmentId: bookedConsultation.appointment?.id,
        status: "SIGNED",
        clientLegalName: "Sage Navarro",
        emergencyContact: "Lena Navarro",
        emergencyPhone: "503-555-0180",
        healthNotes: "Existing calf work noted. Avoid adhesive wrap overnight.",
        signedAt: new Date("2026-04-10T18:20:00.000Z"),
      },
    ],
  });

  await prisma.depositEvent.createMany({
    data: [
      {
        consultationId: awaitingDeposit.id,
        actorId: frontDesk.id,
        type: "REQUEST",
        amount: 100,
        note: "Deposit invoice opened after consult.",
      },
      {
        consultationId: designReview.id,
        actorId: frontDesk.id,
        type: "REQUEST",
        amount: 200,
        note: "Deposit request sent after consult fit was confirmed.",
      },
      {
        consultationId: designReview.id,
        actorId: frontDesk.id,
        type: "PAYMENT",
        amount: 200,
        note: "Card captured in studio.",
      },
      {
        consultationId: bookedConsultation.id,
        actorId: frontDesk.id,
        type: "REQUEST",
        amount: 200,
        note: "Returning client deposit request sent.",
      },
      {
        consultationId: bookedConsultation.id,
        actorId: frontDesk.id,
        type: "PAYMENT",
        amount: 200,
        note: "Returning client deposit paid online.",
      },
    ],
  });

  const consentToken = randomBytes(24).toString("hex");
  const approvalToken = randomBytes(24).toString("hex");
  const bookedConsentToken = randomBytes(24).toString("hex");

  await prisma.clientPortalLink.createMany({
    data: [
      {
        token: consentToken,
        purpose: "CONSENT",
        consultationId: designReview.id,
        consentFormId: null,
        deliveryChannel: "EMAIL",
        deliveryStatus: "SENT",
        deliveryTarget: "micah@example.com",
        expiresAt: new Date("2026-04-30T00:00:00.000Z"),
      },
      {
        token: approvalToken,
        purpose: "APPROVAL",
        consultationId: designReview.id,
        deliveryChannel: "EMAIL",
        deliveryStatus: "SENT",
        deliveryTarget: "micah@example.com",
        expiresAt: new Date("2026-04-30T00:00:00.000Z"),
      },
      {
        token: bookedConsentToken,
        purpose: "CONSENT",
        consultationId: bookedConsultation.id,
        consentFormId: bookedConsultation.appointment ? undefined : undefined,
        deliveryChannel: "SMS",
        deliveryStatus: "SENT",
        deliveryTarget: "+15035550123",
        expiresAt: new Date("2026-04-30T00:00:00.000Z"),
      },
    ],
  });

  const [designReviewConsent, bookedConsent] = await prisma.consentForm.findMany({
    orderBy: { createdAt: "asc" },
  });

  await prisma.clientPortalLink.updateMany({
    where: { consultationId: designReview.id, purpose: "CONSENT" },
    data: {
      consentFormId: designReviewConsent.id,
      lastSentAt: new Date("2026-03-11T10:00:00.000Z"),
    },
  });

  await prisma.clientPortalLink.updateMany({
    where: { consultationId: bookedConsultation.id, purpose: "CONSENT" },
    data: {
      consentFormId: bookedConsent.id,
      lastSentAt: new Date("2026-04-09T16:00:00.000Z"),
    },
  });

  const seededLinks = await prisma.clientPortalLink.findMany({
    select: { id: true, consultationId: true, purpose: true },
  });

  const designReviewConsentLink = seededLinks.find(
    (link) => link.consultationId === designReview.id && link.purpose === "CONSENT",
  );
  const designReviewApprovalLink = seededLinks.find(
    (link) => link.consultationId === designReview.id && link.purpose === "APPROVAL",
  );
  const bookedConsentLink = seededLinks.find(
    (link) => link.consultationId === bookedConsultation.id && link.purpose === "CONSENT",
  );

  await prisma.portalDeliveryAttempt.createMany({
    data: [
      ...(designReviewConsentLink
        ? [
            {
              portalLinkId: designReviewConsentLink.id,
              attemptNumber: 1,
              status: "FAILED",
              channel: "EMAIL",
              target: "micah@example.com",
              errorMessage: "Mailbox provider timed out.",
              attemptedAt: new Date("2026-03-11T09:40:00.000Z"),
            },
            {
              portalLinkId: designReviewConsentLink.id,
              attemptNumber: 2,
              status: "SENT",
              channel: "EMAIL",
              target: "micah@example.com",
              attemptedAt: new Date("2026-03-11T10:00:00.000Z"),
            },
          ]
        : []),
      ...(designReviewApprovalLink
        ? [
            {
              portalLinkId: designReviewApprovalLink.id,
              attemptNumber: 1,
              status: "UNAVAILABLE",
              errorMessage: "No delivery provider configured. Add Resend or Twilio credentials.",
              attemptedAt: new Date("2026-03-11T08:15:00.000Z"),
            },
            {
              portalLinkId: designReviewApprovalLink.id,
              attemptNumber: 2,
              status: "SENT",
              channel: "EMAIL",
              target: "micah@example.com",
              attemptedAt: new Date("2026-03-11T08:25:00.000Z"),
            },
          ]
        : []),
      ...(bookedConsentLink
        ? [
            {
              portalLinkId: bookedConsentLink.id,
              attemptNumber: 1,
              status: "SENT",
              channel: "SMS",
              target: "+15035550123",
              attemptedAt: new Date("2026-04-09T16:00:00.000Z"),
            },
          ]
        : []),
    ],
  });

  await prisma.auditLog.create({
    data: {
      domain: "DEPOSIT",
      action: "Deposit requested",
      details: "Requested $100 deposit",
      actorId: frontDesk.id,
      actorName: frontDesk.name,
      actorRole: frontDesk.role,
      ipAddress: "203.0.113.14",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      consultationId: awaitingDeposit.id,
      changes: {
        create: [
          { fieldPath: "depositStatus", beforeValue: "NOT_REQUESTED", afterValue: "REQUESTED" },
          { fieldPath: "depositPaidAmount", beforeValue: "0", afterValue: "0" },
        ],
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      domain: "APPROVAL",
      action: "Concept sent",
      details: "First concept packet sent to client.",
      actorId: sol.id,
      actorName: sol.name,
      actorRole: sol.role,
      ipAddress: "203.0.113.55",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      consultationId: designReview.id,
      changes: {
        create: [
          {
            fieldPath: "nextStep",
            beforeValue: "Prepare the first concept set and capture any placement revisions.",
            afterValue: "Concept sent. Awaiting client review.",
          },
        ],
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      domain: "CONSENT",
      action: "Waiver sent",
      details: "Client portal waiver link sent before session.",
      actorId: frontDesk.id,
      actorName: frontDesk.name,
      actorRole: frontDesk.role,
      ipAddress: "203.0.113.14",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      consultationId: bookedConsultation.id,
      consentFormId: bookedConsent.id,
      changes: {
        create: [{ fieldPath: "status", beforeValue: "PENDING", afterValue: "SENT" }],
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      domain: "CONSENT",
      action: "Waiver signed from portal",
      details: null,
      actorName: "Sage Navarro (client portal)",
      ipAddress: "198.51.100.42",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X)",
      consultationId: bookedConsultation.id,
      consentFormId: bookedConsent.id,
      changes: {
        create: [{ fieldPath: "status", beforeValue: "SENT", afterValue: "SIGNED" }],
      },
    },
  });

  await prisma.paymentWebhookEvent.create({
    data: {
      provider: "STRIPE",
      eventId: "evt_seed_payment_success",
      eventType: "payment_intent.succeeded",
      consultationId: designReview.id,
      signatureHeader: "t=1741689600,v1=seeded-signature",
      payloadHash: "seeded-payload-hash",
      payloadBody: JSON.stringify({
        id: "evt_seed_payment_success",
        type: "payment_intent.succeeded",
        data: { object: { id: "pi_seeded", metadata: { consultationId: designReview.id } } },
      }),
      signatureVerifiedAt: new Date("2026-03-11T07:05:00.000Z"),
      replayCount: 1,
      lastReplayedAt: new Date("2026-03-11T07:07:00.000Z"),
      processedAt: new Date("2026-03-11T07:05:00.000Z"),
    },
  });

  console.log("Seeded users:", {
    studio: studio.slug,
    owner: owner.email,
    frontDesk: frontDesk.email,
    artists: [kai.email, mara.email, sol.email],
    demoPassword: "inkflow-demo",
    seededConsultations: [consultScheduled.id, awaitingDeposit.id, designReview.id],
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });