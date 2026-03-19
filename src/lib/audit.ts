import { AuditDomain, type UserRole } from "@prisma/client";

import { prisma } from "@/lib/db";

export type AuditActor = {
  id?: string | null;
  name: string;
  role?: UserRole | null;
};

export type AuditRequestContext = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type AuditChangeInput = {
  fieldPath: string;
  beforeValue?: string | null;
  afterValue?: string | null;
};

function serializeValue(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value);
}

export function createAuditDiff(
  beforeState: Record<string, unknown>,
  afterState: Record<string, unknown>,
): AuditChangeInput[] {
  const fieldPaths = new Set([...Object.keys(beforeState), ...Object.keys(afterState)]);
  const changes: Array<AuditChangeInput | null> = Array.from(fieldPaths).map((fieldPath) => {
    const beforeValue = serializeValue(beforeState[fieldPath]);
    const afterValue = serializeValue(afterState[fieldPath]);

    if (beforeValue === afterValue) {
      return null;
    }

    return {
      fieldPath,
      beforeValue,
      afterValue,
    };
  });

  return changes.filter((change): change is AuditChangeInput => change !== null);
}

export async function createAuditLog(input: {
  domain: AuditDomain;
  action: string;
  details?: string | null;
  actor: AuditActor;
  request?: AuditRequestContext;
  changes?: AuditChangeInput[];
  consultationId?: string | null;
  consentFormId?: string | null;
}) {
  await prisma.auditLog.create({
    data: {
      domain: input.domain,
      action: input.action,
      details: input.details ?? null,
      actorId: input.actor.id ?? null,
      actorName: input.actor.name,
      actorRole: input.actor.role ?? null,
      ipAddress: input.request?.ipAddress ?? null,
      userAgent: input.request?.userAgent ?? null,
      consultationId: input.consultationId ?? null,
      consentFormId: input.consentFormId ?? null,
      changes: input.changes?.length
        ? {
            create: input.changes.map((change) => ({
              fieldPath: change.fieldPath,
              beforeValue: change.beforeValue ?? null,
              afterValue: change.afterValue ?? null,
            })),
          }
        : undefined,
    },
  });
}