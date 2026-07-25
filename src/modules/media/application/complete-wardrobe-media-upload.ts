import type { MediaObjectStore } from "@/modules/media/application/media-object-store";
import type { WardrobeMediaRepository } from "@/modules/media/application/wardrobe-media-repository";
import {
  maximumWardrobeMediaBytes,
  markWardrobeMediaUploaded,
  rejectWardrobeMedia,
  type MediaRejectionCode,
  type WardrobeMedia,
} from "@/modules/media/domain/wardrobe-media";

export class WardrobeMediaNotFoundError extends Error {
  constructor() {
    super("The media record was not found.");
    this.name = "WardrobeMediaNotFoundError";
  }
}

async function rejectUpload(
  media: WardrobeMedia,
  code: MediaRejectionCode,
  dependencies: Readonly<{
    mediaRepository: WardrobeMediaRepository;
    objectStore: MediaObjectStore;
    now: () => Date;
  }>,
  deleteObject: boolean,
): Promise<WardrobeMedia> {
  if (deleteObject) {
    await dependencies.objectStore.deleteObjects([media.quarantineKey]);
  }

  const rejected = rejectWardrobeMedia(media, {
    code,
    now: dependencies.now(),
  });
  await dependencies.mediaRepository.update(rejected, media.status);
  return rejected;
}

export async function completeWardrobeMediaUpload(
  input: Readonly<{ mediaId: string; ownerId: string }>,
  dependencies: Readonly<{
    mediaRepository: WardrobeMediaRepository;
    objectStore: MediaObjectStore;
    now: () => Date;
  }>,
): Promise<WardrobeMedia> {
  const media = await dependencies.mediaRepository.findByIdForOwner(input.mediaId, input.ownerId);

  if (!media || media.status !== "initiated") {
    throw new WardrobeMediaNotFoundError();
  }

  const object = await dependencies.objectStore.inspectQuarantineObject(media.quarantineKey);

  if (!object) {
    return rejectUpload(media, "object-missing", dependencies, false);
  }

  if (object.mediaId !== media.id || object.key !== media.quarantineKey) {
    return rejectUpload(media, "metadata-mismatch", dependencies, true);
  }

  if (object.sizeBytes < 1) {
    return rejectUpload(media, "empty-object", dependencies, true);
  }

  if (object.sizeBytes > maximumWardrobeMediaBytes) {
    return rejectUpload(media, "oversized-object", dependencies, true);
  }

  if (object.declaredContentType !== media.declaredContentType) {
    return rejectUpload(media, "metadata-mismatch", dependencies, true);
  }

  const uploaded = markWardrobeMediaUploaded(media, object.sizeBytes, dependencies.now());
  await dependencies.mediaRepository.update(uploaded, "initiated");
  return uploaded;
}
