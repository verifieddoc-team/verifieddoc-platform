import { validatePassword } from "../src/lib/password-policy.js";

export interface DemoSeedInput {
  nodeEnv: string;
  allowDemoSeed: boolean;
  demoPassword?: string;
}

export function validateDemoSeedInput(input: DemoSeedInput): string {
  if (input.nodeEnv === "production") {
    throw new Error("Demo seed cannot run when NODE_ENV=production.");
  }

  if (!input.allowDemoSeed) {
    throw new Error("Demo seed is disabled. Set ALLOW_DEMO_SEED=true to run this command.");
  }

  if (!input.demoPassword?.trim()) {
    throw new Error("DEMO_PASSWORD is required.");
  }

  return validatePassword(input.demoPassword);
}

export const DEMO_EMAIL_DOMAIN = "example.test";

export const DEMO_ACCOUNTS = {
  platformAdmin: `demo.platform-admin@${DEMO_EMAIL_DOMAIN}`,
  orgAdmin: `demo.org-admin@${DEMO_EMAIL_DOMAIN}`,
  issuer: `demo.issuer@${DEMO_EMAIL_DOMAIN}`,
  holder: `demo.holder@${DEMO_EMAIL_DOMAIN}`,
  verifier: `demo.verifier@${DEMO_EMAIL_DOMAIN}`
} as const;

export const DEMO_ORGANIZATION_SLUG = "demo-northwind-training";
