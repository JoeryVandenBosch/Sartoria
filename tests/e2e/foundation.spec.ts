import { expect, test } from "@playwright/test";

test("opens the private wardrobe foundation", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Dress with intention." })).toBeVisible();
  await page.getByRole("link", { name: "Open your wardrobe" }).click();

  await expect(page).toHaveURL(/\/wardrobe$/);
  await expect(page.getByRole("heading", { name: "What you own, clearly." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Record what you own." })).toBeVisible();
  await expect(page.getByLabel("Item name")).toBeEditable();
});
