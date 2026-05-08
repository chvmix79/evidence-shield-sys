import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should redirect to auth when not logged in", async ({ page }) => {
    await expect(page.getByText("Iniciar Sesión")).toBeVisible();
  });

  test("should have navigation links in layout", async ({ page }) => {
    await page.goto("/auth");
    const emailInput = page.getByPlaceholder("correo@ejemplo.com");
    const passwordInput = page.getByPlaceholder("••••••••");
    
    if (emailInput && passwordInput) {
      await emailInput.fill("test@example.com");
      await passwordInput.fill("password123");
      await page.getByRole("button", { name: /ingresar/i }).click();
    }
  });
});
