import type { DatabasePool } from "@/lib/database/database-session";
import { withOwnerDatabaseSession } from "@/lib/database/with-owner-session";
import type { WardrobeMediaRepository } from "@/modules/media/application/wardrobe-media-repository";
import {
  allowedWardrobeMediaTypes,
  mediaRejectionCodes,
  wardrobeMediaStatuses,
  type MediaRejectionCode,
  type WardrobeMedia,
  type WardrobeMediaStatus,
  type WardrobeMediaType,
} from "@/modules/media/domain/wardrobe-media";

type WardrobeMediaRow = Readonly<{
  id: string;
  owner_id: string;
  wardrobe_item_id: string;
  original_filename: string;
  declared_content_type: string;
  detected_content_type: string | null;
  size_bytes: string | number | null;
  quarantine_key: string;
  private_key: string | null;
  status: string;
  scanner: string | null;
  scan_reference: string | null;
  rejection_code: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}>;

function enumValue<Value extends string>(
  value: string,
  allowed: readonly Value[],
  field: string,
): Value {
  if (!allowed.includes(value as Value)) {
    throw new Error(`Database returned unsupported ${field}: ${value}`);
  }

  return value as Value;
}

function nullableEnum<Value extends string>(
  value: string | null,
  allowed: readonly Value[],
  field: string,
): Value | null {
  return value === null ? null : enumValue(value, allowed, field);
}

function timestamp(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapRow(row: WardrobeMediaRow): WardrobeMedia {
  const numericSize = row.size_bytes === null ? null : Number(row.size_bytes);
  if (numericSize !== null && !Number.isSafeInteger(numericSize)) {
    throw new Error(`Database returned invalid media size: ${row.size_bytes}`);
  }

  return Object.freeze({
    id: row.id,
    ownerId: row.owner_id,
    wardrobeItemId: row.wardrobe_item_id,
    originalFilename: row.original_filename,
    declaredContentType: enumValue<WardrobeMediaType>(
      row.declared_content_type,
      allowedWardrobeMediaTypes,
      "declared media type",
    ),
    detectedContentType: nullableEnum<WardrobeMediaType>(
      row.detected_content_type,
      allowedWardrobeMediaTypes,
      "detected media type",
    ),
    sizeBytes: numericSize,
    quarantineKey: row.quarantine_key,
    privateKey: row.private_key,
    status: enumValue<WardrobeMediaStatus>(row.status, wardrobeMediaStatuses, "media status"),
    scanner: row.scanner,
    scanReference: row.scan_reference,
    rejectionCode: nullableEnum<MediaRejectionCode>(
      row.rejection_code,
      mediaRejectionCodes,
      "media rejection code",
    ),
    createdAt: timestamp(row.created_at),
    updatedAt: timestamp(row.updated_at),
  });
}

const selectedColumns = `
  id,
  owner_id,
  wardrobe_item_id,
  original_filename,
  declared_content_type,
  detected_content_type,
  size_bytes,
  quarantine_key,
  private_key,
  status,
  scanner,
  scan_reference,
  rejection_code,
  created_at,
  updated_at
`;

export class PostgresWardrobeMediaRepository implements WardrobeMediaRepository {
  constructor(private readonly pool: DatabasePool) {}

  async create(media: WardrobeMedia): Promise<void> {
    await withOwnerDatabaseSession(this.pool, media.ownerId, async (session) => {
      await session.query(
        `INSERT INTO wardrobe_media (
          id,
          owner_id,
          wardrobe_item_id,
          original_filename,
          declared_content_type,
          detected_content_type,
          size_bytes,
          quarantine_key,
          private_key,
          status,
          scanner,
          scan_reference,
          rejection_code,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          media.id,
          media.ownerId,
          media.wardrobeItemId,
          media.originalFilename,
          media.declaredContentType,
          media.detectedContentType,
          media.sizeBytes,
          media.quarantineKey,
          media.privateKey,
          media.status,
          media.scanner,
          media.scanReference,
          media.rejectionCode,
          media.createdAt,
          media.updatedAt,
        ],
      );
    });
  }

  async update(media: WardrobeMedia, expectedStatus: WardrobeMediaStatus): Promise<void> {
    await withOwnerDatabaseSession(this.pool, media.ownerId, async (session) => {
      const result = await session.query(
        `UPDATE wardrobe_media
        SET
          detected_content_type = $1,
          size_bytes = $2,
          private_key = $3,
          status = $4,
          scanner = $5,
          scan_reference = $6,
          rejection_code = $7,
          updated_at = $8
        WHERE id = $9 AND owner_id = $10 AND status = $11`,
        [
          media.detectedContentType,
          media.sizeBytes,
          media.privateKey,
          media.status,
          media.scanner,
          media.scanReference,
          media.rejectionCode,
          media.updatedAt,
          media.id,
          media.ownerId,
          expectedStatus,
        ],
      );

      if (result.rowCount !== 1) {
        throw new Error(
          `Wardrobe media ${media.id} was not updated from expected status ${expectedStatus}.`,
        );
      }
    });
  }

  async findByIdForOwner(mediaId: string, ownerId: string): Promise<WardrobeMedia | null> {
    return withOwnerDatabaseSession(this.pool, ownerId, async (session) => {
      const result = await session.query<WardrobeMediaRow>(
        `SELECT ${selectedColumns}
        FROM wardrobe_media
        WHERE id = $1 AND owner_id = $2
        LIMIT 1`,
        [mediaId, ownerId],
      );

      const row = result.rows[0];
      return row ? mapRow(row) : null;
    });
  }

  async listByWardrobeItemForOwner(
    wardrobeItemId: string,
    ownerId: string,
  ): Promise<readonly WardrobeMedia[]> {
    return withOwnerDatabaseSession(this.pool, ownerId, async (session) => {
      const result = await session.query<WardrobeMediaRow>(
        `SELECT ${selectedColumns}
        FROM wardrobe_media
        WHERE wardrobe_item_id = $1 AND owner_id = $2 AND status <> 'deleted'
        ORDER BY created_at DESC`,
        [wardrobeItemId, ownerId],
      );

      return result.rows.map(mapRow);
    });
  }
}
