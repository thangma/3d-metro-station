import { expect, test } from '@playwright/test';
import { PNG } from 'pngjs';
import type { Page } from '@playwright/test';

test('street state renders and walking forward descends the stair', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__THREE_GAME_TEST_HOOKS__));
  await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__?.setState('street'));
  await page.setViewportSize({ width: 960, height: 540 });
  await page.locator('canvas').click();
  await page.waitForTimeout(300);

  const shot = await page.locator('canvas').screenshot();
  const png = PNG.sync.read(shot);
  const colors = new Set<number>();
  for (let i = 0; i < png.data.length; i += 4) {
    colors.add((png.data[i] << 16) | (png.data[i + 1] << 8) | png.data[i + 2]);
  }
  expect(colors.size).toBeGreaterThan(16);

  const samples: Array<{ y: number; z: number }> = [];
  await page.keyboard.down('KeyW');
  const deadline = Date.now() + 25_000;
  while (Date.now() < deadline) {
    await page.waitForTimeout(100);
    const sample = await readPosition(page);
    samples.push(sample);
    if (sample.z < 4) break;
  }
  await page.keyboard.up('KeyW');

  const final = samples[samples.length - 1];
  expect(final.z).toBeLessThan(10);
  expect(final.y).toBeLessThan(-0.2);
  const onStairs = samples.filter((sample) => sample.z < 11.5);
  expect(onStairs.length).toBeGreaterThan(3);
  for (let i = 1; i < onStairs.length; i += 1) {
    expect(onStairs[i].y).toBeLessThanOrEqual(onStairs[i - 1].y + 0.005);
  }

  expect(errors).toEqual([]);
});

async function readPosition(page: Page): Promise<{ y: number; z: number }> {
  return page.evaluate(() => {
    const player = window.__THREE_GAME_DIAGNOSTICS__!.player.position;
    return { y: player.y, z: player.z };
  });
}
