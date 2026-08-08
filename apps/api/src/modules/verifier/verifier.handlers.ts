import type { Request, Response } from "express";
import { AppError } from "../../lib/errors.js";
import { getRouteParam } from "../../lib/route-params.js";
import {
  cancelVerificationRequest,
  completeFileVerification,
  createFileVerificationUploadUrl,
  createVerification,
  createVerificationRequest,
  getVerification,
  getVerificationRequest,
  getVerifierDashboard,
  listSavedOrganizations,
  listVerificationRequests,
  listVerifications,
  removeSavedOrganization,
  saveOrganization
} from "./verifier.service.js";
import type {
  CreateVerificationInput,
  CreateVerificationRequestInput,
  FileVerificationUploadUrlInput,
  ListVerificationRequestsQuery,
  ListVerificationsQuery,
  SaveOrganizationInput
} from "./verifier.schemas.js";

function getAuditContext(req: Request) {
  return {
    ipAddress: req.ip,
    userAgent: req.get("user-agent") ?? undefined
  };
}

function getVerificationId(req: Request): string {
  try {
    return getRouteParam(req.params.verificationId, "verificationId");
  } catch {
    throw new AppError(400, "VALIDATION_ERROR", "Verification ID is required");
  }
}

function getOrganizationId(req: Request): string {
  try {
    return getRouteParam(req.params.organizationId, "organizationId");
  } catch {
    throw new AppError(400, "VALIDATION_ERROR", "Organization ID is required");
  }
}

function getRequestId(req: Request): string {
  try {
    return getRouteParam(req.params.requestId, "requestId");
  } catch {
    throw new AppError(400, "VALIDATION_ERROR", "Request ID is required");
  }
}

function getUploadId(req: Request): string {
  try {
    return getRouteParam(req.params.uploadId, "uploadId");
  } catch {
    throw new AppError(400, "VALIDATION_ERROR", "Upload ID is required");
  }
}

export async function getVerifierDashboardHandler(req: Request, res: Response) {
  const dashboard = await getVerifierDashboard(req.user!.id);
  res.status(200).json(dashboard);
}

export async function createVerificationHandler(req: Request, res: Response) {
  const result = await createVerification(
    req.user!.id,
    req.body as CreateVerificationInput,
    getAuditContext(req)
  );
  res.status(200).json(result);
}

export async function listVerificationsHandler(req: Request, res: Response) {
  const result = await listVerifications(
    req.user!.id,
    req.validatedQuery as ListVerificationsQuery
  );
  res.status(200).json(result);
}

export async function getVerificationHandler(req: Request, res: Response) {
  const verification = await getVerification(req.user!.id, getVerificationId(req));
  res.status(200).json({ verification });
}

export async function listSavedOrganizationsHandler(req: Request, res: Response) {
  const result = await listSavedOrganizations(req.user!.id);
  res.status(200).json(result);
}

export async function saveOrganizationHandler(req: Request, res: Response) {
  const saved = await saveOrganization(req.user!.id, req.body as SaveOrganizationInput);
  res.status(201).json({ savedOrganization: saved });
}

export async function removeSavedOrganizationHandler(req: Request, res: Response) {
  const result = await removeSavedOrganization(req.user!.id, getOrganizationId(req));
  res.status(200).json(result);
}

export async function createVerificationRequestHandler(req: Request, res: Response) {
  const result = await createVerificationRequest(
    req.user!.id,
    req.body as CreateVerificationRequestInput
  );
  res.status(201).json(result);
}

export async function listVerificationRequestsHandler(req: Request, res: Response) {
  const result = await listVerificationRequests(
    req.user!.id,
    req.validatedQuery as ListVerificationRequestsQuery
  );
  res.status(200).json(result);
}

export async function getVerificationRequestHandler(req: Request, res: Response) {
  const result = await getVerificationRequest(req.user!.id, getRequestId(req));
  res.status(200).json(result);
}

export async function cancelVerificationRequestHandler(req: Request, res: Response) {
  const result = await cancelVerificationRequest(req.user!.id, getRequestId(req));
  res.status(200).json(result);
}

export async function createFileVerificationUploadUrlHandler(req: Request, res: Response) {
  const result = await createFileVerificationUploadUrl(
    req.user!.id,
    req.body as FileVerificationUploadUrlInput
  );
  res.status(201).json(result);
}

export async function completeFileVerificationHandler(req: Request, res: Response) {
  const body = (req.body ?? {}) as { fileContent?: string };
  const result = await completeFileVerification(req.user!.id, getUploadId(req), {
    ...getAuditContext(req),
    fileContent: typeof body.fileContent === "string" ? body.fileContent : undefined
  });
  res.status(200).json(result);
}
