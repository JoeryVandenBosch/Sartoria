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

test("requests, inspects, corrects, rejects, and deletes deterministic advice", async ({
  page,
}, testInfo) => {
  const marker = `${Date.now()}-${testInfo.retry}`;
  const blazerName = `Advice blazer ${marker}`;
  const trouserName = `Advice trousers ${marker}`;
  const occasion = `Private dinner ${marker}`;

  await page.goto("/wardrobe");
  await addWardrobeItem(page, { name: blazerName, category: "tailoring", colour: "Navy" });
  await addWardrobeItem(page, { name: trouserName, category: "trousers", colour: "Navy" });

  await page.getByRole("link", { name: "Advice", exact: true }).click();
  await expect(page).toHaveURL(/\/recommendations$/);
  await expect(page.getByRole("heading", { name: "Advice you can inspect." })).toBeVisible();

  await page.getByLabel("Occasion or purpose").fill(occasion);
  await page.getByLabel("Optional context").fill("Tonal, comfortable, and restrained.");
  await page.getByRole("button", { name: "Recommend from my wardrobe" }).click();

  await expect(page).toHaveURL(/\/recommendations\/[^/]+$/);
  await expect(page.getByText("Deterministic fallback").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Why these pieces." })).toBeVisible();
  await expect(page.getByText("Tonal, comfortable, and restrained.")).toBeVisible();

  await page
    .getByLabel("Record a correction")
    .fill("Prefer a softer knit instead of the most formal layer.");
  await page.getByRole("button", { name: "Save correction" }).click();
  await expect(page.getByText("Prefer a softer knit instead of the most formal layer.")).toBeVisible();

  await page.getByLabel("Reject this recommendation").fill("Not relaxed enough.");
  await page.getByRole("button", { name: "Reject recommendation" }).click();
  await expect(page.getByText("Not relaxed enough.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Already rejected" })).toBeDisabled();

  await page.getByRole("button", { name: "Delete recommendation" }).click();
  await expect(page).toHaveURL(/\/recommendations$/);
  await expect(page.getByRole("heading", { name: occasion })).toHaveCount(0);
});
