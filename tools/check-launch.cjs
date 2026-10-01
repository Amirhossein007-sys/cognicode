const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || undefined });
  try {
    for (const source of ['index.html', 'native/Web/index.html']) {
      for (const width of [320, 393, 440]) {
        const page = await browser.newPage({ viewport: { width, height: width === 320 ? 568 : 852 }, reducedMotion: 'reduce' });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript(() => localStorage.setItem('cognicode.theme', 'light'));
        await page.clock.install({ time: new Date('2026-10-01T00:00:00Z') });
        await page.clock.pauseAt(new Date('2026-10-01T00:00:01Z'));
        await page.goto(pathToFileURL(path.resolve(__dirname, '..', source)).href);
        await page.evaluate(() => Promise.all([document.fonts.ready, document.querySelector('.launch-brain').decode()]));
        // Paint the two startup frames; then verify it remains present just before 3s.
        await page.clock.runFor(40);
        const state = await page.evaluate(() => {
          const r = document.querySelector('.launch-content').getBoundingClientRect();
          return { text: document.querySelector('.launch-content p').textContent, theme: document.documentElement.dataset.theme,
            inert: document.getElementById('app').inert, hidden: getComputedStyle(document.getElementById('app')).visibility,
            width: innerWidth, left: r.left, right: r.right, bottom: r.bottom, height: innerHeight,
            background: getComputedStyle(document.getElementById('particles-js')).backgroundImage };
        });
        assert.equal(state.text, 'با کوگنی، کُدت رو تحلیل کن');
        assert.equal(state.theme, 'dark');
        assert.equal(state.inert, true);
        assert.equal(state.hidden, 'hidden');
        assert.ok(state.left >= 0 && state.right <= state.width && state.bottom < state.height);
        assert.ok(state.background.includes('0, 53, 102'));
        assert.equal(await page.locator('.launch-brain').evaluate(el => getComputedStyle(el).animationName), 'none');
        if (process.argv.includes('--capture') && source === 'index.html' && width === 393) {
          await page.screenshot({ path: path.resolve(__dirname, '../launch-dark.png') });
          await page.locator('.launch-content').evaluate(el => el.hidden = true);
          await page.locator('#particles-js').screenshot({ path: path.resolve(__dirname, '../native/CogniCode/Assets.xcassets/LaunchBackground.imageset/background.png') });
          await page.locator('.launch-content').evaluate(el => el.hidden = false);
        }
        if (source === 'native/Web/index.html' && width === 393) {
          await page.evaluate(() => {
            Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
            document.dispatchEvent(new Event('visibilitychange'));
          });
          await page.clock.runFor(5000);
          assert.equal(await page.locator('#launch-splash').isVisible(), true, 'Background time must not consume the visible launch duration');
          await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
        }
        await page.clock.runFor(2980);
        assert.equal(await page.locator('#launch-splash').isVisible(), true);
        await page.clock.runFor(20);
        assert.equal(await page.locator('#launch-splash').isVisible(), false);
        assert.equal(await page.evaluate(() => document.getElementById('app').inert), false);
        assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'light');
        assert.equal(await page.evaluate(() => localStorage.getItem('cognicode.theme')), 'light');
        // Returning to a running app does not replay the launch presentation.
        await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
        assert.equal(await page.locator('#launch-splash').isVisible(), false);
        assert.deepEqual(errors, []);
        await page.close();
        console.log(`PASS ${source} ${width}: dark launch, slogan, three seconds, stored theme, no replay`);
      }
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
