import { expect, test } from "@playwright/test";

test("homepage opens the workpaper and legal methodology", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /Your tax return/i }),
  ).toBeVisible();

  await page.getByRole("link", { name: /Start a return/i }).click();

  await expect(page).toHaveURL(/\/prepare$/);
  await expect(
    page.getByRole("heading", { name: "Prepare before you file." }),
  ).toBeVisible();

  await page.goto("/");
  await page.getByRole("link", { name: /See legal basis/i }).click();

  await expect(page).toHaveURL(/\/legal$/);
  await expect(page.locator("h1")).toBeVisible();
});

test("local workspace persists and form screening updates in the UI", async ({
  page,
}) => {
  await page.goto("/prepare");

  await expect(
    page.getByRole("heading", { name: "Prepare before you file." }),
  ).toBeVisible();

  await page.getByLabel("Full name").fill("E2E Test User");

  const director = page.getByRole("checkbox", {
    name: "Director in a company",
  });
  await director.check();

  await expect(page.getByText("ITR-2", { exact: true }).first()).toBeVisible();

  await page.reload();

  await expect(page.getByLabel("Full name")).toHaveValue("E2E Test User");
  await expect(
    page.getByRole("checkbox", { name: "Director in a company" }),
  ).toBeChecked();
  await expect(page.getByText("ITR-2", { exact: true }).first()).toBeVisible();

  await page
    .getByRole("button", { name: /Review and handoff/i })
    .click();

  await expect(
    page.getByRole("heading", { name: "Review and handoff" }),
  ).toBeVisible();

  await expect(
    page.getByRole("button", { name: /Reset workspace/i }),
  ).toBeVisible();
});

test("public legal and policy routes render successfully", async ({ page }) => {
  for (const path of ["/legal", "/privacy", "/security", "/terms"]) {
    const response = await page.goto(path);
    expect(response?.ok(), `${path} should return a successful response`).toBe(
      true,
    );
    await expect(page.locator("h1")).toBeVisible();
  }
});
