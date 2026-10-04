// Pipeline tests with stubbed AI responses; these do not measure a real model's OCR accuracy.
const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const assert = require('node:assert/strict');
const CODE = 'const total = 2 + 3;\nconsole.log(total);';
const report = { language: 'javascript', valid: true, errors: [], advice: '', explanation: { summary: 'جمع دو عدد', steps: ['جمع و نمایش'], uses: ['محاسبه'], notes: [] } };

(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || undefined });
  try {
    for (const source of ['index.html', 'native/Web/index.html']) {
      for (const kind of ['gallery', 'camera', 'truncated', 'uncertain', 'no-code', 'file', 'utf16', 'binary']) {
        const page = await browser.newPage({ viewport: { width: 393, height: 852 } });
        const calls = [], errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript(() => {
          localStorage.clear();
          localStorage.setItem('cognicode.launch-seen.v1', '1');
          localStorage.setItem('cognicode.settings.v1', JSON.stringify({ base: 'https://stub.invalid/v1', key: 'test', model: 'gpt-4o-mini', hist: false }));
        });
        function reply(body) {
          const isOCR = body.messages[0].content.includes('transcription engine');
          calls.push({ body, isOCR });
          let content = JSON.stringify(report), finish = 'stop';
          if (isOCR) {
            const number = calls.filter(c => c.isOCR).length;
            content = JSON.stringify({ code: number === 1 && ['uncertain','truncated'].includes(kind) ? 'const total = 2 + 8;' : CODE, language: 'javascript', noCode: kind === 'no-code', uncertainLines: kind === 'uncertain' ? [1] : [] });
            if (kind === 'truncated') finish = 'length';
          }
          return JSON.stringify({ choices: [{ message: { content }, finish_reason: finish }] });
        }
        if (source.startsWith('native/')) {
          // Exercise nativeSend/__nativeAI, not the browser fetch fallback.
          await page.exposeFunction('__testNativeRequest', json => reply(JSON.parse(json)));
          await page.addInitScript(() => {
            window.webkit = { messageHandlers: {
              aiBridge: { postMessage: message => window.__testNativeRequest(message.body).then(text => window.__nativeAI(message.id, true, 200, text)) },
              themeBridge: { postMessage() {} },
              dynamicIslandBridge: { postMessage() {} }
            } };
          });
          await page.route('**/chat/completions', () => { throw new Error('Native import must use the Swift bridge'); });
        } else {
          await page.route('**/chat/completions', route => route.fulfill({ status: 200, contentType: 'application/json', body: reply(JSON.parse(route.request().postData())) }));
        }
        await page.goto(pathToFileURL(path.resolve(__dirname, '..', source)).href);
        await page.locator('#launch-splash').waitFor({ state: 'hidden' });
        // Let a draft restored from a previous iteration land before typing over it.
        await page.evaluate(() => window.WorkspaceStore ? window.WorkspaceStore.ready.then(() => true) : true);
        await page.waitForTimeout(600);
        await page.locator('#code').fill('// preserve my existing draft');
        if (['file', 'utf16', 'binary'].includes(kind)) {
          const buffer = kind === 'binary' ? Buffer.from([0, 1, 2, 3]) : kind === 'utf16' ? Buffer.concat([Buffer.from([255, 254]), Buffer.from(CODE, 'utf16le')]) : Buffer.from(CODE);
          await page.locator('#file-input').setInputFiles({ name: 'sample.js', mimeType: 'text/javascript', buffer });
        } else {
          await page.locator(kind === 'camera' ? '#camera-input' : '#gallery-input').setInputFiles(path.resolve(__dirname, '../icons/icon-180.png'));
        }
        const rejected = ['truncated', 'uncertain', 'no-code', 'binary'].includes(kind);
        // Import must only place the code: analysis never starts on its own.
        await page.waitForFunction(({ rejected, code }) => {
          const ta = document.getElementById('code');
          return !document.getElementById('btn-play').disabled && (rejected ? document.querySelector('.toast').textContent.length > 0 : ta.value === code);
        }, { rejected, code: CODE }, { timeout: 10000 });
        assert.equal(await page.locator('#code').inputValue(), rejected ? '// preserve my existing draft' : CODE);
        assert.equal(calls.filter(c => !c.isOCR).length, 0, 'import must not auto-analyze');
        assert.equal(await page.locator('.brain-marquee').getAttribute('data-state'), 'idle', 'no verdict before the user presses Analyze');
        if (['gallery', 'camera'].includes(kind)) {
          assert.equal(calls.filter(c => c.isOCR).length, 1);
          const part = calls[0].body.messages[1].content[1];
          assert.equal(part.image_url.detail, 'high');
          assert.ok(part.image_url.url.startsWith('data:image/png;base64,'));
        }
        if (!rejected) {
          // Analysis starts only from the explicit button press.
          await page.locator('#btn-play').click();
          await page.waitForFunction(() => document.querySelector('.brain-marquee').dataset.state === 'healthy', null, { timeout: 15000 });
          assert.equal(calls.filter(c => !c.isOCR).length, 1);
          assert.ok(calls[calls.length - 1].body.messages[1].content.includes(CODE));
          if (['gallery', 'camera'].includes(kind)) assert.equal(calls.filter(c => c.isOCR).length, 1);
        }
        assert.equal(await page.locator('#code').evaluate(el => el.readOnly), false);
        assert.deepEqual(errors, []);
        await page.close();
        console.log(`PASS ${source}: ${kind}`);
      }
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
