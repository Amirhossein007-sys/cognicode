// iOS launch storyboards cannot reliably load bundled custom fonts before app startup.
// Render the slogan with the same font as the web splash, keeping its accessibility label.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: 345, height: 32 }, deviceScaleFactor: 3 });
    const font = fs.readFileSync(path.resolve(__dirname, '../fonts/YekanBakh-Bold.ttf')).toString('base64');
    await page.setContent(`<style>@font-face{font-family:Yekan;src:url(data:font/ttf;base64,${font})}html,body{margin:0;background:transparent}body{width:345px;height:32px;display:flex;align-items:center;justify-content:center;color:#f8fafc;font:20px Yekan;direction:rtl}</style>با کوگنی، کُدت رو تحلیل کن`);
    await page.evaluate(() => document.fonts.ready);
    const folder = path.resolve(__dirname, '../native/CogniCode/Assets.xcassets/LaunchSlogan.imageset');
    fs.mkdirSync(folder, { recursive: true });
    await page.screenshot({ path: path.join(folder, 'slogan.png'), omitBackground: true });
    fs.writeFileSync(path.join(folder, 'Contents.json'), JSON.stringify({ images: [{ idiom: 'universal', filename: 'slogan.png', scale: '3x' }], info: { author: 'xcode', version: 1 } }, null, 2) + '\n');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
