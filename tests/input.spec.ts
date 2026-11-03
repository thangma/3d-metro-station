import { expect, test } from '@playwright/test';

declare global {
  interface Window {
    __THREE_GAME_DIAGNOSTICS__?: {
      player: { position: { x: number; y: number; z: number }; speed: number };
      frame: number;
      canvas: { clientWidth: number; clientHeight: number };
    };
  }
}

async function position(page: import('@playwright/test').Page): Promise<{ x: number; y: number; z: number }> {
  return page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__!.player.position);
}

test('WASD walks the player forward', async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 540 });
  await page.goto('/');
  const startBtn = page.locator('[data-testid="start-button"]');
  if (await startBtn.isVisible()) await startBtn.click();
  await page.locator('canvas').click({ force: true });
  await page.waitForTimeout(300);
  const before = await position(page);

  await page.keyboard.down('KeyW');
  await page.waitForTimeout(2500);
  await page.keyboard.up('KeyW');
  await page.waitForTimeout(200);

  const after = await position(page);
  expect(after.z).toBeLessThan(before.z - 1);
});

test('Escape pauses simulation without accumulating movement', async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 540 });
  await page.goto('/');
  const startBtn = page.locator('[data-testid="start-button"]');
  if (await startBtn.isVisible()) await startBtn.click();
  else await page.locator('canvas').click({ force: true });
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(400);
  await page.keyboard.up('KeyW');

  await page.keyboard.press('Escape');
  const frozen = await position(page);
  await page.waitForTimeout(600);
  const later = await position(page);

  expect(later.z).toBeCloseTo(frozen.z, 4);
  expect(later.x).toBeCloseTo(frozen.x, 4);
});

test('resize keeps the drawing buffer matched to the window', async ({ page }) => {
  await page.goto('/');
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForTimeout(300);

  const metrics = await page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__!);
  expect(Math.abs(metrics.canvas.clientWidth - 1280)).toBeLessThanOrEqual(2);
  expect(Math.abs(metrics.canvas.clientHeight - 720)).toBeLessThanOrEqual(2);
  expect(metrics.frame).toBeGreaterThan(0);
});
