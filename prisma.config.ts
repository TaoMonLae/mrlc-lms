import path from "node:path";
// @ts-ignore — prisma.config.ts is consumed by the Prisma CLI, not tsc
import { defineConfig } from "prisma/config";
import dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  schema: path.join(import.meta.dirname, "prisma/schema.prisma"),
  // @ts-ignore — earlyAccess is a CLI flag not yet in the TS types
  earlyAccess: true,
  migrations: {
    seed: 'npx tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
