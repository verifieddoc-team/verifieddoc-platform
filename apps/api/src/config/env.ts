import "dotenv/config";
import { z } from "zod";

const DEFAULT_ACCESS_SECRET = "development-access-secret-change-me-now";
const DEFAULT_REFRESH_SECRET = "development-refresh-secret-change-me-now";
const DEFAULT_DATABASE_URL = "postgresql://verifieddoc:verifieddoc@localhost:5432/verifieddoc";
const DEFAULT_CORS_ORIGINS = "http://localhost:3000,http://localhost:8081";
const DEFAULT_PUBLIC_WEB_URL = "http://localhost:3000";

function parseAbsoluteHttpUrl(value: string, fieldLabel: string, path: (string | number)[]) {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(value);
  } catch {
    return {
      ok: false as const,
      issue: {
        code: z.ZodIssueCode.custom,
        message: `${fieldLabel} must be a valid http:// or https:// URL`,
        path
      }
    };
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return {
      ok: false as const,
      issue: {
        code: z.ZodIssueCode.custom,
        message: `${fieldLabel} must use http:// or https://`,
        path
      }
    };
  }

  return { ok: true as const, parsedUrl };
}

function validatePublicWebUrl(value: string, context: z.RefinementCtx) {
  const result = parseAbsoluteHttpUrl(value, "PUBLIC_WEB_URL", ["PUBLIC_WEB_URL"]);
  if (!result.ok) {
    context.addIssue(result.issue);
  }
}

function parseCorsOrigins(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function validateCorsOrigin(origin: string, context: z.RefinementCtx, path: (string | number)[]) {
  if (origin.includes("*")) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Wildcard CORS origins are not allowed when credentials are enabled",
      path
    });
    return;
  }

  const parsed = parseAbsoluteHttpUrl(origin, "CORS origin", path);
  if (!parsed.ok) {
    context.addIssue(parsed.issue);
    return;
  }

  const { parsedUrl } = parsed;

  if (parsedUrl.username || parsedUrl.password) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "CORS origins must not contain credentials",
      path
    });
  }

  if (parsedUrl.pathname !== "/" && parsedUrl.pathname !== "") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "CORS origins must not contain paths",
      path
    });
  }

  if (parsedUrl.search) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "CORS origins must not contain query strings",
      path
    });
  }

  if (parsedUrl.hash) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "CORS origins must not contain fragments",
      path
    });
  }

  if (origin !== parsedUrl.origin) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Each CORS origin must be an absolute http:// or https:// origin without paths, query strings, fragments, or credentials",
      path
    });
  }
}

export function createEnvSchema() {
  return z
    .object({
      NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
      PORT: z.coerce.number().int().positive().default(4000),
      DATABASE_URL: z.string().min(1).default(DEFAULT_DATABASE_URL),
      JWT_ACCESS_SECRET: z.string().min(32).default(DEFAULT_ACCESS_SECRET),
      JWT_REFRESH_SECRET: z.string().min(32).default(DEFAULT_REFRESH_SECRET),
      CORS_ORIGINS: z.string().default(DEFAULT_CORS_ORIGINS),
      PUBLIC_WEB_URL: z.string().default(DEFAULT_PUBLIC_WEB_URL)
    })
    .superRefine((value, context) => {
      validatePublicWebUrl(value.PUBLIC_WEB_URL, context);

      const origins = parseCorsOrigins(value.CORS_ORIGINS);
      for (const [index, origin] of origins.entries()) {
        validateCorsOrigin(origin, context, ["CORS_ORIGINS", index]);
      }

      if (value.NODE_ENV !== "production") {
        return;
      }

      if (value.DATABASE_URL === DEFAULT_DATABASE_URL) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Production requires an explicit non-localhost DATABASE_URL",
          path: ["DATABASE_URL"]
        });
      }

      if (value.CORS_ORIGINS === DEFAULT_CORS_ORIGINS) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Production requires explicit non-localhost CORS_ORIGINS",
          path: ["CORS_ORIGINS"]
        });
      }

      if (value.PUBLIC_WEB_URL === DEFAULT_PUBLIC_WEB_URL) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Production requires an explicit non-localhost PUBLIC_WEB_URL",
          path: ["PUBLIC_WEB_URL"]
        });
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

      if (origins.length === 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Production requires explicit CORS_ORIGINS",
          path: ["CORS_ORIGINS"]
        });
      }
    });
}

export function parseEnv(input: NodeJS.ProcessEnv) {
  return createEnvSchema().parse(input);
}

export const env = parseEnv(process.env);
export const corsOrigins = parseCorsOrigins(env.CORS_ORIGINS);
