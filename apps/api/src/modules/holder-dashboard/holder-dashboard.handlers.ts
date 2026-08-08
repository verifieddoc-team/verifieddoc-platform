import type { Request, Response } from "express";
import { AppError } from "../../lib/errors.js";
import { getRouteParam } from "../../lib/route-params.js";
import type {
  HolderActivityQuery,
  HolderVerificationRequestsQuery,
  PersonalDocumentUploadUrlInput
} from "./holder-dashboard.schemas.js";
import {
  completePersonalDocumentUpload,
  createPersonalDocumentUploadUrl,
  deletePersonalDocument,
  getHolderDashboard,
  listHolderActivity,
  listHolderVerificationRequests,
  listPersonalDocuments
} from "./holder-dashboard.service.js";

function getDocumentId(req: Request): string {
  try {
    return getRouteParam(req.params.documentId, "documentId");
  } catch {
    throw new AppError(400, "VALIDATION_ERROR", "Document ID is required");
  }
}

export async function getHolderDashboardHandler(req: Request, res: Response) {
  const dashboard = await getHolderDashboard(req.user!.id);
  res.status(200).json(dashboard);
}

export async function listHolderActivityHandler(req: Request, res: Response) {
  const result = await listHolderActivity(req.user!.id, req.validatedQuery as HolderActivityQuery);
  res.status(200).json(result);
}

export async function listHolderVerificationRequestsHandler(req: Request, res: Response) {
  const result = await listHolderVerificationRequests(
    req.user!.id,
    req.validatedQuery as HolderVerificationRequestsQuery
  );
  res.status(200).json(result);
}

export async function listPersonalDocumentsHandler(req: Request, res: Response) {
  const result = await listPersonalDocuments(req.user!.id);
  res.status(200).json(result);
}

export async function createPersonalDocumentUploadUrlHandler(req: Request, res: Response) {
  const result = await createPersonalDocumentUploadUrl(
    req.user!.id,
    req.body as PersonalDocumentUploadUrlInput
  );
  res.status(201).json(result);
}

export async function completePersonalDocumentUploadHandler(req: Request, res: Response) {
  const body = (req.body ?? {}) as { fileContent?: string };
  const result = await completePersonalDocumentUpload(req.user!.id, getDocumentId(req), {
    fileContent: typeof body.fileContent === "string" ? body.fileContent : undefined
  });
  res.status(200).json(result);
}

export async function deletePersonalDocumentHandler(req: Request, res: Response) {
  const result = await deletePersonalDocument(req.user!.id, getDocumentId(req));
  res.status(200).json(result);
}
