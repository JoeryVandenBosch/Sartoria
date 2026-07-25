import type { DatabasePool, DatabaseSession } from "@/lib/database/database-session";
import type { WardrobeItemRepository } from "@/modules/wardrobe/application/wardrobe-item-repository";
import {
  ownershipStatuses,
  wardrobeCategories,
  type OwnershipStatus,
  type WardrobeCategory,
  type WardrobeItem,
} from "@/modules/wardrobe/domain/wardrobe-item";

type WardrobeItemRow = Readonly<{
  id: string;
  owner_id: string;
  category: string;
  name: string;
  brand: string | null;
  primary_color: string;
  ownership_status: string;
  fit_notes: string | null;
  acquisition_cost_minor: number | string | null;
  acquisition_currency: string | null;
  created_at: Date | string;
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

function acquisitionCost(value: number | string | null): number | null {
  if (value === null) {
    return null;
  }
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(numeric) || numeric < 1) {
    throw new Error("Database returned an invalid acquisition cost.");
  }
  return numeric;
}

function mapRow(row: WardrobeItemRow): WardrobeItem {
  const createdAt =
    row.created_at instanceof Date
      ? row.created_at.toISOString()
      : new Date(row.created_at).toISOString();

  return Object.freeze({
    id: row.id,
    ownerId: row.owner_id,
    category: enumValue<WardrobeCategory>(row.category, wardrobeCategories, "wardrobe category"),
    name: row.name,
    brand: row.brand,
    primaryColor: row.primary_color,
    ownershipStatus: enumValue<OwnershipStatus>(
      row.ownership_status,
      ownershipStatuses,
      "ownership status",
    ),
    fitNotes: row.fit_notes,
    acquisitionCostMinor: acquisitionCost(row.acquisition_cost_minor),
    acquisitionCurrency: row.acquisition_currency,
    createdAt,
  });
}

async function withOwnerSession<Result>(
  pool: DatabasePool,
  ownerId: string,
  operation: (session: DatabaseSession) => Promise<Result>,
): Promise<Result> {
  const session = await pool.connect();

  try {
    await session.query("BEGIN");
    await session.query("SELECT set_config('app.user_id', $1, true)", [ownerId]);
    const result = await operation(session);
    await session.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await session.query("ROLLBACK");
    } catch {
      // Preserve the original failure. Connection cleanup still occurs below.
    }
    throw error;
  } finally {
    session.release();
  }
}

const selectedColumns = `
  id,
  owner_id,
  category,
  name,
  brand,
  primary_color,
  ownership_status,
  fit_notes,
  acquisition_cost_minor,
  acquisition_currency,
  created_at
`;

export class PostgresWardrobeItemRepository implements WardrobeItemRepository {
  constructor(private readonly pool: DatabasePool) {}

  async save(item: WardrobeItem): Promise<void> {
    await withOwnerSession(this.pool, item.ownerId, async (session) => {
      await session.query(
        `INSERT INTO wardrobe_items (
          id,
          owner_id,
          category,
          name,
          brand,
          primary_color,
          ownership_status,
          fit_notes,
          acquisition_cost_minor,
          acquisition_currency,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          item.id,
          item.ownerId,
          item.category,
          item.name,
          item.brand,
          item.primaryColor,
          item.ownershipStatus,
          item.fitNotes,
          item.acquisitionCostMinor,
          item.acquisitionCurrency,
          item.createdAt,
        ],
      );
    });
  }

  async listByOwner(ownerId: string): Promise<readonly WardrobeItem[]> {
    return withOwnerSession(this.pool, ownerId, async (session) => {
      const result = await session.query<WardrobeItemRow>(
        `SELECT ${selectedColumns}
        FROM wardrobe_items
        WHERE owner_id = $1
        ORDER BY created_at DESC`,
        [ownerId],
      );

      return result.rows.map(mapRow);
    });
  }

  async findByIdForOwner(itemId: string, ownerId: string): Promise<WardrobeItem | null> {
    return withOwnerSession(this.pool, ownerId, async (session) => {
      const result = await session.query<WardrobeItemRow>(
        `SELECT ${selectedColumns}
        FROM wardrobe_items
        WHERE id = $1 AND owner_id = $2
        LIMIT 1`,
        [itemId, ownerId],
      );

      const row = result.rows[0];
      return row ? mapRow(row) : null;
    });
  }
}
