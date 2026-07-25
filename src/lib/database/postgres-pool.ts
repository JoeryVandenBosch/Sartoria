import { Pool } from "pg";

const fallbackBuildUrl = "postgres://invalid:invalid@127.0.0.1:5432/sartoria_build";

type SartoriaGlobal = typeof globalThis & {
  sartoriaPostgresPool?: Pool;
};

const sartoriaGlobal = globalThis as SartoriaGlobal;

export class DatabaseConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseConfigurationError";
  }
}

export function assertDatabaseConfigured(): string {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new DatabaseConfigurationError(
      "DATABASE_URL is required for PostgreSQL persistence and production authentication.",
    );
  }

  return databaseUrl;
}

function createPool(): Pool {
  const configuredUrl = process.env.DATABASE_URL?.trim();
  const sslDisabled = process.env.DATABASE_SSL_MODE === "disable";

  return new Pool({
    connectionString: configuredUrl || fallbackBuildUrl,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    max: 10,
    ssl: configuredUrl && !sslDisabled ? { rejectUnauthorized: true } : false,
  });
}

export function getPostgresPool(): Pool {
  const pool = sartoriaGlobal.sartoriaPostgresPool ?? createPool();

  if (process.env.NODE_ENV !== "production") {
    sartoriaGlobal.sartoriaPostgresPool = pool;
  }

  return pool;
}
