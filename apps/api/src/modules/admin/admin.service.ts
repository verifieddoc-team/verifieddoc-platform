import {
  FraudAlertStatus,
  NotificationType,
  PlatformRole,
  UserStatus,
  type Prisma
} from "@prisma/client";
import { AppError } from "../../lib/errors.js";
import { createNotification } from "../../lib/notifications.js";
import { buildPaginationMetadata, type PaginatedResult } from "../../lib/organizations.js";
import { prisma } from "../../lib/prisma.js";
import { toPublicUser, type PublicUser } from "../../lib/users.js";
import { startOfMonth } from "../../lib/verification.js";
import type {
  AdminFraudAlertStatusInput,
  AdminFraudAlertsQuery,
  AdminReportsExportQuery,
  AdminReportsQuery,
  AdminUserStatusInput,
  AdminUsersQuery,
  AdminVerificationRequestsQuery,
  AdminVerificationsQuery
} from "./admin.schemas.js";

const RECENT_LIMIT = 10;

export type AdminUserView = PublicUser & {
  suspendedAt: Date | null;
  suspendedReason: string | null;
};

function toAdminUser(user: {
  id: string;
  email: string;
  fullName: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: PlatformRole;
  status: UserStatus;
  emailVerifiedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  suspendedAt: Date | null;
  suspendedReason: string | null;
}): AdminUserView {
  return {
    ...toPublicUser(user),
    suspendedAt: user.suspendedAt,
    suspendedReason: user.suspendedReason
  };
}

function monthOverMonthPercent(current: number, previous: number): number | null {
  if (previous === 0) {
    return null;
  }

  return Number((((current - previous) / previous) * 100).toFixed(2));
}

function previousMonthStart(currentMonthStart: Date): Date {
  return new Date(
    Date.UTC(currentMonthStart.getUTCFullYear(), currentMonthStart.getUTCMonth() - 1, 1, 0, 0, 0, 0)
  );
}

async function countCreatedBetween(
  model: "user" | "organization" | "credential" | "verificationEvent",
  gte: Date,
  lt: Date
): Promise<number> {
  const where = { createdAt: { gte, lt } };

  switch (model) {
    case "user":
      return prisma.user.count({ where });
    case "organization":
      return prisma.organization.count({ where });
    case "credential":
      return prisma.credential.count({ where });
    case "verificationEvent":
      return prisma.verificationEvent.count({ where });
  }
}

export async function getAdminDashboard() {
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = previousMonthStart(thisMonthStart);

  const [
    totalUsers,
    institutions,
    documents,
    verifications,
    usersThisMonth,
    usersLastMonth,
    institutionsThisMonth,
    institutionsLastMonth,
    documentsThisMonth,
    documentsLastMonth,
    verificationsThisMonth,
    verificationsLastMonth,
    recentVerificationRequests,
    fraudAlerts
  ] = await Promise.all([
    prisma.user.count(),
    prisma.organization.count(),
    // documents = issued credentials count (platform-wide issued credential records)
    prisma.credential.count(),
    prisma.verificationEvent.count(),
    countCreatedBetween("user", thisMonthStart, now),
    countCreatedBetween("user", lastMonthStart, thisMonthStart),
    countCreatedBetween("organization", thisMonthStart, now),
    countCreatedBetween("organization", lastMonthStart, thisMonthStart),
    countCreatedBetween("credential", thisMonthStart, now),
    countCreatedBetween("credential", lastMonthStart, thisMonthStart),
    countCreatedBetween("verificationEvent", thisMonthStart, now),
    countCreatedBetween("verificationEvent", lastMonthStart, thisMonthStart),
    prisma.verificationRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: RECENT_LIMIT,
      select: {
        id: true,
        status: true,
        createdAt: true,
        credentialId: true,
        organizationId: true,
        holderId: true,
        requestedById: true,
        credential: { select: { publicId: true, title: true } },
        organization: { select: { id: true, name: true, slug: true } }
      }
    }),
    prisma.fraudAlert.findMany({
      where: { status: FraudAlertStatus.OPEN },
      orderBy: { lastSeenAt: "desc" },
      take: RECENT_LIMIT
    })
  ]);

  return {
    stats: {
      totalUsers,
      institutions,
      /** Issued credentials count (platform document inventory). */
      documents,
      verifications,
      growth: {
        usersMoMPercent: monthOverMonthPercent(usersThisMonth, usersLastMonth),
        institutionsMoMPercent: monthOverMonthPercent(institutionsThisMonth, institutionsLastMonth),
        documentsMoMPercent: monthOverMonthPercent(documentsThisMonth, documentsLastMonth),
        verificationsMoMPercent: monthOverMonthPercent(
          verificationsThisMonth,
          verificationsLastMonth
        )
      },
      currentPeriod: {
        from: thisMonthStart.toISOString(),
        to: now.toISOString(),
        users: usersThisMonth,
        institutions: institutionsThisMonth,
        documents: documentsThisMonth,
        verifications: verificationsThisMonth
      },
      previousPeriod: {
        from: lastMonthStart.toISOString(),
        to: thisMonthStart.toISOString(),
        users: usersLastMonth,
        institutions: institutionsLastMonth,
        documents: documentsLastMonth,
        verifications: verificationsLastMonth
      }
    },
    recentVerificationRequests,
    fraudAlerts
  };
}

