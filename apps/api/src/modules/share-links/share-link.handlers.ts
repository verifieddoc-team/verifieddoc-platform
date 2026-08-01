import type { Request, Response } from "express";
import { AppError } from "../../lib/errors.js";
import { getRouteParam } from "../../lib/route-params.js";
import {
  createShareLink,
  listShareLinks,
  revokeShareLink,
  verifyCredentialByToken
} from "./share-link.service.js";

function getAuditContext(req: Request) {
  return {
    ipAddress: req.ip,
    userAgent: req.get("user-agent") ?? undefined
  };
}

function getCredentialId(req: Request): string {
  try {
    return getRouteParam(req.params.credentialId, "credentialId");
  } catch {
    throw new AppError(400, "VALIDATION_ERROR", "Credential ID is required");
  }
}

function getShareLinkId(req: Request): string {
  try {
    return getRouteParam(req.params.shareLinkId, "shareLinkId");
  } catch {
    throw new AppError(400, "VALIDATION_ERROR", "Share link ID is required");
  }
}

function getVerificationToken(req: Request): string {
  try {
    return getRouteParam(req.params.token, "token");
  } catch {
    throw new AppError(400, "VALIDATION_ERROR", "Verification token is required");
  }
}

export async function createShareLinkHandler(req: Request, res: Response) {
  const result = await createShareLink(
    req.user!.id,
    getCredentialId(req),
    req.body,
    getAuditContext(req)
  );
  res.status(201).json(result);
}

export async function listShareLinksHandler(req: Request, res: Response) {
  const shareLinks = await listShareLinks(req.user!.id, getCredentialId(req));
  res.status(200).json({ data: shareLinks });
}

export async function revokeShareLinkHandler(req: Request, res: Response) {
  const shareLink = await revokeShareLink(
    req.user!.id,
    getCredentialId(req),
    getShareLinkId(req),
    getAuditContext(req)
  );
  res.status(200).json({ shareLink });
}

export async function verifyCredentialHandler(req: Request, res: Response) {
  const result = await verifyCredentialByToken(getVerificationToken(req), getAuditContext(req));
  res.status(200).json(result);
}
