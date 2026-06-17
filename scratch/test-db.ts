import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

async function testConnection() {
  console.log("Attempting to connect to database using process.env.DATABASE_URL...");
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // A simple query that doesn't rely on the schema tables existing yet
    const result = await prisma.$queryRawUnsafe('SELECT current_database(), current_user, version();');
    console.log("✅ Database connection successful!");
    console.log("Connection details:", result);
  } catch (error: any) {
    console.error("❌ Database connection failed.");
    console.error(error.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

testConnection();
