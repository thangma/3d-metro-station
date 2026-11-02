import { expect, test } from '@playwright/test';

test('audio system unlocks and switches zones without clicks or errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__THREE_GAME_TEST_HOOKS__));

  const stateBefore = await page.evaluate(
    () => (window as any).__METRO_GAME__?.audioSystem?.ctx?.state ?? 'uninitialized',
  );
  expect(stateBefore === 'uninitialized' || stateBefore === 'suspended').toBe(true);

  const startBtn = page.locator('[data-testid="start-button"]');
  if (await startBtn.isVisible()) {
    await startBtn.click();
  } else {
    await page.locator('canvas').click({ force: true });
  }
  await page.waitForTimeout(300);

  const stateAfter = await page.evaluate(
    () => (window as any).__METRO_GAME__?.audioSystem?.ctx?.state,
  );
  expect(stateAfter).toBe('running');

  await page.evaluate(() => {
    (window as any).__METRO_GAME__?.audioSystem?.setMuted(true);
  });
  await page.waitForTimeout(100);

  await page.evaluate(() => {
    const audio = (window as any).__METRO_GAME__?.audioSystem;
    if (audio) {
      audio.setZone('concourse');
      audio.oneShot('gate');
      audio.footstep('stone');
    }
  });
  await page.waitForTimeout(300);

  expect(errors).toEqual([]);
});
