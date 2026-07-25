import { expect, test } from "@playwright/test";

const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=",
  "base64",
);

async function addWardrobeItem(
  page: Parameters<typeof test>[0] extends never ? never : import("@playwright/test").Page,
  input: Readonly<{
    name: string;
    category: string;
    colour: string;
    brand: string;
  }>,
) {
  await page.getByLabel("Item name").fill(input.name);
  await page.getByLabel("Category").selectOption(input.category);
  await page.getByLabel("Primary colour").fill(input.colour);
  await page.getByLabel("Brand").fill(input.brand);
  await page.getByRole("button", { name: "Add to wardrobe" }).click();
  await expect(page.getByText(`${input.name} was added to your wardrobe.`)).toBeVisible();
}

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
  await addWardrobeItem(page, {
    name: itemName,
    category: "tailoring",
    colour: "Navy",
    brand: "Sartoria test",
  });

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

test("creates and opens a deterministic manual outfit", async ({ page }, testInfo) => {
  const marker = `${Date.now()}-${testInfo.retry}`;
  const blazerName = `Outfit blazer ${marker}`;
  const trouserName = `Outfit trousers ${marker}`;
  const outfitName = `Dinner composition ${marker}`;

  await page.goto("/wardrobe");
  await addWardrobeItem(page, {
    name: blazerName,
    category: "tailoring",
    colour: "Navy",
    brand: "Gran Sasso",
  });
  await addWardrobeItem(page, {
    name: trouserName,
    category: "trousers",
    colour: "Deep navy",
    brand: "Sartoria test",
  });

  await page.getByRole("link", { name: "Outfits", exact: true }).click();
  await expect(page).toHaveURL(/\/outfits$/);
  await expect(page.getByRole("heading", { name: "Compose with what you own." })).toBeVisible();

  await page.getByLabel("Outfit name").fill(outfitName);
  await page.getByLabel("Occasion").fill("Dinner");
  await page.getByLabel("Private styling notes").fill("Keep the silhouette tonal and restrained.");
  const blazerCheckbox = page.locator("label", { hasText: blazerName }).getByRole("checkbox");
  const trouserCheckbox = page.locator("label", { hasText: trouserName }).getByRole("checkbox");
  await blazerCheckbox.check();
  await trouserCheckbox.check();
  await expect(blazerCheckbox).toBeChecked();
  await expect(trouserCheckbox).toBeChecked();

  await page.getByRole("button", { name: "Save private outfit" }).click();
  await expect(page).toHaveURL(/\/outfits\/[^/]+$/);
  await expect(page.getByRole("heading", { name: outfitName })).toBeVisible();
  await expect(page.getByRole("heading", { name: blazerName })).toBeVisible();
  await expect(page.getByRole("heading", { name: trouserName })).toBeVisible();
  await expect(page.getByText("Keep the silhouette tonal and restrained.")).toBeVisible();
  await expect(page.getByText("Manual composition")).toBeVisible();

  await page.getByRole("link", { name: "Back to outfits" }).click();
  await expect(page.getByRole("heading", { name: outfitName })).toBeVisible();
});

test("edits an outfit and corrects private wear history before deletion", async ({ page }, testInfo) => {
  const marker = `${Date.now()}-${testInfo.retry}`;
  const shirtName = `Lifecycle shirt ${marker}`;
  const trouserName = `Lifecycle trousers ${marker}`;
  const outfitName = `Lifecycle outfit ${marker}`;
  const revisedName = `Revised lifecycle outfit ${marker}`;

  await page.goto("/wardrobe");
  await addWardrobeItem(page, {
    name: shirtName,
    category: "shirts",
    colour: "White",
    brand: "Sartoria test",
  });
  await addWardrobeItem(page, {
    name: trouserName,
    category: "trousers",
    colour: "Navy",
    brand: "Sartoria test",
  });

  await page.getByRole("link", { name: "Outfits", exact: true }).click();
  await page.getByLabel("Outfit name").fill(outfitName);
  await page.locator("label", { hasText: shirtName }).getByRole("checkbox").check();
  await page.locator("label", { hasText: trouserName }).getByRole("checkbox").check();
  await page.getByRole("button", { name: "Save private outfit" }).click();
  await expect(page.getByRole("heading", { name: outfitName })).toBeVisible();

  await page.getByLabel("Date worn").fill("2026-07-25");
  await page.getByLabel("Private note", { exact: true }).fill("First explicit wear record.");
  await page.getByRole("button", { name: "Record private wear" }).click();
  await expect(page.getByText("Wear event recorded privately.")).toBeVisible();
  await expect(page.getByText("First explicit wear record.")).toBeVisible();
  await expect(page.getByText("1 wear", { exact: true })).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Remove record" }).click();
  await expect(page.getByText("No wear history recorded.")).toBeVisible();

  await page.getByText(/Edit outfit revision 1/).click();
  await page.getByLabel("Outfit name").last().fill(revisedName);
  await page.getByLabel("Private styling notes").last().fill("Revised private note.");
  await page.getByRole("button", { name: "Save outfit revision" }).click();
  await expect(page.getByRole("heading", { name: revisedName })).toBeVisible();
  await expect(page.getByText("Revised private note.")).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete outfit" }).click();
  await expect(page).toHaveURL(/\/outfits$/);
  await expect(page.getByRole("heading", { name: revisedName })).toHaveCount(0);
});
