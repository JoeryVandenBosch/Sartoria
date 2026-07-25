import type { StyleProfileRepository } from "@/modules/profile/application/style-profile-repository";
import type { StyleProfile } from "@/modules/profile/domain/style-profile";

export async function getStyleProfileForOwner(
  ownerId: string,
  repository: StyleProfileRepository,
): Promise<StyleProfile | null> {
  return repository.findByOwner(ownerId);
}
