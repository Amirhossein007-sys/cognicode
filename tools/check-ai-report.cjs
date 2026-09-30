// AI report / magic-fix regression checks — runs against a stubbed OpenAI-compatible
// endpoint, so it needs no API key and no network.
//
// Guards three defects:
//   1. the code sent to the model was cut with `code.slice(0, 12000)`, so long files
//      reached the model incomplete and it truthfully reported "کد ناقص است";
//   2. the whole reply (including the rewritten file inside `fixedCode`) had to fit in
//      max_tokens 2400, so it was truncated, JSON.parse failed and the app dumped the
//      raw JSON into the report while hiding the magic-fix button;
//   3. the magic-fix card was only revealed for hard errors, so a real fix was dropped.
//
// Run: NODE_PATH=<playwright> BROWSER_CHANNEL=chrome node tools/check-ai-report.cjs
const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const assert = require('node:assert/strict');

const CLEAN = Array.from({ length: 30 }, (_, i) => `const value_${i + 1} = ${i + 1};`).join('\n');
const FIXED = CLEAN + '\nconst added = 1;';

const ANALYSIS_OK = JSON.stringify({
  language: 'javascript', valid: true, errors: [], advice: '', fixExplanation: '',
  explanation: { summary: 'کد سالم و ساده است.', steps: ['گام یک'], uses: ['کاربرد'], notes: ['نکته'] },
});

const ANALYSIS_ERR = JSON.stringify({
  language: 'javascript', valid: false,
  errors: [{ line: 2, column: 1, severity: 'error', message: 'متغیر تعریف‌نشده', hint: 'آن را تعریف کن' }],
  advice: 'یک متغیر تعریف‌نشده دارید.',
  fixExplanation: 'متغیر تعریف‌نشده اضافه شد.',
  explanation: { summary: 'کد ساده است.', steps: ['گام یک'], uses: ['کاربرد'], notes: ['نکته'] },
});

// A reply cut mid-JSON, exactly what max_tokens truncation used to produce. The repair
// step is expected to recover the errors from this, so it must not become raw output.
const ANALYSIS_CUT = '{"language":"javascript","valid":false,"errors":[{"line":2,"column":1,"severity":"error",' +
  '"message":"کد ناقص است","hint":"کد را کامل کن"}],"advice":"کد را کامل کن","explanation":{"summary":"کد ناقص اس';

// A reply that is not JSON at all and cannot be repaired — must never be dumped raw
const ANALYSIS_FREETEXT = 'متأسفم، نمی‌توانم این کد را بررسی کنم.';

// valid=false with no hard error entry — decision: the fix button must still appear
const ANALYSIS_NO_HARD = JSON.stringify({
  language: 'javascript', valid: false, errors: [],
  advice: 'بهبود ساختار پیشنهاد می‌شود.', fixExplanation: 'ساختار مرتب شد.',
  explanation: { summary: 'کد کار می‌کند ولی مرتب نیست.', steps: ['گام یک'], uses: ['کاربرد'], notes: ['نکته'] },
});

const BIG_CODE = Array.from({ length: 900 }, (_, i) => `const big_${i + 1} = ${i + 1}; // padding row ${i + 1}`).join('\n');

async function scenario(browser, opts) {
  const page = await browser.newPage({ viewport: { width: 393, height: 852 } });
  await page.addInitScript(() => {
    localStorage.setItem('cognicode.settings.v1', JSON.stringify({
      base: 'https://stub.invalid/v1', key: 'sk-test', model: 'gpt-4o-mini', hist: false, proxy: '',
    }));
  });
  const seen = [];
  await page.route('**/chat/completions', async route => {
    const body = JSON.parse(route.request().postData() || '{}');
    const text = JSON.stringify(body.messages || []);
    const isFix = text.includes('اصلاح‌گر کد دقیق');
    seen.push({ isFix, userChars: String((body.messages || [])[1] ? body.messages[1].content : '').length });
    const content = isFix ? (opts.fixBody || FIXED) : opts.analysisBody;
    const finish = isFix ? (opts.fixFinish || 'stop') : (opts.analysisFinish || 'stop');
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ choices: [{ message: { role: 'assistant', content }, finish_reason: finish }] }),
    });
  });

  await page.goto(pathToFileURL(path.resolve(__dirname, '../index.html')).href);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  await page.evaluate(code => {
    const ta = document.getElementById('code');
    ta.value = code;
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }, opts.code || CLEAN);
  await page.waitForTimeout(300);
  await page.click('#btn-play');
  await page.waitForTimeout(3200);

  const state = await page.evaluate(() => ({
    verdict: document.getElementById('res-verdict').textContent,
    mode: document.getElementById('res-mode').textContent,
    bodyText: document.getElementById('res-body').textContent || '',
    problemsText: document.getElementById('problems-list').textContent || '',
    magicFixHidden: document.getElementById('magic-fix-card').hidden,
    problemsHidden: document.getElementById('problems').hidden,
    diffLines: document.querySelectorAll('#diff-viewer-body .diff-line').length,
  }));
  await page.close();
  return { seen, state };
}

