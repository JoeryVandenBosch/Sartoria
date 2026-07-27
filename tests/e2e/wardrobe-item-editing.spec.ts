import { expect, test } from "@playwright/test";

async function addItem(
  page: import("@playwright/test").Page,
  input: Readonly<{ name: string; category: string; status?: string; colour?: string }>,
) {
  await page.goto("/wardrobe");
  await page.getByLabel("Item name").fill(input.name);
  await page.getByLabel("Category").selectOption(input.category);
  await page.getByLabel("Primary colour").fill(input.colour ?? "Navy");
  if (input.status) {
    await page.getByLabel("Wardrobe status").selectOption(input.status);
  }
  await page.getByRole("button", { name: "Add to wardrobe" }).click();
  await expect(page.getByText(`${input.name} was added to your wardrobe.`)).toBeVisible();

  await page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: input.name, exact: true }) })
    .getByRole("link", { name: /View item/ })
    .click();
}

test("corrects a recorded item", async ({ page }, testInfo) => {
  const name = `Blazer ${Date.now()}-${testInfo.retry}`;
  await addItem(page, { name, category: "tailoring" });

  await page.getByText("Correct these details").click();

  const corrected = `${name} corrected`;
  await page.getByLabel("Item name").fill(corrected);
  await page.getByLabel("Brand").fill("Lardini");
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(page.getByText("Your changes were saved.")).toBeVisible();
  await expect(page.getByRole("heading", { name: corrected })).toBeVisible();
});

/** The transition the product previously could not express. */
test("completes the wish-list to owned transition", async ({ page }, testInfo) => {
  const name = `Flannel suit ${Date.now()}-${testInfo.retry}`;
  await addItem(page, { name, category: "tailoring", status: "wish-list" });

  await page.getByText("Correct these details").click();
  await page.getByLabel("Wardrobe status").selectOption("owned");
  await page.getByLabel("Acquisition cost").fill("1290.00");
  await page.getByLabel("Currency").fill("EUR");
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(page.getByText("Your changes were saved.")).toBeVisible();
});

test("refuses a correction that the create form would also reject", async ({ page }, testInfo) => {
  const name = `Scarf ${Date.now()}-${testInfo.retry}`;
  await addItem(page, { name, category: "accessories" });

  await page.getByText("Correct these details").click();
  // A cost without a currency: the schema requires them together, and the
  // currency input's maxLength would silently truncate a too-long code.
  await page.getByLabel("Acquisition cost").fill("40.00");
  await page.getByLabel("Currency").fill("");
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(page.getByText("Review the highlighted fields.")).toBeVisible();
});
