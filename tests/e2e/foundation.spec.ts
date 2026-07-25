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

  await expect(page.getByText("Ready", { exact: true })).toBeVisible();
  await expect(page.getByAltText(`${itemName} private wardrobe image`)).toBeVisible();
});

test("saves, exports, reloads, and resets a private style profile", async ({ page }) => {
  const existing = await page.request.get("/api/profile/export");
  if (existing.ok()) {
    const existingPayload = (await existing.json()) as { profile: { revision: number } };
    const reset = await page.request.delete("/api/profile", {
      data: { expectedRevision: existingPayload.profile.revision },
    });
    expect(reset.status()).toBe(204);
  }

  await page.goto("/profile");

  await expect(
    page.getByRole("heading", { name: "Make the advice unmistakably yours." }),
  ).toBeVisible();
  await expect(page.getByText("No private style profile has been saved yet.")).toBeVisible();

  await page.getByLabel("Fit preference").selectOption("tailored");
  await page.getByLabel("Climate context").selectOption("mixed");
  await page.getByLabel("Recommendation mode").selectOption("wardrobe-first");
  await page.getByLabel("Italian Smart Casual").check();
  await page.getByLabel("Classic").check();
  await page.getByLabel("Navy").first().check();
  await page.getByLabel("White").first().check();
  await page.getByLabel("Orange").last().check();
  await page.getByLabel("Preferred brands").fill("Gran Sasso\nLuca Faloni");
  await page.getByLabel("Fur").check();
  await page.getByLabel("Height (cm)").fill("178");
  await page.getByLabel("EU shoe size").fill("42");

  await page.getByRole("button", { name: "Save private profile" }).click();
  await expect(page.getByText(/Private profile revision 1/i)).toBeVisible();

  const exported = await page.request.get("/api/profile/export");
  expect(exported.ok()).toBe(true);
  expect(exported.headers()["cache-control"]).toContain("no-store");
  expect(exported.headers()["content-disposition"]).toContain("sartoria-style-profile.json");
  const payload = (await exported.json()) as {
    schemaVersion: string;
    profile: {
      ownerId: string;
      revision: number;
      fitPreference: string;
      preferredBrands: string[];
      measurements: { heightCm: number | null };
      useMeasurementsForRecommendations: boolean;
    };
  };
  expect(payload.schemaVersion).toBe("1.0");
  expect(payload.profile.revision).toBe(1);
  expect(payload.profile.fitPreference).toBe("tailored");
  expect(payload.profile.preferredBrands).toEqual(["Gran Sasso", "Luca Faloni"]);
  expect(payload.profile.measurements.heightCm).toBe(178);
  expect(payload.profile.useMeasurementsForRecommendations).toBe(false);

  await page.reload();
  await expect(page.getByLabel("Fit preference")).toHaveValue("tailored");
  await expect(page.getByLabel("Italian Smart Casual")).toBeChecked();
  await expect(page.getByLabel("Height (cm)")).toHaveValue("178");

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Reset profile" }).click();
  await expect(page.getByText("No private style profile has been saved yet.")).toBeVisible();
  await expect(page.getByLabel("Fit preference")).toHaveValue("regular");
});
