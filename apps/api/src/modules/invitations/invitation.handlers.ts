import type { Request, Response } from "express";
import { AppError } from "../../lib/errors.js";
import { getRouteParam } from "../../lib/route-params.js";
import {
  acceptOrganizationInvitation,
  createOrganizationInvitation,
  listOrganizationInvitations,
  revokeOrganizationInvitation
} from "./invitation.service.js";

function getAuditContext(req: Request) {
  return {
    ipAddress: req.ip,
    userAgent: req.get("user-agent") ?? undefined
  };
}

function getInvitationId(req: Request): string {
  try {
    return getRouteParam(req.params.invitationId, "invitationId");
  } catch {
    throw new AppError(400, "VALIDATION_ERROR", "Invitation ID is required");
  }
}

export async function createInvitationHandler(req: Request, res: Response) {
  const result = await createOrganizationInvitation(
    req.organizationMembership!.organizationId,
    req.user!.id,
    req.body,
    getAuditContext(req)
  );
  res.status(201).json(result);
}

export async function listInvitationsHandler(req: Request, res: Response) {
  const invitations = await listOrganizationInvitations(req.organizationMembership!.organizationId);
  res.status(200).json({ data: invitations });
}

export async function revokeInvitationHandler(req: Request, res: Response) {
  const invitation = await revokeOrganizationInvitation(
    req.organizationMembership!.organizationId,
    getInvitationId(req),
    req.user!.id,
    getAuditContext(req)
  );
  res.status(200).json({ invitation });
}

export async function acceptInvitationHandler(req: Request, res: Response) {
  const result = await acceptOrganizationInvitation(
    req.user!.id,
    req.user!.email,
    req.body.token,
    getAuditContext(req)
  );
  res.status(200).json(result);
}
