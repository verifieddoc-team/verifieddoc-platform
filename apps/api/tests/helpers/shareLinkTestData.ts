import type { Express } from "express";
import request from "supertest";
import {
  issueCredentialRequest,
  registerHolder,
  setupVerifiedOrganization
} from "./credentialTestData.js";

export async function createShareLinkRequest(
  app: Express,
  credentialId: string,
  accessToken: string,
  overrides: Record<string, unknown> = {}
) {
  return request(app)
    .post(`/api/v1/credentials/${credentialId}/share-links`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      expiresInHours: 24,
      ...overrides
    });
}

export async function listShareLinksRequest(app: Express, credentialId: string, accessToken: string) {
  return request(app)
    .get(`/api/v1/credentials/${credentialId}/share-links`)
    .set("Authorization", `Bearer ${accessToken}`);
}

export async function revokeShareLinkRequest(
  app: Express,
  credentialId: string,
  shareLinkId: string,
  accessToken: string
) {
  return request(app)
    .patch(`/api/v1/credentials/${credentialId}/share-links/${shareLinkId}/revoke`)
    .set("Authorization", `Bearer ${accessToken}`);
}

export async function verifyShareTokenRequest(app: Express, token: string) {
  return request(app).get(`/api/v1/verify/${token}`);
}

export async function setupHolderCredential(
  app: Express,
  issueOverrides: Record<string, unknown> = {}
) {
  const { admin, organizationId } = await setupVerifiedOrganization(app);
  const holder = await registerHolder(app);
  const issueResponse = await issueCredentialRequest(app, organizationId, admin.accessToken, {
    holderEmail: holder.payload.email,
    claims: {
      trainingSite: "Northwind Campus",
      completionScore: 92
    },
    ...issueOverrides
  });

  return {
    admin,
    organizationId,
    holder,
    credentialId: issueResponse.body.credential.id as string,
    credential: issueResponse.body.credential
  };
}
