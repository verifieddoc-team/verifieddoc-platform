import type { Request, Response } from "express";
import { updateUserProfile } from "./profile.service.js";

export async function updateProfileHandler(req: Request, res: Response) {
  const user = await updateUserProfile(req.user!.id, req.body);
  res.status(200).json({ user });
}
