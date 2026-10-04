// The "از کجا شروع کنیم؟" panel inside the editor must be visible whenever the
// editor is empty — including in the engine the installed app actually runs on.
// Every other checker in this repo launches Chromium, so a WebKit-only rendering
// difference (the native app is WKWebView) could never be caught before shipping.
// This checker runs the same contract in Chromium and, when available, in WebKit,
// and it diffs real pixels so "laid out" cannot pass as "painted".
const { chromium, webkit } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path'), fs = require('node:fs'), assert = require('node:assert/strict');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'artifacts', 'build-13-quick-start');
fs.mkdirSync(output, { recursive: true });

// A restored draft is ignored once the user has typed, so each draft carries a
// strictly newer timestamp than the one before it.
let clock = Date.now();
const draft = code => ({ id: 'current', code, langMode: 'auto', name: '', updated: (clock += 1000) });

const grab = async (page, clip) => sharp(await page.screenshot({ clip })).raw().toBuffer();
const meanDelta = (a, b) => { let sum = 0; for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]); return sum / a.length; };
// Fraction of pixels that change noticeably, which is a far steadier signal than a
// mean: an unpainted element leaves this at zero regardless of theme or engine.
const changedShare = (a, b) => {
  let changed = 0;
  for (let i = 0; i < a.length; i += 3) {
    if (Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])) > 24) changed++;
  }
  return changed / (a.length / 3);
};
const channelDelta = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);

async function contract(browser, name) {
  for (const theme of ['dark', 'light']) {
    const context = await browser.newContext({ viewport: { width: 393, height: 852 }, hasTouch: true });
    await context.addInitScript(t => {
      localStorage.clear();
      localStorage.setItem('cognicode.launch-seen.v1', '1');
      localStorage.setItem('cognicode.theme', t);
      localStorage.setItem('cognicode.settings.v1', JSON.stringify({ hist: false }));
    }, theme);
    const page = await context.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(pathToFileURL(path.join(root, 'native/Web/index.html')).href);
    await page.locator('#launch-splash').waitFor({ state: 'hidden' });
    await page.evaluate(() => window.WorkspaceStore ? window.WorkspaceStore.ready.then(() => true) : true);
    await page.waitForTimeout(350);
    const tag = name + ' ' + theme;
    const panel = page.locator('#quick-start');

    // 1. an empty editor is the panel's home state, with the promised options
    assert.equal(await panel.isVisible(), true, tag + ': the panel must be visible on an empty editor');
    const text = await panel.innerText();
    assert.match(text, /اسکن تصویر/, tag + ': the panel must offer the image scan option');
    assert.match(text, /انتخاب فایل/, tag + ': the panel must offer the file option');
    const grid = await page.locator('.quick-grid').boundingBox();
    assert.ok(grid.width > 100 && grid.height > 60, tag + ': the option grid collapsed to ' + grid.width + 'x' + grid.height);

    // 2. laid out is not the same as painted
    const box = await panel.boundingBox();
    const clip = { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) };
    const painted = await grab(page, clip);
    await panel.evaluate(el => { el.hidden = true; });
    await page.waitForTimeout(120);
    const blank = await grab(page, clip);
    await panel.evaluate(el => { el.hidden = false; });
    const delta = meanDelta(painted, blank);
    const changed = changedShare(painted, blank);
    assert.ok(delta > 8 && changed > 0.05,
      tag + ': the panel is laid out but contributes no pixels (delta ' + delta.toFixed(1) + ', changed ' + (changed * 100).toFixed(1) + '%)');

    // 2b. the panel must be a surface of its own, not text floating on the editor
    const full = await sharp(await page.screenshot()).raw().toBuffer({ resolveWithObject: true });
    const at = (x, y) => { const o = (y * full.info.width + x) * full.info.channels; return [full.data[o], full.data[o + 1], full.data[o + 2]]; };
    const surface = channelDelta(at(Math.round(box.x + 8), Math.round(box.y + box.height / 2)),
                                 at(Math.round(box.x - 8), Math.round(box.y + box.height / 2)));
    assert.ok(surface >= 25, tag + ': the panel has no surface of its own (' + surface + ' vs the editor behind it)');
    if (theme === 'dark') await page.screenshot({ path: path.join(output, 'quick-start-' + name + '.png') });

    // 3. the native bridge decides the panel from the stored draft — both ways.
    //    This has to run before any typing, because a restored draft never
    //    overwrites edits the user made while storage was still loading.
    await page.evaluate(d => window.__onNativeDraft(d), draft('const restored = 1;'));
    await page.waitForTimeout(250);
    assert.equal(await page.locator('#code').inputValue(), 'const restored = 1;', tag + ': the draft must reach the editor');
    assert.equal(await panel.isVisible(), false, tag + ': a restored non-empty draft must hide the panel');
    await page.evaluate(d => window.__onNativeDraft(d), draft(''));
    await page.waitForTimeout(250);
    assert.equal(await page.locator('#code').inputValue(), '', tag + ': an empty draft must clear the editor');
    assert.equal(await panel.isVisible(), true, tag + ': an empty restored draft must show the panel');

    // 4. typing hides it; clearing the editor brings it back
    await page.locator('#code').fill('const a = 1;');
    await page.waitForTimeout(150);
    assert.equal(await panel.isVisible(), false, tag + ': the panel must yield to typed code');
    await page.locator('#code').fill('');
    await page.waitForTimeout(150);
    assert.equal(await panel.isVisible(), true, tag + ': the panel must return when the editor is cleared');

    assert.deepEqual(errors, [], tag + ': page errors');
    await context.close();
    console.log('PASS ' + tag + ': visible when empty, painted not just laid out (delta ' + delta.toFixed(1) +
      '), draft decides it both ways, hidden by code');
  }
}

(async () => {
  const chromiumBrowser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || undefined });
  try { await contract(chromiumBrowser, 'chromium'); } finally { await chromiumBrowser.close(); }
  let webkitBrowser = null;
  try { webkitBrowser = await webkit.launch(); } catch (error) {
    console.log('SKIP webkit: the engine is not installed here — ' + String(error.message || error).split('\n')[0]);
  }
  if (webkitBrowser) {
    try { await contract(webkitBrowser, 'webkit'); } finally { await webkitBrowser.close(); }
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
