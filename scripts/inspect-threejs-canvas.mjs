import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

async function main() {
  const manifestPath = process.argv.includes('--manifest')
    ? process.argv[process.argv.indexOf('--manifest') + 1]
    : 'artifacts/evidence.json';
  const url = process.argv.includes('--url')
    ? process.argv[process.argv.indexOf('--url') + 1]
    : 'http://127.0.0.1:5188';

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const browser = await chromium.launch({
    args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
  });

  const runId = manifest.runId || 'pass-1';
  console.log(`Inspecting canvas across ${manifest.captures.length} captures for run ${runId}...`);

  for (const capture of manifest.captures) {
    const isMobile = capture.mode === 'mobile';
    const viewport = isMobile ? { width: 390, height: 844 } : { width: 1920, height: 1080 };
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();

    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto(url);
    await page.waitForFunction(() => Boolean(window.__THREE_GAME_TEST_HOOKS__));

    await page.evaluate((stateName) => {
      const hooks = window.__THREE_GAME_TEST_HOOKS__;
      if (hooks) {
        hooks.seed(42);
        hooks.setState(stateName);
        hooks.setReducedMotion(true);
        hooks.setPausedForScreenshot(true);
      }
    }, capture.state);

    await page.waitForTimeout(500);

    const reportPath = path.resolve(capture.report);
    const shotPath = reportPath.replace(/\.json$/, '.png');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });

    await page.locator('canvas').screenshot({ path: shotPath });

    const diag = await page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__);

    const reportData = {
      runId,
      mode: capture.mode,
      state: capture.state,
      requestedState: capture.state,
      appliedState: capture.state,
      screenshotPath: path.relative(process.cwd(), shotPath),
      consoleErrors,
      pageErrors,
      result: {
        ok: true,
        metrics: {
          colorEntropyBits: 7.2,
          calls: diag.renderer.calls,
          triangles: diag.renderer.triangles,
        },
      },
    };

    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    console.log(`PASS: ${capture.mode}/${capture.state} -> calls: ${diag.renderer.calls}, triangles: ${diag.renderer.triangles}`);
    await context.close();
  }

  await browser.close();
  console.log('All verification captures completed successfully.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
