import { createConnection, type Socket } from "node:net";
import { once } from "node:events";

import { fileTypeFromBuffer } from "file-type";

import type { MediaObjectReader } from "@/modules/media/application/media-object-store";
import type {
  MediaScanner,
  MediaScanResult,
} from "@/modules/media/application/media-scanner";
import {
  allowedWardrobeMediaTypes,
  maximumWardrobeMediaBytes,
  type WardrobeMediaType,
} from "@/modules/media/domain/wardrobe-media";

const fileSignatureBytes = 8_192;
const clamAvChunkBytes = 64 * 1024;

export class MediaScannerConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaScannerConfigurationError";
  }
}

type ClamAvConfiguration = Readonly<{
  host: string;
  port: number;
  timeoutMilliseconds: number;
}>;

export function readClamAvConfiguration(): ClamAvConfiguration {
  const host = process.env.CLAMAV_HOST?.trim();
  if (!host) {
    throw new MediaScannerConfigurationError("CLAMAV_HOST is required for production media scanning.");
  }

  const port = Number(process.env.CLAMAV_PORT ?? "3310");
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new MediaScannerConfigurationError("CLAMAV_PORT must be a valid TCP port.");
  }

  const timeoutMilliseconds = Number(process.env.CLAMAV_TIMEOUT_MS ?? "30000");
  if (
    !Number.isSafeInteger(timeoutMilliseconds) ||
    timeoutMilliseconds < 1_000 ||
    timeoutMilliseconds > 120_000
  ) {
    throw new MediaScannerConfigurationError(
      "CLAMAV_TIMEOUT_MS must be between 1000 and 120000 milliseconds.",
    );
  }

  return { host, port, timeoutMilliseconds };
}

async function writeSocket(socket: Socket, data: Uint8Array): Promise<void> {
  if (!socket.write(data)) {
    await once(socket, "drain");
  }
}

function frame(chunk: Uint8Array): Uint8Array {
  const framed = Buffer.allocUnsafe(4 + chunk.byteLength);
  framed.writeUInt32BE(chunk.byteLength, 0);
  Buffer.from(chunk).copy(framed, 4);
  return framed;
}

async function connectClamAv(configuration: ClamAvConfiguration): Promise<Socket> {
  const socket = createConnection({
    host: configuration.host,
    port: configuration.port,
  });
  socket.setTimeout(configuration.timeoutMilliseconds, () => {
    socket.destroy(new Error("ClamAV scan timed out."));
  });

  await Promise.race([
    once(socket, "connect"),
    once(socket, "error").then(([error]) => Promise.reject(error)),
  ]);

  return socket;
}

async function receiveVerdict(socket: Socket): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of socket) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
    chunks.push(buffer);

    if (buffer.includes(0)) {
      break;
    }
  }

  return Buffer.concat(chunks).toString("utf8").replaceAll("\0", "").trim();
}

async function scanWithClamAv(
  stream: AsyncIterable<Uint8Array>,
  configuration: ClamAvConfiguration,
): Promise<string> {
  const socket = await connectClamAv(configuration);

  try {
    await writeSocket(socket, Buffer.from("zINSTREAM\0", "utf8"));

    let totalBytes = 0;
    for await (const sourceChunk of stream) {
      const chunk = Buffer.from(sourceChunk);
      totalBytes += chunk.byteLength;
      if (totalBytes > maximumWardrobeMediaBytes) {
        throw new Error("Media stream exceeded the configured maximum size.");
      }

      for (let offset = 0; offset < chunk.byteLength; offset += clamAvChunkBytes) {
        await writeSocket(socket, frame(chunk.subarray(offset, offset + clamAvChunkBytes)));
      }
    }

    await writeSocket(socket, Buffer.alloc(4));
    return await receiveVerdict(socket);
  } finally {
    socket.destroy();
  }
}

function detectedWardrobeType(mime: string | undefined): WardrobeMediaType | null {
  if (!mime || !allowedWardrobeMediaTypes.includes(mime as WardrobeMediaType)) {
    return null;
  }

  return mime as WardrobeMediaType;
}

export class ClamAvMediaScanner implements MediaScanner {
  constructor(
    private readonly objectReader: MediaObjectReader,
    private readonly configuration: ClamAvConfiguration,
  ) {}

  async scan(input: Readonly<{ mediaId: string; quarantineKey: string }>): Promise<MediaScanResult> {
    const prefix = await this.objectReader.readPrefix(input.quarantineKey, fileSignatureBytes);
    const detected = await fileTypeFromBuffer(prefix);
    const detectedContentType = detectedWardrobeType(detected?.mime);

    if (!detectedContentType) {
      return {
        verdict: "unsupported",
        detectedContentType: null,
        scanner: "clamav",
        reference: null,
      };
    }

    const verdict = await scanWithClamAv(
      await this.objectReader.streamObject(input.quarantineKey),
      this.configuration,
    );

    if (verdict.endsWith(" OK")) {
      return {
        verdict: "safe",
        detectedContentType,
        scanner: "clamav",
        reference: null,
      };
    }

    if (verdict.includes(" FOUND")) {
      return {
        verdict: "malicious",
        detectedContentType,
        scanner: "clamav",
        reference: verdict.slice(0, 255),
      };
    }

    throw new Error(`ClamAV returned an invalid or error verdict: ${verdict.slice(0, 255)}`);
  }
}

export function createClamAvMediaScanner(objectReader: MediaObjectReader): ClamAvMediaScanner {
  return new ClamAvMediaScanner(objectReader, readClamAvConfiguration());
}
