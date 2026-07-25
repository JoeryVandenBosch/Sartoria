import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

import pg from "pg";

const { Client } = pg;
const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run Sartoria migrations.");
}

const migrationsDirectory = resolve(process.cwd(), "migrations");
const migrationFiles = (await readdir(migrationsDirectory))
  .filter((file) => /^\d+.*\.sql$/.test(file))
  .sort();

const client = new Client({
  connectionString: databaseUrl,
  ssl: process.env.DATABASE_SSL_MODE === "disable" ? false : { rejectUnauthorized: true },
});

await client.connect();

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS sartoria_schema_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  for (const filename of migrationFiles) {
    const existing = await client.query(
      "SELECT 1 FROM sartoria_schema_migrations WHERE filename = $1",
      [filename],
    );

    if (existing.rowCount > 0) {
      console.log(`Already applied: ${filename}`);
      continue;
    }

    const sql = await readFile(resolve(migrationsDirectory, filename), "utf8");
    await client.query(sql);
    await client.query(
      "INSERT INTO sartoria_schema_migrations (filename) VALUES ($1)",
      [filename],
    );
    console.log(`Applied: ${filename}`);
  }
} finally {
  await client.end();
}
