import bcrypt from "bcryptjs";
import {
  CredentialStatus,
  OrganizationRole,
  OrganizationStatus,
  PlatformRole
} from "@prisma/client";
import {
  DEMO_ACCOUNTS,
  DEMO_ORGANIZATION_SLUG,
  validateDemoSeedInput
} from "./demo-seed-policy.js";
import { prisma } from "../src/lib/prisma.js";

const BCRYPT_ROUNDS = 12;

export interface DemoSeedInput {
  nodeEnv: string;
  allowDemoSeed: boolean;
  demoPassword?: string;
}

export interface DemoSeedSummary {
  organizationSlug: string;
  accounts: typeof DEMO_ACCOUNTS;
  credentials: {
    activeReferenceNo: string;
    expiredReferenceNo: string;
    revokedReferenceNo: string;
  };
}

export async function seedDemoData(input: DemoSeedInput): Promise<DemoSeedSummary> {
  const password = validateDemoSeedInput(input);
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const now = new Date();

  const platformAdmin = await prisma.user.upsert({
    where: { email: DEMO_ACCOUNTS.platformAdmin },
    update: {
      firstName: "Demo",
      lastName: "PlatformAdmin",
      role: PlatformRole.PLATFORM_ADMIN
    },
    create: {
      email: DEMO_ACCOUNTS.platformAdmin,
      passwordHash,
      firstName: "Demo",
      lastName: "PlatformAdmin",
      role: PlatformRole.PLATFORM_ADMIN
    }
  });

  const orgAdmin = await prisma.user.upsert({
    where: { email: DEMO_ACCOUNTS.orgAdmin },
    update: { firstName: "Demo", lastName: "OrgAdmin", role: PlatformRole.HOLDER },
    create: {
      email: DEMO_ACCOUNTS.orgAdmin,
      passwordHash,
      firstName: "Demo",
      lastName: "OrgAdmin",
      role: PlatformRole.HOLDER
    }
  });

  const issuer = await prisma.user.upsert({
    where: { email: DEMO_ACCOUNTS.issuer },
    update: { firstName: "Demo", lastName: "Issuer", role: PlatformRole.HOLDER },
    create: {
      email: DEMO_ACCOUNTS.issuer,
      passwordHash,
      firstName: "Demo",
      lastName: "Issuer",
      role: PlatformRole.HOLDER
    }
  });

  const holder = await prisma.user.upsert({
    where: { email: DEMO_ACCOUNTS.holder },
    update: { firstName: "Demo", lastName: "Holder", role: PlatformRole.HOLDER },
    create: {
      email: DEMO_ACCOUNTS.holder,
      passwordHash,
      firstName: "Demo",
      lastName: "Holder",
      role: PlatformRole.HOLDER
    }
  });

  await prisma.user.upsert({
    where: { email: DEMO_ACCOUNTS.verifier },
    update: { firstName: "Demo", lastName: "Verifier", role: PlatformRole.VERIFIER },
    create: {
      email: DEMO_ACCOUNTS.verifier,
      passwordHash,
      firstName: "Demo",
      lastName: "Verifier",
      role: PlatformRole.VERIFIER
    }
  });

  const organization = await prisma.organization.upsert({
    where: { slug: DEMO_ORGANIZATION_SLUG },
    update: {
      name: "Demo Northwind Training",
      status: OrganizationStatus.VERIFIED,
      reviewedAt: now,
      reviewedById: platformAdmin.id,
      contactEmail: DEMO_ACCOUNTS.orgAdmin,
      country: "Canada",
      description: "Fictional demo organization for VerifiedDoc development."
    },
    create: {
      name: "Demo Northwind Training",
      slug: DEMO_ORGANIZATION_SLUG,
      registrationNumber: "DEMO-NW-001",
      website: "https://northwind.example.test",
      contactEmail: DEMO_ACCOUNTS.orgAdmin,
      country: "Canada",
      description: "Fictional demo organization for VerifiedDoc development.",
      status: OrganizationStatus.VERIFIED,
      reviewedAt: now,
      reviewedById: platformAdmin.id
    }
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: orgAdmin.id
      }
    },
    update: { role: OrganizationRole.ORGANIZATION_ADMIN },
    create: {
      organizationId: organization.id,
      userId: orgAdmin.id,
      role: OrganizationRole.ORGANIZATION_ADMIN
    }
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: issuer.id
      }
    },
    update: { role: OrganizationRole.ORGANIZATION_ISSUER },
    create: {
      organizationId: organization.id,
      userId: issuer.id,
      role: OrganizationRole.ORGANIZATION_ISSUER
    }
  });

  const activeReferenceNo = "DEMO-ACTIVE-001";
  const expiredReferenceNo = "DEMO-EXPIRED-001";
  const revokedReferenceNo = "DEMO-REVOKED-001";

  const activeCredential = await prisma.credential.upsert({
    where: {
      organizationId_referenceNo: {
        organizationId: organization.id,
        referenceNo: activeReferenceNo
      }
    },
    update: {
      title: "Demo Workplace Safety Certificate",
      status: CredentialStatus.ACTIVE,
      expiresAt: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
      metadata: {
        level: "Intermediate",
        jurisdiction: "Demo Province",
        trainingHours: 24
      }
    },
    create: {
      title: "Demo Workplace Safety Certificate",
      credentialType: "WORKPLACE_SAFETY",
      referenceNo: activeReferenceNo,
      description: "Fictional active credential for demo use.",
      issuedAt: now,
      expiresAt: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
      metadata: {
        level: "Intermediate",
        jurisdiction: "Demo Province",
        trainingHours: 24
      },
      organizationId: organization.id,
      holderId: holder.id,
      issuedById: issuer.id,
      status: CredentialStatus.ACTIVE
    }
  });

  await prisma.credential.upsert({
    where: {
      organizationId_referenceNo: {
        organizationId: organization.id,
        referenceNo: expiredReferenceNo
      }
    },
    update: {
      title: "Demo Expired First Aid Certificate",
      status: CredentialStatus.EXPIRED,
      expiresAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      metadata: {
        level: "Basic",
        jurisdiction: "Demo Province"
      }
    },
    create: {
      title: "Demo Expired First Aid Certificate",
      credentialType: "FIRST_AID",
      referenceNo: expiredReferenceNo,
      description: "Fictional expired credential for demo use.",
      issuedAt: new Date(now.getTime() - 400 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      metadata: {
        level: "Basic",
        jurisdiction: "Demo Province"
      },
      organizationId: organization.id,
      holderId: holder.id,
      issuedById: issuer.id,
      status: CredentialStatus.EXPIRED
    }
  });

  await prisma.credential.upsert({
    where: {
      organizationId_referenceNo: {
        organizationId: organization.id,
        referenceNo: revokedReferenceNo
      }
    },
    update: {
      title: "Demo Revoked Equipment Certificate",
      status: CredentialStatus.REVOKED,
      revokedAt: now,
      revokedById: issuer.id,
      revocationReason: "Fictional demo revocation.",
      metadata: {
        equipmentType: "Forklift",
        jurisdiction: "Demo Province"
      }
    },
    create: {
      title: "Demo Revoked Equipment Certificate",
      credentialType: "EQUIPMENT_OPERATION",
      referenceNo: revokedReferenceNo,
      description: "Fictional revoked credential for demo use.",
      issuedAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      metadata: {
        equipmentType: "Forklift",
        jurisdiction: "Demo Province"
      },
      organizationId: organization.id,
      holderId: holder.id,
      issuedById: issuer.id,
      status: CredentialStatus.REVOKED,
      revokedAt: now,
      revokedById: issuer.id,
      revocationReason: "Fictional demo revocation."
    }
  });

  await prisma.auditLog.deleteMany({
    where: {
      organizationId: organization.id,
      action: { in: ["ORGANIZATION_APPROVED", "CREDENTIAL_ISSUED"] },
      details: {
        path: ["seeded"],
        equals: true
      }
    }
  });

  await prisma.auditLog.createMany({
    data: [
      {
        actorId: platformAdmin.id,
        organizationId: organization.id,
        action: "ORGANIZATION_APPROVED",
        resourceType: "Organization",
        resourceId: organization.id,
        details: {
          decision: "APPROVE",
          seeded: true
        }
      },
      {
        actorId: issuer.id,
        organizationId: organization.id,
        action: "CREDENTIAL_ISSUED",
        resourceType: "Credential",
        resourceId: activeCredential.id,
        details: {
          referenceNo: activeReferenceNo,
          seeded: true
        }
      }
    ]
  });

  return {
    organizationSlug: DEMO_ORGANIZATION_SLUG,
    accounts: DEMO_ACCOUNTS,
    credentials: {
      activeReferenceNo,
      expiredReferenceNo,
      revokedReferenceNo
    }
  };
}
