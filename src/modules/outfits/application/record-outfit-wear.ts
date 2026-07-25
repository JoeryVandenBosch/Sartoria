import type { OutfitRepository } from "@/modules/outfits/application/outfit-repository";
import type { OutfitWearEventRepository } from "@/modules/outfits/application/outfit-wear-event-repository";
import {
  createOutfitWearEvent,
  type OutfitWearEvent,
  type OutfitWearEventInput,
} from "@/modules/outfits/domain/outfit-wear-event";

export class OutfitWearAuthorizationError extends Error {
  constructor() {
    super("The outfit was not found.");
    this.name = "OutfitWearAuthorizationError";
  }
}

export async function recordOwnerOutfitWear(
  input: Readonly<{
    outfitId: string;
    ownerId: string;
    event: OutfitWearEventInput;
  }>,
  dependencies: Readonly<{
    outfitRepository: OutfitRepository;
    wearEventRepository: OutfitWearEventRepository;
    createId: () => string;
    now: () => Date;
  }>,
): Promise<OutfitWearEvent> {
  const outfit = await dependencies.outfitRepository.findByIdForOwner(
    input.outfitId,
    input.ownerId,
  );
  if (!outfit) {
    throw new OutfitWearAuthorizationError();
  }

  const event = createOutfitWearEvent({
    id: dependencies.createId(),
    outfitId: outfit.id,
    ownerId: input.ownerId,
    event: input.event,
    now: dependencies.now(),
  });
  await dependencies.wearEventRepository.create(event);
  return event;
}
