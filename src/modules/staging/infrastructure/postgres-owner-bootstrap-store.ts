import type { DatabasePool, DatabaseSession } from "@/lib/database/database-session";
import {
  OwnerBootstrapAlreadyCompletedError,
  type OwnerBootstrapStore,
} from "@/modules/staging/application/bootstrap-owner";

const bootstrapLockName = "sartoria-owner-bootstrap-v1";

export class OwnerBootstrapStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OwnerBootstrapStateError";
  }
}

async function rollbackQuietly(session: DatabaseSession): Promise<void> {
  try {
    await session.query("ROLLBACK");
  } catch {
    // Preserve the original failure while still releasing the session.
  }
}

export class PostgresOwnerBootstrapStore implements OwnerBootstrapStore {
  constructor(private readonly pool: DatabasePool) {}

  async reserve(input: Readonly<{
    ownerEmailSha256: string;
    isolationEmailSha256: string;
    operatorReference: string | null;
    startedAt: string;
  }>): Promise<void> {
    const session = await this.pool.connect();

    try {
      await session.query("BEGIN");
      await session.query("SELECT pg_advisory_xact_lock(hashtext($1))", [bootstrapLockName]);
      const existing = await session.query<Readonly<{ has_users: boolean; has_audit: boolean }>>(
        `SELECT
          EXISTS (SELECT 1 FROM "user" LIMIT 1) AS has_users,
          EXISTS (SELECT 1 FROM sartoria_owner_bootstrap_audit LIMIT 1) AS has_audit`,
      );
      const state = existing.rows[0];
      if (!state) {
        throw new OwnerBootstrapStateError("Could not read the identity bootstrap state.");
      }
      if (state.has_users || state.has_audit) {
        throw new OwnerBootstrapAlreadyCompletedError();
      }

      await session.query(
        `INSERT INTO sartoria_owner_bootstrap_audit (
          id,
          status,
          owner_id,
          isolation_user_id,
          owner_email_sha256,
          isolation_email_sha256,
          operator_reference,
          started_at,
          completed_at
        ) VALUES (1, 'pending', NULL, NULL, $1, $2, $3, $4, NULL)`,
        [
          input.ownerEmailSha256,
          input.isolationEmailSha256,
          input.operatorReference,
          input.startedAt,
        ],
      );
      await session.query("COMMIT");
    } catch (error) {
      await rollbackQuietly(session);
      throw error;
    } finally {
      session.release();
    }
  }

  async complete(input: Readonly<{
    ownerId: string;
    isolationUserId: string;
    completedAt: string;
  }>): Promise<void> {
    const session = await this.pool.connect();

    try {
      await session.query("BEGIN");
      await session.query("SELECT pg_advisory_xact_lock(hashtext($1))", [bootstrapLockName]);
      const update = await session.query(
        `UPDATE sartoria_owner_bootstrap_audit
        SET
          status = 'completed',
          owner_id = $1,
          isolation_user_id = $2,
          completed_at = $3
        WHERE
          id = 1
          AND status = 'pending'
          AND owner_id IS NULL
          AND isolation_user_id IS NULL
          AND completed_at IS NULL`,
        [input.ownerId, input.isolationUserId, input.completedAt],
      );
      if (update.rowCount !== 1) {
        throw new OwnerBootstrapStateError(
          "The staging identities were created, but the bootstrap audit reservation could not be completed.",
        );
      }
      await session.query("COMMIT");
    } catch (error) {
      await rollbackQuietly(session);
      throw error;
    } finally {
      session.release();
    }
  }
}
