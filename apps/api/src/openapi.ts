export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "VerifiedDoc API",
    version: "0.1.0",
    description: "API for issuing, sharing, revoking, and verifying employer and organization credentials."
  },
  servers: [{ url: "/api/v1" }],
  paths: {
    "/health": {
      get: {
        summary: "Check API health",
        responses: { "200": { description: "API is healthy" } }
      }
    }
  }
};
