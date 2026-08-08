// Organisation Portal aggregate dashboard is not registered.
// Canonical organization endpoints:
//   GET /organizations
//   GET /organizations/:organizationId
//   GET|POST /organizations/:organizationId/credentials
//   PATCH /organizations/:organizationId/credentials/:credentialId/revoke
// Do not call /organizations/me/portal — that path is not registered.
// Do not invent verificationRequests / pendingRequests zeros without a real model.

export async function fetchOrganisationDashboard() {
  // DATABASE_MODEL_MISSING / BACKEND_ENDPOINT_MISSING
  return {
    organisation: null, // -> { name: string, verificationStatus: string }
    statistics: {
      documentsIssued: null, // -> { value, trendDirection, trendValue }
      verificationRequests: null,
      pendingRequests: null,
      revokedDocuments: null,
    },
    recentRequests: [], // -> array of { id, applicantName, documentName, status, time }
  };
}
