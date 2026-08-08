import type { Request, Response } from "express";
import {
  changePassword,
  confirmPasswordReset,
  getAuthenticatedUser,
  loginUser,
  logoutUser,
  refreshSession,
  registerUser,
  requestPasswordReset,
  resendEmailVerification,
  updateProfile,
  verifyEmailVerification,
  verifyPasswordResetOtp
} from "./auth.service.js";

function getSessionContext(req: Request) {
  return {
    userAgent: req.get("user-agent") ?? undefined,
    ipAddress: req.ip
  };
}

export async function registerHandler(req: Request, res: Response) {
  const result = await registerUser(req.body, getSessionContext(req));
  res.status(201).json(result);
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

export async function updateProfileHandler(req: Request, res: Response) {
  const user = await updateProfile(req.user!.id, req.body, getSessionContext(req));
  res.status(200).json({ user });
}

export async function changePasswordHandler(req: Request, res: Response) {
  await changePassword(req.user!.id, req.body, getSessionContext(req));
  res.status(204).send();
}

export async function passwordResetRequestHandler(req: Request, res: Response) {
  const result = await requestPasswordReset(req.body, getSessionContext(req));
  res.status(202).json(result);
}

export async function passwordResetVerifyHandler(req: Request, res: Response) {
  const result = await verifyPasswordResetOtp(req.body);
  res.status(200).json(result);
}

export async function passwordResetConfirmHandler(req: Request, res: Response) {
  await confirmPasswordReset(req.body, getSessionContext(req));
  res.status(204).send();
}

export async function verifyEmailHandler(req: Request, res: Response) {
  const session = await verifyEmailVerification(req.body, getSessionContext(req));
  res.status(200).json(session);
}

export async function resendEmailVerificationHandler(req: Request, res: Response) {
  const result = await resendEmailVerification(req.body, getSessionContext(req));
  res.status(202).json(result);
}
