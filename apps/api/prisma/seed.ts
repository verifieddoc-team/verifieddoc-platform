import "dotenv/config";
import { seedDemoData } from "./seed-data.js";

async function main() {
  const summary = await seedDemoData({
    nodeEnv: process.env.NODE_ENV ?? "development",
    allowDemoSeed: process.env.ALLOW_DEMO_SEED === "true",
    demoPassword: process.env.DEMO_PASSWORD
  });

  console.log("VerifiedDoc demo seed completed.");
  console.log(`Organization slug: ${summary.organizationSlug}`);
  console.log("Fictional accounts:");
  for (const [label, email] of Object.entries(summary.accounts)) {
    console.log(`- ${label}: ${email}`);
  }
  console.log("Credential reference numbers:");
  console.log(`- active: ${summary.credentials.activeReferenceNo}`);
  console.log(`- expired: ${summary.credentials.expiredReferenceNo}`);
  console.log(`- revoked: ${summary.credentials.revokedReferenceNo}`);
  console.log("Passwords and hashes are never printed. Set DEMO_PASSWORD before running the seed.");
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Demo seed failed.";
    console.error(message);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma } = await import("../src/lib/prisma.js");
    await prisma.$disconnect();
  });
