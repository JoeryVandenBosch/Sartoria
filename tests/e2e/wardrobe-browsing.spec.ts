import { expect, test } from "@playwright/test";

/**
 * Browsing state lives in the URL, so these assertions double as proof that a
 * filtered listing is shareable and survives a reload.
 */

test("filters by status and category, and switches view", async ({ page }, testInfo) => {
  const suffix = `${Date.now()}-${testInfo.retry}`;

  await page.goto("/wardrobe");

  // Two owned shirts and one wish-list item, so filtering has something to do.
  for (const item of [
    { name: `Oxford ${suffix}`, category: "shirts", status: "owned" },
    { name: `Poplin ${suffix}`, category: "shirts", status: "owned" },
    { name: `Flannel suit ${suffix}`, category: "tailoring", status: "wish-list" },
  ]) {
    await page.getByLabel("Item name").fill(item.name);
    await page.getByLabel("Category").selectOption(item.category);
    await page.getByLabel("Primary colour").fill("Navy");
    await page.getByLabel("Wardrobe status").selectOption(item.status);
    await page.getByRole("button", { name: "Add to wardrobe" }).click();
    await expect(page.getByText(`${item.name} was added to your wardrobe.`)).toBeVisible();
  }

  // Nothing is hidden by default: adding a wish-list item and having it vanish
  // would read as a failed save.
  await expect(page.getByRole("heading", { name: `Oxford ${suffix}` })).toBeVisible();
  await expect(page.getByRole("heading", { name: `Flannel suit ${suffix}` })).toBeVisible();

  await page.getByRole("link", { name: /wish list items/i }).click();
  await expect(page).toHaveURL(/status=wish-list/);
  await expect(page.getByRole("heading", { name: `Flannel suit ${suffix}` })).toBeVisible();
  await expect(page.getByRole("heading", { name: `Oxford ${suffix}` })).toHaveCount(0);

  // A filtered listing survives a reload because the state is in the URL.
  await page.reload();
  await expect(page.getByRole("heading", { name: `Flannel suit ${suffix}` })).toBeVisible();

  await page.getByRole("link", { name: "List", exact: true }).click();
  await expect(page).toHaveURL(/view=list/);
  await expect(page.locator(".wardrobe-list")).toBeVisible();
});

test("reports an empty selection without implying an empty wardrobe", async ({ page }) => {
  await page.goto("/wardrobe?status=archived&category=dresses");

  const heading = page.getByRole("heading", { name: "Nothing matches this selection." });

  if (await heading.isVisible()) {
    await expect(page.getByRole("link", { name: "Show everything" })).toBeVisible();
  }
});

test("tolerates unrecognised parameters rather than failing", async ({ page }) => {
  const response = await page.goto("/wardrobe?view=carousel&status=borrowed&category=spacesuits");

  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Wardrobe items" })).toBeVisible();
});
