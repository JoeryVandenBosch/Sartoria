import {
  createWardrobeItem,
  type NewWardrobeItem,
  type WardrobeItem,
  type WardrobeItemFactoryDependencies,
} from "@/modules/wardrobe/domain/wardrobe-item";

import type { WardrobeItemRepository } from "./wardrobe-item-repository";

export type WardrobeEvent = Readonly<{
  name: "wardrobe.item.created";
  itemId: string;
  ownerId: string;
  category: string;
  occurredAt: string;
}>;

export type WardrobeEventSink = (event: WardrobeEvent) => void | Promise<void>;

export type CreateWardrobeItemDependencies = WardrobeItemFactoryDependencies &
  Readonly<{
    repository: WardrobeItemRepository;
    recordEvent?: WardrobeEventSink;
  }>;

export async function executeCreateWardrobeItem(
  input: NewWardrobeItem,
  dependencies: CreateWardrobeItemDependencies,
): Promise<WardrobeItem> {
  const item = createWardrobeItem(input, dependencies);
  await dependencies.repository.save(item);

  await dependencies.recordEvent?.({
    name: "wardrobe.item.created",
    itemId: item.id,
    ownerId: item.ownerId,
    category: item.category,
    occurredAt: dependencies.now().toISOString(),
  });

  return item;
}
