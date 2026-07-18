import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { disconnectPrisma } from "./lib/prisma.js";

const server = createApp().listen(env.PORT, () => {
  console.log(`VerifiedDoc API listening on port ${env.PORT}`);
});

function shutdown(signal: string) {
  console.log(`${signal} received, closing server`);
  server.close(async () => {
    await disconnectPrisma();
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
