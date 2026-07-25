import type { DatabasePool, DatabaseSession } from "@/lib/database/database-session";
import { withOwnerDatabaseSession } from "@/lib/database/with-owner-session";
import {
  OutfitRevisionConflictError,
  type OutfitRepository,
} from "@/modules/outfits/application/outfit-repository";
import type { Outfit } from "@/modules/outfits/domain/outfit";

type OutfitRow = Readonly<{
  id: string;
  owner_id: string;
  name: string;
  occasion: string | null;
  styling_notes: string | null;
  revision: number;
  created_at: Date | string;
  updated_at: Date | string;
  wardrobe_item_ids: string[];
}>;

const selectedColumns = `
  o.id,
  o.owner_id,
  o.name,
  o.occasion,
  o.styling_notes,
  o.revision,
  o.created_at,
  o.updated_at,
  COALESCE(
    array_agg(oi.wardrobe_item_id ORDER BY oi.position)
      FILTER (WHERE oi.wardrobe_item_id IS NOT NULL),
    '{}'::text[]
  ) AS wardrobe_item_ids
`;

function timestamp(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapRow(row: OutfitRow): Outfit {
  return Object.freeze({
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    occasion: row.occasion,
    stylingNotes: row.styling_notes,
    wardrobeItemIds: Object.freeze([...row.wardrobe_item_ids]),
    revision: row.revision,
    createdAt: timestamp(row.created_at),
    updatedAt: timestamp(row.updated_at),
  });
}

async function insertMemberships(session: DatabaseSession, outfit: Outfit): Promise<void> {
  for (const [index, wardrobeItemId] of outfit.wardrobeItemIds.entries()) {
    await session.query(
      `INSERT INTO outfit_items (
        outfit_id,
        owner_id,
        wardrobe_item_id,
        position
      ) VALUES ($1, $2, $3, $4)`,
      [outfit.id, outfit.ownerId, wardrobeItemId, index + 1],
    );
  }
}

export class PostgresOutfitRepository implements OutfitRepository {
  constructor(private readonly pool: DatabasePool) {}

  async create(outfit: Outfit): Promise<void> {
    await withOwnerDatabaseSession(this.pool, outfit.ownerId, async (session) => {
      const result = await session.query(
        `INSERT INTO outfits (
          id,
          owner_id,
          name,
          occasion,
          styling_notes,
          revision,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO NOTHING`,
        [
          outfit.id,
          outfit.ownerId,
          outfit.name,
          outfit.occasion,
          outfit.stylingNotes,
          outfit.revision,
          outfit.createdAt,
          outfit.updatedAt,
        ],
      );

      if (result.rowCount !== 1) {
        throw new Error("The outfit identifier already exists.");
      }

      await insertMemberships(session, outfit);
    });
  }

  async update(outfit: Outfit, expectedRevision: number): Promise<void> {
    await withOwnerDatabaseSession(this.pool, outfit.ownerId, async (session) => {
      const result = await session.query(
        `UPDATE outfits
        SET
          name = $3,
          occasion = $4,
          styling_notes = $5,
          revision = $6,
          updated_at = $7
        WHERE id = $1 AND owner_id = $2 AND revision = $8`,
        [
          outfit.id,
          outfit.ownerId,
          outfit.name,
          outfit.occasion,
          outfit.stylingNotes,
          outfit.revision,
          outfit.updatedAt,
          expectedRevision,
        ],
      );

      if (result.rowCount !== 1) {
        throw new OutfitRevisionConflictError();
      }

      await session.query(
        "DELETE FROM outfit_items WHERE outfit_id = $1 AND owner_id = $2",
        [outfit.id, outfit.ownerId],
      );
      await insertMemberships(session, outfit);
    });
  }

  async listByOwner(ownerId: string): Promise<readonly Outfit[]> {
    return withOwnerDatabaseSession(this.pool, ownerId, async (session) => {
      const result = await session.query<OutfitRow>(
        `SELECT ${selectedColumns}
        FROM outfits o
        LEFT JOIN outfit_items oi
          ON oi.outfit_id = o.id AND oi.owner_id = o.owner_id
        WHERE o.owner_id = $1
        GROUP BY o.id
        ORDER BY o.updated_at DESC, o.id DESC`,
        [ownerId],
      );
      return Object.freeze(result.rows.map(mapRow));
    });
  }

  async findByIdForOwner(outfitId: string, ownerId: string): Promise<Outfit | null> {
    return withOwnerDatabaseSession(this.pool, ownerId, async (session) => {
      const result = await session.query<OutfitRow>(
        `SELECT ${selectedColumns}
        FROM outfits o
        LEFT JOIN outfit_items oi
          ON oi.outfit_id = o.id AND oi.owner_id = o.owner_id
        WHERE o.id = $1 AND o.owner_id = $2
        GROUP BY o.id
        LIMIT 1`,
        [outfitId, ownerId],
      );
      const row = result.rows[0];
      return row ? mapRow(row) : null;
    });
  }

  async deleteByIdForOwner(
    outfitId: string,
    ownerId: string,
    expectedRevision: number,
  ): Promise<boolean> {
    return withOwnerDatabaseSession(this.pool, ownerId, async (session) => {
      const result = await session.query(
        `DELETE FROM outfits
        WHERE id = $1 AND owner_id = $2 AND revision = $3`,
        [outfitId, ownerId, expectedRevision],
      );

      if (result.rowCount === 1) {
        return true;
      }

      const current = await session.query(
        "SELECT 1 FROM outfits WHERE id = $1 AND owner_id = $2",
        [outfitId, ownerId],
      );
      if (current.rowCount > 0) {
        throw new OutfitRevisionConflictError();
      }
      return false;
    });
  }
}
