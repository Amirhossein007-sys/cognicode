const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || undefined });
  try {
    for (const file of ['index.html', 'native/Web/index.html']) {
      const page = await browser.newPage({ viewport: { width: 393, height: 852 } });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
      await page.goto(pathToFileURL(path.resolve(__dirname, '..', file)).href);
      await page.waitForTimeout(500);
      assert.equal(await page.locator('.sonar canvas').evaluate(c => !!c.getContext('2d')), true);
      assert.equal(await page.locator('.sonar canvas').evaluate(el => getComputedStyle(el).visibility), 'visible');
      for (const theme of ['dark', 'light']) {
        await page.evaluate(t => document.documentElement.dataset.theme = t, theme);
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.resolve(__dirname, `../particles-${theme}.png`) });
      }
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.waitForTimeout(100);
      const first = await page.locator('.sonar canvas').screenshot();
      await page.waitForTimeout(200);
      assert.deepEqual(await page.locator('.sonar canvas').screenshot(), first, 'Reduced motion freezes the particles');
      await page.locator('#code').fill('const answer = 42;');
      await page.locator('#btn-play').click();
      await page.locator('#api-choice-offline').click();
      await page.waitForFunction(() => document.querySelector('#analysis-activity').dataset.state === 'running');
      await page.waitForFunction(() => document.querySelector('#analysis-activity').dataset.state === 'done');
      assert.equal(await page.locator('#btn-play').isDisabled(), false);
      await page.waitForFunction(() => document.querySelector('#analysis-activity').hidden);
      assert.deepEqual(errors, []);
      console.log(`PASS ${file}: particles, themes, reduced motion, analysis lifecycle`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });

