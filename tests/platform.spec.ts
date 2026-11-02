import { expect, test } from '@playwright/test';
import { PNG } from 'pngjs';
import { PLATFORM_HALF_WIDTH } from '../src/world/layout';

test('platform state renders and sprinting at edge stops the player', async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 540 });
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__THREE_GAME_TEST_HOOKS__));

  await page.evaluate(() => {
    window.__THREE_GAME_TEST_HOOKS__!.setState('platform');
  });
  await page.locator('canvas').click();
  await page.waitForTimeout(300);

  const shot = await page.locator('canvas').screenshot();
  const png = PNG.sync.read(shot);
  const colors = new Set<number>();
  for (let i = 0; i < png.data.length; i += 4) {
    colors.add((png.data[i] << 16) | (png.data[i + 1] << 8) | png.data[i + 2]);
  }
  expect(colors.size).toBeGreaterThan(16);

  await page.evaluate(() => {
    const game = (window as any).__METRO_GAME__;
    if (game) {
      game.player.yaw = Math.PI;
      game.player.pitch = 0;
      game.cameraRig.apply(game.player);
    }
  });

  await page.keyboard.down('ShiftLeft');
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(4500);
  await page.keyboard.up('KeyW');
  await page.keyboard.up('ShiftLeft');

  const finalZ = await page.evaluate(
    () => window.__THREE_GAME_DIAGNOSTICS__!.player.position.z,
  );
  expect(finalZ).toBeLessThanOrEqual(PLATFORM_HALF_WIDTH);
  expect(finalZ).toBeGreaterThan(PLATFORM_HALF_WIDTH - 1.5);
});
