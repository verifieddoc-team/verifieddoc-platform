import type { Request, Response } from "express";
import { AppError } from "../../lib/errors.js";
import { getRouteParam } from "../../lib/route-params.js";
import {
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead
} from "./notifications.service.js";
import type { ListNotificationsQuery } from "./notifications.schemas.js";

function getNotificationId(req: Request): string {
  try {
    return getRouteParam(req.params.notificationId, "notificationId");
  } catch {
    throw new AppError(400, "VALIDATION_ERROR", "Notification ID is required");
  }
}

export async function listNotificationsHandler(req: Request, res: Response) {
  const result = await listNotificationsForUser(
    req.user!.id,
    req.validatedQuery as ListNotificationsQuery
  );
  res.status(200).json(result);
}

export async function markNotificationReadHandler(req: Request, res: Response) {
  const notification = await markNotificationRead(req.user!.id, getNotificationId(req));
  res.status(200).json({ notification });
}

export async function markAllNotificationsReadHandler(req: Request, res: Response) {
  const result = await markAllNotificationsRead(req.user!.id);
  res.status(200).json(result);
}
