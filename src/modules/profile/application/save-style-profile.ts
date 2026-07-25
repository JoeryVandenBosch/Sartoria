import {
  StyleProfileRevisionConflictError,
  type StyleProfileRepository,
} from "@/modules/profile/application/style-profile-repository";
import {
  createStyleProfile,
  updateStyleProfile,
  type StyleProfile,
  type StyleProfileInput,
} from "@/modules/profile/domain/style-profile";

export async function saveStyleProfile(
  input: Readonly<{
    ownerId: string;
    expectedRevision: number;
    preferences: StyleProfileInput;
  }>,
  dependencies: Readonly<{
    repository: StyleProfileRepository;
    now: () => Date;
  }>,
): Promise<StyleProfile> {
  const current = await dependencies.repository.findByOwner(input.ownerId);
  const currentRevision = current?.revision ?? 0;

  if (input.expectedRevision !== currentRevision) {
    throw new StyleProfileRevisionConflictError();
  }

  const profile = current
    ? updateStyleProfile(current, input.preferences, dependencies.now())
    : createStyleProfile(input.ownerId, input.preferences, dependencies.now());

  await dependencies.repository.save(profile, input.expectedRevision);
  return profile;
}
