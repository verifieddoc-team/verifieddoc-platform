// No verifier dashboard endpoint exists yet, so this is a stub. It
// resolves with an "empty" shape so the UI renders its loading/empty
// states correctly. Replace the bodies below with real requests —
// following whichever API-client pattern the rest of the app already
// uses (see services/api.js) — once the backend exposes them.

export async function fetchVerifierDashboard() {
  // TODO(backend): replace with a real request once available, e.g.:
  //   const res = await apiClient.get("/verifier/me/dashboard");
  //   return res.data;

  return {
    stats: {
      total: null, // -> { value: number, description: string }
      verified: null,
      failedVerifications: null,
    },
    recentVerifications: [], // -> array of { id, title, issuerName, status, statusLabel, relativeTime }
  };
}

export async function verifyCredential(credentialId) {
  // TODO(backend): replace with a real request once available, e.g.:
  //   const res = await apiClient.post("/verifier/verify", { credentialId });
  //   return res.data;

  throw new Error("Credential verification is not connected to a backend yet.");
}
