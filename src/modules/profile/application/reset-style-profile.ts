import {
  StyleProfileRevisionConflictError,
  type StyleProfileRepository,
} from "@/modules/profile/application/style-profile-repository";

export async function resetStyleProfile(
  input: Readonly<{ ownerId: string; expectedRevision: number }>,
  repository: StyleProfileRepository,
): Promise<boolean> {
  const current = await repository.findByOwner(input.ownerId);
  const currentRevision = current?.revision ?? 0;

  if (input.expectedRevision !== currentRevision) {
    throw new StyleProfileRevisionConflictError();
  }

  if (!current) {
    return false;
  }

  return repository.deleteByOwner(input.ownerId, input.expectedRevision);
}
