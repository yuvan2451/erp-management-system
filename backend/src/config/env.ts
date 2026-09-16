import 'dotenv/config';

/**
 * Central application configuration.
 *
 * Keeping environment-variable access in one place prevents different
 * parts of the application from handling configuration inconsistently.
 */

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const env = {
  databaseUrl: getRequiredEnv('DATABASE_URL'),
  jwtSecret: getRequiredEnv('JWT_SECRET'),
  port: Number(process.env.PORT ?? 5000),
};