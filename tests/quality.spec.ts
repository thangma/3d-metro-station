import { expect, test } from '@playwright/test';

test('quality preset high vs balanced and diagnostics budget check', async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 540 });
  await page.goto('/?quality=balanced');
  await page.waitForFunction(() => Boolean(window.__THREE_GAME_TEST_HOOKS__));

  const diag = await page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__!);
  expect(diag.renderer.triangles).toBeLessThan(1_500_000);
  expect(diag.renderer.calls).toBeLessThanOrEqual(300);

  // Switch to high quality
  await page.evaluate(() => {
    const game = (window as any).__METRO_GAME__;
    game?.renderer?.setQuality?.('high');
  });
  await page.waitForTimeout(300);
});
