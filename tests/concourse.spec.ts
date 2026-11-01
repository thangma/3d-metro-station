import { expect, test, type Page } from '@playwright/test';

test('concourse gates hold the line until the ticket is scanned', async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 540 });
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__THREE_GAME_TEST_HOOKS__));

  await page.evaluate(() => {
    const hooks = window.__THREE_GAME_TEST_HOOKS__!;
    hooks.setState('concourse');
  });
  await page.locator('canvas').click();
  await page.waitForTimeout(300);

  const prompt = page.locator('[data-testid="prompt"]');

  // Walk in from the unpaid hall until the gate prompt appears.
  await page.keyboard.down('KeyW');
  await expect(prompt).toBeVisible({ timeout: 30_000 });
  await expect(prompt).toContainText('Soát vé');

  // Keep going and let the closed flap stop the capsule.
  await expect.poll(async () => (await readX(page)) > -12.4, {
    timeout: 40_000,
  }).toBe(true);
  await page.keyboard.up('KeyW');

  const blocked = await readX(page);
  expect(blocked).toBeGreaterThan(-12.6);
  expect(blocked).toBeLessThan(-12.0);

  // Leaning on the closed gate must not push through it.
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(1500);
  await page.keyboard.up('KeyW');
  const stillBlocked = await readX(page);
  expect(stillBlocked).toBeGreaterThan(-12.6);

  // Scan: the prompt clears and the aisle opens.
  await page.keyboard.press('KeyE');
  await expect(prompt).toBeHidden({ timeout: 15_000 });

  await page.keyboard.down('KeyW');
  await expect.poll(async () => (await readX(page)) > -11.4, {
    timeout: 40_000,
  }).toBe(true);
  await page.keyboard.up('KeyW');
});

async function readX(page: Page): Promise<number> {
  return page.evaluate(
    () => window.__THREE_GAME_DIAGNOSTICS__!.player.position.x,
  );
}
