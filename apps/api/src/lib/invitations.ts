import { OrganizationRole, type OrganizationInvitation } from "@prisma/client";
import { env } from "../config/env.js";

export type InvitationState = "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";

export interface SafeInvitationSummary {
  id: string;
  email: string;
  role: OrganizationRole;
  createdAt: Date;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  state: InvitationState;
}

export interface CreateInvitationResponse {
  invitation: SafeInvitationSummary;
  token: string;
  invitationPath: string;
  invitationUrl: string;
}

export function normalizeInvitationEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function buildInvitationActiveKey(organizationId: string, email: string): string {
  return `${organizationId}:${normalizeInvitationEmail(email)}`;
}

export function buildInvitationPath(token: string): string {
  return `/invitations/accept#token=${encodeURIComponent(token)}`;
}

export function buildInvitationUrl(token: string): string {
  const baseUrl = env.PUBLIC_WEB_URL.replace(/\/$/, "");
  return `${baseUrl}${buildInvitationPath(token)}`;
}

export function computeInvitationState(
  invitation: Pick<OrganizationInvitation, "acceptedAt" | "revokedAt" | "expiresAt">,
  now: Date = new Date()
): InvitationState {
  if (invitation.acceptedAt) {
    return "ACCEPTED";
  }

  if (invitation.revokedAt) {
    return "REVOKED";
  }

  if (invitation.expiresAt.getTime() <= now.getTime()) {
    return "EXPIRED";
  }

  return "PENDING";
}

export function toSafeInvitationSummary(
  invitation: OrganizationInvitation,
  now: Date = new Date()
): SafeInvitationSummary {
  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    createdAt: invitation.createdAt,
    expiresAt: invitation.expiresAt,
    acceptedAt: invitation.acceptedAt,
    revokedAt: invitation.revokedAt,
    state: computeInvitationState(invitation, now)
  };
}

export function isInvitationPending(
  invitation: Pick<OrganizationInvitation, "acceptedAt" | "revokedAt" | "expiresAt" | "activeKey">,
  now: Date = new Date()
): boolean {
  return (
    invitation.activeKey !== null &&
    invitation.acceptedAt === null &&
    invitation.revokedAt === null &&
    invitation.expiresAt.getTime() > now.getTime()
  );
}
