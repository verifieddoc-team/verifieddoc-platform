import bcrypt from "bcryptjs";
import { pathToFileURL } from "node:url";
import { PlatformRole } from "@prisma/client";
import { validateEmail, validatePassword } from "../src/lib/password-policy.js";
import { prisma } from "../src/lib/prisma.js";

const BCRYPT_ROUNDS = 12;

export interface AdminBootstrapInput {
  allowBootstrap: boolean;
  email?: string;
  password?: string;
}

export interface AdminBootstrapResult {
  status: "created" | "promoted" | "unchanged";
  email: string;
}

export function validateAdminBootstrapInput(input: AdminBootstrapInput): {
  email: string;
  password: string;
} {
  if (!input.allowBootstrap) {
    throw new Error("Admin bootstrap is disabled. Set ALLOW_ADMIN_BOOTSTRAP=true to run this command.");
  }

  if (!input.email?.trim()) {
    throw new Error("ADMIN_EMAIL is required.");
  }

  if (!input.password?.trim()) {
    throw new Error("ADMIN_PASSWORD is required.");
  }

  return {
    email: validateEmail(input.email),
    password: validatePassword(input.password)
  };
}

export async function bootstrapPlatformAdmin(input: AdminBootstrapInput): Promise<AdminBootstrapResult> {
  const { email, password } = validateAdminBootstrapInput(input);
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser && existingUser.role !== PlatformRole.PLATFORM_ADMIN) {
    throw new Error("Refusing to overwrite an existing non-admin account.");
  }

  if (existingUser?.role === PlatformRole.PLATFORM_ADMIN) {
    return {
      status: "unchanged",
      email
    };
  }

  if (existingUser) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        role: PlatformRole.PLATFORM_ADMIN,
        passwordHash
      }
    });

    return {
      status: "promoted",
      email
    };
  }

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: "Platform",
      lastName: "Admin",
      role: PlatformRole.PLATFORM_ADMIN
    }
  });

  return {
    status: "created",
    email
  };
}

async function main() {
  const result = await bootstrapPlatformAdmin({
    allowBootstrap: process.env.ALLOW_ADMIN_BOOTSTRAP === "true",
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD
  });

  console.log("VerifiedDoc admin bootstrap completed.");
  console.log(`Status: ${result.status}`);
  console.log(`Platform admin email: ${result.email}`);
  console.log("Passwords and hashes are never printed.");
  console.log("Disable bootstrap immediately by unsetting ALLOW_ADMIN_BOOTSTRAP or setting it to false.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Admin bootstrap failed.";
      console.error(message);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
