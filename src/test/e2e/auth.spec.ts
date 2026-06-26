import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("should show login page", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByText("Hola de nuevo")).toBeVisible();
  });

  test("should show validation error on empty submit", async ({ page }) => {
    await page.goto("/auth");
    // El botón de submit tiene HTML5 validation (required), no navega
    await page.getByRole("button", { name: /Entrar al Sistema/i }).click();
    // La página sigue en /auth (no redirige)
    await expect(page).toHaveURL(/\/auth/);
  });
});
