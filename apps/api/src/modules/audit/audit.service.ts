import type { Prisma } from "@prisma/client";
import { AppError } from "../../lib/errors.js";
import { toSafeAuditLogEntry, type SafeAuditLogEntry } from "../../lib/audit.js";
import { buildPaginationMetadata, type PaginatedResult } from "../../lib/organizations.js";
import { prisma } from "../../lib/prisma.js";
import type { OrganizationAuditLogQuery, PlatformAuditLogQuery } from "./audit.schemas.js";

function buildDateRangeFilter(from?: string, to?: string): Prisma.DateTimeFilter | undefined {
  if (!from && !to) {
    return undefined;
  }

  return {
    ...(from ? { gte: new Date(from) } : {}),
    ...(to ? { lte: new Date(to) } : {})
  };
}

function buildAuditWhere(
  query: OrganizationAuditLogQuery,
  organizationId?: string
): Prisma.AuditLogWhereInput {
  const createdAt = buildDateRangeFilter(query.from, query.to);

  return {
    ...(organizationId ? { organizationId } : {}),
    ...(query.action ? { action: query.action } : {}),
    ...(query.resourceType ? { resourceType: query.resourceType } : {}),
    ...(createdAt ? { createdAt } : {})
  };
}

async function listAuditLogs(
  where: Prisma.AuditLogWhereInput,
  page: number,
  limit: number
): Promise<PaginatedResult<SafeAuditLogEntry>> {
  const skip = (page - 1) * limit;

  const [total, auditLogs] = await prisma.$transaction([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    })
  ]);

  return {
    data: auditLogs.map((auditLog) => toSafeAuditLogEntry(auditLog)),
    pagination: buildPaginationMetadata(page, limit, total)
  };
}

export async function listOrganizationAuditLogs(
  organizationId: string,
  query: OrganizationAuditLogQuery
): Promise<PaginatedResult<SafeAuditLogEntry>> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true }
  });

  if (!organization) {
    throw new AppError(404, "NOT_FOUND", "Organization not found");
  }

  return listAuditLogs(buildAuditWhere(query, organizationId), query.page, query.limit);
}

export async function listPlatformAuditLogs(
  query: PlatformAuditLogQuery
): Promise<PaginatedResult<SafeAuditLogEntry>> {
  const where: Prisma.AuditLogWhereInput = {
    ...buildAuditWhere(query),
    ...(query.organizationId ? { organizationId: query.organizationId } : {}),
    ...(query.actorId ? { actorId: query.actorId } : {})
  };

  return listAuditLogs(where, query.page, query.limit);
}
