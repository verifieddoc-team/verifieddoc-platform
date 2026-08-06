import {
  NotificationType,
  PlatformRole,
  type Notification,
  type Prisma
} from "@prisma/client";
import { prisma } from "./prisma.js";

export type NotificationDbClient = Prisma.TransactionClient | typeof prisma;

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  resourceType?: string | null;
  resourceId?: string | null;
}

export async function createNotification(
  db: NotificationDbClient,
  input: CreateNotificationInput
): Promise<Notification> {
  return db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      resourceType: input.resourceType ?? null,
      resourceId: input.resourceId ?? null
    }
  });
}

export async function notifyPlatformAdmins(
  db: NotificationDbClient,
  input: Omit<CreateNotificationInput, "userId">
): Promise<number> {
  const admins = await db.user.findMany({
    where: { role: PlatformRole.PLATFORM_ADMIN },
    select: { id: true }
  });

  if (admins.length === 0) {
    return 0;
  }

  await db.notification.createMany({
    data: admins.map((admin) => ({
      userId: admin.id,
      type: input.type,
      title: input.title,
      message: input.message,
      resourceType: input.resourceType ?? null,
      resourceId: input.resourceId ?? null
    }))
  });

  return admins.length;
}

export async function notifyPlatformAdminsOfFraudAlert(
  db: NotificationDbClient,
  alert: {
    id: string;
    type: string;
    title: string;
    severity: string;
  }
): Promise<number> {
  return notifyPlatformAdmins(db, {
    type: NotificationType.FRAUD_ALERT,
    title: `Fraud alert: ${alert.title}`,
    message: `A ${alert.severity} ${alert.type} alert was opened and requires review.`,
    resourceType: "FraudAlert",
    resourceId: alert.id
  });
}
