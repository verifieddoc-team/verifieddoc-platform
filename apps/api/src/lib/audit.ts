import type { AuditLog, User } from "@prisma/client";
import type { Prisma } from "@prisma/client";

const SENSITIVE_DETAIL_KEY_PATTERN =
  /password|token|hash|authorization|cookie|secret|requestbody|headers|refresh/i;

export interface AuditLogWriteInput {
  actorId?: string | null;
  organizationId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: Prisma.InputJsonValue;
}

export function buildAuditLogData(input: AuditLogWriteInput): Prisma.AuditLogCreateInput {
  return {
    actor: input.actorId ? { connect: { id: input.actorId } } : undefined,
    organization: input.organizationId ? { connect: { id: input.organizationId } } : undefined,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId ?? null,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    details: input.details ?? undefined
  };
}

function sanitizeAuditValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeAuditValue(entry));
  }

  if (value && typeof value === "object") {
    return sanitizeAuditDetails(value as Record<string, unknown>);
  }

  return value;
}

export function sanitizeAuditDetails(details: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(details)) {
    if (SENSITIVE_DETAIL_KEY_PATTERN.test(key)) {
      continue;
    }

    sanitized[key] = sanitizeAuditValue(value);
  }

  return sanitized;
}

export interface SafeAuditLogEntry {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  organizationId: string | null;
  actor: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: User["role"];
  } | null;
  ipAddress: string | null;
  userAgent: string | null;
  details: Record<string, unknown> | null;
  createdAt: Date;
}

type AuditLogWithActor = AuditLog & {
  actor: Pick<User, "id" | "email" | "firstName" | "lastName" | "role"> | null;
};

export function toSafeAuditLogEntry(auditLog: AuditLogWithActor): SafeAuditLogEntry {
  const rawDetails =
    auditLog.details && typeof auditLog.details === "object" && !Array.isArray(auditLog.details)
      ? (auditLog.details as Record<string, unknown>)
      : null;

  return {
    id: auditLog.id,
    action: auditLog.action,
    resourceType: auditLog.resourceType,
    resourceId: auditLog.resourceId,
    organizationId: auditLog.organizationId,
    actor: auditLog.actor
      ? {
          id: auditLog.actor.id,
          email: auditLog.actor.email,
          firstName: auditLog.actor.firstName,
          lastName: auditLog.actor.lastName,
          role: auditLog.actor.role
        }
      : null,
    ipAddress: auditLog.ipAddress,
    userAgent: auditLog.userAgent,
    details: rawDetails ? sanitizeAuditDetails(rawDetails) : null,
    createdAt: auditLog.createdAt
  };
}

export function serializeSafeAuditLog(auditLog: SafeAuditLogEntry): string {
  return JSON.stringify(auditLog);
}
