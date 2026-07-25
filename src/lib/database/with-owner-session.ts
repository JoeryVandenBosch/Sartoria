import type {
  DatabasePool,
  DatabaseSession,
} from "@/lib/database/database-session";

export async function withOwnerDatabaseSession<Result>(
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
