import type {
  InvitationSummary,
  Organization,
  OrganizationMemberProfile,
  PublicVerificationResponse,
  SafeAuditLogEntry,
  SafeCredential,
  ShareLinkSummary,
} from "@verifieddoc/contracts";

const now = "2026-07-23T08:30:00.000Z";

export const demoOrganization: Organization = {
  id: "org_northwind_demo",
  name: "Northwind Training Institute",
  slug: "northwind-training",
  registrationNumber: "NW-DEMO-2026",
  website: "https://northwind.example.test",
  contactEmail: "contact@northwind.example.test",
  country: "Cameroon",
  description: "Fictional vocational and professional training provider.",
  status: "VERIFIED",
  rejectionReason: null,
  reviewedAt: "2026-07-18T12:00:00.000Z",
  reviewedById: "user_platform_admin_demo",
  createdAt: "2026-07-17T08:00:00.000Z",
  updatedAt: "2026-07-18T12:00:00.000Z",
};

export const demoCredentials: SafeCredential[] = [
  {
    id: "cred_active_demo",
    publicId: "VD-7K4P-92AX",
    title: "Backend Engineering Certificate",
    description: "Completed the applied backend engineering programme.",
    credentialType: "PROFESSIONAL_CERTIFICATE",
    referenceNo: "DEMO-ACTIVE-001",
    status: "ACTIVE",
    effectiveStatus: "ACTIVE",
    issuedAt: "2026-07-18T10:00:00.000Z",
    expiresAt: "2028-07-18T10:00:00.000Z",
    revokedAt: null,
    revocationReason: null,
    claims: {
      grade: "Distinction",
      cohort: "2026",
      hours: 240,
    },
    organization: {
      id: demoOrganization.id,
      name: demoOrganization.name,
      slug: demoOrganization.slug,
    },
    holder: {
      id: "holder_demo",
      email: "demo.holder@example.test",
      firstName: "Amara",
      lastName: "N.",
    },
  },
  {
    id: "cred_expired_demo",
    publicId: "VD-2M8Q-17KF",
    title: "Workplace Safety Training",
    description: "Workplace safety and emergency readiness training.",
    credentialType: "TRAINING_CERTIFICATE",
    referenceNo: "DEMO-EXPIRED-001",
    status: "ACTIVE",
    effectiveStatus: "EXPIRED",
    issuedAt: "2024-01-12T10:00:00.000Z",
    expiresAt: "2025-01-12T10:00:00.000Z",
    revokedAt: null,
    revocationReason: null,
    claims: { level: "Foundation", assessment: "Passed" },
    organization: {
      id: demoOrganization.id,
      name: demoOrganization.name,
      slug: demoOrganization.slug,
    },
    holder: {
      id: "holder_demo",
      email: "demo.holder@example.test",
      firstName: "Amara",
      lastName: "N.",
    },
  },
  {
    id: "cred_revoked_demo",
    publicId: "VD-9C3R-41TB",
    title: "Project Support Credential",
    description: "Project support and coordination credential.",
    credentialType: "EMPLOYMENT_CREDENTIAL",
    referenceNo: "DEMO-REVOKED-001",
    status: "REVOKED",
    effectiveStatus: "REVOKED",
    issuedAt: "2025-02-20T10:00:00.000Z",
    expiresAt: null,
    revokedAt: "2026-03-02T10:00:00.000Z",
    revocationReason: "The issuing organization replaced this record.",
    claims: { department: "Operations", contractType: "Project" },
    organization: {
      id: demoOrganization.id,
      name: demoOrganization.name,
      slug: demoOrganization.slug,
    },
    holder: {
      id: "holder_demo",
      email: "demo.holder@example.test",
      firstName: "Amara",
      lastName: "N.",
    },
  },
];

export const demoShareLinks: ShareLinkSummary[] = [
  {
    id: "share_demo_active",
    createdAt: "2026-07-22T09:00:00.000Z",
    expiresAt: "2026-07-29T09:00:00.000Z",
    revokedAt: null,
    maxViews: 10,
    viewCount: 2,
    lastViewedAt: "2026-07-23T07:45:00.000Z",
    disclosedClaims: ["grade", "cohort"],
    includeHolderName: true,
    includeReferenceNo: false,
    state: "ACTIVE",
    verificationUrl: "https://verifieddoc.example.test/verify/DEMO-VERIFIED-2026",
  },
];

