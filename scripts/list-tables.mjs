// Lists the tables currently in the public schema, plus migration history.
// Run with: npx tsx scripts/list-tables.mjs
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const tables = await prisma.$queryRawUnsafe(
  `SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public' ORDER BY table_name;`
);
console.log('\n=== TABLES ===');
console.log(tables.map((t) => t.table_name).join('\n'));

const migs = await prisma.$queryRawUnsafe(
  `SELECT migration_name,
          (finished_at IS NOT NULL) AS applied,
          (rolled_back_at IS NOT NULL) AS rolled_back
   FROM _prisma_migrations ORDER BY started_at;`
).catch(() => []);
console.log('\n=== MIGRATION HISTORY (name | applied | rolled_back) ===');
for (const m of migs) console.log(`${m.migration_name} | ${m.applied} | ${m.rolled_back}`);

await prisma.$disconnect();
await pool.end();
