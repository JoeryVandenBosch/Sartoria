import { expect, test, type Page } from "@playwright/test";

async function addInsightItem(
  page: Page,
  input: Readonly<{
    name: string;
    category: string;
    colour: string;
    brand: string;
    status?: "owned" | "wish-list";
    cost?: string;
    currency?: string;
  }>,
) {
  await page.getByLabel("Item name").fill(input.name);
  await page.getByLabel("Category").selectOption(input.category);
  await page.getByLabel("Wardrobe status").selectOption(input.status ?? "owned");
  await page.getByLabel("Primary colour").fill(input.colour);
  await page.getByLabel("Brand").fill(input.brand);
  await page.getByLabel("Acquisition cost").fill(input.cost ?? "");
  await page.getByLabel("Currency").fill(input.currency ?? "");
  await page.getByRole("button", { name: "Add to wardrobe" }).click();
  await expect(page.getByText(`${input.name} was added to your wardrobe.`)).toBeVisible();
}

test("shows factual duplication, wear, cost-per-wear, and wish-list impact", async ({
  page,
}, testInfo) => {
  const marker = `${Date.now()}-${testInfo.retry}`;
  const blazerA = `Insight blazer A ${marker}`;
  const blazerB = `Insight blazer B ${marker}`;
  const trousers = `Insight trousers ${marker}`;
  const wishListBlazer = `Insight wish blazer ${marker}`;
  const outfitName = `Insight outfit ${marker}`;

  await page.goto("/wardrobe");
  await addInsightItem(page, {
    name: blazerA,
    category: "tailoring",
    colour: "Navy",
    brand: `Insight brand ${marker}`,
    cost: "300.00",
    currency: "EUR",
  });
  await addInsightItem(page, {
    name: blazerB,
    category: "tailoring",
    colour: "Navy",
    brand: `Insight brand ${marker}`,
  });
  await addInsightItem(page, {
    name: trousers,
    category: "trousers",
    colour: "Navy",
    brand: "Sartoria test",
  });
  await addInsightItem(page, {
    name: wishListBlazer,
    category: "tailoring",
    colour: "Navy",
    brand: `Insight brand ${marker}`,
    status: "wish-list",
  });

  await page.getByRole("link", { name: "Outfits", exact: true }).click();
  await page.getByLabel("Outfit name").fill(outfitName);
  await page.locator("label", { hasText: blazerA }).getByRole("checkbox").check();
  await page.locator("label", { hasText: trousers }).getByRole("checkbox").check();
  await page.getByRole("button", { name: "Save private outfit" }).click();
  await expect(page.getByRole("heading", { name: outfitName })).toBeVisible();

  await page.getByLabel("Date worn").fill("2026-07-25");
  await page.getByRole("button", { name: "Record private wear" }).click();
  await expect(page.getByText("1 wear", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Insights", exact: true }).click();
  await expect(page).toHaveURL(/\/insights$/);
  await expect(page.getByRole("heading", { name: "See the facts behind your wardrobe." })).toBeVisible();

  const duplicateCard = page.locator("article.duplicate-card").filter({ hasText: blazerA });
  await expect(duplicateCard.getByText(blazerB, { exact: true })).toBeVisible();
  await expect(duplicateCard.getByText("Exact Signal", { exact: true })).toBeVisible();

  const wornRow = page.getByRole("row").filter({ hasText: blazerA });
  await expect(wornRow.getByText("1", { exact: true }).last()).toBeVisible();
  await expect(wornRow.getByText("€300.00", { exact: true })).toBeVisible();

  const unwornRow = page.getByRole("row").filter({ hasText: blazerB });
  await expect(unwornRow.getByText("Not recorded as worn", { exact: true })).toBeVisible();
  await expect(unwornRow.getByText("Not available", { exact: true })).toBeVisible();

  const wishCard = page.locator("article.wishlist-impact-card").filter({ hasText: wishListBlazer });
  await expect(wishCard.getByText("High duplication risk", { exact: true })).toBeVisible();
  await expect(wishCard.getByText(/share the category/)).toBeVisible();

  await expect(page.getByRole("heading", { name: "What these numbers mean." })).toBeVisible();
  await expect(page.getByText(/current saved item membership/)).toBeVisible();
});
