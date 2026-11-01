import { test, expect } from '@playwright/test';
import { PNG } from 'pngjs';

declare global {
  interface Window {
    __THREE_GAME_TEST_HOOKS__?: Record<string, unknown>;
    __THREE_GAME_DIAGNOSTICS__?: { frame: number; elapsed: number };
  }
}

test('boots with the hook contract, live diagnostics, and a non-blank canvas', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');

  const hooks = await page.evaluate(() =>
    Object.keys(window.__THREE_GAME_TEST_HOOKS__ ?? {}).sort(),
  );
  expect(hooks).toEqual([
    'hideDebugUi',
    'seed',
    'setPausedForScreenshot',
    'setReducedMotion',
    'setState',
  ]);

  await page.waitForFunction(() => (window.__THREE_GAME_DIAGNOSTICS__?.frame ?? 0) > 0);
  const diagnostics = await page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__!);
  expect(diagnostics.frame).toBeGreaterThan(0);
  expect(diagnostics.elapsed).toBeGreaterThanOrEqual(0);

  const shot = await page.locator('canvas').screenshot();
  const png = PNG.sync.read(shot);
  const colors = new Set<number>();
  for (let i = 0; i < png.data.length; i += 4) {
    colors.add((png.data[i] << 16) | (png.data[i + 1] << 8) | png.data[i + 2]);
  }
  expect(colors.size).toBeGreaterThan(1);

  expect(errors).toEqual([]);
});
