import { NotificationType, PlatformRole } from "@prisma/client";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createNotification } from "../src/lib/notifications.js";
import { prisma } from "../src/lib/prisma.js";
import {
  cleanupTestData,
  createTestUser,
  disconnectTestDatabase
} from "./helpers/testData.js";

const app = createApp();

describe("Notifications", () => {
  beforeAll(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("lists only the caller's notifications with unreadCount", async () => {
    const user = await createTestUser({ role: PlatformRole.HOLDER });
    const other = await createTestUser({ role: PlatformRole.HOLDER });

    const mineUnread = await createNotification(prisma, {
      userId: user.user.id,
      type: NotificationType.GENERIC,
      title: "Unread mine",
      message: "Hello"
    });
    await createNotification(prisma, {
      userId: user.user.id,
      type: NotificationType.GENERIC,
      title: "Read mine",
      message: "Already read"
    });
    await prisma.notification.updateMany({
      where: { userId: user.user.id, title: "Read mine" },
      data: { readAt: new Date() }
    });
    await createNotification(prisma, {
      userId: other.user.id,
      type: NotificationType.GENERIC,
      title: "Other user",
      message: "Should not appear"
    });

    const response = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${user.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.every((row: { id: string }) => row.id !== undefined)).toBe(true);
    expect(response.body.data.some((row: { title: string }) => row.title === "Other user")).toBe(
      false
    );
    expect(response.body.unreadCount).toBe(1);
    expect(response.body.data.some((row: { id: string }) => row.id === mineUnread.id)).toBe(true);

    const unreadOnly = await request(app)
      .get("/api/v1/notifications?unreadOnly=true")
      .set("Authorization", `Bearer ${user.accessToken}`);

    expect(unreadOnly.status).toBe(200);
    expect(unreadOnly.body.data).toHaveLength(1);
    expect(unreadOnly.body.data[0].id).toBe(mineUnread.id);
  });

  it("marks one and all notifications as read for the owner only", async () => {
    const user = await createTestUser({ role: PlatformRole.VERIFIER });
    const other = await createTestUser({ role: PlatformRole.VERIFIER });

    const mine = await createNotification(prisma, {
      userId: user.user.id,
      type: NotificationType.GENERIC,
      title: "Mark me",
      message: "Unread"
    });
    const second = await createNotification(prisma, {
      userId: user.user.id,
      type: NotificationType.GENERIC,
      title: "Mark me too",
      message: "Unread"
    });
    const foreign = await createNotification(prisma, {
      userId: other.user.id,
      type: NotificationType.GENERIC,
      title: "Foreign",
      message: "Unread"
    });

    const forbidden = await request(app)
      .patch(`/api/v1/notifications/${foreign.id}/read`)
      .set("Authorization", `Bearer ${user.accessToken}`);
    expect(forbidden.status).toBe(404);

    const markOne = await request(app)
      .patch(`/api/v1/notifications/${mine.id}/read`)
      .set("Authorization", `Bearer ${user.accessToken}`);
    expect(markOne.status).toBe(200);
    expect(markOne.body.notification.readAt).toBeTruthy();

    const markAll = await request(app)
      .patch("/api/v1/notifications/read-all")
      .set("Authorization", `Bearer ${user.accessToken}`);
    expect(markAll.status).toBe(200);
    expect(markAll.body.updatedCount).toBeGreaterThanOrEqual(1);

    const refreshed = await prisma.notification.findUnique({ where: { id: second.id } });
    expect(refreshed?.readAt).not.toBeNull();

    const stillUnreadForeign = await prisma.notification.findUnique({ where: { id: foreign.id } });
    expect(stillUnreadForeign?.readAt).toBeNull();
  });

  it("requires authentication", async () => {
    const response = await request(app).get("/api/v1/notifications");
    expect(response.status).toBe(401);
  });
});
