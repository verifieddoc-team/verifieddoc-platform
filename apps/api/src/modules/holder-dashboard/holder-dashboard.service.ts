import { CredentialStatus, PlatformRole } from "@prisma/client";
import {
  buildCredentialListWhere,
  toHolderCredentialSummary,
  type HolderCredentialSummary
} from "../../lib/credentials.js";
import { AppError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";

const RECENT_CREDENTIAL_LIMIT = 5;

export interface HolderDashboardHolder {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: typeof PlatformRole.HOLDER;
}

export interface HolderDashboardStats {
  total: number;
  active: number;
  expired: number;
  revoked: number;
}

export interface HolderDashboardResponse {
  holder: HolderDashboardHolder;
  stats: HolderDashboardStats;
  recentCredentials: HolderCredentialSummary[];
}

export async function getHolderDashboard(holderId: string): Promise<HolderDashboardResponse> {
  const holder = await prisma.user.findUnique({
    where: { id: holderId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true
    }
  });

  if (!holder || holder.role !== PlatformRole.HOLDER) {
    throw new AppError(403, "FORBIDDEN", "Insufficient permissions");
  }

  const now = new Date();
  const holderFilter = { holderId: holder.id };

  const [total, active, expired, revoked, recentCredentials] = await Promise.all([
    prisma.credential.count({ where: holderFilter }),
    prisma.credential.count({
      where: buildCredentialListWhere(holderFilter, CredentialStatus.ACTIVE, now)
    }),
    prisma.credential.count({
      where: buildCredentialListWhere(holderFilter, CredentialStatus.EXPIRED, now)
    }),
    prisma.credential.count({
      where: buildCredentialListWhere(holderFilter, CredentialStatus.REVOKED, now)
    }),
    prisma.credential.findMany({
      where: holderFilter,
      include: {
        organization: {
          select: {
            name: true,
            slug: true
          }
        }
      },
      orderBy: { issuedAt: "desc" },
      take: RECENT_CREDENTIAL_LIMIT
    })
  ]);

  return {
    holder: {
      id: holder.id,
      email: holder.email,
      firstName: holder.firstName,
      lastName: holder.lastName,
      role: PlatformRole.HOLDER
    },
    stats: {
      total,
      active,
      expired,
      revoked
    },
    recentCredentials: recentCredentials.map((credential) =>
      toHolderCredentialSummary(credential, credential.organization)
    )
  };
}
