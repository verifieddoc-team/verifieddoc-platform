import { CredentialStatus, VerificationRequestStatus } from "@prisma/client";
import {
  buildCredentialListWhere,
  toSafeCredential,
  type SafeCredential
} from "../../lib/credentials.js";
import { AppError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import { startOfMonth } from "../../lib/verification.js";

const RECENT_LIMIT = 5;

export interface OrganizationDashboardStats {
  totalIssued: number;
  active: number;
  expired: number;
  revoked: number;
  activeRecipients: number;
  pendingVerificationRequests: number;
  issuedThisMonth: number;
}

export interface OrganizationDashboardVerificationRequest {
  id: string;
  status: VerificationRequestStatus;
  requesterNote: string | null;
  createdAt: Date;
  credential: {
    id: string;
    publicId: string;
    title: string;
  };
  requestedBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface OrganizationDashboardResponse {
  stats: OrganizationDashboardStats;
  recentCredentials: SafeCredential[];
  recentVerificationRequests: OrganizationDashboardVerificationRequest[];
}

export async function getOrganizationDashboard(
  organizationId: string
): Promise<OrganizationDashboardResponse> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true, slug: true }
  });

  if (!organization) {
    throw new AppError(404, "NOT_FOUND", "Organization not found");
  }

  const now = new Date();
  const monthStart = startOfMonth(now);
  const orgFilter = { organizationId };

  const [
    totalIssued,
    active,
    expired,
    revoked,
    activeRecipients,
    pendingVerificationRequests,
    issuedThisMonth,
    recentCredentials,
    recentVerificationRequests
  ] = await Promise.all([
    prisma.credential.count({ where: orgFilter }),
    prisma.credential.count({
      where: buildCredentialListWhere(orgFilter, CredentialStatus.ACTIVE, now)
    }),
    prisma.credential.count({
      where: buildCredentialListWhere(orgFilter, CredentialStatus.EXPIRED, now)
    }),
    prisma.credential.count({
      where: buildCredentialListWhere(orgFilter, CredentialStatus.REVOKED, now)
    }),
    prisma.organizationRecipient.count({ where: orgFilter }),
    prisma.verificationRequest.count({
      where: {
        organizationId,
        status: VerificationRequestStatus.PENDING
      }
    }),
    prisma.credential.count({
      where: {
        organizationId,
        issuedAt: { gte: monthStart }
      }
    }),
    prisma.credential.findMany({
      where: orgFilter,
      orderBy: { issuedAt: "desc" },
      take: RECENT_LIMIT
    }),
    prisma.verificationRequest.findMany({
      where: { organizationId },
      select: {
        id: true,
        status: true,
        requesterNote: true,
        createdAt: true,
        credential: {
          select: {
            id: true,
            publicId: true,
            title: true
          }
        },
        requestedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: RECENT_LIMIT
    })
  ]);

  return {
    stats: {
      totalIssued,
      active,
      expired,
      revoked,
      activeRecipients,
      pendingVerificationRequests,
      issuedThisMonth
    },
    recentCredentials: recentCredentials.map((credential) =>
      toSafeCredential(credential, organization)
    ),
    recentVerificationRequests
  };
}
