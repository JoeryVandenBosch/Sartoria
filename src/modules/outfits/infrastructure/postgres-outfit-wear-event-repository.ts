import type { DatabasePool } from "@/lib/database/database-session";
import { withOwnerDatabaseSession } from "@/lib/database/with-owner-session";
import type { OutfitWearEventRepository } from "@/modules/outfits/application/outfit-wear-event-repository";
import type { OutfitWearEvent } from "@/modules/outfits/domain/outfit-wear-event";

type OutfitWearEventRow = Readonly<{
  id: string;
  outfit_id: string;
  owner_id: string;
  worn_on: Date | string;
  note: string | null;
  created_at: Date | string;
}>;

function dateOnly(value: Date | string): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

function timestamp(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapRow(row: OutfitWearEventRow): OutfitWearEvent {
  return Object.freeze({
    id: row.id,
    outfitId: row.outfit_id,
    ownerId: row.owner_id,
    wornOn: dateOnly(row.worn_on),
    note: row.note,
    createdAt: timestamp(row.created_at),
  });
}

export class PostgresOutfitWearEventRepository implements OutfitWearEventRepository {
  constructor(private readonly pool: DatabasePool) {}

  async create(event: OutfitWearEvent): Promise<void> {
    await withOwnerDatabaseSession(this.pool, event.ownerId, async (session) => {
      const result = await session.query(
        `INSERT INTO outfit_wear_events (
          id,
          outfit_id,
          owner_id,
          worn_on,
          note,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO NOTHING`,
        [
          event.id,
          event.outfitId,
          event.ownerId,
          event.wornOn,
          event.note,
          event.createdAt,
        ],
      );

      if (result.rowCount !== 1) {
        throw new Error("The wear-event identifier already exists.");
      }
    });
  }

  async listByOutfitForOwner(
    outfitId: string,
    ownerId: string,
  ): Promise<readonly OutfitWearEvent[]> {
    return withOwnerDatabaseSession(this.pool, ownerId, async (session) => {
      const result = await session.query<OutfitWearEventRow>(
        `SELECT id, outfit_id, owner_id, worn_on, note, created_at
        FROM outfit_wear_events
        WHERE outfit_id = $1 AND owner_id = $2
        ORDER BY worn_on DESC, created_at DESC, id DESC`,
        [outfitId, ownerId],
      );
      return Object.freeze(result.rows.map(mapRow));
    });
  }

  async deleteByIdForOwner(eventId: string, ownerId: string): Promise<boolean> {
    return withOwnerDatabaseSession(this.pool, ownerId, async (session) => {
      const result = await session.query(
        `DELETE FROM outfit_wear_events
        WHERE id = $1 AND owner_id = $2`,
        [eventId, ownerId],
      );
      return result.rowCount === 1;
    });
  }

  async deleteByOutfitForOwner(outfitId: string, ownerId: string): Promise<number> {
    return withOwnerDatabaseSession(this.pool, ownerId, async (session) => {
      const result = await session.query(
        `DELETE FROM outfit_wear_events
        WHERE outfit_id = $1 AND owner_id = $2`,
        [outfitId, ownerId],
      );
      return result.rowCount ?? 0;
    });
  }
}
