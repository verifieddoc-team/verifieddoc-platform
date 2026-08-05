// Verification result history endpoints are not registered.
// Public one-shot verification uses GET /verify/:token (mobileApi.verify).
// Do not call /verifier/results — that path is not registered.
// Do not return fabricated history rows to satisfy the UI.

export async function fetchVerificationResults() {
  // DATABASE_MODEL_MISSING / BACKEND_ENDPOINT_MISSING
  return []; // -> array of { id, documentName, status, statusLabel, relativeTime, issuerName }
}

export async function fetchVerificationResultById(_id) {
  // DATABASE_MODEL_MISSING / BACKEND_ENDPOINT_MISSING
  return null;
}
