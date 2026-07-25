import type { DatabasePool } from "@/lib/database/database-session";
import { withOwnerDatabaseSession } from "@/lib/database/with-owner-session";
import {
  RecommendationRevisionConflictError,
  type RecommendationRepository,
} from "@/modules/recommendations/application/recommendation-repository";
import type {
  RecommendationConfidence,
  RecommendationItemReason,
  RecommendationStatus,
  WardrobeRecommendation,
} from "@/modules/recommendations/domain/wardrobe-recommendation";

type RecommendationRow = Readonly<{
  id: string;
  owner_id: string;
  occasion: string;
  request_notes: string | null;
  item_reasons: RecommendationItemReason[];
  summary: string;
  exclusions: string[];
  confidence: RecommendationConfidence;
  provenance_kind: "provider" | "fallback";
  provider: string | null;
  model: string | null;
  reason_code: string | null;
  status: RecommendationStatus;
  correction: string | null;
  rejection_reason: string | null;
  revision: number;
  created_at: Date | string;
  updated_at: Date | string;
  expires_at: Date | string;
}>;

function timestamp(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapRow(row: RecommendationRow): WardrobeRecommendation {
  return Object.freeze({
    id: row.id,
    ownerId: row.owner_id,
    request: Object.freeze({ occasion: row.occasion, notes: row.request_notes }),
    itemReasons: Object.freeze(
      row.item_reasons.map((item) => Object.freeze({ itemId: item.itemId, reason: item.reason })),
    ),
    summary: row.summary,
    exclusions: Object.freeze([...row.exclusions]),
    confidence: row.confidence,
    provenance: Object.freeze({
      kind: row.provenance_kind,
      provider: row.provider,
      model: row.model,
      reasonCode: row.reason_code,
      schemaVersion: "1" as const,
    }),
    status: row.status,
    correction: row.correction,
    rejectionReason: row.rejection_reason,
    revision: row.revision,
    createdAt: timestamp(row.created_at),
    updatedAt: timestamp(row.updated_at),
    expiresAt: timestamp(row.expires_at),
  });
}

const selectedColumns = `
  id,
  owner_id,
  occasion,
  request_notes,
  item_reasons,
  summary,
  exclusions,
  confidence,
  provenance_kind,
  provider,
  model,
  reason_code,
  status,
  correction,
  rejection_reason,
  revision,
  created_at,
  updated_at,
  expires_at
`;

export class PostgresRecommendationRepository implements RecommendationRepository {
  constructor(private readonly pool: DatabasePool) {}

  async create(recommendation: WardrobeRecommendation): Promise<void> {
    await withOwnerDatabaseSession(this.pool, recommendation.ownerId, async (session) => {
      const result = await session.query(
        `INSERT INTO wardrobe_recommendations (
          id,
          owner_id,
          occasion,
          request_notes,
          item_reasons,
          summary,
          exclusions,
          confidence,
          provenance_kind,
          provider,
          model,
          reason_code,
          status,
          correction,
          rejection_reason,
          revision,
          created_at,
          updated_at,
          expires_at
        ) VALUES (
          $1, $2, $3, $4, $5::jsonb, $6, $7::text[], $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19
        )
        ON CONFLICT (id) DO NOTHING`,
        [
          recommendation.id,
          recommendation.ownerId,
          recommendation.request.occasion,
          recommendation.request.notes,
          JSON.stringify(recommendation.itemReasons),
          recommendation.summary,
          [...recommendation.exclusions],
          recommendation.confidence,
          recommendation.provenance.kind,
          recommendation.provenance.provider,
          recommendation.provenance.model,
          recommendation.provenance.reasonCode,
          recommendation.status,
          recommendation.correction,
          recommendation.rejectionReason,
          recommendation.revision,
          recommendation.createdAt,
          recommendation.updatedAt,
          recommendation.expiresAt,
        ],
      );
      if (result.rowCount !== 1) {
        throw new Error("The recommendation identifier already exists.");
      }
    });
  }

  async listByOwner(ownerId: string): Promise<readonly WardrobeRecommendation[]> {
    return withOwnerDatabaseSession(this.pool, ownerId, async (session) => {
      const result = await session.query<RecommendationRow>(
        `SELECT ${selectedColumns}
        FROM wardrobe_recommendations
        WHERE owner_id = $1
        ORDER BY updated_at DESC, id DESC`,
        [ownerId],
      );
      return Object.freeze(result.rows.map(mapRow));
    });
  }

  async findByIdForOwner(
    recommendationId: string,
    ownerId: string,
  ): Promise<WardrobeRecommendation | null> {
    return withOwnerDatabaseSession(this.pool, ownerId, async (session) => {
      const result = await session.query<RecommendationRow>(
        `SELECT ${selectedColumns}
        FROM wardrobe_recommendations
        WHERE id = $1 AND owner_id = $2
        LIMIT 1`,
        [recommendationId, ownerId],
      );
      const row = result.rows[0];
      return row ? mapRow(row) : null;
    });
  }

  async update(recommendation: WardrobeRecommendation, expectedRevision: number): Promise<void> {
    await withOwnerDatabaseSession(this.pool, recommendation.ownerId, async (session) => {
      const result = await session.query(
        `UPDATE wardrobe_recommendations
        SET
          status = $3,
          correction = $4,
          rejection_reason = $5,
          revision = $6,
          updated_at = $7
        WHERE id = $1 AND owner_id = $2 AND revision = $8`,
        [
          recommendation.id,
          recommendation.ownerId,
          recommendation.status,
          recommendation.correction,
          recommendation.rejectionReason,
          recommendation.revision,
          recommendation.updatedAt,
          expectedRevision,
        ],
      );
      if (result.rowCount !== 1) {
        throw new RecommendationRevisionConflictError();
      }
    });
  }

  async deleteByIdForOwner(recommendationId: string, ownerId: string): Promise<boolean> {
    return withOwnerDatabaseSession(this.pool, ownerId, async (session) => {
      const result = await session.query(
        "DELETE FROM wardrobe_recommendations WHERE id = $1 AND owner_id = $2",
        [recommendationId, ownerId],
      );
      return result.rowCount === 1;
    });
  }
}
