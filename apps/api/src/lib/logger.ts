import pino from "pino";

/**
 * Application logger for adapters and background diagnostics.
 * HTTP request logging remains configured separately via pino-http.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "test" ? "silent" : "info")
});
