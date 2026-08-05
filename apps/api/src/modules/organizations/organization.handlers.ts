import type { Request, Response } from "express";
import { AppError } from "../../lib/errors.js";
import { getRouteParam } from "../../lib/route-params.js";
import { getOrganizationDashboard } from "./organization-dashboard.service.js";
import {
  adminListRegistrationDocuments,
  completeRegistrationDocumentUpload,
  createRegistrationDocumentUploadUrl,
  deleteRegistrationDocument,
  listRegistrationDocuments,
  reviewRegistrationDocument
} from "./organization-document.service.js";
import {
  getOrganizationVerificationRequest,
  listOrganizationVerificationRequests,
  reviewOrganizationVerificationRequest
} from "./organization-verification.service.js";
import {
  applyForOrganization,
  getOrganizationForMember,
  listOrganizationMembers,
  listOrganizationsForAdmin,
  listOrganizationsForUser,
  reviewOrganization,
  updateOrganizationProfile
} from "./organization.service.js";
import type {
  AdminOrganizationListQuery,
  OrganizationVerificationRequestsQuery,
  RegistrationDocumentUploadUrlInput,
  ReviewRegistrationDocumentInput,
  ReviewVerificationRequestInput,
  UpdateOrganizationInput
} from "./organization.schemas.js";

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

function getDocumentId(req: Request): string {
  try {
    return getRouteParam(req.params.documentId, "documentId");
  } catch {
    throw new AppError(400, "VALIDATION_ERROR", "Document ID is required");
  }
}

function getAuditContext(req: Request) {
  return {
    ipAddress: req.ip,
    userAgent: req.get("user-agent") ?? undefined
  };
}

export async function applyOrganizationHandler(req: Request, res: Response) {
  const result = await applyForOrganization(req.user!.id, req.body);
  res.status(201).json(result);
}

export async function listMyOrganizationsHandler(req: Request, res: Response) {
  const organizations = await listOrganizationsForUser(req.user!.id);
  res.status(200).json({ organizations });
}

export async function getOrganizationHandler(req: Request, res: Response) {
  const result = await getOrganizationForMember(req.user!.id, getOrganizationId(req));
  res.status(200).json(result);
}

export async function updateOrganizationHandler(req: Request, res: Response) {
  const organization = await updateOrganizationProfile(
    getOrganizationId(req),
    req.body as UpdateOrganizationInput,
    req.user!.id,
    getAuditContext(req)
  );
  res.status(200).json({ organization });
}

export async function getOrganizationDashboardHandler(req: Request, res: Response) {
  const dashboard = await getOrganizationDashboard(getOrganizationId(req));
  res.status(200).json(dashboard);
}

export async function listOrganizationMembersHandler(req: Request, res: Response) {
  const members = await listOrganizationMembers(getOrganizationId(req));
  res.status(200).json({ members });
}

export async function listOrganizationVerificationRequestsHandler(req: Request, res: Response) {
  const result = await listOrganizationVerificationRequests(
    getOrganizationId(req),
    req.validatedQuery as OrganizationVerificationRequestsQuery
  );
  res.status(200).json(result);
}

export async function getOrganizationVerificationRequestHandler(req: Request, res: Response) {
  const result = await getOrganizationVerificationRequest(getOrganizationId(req), getRequestId(req));
  res.status(200).json(result);
}

export async function reviewOrganizationVerificationRequestHandler(req: Request, res: Response) {
  const result = await reviewOrganizationVerificationRequest(
    getOrganizationId(req),
    getRequestId(req),
    req.user!.id,
    req.body as ReviewVerificationRequestInput,
    getAuditContext(req)
  );
  res.status(200).json(result);
}

export async function createRegistrationDocumentUploadUrlHandler(req: Request, res: Response) {
  const result = await createRegistrationDocumentUploadUrl(
    getOrganizationId(req),
    req.user!.id,
    req.body as RegistrationDocumentUploadUrlInput
  );
  res.status(201).json(result);
}

export async function completeRegistrationDocumentUploadHandler(req: Request, res: Response) {
  const result = await completeRegistrationDocumentUpload(
    getOrganizationId(req),
    getDocumentId(req),
    { fileContent: req.body?.fileContent }
  );
  res.status(200).json(result);
}

export async function listRegistrationDocumentsHandler(req: Request, res: Response) {
  const result = await listRegistrationDocuments(getOrganizationId(req));
  res.status(200).json(result);
}

export async function deleteRegistrationDocumentHandler(req: Request, res: Response) {
  const result = await deleteRegistrationDocument(getOrganizationId(req), getDocumentId(req));
  res.status(200).json(result);
}

export async function adminListRegistrationDocumentsHandler(req: Request, res: Response) {
  const result = await adminListRegistrationDocuments(getOrganizationId(req));
  res.status(200).json(result);
}

export async function adminReviewRegistrationDocumentHandler(req: Request, res: Response) {
  const result = await reviewRegistrationDocument(
    getOrganizationId(req),
    getDocumentId(req),
    req.user!.id,
    req.body as ReviewRegistrationDocumentInput,
    getAuditContext(req)
  );
  res.status(200).json(result);
}

export async function adminListOrganizationsHandler(req: Request, res: Response) {
  const result = await listOrganizationsForAdmin(req.validatedQuery as AdminOrganizationListQuery);
  res.status(200).json(result);
}

export async function reviewOrganizationHandler(req: Request, res: Response) {
  const organization = await reviewOrganization(
    getOrganizationId(req),
    req.user!.id,
    req.body,
    getAuditContext(req)
  );
  res.status(200).json({ organization });
}
