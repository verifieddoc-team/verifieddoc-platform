import type { Prisma } from "@prisma/client";
import { AppError } from "../../lib/errors.js";
import { buildPaginationMetadata, type PaginatedResult } from "../../lib/organizations.js";
import { prisma } from "../../lib/prisma.js";
import type { ListNotificationsQuery } from "./notifications.schemas.js";

export async function listNotificationsForUser(userId: string, query: ListNotificationsQuery) {
  const where: Prisma.NotificationWhereInput = {
    userId,
    ...(query.unreadOnly ? { readAt: null } : {})
  };

  const skip = (query.page - 1) * query.limit;

  const [total, data, unreadCount] = await prisma.$transaction([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: query.limit,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        resourceType: true,
        resourceId: true,
        readAt: true,
        createdAt: true
      }
    }),
    prisma.notification.count({
      where: { userId, readAt: null }
    })
  ]);

  const result: PaginatedResult<(typeof data)[number]> & { unreadCount: number } = {
    data,
    pagination: buildPaginationMetadata(query.page, query.limit, total),
    unreadCount
  };

  return result;
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const existing = await prisma.notification.findFirst({
    where: { id: notificationId, userId }
  });

  if (!existing) {
    throw new AppError(404, "NOT_FOUND", "Notification not found");
  }

  if (existing.readAt) {
    return existing;
  }

  await prisma.notification.updateMany({
    where: { id: notificationId, userId, readAt: null },
    data: { readAt: new Date() }
  });

  return prisma.notification.findFirstOrThrow({
    where: { id: notificationId, userId }
  });
}

export async function markAllNotificationsRead(userId: string) {
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() }
  });

  return { updatedCount: result.count };
}