export async function listAdminUsers(query: AdminUsersQuery): Promise<PaginatedResult<AdminUserView>> {
  const where: Prisma.UserWhereInput = {
    ...(query.role ? { role: query.role } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.search
      ? {
          OR: [
            { email: { contains: query.search, mode: "insensitive" } },
            { firstName: { contains: query.search, mode: "insensitive" } },
            { lastName: { contains: query.search, mode: "insensitive" } },
            { fullName: { contains: query.search, mode: "insensitive" } }
          ]
        }
      : {})
  };

  const skip = (query.page - 1) * query.limit;
  const [total, users] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: query.limit
    })
  ]);

  return {
    data: users.map(toAdminUser),
    pagination: buildPaginationMetadata(query.page, query.limit, total)
  };
}

export async function getAdminUser(userId: string): Promise<AdminUserView> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(404, "NOT_FOUND", "User not found");
  }

  return toAdminUser(user);
}

export async function updateAdminUserStatus(
  actorId: string,
  userId: string,
  input: AdminUserStatusInput,
  context: { ipAddress?: string; userAgent?: string } = {}
): Promise<AdminUserView> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(404, "NOT_FOUND", "User not found");
  }

  if (input.action === "SUSPEND") {
    if (actorId === userId) {
      throw new AppError(400, "CANNOT_SUSPEND_SELF", "You cannot suspend your own account");
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new AppError(409, "USER_ALREADY_SUSPENDED", "User is already suspended");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.user.update({
        where: { id: userId },
        data: {
          status: UserStatus.SUSPENDED,
          suspendedAt: new Date(),
          suspendedReason: input.reason,
          suspendedById: actorId
        }
      });

      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() }
      });

      await tx.auditLog.create({
        data: {
          actorId,
          action: "USER_SUSPENDED",
          resourceType: "User",
          resourceId: userId,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          details: { reason: input.reason, previousStatus: user.status }
        }
      });

      await createNotification(tx, {
        userId,
        type: NotificationType.GENERIC,
        title: "Account suspended",
        message: "Your account has been suspended by a platform administrator.",
        resourceType: "User",
        resourceId: userId
      });

      return next;
    });

    return toAdminUser(updated);
  }

  if (user.status !== UserStatus.SUSPENDED) {
    throw new AppError(409, "USER_NOT_SUSPENDED", "User is not suspended");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.ACTIVE,
        suspendedAt: null,
        suspendedReason: null,
        suspendedById: null
      }
    });

    await tx.auditLog.create({
      data: {
        actorId,
        action: "USER_REINSTATED",
        resourceType: "User",
        resourceId: userId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        details: { previousStatus: user.status }
      }
    });

    await createNotification(tx, {
      userId,
      type: NotificationType.GENERIC,
      title: "Account reinstated",
      message: "Your account has been reinstated by a platform administrator.",
      resourceType: "User",
      resourceId: userId
    });

    return next;
  });

  return toAdminUser(updated);
}

