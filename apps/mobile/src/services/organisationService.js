// src/services/organisationService.js
//
// No Organisation Portal endpoint exists yet, so this is a stub that
// resolves with an "empty" shape so the UI renders its loading/empty
// states correctly. Replace the body with a real request — following
// whichever API-client pattern the rest of the app already uses — once
// the backend exposes it. Keep the return shape in sync with
// useOrganisationDashboard.js and the screen that consumes it.

export async function fetchOrganisationDashboard() {
  // TODO(backend): replace with a real request once available, e.g.:
  //   const res = await apiClient.get("/organizations/me/portal");
  //   return res.data;

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
