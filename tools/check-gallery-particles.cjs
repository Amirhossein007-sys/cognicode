// Gallery import end-to-end with a stubbed AI. The OCR contract is strict JSON, so the
// stub must answer with JSON; a plain-text reply is one of the failure cases.
const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const assert = require('node:assert/strict');
const CODE = 'const imageCode = 42;';
const IMAGE = path.resolve(__dirname, '../icons/icon-180.png');
(async () => {
  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || undefined });
  try {
    for (const native of [false, true]) {
      const page = await browser.newPage({ viewport: { width: 393, height: 852 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(native => {
        localStorage.clear();
        localStorage.setItem('cognicode.launch-seen.v1', '1');
        localStorage.setItem('cognicode.settings.v1', JSON.stringify({ key: 'test-key', base: 'https://vision.test/v1', model: 'test-vision', hist: false }));
        window.testOcr = JSON.stringify({ code: 'const imageCode = 42;', language: 'javascript', uncertainLines: [], noCode: false });
        window.testReport = JSON.stringify({ language: 'javascript', valid: true, errors: [], advice: '', explanation: { summary: 'نمونه', steps: ['گام'], uses: ['کاربرد'], notes: [] } });
        window.replyStatus = 200;
        window.sentBodies = [];
        window.__isOcr = body => /transcription engine/.test(String(body.messages[0].content || ''));
        window.__replyFor = body => window.__isOcr(body) ? window.testOcr : window.testReport;
        if (native) window.webkit = { messageHandlers: {
          dynamicIslandBridge: { postMessage() {} },
          aiBridge: { postMessage(message) {
            const body = JSON.parse(message.body);
            window.sentBodies.push(body);
            setTimeout(() => window.__nativeAI(message.id, window.replyStatus === 200, window.replyStatus, JSON.stringify({ choices: [{ message: { content: window.__replyFor(body) }, finish_reason: 'stop' }] })), 100);
          } }
        } };
      }, native);
      await page.route('https://vision.test/**', async route => {
        const body = route.request().postDataJSON();
        await page.evaluate(b => { window.sentBodies.push(b); }, body);
        const content = await page.evaluate(b => window.__replyFor(b), body);
        await route.fulfill({ status: await page.evaluate(() => window.replyStatus), contentType: 'application/json', body: JSON.stringify({ choices: [{ message: { content }, finish_reason: 'stop' }] }) });
      });
      const analysisCalls = () => page.evaluate(() => window.sentBodies.filter(b => !window.__isOcr(b)).length);
      await page.goto(pathToFileURL(path.resolve(__dirname, native ? '../native/Web/index.html' : '../index.html')).href);
      await page.locator('#launch-splash').waitFor({ state: 'hidden' });
      // Let any draft restored from a previous iteration land before interacting.
      await page.evaluate(() => window.WorkspaceStore ? window.WorkspaceStore.ready.then(() => true) : true);
      await page.waitForTimeout(600);
      await page.locator('#key-open').click();
      assert.equal(await page.locator('#sheet-import').evaluate(el => el.classList.contains('open')), true);
      const chooserEvent = page.waitForEvent('filechooser');
      await page.locator('#import-gallery').click();
      const chooser = await chooserEvent;
      assert.equal(await chooser.element().getAttribute('capture'), null, 'Gallery must not force camera');
      await chooser.setFiles(IMAGE);
      await page.waitForFunction(code => document.querySelector('#code').value === code, CODE);
      // Import only fills the editor: no analysis request, no verdict.
      assert.equal(await analysisCalls(), 0, 'import must not auto-analyze');
      assert.equal(await page.locator('.brain-marquee').getAttribute('data-state'), 'idle', 'no verdict before the button');
      const sent = await page.evaluate(() => window.sentBodies);
      assert.equal(sent.length, 1, 'exactly one OCR request');
      const imagePart = sent[0].messages[1].content[1];
      assert.equal(imagePart.type, 'image_url');
      assert.equal(imagePart.image_url.detail, 'high');
      assert.ok(imagePart.image_url.url.startsWith('data:image/png;base64,'), imagePart.image_url.url.slice(0, 30));
      await page.locator('#key-undo').click();
      assert.equal(await page.locator('#code').inputValue(), '');
      await page.locator('#code').fill('keep existing code');
      for (const reply of ['NO_CODE_FOUND', 'server-error']) {
        await page.waitForFunction(() => !document.querySelector('.toast').classList.contains('show'));
        await page.evaluate(r => { window.testOcr = r; window.replyStatus = r === 'server-error' ? 500 : 200; }, reply);
        await page.locator('#gallery-input').setInputFiles(IMAGE);
        await page.waitForFunction(() => document.querySelector('.toast').textContent.includes('خواندن تصویر ناموفق بود'), null, { timeout: 10000 });
        assert.equal(await page.locator('#code').inputValue(), 'keep existing code');
      }
      await page.waitForFunction(() => !document.querySelector('.toast').classList.contains('show'));
      await page.locator('#gallery-input').setInputFiles({ name: 'bad.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
      await page.waitForFunction(() => document.querySelector('.toast').textContent.includes('خواندن تصویر ناموفق بود'), null, { timeout: 10000 });
      assert.equal(await page.locator('#code').inputValue(), 'keep existing code');
      // Restore a healthy stub: the failure cases above left replyStatus at 500.
      await page.evaluate(() => { window.replyStatus = 200; window.testOcr = JSON.stringify({ code: 'const imageCode = 42;', language: 'javascript', uncertainLines: [], noCode: false }); });
      await page.locator('#key-open').click();
      const fileEvent = page.waitForEvent('filechooser');
      await page.locator('#import-file').click();
      await (await fileEvent).setFiles({ name: 'sample.js', mimeType: 'text/javascript', buffer: Buffer.from('const fromFile = 7;') });
      await page.waitForFunction(() => document.querySelector('#code').value === 'const fromFile = 7;');
      assert.equal(await analysisCalls(), 0, 'file import must not auto-analyze either');
      // Analysis starts only from the explicit button press.
      await page.locator('#btn-play').click();
      await page.waitForFunction(() => document.querySelector('.brain-marquee').dataset.state === 'healthy', null, { timeout: 15000 });
      assert.equal(await analysisCalls(), 1);
      for (const theme of ['dark', 'light']) {
        await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
        await page.waitForTimeout(500);
        assert.equal(await page.locator('#particles-js canvas').evaluate(c => !!c.getContext('2d')), true);
        await page.screenshot({ path: path.resolve(__dirname, `../particles-${theme}.png`) });
      }
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.waitForTimeout(100);
      const first = await page.locator('#particles-js canvas').screenshot();
      await page.waitForTimeout(150);
      assert.deepEqual(await page.locator('#particles-js canvas').screenshot(), first);
      assert.deepEqual(errors, []);
      console.log(`PASS ${native ? 'native bridge' : 'PWA'}: gallery without camera capture, strict-JSON OCR, PNG payload, no auto-analysis, undo, failures keep code, manual analysis, themes, reduced motion`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
