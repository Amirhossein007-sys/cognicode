// Chromium with a 4x CPU slowdown is a repeatable proxy, not a device benchmark.
const {chromium} = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const {pathToFileURL} = require('node:url');
const root = path.resolve(__dirname, '..');
const source = path.resolve(process.argv[2]);
const label = process.argv[3] || 'after';
const output = path.join(root, 'artifacts/build-24-validation');
const sample = Array.from({length:900}, (_,i) => `const item${i} = {value: ${i}, name: "Cogni"};`).join('\n');
(async () => {
  fs.mkdirSync(output, {recursive:true});
  const browser = await chromium.launch({headless:true}), runs = [];
  try {
    for (let run=0; run<3; run++) {
      const page = await browser.newPage({viewport:{width:393,height:852}, userAgent:'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36'});
      await page.addInitScript(() => {
        window.AndroidBridge = {};
        window.__rainFrames = 0; window.__rainSegments = 0;
        for (const [method, counter] of [['clearRect','__rainFrames'],['lineTo','__rainSegments']]) {
          const original = CanvasRenderingContext2D.prototype[method];
          CanvasRenderingContext2D.prototype[method] = function(...args) {
            if (this.canvas.classList.contains('dr-main')) window[counter]++;
            return original.apply(this,args);
          };
        }
      });
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
      await cdp.send('Performance.enable');
      await page.goto(pathToFileURL(source).href);
      await page.locator('#launch-splash').waitFor({state:'hidden'});
      await page.evaluate(() => {
        document.documentElement.classList.add('screen-large','has-notch');
        window.__onNativeInsetsChange(32,24,0,0,0);
      });
      const measure = async action => {
        const start = (await cdp.send('Performance.getMetrics')).metrics;
        const rain = await page.evaluate(() => [window.__rainFrames,window.__rainSegments]);
        await action();
        const end = (await cdp.send('Performance.getMetrics')).metrics;
        const delta = name => +(1000*(end.find(m=>m.name===name).value-start.find(m=>m.name===name).value)).toFixed(2);
        const counts = await page.evaluate(() => [window.__rainFrames,window.__rainSegments]);
        return {scriptMs:delta('ScriptDuration'),layoutMs:delta('LayoutDuration'),taskMs:delta('TaskDuration'),rainFrames:counts[0]-rain[0],rainSegments:counts[1]-rain[1]};
      };
      const idle = await measure(() => page.waitForTimeout(4000));
      await page.locator('#code').fill(sample);
      await page.waitForFunction(() => document.querySelector('#hl-code').dataset.highlightState === 'ready');
      const editing = await measure(async () => {
        for (let edit=0; edit<12; edit++) {
          await page.evaluate(edit => {
            const code = document.querySelector('#code'); code.value += '\n// edit '+edit;
            code.setSelectionRange(code.value.length,code.value.length);
            code.dispatchEvent(new Event('input',{bubbles:true}));
          },edit);
          await page.waitForTimeout(150);
        }
        await page.waitForTimeout(800);
      });
      runs.push({idle,editing}); await page.close();
    }
  } finally { await browser.close(); }
  const result = {label,cpuSlowdown:4,idleDurationMs:4000,sampleLines:900,runs};
  fs.writeFileSync(path.join(output,'performance-'+label+'.json'), JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result));
})().catch(error => {console.error(error);process.exitCode=1;});
