import type { StyleProfile } from "@/modules/profile/domain/style-profile";

export class StyleProfileRevisionConflictError extends Error {
  constructor() {
    super("The style profile changed in another session. Reload it before saving again.");
    this.name = "StyleProfileRevisionConflictError";
  }
}

export interface StyleProfileRepository {
  findByOwner(ownerId: string): Promise<StyleProfile | null>;
  save(profile: StyleProfile, expectedRevision: number): Promise<void>;
  deleteByOwner(ownerId: string, expectedRevision: number): Promise<boolean>;
}
