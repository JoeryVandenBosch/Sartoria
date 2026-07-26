import { describe, expect, it } from "vitest";

import type {
  DatabasePool,
  DatabaseResult,
  DatabaseSession,
} from "@/lib/database/database-session";
import { OwnerBootstrapAlreadyCompletedError } from "@/modules/staging/application/bootstrap-owner";
import {
  OwnerBootstrapStateError,
  PostgresOwnerBootstrapStore,
} from "@/modules/staging/infrastructure/postgres-owner-bootstrap-store";

type RecordedQuery = Readonly<{ text: string; values: readonly unknown[] }>;

class FakeSession implements DatabaseSession {
  readonly queries: RecordedQuery[] = [];
  released = false;
  state = { has_users: false, has_audit: false };
  updateRowCount = 1;

  async query<Row>(text: string, values: readonly unknown[] = []): Promise<DatabaseResult<Row>> {
    this.queries.push({ text, values });
    if (text.includes("EXISTS (SELECT 1 FROM \"user\"")) {
      return { rows: [this.state as unknown as Row], rowCount: 1 };
    }
    if (text.startsWith("UPDATE sartoria_owner_bootstrap_audit")) {
      return { rows: [], rowCount: this.updateRowCount };
    }
    return { rows: [], rowCount: 0 };
  }

  release(): void {
    this.released = true;
  }
}

class FakePool implements DatabasePool {
  constructor(private readonly sessions: FakeSession[]) {}

  async connect(): Promise<DatabaseSession> {
    const session = this.sessions.shift();
    if (!session) throw new Error("No fake database session available.");
    return session;
  }
}

describe("PostgresOwnerBootstrapStore", () => {
  it("serialises and reserves both identity digests before user creation", async () => {
    const session = new FakeSession();
    const store = new PostgresOwnerBootstrapStore(new FakePool([session]));

    await store.reserve({
      ownerEmailSha256: "a".repeat(64),
      isolationEmailSha256: "b".repeat(64),
      operatorReference: "change-17",
      startedAt: "2026-07-26T08:00:00.000Z",
    });

    expect(session.queries.map((query) => query.text.trim().split("\n")[0])).toEqual([
      "BEGIN",
      "SELECT pg_advisory_xact_lock(hashtext($1))",
      "SELECT",
      "INSERT INTO sartoria_owner_bootstrap_audit (",
      "COMMIT",
    ]);
    expect(session.queries[1]?.values).toEqual(["sartoria-owner-bootstrap-v1"]);
    expect(session.queries[3]?.values).toEqual([
      "a".repeat(64),
      "b".repeat(64),
      "change-17",
      "2026-07-26T08:00:00.000Z",
    ]);
    expect(session.released).toBe(true);
  });

  it("rejects when a Better Auth user or audit reservation already exists", async () => {
    const session = new FakeSession();
    session.state = { has_users: true, has_audit: false };
    const store = new PostgresOwnerBootstrapStore(new FakePool([session]));

    await expect(
      store.reserve({
        ownerEmailSha256: "a".repeat(64),
        isolationEmailSha256: "b".repeat(64),
        operatorReference: null,
        startedAt: "2026-07-26T08:00:00.000Z",
      }),
    ).rejects.toBeInstanceOf(OwnerBootstrapAlreadyCompletedError);
    expect(session.queries.some((query) => query.text === "ROLLBACK")).toBe(true);
    expect(session.released).toBe(true);
  });

  it("completes only an existing pending reservation with two distinct users", async () => {
    const session = new FakeSession();
    const store = new PostgresOwnerBootstrapStore(new FakePool([session]));

    await store.complete({
      ownerId: "owner-1",
      isolationUserId: "isolation-1",
      completedAt: "2026-07-26T08:00:01.000Z",
    });

    const update = session.queries.find((query) =>
      query.text.startsWith("UPDATE sartoria_owner_bootstrap_audit"),
    );
    expect(update?.values).toEqual([
      "owner-1",
      "isolation-1",
      "2026-07-26T08:00:01.000Z",
    ]);
    expect(session.released).toBe(true);
  });

  it("fails closed when the pending reservation cannot be completed", async () => {
    const session = new FakeSession();
    session.updateRowCount = 0;
    const store = new PostgresOwnerBootstrapStore(new FakePool([session]));

    await expect(
      store.complete({
        ownerId: "owner-1",
        isolationUserId: "isolation-1",
        completedAt: "2026-07-26T08:00:01.000Z",
      }),
    ).rejects.toBeInstanceOf(OwnerBootstrapStateError);
    expect(session.queries.some((query) => query.text === "ROLLBACK")).toBe(true);
    expect(session.released).toBe(true);
  });
});
