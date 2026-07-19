import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";

export async function readyHandler(_req: Request, res: Response) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "ready", service: "verifieddoc-api" });
  } catch {
    res.status(503).json({ status: "unavailable", service: "verifieddoc-api" });
  }
}
