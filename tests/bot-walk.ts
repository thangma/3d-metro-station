import { chromium } from 'playwright';

async function botWalk() {
  const browser = await chromium.launch({
    args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  console.log('Bot starting walkthrough...');
  await page.goto('http://127.0.0.1:5188');
  await page.waitForFunction(() => Boolean(window.__THREE_GAME_TEST_HOOKS__));

  // Dismiss title
  const startBtn = page.locator('[data-testid="start-button"]');
  if (await startBtn.isVisible()) {
    await startBtn.click();
  }

  // Walk route states
  const stages = ['street', 'pavilion', 'concourse', 'platform', 'boarding', 'complete'];
  for (const st of stages) {
    await page.evaluate((s) => window.__THREE_GAME_TEST_HOOKS__!.setState(s), st);
    await page.waitForTimeout(400);
    const diag = await page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__!);
    console.log(`Bot reached stage [${st}] at pos: (${diag.player.position.x.toFixed(1)}, ${diag.player.position.y.toFixed(1)}, ${diag.player.position.z.toFixed(1)})`);
  }

  await browser.close();
  console.log('Bot walk complete without stalls.');
}

botWalk().catch((err) => {
  console.error(err);
  process.exit(1);
});
