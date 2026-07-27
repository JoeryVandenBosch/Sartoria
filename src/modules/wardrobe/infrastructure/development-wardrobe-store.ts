import { InMemoryWardrobeItemRepository } from "./in-memory-wardrobe-item-repository";
import { seedDevelopmentWardrobe } from "./development-wardrobe-seed";

type DevelopmentGlobal = typeof globalThis & {
  sartoriaDevelopmentWardrobeRepository?: InMemoryWardrobeItemRepository;
};

const developmentGlobal = globalThis as DevelopmentGlobal;

export const developmentWardrobeRepository =
  developmentGlobal.sartoriaDevelopmentWardrobeRepository ??
  new InMemoryWardrobeItemRepository();

if (process.env.NODE_ENV !== "production") {
  developmentGlobal.sartoriaDevelopmentWardrobeRepository = developmentWardrobeRepository;
}

// Opt-in synthetic wardrobe for local exploration. No-op unless
// SARTORIA_DEV_SEED=true, and never active in production.
void seedDevelopmentWardrobe(developmentWardrobeRepository);
