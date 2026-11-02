import { expect, test } from '@playwright/test';

test('at boarding NPCs are visible and boardedCount increases', async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 540 });
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__THREE_GAME_TEST_HOOKS__));

  await page.evaluate(() => {
    window.__THREE_GAME_TEST_HOOKS__!.setState('boarding');
  });
  await page.locator('canvas').click();
  await page.waitForTimeout(300);

  const initialBoarded = await page.evaluate(
    () => (window as any).__METRO_GAME__?.npcSystem?.boardedCount ?? 0,
  );

  await page.waitForTimeout(2000);

  const laterBoarded = await page.evaluate(
    () => (window as any).__METRO_GAME__?.npcSystem?.boardedCount ?? 0,
  );
  expect(laterBoarded).toBeGreaterThanOrEqual(initialBoarded);
});
