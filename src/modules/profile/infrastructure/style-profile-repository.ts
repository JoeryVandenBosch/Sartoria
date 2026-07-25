import { createDatabasePool } from "@/lib/database/database-session";
import { assertDatabaseConfigured, getPostgresPool } from "@/lib/database/postgres-pool";
import type { StyleProfileRepository } from "@/modules/profile/application/style-profile-repository";

import { InMemoryStyleProfileRepository } from "./in-memory-style-profile-repository";
import { PostgresStyleProfileRepository } from "./postgres-style-profile-repository";

type SartoriaGlobal = typeof globalThis & {
  sartoriaDevelopmentStyleProfileRepository?: InMemoryStyleProfileRepository;
  sartoriaPostgresStyleProfileRepository?: PostgresStyleProfileRepository;
};

const sartoriaGlobal = globalThis as SartoriaGlobal;

function postgresEnabled(): boolean {
  const mode = process.env.SARTORIA_PERSISTENCE_MODE;
  if (mode && mode !== "memory" && mode !== "postgres") {
    throw new Error(`Unsupported SARTORIA_PERSISTENCE_MODE: ${mode}`);
  }

  return process.env.NODE_ENV === "production" || mode === "postgres";
}

function developmentRepository(): InMemoryStyleProfileRepository {
  const repository =
    sartoriaGlobal.sartoriaDevelopmentStyleProfileRepository ??
    new InMemoryStyleProfileRepository();

  if (process.env.NODE_ENV !== "production") {
    sartoriaGlobal.sartoriaDevelopmentStyleProfileRepository = repository;
  }

  return repository;
}

function postgresRepository(): PostgresStyleProfileRepository {
  assertDatabaseConfigured();
  const repository =
    sartoriaGlobal.sartoriaPostgresStyleProfileRepository ??
    new PostgresStyleProfileRepository(createDatabasePool(getPostgresPool()));

  if (process.env.NODE_ENV !== "production") {
    sartoriaGlobal.sartoriaPostgresStyleProfileRepository = repository;
  }

  return repository;
}

export function getStyleProfileRepository(): StyleProfileRepository {
  return postgresEnabled() ? postgresRepository() : developmentRepository();
}
