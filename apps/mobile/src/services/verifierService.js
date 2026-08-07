import { mobileApi } from "./api";
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

function extractVerificationToken(input) {
  const value = input?.trim();

  if (!value) {
    throw new Error("Enter a verification link or token.");
  }

  const marker = "/verify/";
  const markerIndex = value.indexOf(marker);

  if (markerIndex >= 0) {
    const tokenPart = value.slice(
      markerIndex + marker.length
    );

    return tokenPart.split(/[?#]/)[0];
  }

  return value;
}

export async function verifyCredential(input) {
  const token = extractVerificationToken(input);

  return mobileApi.verify(token);
}
