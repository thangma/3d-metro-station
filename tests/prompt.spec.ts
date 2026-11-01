import { expect, test } from '@playwright/test';

declare global {
  interface Window {
    __METRO_GAME__?: {
      hud: {
        setPrompt(vi: string | null, en?: string): void;
      };
    };
  }
}

test('prompt shows both languages and fits at 390px', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.__THREE_GAME_TEST_HOOKS__?.setPausedForScreenshot(true);
    window.__METRO_GAME__?.hud.setPrompt('LỐI XUỐNG GA', 'Entrance to the station');
  });

  const prompt = page.locator('[data-testid="prompt"]');
  await expect(prompt).toBeVisible();
  await expect(prompt).toContainText('LỐI XUỐNG GA');
  await expect(prompt).toContainText('Entrance to the station');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);

  const fits = await prompt.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      withinWidth: rect.left >= 0 && rect.right <= window.innerWidth + 1,
      noHorizontalOverflow: element.scrollWidth <= element.clientWidth + 1,
    };
  });
  expect(fits.withinWidth).toBe(true);
  expect(fits.noHorizontalOverflow).toBe(true);
});

test('prompt disappears when cleared', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.__THREE_GAME_TEST_HOOKS__?.setPausedForScreenshot(true);
    window.__METRO_GAME__?.hud.setPrompt('MỞ CỬA', 'Open');
  });
  await expect(page.locator('[data-testid="prompt"]')).toBeVisible();

  await page.evaluate(() => window.__METRO_GAME__?.hud.setPrompt(null));
  await expect(page.locator('[data-testid="prompt"]')).toBeHidden();
});
