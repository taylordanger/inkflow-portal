"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getRequestAuditContext } from "@/lib/request-context";
import { submitPortalApprovalDecision } from "@/lib/consultations";

const schema = z.object({
  token: z.string().min(1),
  status: z.enum(["Approved", "Revision requested"]),
  note: z.string().trim().optional(),
});

export async function submitPortalApprovalDecisionAction(formData: FormData) {
  const request = await getRequestAuditContext();
  const parsed = schema.safeParse({
    token: String(formData.get("token") ?? ""),
    status: String(formData.get("status") ?? "Approved"),
    note: String(formData.get("note") ?? ""),
  });

  if (!parsed.success) {
    return;
  }

  await submitPortalApprovalDecision({ ...parsed.data, request });
  revalidatePath(`/portal/design-approval/${parsed.data.token}`);
  revalidatePath("/design-approvals");
  revalidatePath("/consultations");
}