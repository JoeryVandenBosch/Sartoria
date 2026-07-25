import { createDatabasePool } from "@/lib/database/database-session";
import { assertDatabaseConfigured, getPostgresPool } from "@/lib/database/postgres-pool";
import type { MediaObjectStore } from "@/modules/media/application/media-object-store";
import type { MediaScanner } from "@/modules/media/application/media-scanner";
import type { WardrobeMediaRepository } from "@/modules/media/application/wardrobe-media-repository";

import { ClamAvMediaScanner, createClamAvMediaScanner } from "./clamav-media-scanner";
import { DevelopmentMediaScanner } from "./development-media-scanner";
import {
  developmentMediaObjectStore,
  type DevelopmentMediaObjectStore,
} from "./development-media-object-store";
import { InMemoryWardrobeMediaRepository } from "./in-memory-wardrobe-media-repository";
import { PostgresWardrobeMediaRepository } from "./postgres-wardrobe-media-repository";
import { createS3MediaObjectStore, S3MediaObjectStore } from "./s3-media-object-store";

type SartoriaGlobal = typeof globalThis & {
  sartoriaDevelopmentMediaRepository?: InMemoryWardrobeMediaRepository;
  sartoriaPostgresMediaRepository?: PostgresWardrobeMediaRepository;
  sartoriaS3MediaObjectStore?: S3MediaObjectStore;
  sartoriaClamAvMediaScanner?: ClamAvMediaScanner;
};

const sartoriaGlobal = globalThis as SartoriaGlobal;

function productionMediaEnabled(): boolean {
  const mode = process.env.SARTORIA_MEDIA_MODE;
  if (mode && mode !== "development" && mode !== "production") {
    throw new Error(`Unsupported SARTORIA_MEDIA_MODE: ${mode}`);
  }

  return process.env.NODE_ENV === "production" || mode === "production";
}

function developmentRepository(): InMemoryWardrobeMediaRepository {
  const repository =
    sartoriaGlobal.sartoriaDevelopmentMediaRepository ??
    new InMemoryWardrobeMediaRepository();

  if (process.env.NODE_ENV !== "production") {
    sartoriaGlobal.sartoriaDevelopmentMediaRepository = repository;
  }

  return repository;
}

function postgresRepository(): PostgresWardrobeMediaRepository {
  assertDatabaseConfigured();
  const repository =
    sartoriaGlobal.sartoriaPostgresMediaRepository ??
    new PostgresWardrobeMediaRepository(createDatabasePool(getPostgresPool()));

  if (process.env.NODE_ENV !== "production") {
    sartoriaGlobal.sartoriaPostgresMediaRepository = repository;
  }

  return repository;
}

function s3ObjectStore(): S3MediaObjectStore {
  const objectStore =
    sartoriaGlobal.sartoriaS3MediaObjectStore ?? createS3MediaObjectStore();

  if (process.env.NODE_ENV !== "production") {
    sartoriaGlobal.sartoriaS3MediaObjectStore = objectStore;
  }

  return objectStore;
}

export function getWardrobeMediaRepository(): WardrobeMediaRepository {
  return productionMediaEnabled() ? postgresRepository() : developmentRepository();
}

export function getMediaObjectStore(): MediaObjectStore {
  return productionMediaEnabled() ? s3ObjectStore() : developmentMediaObjectStore;
}

export function getMediaScanner(): MediaScanner {
  if (!productionMediaEnabled()) {
    return new DevelopmentMediaScanner(developmentMediaObjectStore);
  }

  const scanner =
    sartoriaGlobal.sartoriaClamAvMediaScanner ?? createClamAvMediaScanner(s3ObjectStore());

  if (process.env.NODE_ENV !== "production") {
    sartoriaGlobal.sartoriaClamAvMediaScanner = scanner;
  }

  return scanner;
}

export function getDevelopmentMediaServices(): Readonly<{
  repository: InMemoryWardrobeMediaRepository;
  objectStore: DevelopmentMediaObjectStore;
}> {
  if (productionMediaEnabled()) {
    throw new Error("Development media services are unavailable in production mode.");
  }

  return {
    repository: developmentRepository(),
    objectStore: developmentMediaObjectStore,
  };
}
