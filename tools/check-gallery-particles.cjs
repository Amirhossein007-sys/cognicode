const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || undefined });
  try {
    for (const native of [false, true]) {
      const page = await browser.newPage({ viewport: { width: 393, height: 852 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(native => {
        localStorage.setItem('cognicode.settings.v1', JSON.stringify({ key: 'test-key', base: 'https://vision.test/v1', model: 'test-vision' }));
        window.testReply = 'const imageCode = 42;';
        window.sentImages = [];
        window.replyStatus = 200;
        if (native) window.webkit = { messageHandlers: {
          dynamicIslandBridge: { postMessage() {} },
          aiBridge: { postMessage(message) {
            window.sentImages.push(JSON.parse(message.body));
            setTimeout(() => window.__nativeAI(message.id, window.replyStatus === 200, window.replyStatus, JSON.stringify({ choices: [{ message: { content: window.testReply } }] })), 100);
          } }
        } };
      }, native);
      await page.route('https://vision.test/**', async route => {
        await page.evaluate(body => window.sentImages.push(body), route.request().postDataJSON());
        await route.fulfill({ status: await page.evaluate(() => window.replyStatus), contentType: 'application/json', body: JSON.stringify({ choices: [{ message: { content: await page.evaluate(() => window.testReply) } }] }) });
      });
      await page.goto(pathToFileURL(path.resolve(__dirname, native ? '../native/Web/index.html' : '../index.html')).href);
      await page.locator('#key-open').click();
      assert.equal(await page.locator('#sheet-import').evaluate(el => el.classList.contains('open')), true);
      const chooserEvent = page.waitForEvent('filechooser');
      await page.locator('#import-gallery').click();
      const chooser = await chooserEvent;
      assert.equal(await chooser.element().getAttribute('capture'), null, 'Gallery must not force camera');
      await chooser.setFiles(path.resolve(__dirname, '../icons/icon-180.png'));
      await page.waitForFunction(() => document.querySelector('#code').value === 'const imageCode = 42;');
      assert.match(await page.evaluate(() => window.sentImages[0].messages[0].content[1].image_url.url), /^data:image\/jpeg;base64,/);
      await page.locator('#key-undo').click();
      assert.equal(await page.locator('#code').inputValue(), '');
      await page.locator('#code').fill('keep existing code');
      for (const reply of ['NO_CODE_FOUND', 'server-error']) {
        await page.evaluate(reply => { window.testReply = reply; window.replyStatus = reply === 'server-error' ? 500 : 200; }, reply);
        await page.locator('#gallery-input').setInputFiles(path.resolve(__dirname, '../icons/icon-180.png'));
        await page.waitForFunction(() => !document.querySelector('#btn-play').disabled);
        assert.equal(await page.locator('#code').inputValue(), 'keep existing code');
      }
      await page.locator('#gallery-input').setInputFiles({ name: 'bad.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
      await page.waitForFunction(() => !document.querySelector('#btn-play').disabled);
      assert.equal(await page.locator('#code').inputValue(), 'keep existing code');
      await page.locator('#key-open').click();
      const fileEvent = page.waitForEvent('filechooser');
      await page.locator('#import-file').click();
      await (await fileEvent).setFiles({ name: 'sample.js', mimeType: 'text/javascript', buffer: Buffer.from('const fromFile = 7;') });
      await page.waitForFunction(() => document.querySelector('#code').value === 'const fromFile = 7;');
      await page.waitForFunction(() => !document.querySelector('#toast').classList.contains('show'));
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
      console.log(`PASS ${native ? 'native bridge' : 'PWA'}: gallery, vision payload, undo, no code, HTTP failure, invalid image, themes, reduced motion`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
