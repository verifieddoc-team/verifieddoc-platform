import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { sanitizeRequestUrl } from "./sanitize-request-url.js";

export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
  }
}

export function notFound(req: Request, _res: Response, next: NextFunction) {
  const safePath = sanitizeRequestUrl(req.originalUrl || req.url || req.path);
  next(new AppError(404, "NOT_FOUND", `Route ${req.method} ${safePath} was not found`));
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid request", details: error.flatten() } });
  }
  if (error instanceof AppError) {
    return res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {})
      }
    });
  }
  return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } });
}
