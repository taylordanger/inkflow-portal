import type { UserRole } from "@prisma/client";

export type AppPermission =
  | "consultation.create"
  | "deposit.manage"
  | "consent.manage"
  | "appointment.schedule"
  | "design.annotate"
  | "approval.sendPortal"
  | "social.convertLead"
  | "social.requestMissingFields"
  | "accounts.manage"
  | "accounts.destructive";

const permissionMatrix: Record<AppPermission, UserRole[]> = {
  "consultation.create": ["OWNER", "FRONT_DESK", "ARTIST"],
  "deposit.manage": ["OWNER", "FRONT_DESK"],
  "consent.manage": ["OWNER", "FRONT_DESK"],
  "appointment.schedule": ["OWNER", "FRONT_DESK"],
  "design.annotate": ["OWNER", "ARTIST"],
  "approval.sendPortal": ["OWNER", "ARTIST"],
  "social.convertLead": ["OWNER", "FRONT_DESK"],
  "social.requestMissingFields": ["OWNER", "FRONT_DESK"],
  "accounts.manage": ["OWNER", "FRONT_DESK"],
  "accounts.destructive": ["OWNER"],
};

export function canPerform(role: UserRole, permission: AppPermission): boolean {
  return permissionMatrix[permission].includes(role);
}

export function allowedRoles(permission: AppPermission): UserRole[] {
  return permissionMatrix[permission];
}
