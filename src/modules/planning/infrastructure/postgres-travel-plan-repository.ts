import type { DatabasePool, DatabaseSession } from "@/lib/database/database-session";
import { withOwnerDatabaseSession } from "@/lib/database/with-owner-session";
import {
  TravelPlanRevisionConflictError,
  type TravelPlanRepository,
} from "@/modules/planning/application/travel-plan-repository";
import type {
  TravelActivityContext,
  TravelClimateExpectation,
  TravelLaundryAccess,
  TravelPlan,
} from "@/modules/planning/domain/travel-plan";

type TravelPlanRow = Readonly<{
  id: string;
  owner_id: string;
  name: string;
  destination: string | null;
  start_date: Date | string;
  end_date: Date | string;
  climate: TravelClimateExpectation;
  activities: TravelActivityContext[];
  laundry_access: TravelLaundryAccess;
  notes: string | null;
  packing_warnings: string[];
  revision: number;
  created_at: Date | string;
  updated_at: Date | string;
  wardrobe_item_ids: string[] | null;
}>;

function dateOnly(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return value.slice(0, 10);
}

function timestamp(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapRow(row: TravelPlanRow): TravelPlan {
  return Object.freeze({
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    destination: row.destination,
    startDate: dateOnly(row.start_date),
    endDate: dateOnly(row.end_date),
    climate: row.climate,
    activities: Object.freeze([...row.activities]),
    laundryAccess: row.laundry_access,
    notes: row.notes,
    wardrobeItemIds: Object.freeze([...(row.wardrobe_item_ids ?? [])]),
    packingWarnings: Object.freeze([...row.packing_warnings]),
    revision: row.revision,
    createdAt: timestamp(row.created_at),
    updatedAt: timestamp(row.updated_at),
  });
}

const selectColumns = `
  p.id,
  p.owner_id,
  p.name,
  p.destination,
  p.start_date,
  p.end_date,
  p.climate,
  p.activities,
  p.laundry_access,
  p.notes,
  p.packing_warnings,
  p.revision,
  p.created_at,
  p.updated_at,
  COALESCE(
    array_agg(i.wardrobe_item_id ORDER BY i.position)
      FILTER (WHERE i.wardrobe_item_id IS NOT NULL),
    ARRAY[]::text[]
  ) AS wardrobe_item_ids
`;

async function insertMemberships(session: DatabaseSession, plan: TravelPlan): Promise<void> {
  for (const [position, wardrobeItemId] of plan.wardrobeItemIds.entries()) {
    await session.query(
      `INSERT INTO travel_plan_items (
        travel_plan_id, owner_id, wardrobe_item_id, position
      ) VALUES ($1, $2, $3, $4)`,
      [plan.id, plan.ownerId, wardrobeItemId, position],
    );
  }
}

export class PostgresTravelPlanRepository implements TravelPlanRepository {
  constructor(private readonly pool: DatabasePool) {}

  async create(plan: TravelPlan): Promise<void> {
    await withOwnerDatabaseSession(this.pool, plan.ownerId, async (session) => {
      const result = await session.query(
        `INSERT INTO travel_plans (
          id, owner_id, name, destination, start_date, end_date, climate, activities,
          laundry_access, notes, packing_warnings, revision, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5::date, $6::date, $7, $8::text[], $9, $10, $11::text[], $12, $13, $14
        )
        ON CONFLICT (id) DO NOTHING`,
        [
          plan.id,
          plan.ownerId,
          plan.name,
          plan.destination,
          plan.startDate,
          plan.endDate,
          plan.climate,
          [...plan.activities],
          plan.laundryAccess,
          plan.notes,
          [...plan.packingWarnings],
          plan.revision,
          plan.createdAt,
          plan.updatedAt,
        ],
      );
      if (result.rowCount !== 1) {
        throw new Error("The travel-plan identifier already exists.");
      }
      await insertMemberships(session, plan);
    });
  }

  async update(plan: TravelPlan, expectedRevision: number): Promise<void> {
    await withOwnerDatabaseSession(this.pool, plan.ownerId, async (session) => {
      const result = await session.query(
        `UPDATE travel_plans
        SET name = $3,
            destination = $4,
            start_date = $5::date,
            end_date = $6::date,
            climate = $7,
            activities = $8::text[],
            laundry_access = $9,
            notes = $10,
            packing_warnings = $11::text[],
            revision = $12,
            updated_at = $13
        WHERE id = $1 AND owner_id = $2 AND revision = $14`,
        [
          plan.id,
          plan.ownerId,
          plan.name,
          plan.destination,
          plan.startDate,
          plan.endDate,
          plan.climate,
          [...plan.activities],
          plan.laundryAccess,
          plan.notes,
          [...plan.packingWarnings],
          plan.revision,
          plan.updatedAt,
          expectedRevision,
        ],
      );
      if (result.rowCount !== 1) {
        throw new TravelPlanRevisionConflictError();
      }
      await session.query(
        "DELETE FROM travel_plan_items WHERE travel_plan_id = $1 AND owner_id = $2",
        [plan.id, plan.ownerId],
      );
      await insertMemberships(session, plan);
    });
  }

  async listByOwner(ownerId: string): Promise<readonly TravelPlan[]> {
    return withOwnerDatabaseSession(this.pool, ownerId, async (session) => {
      const result = await session.query<TravelPlanRow>(
        `SELECT ${selectColumns}
        FROM travel_plans p
        LEFT JOIN travel_plan_items i
          ON i.travel_plan_id = p.id AND i.owner_id = p.owner_id
        WHERE p.owner_id = $1
        GROUP BY p.id
        ORDER BY p.updated_at DESC, p.id DESC`,
        [ownerId],
      );
      return Object.freeze(result.rows.map(mapRow));
    });
  }

  async findByIdForOwner(planId: string, ownerId: string): Promise<TravelPlan | null> {
    return withOwnerDatabaseSession(this.pool, ownerId, async (session) => {
      const result = await session.query<TravelPlanRow>(
        `SELECT ${selectColumns}
        FROM travel_plans p
        LEFT JOIN travel_plan_items i
          ON i.travel_plan_id = p.id AND i.owner_id = p.owner_id
        WHERE p.id = $1 AND p.owner_id = $2
        GROUP BY p.id
        LIMIT 1`,
        [planId, ownerId],
      );
      const row = result.rows[0];
      return row ? mapRow(row) : null;
    });
  }

  async deleteByIdForOwner(
    planId: string,
    ownerId: string,
    expectedRevision: number,
  ): Promise<boolean> {
    return withOwnerDatabaseSession(this.pool, ownerId, async (session) => {
      const result = await session.query(
        "DELETE FROM travel_plans WHERE id = $1 AND owner_id = $2 AND revision = $3",
        [planId, ownerId, expectedRevision],
      );
      if (result.rowCount === 1) {
        return true;
      }
      const current = await session.query(
        "SELECT revision FROM travel_plans WHERE id = $1 AND owner_id = $2",
        [planId, ownerId],
      );
      if (current.rowCount === 1) {
        throw new TravelPlanRevisionConflictError();
      }
      return false;
    });
  }
}
