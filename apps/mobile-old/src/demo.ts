import type {
  AuthSession,
  PublicVerificationResponse,
  SafeCredential,
} from "@verifieddoc/contracts";

const timestamp = "2026-07-23T08:30:00.000Z";

export const demoSession: AuthSession = {
  user: {
    id: "demo-mobile-holder",
    email: "demo.holder@example.test",
    firstName: "Amara",
    lastName: "N.",
    role: "HOLDER",
    createdAt: timestamp,
    updatedAt: timestamp,
  },
  accessToken: "fictional-demo-access-token",
  refreshToken: "fictional-demo-refresh-token",
};

export const demoWallet: SafeCredential[] = [
  {
    id: "mobile-credential-active",
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
    claims: { grade: "Distinction", cohort: "2026", hours: 240 },
    organization: {
      id: "demo-org",
      name: "Northwind Training Institute",
      slug: "northwind-training",
    },
  },
  {
    id: "mobile-credential-expired",
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
      id: "demo-org",
      name: "Northwind Training Institute",
      slug: "northwind-training",
    },
  },
];

export const demoVerification: PublicVerificationResponse = {
  result: "VALID",
  credential: {
    publicId: demoWallet[0]!.publicId,
    title: demoWallet[0]!.title,
    credentialType: demoWallet[0]!.credentialType,
    effectiveStatus: "ACTIVE",
    issuedAt: demoWallet[0]!.issuedAt,
    expiresAt: demoWallet[0]!.expiresAt,
    organization: demoWallet[0]!.organization,
    holderName: "Amara N.",
    claims: { grade: "Distinction", cohort: "2026" },
  },
};

export function verifyDemoToken(token: string): PublicVerificationResponse | null {
  const normalized = token.trim().toUpperCase();
  return normalized.includes("DEMO-VERIFIED-2026") ||
    normalized.includes("VD-7K4P-92AX")
    ? demoVerification
    : null;
}
