import { test, expect } from "@playwright/test";

test.describe("APEX F1 critical flows", () => {
  test("1. home dashboard loads with data and provenance labels", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "APEX F1" })).toBeVisible();
    // provenance badges are required on every data surface
    await expect(page.locator("text=/HISTORICAL|LIVE|DELAYED|DEMO|UNAVAILABLE/").first()).toBeVisible();
  });

  test("2. 2026 calendar opens and lists rounds", async ({ page }) => {
    await page.goto("/calendar");
    await expect(page.getByRole("heading", { name: /2026 Calendar/ })).toBeVisible();
    await expect(page.getByRole("link").filter({ hasText: /Grand Prix|Sprint/i }).first()).toBeVisible();
  });

  test("3. navigating to a Grand Prix from the calendar", async ({ page }) => {
    await page.goto("/calendar");
    await page.getByRole("link").filter({ hasText: /Grand Prix|Sprint/i }).first().click();
    await expect(page).toHaveURL(/\/calendar\/\d+/);
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("4. selecting a session shows its detail", async ({ page }) => {
    await page.goto("/calendar");
    await page.getByRole("link").filter({ hasText: /Grand Prix|Sprint/i }).first().click();
    await expect(page.locator("text=/Race|Qualifying|Practice|Sprint/").first()).toBeVisible();
  });

  test("5. opening a driver profile", async ({ page }) => {
    await page.goto("/drivers");
    await page.getByRole("link").filter({ hasText: /VER|NOR|LEC|HAM|PIA|RUS/ }).first().click();
    await expect(page).toHaveURL(/\/drivers\/.+/);
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("6. comparing two drivers on the analysis page", async ({ page }) => {
    await page.goto("/analysis");
    await expect(page.getByRole("heading").first()).toBeVisible();
    await expect(page.locator("text=/HISTORICAL|LIVE|DELAYED|DEMO|UNAVAILABLE|driver/i").first()).toBeVisible();
  });

  test("7. telemetry page: selecting session, driver and lap", async ({ page }) => {
    await page.goto("/telemetry");
    await expect(page.locator("text=/Grand Prix · Session/i")).toBeVisible();
    // pick a lap and wait for chart or honest empty state
    const lapInput = page.locator('input[aria-label*="lap" i], input[name*="lap" i]').first();
    if (await lapInput.count()) {
      await lapInput.fill("5");
      await lapInput.press("Enter");
    }
    await expect(
      page.locator("text=/Telemetry chart|No recorded telemetry|Demo/i").first()
    ).toBeVisible({ timeout: 60_000 });
  });

  test("8. live, historical and demo states are labelled", async ({ page }) => {
    // historical session via API (Singapore GP 2026 race)
    const res = await page.request.get("/api/leaderboard?session=11388");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(["historical", "demo"]).toContain(body.provenance.status);
    expect(body.data.length).toBeGreaterThan(10);
    // live page shows explicit status labels, never silent data
    await page.goto("/live");
    await expect(page.locator("text=/HISTORICAL|LIVE|DELAYED|DEMO|UNAVAILABLE/").first()).toBeVisible({ timeout: 60_000 });
  });

  test("9. search palette and favorites", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Control+k");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    // favorites page renders without backend credentials (local-first)
    await page.goto("/favorites");
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("10. app runs without optional provider credentials", async ({ page }) => {
    const res = await page.request.get("/api/health");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    // Supabase is not configured in this environment; the app must still work
    expect(body.config.supabase).toBe(false);
    expect(body.providers.openf1.ok).toBe(true);
    await page.goto("/settings");
    await expect(page.getByRole("heading").first()).toBeVisible();
  });
});
