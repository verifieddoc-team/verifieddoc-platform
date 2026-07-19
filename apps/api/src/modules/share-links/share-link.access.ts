import { AppError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import type { Credential } from "@prisma/client";

export async function assertCredentialHolder(userId: string, credentialId: string): Promise<Credential> {
  const credential = await prisma.credential.findUnique({
    where: { id: credentialId }
  });

  if (!credential) {
    throw new AppError(404, "NOT_FOUND", "Credential not found");
  }

  if (credential.holderId !== userId) {
    throw new AppError(403, "FORBIDDEN", "Only the credential holder can manage share links");
  }

  return credential;
}

export async function getShareLinkForCredential(credentialId: string, shareLinkId: string) {
  const shareLink = await prisma.shareLink.findUnique({
    where: { id: shareLinkId }
  });

  if (!shareLink) {
    throw new AppError(404, "NOT_FOUND", "Share link not found");
  }

  if (shareLink.credentialId !== credentialId) {
    throw new AppError(404, "NOT_FOUND", "Share link not found");
  }

  return shareLink;
}
