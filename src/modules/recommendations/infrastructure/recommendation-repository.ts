import { createDatabasePool } from "@/lib/database/database-session";
import { assertDatabaseConfigured, getPostgresPool } from "@/lib/database/postgres-pool";
import type { RecommendationRepository } from "@/modules/recommendations/application/recommendation-repository";

import { InMemoryRecommendationRepository } from "./in-memory-recommendation-repository";
import { PostgresRecommendationRepository } from "./postgres-recommendation-repository";

type SartoriaGlobal = typeof globalThis & {
  sartoriaDevelopmentRecommendationRepository?: InMemoryRecommendationRepository;
  sartoriaPostgresRecommendationRepository?: PostgresRecommendationRepository;
};

const sartoriaGlobal = globalThis as SartoriaGlobal;

function postgresEnabled(): boolean {
  const mode = process.env.SARTORIA_PERSISTENCE_MODE;
  if (mode && mode !== "memory" && mode !== "postgres") {
    throw new Error(`Unsupported SARTORIA_PERSISTENCE_MODE: ${mode}`);
  }
  return process.env.NODE_ENV === "production" || mode === "postgres";
}

function developmentRepository(): InMemoryRecommendationRepository {
  const repository =
    sartoriaGlobal.sartoriaDevelopmentRecommendationRepository ??
    new InMemoryRecommendationRepository();
  if (process.env.NODE_ENV !== "production") {
    sartoriaGlobal.sartoriaDevelopmentRecommendationRepository = repository;
  }
  return repository;
}

function postgresRepository(): PostgresRecommendationRepository {
  assertDatabaseConfigured();
  const repository =
    sartoriaGlobal.sartoriaPostgresRecommendationRepository ??
    new PostgresRecommendationRepository(createDatabasePool(getPostgresPool()));
  if (process.env.NODE_ENV !== "production") {
    sartoriaGlobal.sartoriaPostgresRecommendationRepository = repository;
  }
  return repository;
}

export function getRecommendationRepository(): RecommendationRepository {
  return postgresEnabled() ? postgresRepository() : developmentRepository();
}
