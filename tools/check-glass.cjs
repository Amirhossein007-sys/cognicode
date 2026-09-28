const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: 393, height: 852 }, reducedMotion: 'reduce' });
    await page.goto(pathToFileURL(path.resolve(__dirname, '../native/Web/index.html')).href);
    await page.locator('#code').fill('const greeting = "Hello";\n// Code stays readable\nconsole.log(greeting);');
    for (const theme of ['dark', 'light']) {
      await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
      await page.waitForTimeout(300);
      for (const selector of ['.editor', '.keys', '.bottom']) {
        const color = await page.locator(selector).evaluate(el => getComputedStyle(el).backgroundColor);
        assert.match(color, /^rgba\(/);
        const alpha = Number(color.match(/,\s*([\d.]+)\)$/)[1]);
        assert.ok(theme === 'light' ? alpha >= .2 && alpha <= .25 : alpha >= .4 && alpha <= .5, color);
      }
      await page.screenshot({ path: path.resolve(__dirname, `../glass-${theme}.png`) });
    }
    await page.emulateMedia({ contrast: 'more' });
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.editor')).backgroundColor === 'rgb(248, 250, 252)');
    assert.equal(await page.locator('.editor').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(248, 250, 252)');
    await page.locator('#btn-settings').click();
    assert.equal(await page.locator('#native-activity-settings').count(), 0, 'Live Activity panel is removed from Settings');
    console.log('PASS glass surfaces, both themes, increased contrast and PWA isolation');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
