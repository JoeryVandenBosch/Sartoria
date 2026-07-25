import { createDatabasePool } from "@/lib/database/database-session";
import { assertDatabaseConfigured, getPostgresPool } from "@/lib/database/postgres-pool";
import type { TravelPlanRepository } from "@/modules/planning/application/travel-plan-repository";

import { InMemoryTravelPlanRepository } from "./in-memory-travel-plan-repository";
import { PostgresTravelPlanRepository } from "./postgres-travel-plan-repository";

type SartoriaGlobal = typeof globalThis & {
  sartoriaDevelopmentTravelPlanRepository?: InMemoryTravelPlanRepository;
  sartoriaPostgresTravelPlanRepository?: PostgresTravelPlanRepository;
};

const sartoriaGlobal = globalThis as SartoriaGlobal;

function postgresEnabled(): boolean {
  const mode = process.env.SARTORIA_PERSISTENCE_MODE;
  if (mode && mode !== "memory" && mode !== "postgres") {
    throw new Error(`Unsupported SARTORIA_PERSISTENCE_MODE: ${mode}`);
  }
  return process.env.NODE_ENV === "production" || mode === "postgres";
}

function developmentRepository(): InMemoryTravelPlanRepository {
  const repository =
    sartoriaGlobal.sartoriaDevelopmentTravelPlanRepository ?? new InMemoryTravelPlanRepository();
  if (process.env.NODE_ENV !== "production") {
    sartoriaGlobal.sartoriaDevelopmentTravelPlanRepository = repository;
  }
  return repository;
}

function postgresRepository(): PostgresTravelPlanRepository {
  assertDatabaseConfigured();
  const repository =
    sartoriaGlobal.sartoriaPostgresTravelPlanRepository ??
    new PostgresTravelPlanRepository(createDatabasePool(getPostgresPool()));
  if (process.env.NODE_ENV !== "production") {
    sartoriaGlobal.sartoriaPostgresTravelPlanRepository = repository;
  }
  return repository;
}

export function getTravelPlanRepository(): TravelPlanRepository {
  return postgresEnabled() ? postgresRepository() : developmentRepository();
}
