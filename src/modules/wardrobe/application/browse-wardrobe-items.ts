import {
  ownershipStatuses,
  wardrobeCategories,
  type OwnershipStatus,
  type WardrobeCategory,
  type WardrobeItem,
} from "@/modules/wardrobe/domain/wardrobe-item";

/**
 * Browsing state for the wardrobe listing.
 *
 * Held in the URL rather than in client state, so the listing stays a server
 * component, survives refresh, is shareable, and works without client
 * JavaScript. See ROADMAP Phase 8A.
 */

export const WARDROBE_VIEWS = ["tile", "list"] as const;
export type WardrobeView = (typeof WARDROBE_VIEWS)[number];

export const DEFAULT_WARDROBE_VIEW: WardrobeView = "tile";

/**
 * The status shown when none is requested.
 *
 * Owned is the default rather than "all" because it answers the question the
 * page asks — what you own — without mixing in items the person is only
 * considering or has taken out of rotation.
 */
export const DEFAULT_STATUS_FILTER: OwnershipStatus = "owned";

export interface WardrobeBrowseSelection {
  readonly view: WardrobeView;
  /** `undefined` means every status. */
  readonly status: OwnershipStatus | undefined;
  /** `undefined` means every category. */
  readonly category: WardrobeCategory | undefined;
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Parses browsing state from URL search parameters.
 *
 * Unrecognised values fall back to a default rather than raising, because a URL
 * is user-editable input and a mistyped parameter should show the wardrobe, not
 * an error.
 */
export function parseWardrobeBrowseSelection(
  searchParams: Readonly<Record<string, string | string[] | undefined>> = {},
): WardrobeBrowseSelection {
  const rawView = firstValue(searchParams.view);
  const rawStatus = firstValue(searchParams.status);
  const rawCategory = firstValue(searchParams.category);

  const view = (WARDROBE_VIEWS as readonly string[]).includes(rawView ?? "")
    ? (rawView as WardrobeView)
    : DEFAULT_WARDROBE_VIEW;

  const status =
    rawStatus === "all"
      ? undefined
      : (ownershipStatuses as readonly string[]).includes(rawStatus ?? "")
        ? (rawStatus as OwnershipStatus)
        : DEFAULT_STATUS_FILTER;

  const category = (wardrobeCategories as readonly string[]).includes(rawCategory ?? "")
    ? (rawCategory as WardrobeCategory)
    : undefined;

  return { view, status, category };
}

export function filterWardrobeItems(
  items: readonly WardrobeItem[],
  selection: Pick<WardrobeBrowseSelection, "status" | "category">,
): readonly WardrobeItem[] {
  return items.filter(
    (item) =>
      (selection.status === undefined || item.ownershipStatus === selection.status) &&
      (selection.category === undefined || item.category === selection.category),
  );
}

export interface Facet<Value extends string> {
  readonly value: Value;
  readonly count: number;
}

/**
 * Statuses actually present, with counts.
 *
 * Counts are taken before status filtering so the options do not vanish as soon
 * as one is chosen, which would leave no way back.
 */
export function statusFacets(items: readonly WardrobeItem[]): readonly Facet<OwnershipStatus>[] {
  return ownershipStatuses
    .map((status) => ({
      value: status,
      count: items.filter((item) => item.ownershipStatus === status).length,
    }))
    .filter((facet) => facet.count > 0);
}

/**
 * Categories present within the current status selection, with counts.
 *
 * Derived from the items rather than from the full declared list: offering a
 * category the person owns nothing in is noise.
 */
export function categoryFacets(
  items: readonly WardrobeItem[],
  status: OwnershipStatus | undefined,
): readonly Facet<WardrobeCategory>[] {
  const inScope = filterWardrobeItems(items, { status, category: undefined });

  return wardrobeCategories
    .map((category) => ({
      value: category,
      count: inScope.filter((item) => item.category === category).length,
    }))
    .filter((facet) => facet.count > 0);
}

/**
 * Builds a listing URL, preserving the parameters not being changed.
 *
 * Defaults are omitted so the common URL stays clean and a shared link does not
 * pin someone to today's defaults.
 */
export function wardrobeBrowseHref(
  selection: WardrobeBrowseSelection,
  changes: Partial<WardrobeBrowseSelection> = {},
): string {
  const next: WardrobeBrowseSelection = { ...selection, ...changes };
  const params = new URLSearchParams();

  if (next.view !== DEFAULT_WARDROBE_VIEW) {
    params.set("view", next.view);
  }

  if (next.status === undefined) {
    params.set("status", "all");
  } else if (next.status !== DEFAULT_STATUS_FILTER) {
    params.set("status", next.status);
  }

  if (next.category !== undefined) {
    params.set("category", next.category);
  }

  const query = params.toString();
  return query.length > 0 ? `/wardrobe?${query}` : "/wardrobe";
}
