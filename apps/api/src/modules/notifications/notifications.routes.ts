import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validateQuery } from "../../middleware/validate.js";
import {
  listNotificationsHandler,
  markAllNotificationsReadHandler,
  markNotificationReadHandler
} from "./notifications.handlers.js";
import { listNotificationsQuerySchema } from "./notifications.schemas.js";

export const notificationsRouter = Router();

notificationsRouter.get(
  "/",
  authenticate,
  validateQuery(listNotificationsQuerySchema),
  listNotificationsHandler
);

// More specific path before :notificationId
notificationsRouter.patch("/read-all", authenticate, markAllNotificationsReadHandler);

notificationsRouter.patch(
  "/:notificationId/read",
  authenticate,
  markNotificationReadHandler
);
