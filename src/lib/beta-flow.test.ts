import { beforeEach, describe, expect, it, vi } from "vitest";

type ConsultationState = {
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
  stage: "NEW_INQUIRY" | "CONSULT_SCHEDULED" | "AWAITING_DEPOSIT" | "DESIGN_REVIEW" | "BOOKED";
  depositStatus: "NOT_REQUESTED" | "REQUESTED" | "PAID";
  depositAmount: number | null;
  depositPaidAmount: number;
  depositFailureReason: string | null;
  bookingLocked: boolean;
  bookingLockedReason: string | null;
  nextStep: string;
  createdAt: Date;
  createdBy: { id: string; name: string } | null;
  assignedArtist: { id: string; name: string } | null;
  socialLead: null;
  appointment: null;
  designNotes: [];
  depositEvents: [];
  auditLogs: [];
  portalLinks: [];
  approvalEvents: [];
  assignedArtistId: string | null;
};

type AppointmentState = {
  id: string;
  consultationId: string;
  artistId: string;
  startsAt: Date;
  durationMinutes: number;
  status: "SCHEDULED" | "RESCHEDULED";
  notes: string | null;
};

type ConsentState = {
  id: string;
  consultationId: string;
  appointmentId: string | null;
  status: "PENDING" | "SENT" | "SIGNED" | "EXPIRED";
  clientLegalName: string;
  signedAt: Date | null;
  healthNotes: string | null;
};

type PortalLinkState = {
  id: string;
  token: string;
  purpose: "APPROVAL" | "CONSENT";
  consultationId: string;
  consentFormId: string | null;
  deliveryChannel: "EMAIL" | null;
  deliveryStatus: "PENDING" | "SENT";
  deliveryTarget: string | null;
  lastDeliveryError: string | null;
};

