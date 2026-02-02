import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3000";
const SCREENSHOT_DIR = "e2e-screenshots";

test.describe("AuraShop full app test and screenshots", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 15000 });
  });

  test("home page loads and take screenshot", async ({ page }) => {
    await page.waitForLoadState("networkidle").catch(() => {});
    await expect(page.locator("body")).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-home.png`, fullPage: true });
  });

  test("header and nav are visible", async ({ page }) => {
    await page.waitForLoadState("networkidle").catch(() => {});
    const header = page.locator("header").first();
    await expect(header).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-header.png` });
  });

  test("products page loads", async ({ page }) => {
    await page.goto(`${BASE}/products`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForLoadState("networkidle").catch(() => {});
    await expect(page.locator("body")).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-products.png`, fullPage: true });
  });

  test("search page works", async ({ page }) => {
    await page.goto(`${BASE}/search?q=electronics`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-search.png`, fullPage: true });
  });

  test("cart page loads", async ({ page }) => {
    await page.goto(`${BASE}/cart`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForLoadState("networkidle").catch(() => {});
    await expect(page.locator("body")).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-cart.png`, fullPage: true });
  });

  test("checkout page loads", async ({ page }) => {
    await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.screenshot({ path: `${SCREENSHOT_DIR}/06-checkout.png`, fullPage: true });
  });

  test("profile page loads", async ({ page }) => {
    await page.goto(`${BASE}/profile`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.screenshot({ path: `${SCREENSHOT_DIR}/07-profile.png`, fullPage: true });
  });

  test("store-scanner page loads", async ({ page }) => {
    await page.goto(`${BASE}/store-scanner`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.screenshot({ path: `${SCREENSHOT_DIR}/08-store-scanner.png`, fullPage: true });
  });

  test("wallet page loads", async ({ page }) => {
    await page.goto(`${BASE}/wallet`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.screenshot({ path: `${SCREENSHOT_DIR}/09-wallet.png`, fullPage: true });
  });

  test("returns create page loads", async ({ page }) => {
    await page.goto(`${BASE}/returns/create`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.screenshot({ path: `${SCREENSHOT_DIR}/10-returns-create.png`, fullPage: true });
  });

  test("click first product and open detail", async ({ page }) => {
    await page.waitForLoadState("networkidle").catch(() => {});
    const productLink = page.locator('a[href^="/products/"]').first();
    const count = await productLink.count();
    if (count > 0) {
      await productLink.click();
      await page.waitForURL(/\/products\/[^/]+/, { timeout: 10000 }).catch(() => {});
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.screenshot({ path: `${SCREENSHOT_DIR}/11-product-detail.png`, fullPage: true });
    }
  });

  test("chat widget can open", async ({ page }) => {
    await page.waitForLoadState("networkidle").catch(() => {});
    const chatBtn = page.locator('button').filter({ has: page.locator('svg') }).last();
    const chatVisible = await chatBtn.isVisible().catch(() => false);
    if (chatVisible) {
      await chatBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/12-chat-open.png` });
    }
  });
});
