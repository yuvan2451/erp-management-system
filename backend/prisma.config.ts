import 'dotenv/config';
import { defineConfig, env } from '@prisma/config';

/**
 * Prisma 7 Configuration
 *
 * In Prisma 7, the database connection URL is defined in prisma.config.ts
 * rather than in schema.prisma. The Prisma CLI automatically reads variables
 * from .env, and the env() helper retrieves the value at runtime.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
});
