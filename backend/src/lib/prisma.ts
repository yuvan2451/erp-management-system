import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { env } from '../config/env';

/**
 * Shared Prisma database client.
 *
 * Prisma 7 requires a driver adapter for direct PostgreSQL connections.
 * We create one PostgreSQL connection pool and give it to PrismaPg.
 *
 * Keeping this client in one module prevents every service from creating
 * its own database connection/client instance.
 */
const pool = new Pool({
  connectionString: env.databaseUrl,
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
});