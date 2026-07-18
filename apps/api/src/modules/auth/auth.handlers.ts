import type { Request, Response } from "express";
import {
  getAuthenticatedUser,
  loginUser,
  logoutUser,
  refreshSession,
  registerUser
} from "./auth.service.js";

function getSessionContext(req: Request) {
  return {
    userAgent: req.get("user-agent") ?? undefined,
    ipAddress: req.ip
  };
}

export async function registerHandler(req: Request, res: Response) {
  const session = await registerUser(req.body, getSessionContext(req));
  res.status(201).json(session);
}

export async function loginHandler(req: Request, res: Response) {
  const session = await loginUser(req.body, getSessionContext(req));
  res.status(200).json(session);
}

export async function refreshHandler(req: Request, res: Response) {
  const session = await refreshSession(req.body, getSessionContext(req));
  res.status(200).json(session);
}

export async function logoutHandler(req: Request, res: Response) {
  await logoutUser(req.body);
  res.status(204).send();
}

export async function meHandler(req: Request, res: Response) {
  const user = await getAuthenticatedUser(req.user!.id);
  res.status(200).json({ user });
}
