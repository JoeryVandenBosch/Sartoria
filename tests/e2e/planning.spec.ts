import { expect, test, type Page } from "@playwright/test";

async function addWardrobeItem(
  page: Page,
  input: Readonly<{ name: string; category: string; colour: string }>,
) {
  await page.getByLabel("Item name").fill(input.name);
  await page.getByLabel("Category").selectOption(input.category);
  await page.getByLabel("Primary colour").fill(input.colour);
  await page.getByRole("button", { name: "Add to wardrobe" }).click();
  await expect(page.getByText(`${input.name} was added to your wardrobe.`)).toBeVisible();
}

test("previews, adjusts, saves, inspects, lists, and deletes a private packing plan", async ({
  page,
}, testInfo) => {
  const marker = `${Date.now()}-${testInfo.retry}`;
  const shirtName = `A travel shirt ${marker}`;
  const trouserName = `A travel trousers ${marker}`;
  const planName = `Copenhagen plan ${marker}`;

  await page.goto("/wardrobe");
  await addWardrobeItem(page, { name: shirtName, category: "shirts", colour: "White" });
  await addWardrobeItem(page, { name: trouserName, category: "trousers", colour: "Navy" });

  await page.getByRole("link", { name: "Planning", exact: true }).click();
  await expect(page).toHaveURL(/\/planning$/);
  await expect(page.getByRole("heading", { name: "Pack with intention." })).toBeVisible();

  await page.getByLabel("Trip name").fill(planName);
  await page.getByLabel("Broad destination").fill("Copenhagen");
  await page.getByLabel("Start date").fill("2026-08-20");
  await page.getByLabel("End date").fill("2026-08-22");
  await page.getByLabel("Climate expectation").selectOption("mild");
  await page.getByLabel("Dinner").check();
  await page.getByLabel("Private trip notes").fill("Comfortable walking layers and one dinner look.");

  await page.getByRole("button", { name: "Build deterministic packing preview" }).click();
  await expect(page.getByRole("heading", { name: "Choose the final packing list." })).toBeVisible();
  await expect(page.getByText("Packing preview created for 3 days.")).toBeVisible();

  const shirtCard = page.locator("label.packing-item-card").filter({ hasText: shirtName });
  const trouserCard = page.locator("label.packing-item-card").filter({ hasText: trouserName });
  await shirtCard.locator("input").check();
  await trouserCard.locator("input").check();

  await page.getByRole("button", { name: "Save private travel plan" }).click();
  await expect(page).toHaveURL(/\/planning\/[^/]+$/);
  await expect(page.getByRole("heading", { name: planName })).toBeVisible();
  await expect(page.getByText("Copenhagen", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: shirtName })).toBeVisible();
  await expect(page.getByRole("heading", { name: trouserName })).toBeVisible();
  await expect(page.getByText("Comfortable walking layers and one dinner look.")).toBeVisible();

  await page.getByRole("link", { name: "Back to planning" }).click();
  await expect(page.getByRole("heading", { name: planName })).toBeVisible();
  await page.getByRole("link", { name: `Open travel plan ${planName}` }).click();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete travel plan" }).click();
  await expect(page).toHaveURL(/\/planning$/);
  await expect(page.getByRole("heading", { name: planName })).toHaveCount(0);
});
