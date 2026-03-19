import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermissionMock: vi.fn(),
  getRequestAuditContextMock: vi.fn(),
  guardConsentFormInStudioMock: vi.fn(),
  updateConsentStatusMock: vi.fn(),
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
  guardConsentFormInStudio: mocks.guardConsentFormInStudioMock,
}));

vi.mock("@/lib/consent", () => ({
  updateConsentStatus: mocks.updateConsentStatusMock,
}));

import { mutateConsentStatusAction } from "@/app/consent-forms/actions";

describe("consent actions tenancy + RBAC", () => {
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

  it("blocks consent mutation outside studio", async () => {
    mocks.guardConsentFormInStudioMock.mockResolvedValue(false);

    const formData = new FormData();
    formData.set("consentId", "consent_2");
    formData.set("action", "send");

    await mutateConsentStatusAction(formData);

    expect(mocks.requirePermissionMock).toHaveBeenCalledWith("consent.manage");
    expect(mocks.updateConsentStatusMock).not.toHaveBeenCalled();
  });

  it("allows consent mutation in studio", async () => {
    mocks.guardConsentFormInStudioMock.mockResolvedValue(true);

    const formData = new FormData();
    formData.set("consentId", "consent_1");
    formData.set("action", "resend");

    await mutateConsentStatusAction(formData);

    expect(mocks.requirePermissionMock).toHaveBeenCalledWith("consent.manage");
    expect(mocks.guardConsentFormInStudioMock).toHaveBeenCalledTimes(1);
    expect(mocks.updateConsentStatusMock).toHaveBeenCalledTimes(1);
  });
});
