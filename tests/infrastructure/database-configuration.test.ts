import { afterEach, describe, expect, it } from "vitest";

import {
  assertDatabaseConfigured,
  DatabaseConfigurationError,
} from "@/lib/database/postgres-pool";

afterEach(() => {
  delete process.env.DATABASE_URL;
});

describe("database configuration", () => {
  it("fails closed without a database URL", () => {
    delete process.env.DATABASE_URL;

    expect(() => assertDatabaseConfigured()).toThrow(DatabaseConfigurationError);
    expect(() => assertDatabaseConfigured()).toThrow("DATABASE_URL is required");
  });

  it("returns the configured database URL", () => {
    process.env.DATABASE_URL = "postgres://example.test/sartoria";

    expect(assertDatabaseConfigured()).toBe("postgres://example.test/sartoria");
  });
});
