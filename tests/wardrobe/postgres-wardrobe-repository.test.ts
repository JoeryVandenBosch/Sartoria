import { afterEach, describe, expect, it } from "vitest";

import type {
  DatabasePool,
  DatabaseResult,
  DatabaseSession,
} from "@/lib/database/database-session";
import type { WardrobeItem } from "@/modules/wardrobe/domain/wardrobe-item";
import { PostgresWardrobeItemRepository } from "@/modules/wardrobe/infrastructure/postgres-wardrobe-item-repository";

type RecordedQuery = Readonly<{
  text: string;
  values: readonly unknown[];
}>;

class FakeSession implements DatabaseSession {
  readonly queries: RecordedQuery[] = [];
  readonly results: DatabaseResult<unknown>[] = [];
  released = false;
  failure: Error | null = null;

  async query<Row>(text: string, values: readonly unknown[] = []): Promise<DatabaseResult<Row>> {
    this.queries.push({ text, values });

    if (this.failure && !text.includes("ROLLBACK")) {
      const failure = this.failure;
      this.failure = null;
      throw failure;
    }

    return (this.results.shift() ?? { rows: [], rowCount: 0 }) as DatabaseResult<Row>;
  }

  release(): void {
    this.released = true;
  }
}

class FakePool implements DatabasePool {
  constructor(readonly session: FakeSession) {}

  async connect(): Promise<DatabaseSession> {
    return this.session;
  }
}

const item: WardrobeItem = {
  id: "item-1",
  ownerId: "owner-1",
  category: "tailoring",
  name: "Navy knitted blazer",
  brand: "Gran Sasso",
  primaryColor: "Navy",
  ownershipStatus: "owned",
  fitNotes: null,
  acquisitionCostMinor: null,
  acquisitionCurrency: null,
  createdAt: "2026-07-25T12:00:00.000Z",
};

afterEach(() => {
  delete process.env.DATABASE_URL;
});

describe("PostgresWardrobeItemRepository", () => {
  it("sets owner context and parameterises item creation", async () => {
    const session = new FakeSession();
    const repository = new PostgresWardrobeItemRepository(new FakePool(session));

    await repository.save(item);

    expect(session.queries.map((query) => query.text.trim().split("\n")[0])).toEqual([
      "BEGIN",
      "SELECT set_config('app.user_id', $1, true)",
      "INSERT INTO wardrobe_items (",
      "COMMIT",
    ]);
    expect(session.queries[1]?.values).toEqual(["owner-1"]);
    expect(session.queries[2]?.values).toEqual([
      "item-1",
      "owner-1",
      "tailoring",
      "Navy knitted blazer",
      "Gran Sasso",
      "Navy",
      "owned",
      null,
      null,
      null,
      "2026-07-25T12:00:00.000Z",
    ]);
    expect(session.released).toBe(true);
  });

  it("maps owner-scoped rows without exposing another owner query path", async () => {
    const session = new FakeSession();
    session.results.push(
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      {
        rows: [
          {
            id: "item-1",
            owner_id: "owner-1",
            category: "tailoring",
            name: "Navy knitted blazer",
            brand: "Gran Sasso",
            primary_color: "Navy",
            ownership_status: "owned",
            fit_notes: null,
            acquisition_cost_minor: null,
            acquisition_currency: null,
            created_at: new Date("2026-07-25T12:00:00.000Z"),
          },
        ],
        rowCount: 1,
      },
    );

    const repository = new PostgresWardrobeItemRepository(new FakePool(session));
    const items = await repository.listByOwner("owner-1");

    expect(items).toEqual([item]);
    const selectQuery = session.queries.find((query) => query.text.includes("FROM wardrobe_items"));
    expect(selectQuery?.text).toContain("WHERE owner_id = $1");
    expect(selectQuery?.values).toEqual(["owner-1"]);
  });

  it("rolls back and releases the session when a query fails", async () => {
    const session = new FakeSession();
    session.failure = new Error("database unavailable");
    const repository = new PostgresWardrobeItemRepository(new FakePool(session));

    await expect(repository.save(item)).rejects.toThrow("database unavailable");
    expect(session.queries.some((query) => query.text === "ROLLBACK")).toBe(true);
    expect(session.released).toBe(true);
  });
});
