import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("should show login page", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByText("Iniciar Sesión")).toBeVisible();
  });

  test("should show validation error on empty submit", async ({ page }) => {
    await page.goto("/auth");
    await page.getByRole("button", { name: /ingresar/i }).click();
    await expect(page.getByText("Email requerido")).toBeVisible();
  });
});