const harness = vi.hoisted(() => {
  const state = {
    consultation: null as ConsultationState | null,
    appointment: null as AppointmentState | null,
    consent: null as ConsentState | null,
    portalLinks: new Map<string, PortalLinkState>(),
    depositEvents: [] as Array<{ type: string; amount: number | null; note: string | null }>,
    approvalEvents: [] as Array<{ status: string; note: string | null }>,
    auditCount: 0,
  };

  const createAuditLogMock = vi.fn(async () => {
    state.auditCount += 1;
  });

  const ensurePortalLinkMock = vi.fn(async (input: {
    purpose: "APPROVAL" | "CONSENT";
    consultationId: string;
    consentFormId?: string | null;
  }) => {
    const existing = state.portalLinks.get(input.purpose);
    if (existing) {
      if (input.consentFormId) {
        existing.consentFormId = input.consentFormId;
      }
      return existing;
    }

    const created: PortalLinkState = {
      id: `link_${input.purpose.toLowerCase()}`,
      token: `token_${input.purpose.toLowerCase()}`,
      purpose: input.purpose,
      consultationId: input.consultationId,
      consentFormId: input.consentFormId ?? null,
      deliveryChannel: null,
      deliveryStatus: "PENDING",
      deliveryTarget: null,
      lastDeliveryError: null,
    };
    state.portalLinks.set(input.purpose, created);
    return created;
  });

  const recordPortalDeliveryMock = vi.fn(async (input: {
    linkId: string;
    channel: "EMAIL";
    target: string;
  }) => {
    const link = [...state.portalLinks.values()].find((entry) => entry.id === input.linkId);
    if (!link) {
      return;
    }
    link.deliveryChannel = input.channel;
    link.deliveryStatus = "SENT";
    link.deliveryTarget = input.target;
    link.lastDeliveryError = null;
  });

  const recordPortalDeliveryFailureMock = vi.fn(async () => undefined);

  const deliverPortalLinkMock = vi.fn(async () => ({
    status: "sent" as const,
    channel: "EMAIL" as const,
    target: "ada@example.com",
  }));

  const prismaMock = {
    consultation: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        if (!state.consultation || where.id !== state.consultation.id) {
          return null;
        }
        return state.consultation;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        if (!state.consultation || where.id !== state.consultation.id) {
          throw new Error("Consultation not found in test state");
        }
        Object.assign(state.consultation, data);
        return state.consultation;
      }),
      findMany: vi.fn(async () => []),
    },
    appointment: {
      findUnique: vi.fn(async ({ where }: { where: { consultationId?: string } }) => {
        if (!state.appointment) {
          return null;
        }
        if (where.consultationId && state.appointment.consultationId !== where.consultationId) {
          return null;
        }
        return state.appointment;
      }),
      update: vi.fn(async ({ where, data }: { where: { consultationId?: string; id?: string }; data: Record<string, unknown> }) => {
        if (!state.appointment) {
          throw new Error("Appointment not found in test state");
        }
        if (where.consultationId && where.consultationId !== state.appointment.consultationId) {
          throw new Error("Appointment consultation mismatch");
        }
        if (where.id && where.id !== state.appointment.id) {
          throw new Error("Appointment id mismatch");
        }
        Object.assign(state.appointment, data);
        return state.appointment;
      }),
      upsert: vi.fn(async ({ where, create, update }: { where: { consultationId: string }; create: Record<string, unknown>; update: Record<string, unknown> }) => {
        if (state.appointment && state.appointment.consultationId === where.consultationId) {
          Object.assign(state.appointment, update);
          return state.appointment;
        }

        state.appointment = {
          id: "appt_1",
          consultationId: create.consultationId as string,
          artistId: create.artistId as string,
          startsAt: create.startsAt as Date,
          durationMinutes: create.durationMinutes as number,
          status: "SCHEDULED",
          notes: (create.notes as string | null) ?? null,
        };
        return state.appointment;
      }),
    },
    consentForm: {
      findUnique: vi.fn(async ({ where }: { where: { id?: string; consultationId?: string } }) => {
        if (!state.consent) {
          return null;
        }
        if (where.id && state.consent.id !== where.id) {
          return null;
        }
        if (where.consultationId && state.consent.consultationId !== where.consultationId) {
          return null;
        }
        return state.consent;
      }),
      upsert: vi.fn(async ({ where, create, update }: { where: { consultationId: string }; create: Record<string, unknown>; update: Record<string, unknown> }) => {
        if (state.consent && state.consent.consultationId === where.consultationId) {
          Object.assign(state.consent, update);
          return state.consent;
        }

        state.consent = {
          id: "consent_1",
          consultationId: create.consultationId as string,
          appointmentId: (create.appointmentId as string | null) ?? null,
          status: (create.status as ConsentState["status"]) ?? "PENDING",
          clientLegalName: create.clientLegalName as string,
          signedAt: null,
          healthNotes: (create.healthNotes as string | null) ?? null,
        };
        return state.consent;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        if (!state.consent || state.consent.id !== where.id) {
          throw new Error("Consent not found in test state");
        }
        Object.assign(state.consent, data);
        return state.consent;
      }),
    },
    designApprovalEvent: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        state.approvalEvents.push({
          status: data.status as string,
          note: (data.note as string | null) ?? null,
        });
        return undefined;
      }),
    },
    depositEvent: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        state.depositEvents.push({
          type: data.type as string,
          amount: (data.amount as number | null) ?? null,
          note: (data.note as string | null) ?? null,
        });
        return undefined;
      }),
    },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  };

  return {
    state,
    prismaMock,
    createAuditLogMock,
    ensurePortalLinkMock,
    recordPortalDeliveryMock,
    recordPortalDeliveryFailureMock,
    deliverPortalLinkMock,
  };
});

vi.mock("@/lib/db", () => ({
  prisma: harness.prismaMock,
}));

vi.mock("@/lib/audit", () => ({
  createAuditDiff: vi.fn(() => []),
  createAuditLog: harness.createAuditLogMock,
}));

vi.mock("@/lib/delivery", () => ({
  deliverPortalLink: harness.deliverPortalLinkMock,
}));

vi.mock("@/lib/portals", () => ({
  ensurePortalLink: harness.ensurePortalLinkMock,
  getPortalLinkByToken: vi.fn(),
  getPortalPath: vi.fn((purpose: string, token: string) => `/portal/${purpose.toLowerCase()}/${token}`),
  recordPortalDelivery: harness.recordPortalDeliveryMock,
  recordPortalDeliveryFailure: harness.recordPortalDeliveryFailureMock,
}));

import {
  addApprovalEvent,
  captureDepositPayment,
  recordFailedDeposit,
  requestDeposit,
  scheduleAppointment,
  sendApprovalPortalLink,
  updateConsultationWorkflow,
} from "@/lib/consultations";
import { updateConsentStatus } from "@/lib/consent";

