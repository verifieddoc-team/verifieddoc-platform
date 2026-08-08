import {
  CredentialStatus,
  NotificationType,
  VerificationRequestStatus,
  type Prisma
} from "@prisma/client";
import { computeEffectiveStatus } from "../../lib/credentials.js";
import { AppError } from "../../lib/errors.js";
import { createNotification } from "../../lib/notifications.js";
import { buildPaginationMetadata, type PaginatedResult } from "../../lib/organizations.js";
import { prisma } from "../../lib/prisma.js";
import type {
  OrganizationVerificationRequestsQuery,
  ReviewVerificationRequestInput
} from "./organization.schemas.js";

class VerificationRequestReviewClaimError extends Error {
  constructor() {
    super("Verification request review claim failed");
    this.name = "VerificationRequestReviewClaimError";
  }
}

const verificationRequestInclude = {
  credential: {
    select: {
      id: true,
      publicId: true,
      title: true,
      credentialType: true,
      status: true,
      expiresAt: true
    }
  },
  organization: { select: { id: true, name: true, slug: true } },
  holder: { select: { id: true, firstName: true, lastName: true, email: true } },
  requestedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
  reviewedBy: { select: { id: true, firstName: true, lastName: true } }
} as const;

function toOrganizationVerificationRequestSummary(request: {
  id: string;
  status: VerificationRequestStatus;
  requesterNote: string | null;
  reviewNote: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  credential: {
    id: string;
    publicId: string;
    title: string;
    credentialType: string;
    status: CredentialStatus;
    expiresAt: Date | null;
  };
  organization: { id: string; name: string; slug: string };
  holder: { id: string; firstName: string; lastName: string; email: string };
  requestedBy: { id: string; firstName: string; lastName: string; email: string };
  reviewedBy: { id: string; firstName: string; lastName: string } | null;
}) {
  return {
    id: request.id,
    status: request.status,
    requesterNote: request.requesterNote,
    reviewNote: request.reviewNote,
    reviewedAt: request.reviewedAt,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    credential: {
      id: request.credential.id,
      publicId: request.credential.publicId,
      title: request.credential.title,
      credentialType: request.credential.credentialType,
      status: request.credential.status,
      effectiveStatus: computeEffectiveStatus(request.credential)
    },
    organization: request.organization,
    holder: {
      id: request.holder.id,
      firstName: request.holder.firstName,
      lastName: request.holder.lastName,
      email: request.holder.email
    },
    requestedBy: {
      id: request.requestedBy.id,
      firstName: request.requestedBy.firstName,
      lastName: request.requestedBy.lastName,
      email: request.requestedBy.email
    },
    reviewedBy: request.reviewedBy
      ? {
          id: request.reviewedBy.id,
          firstName: request.reviewedBy.firstName,
          lastName: request.reviewedBy.lastName
        }
      : null
  };
}

export async function listOrganizationVerificationRequests(
  organizationId: string,
  query: OrganizationVerificationRequestsQuery
): Promise<PaginatedResult<ReturnType<typeof toOrganizationVerificationRequestSummary>>> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true }
  });

  if (!organization) {
    throw new AppError(404, "NOT_FOUND", "Organization not found");
  }

  const where: Prisma.VerificationRequestWhereInput = {
    organizationId,
    ...(query.status ? { status: query.status } : {})
  };
  const skip = (query.page - 1) * query.limit;

  const [total, requests] = await prisma.$transaction([
    prisma.verificationRequest.count({ where }),
    prisma.verificationRequest.findMany({
      where,
      include: verificationRequestInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take: query.limit
    })
  ]);

  return {
    data: requests.map((request) => toOrganizationVerificationRequestSummary(request)),
    pagination: buildPaginationMetadata(query.page, query.limit, total)
  };
}

export async function getOrganizationVerificationRequest(
  organizationId: string,
  requestId: string
) {
  const request = await prisma.verificationRequest.findFirst({
    where: { id: requestId, organizationId },
    include: verificationRequestInclude
  });

  if (!request) {
    throw new AppError(404, "NOT_FOUND", "Verification request not found");
  }

  return { request: toOrganizationVerificationRequestSummary(request) };
}

export async function reviewOrganizationVerificationRequest(
  organizationId: string,
  requestId: string,
  reviewerId: string,
  input: ReviewVerificationRequestInput,
  context: { ipAddress?: string; userAgent?: string } = {}
) {
  const nextStatus =
    input.decision === "APPROVE"
      ? VerificationRequestStatus.APPROVED
      : VerificationRequestStatus.REJECTED;

  try {
    const reviewed = await prisma.$transaction(async (tx) => {
      const claimResult = await tx.verificationRequest.updateMany({
        where: {
          id: requestId,
          organizationId,
          status: VerificationRequestStatus.PENDING
        },
        data: {
          status: nextStatus,
          reviewedAt: new Date(),
          reviewedById: reviewerId,
          reviewNote: input.note ?? null
        }
      });

      if (claimResult.count !== 1) {
        throw new VerificationRequestReviewClaimError();
      }

      const request = await tx.verificationRequest.findUniqueOrThrow({
        where: { id: requestId },
        include: {
          ...verificationRequestInclude,
          credential: {
            select: {
              ...verificationRequestInclude.credential.select,
              title: true
            }
          }
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: reviewerId,
          organizationId,
          action:
            input.decision === "APPROVE"
              ? "VERIFICATION_REQUEST_APPROVED"
              : "VERIFICATION_REQUEST_REJECTED",
          resourceType: "VerificationRequest",
          resourceId: requestId,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          details: {
            decision: input.decision,
            note: input.note
          }
        }
      });

      const decisionLabel = input.decision === "APPROVE" ? "approved" : "rejected";
      const message = `Your verification request for "${request.credential.title}" was ${decisionLabel}.`;

      await createNotification(tx, {
        userId: request.requestedById,
        type: NotificationType.VERIFICATION_REQUEST_REVIEWED,
        title: `Verification request ${decisionLabel}`,
        message,
        resourceType: "VerificationRequest",
        resourceId: request.id
      });

      await createNotification(tx, {
        userId: request.holderId,
        type: NotificationType.VERIFICATION_REQUEST_REVIEWED,
        title: `Verification request ${decisionLabel}`,
        message: `A verification request for your credential "${request.credential.title}" was ${decisionLabel}.`,
        resourceType: "VerificationRequest",
        resourceId: request.id
      });

      return request;
    });

    return { request: toOrganizationVerificationRequestSummary(reviewed) };
  } catch (error) {
    if (error instanceof VerificationRequestReviewClaimError) {
      const existing = await prisma.verificationRequest.findFirst({
        where: { id: requestId, organizationId },
        select: { id: true, status: true }
      });

      if (!existing) {
        throw new AppError(404, "NOT_FOUND", "Verification request not found");
      }

      throw new AppError(
        409,
        "REQUEST_ALREADY_REVIEWED",
        "This verification request has already been reviewed"
      );
    }

    throw error;
  }
}
