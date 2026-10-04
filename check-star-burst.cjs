// The star burst on the analysis button has to be a reachable, readable state.
// The existing terminal checker only ever measures the resting button, and it reads
// the two `--analysis-neutral-*` custom properties the button declares itself, so it
// can only confirm the declaration. This checker reads the pixels the browser really
// painted behind the label, in the resting state and in the burst state, in both
// themes, and proves the burst is driven by touch rather than by a stray mouse move.
const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path'), fs = require('node:fs'), assert = require('node:assert/strict');
const sharp = require('sharp');
const output = path.resolve(__dirname, '../artifacts/build-12-star-burst');
fs.mkdirSync(output, { recursive: true });

const lum = c => {
  const f = n => { n /= 255; return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
};
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const rgb = s => { const m = s.match(/[\d.]+/g).map(Number); return [m[0], m[1], m[2]]; };
const byLum = dir => px => px.reduce((a, b) => (lum(a) - lum(b)) * dir >= 0 ? a : b);

// Sample a vertical strip between the rounded edge and the centred label. Nothing is
// drawn there in either state, so the strip is pure background.
async function strip(page, box) {
  const x = Math.round(box.x + box.width * 0.16), w = Math.max(6, Math.round(box.width * 0.08));
  const y = Math.round(box.y + 6), h = Math.max(6, Math.round(box.height - 12));
  const { data, info } = await sharp(await page.screenshot({ clip: { x, y, width: w, height: h } }))
    .raw().toBuffer({ resolveWithObject: true });
  const px = [];
  for (let i = 0; i < data.length; i += info.channels) px.push([data[i], data[i + 1], data[i + 2]]);
  return px;
}
const worstContrast = (ink, px) => Math.min(ratio(ink, byLum(-1)(px)), ratio(ink, byLum(1)(px)));

(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || undefined });
  try {
    for (const source of ['index.html', 'native/Web/index.html']) {
      for (const theme of ['dark', 'light']) {
        const page = await browser.newPage({ viewport: { width: 393, height: 852 }, hasTouch: true });
        const errors = []; page.on('pageerror', e => errors.push(e.message));
        await page.addInitScript(t => {
          localStorage.clear();
          localStorage.setItem('cognicode.launch-seen.v1', '1');
          localStorage.setItem('cognicode.theme', t);
          localStorage.setItem('cognicode.settings.v1', JSON.stringify({ hist: false }));
        }, theme);
        await page.goto(pathToFileURL(path.resolve(__dirname, '..', source)).href);
        await page.locator('#launch-splash').waitFor({ state: 'hidden' });
        await page.evaluate(() => window.WorkspaceStore ? window.WorkspaceStore.ready.then(() => true) : true);
        await page.waitForTimeout(500);
        await page.mouse.move(4, 4);
        // Self-test hook: CC_NEGATIVE=1 puts the burst visuals back to the resting
        // values through a constructed stylesheet (an inline <style> would be blocked by
        // the CSP, and file:// sheets refuse insertRule), so a green run here proves the
        // assertions below are not vacuous.
        if (process.env.CC_NEGATIVE) await page.evaluate(() => {
          const sheet = new CSSStyleSheet();
          sheet.replaceSync('#btn-play.burst::before{opacity:1!important}' +
            '#btn-play.burst{color:#0b1622!important}' +
            '#btn-play.burst .burst-star{opacity:0!important;transform:translate(-50%,-50%) translate(0,0) scale(.35)!important}');
          document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
        });
        const tag = source + ' ' + theme;

        // 1. structure and the resting state
        const rest = await page.locator('#btn-play').evaluate(el => ({
          stars: el.querySelectorAll('.burst-star').length,
          starsHidden: [...el.querySelectorAll('.burst-star')].every(s => getComputedStyle(s).opacity === '0'),
          starsAt: [...el.querySelectorAll('.burst-star')].map(s => getComputedStyle(s).transform),
          rippleLayer: !!el.querySelector('.ripple-layer'),
          burstDisplay: getComputedStyle(el.querySelector('.burst')).display,
          overflow: getComputedStyle(el).overflow,
          fillOpacity: getComputedStyle(el, '::before').opacity,
          color: getComputedStyle(el).color,
        }));
        assert.equal(rest.stars, 6, tag + ': expected six burst stars');
        assert.equal(rest.starsHidden, true, tag + ': stars must be invisible at rest');
        assert.equal(rest.rippleLayer, true, tag + ': the touch ripple needs its own clipping layer');
        assert.equal(rest.overflow, 'visible', tag + ': a hidden overflow would clip the burst');
        assert.equal(rest.fillOpacity, '1', tag + ': the resting button must be a solid fill');
        assert.notEqual(rest.burstDisplay, 'none', tag + ': the burst layer must exist');

        const box = await page.locator('#btn-play').boundingBox();
        const restWorst = worstContrast(rgb(rest.color), await strip(page, box));
        assert.ok(restWorst >= 4.5, tag + ': resting label contrast is only ' + restWorst.toFixed(2) + ':1');

        // 2. a real touchstart must reach the burst state, not a mouse move
        await page.mouse.move(4, 4);
        await page.waitForTimeout(120);
        const afterMouse = await page.locator('#btn-play').evaluate(el => el.classList.contains('burst'));
        assert.equal(afterMouse, false, tag + ': moving the mouse must not fake the burst');

        await page.locator('#btn-play').evaluate(el =>
          el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true })));
        await page.waitForTimeout(700);
        const burst = await page.locator('#btn-play').evaluate(el => ({
          on: el.classList.contains('burst'),
          color: getComputedStyle(el).color,
          fillOpacity: getComputedStyle(el, '::before').opacity,
          stars: [...el.querySelectorAll('.burst-star')].map(s => ({ opacity: getComputedStyle(s).opacity, at: getComputedStyle(s).transform })),
        }));
        assert.equal(burst.on, true, tag + ': touchstart did not start the burst');
        assert.equal(burst.fillOpacity, '0', tag + ': the fill must clear so the stars are visible');
        assert.ok(burst.stars.every(s => s.opacity === '1'), tag + ': every star must be revealed');
        assert.ok(burst.stars.every((s, i) => s.at !== rest.starsAt[i]),
          tag + ': a star never left its resting position');
        assert.notEqual(burst.color, rest.color, tag + ': the label colour must flip for the cleared fill');

        const burstWorst = worstContrast(rgb(burst.color), await strip(page, box));
        assert.ok(burstWorst >= 4.5, tag + ': burst label contrast is only ' + burstWorst.toFixed(2) + ':1');
        if (source === 'index.html') await page.screenshot({ path: path.join(output, 'burst-' + theme + '.png') });

        // 3. the burst must not create a horizontal scrollbar at any supported width
        for (const width of [320, 393, 440]) {
          await page.setViewportSize({ width, height: width === 320 ? 568 : 852 });
          await page.locator('#btn-play').evaluate(el =>
            el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true })));
          await page.waitForTimeout(700);
          const wide = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, view: innerWidth }));
          assert.ok(wide.scroll <= wide.view, tag + ' @' + width + ': the burst grew the page to ' + wide.scroll);
        }
        assert.deepEqual(errors, [], tag + ': page errors');
        await page.close();
        console.log('PASS ' + tag + ': six stars, hidden at rest, revealed by touch only, ' +
          restWorst.toFixed(2) + ':1 resting and ' + burstWorst.toFixed(2) + ':1 burst contrast, no overflow');
      }
    }

    // 4. reduced motion keeps the decoration away entirely
    const calm = await browser.newPage({ viewport: { width: 393, height: 852 }, hasTouch: true, reducedMotion: 'reduce' });
    await calm.addInitScript(() => {
      localStorage.setItem('cognicode.launch-seen.v1', '1');
      localStorage.setItem('cognicode.settings.v1', JSON.stringify({ hist: false }));
    });
    await calm.goto(pathToFileURL(path.resolve(__dirname, '../index.html')).href);
    await calm.locator('#launch-splash').waitFor({ state: 'hidden' });
    await calm.locator('#btn-play').evaluate(el =>
      el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true })));
    await calm.waitForTimeout(120);
    const still = await calm.locator('#btn-play').evaluate(el => ({
      burst: getComputedStyle(el.querySelector('.burst')).display,
      label: el.querySelector('.play-label').innerText,
    }));
    assert.equal(still.burst, 'none', 'reduced motion: the burst layer must stay hidden');
    assert.equal(still.label, 'تحلیل کد', 'reduced motion: the label must stay intact');
    await calm.close();
    console.log('PASS reduced motion: burst hidden, label unchanged');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
