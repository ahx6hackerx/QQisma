import { prisma } from "../lib/prisma";

interface AuditParams {
  propertyId: string;
  actorId: string;
  entityType: string;
  entityId: string;
  action: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
}

// Records an immutable audit entry for a sensitive change (amount edits,
// ownership changes, closing overrides, dispute resolutions...).
// This is intentionally separate from ActivityLog: ActivityLog is a
// human-readable feed, AuditLog is the tamper-evident before/after trail.
export async function writeAuditLog(params: AuditParams) {
  await prisma.auditLog.create({
    data: {
      propertyId: params.propertyId,
      actorId: params.actorId,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      beforeValue: params.before !== undefined ? JSON.stringify(params.before) : null,
      afterValue: params.after !== undefined ? JSON.stringify(params.after) : null,
      reason: params.reason,
    },
  });
}

// Human-readable activity feed entry (e.g. "Mohammad added 700 JD income").
export async function logActivity(propertyId: string, actorId: string | null, action: string, details?: string) {
  await prisma.activityLog.create({
    data: { propertyId, actorId: actorId ?? undefined, action, details },
  });
}
