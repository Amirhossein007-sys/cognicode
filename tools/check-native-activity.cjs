// Verify the actual Play flow with a WKWebView bridge double. This does not
// emulate ActivityKit or prove that iOS presents the system Dynamic Island.
const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || undefined });
  try {
    for (const scenario of ['native-success', 'native-error', 'native-exception', 'pwa']) {
      const native = scenario !== 'pwa';
      const page = await browser.newPage({ viewport: { width: 393, height: 852 } });
      await page.addInitScript(native => {
        window.activityMessages = [];
        if (native) window.webkit = { messageHandlers: {
          dynamicIslandBridge: { postMessage: message => window.activityMessages.push(message) }
        } };
      }, native);
      await page.goto(pathToFileURL(path.resolve(__dirname, native ? '../native/Web/index.html' : '../index.html')).href);
      if (scenario === 'native-error') {
        await page.evaluate(() => { Checker.staticCheck = () => [{ line: 1, column: 1, severity: 'error', message: 'Test error' }]; });
      }
      if (scenario === 'native-exception') {
        await page.evaluate(() => { Checker.localExplain = () => { throw new Error('Test analysis failure'); }; });
      }
      await page.locator('#code').fill('const answer = 42;');
      await page.locator('#btn-play').click();
      assert.equal(await page.evaluate(() => window.activityMessages.length), 0, 'No activity until analysis actually begins');
      await page.locator('#api-choice-offline').click();
      await page.waitForFunction(() => document.querySelector('#btn-play').disabled);
      if (native) {
        assert.equal(await page.locator('#analysis-activity').isVisible(), false, 'No simulated island in native');
        assert.equal(await page.evaluate(() => window.activityMessages[0].action), 'start');
      } else {
        assert.equal(await page.locator('#analysis-activity').isVisible(), true, 'PWA behavior preserved');
      }
      await page.waitForFunction(() => !document.querySelector('#btn-play').disabled);
      if (native) {
        const messages = await page.evaluate(() => window.activityMessages);
        assert.equal(messages.at(-1).action, 'stop');
        assert.equal(messages.at(-1).state, scenario === 'native-success' ? 'done' : 'error');
        assert.equal(await page.locator('#analysis-activity').isVisible(), false);
        await page.evaluate(() => window.__onNativeActivityStatus('disabled'));
        assert.match(await page.locator('#toast').textContent(), /Live Activities/);
      } else {
        assert.equal(await page.evaluate(() => window.activityMessages.length), 0);
      }
      console.log(`PASS ${scenario}: analysis lifecycle and correct presentation route`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
