const timestamp = "2026-07-23T08:30:00.000Z";

export const demoSession = {
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

export const demoWallet = [
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
  {
    id: "mobile-credential-revoked",
    publicId: "VD-5R9C-30PL",
    title: "Equipment Operations Certificate",
    description: "Equipment operations competency record.",
    credentialType: "PROFESSIONAL_CERTIFICATE",
    referenceNo: "DEMO-REVOKED-001",
    status: "REVOKED",
    effectiveStatus: "REVOKED",
    issuedAt: "2025-09-12T10:00:00.000Z",
    expiresAt: null,
    revokedAt: "2026-06-23T10:00:00.000Z",
    revocationReason: "Superseded by a corrected credential.",
    claims: { level: "Operator", assessment: "Completed" },
    organization: {
      id: "demo-org",
      name: "Northwind Training Institute",
      slug: "northwind-training",
    },
  },
];

export const demoVerification = {
  result: "VALID",
  credential: {
    publicId: demoWallet[0].publicId,
    title: demoWallet[0].title,
    credentialType: demoWallet[0].credentialType,
    effectiveStatus: "ACTIVE",
    issuedAt: demoWallet[0].issuedAt,
    expiresAt: demoWallet[0].expiresAt,
    organization: demoWallet[0].organization,
    holderName: "Amara N.",
    claims: { grade: "Distinction", cohort: "2026" },
  },
};

export function verifyDemoToken(token) {
  const normalized = extractVerificationToken(token).toUpperCase();
  return normalized === "DEMO-VERIFIED-2026" ||
    normalized === "VD-7K4P-92AX"
    ? demoVerification
    : null;
}

export function extractVerificationToken(input) {
  const value = input.trim();
  if (!value) return "";

  try {
    const url = new URL(value);
    const hashToken = new URLSearchParams(url.hash.replace(/^#/, "")).get(
      "token",
    );
    if (hashToken) return hashToken;

    const segments = url.pathname.split("/").filter(Boolean);
    const verifyIndex = segments.lastIndexOf("verify");
    if (verifyIndex >= 0 && segments[verifyIndex + 1]) {
      return decodeURIComponent(segments[verifyIndex + 1]);
    }
  } catch {
    // A raw token is a valid input.
  }

  return value;
}
