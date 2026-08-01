import type { Request, Response } from "express";
import { AppError } from "../../lib/errors.js";
import { getRouteParam } from "../../lib/route-params.js";
import type {
  HolderCredentialListQuery,
  OrganizationCredentialListQuery
} from "./credential.schemas.js";
import {
  getCredentialForAuthorizedUser,
  issueCredential,
  listHolderCredentials,
  listOrganizationCredentials,
  revokeCredential
} from "./credential.service.js";

function getAuditContext(req: Request) {
  return {
    ipAddress: req.ip,
    userAgent: req.get("user-agent") ?? undefined
  };
}

function getOrganizationId(req: Request): string {
  try {
    return getRouteParam(req.params.organizationId, "organizationId");
  } catch {
    throw new AppError(400, "VALIDATION_ERROR", "Organization ID is required");
  }
}

function getCredentialId(req: Request): string {
  try {
    return getRouteParam(req.params.credentialId, "credentialId");
  } catch {
    throw new AppError(400, "VALIDATION_ERROR", "Credential ID is required");
  }
}

export async function issueCredentialHandler(req: Request, res: Response) {
  const credential = await issueCredential(
    getOrganizationId(req),
    req.user!.id,
    req.body,
    getAuditContext(req)
  );
  res.status(201).json({ credential });
}

export async function listHolderCredentialsHandler(req: Request, res: Response) {
  const result = await listHolderCredentials(
    req.user!.id,
    req.validatedQuery as HolderCredentialListQuery
  );
  res.status(200).json(result);
}

export async function getCredentialHandler(req: Request, res: Response) {
  const credential = await getCredentialForAuthorizedUser(req.user!.id, getCredentialId(req));
  res.status(200).json({ credential });
}

export async function listOrganizationCredentialsHandler(req: Request, res: Response) {
  const result = await listOrganizationCredentials(
    req.user!.id,
    getOrganizationId(req),
    req.validatedQuery as OrganizationCredentialListQuery
  );
  res.status(200).json(result);
}

export async function revokeCredentialHandler(req: Request, res: Response) {
  const credential = await revokeCredential(
    req.user!.id,
    getOrganizationId(req),
    getCredentialId(req),
    req.body,
    getAuditContext(req)
  );
  res.status(200).json({ credential });
}
