// src/services/dashboardService.js
//
// There is no dashboard endpoint on the backend yet, so this is a stub.
// It resolves with an "empty" shape so the UI renders its empty states
// correctly. Swap the body of this function for a real request (following
// whatever API-client pattern the rest of the app already uses, e.g. the
// same axios/fetch wrapper used in the auth screens) once the endpoint
// exists. Do not change the return shape without updating
// useDashboardData.js and the dashboard screen that consumes it.

export async function fetchDashboardData() {
  // TODO(backend): replace with a real request once the dashboard API
  // is available, e.g.:
  //   const res = await apiClient.get("/organizations/me/dashboard");
  //   return res.data;

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
