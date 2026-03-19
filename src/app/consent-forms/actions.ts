"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requirePermission } from "@/lib/auth";
import { getRequestAuditContext } from "@/lib/request-context";
import { guardConsentFormInStudio } from "@/lib/tenant-scope";
import { updateConsentStatus } from "@/lib/consent";

const consentActionSchema = z.object({
  consentId: z.string().min(1),
  action: z.enum(["send", "resend", "expire", "mark-signed"]),
});

export async function mutateConsentStatusAction(formData: FormData) {
  const user = await requirePermission("consent.manage");
  const request = await getRequestAuditContext();

  const parsed = consentActionSchema.safeParse({
    consentId: String(formData.get("consentId") ?? ""),
    action: String(formData.get("action") ?? "send"),
  });

  if (!parsed.success) {
    return;
  }

  if (!(await guardConsentFormInStudio({
    action: `consent-${parsed.data.action}`,
    actor: { id: user.id, name: user.name ?? "Studio staff", role: user.role },
    request,
    resourceId: parsed.data.consentId,
    studioId: user.studioId,
  }))) {
    return;
  }

  await updateConsentStatus(parsed.data.consentId, parsed.data.action, {
    id: user.id,
    name: user.name ?? "Studio staff",
    role: user.role,
  }, request);
  revalidatePath("/consent-forms");
}