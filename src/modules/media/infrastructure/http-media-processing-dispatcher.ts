import type { MediaProcessingDispatcher } from "@/modules/media/application/media-processing-dispatcher";

export class MediaQueueConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaQueueConfigurationError";
  }
}

export class HttpMediaProcessingDispatcher implements MediaProcessingDispatcher {
  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  async dispatch(input: Readonly<{ mediaId: string; ownerId: string }>): Promise<void> {
    const response = await fetch(this.url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.token}`,
        "content-type": "application/json",
        "idempotency-key": `media-scan:${input.mediaId}`,
      },
      body: JSON.stringify(input),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      throw new Error(`Media processing dispatch failed with status ${response.status}.`);
    }
  }
}

export function createHttpMediaProcessingDispatcher(): HttpMediaProcessingDispatcher {
  const url = process.env.MEDIA_PROCESSING_QUEUE_URL?.trim();
  const token = process.env.MEDIA_PROCESSING_QUEUE_TOKEN?.trim();

  if (!url) {
    throw new MediaQueueConfigurationError(
      "MEDIA_PROCESSING_QUEUE_URL is required for production media processing.",
    );
  }

  if (!token || token.length < 32) {
    throw new MediaQueueConfigurationError(
      "MEDIA_PROCESSING_QUEUE_TOKEN must contain at least 32 characters.",
    );
  }

  return new HttpMediaProcessingDispatcher(url, token);
}
