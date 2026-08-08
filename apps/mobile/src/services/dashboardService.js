// src/services/dashboardService.js
//
// This screen is the issuing-organization portal dashboard (not the holder wallet).
// There is still no organization dashboard aggregate endpoint on the backend.
// Canonical related endpoints that DO exist:
//   GET /organizations
//   GET /organizations/:organizationId/credentials
//   GET /organizations/:organizationId/members
// Holder wallet stats use a different canonical route:
//   GET /holder/dashboard  (Bearer + HOLDER) via mobileApi.getHolderDashboard
//
// Do not call /organizations/me/dashboard — that path is not registered.
// Do not invent pendingVerification = 0 / recipients = 0 to fake a complete API.
// Keep the null/empty return shape until a real org-dashboard endpoint exists.

export async function fetchDashboardData() {
  // DATABASE_MODEL_MISSING / BACKEND_ENDPOINT_MISSING:
  // organization portal aggregates (active recipients, pending verification requests).
  return {
    organization: null, // -> { name: string }
    stats: {
      totalCredentials: null, // -> { value: number, description: string }
      recipients: null, // -> { value: number, description: string }
      pendingVerification: null, // -> { value: number, description: string }
    },
    recentlyIssued: [], // -> array of { id, title, recipientName, issueDate, status }
  };
}
