// Verification script for GlassFold Background, DaypartClock, and GlassMarquee
const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');

const outputDir = path.resolve(__dirname, '../artifacts/glass-daypart-validation');
fs.mkdirSync(outputDir, { recursive: true });

(async () => {
  console.log('Starting GlassFold, DaypartClock & GlassMarquee validation...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--allow-file-access-from-files', '--disable-web-security'],
  });

  try {
    for (const source of ['index.html', 'native/Web/index.html']) {
      const page = await browser.newPage({
        viewport: { width: 393, height: 852 },
        timezoneId: 'Asia/Tehran',
      });

      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));

      const fileUrl = pathToFileURL(path.resolve(__dirname, '..', source)).href;
      await page.goto(fileUrl);
      await page.locator('#launch-splash').waitFor({ state: 'hidden' });

      // Verify GlassFold background canvas exists
      const bgCanvas = await page.locator('#glass-fold-background canvas.gf-canvas').count();
      assert.equal(bgCanvas, 1, 'GlassFold canvas must exist in DOM');

      // Verify old rain background is gone
      const oldRain = await page.locator('#data-rain-background').count();
      assert.equal(oldRain, 0, 'Old data-rain background must be removed');

      // Verify Daypart Clock elements
      const clockEl = page.locator('#tehran-clock');
      await clockEl.waitFor({ state: 'visible' });

      const hourTxt = await page.locator('#dp-hour .dp-digit').textContent();
      const minTxt = await page.locator('#dp-minute .dp-digit').textContent();
      const periodTxt = await page.locator('#dp-period .dp-digit').textContent();
      console.log(`[${source}] Current Tehran Time: ${hourTxt}:${minTxt} ${periodTxt}`);
      assert.ok(hourTxt && hourTxt.length >= 2, 'Hour must be 2 digits');
      assert.ok(minTxt && minTxt.length >= 2, 'Minute must be 2 digits');

      // Verify minimal Shamsi date is present
      const dateTxt = await page.locator('.dp-date').textContent();
      console.log(`[${source}] Minimal Shamsi Date: ${dateTxt}`);
      assert.ok(dateTxt.length > 3, 'Shamsi date must be non-empty');

      // Verify 4 daypart presets: صبح ، ظهر ، عصر ، شب
      const presets = await page.locator('.dp-pill-btn').all();
      assert.equal(presets.length, 4, 'Must have exactly 4 daypart buttons');

      const labels = await page.locator('.dp-pill-label').allTextContents();
      assert.deepEqual(labels, ['صبح', 'ظهر', 'عصر', 'شب'], 'Dayparts must be صبح، ظهر، عصر، شب');

      // Verify exactly one active preset with glowing lamp
      const activePill = await page.locator('.dp-pill-btn.is-active').count();
      assert.equal(activePill, 1, 'Exactly 1 daypart pill must be active with lamp illuminated');

      // Verify Glass Marquee
      const marquee = page.locator('#status-marquee');
      await marquee.waitFor({ state: 'visible' });

      const badgeText = await page.locator('.gm-badge-text').textContent();
      const marqueeItems = await page.locator('.gm-item').allTextContents();
      console.log(`[${source}] Marquee badge: ${badgeText}, Items count: ${marqueeItems.length}`);
      assert.ok(marqueeItems.length >= 2, 'Marquee must have rotating motivational items');
      assert.ok(marqueeItems[0].length > 10, 'Marquee quote must be rich and meaningful');

      // Verify old SVG brainwave track is gone
      const oldSvgBrain = await page.locator('.brain-marquee-track svg').count();
      assert.equal(oldSvgBrain, 0, 'Old SVG brainwave track must be removed');

      // Test dark and light mode contrast & visual screenshots
      for (const targetTheme of ['dark', 'light']) {
        const curTheme = await page.evaluate(() => document.documentElement.dataset.theme);
        if (curTheme !== targetTheme) {
          await page.click('#btn-theme');
          await page.waitForTimeout(400);
        }

        // Verify contrast calculations
        const contrastState = await page.evaluate(() => {
          const isLight = document.documentElement.dataset.theme === 'light';
          const baseBg = isLight ? [238, 245, 252] : [6, 8, 30];

          const parseColor = (str) => {
            const vals = str.match(/[\d.]+/g).map(Number);
            const r = vals[0], g = vals[1], b = vals[2];
            const a = vals.length > 3 ? vals[3] : 1;
            return { r, g, b, a };
          };

          const composite = (fgStr, bg) => {
            const fg = parseColor(fgStr);
            const r = Math.round(fg.r * fg.a + bg[0] * (1 - fg.a));
            const g = Math.round(fg.g * fg.a + bg[1] * (1 - fg.a));
            const b = Math.round(fg.b * fg.a + bg[2] * (1 - fg.a));
            return [r, g, b];
          };

          const lum = (rgbArr) => {
            const vals = rgbArr.map((n) => {
              n /= 255;
              return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
            });
            return vals[0] * 0.2126 + vals[1] * 0.7152 + vals[2] * 0.0722;
          };

          const ratio = (c1Str, c2Str, bg) => {
            const c1 = composite(c1Str, bg);
            const c2 = composite(c2Str, bg);
            const l1 = lum(c1), l2 = lum(c2);
            return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
          };

          const css = (sel) => getComputedStyle(document.querySelector(sel));

          const hourColor = css('#dp-hour').color;
          const pillBg = css('.dp-time-pill').backgroundColor;
          const itemColor = css('.gm-item').color;
          const marqueeBg = css('#status-marquee').backgroundColor;

          return {
            theme: document.documentElement.dataset.theme,
            hourContrast: ratio(hourColor, pillBg, baseBg),
            marqueeContrast: ratio(itemColor, marqueeBg, baseBg),
          };
        });

        console.log(`[${source}] Theme: ${contrastState.theme}`);
        console.log(`  Hour Contrast: ${contrastState.hourContrast.toFixed(2)}:1`);
        console.log(`  Marquee Contrast: ${contrastState.marqueeContrast.toFixed(2)}:1`);
        assert.ok(contrastState.hourContrast >= 4.5, `Hour contrast must be >= 4.5:1 (got ${contrastState.hourContrast})`);
        assert.ok(contrastState.marqueeContrast >= 4.5, `Marquee contrast must be >= 4.5:1 (got ${contrastState.marqueeContrast})`);

        if (source === 'index.html') {
          const shotPath = path.join(outputDir, `cognicode-preview-${targetTheme}.png`);
          await page.screenshot({ path: shotPath, fullPage: false });
          console.log(`  Saved screenshot to: ${shotPath}`);
        }
      }

      // Test preset button interaction
      console.log('Testing daypart button clicking...');
      await page.click('.dp-pill-btn[data-slot="morning"]');
      await page.waitForTimeout(200);
      assert.equal(await page.locator('#dp-hour .dp-digit').textContent(), '08');
      assert.equal(await page.locator('#dp-period .dp-digit').textContent(), 'AM');
      assert.equal(await page.locator('.dp-pill-btn[data-slot="morning"]').getAttribute('aria-checked'), 'true');

      // Click Live button to restore real time
      await page.click('#dp-live-btn');
      await page.waitForTimeout(200);
      console.log('Restored live time successfully.');

      assert.deepEqual(errors, [], `No page errors allowed: ${errors.join('; ')}`);
      await page.close();
    }

    console.log('\nALL TESTS PASSED SUCCESSFULLY! ✅');
  } finally {
    await browser.close();
  }
})();
