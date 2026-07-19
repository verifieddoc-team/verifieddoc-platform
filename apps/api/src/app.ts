import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import swaggerUi from "swagger-ui-express";
import { corsOrigins } from "./config/env.js";
import { errorHandler, notFound } from "./lib/errors.js";
import { createHttpLoggerOptions, type LogCaptureStream } from "./lib/http-logging.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { credentialRouter } from "./modules/credentials/credential.routes.js";
import { adminOrganizationRouter, organizationRouter } from "./modules/organizations/organization.routes.js";
import { shareLinkRouter, verifyRouter } from "./modules/share-links/share-link.routes.js";
import { openApiDocument } from "./openapi.js";

export interface CreateAppOptions {
  logStream?: LogCaptureStream;
}

export function createApp(options: CreateAppOptions = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cors({ origin: corsOrigins, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(pinoHttp(createHttpLoggerOptions(options.logStream)));

  app.get("/api/v1/health", (_req, res) => {
    res.status(200).json({ status: "ok", service: "verifieddoc-api", version: "0.1.0" });
  });
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/credentials", credentialRouter);
  app.use("/api/v1/credentials/:credentialId/share-links", shareLinkRouter);
  app.use("/api/v1/verify", verifyRouter);
  app.use("/api/v1/organizations", organizationRouter);
  app.use("/api/v1/admin/organizations", adminOrganizationRouter);
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
  app.get("/openapi.json", (_req, res) => res.json(openApiDocument));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
