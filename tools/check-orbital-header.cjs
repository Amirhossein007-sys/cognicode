// Clock/date, header geometry, theme and reduced-motion regression coverage.
const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || undefined });
  try {
    for (const source of ['index.html', 'native/Web/index.html']) {
      for (const width of [320, 375, 393, 430, 440]) {
        for (const theme of ['dark', 'light']) {
          const page = await browser.newPage({ viewport: { width, height: width === 320 ? 568 : 852 }, timezoneId: 'America/Los_Angeles' });
          const errors = [];
          page.on('pageerror', error => errors.push(error.message));
          // 20:30 UTC is midnight in Tehran (including the Persian new year).
          await page.clock.install({ time: new Date('2026-03-20T20:30:00Z') });
          await page.goto(pathToFileURL(path.resolve(__dirname, '..', source)).href);
          await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
          await page.evaluate(() => document.fonts.ready);
          const bounds = await page.evaluate(() => {
            const rect = s => {
              const r = document.querySelector(s).getBoundingClientRect();
              return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, height: r.height };
            };
            return {
              header: rect('.topbar'), clock: rect('.orbital-clock'), brand: rect('.brand'), actions: rect('.top-actions'),
              wave: rect('.brain-marquee'), editor: rect('.editor'), play: rect('.play'), bottom: rect('.bottom'),
              date: document.querySelector('.orbital-date').textContent,
              expected: new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()),
              hand: document.querySelector('.orbital-hour').getAttribute('transform'),
              label: document.querySelector('.orbital-clock svg').getAttribute('aria-label')
            };
          });
          assert.equal(bounds.date, bounds.expected);
          assert.equal(bounds.hand, 'rotate(0 50 50)');
          assert.match(bounds.label, /۰۰:۰۰/);
          assert.ok(Math.abs((bounds.clock.left + bounds.clock.right) / 2 - width / 2) < 1);
          assert.ok(bounds.brand.left >= bounds.clock.right && bounds.actions.right <= bounds.clock.left, JSON.stringify(bounds));
          assert.ok(bounds.wave.top >= bounds.header.bottom && bounds.wave.bottom <= bounds.editor.top);
          assert.ok(bounds.editor.height > 150 && bounds.bottom.bottom <= page.viewportSize().height + 1, JSON.stringify(bounds));
          assert.equal(bounds.play.height, 44);
          await page.emulateMedia({ reducedMotion: 'reduce' });
          assert.equal(await page.locator('.brain-marquee-track').evaluate(el => getComputedStyle(el).animationName), 'none');
          assert.deepEqual(errors, []);
          if (source === 'index.html' && width === 393) await page.screenshot({ path: path.resolve(__dirname, `../orbital-${theme}.png`) });
          await page.close();
        }
      }
      console.log(`PASS ${source}: 5 phone widths, both themes, Tehran midnight/Persian new year, reduced motion`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
