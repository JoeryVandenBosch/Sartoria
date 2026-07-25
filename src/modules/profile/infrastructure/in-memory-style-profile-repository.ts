import {
  StyleProfileRevisionConflictError,
  type StyleProfileRepository,
} from "@/modules/profile/application/style-profile-repository";
import type { StyleProfile } from "@/modules/profile/domain/style-profile";

export class InMemoryStyleProfileRepository implements StyleProfileRepository {
  private readonly profiles = new Map<string, StyleProfile>();

  async findByOwner(ownerId: string): Promise<StyleProfile | null> {
    return this.profiles.get(ownerId) ?? null;
  }

  async save(profile: StyleProfile, expectedRevision: number): Promise<void> {
    const current = this.profiles.get(profile.ownerId);
    if ((current?.revision ?? 0) !== expectedRevision) {
      throw new StyleProfileRevisionConflictError();
    }

    this.profiles.set(profile.ownerId, profile);
  }

  async deleteByOwner(ownerId: string, expectedRevision: number): Promise<boolean> {
    const current = this.profiles.get(ownerId);
    if ((current?.revision ?? 0) !== expectedRevision) {
      throw new StyleProfileRevisionConflictError();
    }

    return this.profiles.delete(ownerId);
  }

  clear(): void {
    this.profiles.clear();
  }
}
