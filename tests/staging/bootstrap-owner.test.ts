import { createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import {
  bootstrapOwner,
  OwnerBootstrapAlreadyCompletedError,
  type OwnerBootstrapStore,
} from "@/modules/staging/application/bootstrap-owner";

class FakeOwnerBootstrapStore implements OwnerBootstrapStore {
  reservation: Parameters<OwnerBootstrapStore["reserve"]>[0] | null = null;
  completion: Parameters<OwnerBootstrapStore["complete"]>[0] | null = null;
  reserveFailure: Error | null = null;

  async reserve(input: Parameters<OwnerBootstrapStore["reserve"]>[0]): Promise<void> {
    if (this.reserveFailure) {
      throw this.reserveFailure;
    }
    this.reservation = input;
  }

  async complete(input: Parameters<OwnerBootstrapStore["complete"]>[0]): Promise<void> {
    this.completion = input;
  }
}

describe("bootstrapOwner", () => {
  it("normalises identity, reserves evidence, creates through auth, and completes the audit", async () => {
    const store = new FakeOwnerBootstrapStore();
    const createAuthenticationUser = vi.fn(async (input) => ({
      id: "owner-1",
      name: input.name,
      email: input.email,
    }));
    const times = [
      new Date("2026-07-26T08:00:00.000Z"),
      new Date("2026-07-26T08:00:01.000Z"),
    ];

    const result = await bootstrapOwner(
      {
        name: "  Joery Van den Bosch  ",
        email: "  OWNER@EXAMPLE.COM ",
        password: "correct horse battery staple",
        operatorReference: "  change-17  ",
      },
      {
        store,
        createAuthenticationUser,
        now: () => times.shift() ?? new Date("2026-07-26T08:00:01.000Z"),
      },
    );

    expect(store.reservation).toEqual({
      emailSha256: createHash("sha256").update("owner@example.com").digest("hex"),
      operatorReference: "change-17",
      startedAt: "2026-07-26T08:00:00.000Z",
    });
    expect(createAuthenticationUser).toHaveBeenCalledWith({
      name: "Joery Van den Bosch",
      email: "owner@example.com",
      password: "correct horse battery staple",
    });
    expect(store.completion).toEqual({
      ownerId: "owner-1",
      completedAt: "2026-07-26T08:00:01.000Z",
    });
    expect(result).toEqual({
      ownerId: "owner-1",
      name: "Joery Van den Bosch",
      email: "owner@example.com",
      createdAt: "2026-07-26T08:00:01.000Z",
    });
  });

  it("does not create an authentication user when bootstrap was already reserved", async () => {
    const store = new FakeOwnerBootstrapStore();
    store.reserveFailure = new OwnerBootstrapAlreadyCompletedError();
    const createAuthenticationUser = vi.fn();

    await expect(
      bootstrapOwner(
        {
          name: "Owner",
          email: "owner@example.com",
          password: "correct horse battery staple",
          operatorReference: null,
        },
        {
          store,
          createAuthenticationUser,
          now: () => new Date("2026-07-26T08:00:00.000Z"),
        },
      ),
    ).rejects.toBeInstanceOf(OwnerBootstrapAlreadyCompletedError);
    expect(createAuthenticationUser).not.toHaveBeenCalled();
  });

  it("leaves the reservation pending when authentication user creation fails", async () => {
    const store = new FakeOwnerBootstrapStore();

    await expect(
      bootstrapOwner(
        {
          name: "Owner",
          email: "owner@example.com",
          password: "correct horse battery staple",
          operatorReference: null,
        },
        {
          store,
          createAuthenticationUser: async () => {
            throw new Error("authentication database failure");
          },
          now: () => new Date("2026-07-26T08:00:00.000Z"),
        },
      ),
    ).rejects.toThrow("authentication database failure");
    expect(store.reservation).not.toBeNull();
    expect(store.completion).toBeNull();
  });
});
