// Verifier aggregate dashboard and credential-ID search are not registered.
// Canonical public verification endpoint:
//   GET /verify/:token  (via mobileApi.verify)
// Do not call /verifier/me/dashboard or POST /verifier/verify — those paths do not exist.
// Do not invent successful/failed verification statistics without a VerificationEvent model.

export async function fetchVerifierDashboard() {
  // DATABASE_MODEL_MISSING / BACKEND_ENDPOINT_MISSING
  return {
    stats: {
      total: null, // -> { value: number, description: string }
      verified: null,
      failedVerifications: null,
    },
    recentVerifications: [], // -> array of { id, title, issuerName, status, statusLabel, relativeTime }
  };
}

export async function verifyCredential(token) {
  // Prefer mobileApi.verify(token) → GET /verify/:token once screens are wired.
  // Credential-ID search is BACKEND_ENDPOINT_MISSING for the current MVP.
  throw new Error(
    "Wire this screen to mobileApi.verify(token) (GET /verify/:token). There is no POST /verifier/verify endpoint.",
  );
}