const RAW_JSON_MARKER = '"explanation"';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || undefined });
  const failures = [];
  // هر سناریو مستقل اجرا می‌شود تا یک شکست، بقیهٔ بررسی‌ها را پنهان نکند
  async function check(name, fn) {
    try { await fn(); console.log('PASS ' + name); }
    catch (e) { failures.push({ name, message: e.message }); console.log('FAIL ' + name + ' — ' + e.message); }
  }
  try {
    // ── 1. Healthy code: one call only, no raw JSON, no fix button
    await check('healthy code: 1 call, structured report, no fix button', async () => {
      const { seen, state } = await scenario(browser, { analysisBody: ANALYSIS_OK });
      assert.equal(seen.length, 1, 'healthy code must not trigger a fix request');
      assert.equal(seen[0].isFix, false);
      assert.ok(!state.bodyText.includes(RAW_JSON_MARKER), 'raw JSON must never be rendered into the report');
      assert.ok(state.bodyText.includes('این کد چه می‌کند'), 'report must render the structured explanation');
      assert.equal(state.verdict, '✓ کد سالم است');
      assert.equal(state.magicFixHidden, true, 'no fix was proposed, so no fix button');
    });

    // ── 2. Real error: a second (fix) call runs and the magic-fix button appears
    await check('error case: analysis + fix call, fix button visible', async () => {
      const { seen, state } = await scenario(browser, { analysisBody: ANALYSIS_ERR });
      assert.equal(seen.length, 2, 'an error must trigger a separate fix request');
      assert.equal(seen[1].isFix, true, 'the second call must be the fix request');
      assert.equal(state.magicFixHidden, false, 'magic-fix button must be visible when a real fix exists');
      assert.equal(state.problemsHidden, false, 'problems panel must be open so the fix card is reachable');
      assert.ok(state.diffLines > 0, 'split diff must be rendered for the proposed fix');
    });

    // ── 3. Reply truncated by max_tokens: the repair step must recover it, and raw
    //      JSON must never reach the report
    await check('truncated reply: repaired, no raw JSON anywhere', async () => {
      const { state } = await scenario(browser, { analysisBody: ANALYSIS_CUT, analysisFinish: 'length' });
      assert.ok(!state.bodyText.includes(RAW_JSON_MARKER) && !state.problemsText.includes(RAW_JSON_MARKER),
        'a truncated reply must not be rendered as raw JSON');
      assert.ok(state.problemsText.includes('کد ناقص است'),
        'the repair step must recover the errors from a truncated reply');
      assert.equal(state.magicFixHidden, false, 'a recovered error must still offer the fix');
    });

    // ── 4. Unparseable reply: explain it, never dump it
    await check('unparseable reply: clear message, no raw echo', async () => {
      const { state } = await scenario(browser, { analysisBody: ANALYSIS_FREETEXT });
      assert.ok(!state.bodyText.includes('متأسفم، نمی‌توانم'),
        'an unparseable reply must not be echoed into the report');
      assert.ok(state.bodyText.includes('خوانا نبود'), 'the report must say the AI reply was unreadable');
      assert.equal(state.magicFixHidden, true, 'no fix may be offered from an unreadable reply');
    });

    // ── 5. Long file: the model must receive the file, not the first 12000 chars
    await check('long file: whole file reaches the model', async () => {
      const { seen } = await scenario(browser, { analysisBody: ANALYSIS_OK, code: BIG_CODE });
      assert.ok(seen[0].userChars > 20000,
        `the model must receive the long file (got ${seen[0].userChars} chars, old cap was 12000)`);
      assert.ok(seen[0].userChars <= 52000, 'the request must stay inside the documented cap');
    });

    // ── 6. valid=false with no hard error: the fix button still appears
    await check('no-hard-error case: fix button visible, verdict reflects the model', async () => {
      const { seen, state } = await scenario(browser, { analysisBody: ANALYSIS_NO_HARD });
      assert.equal(seen.length, 2, 'valid=false must still trigger the fix request');
      assert.equal(state.magicFixHidden, false,
        'the fix button must appear whenever a real fix exists, even without hard errors');
      assert.equal(state.verdict, '⚠️ نیاز به اصلاح دارد', 'the model verdict must be reflected, not overridden');
    });

    // ── 7. Fix reply itself truncated: never offer a half-written file
    await check('truncated fix: rejected, no fix button offered', async () => {
      const { state } = await scenario(browser, {
        analysisBody: ANALYSIS_ERR, fixBody: CLEAN + '\nconst par', fixFinish: 'length',
      });
      assert.equal(state.magicFixHidden, true,
        'a truncated fix must never be offered — applying it would destroy the user code');
    });
  } finally { await browser.close(); }

  if (failures.length) {
    console.error('\n' + failures.length + ' scenario(s) failed:');
    failures.forEach(f => console.error(' - ' + f.name + ': ' + f.message));
    process.exitCode = 1;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
