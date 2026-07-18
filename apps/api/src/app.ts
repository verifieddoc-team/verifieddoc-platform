import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import swaggerUi from "swagger-ui-express";
import { corsOrigins } from "./config/env.js";
import { errorHandler, notFound } from "./lib/errors.js";
import { openApiDocument } from "./openapi.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: corsOrigins, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(pinoHttp());

  app.get("/api/v1/health", (_req, res) => {
    res.status(200).json({ status: "ok", service: "verifieddoc-api", version: "0.1.0" });
  });
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
  app.get("/openapi.json", (_req, res) => res.json(openApiDocument));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
