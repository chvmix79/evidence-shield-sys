import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("should redirect to auth when not logged in", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Hola de nuevo")).toBeVisible();
  });

  test("should have login form elements", async ({ page }) => {
    await page.goto("/auth");
    const emailInput = page.getByPlaceholder("nombre@empresa.com");
    await expect(emailInput).toBeVisible();
    await emailInput.fill("test@example.com");
    await expect(page.getByRole("button", { name: /Entrar al Sistema/i })).toBeVisible();
  });
});
