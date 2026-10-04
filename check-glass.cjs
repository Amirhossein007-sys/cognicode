const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: 393, height: 852 }, reducedMotion: 'reduce' });
    await page.goto(pathToFileURL(path.resolve(__dirname, '../native/Web/index.html')).href);
    await page.locator('#launch-splash').waitFor({ state: 'hidden' });
    await page.locator('#code').fill('const greeting = "Hello";\n// Code stays readable\nconsole.log(greeting);');
    for (const theme of ['dark', 'light']) {
      await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
      await page.waitForFunction(theme => {
        const color = getComputedStyle(document.querySelector('.editor')).backgroundColor;
        const alpha = Number(color.match(/,\s*([\d.]+)\)$/)?.[1]);
        return document.documentElement.dataset.theme === theme && (theme === 'light' ? alpha >= .2 && alpha <= .25 : alpha >= .4 && alpha <= .5);
      }, theme);
      for (const selector of ['.editor', '.keys', '.bottom']) {
        const color = await page.locator(selector).evaluate(el => getComputedStyle(el).backgroundColor);
        assert.match(color, /^rgba\(/);
        const alpha = Number(color.match(/,\s*([\d.]+)\)$/)[1]);
        assert.ok(theme === 'light' ? alpha >= .2 && alpha <= .25 : alpha >= .4 && alpha <= .5, color);
      }
      // The quick-start panel is an elevated surface of its own, so it may be far
      // more opaque than the shared glass — but it must never become the colour of
      // the editor behind it. Measured on device engines, the old value differed by
      // only 7-8 channel steps out of 765, which reads as "the panel is missing".
      const panel = await page.locator('.quick-start').evaluate(el => ({
        own: getComputedStyle(el).backgroundColor,
        editor: getComputedStyle(document.querySelector('.editor')).backgroundColor,
      }));
      assert.match(panel.own, /^rgba\(/);
      assert.notEqual(panel.own, panel.editor, 'the quick-start panel must not be the editor colour');
      const panelAlpha = Number(panel.own.match(/,\s*([\d.]+)\)$/)[1]);
      assert.ok(panelAlpha >= .9, 'the quick-start panel must stay a solid, readable surface: ' + panel.own);
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