export const demoMembers: OrganizationMemberProfile[] = [
  {
    user: {
      id: "org_admin_demo",
      email: "demo.org-admin@example.test",
      fullName: "Nadia Admin",
      firstName: "Nadia",
      lastName: "Admin",
      phone: null,
      status: "ACTIVE",
      role: "HOLDER",
      createdAt: now,
      updatedAt: now,
    },
    membershipRole: "ORGANIZATION_ADMIN",
    joinedAt: "2026-07-18T12:00:00.000Z",
  },
  {
    user: {
      id: "org_issuer_demo",
      email: "demo.issuer@example.test",
      fullName: "Ibrahim Issuer",
      firstName: "Ibrahim",
      lastName: "Issuer",
      phone: null,
      status: "ACTIVE",
      role: "HOLDER",
      createdAt: now,
      updatedAt: now,
    },
    membershipRole: "ORGANIZATION_ISSUER",
    joinedAt: "2026-07-19T08:00:00.000Z",
  },
];

export const demoInvitations: InvitationSummary[] = [
  {
    id: "invite_demo_pending",
    email: "new.issuer@example.test",
    role: "ORGANIZATION_ISSUER",
    createdAt: "2026-07-22T09:30:00.000Z",
    expiresAt: "2026-07-25T09:30:00.000Z",
    acceptedAt: null,
    revokedAt: null,
    state: "PENDING",
    invitationUrl:
      "https://verifieddoc.example.test/invitations/accept#token=DEMO_PRIVATE_TOKEN",
  },
];

export const demoAuditLogs: SafeAuditLogEntry[] = [
  {
    id: "audit_demo_1",
    action: "CREDENTIAL_ISSUED",
    resourceType: "Credential",
    resourceId: "cred_active_demo",
    organizationId: demoOrganization.id,
    actor: demoMembers[1]!.user,
    ipAddress: null,
    userAgent: null,
    details: { credentialPublicId: "VD-7K4P-92AX" },
    createdAt: "2026-07-18T10:00:00.000Z",
  },
  {
    id: "audit_demo_2",
    action: "ORGANIZATION_APPROVED",
    resourceType: "Organization",
    resourceId: demoOrganization.id,
    organizationId: demoOrganization.id,
    actor: {
      id: "platform_admin_demo",
      email: "demo.platform-admin@example.test",
      fullName: "Platform Admin",
      firstName: "Platform",
      lastName: "Admin",
      phone: null,
      status: "ACTIVE",
      role: "PLATFORM_ADMIN",
      createdAt: now,
      updatedAt: now,
    },
    ipAddress: null,
    userAgent: null,
    details: null,
    createdAt: "2026-07-18T12:00:00.000Z",
  },
];

export const demoPendingOrganizations: Organization[] = [
  {
    ...demoOrganization,
    id: "org_pending_demo",
    name: "Brightpath Skills Centre",
    slug: "brightpath-skills",
    registrationNumber: "BP-DEMO-102",
    contactEmail: "contact@brightpath.example.test",
    website: "https://brightpath.example.test",
    status: "PENDING",
    reviewedAt: null,
    reviewedById: null,
    createdAt: "2026-07-22T11:00:00.000Z",
    updatedAt: "2026-07-22T11:00:00.000Z",
  },
  {
    ...demoOrganization,
    id: "org_pending_demo_2",
    name: "Cedar Works Academy",
    slug: "cedar-works-academy",
    registrationNumber: "CW-DEMO-405",
    contactEmail: "hello@cedarworks.example.test",
    website: "https://cedarworks.example.test",
    status: "PENDING",
    reviewedAt: null,
    reviewedById: null,
    createdAt: "2026-07-23T06:00:00.000Z",
    updatedAt: "2026-07-23T06:00:00.000Z",
  },
];

export const demoVerification: PublicVerificationResponse = {
  result: "VALID",
  credential: {
    publicId: "VD-7K4P-92AX",
    title: "Backend Engineering Certificate",
    credentialType: "PROFESSIONAL_CERTIFICATE",
    effectiveStatus: "ACTIVE",
    issuedAt: "2026-07-18T10:00:00.000Z",
    expiresAt: "2028-07-18T10:00:00.000Z",
    organization: {
      name: demoOrganization.name,
      slug: demoOrganization.slug,
    },
    holderName: "Amara N.",
    claims: {
      grade: "Distinction",
      cohort: "2026",
    },
  },
};

export function verifyDemoToken(token: string): PublicVerificationResponse | null {
  const normalized = token.trim().toUpperCase();
  return normalized === "DEMO-VERIFIED-2026" ||
    normalized === "VD-7K4P-92AX"
    ? demoVerification
    : null;
}
