import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermissionMock: vi.fn(),
  getRequestAuditContextMock: vi.fn(),
  guardSocialLeadInStudioMock: vi.fn(),
  createConsultationFromSocialLeadMock: vi.fn(),
  updateMock: vi.fn(),
  createEventMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requirePermission: mocks.requirePermissionMock,
}));

vi.mock("@/lib/request-context", () => ({
  getRequestAuditContext: mocks.getRequestAuditContextMock,
}));

vi.mock("@/lib/tenant-scope", () => ({
  guardSocialLeadInStudio: mocks.guardSocialLeadInStudioMock,
}));

vi.mock("@/lib/consultations", () => ({
  createConsultationFromSocialLead: mocks.createConsultationFromSocialLeadMock,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    socialLead: {
      update: mocks.updateMock,
    },
    socialLeadEvent: {
      create: mocks.createEventMock,
    },
  },
}));

import {
  createConsultationFromSocialLeadAction,
  requestMissingFieldsAction,
} from "@/app/social-inbox/actions";

describe("social inbox actions tenancy + RBAC", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePermissionMock.mockResolvedValue({
      id: "user_1",
      name: "Desk User",
      role: "FRONT_DESK",
      studioId: "studio_1",
    });
    mocks.getRequestAuditContextMock.mockResolvedValue({ ipAddress: "127.0.0.1" });
  });

  it("blocks social lead conversion outside studio", async () => {
    mocks.guardSocialLeadInStudioMock.mockResolvedValue(false);

    const formData = new FormData();
    formData.set("socialLeadId", "lead_2");

    await createConsultationFromSocialLeadAction(formData);

    expect(mocks.requirePermissionMock).toHaveBeenCalledWith("social.convertLead");
    expect(mocks.createConsultationFromSocialLeadMock).not.toHaveBeenCalled();
  });

  it("writes missing-fields request when guard passes", async () => {
    mocks.guardSocialLeadInStudioMock.mockResolvedValue(true);

    const formData = new FormData();
    formData.set("socialLeadId", "lead_1");
    formData.set("fieldsNeeded", JSON.stringify(["email", "phone"]));
    formData.set("message", "Need details");

    await requestMissingFieldsAction(formData);

    expect(mocks.requirePermissionMock).toHaveBeenCalledWith("social.requestMissingFields");
    expect(mocks.guardSocialLeadInStudioMock).toHaveBeenCalledTimes(1);
    expect(mocks.updateMock).toHaveBeenCalledTimes(1);
    expect(mocks.createEventMock).toHaveBeenCalledTimes(1);
  });
});