const actor = {
  id: "owner_1",
  name: "Owner User",
  role: "OWNER" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  harness.state.consultation = {
    id: "consult_1",
    clientName: "Ada Client",
    email: "ada@example.com",
    phone: "+15555550123",
    placement: "Forearm",
    style: "Fine line",
    budgetRange: "$300-$600",
    preferredArtist: "Kai",
    leadSource: "Website",
    requestedWindow: "Next week",
    ideaSummary: "Botanical piece",
    referenceSummary: "Leaf references",
    stage: "NEW_INQUIRY",
    depositStatus: "NOT_REQUESTED",
    depositAmount: null,
    depositPaidAmount: 0,
    depositFailureReason: null,
    bookingLocked: true,
    bookingLockedReason: "Schedule consult first",
    nextStep: "Initial triage",
    createdAt: new Date("2026-04-10T10:00:00.000Z"),
    createdBy: { id: "owner_1", name: "Owner User" },
    assignedArtist: { id: "artist_1", name: "Kai Moreno" },
    socialLead: null,
    appointment: null,
    designNotes: [],
    depositEvents: [],
    auditLogs: [],
    portalLinks: [],
    approvalEvents: [],
    assignedArtistId: "artist_1",
  };
  harness.state.appointment = null;
  harness.state.consent = null;
  harness.state.portalLinks = new Map();
  harness.state.depositEvents = [];
  harness.state.approvalEvents = [];
  harness.state.auditCount = 0;
});

describe("beta flow integration", () => {
  it("completes the intake-to-signed-consent happy path", async () => {
    await updateConsultationWorkflow("consult_1");
    await requestDeposit("consult_1", actor);
    await captureDepositPayment(
      {
        consultationId: "consult_1",
        amount: 120,
        note: "Deposit collected",
      },
      actor,
    );

    await sendApprovalPortalLink("consult_1", actor);
    await addApprovalEvent(
      {
        consultationId: "consult_1",
        status: "Approved",
        note: "Looks great, approved.",
      },
      actor,
    );

    await scheduleAppointment(
      {
        consultationId: "consult_1",
        artistId: "artist_1",
        startsAt: "2026-05-02T18:00:00.000Z",
        durationMinutes: 180,
        notes: "Bring final stencil.",
      },
      actor,
    );

    expect(harness.state.consent).not.toBeNull();
    await updateConsentStatus(harness.state.consent!.id, "mark-signed", actor);

    expect(harness.state.consultation?.stage).toBe("BOOKED");
    expect(harness.state.consultation?.depositStatus).toBe("PAID");
    expect(harness.state.consultation?.depositPaidAmount).toBe(120);
    expect(harness.state.consultation?.bookingLocked).toBe(false);
    expect(harness.state.appointment?.status).toBe("SCHEDULED");
    expect(harness.state.consent?.status).toBe("SIGNED");
    expect(harness.state.consent?.signedAt).toBeInstanceOf(Date);
    expect(harness.state.portalLinks.get("APPROVAL")?.deliveryStatus).toBe("SENT");
    expect(harness.state.portalLinks.get("CONSENT")?.consentFormId).toBe("consent_1");
    expect(harness.state.depositEvents.map((event) => event.type)).toEqual(["REQUEST", "PAYMENT"]);
    expect(harness.state.approvalEvents).toHaveLength(1);
    expect(harness.createAuditLogMock).toHaveBeenCalled();
  });

  it("keeps booking locked after a failed deposit attempt", async () => {
    await updateConsultationWorkflow("consult_1");
    await requestDeposit("consult_1", actor);
    await recordFailedDeposit(
      {
        consultationId: "consult_1",
        reason: "Card declined",
      },
      actor,
    );

    await scheduleAppointment(
      {
        consultationId: "consult_1",
        artistId: "artist_1",
        startsAt: "2026-05-03T18:00:00.000Z",
        durationMinutes: 180,
      },
      actor,
    );

    expect(harness.state.consultation?.stage).toBe("AWAITING_DEPOSIT");
    expect(harness.state.consultation?.depositStatus).toBe("REQUESTED");
    expect(harness.state.consultation?.depositFailureReason).toBe("Card declined");
    expect(harness.state.consultation?.bookingLocked).toBe(true);
    expect(harness.state.appointment).toBeNull();
    expect(harness.state.depositEvents.map((event) => event.type)).toEqual(["REQUEST", "FAILED"]);
  });
});
