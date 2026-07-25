import { expect, test } from "@playwright/test";

const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=",
  "base64",
);

test("opens the private wardrobe foundation", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Dress with intention." })).toBeVisible();
  await page.getByRole("link", { name: "Open your wardrobe" }).click();

  await expect(page).toHaveURL(/\/wardrobe$/);
  await expect(page.getByRole("heading", { name: "What you own, clearly." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Record what you own." })).toBeVisible();
  await expect(page.getByLabel("Item name")).toBeEditable();
});

test("adds a wardrobe item and processes a private image", async ({ page }, testInfo) => {
  const itemName = `Navy test blazer ${Date.now()}-${testInfo.retry}`;

  await page.goto("/wardrobe");

  await page.getByLabel("Item name").fill(itemName);
  await page.getByLabel("Category").selectOption("tailoring");
  await page.getByLabel("Primary colour").fill("Navy");
  await page.getByLabel("Brand").fill("Sartoria test");
  await page.getByRole("button", { name: "Add to wardrobe" }).click();

  await expect(page.getByText(`${itemName} was added to your wardrobe.`)).toBeVisible();
  const itemCard = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: itemName, exact: true }),
  });
  await itemCard.getByRole("link", { name: /View item/ }).click();

  await expect(page.getByRole("heading", { name: itemName })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Wardrobe images" })).toBeVisible();

  await page.locator("#wardrobe-media-file").setInputFiles({
    name: "navy-blazer.png",
    mimeType: "image/png",
    buffer: onePixelPng,
  });
  await page.getByRole("button", { name: "Upload privately" }).click();

  await expect(page.getByText("Image processed successfully.")).toBeVisible();
  await expect(page.getByText("Ready", { exact: true })).toBeVisible();
  await expect(page.getByAltText(`${itemName} private wardrobe image`)).toBeVisible();
});
