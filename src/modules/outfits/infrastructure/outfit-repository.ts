import { createDatabasePool } from "@/lib/database/database-session";
import { assertDatabaseConfigured, getPostgresPool } from "@/lib/database/postgres-pool";
import type { OutfitRepository } from "@/modules/outfits/application/outfit-repository";

import { InMemoryOutfitRepository } from "./in-memory-outfit-repository";
import { PostgresOutfitRepository } from "./postgres-outfit-repository";

type SartoriaGlobal = typeof globalThis & {
  sartoriaDevelopmentOutfitRepository?: InMemoryOutfitRepository;
  sartoriaPostgresOutfitRepository?: PostgresOutfitRepository;
};

const sartoriaGlobal = globalThis as SartoriaGlobal;

function postgresEnabled(): boolean {
  const mode = process.env.SARTORIA_PERSISTENCE_MODE;
  if (mode && mode !== "memory" && mode !== "postgres") {
    throw new Error(`Unsupported SARTORIA_PERSISTENCE_MODE: ${mode}`);
  }
  return process.env.NODE_ENV === "production" || mode === "postgres";
}

function developmentRepository(): InMemoryOutfitRepository {
  const repository =
    sartoriaGlobal.sartoriaDevelopmentOutfitRepository ?? new InMemoryOutfitRepository();
  if (process.env.NODE_ENV !== "production") {
    sartoriaGlobal.sartoriaDevelopmentOutfitRepository = repository;
  }
  return repository;
}

function postgresRepository(): PostgresOutfitRepository {
  assertDatabaseConfigured();
  const repository =
    sartoriaGlobal.sartoriaPostgresOutfitRepository ??
    new PostgresOutfitRepository(createDatabasePool(getPostgresPool()));
  if (process.env.NODE_ENV !== "production") {
    sartoriaGlobal.sartoriaPostgresOutfitRepository = repository;
  }
  return repository;
}

export function getOutfitRepository(): OutfitRepository {
  return postgresEnabled() ? postgresRepository() : developmentRepository();
}
