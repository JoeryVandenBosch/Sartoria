import { createDatabasePool } from "@/lib/database/database-session";
import { assertDatabaseConfigured, getPostgresPool } from "@/lib/database/postgres-pool";
import type { OutfitWearEventRepository } from "@/modules/outfits/application/outfit-wear-event-repository";

import { InMemoryOutfitWearEventRepository } from "./in-memory-outfit-wear-event-repository";
import { PostgresOutfitWearEventRepository } from "./postgres-outfit-wear-event-repository";

type SartoriaGlobal = typeof globalThis & {
  sartoriaDevelopmentOutfitWearEventRepository?: InMemoryOutfitWearEventRepository;
  sartoriaPostgresOutfitWearEventRepository?: PostgresOutfitWearEventRepository;
};

const sartoriaGlobal = globalThis as SartoriaGlobal;

function postgresEnabled(): boolean {
  const mode = process.env.SARTORIA_PERSISTENCE_MODE;
  if (mode && mode !== "memory" && mode !== "postgres") {
    throw new Error(`Unsupported SARTORIA_PERSISTENCE_MODE: ${mode}`);
  }
  return process.env.NODE_ENV === "production" || mode === "postgres";
}

function developmentRepository(): InMemoryOutfitWearEventRepository {
  const repository =
    sartoriaGlobal.sartoriaDevelopmentOutfitWearEventRepository ??
    new InMemoryOutfitWearEventRepository();
  if (process.env.NODE_ENV !== "production") {
    sartoriaGlobal.sartoriaDevelopmentOutfitWearEventRepository = repository;
  }
  return repository;
}

function postgresRepository(): PostgresOutfitWearEventRepository {
  assertDatabaseConfigured();
  const repository =
    sartoriaGlobal.sartoriaPostgresOutfitWearEventRepository ??
    new PostgresOutfitWearEventRepository(createDatabasePool(getPostgresPool()));
  if (process.env.NODE_ENV !== "production") {
    sartoriaGlobal.sartoriaPostgresOutfitWearEventRepository = repository;
  }
  return repository;
}

export function getOutfitWearEventRepository(): OutfitWearEventRepository {
  return postgresEnabled() ? postgresRepository() : developmentRepository();
}
