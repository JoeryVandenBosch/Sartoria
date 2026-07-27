import { expect, test } from "@playwright/test";

const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=",
  "base64",
);

test("attaches an image while adding a wardrobe item", async ({ page }, testInfo) => {
  const itemName = `Charcoal test coat ${Date.now()}-${testInfo.retry}`;

  await page.goto("/wardrobe");

  await page.getByLabel("Item name").fill(itemName);
  await page.getByLabel("Category").selectOption("outerwear");
  await page.getByLabel("Primary colour").fill("Charcoal");
  await page.locator("#wardrobe-item-image").setInputFiles({
    name: "coat.png",
    mimeType: "image/png",
    buffer: onePixelPng,
  });

  await page.getByRole("button", { name: "Add to wardrobe" }).click();

  await expect(page.getByText(`${itemName} was added to your wardrobe.`)).toBeVisible();

  // The image is attached after creation, so the confirmation appears separately.
  await expect(page.getByText(/Image processed successfully|Upload complete/)).toBeVisible({
    timeout: 20_000,
  });

  const itemCard = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: itemName, exact: true }),
  });
  await itemCard.getByRole("link", { name: /View item/ }).click();

  // The single flow produced the same result as the two-step flow: a ready,
  // owner-scoped private image on the item.
  await expect(page.getByRole("heading", { name: itemName })).toBeVisible();
  await expect(page.getByText("Ready", { exact: true })).toBeVisible();
  await expect(page.getByAltText(`${itemName} private wardrobe image`)).toBeVisible();
});

test("adds an item without an image when none is selected", async ({ page }, testInfo) => {
  const itemName = `Plain test scarf ${Date.now()}-${testInfo.retry}`;

  await page.goto("/wardrobe");

  await page.getByLabel("Item name").fill(itemName);
  await page.getByLabel("Category").selectOption("accessories");
  await page.getByLabel("Primary colour").fill("Grey");
  await page.getByRole("button", { name: "Add to wardrobe" }).click();

  await expect(page.getByText(`${itemName} was added to your wardrobe.`)).toBeVisible();

  const itemCard = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: itemName, exact: true }),
  });
  await itemCard.getByRole("link", { name: /View item/ }).click();

  await expect(page.getByRole("heading", { name: itemName })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Wardrobe images" })).toBeVisible();
});

test("rejects an unsupported file before submission", async ({ page }) => {
  await page.goto("/wardrobe");

  await page.locator("#wardrobe-item-image").setInputFiles({
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not an image", "utf8"),
  });

  await expect(
    page.getByText("Choose a JPEG, PNG, WebP, HEIC, or HEIF image."),
  ).toBeVisible();
});
