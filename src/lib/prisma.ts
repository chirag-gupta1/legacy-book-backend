console.log("DATABASE_URL at runtime:", process.env.DATABASE_URL);

const { PrismaClient } = require("@prisma/client");
import { PrismaPg } from "@prisma/adapter-pg";   // <-- adapter package
import pg from "pg";                             // <-- node-postgres
import "dotenv/config";

const createPrismaClient = () => {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
  });
};

const prisma = createPrismaClient();
export default prisma;
