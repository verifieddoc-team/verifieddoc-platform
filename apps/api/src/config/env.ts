import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1).default("postgresql://verifieddoc:verifieddoc@localhost:5432/verifieddoc"),
  JWT_ACCESS_SECRET: z.string().min(32).default("development-access-secret-change-me-now"),
  JWT_REFRESH_SECRET: z.string().min(32).default("development-refresh-secret-change-me-now"),
  CORS_ORIGINS: z.string().default("http://localhost:3000,http://localhost:8081"),
  PUBLIC_WEB_URL: z.string().url().default("http://localhost:3000")
});

export const env = schema.parse(process.env);
export const corsOrigins = env.CORS_ORIGINS.split(",").map((value) => value.trim());
