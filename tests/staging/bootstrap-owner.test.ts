import { createHash } from "node:crypto";
import { NULL_OPERATIONAL_EVENT_EMITTER } from "@/lib/observability/operational-event-emitter";

import { describe, expect, it, vi } from "vitest";

import {
  bootstrapOwner,
  OwnerBootstrapAlreadyCompletedError,
  OwnerBootstrapValidationError,
  type OwnerBootstrapStore,
} from "@/modules/staging/application/bootstrap-owner";

class FakeOwnerBootstrapStore implements OwnerBootstrapStore {
  reservation: Parameters<OwnerBootstrapStore["reserve"]>[0] | null = null;
  completion: Parameters<OwnerBootstrapStore["complete"]>[0] | null = null;
  reserveFailure: Error | null = null;

  async reserve(input: Parameters<OwnerBootstrapStore["reserve"]>[0]): Promise<void> {
    if (this.reserveFailure) throw this.reserveFailure;
    this.reservation = input;
  }

  async complete(input: Parameters<OwnerBootstrapStore["complete"]>[0]): Promise<void> {
    this.completion = input;
  }
}

const request = {
  owner: {
    name: "  Joery Van den Bosch  ",
    email: "  OWNER@EXAMPLE.COM ",
    password: "correct horse battery staple",
  },
  isolationUser: {
    name: "  Isolation User  ",
    email: "  ISOLATION@EXAMPLE.COM ",
    password: "another correct horse battery staple",
  },
  operatorReference: "  change-17  ",
} as const;

describe("bootstrapOwner", () => {
  it("creates owner and isolation identities through auth and completes one audit", async () => {
    const store = new FakeOwnerBootstrapStore();
    const createAuthenticationUser = vi.fn(async (input) => ({
      id: input.email.startsWith("owner") ? "owner-1" : "isolation-1",
      name: input.name,
      email: input.email,
    }));
    const times = [
      new Date("2026-07-26T08:00:00.000Z"),
      new Date("2026-07-26T08:00:01.000Z"),
    ];

    const result = await bootstrapOwner(request, {
      emitter: NULL_OPERATIONAL_EVENT_EMITTER,
      store,
      createAuthenticationUser,
      now: () => times.shift() ?? new Date("2026-07-26T08:00:01.000Z"),
    });

    expect(store.reservation).toEqual({
      ownerEmailSha256: createHash("sha256").update("owner@example.com").digest("hex"),
      isolationEmailSha256: createHash("sha256")
        .update("isolation@example.com")
        .digest("hex"),
      operatorReference: "change-17",
      startedAt: "2026-07-26T08:00:00.000Z",
    });
    expect(createAuthenticationUser).toHaveBeenNthCalledWith(1, {
      name: "Joery Van den Bosch",
      email: "owner@example.com",
      password: "correct horse battery staple",
    });
    expect(createAuthenticationUser).toHaveBeenNthCalledWith(2, {
      name: "Isolation User",
      email: "isolation@example.com",
      password: "another correct horse battery staple",
    });
    expect(store.completion).toEqual({
      ownerId: "owner-1",
      isolationUserId: "isolation-1",
      completedAt: "2026-07-26T08:00:01.000Z",
    });
    expect(result).toEqual({
      owner: {
        id: "owner-1",
        name: "Joery Van den Bosch",
        email: "owner@example.com",
      },
      isolationUser: {
        id: "isolation-1",
        name: "Isolation User",
        email: "isolation@example.com",
      },
      createdAt: "2026-07-26T08:00:01.000Z",
    });
  });

  it("does not create users when bootstrap was already reserved", async () => {
    const store = new FakeOwnerBootstrapStore();
    store.reserveFailure = new OwnerBootstrapAlreadyCompletedError();
    const createAuthenticationUser = vi.fn();

    await expect(
      bootstrapOwner(request, {
      emitter: NULL_OPERATIONAL_EVENT_EMITTER,
        store,
        createAuthenticationUser,
        now: () => new Date("2026-07-26T08:00:00.000Z"),
      }),
    ).rejects.toBeInstanceOf(OwnerBootstrapAlreadyCompletedError);
    expect(createAuthenticationUser).not.toHaveBeenCalled();
  });

  it("leaves the reservation pending when either user creation fails", async () => {
    const store = new FakeOwnerBootstrapStore();
    let attempt = 0;

    await expect(
      bootstrapOwner(request, {
      emitter: NULL_OPERATIONAL_EVENT_EMITTER,
        store,
        createAuthenticationUser: async (input) => {
          attempt += 1;
          if (attempt === 2) throw new Error("authentication database failure");
          return { id: "owner-1", name: input.name, email: input.email };
        },
        now: () => new Date("2026-07-26T08:00:00.000Z"),
      }),
    ).rejects.toThrow("authentication database failure");
    expect(store.reservation).not.toBeNull();
    expect(store.completion).toBeNull();
  });

  it("rejects duplicate identity emails before reserving bootstrap", async () => {
    const store = new FakeOwnerBootstrapStore();

    await expect(
      bootstrapOwner(
        {
          ...request,
          isolationUser: { ...request.isolationUser, email: "owner@example.com" },
        },
        {
      emitter: NULL_OPERATIONAL_EVENT_EMITTER,
          store,
          createAuthenticationUser: vi.fn(),
          now: () => new Date("2026-07-26T08:00:00.000Z"),
        },
      ),
    ).rejects.toBeInstanceOf(OwnerBootstrapValidationError);
    expect(store.reservation).toBeNull();
  });
});
