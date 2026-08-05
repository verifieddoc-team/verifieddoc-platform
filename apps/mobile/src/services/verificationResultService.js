// src/services/verificationResultService.js
//
// No verification-results endpoint exists yet, so these are stubs that
// resolve with "empty" shapes so the UI renders its loading/empty states
// correctly. Replace the bodies below with real requests — following
// whichever API-client pattern the rest of the app already uses (see
// services/api.js) — once the backend exposes them.

export async function fetchVerificationResults() {
  // TODO(backend): replace with a real request once available, e.g.:
  //   const res = await apiClient.get("/verifier/results");
  //   return res.data;

  return []; // -> array of { id, documentName, status, statusLabel, relativeTime, issuerName }
}

export async function fetchVerificationResultById(id) {
  // TODO(backend): replace with a real request once available, e.g.:
  //   const res = await apiClient.get(`/verifier/results/${id}`);
  //   return res.data;

  return null;
  // Expected shape once wired up:
  // {
  //   id,
  //   status: "verified" | "under_review" | "rejected",
  //   timestampLabel,     // e.g. "verified on July 5, 2026 . 09:10 AM"
  //   message,            // optional override of the default status copy
  //   document: {
  //     type, name, documentId, issuedBy, holderName,
  //     issueDate, expirationDate, submittedOn, rejectionReason,
  //   },
  // }
}