function buildDateRange(from?: string, to?: string): Prisma.DateTimeFilter | undefined {
  if (!from && !to) {
    return undefined;
  }

  return {
    ...(from ? { gte: new Date(from) } : {}),
    ...(to ? { lte: new Date(to) } : {})
  };
}

export async function listAdminVerifications(query: AdminVerificationsQuery) {
  const createdAt = buildDateRange(query.from, query.to);
  const where: Prisma.VerificationEventWhereInput = {
    ...(query.result ? { result: query.result } : {}),
    ...(query.method ? { method: query.method } : {}),
    ...(query.organizationId ? { organizationId: query.organizationId } : {}),
    ...(query.verifierId ? { verifierId: query.verifierId } : {}),
    ...(createdAt ? { createdAt } : {})
  };

  const skip = (query.page - 1) * query.limit;
  const [total, data] = await prisma.$transaction([
    prisma.verificationEvent.count({ where }),
    prisma.verificationEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: query.limit,
      select: {
        id: true,
        method: true,
        result: true,
        createdAt: true,
        verifierId: true,
        credentialId: true,
        organizationId: true,
        credentialPublicIdSnapshot: true,
        ipAddress: true,
        organization: { select: { id: true, name: true, slug: true } },
        verifier: {
          select: { id: true, email: true, firstName: true, lastName: true, role: true }
        }
      }
    })
  ]);

  return {
    data,
    pagination: buildPaginationMetadata(query.page, query.limit, total)
  };
}

export async function listAdminVerificationRequests(query: AdminVerificationRequestsQuery) {
  const createdAt = buildDateRange(query.from, query.to);
  const where: Prisma.VerificationRequestWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.organizationId ? { organizationId: query.organizationId } : {}),
    ...(query.holderId ? { holderId: query.holderId } : {}),
    ...(createdAt ? { createdAt } : {})
  };

  const skip = (query.page - 1) * query.limit;
  const [total, data] = await prisma.$transaction([
    prisma.verificationRequest.count({ where }),
    prisma.verificationRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: query.limit,
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        requesterNote: true,
        reviewNote: true,
        reviewedAt: true,
        credentialId: true,
        organizationId: true,
        holderId: true,
        requestedById: true,
        reviewedById: true,
        credential: { select: { publicId: true, title: true } },
        organization: { select: { id: true, name: true, slug: true } }
      }
    })
  ]);

  return {
    data,
    pagination: buildPaginationMetadata(query.page, query.limit, total)
  };
}

export async function listAdminFraudAlerts(query: AdminFraudAlertsQuery) {
  const createdAt = buildDateRange(query.from, query.to);
  const where: Prisma.FraudAlertWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.type ? { type: query.type } : {}),
    ...(query.severity ? { severity: query.severity } : {}),
    ...(createdAt ? { createdAt } : {})
  };

  const skip = (query.page - 1) * query.limit;
  const [total, data] = await prisma.$transaction([
    prisma.fraudAlert.count({ where }),
    prisma.fraudAlert.findMany({
      where,
      orderBy: { lastSeenAt: "desc" },
      skip,
      take: query.limit
    })
  ]);

  return {
    data,
    pagination: buildPaginationMetadata(query.page, query.limit, total)
  };
}

export async function getAdminFraudAlert(alertId: string) {
  const alert = await prisma.fraudAlert.findUnique({
    where: { id: alertId },
    include: {
      credential: {
        select: { id: true, publicId: true, title: true, status: true, organizationId: true }
      },
      actor: {
        select: { id: true, email: true, firstName: true, lastName: true, role: true }
      },
      resolvedBy: {
        select: { id: true, email: true, firstName: true, lastName: true, role: true }
      }
    }
  });

  if (!alert) {
    throw new AppError(404, "NOT_FOUND", "Fraud alert not found");
  }

  return alert;
}

