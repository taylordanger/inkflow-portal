"use server";

import { revalidatePath } from "next/cache";

import { completeConsentFromPortal } from "@/lib/consent";
import { getRequestAuditContext } from "@/lib/request-context";

export async function completeConsentFromPortalAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const request = await getRequestAuditContext();

  if (!token) {
    return;
  }

  await completeConsentFromPortal(token, request);
  revalidatePath(`/portal/consent/${token}`);
  revalidatePath("/consent-forms");
}