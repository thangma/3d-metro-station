import { expect, test } from '@playwright/test';

test('title overlay starts game, resolves zones in order, and completes run', async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 540 });
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__THREE_GAME_TEST_HOOKS__));

  const title = page.locator('[data-testid="title-overlay"]');
  await expect(title).toBeVisible();

  const startBtn = page.locator('[data-testid="start-button"]');
  await startBtn.click();
  await expect(title).toBeHidden();

  const initialZone = await page.evaluate(
    () => (window as any).__METRO_GAME__?.currentZone,
  );
  expect(initialZone).toBe('street');

  await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__!.setState('concourse'));
  const concourseZone = await page.evaluate(
    () => (window as any).__METRO_GAME__?.currentZone,
  );
  expect(concourseZone).toBe('concourse');

  await page.evaluate(() => (window as any).__METRO_GAME__?.completeRun());
  const endCard = page.locator('.endcard');
  await expect(endCard).toBeVisible({ timeout: 10_000 });
});
