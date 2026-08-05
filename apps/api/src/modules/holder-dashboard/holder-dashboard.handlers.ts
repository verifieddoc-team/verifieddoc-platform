import type { Request, Response } from "express";
import { getHolderDashboard } from "./holder-dashboard.service.js";

export async function getHolderDashboardHandler(req: Request, res: Response) {
  const dashboard = await getHolderDashboard(req.user!.id);
  res.status(200).json(dashboard);
}
