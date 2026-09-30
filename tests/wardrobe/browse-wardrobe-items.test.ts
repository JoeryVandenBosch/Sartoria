import { describe, expect, it } from "vitest";

import {
  DEFAULT_STATUS_FILTER,
  DEFAULT_WARDROBE_VIEW,
  categoryFacets,
  filterWardrobeItems,
  parseWardrobeBrowseSelection,
  statusFacets,
  wardrobeBrowseHref,
} from "@/modules/wardrobe/application/browse-wardrobe-items";
import { createWardrobeItem, type WardrobeItem } from "@/modules/wardrobe/domain/wardrobe-item";

const NOW = new Date("2026-01-01T00:00:00.000Z");

function item(
  id: string,
  input: Readonly<{
    category: Parameters<typeof createWardrobeItem>[0]["category"];
    ownershipStatus?: "owned" | "wish-list" | "archived";
  }>,
): WardrobeItem {
  return createWardrobeItem(
    {
      ownerId: "owner-1",
      name: `Item ${id}`,
      primaryColor: "Navy",
      category: input.category,
      ownershipStatus: input.ownershipStatus ?? "owned",
    },
    { createId: () => id, now: () => NOW },
  );
}

const ITEMS: readonly WardrobeItem[] = [
  item("a", { category: "shirts" }),
  item("b", { category: "shirts" }),
  item("c", { category: "trousers" }),
  item("d", { category: "tailoring", ownershipStatus: "wish-list" }),
  item("e", { category: "outerwear", ownershipStatus: "archived" }),
];

describe("browse selection parsing", () => {
  it("applies no status filter by default, so nothing is hidden", () => {
    const selection = parseWardrobeBrowseSelection({});

    expect(selection).toEqual({
      view: DEFAULT_WARDROBE_VIEW,
      status: undefined,
      category: undefined,
    });
    expect(DEFAULT_STATUS_FILTER).toBeUndefined();
  });

  it("reads a recognised view, status, and category", () => {
    expect(
      parseWardrobeBrowseSelection({ view: "list", status: "wish-list", category: "tailoring" }),
    ).toEqual({ view: "list", status: "wish-list", category: "tailoring" });
  });

  it("treats an unrecognised status as no filter rather than matching nothing", () => {
    expect(parseWardrobeBrowseSelection({ status: "all" }).status).toBeUndefined();
    expect(parseWardrobeBrowseSelection({ status: "borrowed" }).status).toBeUndefined();
  });

  it.each([
    ["view", { view: "carousel" }],
    ["status", { status: "borrowed" }],
    ["category", { category: "spacesuits" }],
  ])("falls back to a default for an unrecognised %s", (_label, params) => {
    // A URL is user-editable input: a mistyped parameter should show the
    // wardrobe, not an error.
    expect(() => parseWardrobeBrowseSelection(params)).not.toThrow();
  });

  it("ignores an unrecognised category rather than matching nothing", () => {
    expect(parseWardrobeBrowseSelection({ category: "spacesuits" }).category).toBeUndefined();
  });

  it("takes the first value when a parameter repeats", () => {
    expect(parseWardrobeBrowseSelection({ view: ["list", "tile"] }).view).toBe("list");
  });
});

describe("filtering", () => {
  it("filters by status", () => {
    expect(filterWardrobeItems(ITEMS, { status: "owned", category: undefined })).toHaveLength(3);
    expect(filterWardrobeItems(ITEMS, { status: "wish-list", category: undefined })).toHaveLength(
      1,
    );
  });

  it("filters by category", () => {
    expect(filterWardrobeItems(ITEMS, { status: undefined, category: "shirts" })).toHaveLength(2);
  });

  it("combines status and category", () => {
    expect(filterWardrobeItems(ITEMS, { status: "owned", category: "shirts" })).toHaveLength(2);
    expect(filterWardrobeItems(ITEMS, { status: "wish-list", category: "shirts" })).toHaveLength(0);
  });

  it("returns everything when neither is set", () => {
    expect(filterWardrobeItems(ITEMS, { status: undefined, category: undefined })).toHaveLength(5);
  });
});

describe("facets", () => {
  it("reports statuses present with counts, omitting absent ones", () => {
    const facets = statusFacets(ITEMS);

    expect(facets).toEqual([
      { value: "owned", count: 3 },
      { value: "wish-list", count: 1 },
      { value: "archived", count: 1 },
    ]);
  });

  it("omits a status with no items", () => {
    const ownedOnly = [item("x", { category: "shirts" })];

    expect(statusFacets(ownedOnly).map((facet) => facet.value)).toEqual(["owned"]);
  });

  it("derives categories from items rather than the declared list", () => {
    const facets = categoryFacets(ITEMS, undefined);

    // Thirteen categories are declared; only four are present.
    expect(facets).toHaveLength(4);
    expect(facets.map((facet) => facet.value)).not.toContain("dresses");
  });

  it("scopes category counts to the selected status", () => {
    const owned = categoryFacets(ITEMS, "owned");

    expect(owned.map((facet) => facet.value)).toEqual(["shirts", "trousers"]);
    expect(owned.find((facet) => facet.value === "shirts")?.count).toBe(2);
  });

  it("keeps status facets stable regardless of the current status", () => {
    // Counted before status filtering, so choosing one does not remove the
    // others and leave no way back.
    expect(statusFacets(ITEMS)).toHaveLength(3);
  });
});

describe("href construction", () => {
  const base = { view: "tile", status: undefined, category: undefined } as const;

  it("omits defaults so the common URL stays clean", () => {
    expect(wardrobeBrowseHref(base)).toBe("/wardrobe");
  });

  it("encodes a non-default view", () => {
    expect(wardrobeBrowseHref(base, { view: "list" })).toBe("/wardrobe?view=list");
  });

  it("encodes a chosen status and omits the absent one", () => {
    expect(wardrobeBrowseHref(base, { status: "owned" })).toBe("/wardrobe?status=owned");
    expect(wardrobeBrowseHref(base, { status: undefined })).toBe("/wardrobe");
  });

  it("preserves parameters that are not being changed", () => {
    const href = wardrobeBrowseHref(
      { view: "list", status: "wish-list", category: undefined },
      { category: "tailoring" },
    );

    expect(href).toContain("view=list");
    expect(href).toContain("status=wish-list");
    expect(href).toContain("category=tailoring");
  });

  it("round-trips through the parser", () => {
    const selection = { view: "list", status: "archived", category: "outerwear" } as const;
    const href = wardrobeBrowseHref(selection);
    const params = Object.fromEntries(new URL(href, "https://example.test").searchParams);

    expect(parseWardrobeBrowseSelection(params)).toEqual(selection);
  });
});
