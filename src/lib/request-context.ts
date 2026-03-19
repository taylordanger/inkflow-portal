import { headers } from "next/headers";

import type { AuditRequestContext } from "@/lib/audit";

export async function getRequestAuditContext(): Promise<AuditRequestContext> {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for");
  const realIp = requestHeaders.get("x-real-ip");

  return {
    ipAddress: forwardedFor?.split(",")[0]?.trim() ?? realIp ?? null,
    userAgent: requestHeaders.get("user-agent"),
  };
}