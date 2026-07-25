import type { Pool, PoolClient, QueryResultRow } from "pg";

export type DatabaseResult<Row> = Readonly<{
  rows: readonly Row[];
  rowCount: number;
}>;

export interface DatabaseSession {
  query<Row>(text: string, values?: readonly unknown[]): Promise<DatabaseResult<Row>>;
  release(): void;
}

export interface DatabasePool {
  connect(): Promise<DatabaseSession>;
}

class NodePostgresSession implements DatabaseSession {
  constructor(private readonly client: PoolClient) {}

  async query<Row>(text: string, values: readonly unknown[] = []): Promise<DatabaseResult<Row>> {
    const result = await this.client.query<Row & QueryResultRow>(text, [...values]);
    return {
      rows: result.rows,
      rowCount: result.rowCount ?? 0,
    };
  }

  release(): void {
    this.client.release();
  }
}

export function createDatabasePool(pool: Pool): DatabasePool {
  return {
    async connect(): Promise<DatabaseSession> {
      return new NodePostgresSession(await pool.connect());
    },
  };
}
