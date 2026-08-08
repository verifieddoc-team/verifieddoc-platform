import type { Request, Response } from "express";
import { AppError } from "../../lib/errors.js";
import { getRouteParam } from "../../lib/route-params.js";
import {
  acceptRecipientInvitation,
  createRecipientInvitation,
  listOrganizationRecipients,
  listRecipientInvitations,
  revokeRecipientInvitation
} from "./recipient.service.js";

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

export async function listRecipientsHandler(req: Request, res: Response) {
  const recipients = await listOrganizationRecipients(req.organizationMembership!.organizationId);
  res.status(200).json({ data: recipients });
}

export async function createRecipientInvitationHandler(req: Request, res: Response) {
  const result = await createRecipientInvitation(
    req.organizationMembership!.organizationId,
    req.user!.id,
    req.body,
    getAuditContext(req)
  );
  res.status(201).json(result);
}

export async function listRecipientInvitationsHandler(req: Request, res: Response) {
  const invitations = await listRecipientInvitations(req.organizationMembership!.organizationId);
  res.status(200).json({ data: invitations });
}

export async function revokeRecipientInvitationHandler(req: Request, res: Response) {
  const invitation = await revokeRecipientInvitation(
    req.organizationMembership!.organizationId,
    getInvitationId(req),
    req.user!.id,
    getAuditContext(req)
  );
  res.status(200).json({ invitation });
}

export async function acceptRecipientInvitationHandler(req: Request, res: Response) {
  const result = await acceptRecipientInvitation(
    req.user!.id,
    req.user!.email,
    req.body.token,
    getAuditContext(req)
  );
  res.status(200).json(result);
}
