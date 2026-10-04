// Guards the report rendering contract: the security section must escape exactly once,
// and the verdict badge must never contradict the report body it sits above.
const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const assert = require('node:assert/strict');

const QUOTED = 'if (a && b) { x < 1; }';
// Note: read the verdict with textContent + checkVisibility(). innerText is empty here
// because Chrome keeps reporting visibility:'hidden' for this subtree (inherited from the
// launch-pending rule) long after the class is gone, even though the badge is painted.
const badge = page => page.locator('#res-verdict').evaluate(el => ({ text: el.textContent, visible: typeof el.checkVisibility === 'function' ? el.checkVisibility() : el.getBoundingClientRect().height > 0 }));
const report = security => ({
  language: 'javascript', valid: true, errors: [], advice: '', fixExplanation: '',
  security, explanation: { summary: 'نمونه', steps: ['گام'], uses: ['کاربرد'], notes: [] }
});
const SCENARIOS = [
  {
    name: 'evidence quote renders literally',
    code: 'const a = 1;\n' + QUOTED,
    security: { verdict: 'suspicious', confidence: 'medium', techniques: ['T1059'], evidence: [{ line: 2, quote: QUOTED, reason: 'شاهد تستی' }], note: 'یادداشت' },
    check: async page => {
      const body = await page.locator('#res-body').innerText();
      assert.ok(body.includes(QUOTED), 'quote must render verbatim: ' + JSON.stringify(body.match(/شاهد تستی.*/) || ['']));
      assert.ok(!body.includes('&amp;'), 'report body must not contain a double-escaped entity');
      assert.ok(!body.includes('&lt;'), 'report body must not contain a double-escaped entity');
      await page.locator('#res-copy').click();
      await page.waitForFunction(() => typeof window.copiedText === 'string');
      const copied = await page.evaluate(() => window.copiedText);
      assert.ok(copied.includes(QUOTED), 'copied report must keep the quote verbatim');
      assert.ok(!copied.includes('&amp;'), 'copied report must not contain a double-escaped entity');
    }
  },
  {
    name: 'malicious model verdict wins the badge',
    code: 'const a = 1;\nconsole.log(a);',
    security: { verdict: 'malicious', confidence: 'high', techniques: ['T1041'], evidence: [{ line: 1, quote: 'const a = 1;', reason: 'شاهد تستی' }], note: 'یادداشت' },
    check: async page => {
      const b = await badge(page);
      const body = await page.locator('#res-body').innerText();
      assert.ok(b.visible, 'verdict badge must be rendered for the user');
      assert.ok(body.includes('خطرناک'), 'body must report the malicious verdict');
      assert.ok(!/سالم/.test(b.text), 'badge must not say the code is healthy: ' + JSON.stringify(b.text));
      assert.match(b.text, /مخرب|مشکوک/);
    }
  },
  {
    name: 'clean code keeps the healthy badge',
    code: 'const a = 1;\nconsole.log(a);',
    security: { verdict: 'clean', confidence: 'high', techniques: [], evidence: [], note: '' },
    check: async page => {
      const b = await badge(page);
      const body = await page.locator('#res-body').innerText();
      assert.ok(b.visible, 'verdict badge must be rendered for the user');
      assert.ok(/سالم/.test(b.text), 'clean code must keep the healthy badge: ' + JSON.stringify(b.text));
      assert.ok(!body.includes('خطرناک'));
    }
  }
];

(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || undefined });
  try {
    for (const source of ['index.html', 'native/Web/index.html']) {
      for (const scenario of SCENARIOS) {
        const page = await browser.newPage({ viewport: { width: 393, height: 852 }, reducedMotion: 'reduce' });
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.addInitScript(() => {
          localStorage.clear();
          localStorage.setItem('cognicode.launch-seen.v1', '1');
          localStorage.setItem('cognicode.settings.v1', JSON.stringify({ base: 'https://render.invalid/v1', key: 'fixture', model: 'fixture', hist: false }));
          Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: t => { window.copiedText = t; return Promise.resolve(); } } });
        });
        const payload = report(scenario.security);
        await page.route('https://render.invalid/**', route => route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify({ choices: [{ message: { content: JSON.stringify(payload) }, finish_reason: 'stop' }] })
        }));
        await page.goto(pathToFileURL(path.resolve(__dirname, '..', source)).href);
        await page.locator('#launch-splash').waitFor({ state: 'hidden' });
        await page.locator('#code').fill(scenario.code);
        await page.locator('#btn-play').click();
        await page.waitForFunction(() => document.getElementById('res-loading').hidden && document.getElementById('res-body').textContent.length > 0, null, { timeout: 20000 });
        await scenario.check(page);
        assert.deepEqual(errors, []);
        await page.close();
        console.log(`PASS ${source}: ${scenario.name}`);
      }
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
