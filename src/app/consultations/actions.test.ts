import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermissionMock: vi.fn(),
  getRequestAuditContextMock: vi.fn(),
  guardConsultationInStudioMock: vi.fn(),
  scheduleAppointmentMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requirePermission: mocks.requirePermissionMock,
  requireUser: vi.fn(),
}));

vi.mock("@/lib/request-context", () => ({
  getRequestAuditContext: mocks.getRequestAuditContextMock,
}));

vi.mock("@/lib/tenant-scope", () => ({
  guardConsultationInStudio: mocks.guardConsultationInStudioMock,
}));

vi.mock("@/lib/consultations", () => ({
  addApprovalEvent: vi.fn(),
  addDesignNote: vi.fn(),
  captureDepositPayment: vi.fn(),
  captureOutstandingDeposit: vi.fn(),
  createConsultation: vi.fn(),
  recordFailedDeposit: vi.fn(),
  refundDeposit: vi.fn(),
  requestDeposit: vi.fn(),
  scheduleAppointment: mocks.scheduleAppointmentMock,
  sendApprovalPortalLink: vi.fn(),
  updateConsultationWorkflow: vi.fn(),
}));

import { scheduleAppointmentAction } from "@/app/consultations/actions";

describe("consultations actions tenancy + RBAC", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePermissionMock.mockResolvedValue({
      id: "user_1",
      name: "Owner User",
      role: "OWNER",
      studioId: "studio_1",
    });
    mocks.getRequestAuditContextMock.mockResolvedValue({ ipAddress: "127.0.0.1" });
  });

  it("blocks scheduling when consultation is outside studio", async () => {
    mocks.guardConsultationInStudioMock.mockResolvedValue(false);

    const formData = new FormData();
    formData.set("consultationId", "consult_2");
    formData.set("artistId", "artist_2");
    formData.set("startsAt", "2026-03-15T10:00");
    formData.set("durationMinutes", "180");
    formData.set("notes", "Prep notes");

    await scheduleAppointmentAction(formData);

    expect(mocks.requirePermissionMock).toHaveBeenCalledWith("appointment.schedule");
    expect(mocks.guardConsultationInStudioMock).toHaveBeenCalledTimes(1);
    expect(mocks.scheduleAppointmentMock).not.toHaveBeenCalled();
  });

  it("schedules when permission and studio guard both pass", async () => {
    mocks.guardConsultationInStudioMock.mockResolvedValue(true);

    const formData = new FormData();
    formData.set("consultationId", "consult_1");
    formData.set("artistId", "artist_1");
    formData.set("startsAt", "2026-03-15T10:00");
    formData.set("durationMinutes", "180");
    formData.set("notes", "Prep notes");

    await scheduleAppointmentAction(formData);

    expect(mocks.requirePermissionMock).toHaveBeenCalledWith("appointment.schedule");
    expect(mocks.guardConsultationInStudioMock).toHaveBeenCalledTimes(1);
    expect(mocks.scheduleAppointmentMock).toHaveBeenCalledTimes(1);
  });
});
