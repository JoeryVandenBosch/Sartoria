import { createDatabasePool } from "@/lib/database/database-session";
import { assertDatabaseConfigured, getPostgresPool } from "@/lib/database/postgres-pool";
import type { WardrobeItemRepository } from "@/modules/wardrobe/application/wardrobe-item-repository";

import { developmentWardrobeRepository } from "./development-wardrobe-store";
import { PostgresWardrobeItemRepository } from "./postgres-wardrobe-item-repository";

type SartoriaGlobal = typeof globalThis & {
  sartoriaPostgresWardrobeRepository?: PostgresWardrobeItemRepository;
};

const sartoriaGlobal = globalThis as SartoriaGlobal;

function postgresRepository(): PostgresWardrobeItemRepository {
  assertDatabaseConfigured();

  const repository =
    sartoriaGlobal.sartoriaPostgresWardrobeRepository ??
    new PostgresWardrobeItemRepository(createDatabasePool(getPostgresPool()));

  if (process.env.NODE_ENV !== "production") {
    sartoriaGlobal.sartoriaPostgresWardrobeRepository = repository;
  }

  return repository;
}

export function getWardrobeRepository(): WardrobeItemRepository {
  const persistenceMode = process.env.SARTORIA_PERSISTENCE_MODE;
  const usePostgres = persistenceMode === "postgres" || process.env.NODE_ENV === "production";

  if (usePostgres) {
    return postgresRepository();
  }

  if (persistenceMode && persistenceMode !== "memory") {
    throw new Error(`Unsupported SARTORIA_PERSISTENCE_MODE: ${persistenceMode}`);
  }

  return developmentWardrobeRepository;
}
