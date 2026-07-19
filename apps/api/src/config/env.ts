import "dotenv/config";
import { z } from "zod";

const DEFAULT_ACCESS_SECRET = "development-access-secret-change-me-now";
const DEFAULT_REFRESH_SECRET = "development-refresh-secret-change-me-now";

const publicWebUrlSchema = z
  .string()
  .superRefine((value, context) => {
    let parsedUrl: URL;

    try {
      parsedUrl = new URL(value);
    } catch {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "PUBLIC_WEB_URL must be a valid http:// or https:// URL"
      });
      return;
    }

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "PUBLIC_WEB_URL must use http:// or https://"
      });
    }
  });

export function createEnvSchema() {
  return z
    .object({
      NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
      PORT: z.coerce.number().int().positive().default(4000),
      DATABASE_URL: z.string().min(1).default("postgresql://verifieddoc:verifieddoc@localhost:5432/verifieddoc"),
      JWT_ACCESS_SECRET: z.string().min(32).default(DEFAULT_ACCESS_SECRET),
      JWT_REFRESH_SECRET: z.string().min(32).default(DEFAULT_REFRESH_SECRET),
      CORS_ORIGINS: z.string().default("http://localhost:3000,http://localhost:8081"),
      PUBLIC_WEB_URL: publicWebUrlSchema.default("http://localhost:3000")
    })
    .superRefine((value, context) => {
      if (value.NODE_ENV !== "production") {
        return;
      }

      if (
        value.JWT_ACCESS_SECRET === DEFAULT_ACCESS_SECRET ||
        value.JWT_REFRESH_SECRET === DEFAULT_REFRESH_SECRET
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Production requires explicit JWT_ACCESS_SECRET and JWT_REFRESH_SECRET values",
          path: ["JWT_ACCESS_SECRET"]
        });
      }

      const origins = value.CORS_ORIGINS.split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);

      if (origins.length === 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Production requires explicit CORS_ORIGINS",
          path: ["CORS_ORIGINS"]
        });
      }

      if (origins.includes("*")) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Wildcard CORS origins are not allowed when credentials are enabled",
          path: ["CORS_ORIGINS"]
        });
      }
    });
}

export function parseEnv(input: NodeJS.ProcessEnv) {
  return createEnvSchema().parse(input);
}

export const env = parseEnv(process.env);
export const corsOrigins = env.CORS_ORIGINS.split(",").map((value) => value.trim()).filter(Boolean);
