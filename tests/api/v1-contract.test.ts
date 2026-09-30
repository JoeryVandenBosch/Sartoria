import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

/**
 * Contract tests for the versioned native-client API (ADR 0013).
 *
 * Routes are exercised as handlers, with identity resolution mocked at the
 * single choke point. That isolates the contract — shapes, status codes,
 * owner scoping — from the authentication transport, which Better Auth owns.
 */

let currentOwner: string | null = "owner-a";

vi.mock("@/lib/auth/current-user", () => ({
  getApiUserId: async () => currentOwner,
  getCurrentUserId: async () => currentOwner ?? "",
  resolveCurrentUserId: async () => currentOwner,
}));

const items = await import("@/app/api/v1/wardrobe/items/route");
const item = await import("@/app/api/v1/wardrobe/items/[itemId]/route");
const insights = await import("@/app/api/v1/insights/route");

function jsonRequest(body: unknown, method = "POST"): Request {
  return new Request("http://sartoria.test/api/v1/x", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_ITEM = {
  category: "shirts",
  name: "White oxford",
  brand: "",
  primaryColor: "White",
  ownershipStatus: "owned",
  fitNotes: "",
  acquisitionCost: "",
  acquisitionCurrency: "",
};

describe("authentication", () => {
  it("refuses an unauthenticated request with 401 and no detail", async () => {
    currentOwner = null;
    try {
      const response = await items.GET();
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Authentication required." });
    } finally {
      currentOwner = "owner-a";
    }
  });

  it("refuses an unauthenticated write before reading the body", async () => {
    currentOwner = null;
    try {
      const response = await items.POST(jsonRequest(VALID_ITEM));
      expect(response.status).toBe(401);
    } finally {
      currentOwner = "owner-a";
    }
  });
});

describe("wardrobe items", () => {
  it("creates and lists an item for the owner", async () => {
    const created = await items.POST(jsonRequest(VALID_ITEM));
    expect(created.status).toBe(201);

    const { item: createdItem } = (await created.json()) as { item: { id: string; ownerId: string } };
    expect(createdItem.ownerId).toBe("owner-a");

    const listed = await items.GET();
    const { items: all } = (await listed.json()) as { items: { id: string }[] };
    expect(all.some((entry) => entry.id === createdItem.id)).toBe(true);
  });

  it("returns field-level errors for invalid input, with no internals", async () => {
    const response = await items.POST(jsonRequest({ ...VALID_ITEM, name: "", category: "hats" }));

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string; fieldErrors: Record<string, string[]> };
    expect(body.error).toBe("Invalid request.");
    expect(Object.keys(body.fieldErrors)).toEqual(expect.arrayContaining(["name", "category"]));
    expect(JSON.stringify(body)).not.toMatch(/stack|at .*\.ts:\d+/);
  });

  it("rejects a non-JSON body", async () => {
    const response = await items.POST(
      new Request("http://sartoria.test/x", { method: "POST", body: "not json" }),
    );
    expect(response.status).toBe(400);
  });

  /** ADR 0013 verification: owner isolation holds over the API. */
  it("does not expose one owner's item to another, and reports it as not found", async () => {
    const created = await items.POST(jsonRequest({ ...VALID_ITEM, name: "Private blazer" }));
    const { item: mine } = (await created.json()) as { item: { id: string } };

    currentOwner = "owner-b";
    try {
      const read = await item.GET(new Request("http://sartoria.test/x"), {
        params: Promise.resolve({ itemId: mine.id }),
      });
      expect(read.status).toBe(404);

      const write = await item.PUT(jsonRequest({ ...VALID_ITEM, name: "Hijacked" }, "PUT"), {
        params: Promise.resolve({ itemId: mine.id }),
      });
      expect(write.status).toBe(404);
    } finally {
      currentOwner = "owner-a";
    }

    const stillMine = await item.GET(new Request("http://sartoria.test/x"), {
      params: Promise.resolve({ itemId: mine.id }),
    });
    const { item: unchanged } = (await stillMine.json()) as { item: { name: string } };
    expect(unchanged.name).toBe("Private blazer");
  });

  it("revises an item through the same schema as creation", async () => {
    const created = await items.POST(jsonRequest({ ...VALID_ITEM, name: "Grey suit", ownershipStatus: "wish-list" }));
    const { item: mine } = (await created.json()) as { item: { id: string } };

    const revised = await item.PUT(
      jsonRequest(
        { ...VALID_ITEM, name: "Grey suit", ownershipStatus: "owned", acquisitionCost: "1290.00", acquisitionCurrency: "EUR" },
        "PUT",
      ),
      { params: Promise.resolve({ itemId: mine.id }) },
    );

    expect(revised.status).toBe(200);
    const { item: after } = (await revised.json()) as { item: { ownershipStatus: string; acquisitionCostMinor: number } };
    expect(after.ownershipStatus).toBe("owned");
    expect(after.acquisitionCostMinor).toBe(129_000);
  });
});

describe("insights", () => {
  it("returns insights for the owner", async () => {
    const response = await insights.GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toHaveProperty("insights");
  });
});

/** ADR 0013 §5: routes are thin transport and may not reach into the domain. */
describe("architecture", () => {
  async function routeFilesUnder(directory: string): Promise<string[]> {
    const entries = await readdir(directory, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) files.push(...(await routeFilesUnder(full)));
      else if (entry.name === "route.ts") files.push(full);
    }
    return files;
  }

  it("no v1 route imports a domain module directly, except for error types", async () => {
    const files = await routeFilesUnder(path.join(process.cwd(), "src", "app", "api", "v1"));
    expect(files.length).toBeGreaterThan(3);

    const offenders: string[] = [];
    for (const file of files) {
      const contents = await readFile(file, "utf8");
      for (const line of contents.split("\n")) {
        if (line.includes("/domain/") && !/Error\b/.test(line)) {
          offenders.push(`${path.relative(process.cwd(), file)}: ${line.trim()}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
