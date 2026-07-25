import { InMemoryWardrobeItemRepository } from "./in-memory-wardrobe-item-repository";

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
