const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || undefined });
  try {
    for (const source of ['index.html', 'native/Web/index.html']) {
      const page = await browser.newPage({ viewport: { width: 393, height: 852 } });
      await page.goto(pathToFileURL(path.resolve(__dirname, '..', source)).href);
      await page.locator('#launch-splash').waitFor({ state: 'hidden' });
      await page.evaluate(() => {
        const probe = document.createElement('div');
        probe.innerHTML = '<span id="font-regular" style="font:400 16px var(--fa)">پژوهشگر گچ‌کار کیک ۱۲۳۴۵۶۷۸۹۰ کُد</span><span id="font-bold" style="font:700 16px var(--fa)">تحلیل فارسی</span><span id="font-code" style="font:400 16px var(--mono)">توضیح فارسی</span><span id="font-latin" style="font:400 16px var(--mono)">const code = 123;</span>';
        document.body.append(probe);
        for (const id of ['regular', 'bold', 'code', 'latin']) {
          document.getElementById('font-' + id).style.font = `${id === 'bold' ? 700 : 400} 16px var(--${id === 'code' || id === 'latin' ? 'mono' : 'fa'})`;
        }
      });
      await page.evaluate(() => document.fonts.ready);
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('DOM.enable');
      await cdp.send('CSS.enable');
      const { root } = await cdp.send('DOM.getDocument');
      for (const id of ['regular', 'bold', 'code', 'latin']) {
        const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#font-' + id });
        const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
        if (id === 'latin') assert.ok(fonts.every(f => !f.familyName.includes('Yekan')), 'Latin code changed font: ' + JSON.stringify(fonts));
        else assert.ok(fonts.length && fonts.every(f => f.isCustomFont && f.familyName === 'Yekan Bakh'), `${source} ${id}: ${JSON.stringify(fonts)}`);
      }
      console.log('PASS ' + source + ': Persian glyphs use bundled Yekan Bakh (regular, bold, code); Latin code retains monospace');
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
