import type { RecipientInvitation } from "@prisma/client";
import { env } from "../config/env.js";
import {
  computeInvitationState,
  normalizeInvitationEmail,
  type InvitationState
} from "./invitations.js";

export interface SafeRecipientInvitationSummary {
  id: string;
  email: string;
  createdAt: Date;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  state: InvitationState;
}

export interface CreateRecipientInvitationResponse {
  invitation: SafeRecipientInvitationSummary;
  token: string;
  invitationPath: string;
  invitationUrl: string;
}

export function buildRecipientInvitationActiveKey(organizationId: string, email: string): string {
  return `${organizationId}:${normalizeInvitationEmail(email)}`;
}

export function buildRecipientInvitationPath(token: string): string {
  return `/recipient-invitations/accept#token=${encodeURIComponent(token)}`;
}

export function buildRecipientInvitationUrl(token: string): string {
  const baseUrl = env.PUBLIC_WEB_URL.replace(/\/$/, "");
  return `${baseUrl}${buildRecipientInvitationPath(token)}`;
}

export function toSafeRecipientInvitationSummary(
  invitation: RecipientInvitation,
  now: Date = new Date()
): SafeRecipientInvitationSummary {
  return {
    id: invitation.id,
    email: invitation.email,
    createdAt: invitation.createdAt,
    expiresAt: invitation.expiresAt,
    acceptedAt: invitation.acceptedAt,
    revokedAt: invitation.revokedAt,
    state: computeInvitationState(invitation, now)
  };
}

export function isRecipientInvitationPending(
  invitation: Pick<RecipientInvitation, "acceptedAt" | "revokedAt" | "expiresAt" | "activeKey">,
  now: Date = new Date()
): boolean {
  return (
    invitation.activeKey !== null &&
    invitation.acceptedAt === null &&
    invitation.revokedAt === null &&
    invitation.expiresAt.getTime() > now.getTime()
  );
}