export async function updateAdminFraudAlertStatus(
  actorId: string,
  alertId: string,
  input: AdminFraudAlertStatusInput,
  context: { ipAddress?: string; userAgent?: string } = {}
) {
  const alert = await prisma.fraudAlert.findUnique({ where: { id: alertId } });
  if (!alert) {
    throw new AppError(404, "NOT_FOUND", "Fraud alert not found");
  }

  if (alert.status === input.status) {
    throw new AppError(409, "FRAUD_ALERT_STATUS_UNCHANGED", "Fraud alert already has this status");
  }

  const isTerminal =
    input.status === FraudAlertStatus.RESOLVED || input.status === FraudAlertStatus.DISMISSED;

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.fraudAlert.update({
      where: { id: alertId },
      data: {
        status: input.status,
        resolvedAt: isTerminal ? new Date() : alert.resolvedAt,
        resolvedById: isTerminal ? actorId : alert.resolvedById
      }
    });

    await tx.auditLog.create({
      data: {
        actorId,
        action: "FRAUD_ALERT_STATUS_CHANGED",
        resourceType: "FraudAlert",
        resourceId: alertId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        details: {
          previousStatus: alert.status,
          nextStatus: input.status,
          type: alert.type,
          severity: alert.severity
        }
      }
    });

    // Do not notify the investigated actor — that would disclose fraud-investigation outcomes.
    return next;
  });

  return updated;
}

export async function getAdminReportsSummary(query: AdminReportsQuery) {
  const from = new Date(query.from);
  const to = new Date(query.to);
  const createdAt = { gte: from, lte: to };

  const [
    usersCreated,
    institutionsCreated,
    documentsIssued,
    verifications,
    verificationByResult,
    verificationByMethod,
    fraudAlertsOpened,
    verificationRequests
  ] = await Promise.all([
    prisma.user.count({ where: { createdAt } }),
    prisma.organization.count({ where: { createdAt } }),
    prisma.credential.count({ where: { createdAt } }),
    prisma.verificationEvent.count({ where: { createdAt } }),
    prisma.verificationEvent.groupBy({
      by: ["result"],
      where: { createdAt },
      _count: { _all: true }
    }),
    prisma.verificationEvent.groupBy({
      by: ["method"],
      where: { createdAt },
      _count: { _all: true }
    }),
    prisma.fraudAlert.count({ where: { createdAt } }),
    prisma.verificationRequest.count({ where: { createdAt } })
  ]);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    summary: {
      usersCreated,
      institutionsCreated,
      /** Issued credentials created in range. */
      documentsIssued,
      verifications,
      fraudAlertsOpened,
      verificationRequests,
      verificationByResult: Object.fromEntries(
        verificationByResult.map((row) => [row.result, row._count._all])
      ),
      verificationByMethod: Object.fromEntries(
        verificationByMethod.map((row) => [row.method, row._count._all])
      )
    }
  };
}

/** Escape CSV cell against formula injection (=, +, -, @, tab, CR) and quote as needed. */
export function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }

  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }

  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

export function buildReportsCsv(summary: Awaited<ReturnType<typeof getAdminReportsSummary>>): string {
  const rows: string[][] = [
    ["metric", "value"],
    ["from", summary.from],
    ["to", summary.to],
    ["usersCreated", String(summary.summary.usersCreated)],
    ["institutionsCreated", String(summary.summary.institutionsCreated)],
    ["documentsIssued", String(summary.summary.documentsIssued)],
    ["verifications", String(summary.summary.verifications)],
    ["fraudAlertsOpened", String(summary.summary.fraudAlertsOpened)],
    ["verificationRequests", String(summary.summary.verificationRequests)]
  ];

  for (const [result, count] of Object.entries(summary.summary.verificationByResult)) {
    rows.push([`verificationByResult.${result}`, String(count)]);
  }

  for (const [method, count] of Object.entries(summary.summary.verificationByMethod)) {
    rows.push([`verificationByMethod.${method}`, String(count)]);
  }

  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n") + "\n";
}

export async function exportAdminReports(
  actorId: string,
  query: AdminReportsExportQuery,
  context: { ipAddress?: string; userAgent?: string } = {}
) {
  const summary = await getAdminReportsSummary(query);
  const csv = buildReportsCsv(summary);

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "REPORT_EXPORTED",
      resourceType: "Report",
      resourceId: null,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      details: {
        from: summary.from,
        to: summary.to,
        format: query.format
      }
    }
  });

  return {
    filename: `verifieddoc-report-${summary.from.slice(0, 10)}_${summary.to.slice(0, 10)}.csv`,
    contentType: "text/csv; charset=utf-8",
    body: csv,
    summary
  };
}
