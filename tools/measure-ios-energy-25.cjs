// CPU proxy for WebKit's UI workload; this is not a battery/temperature measurement.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/build-25-validation');fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true}),runs=[];try{
for(const [label,file]of [['before',path.join(root,'artifacts/build-25-baseline/native/Web/index.html')],['after',path.join(root,'native/Web/index.html')]]){
const page=await browser.newPage({viewport:{width:393,height:852},deviceScaleFactor:3,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'});
await page.addInitScript(()=>{window.__rainFrames=0;const clear=CanvasRenderingContext2D.prototype.clearRect;CanvasRenderingContext2D.prototype.clearRect=function(...args){if(this.canvas.classList.contains('dr-main'))window.__rainFrames++;return clear.apply(this,args);};});
const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await cdp.send('Performance.enable');
await page.goto(pathToFileURL(file).href);await page.locator('#launch-splash').waitFor({state:'hidden'});await page.waitForTimeout(4500);
const start=(await cdp.send('Performance.getMetrics')).metrics,frames=await page.evaluate(()=>window.__rainFrames);await page.waitForTimeout(8000);const end=(await cdp.send('Performance.getMetrics')).metrics;
const delta=name=>+(1000*(end.find(m=>m.name===name).value-start.find(m=>m.name===name).value)).toFixed(2);
runs.push({label,idleDurationMs:8000,scriptMs:delta('ScriptDuration'),taskMs:delta('TaskDuration'),layoutMs:delta('LayoutDuration'),frames:await page.evaluate(()=>window.__rainFrames)-frames,canvas:await page.locator('.dr-main').evaluate(canvas=>({width:canvas.width,height:canvas.height}))});await page.close();}
}finally{await browser.close();}fs.writeFileSync(path.join(out,'energy-proxy.json'),JSON.stringify({cpuSlowdown:4,runs},null,2)+'\n');console.log(JSON.stringify(runs));})().catch(error=>{console.error(String(error.stack||error).slice(0,1600));process.exitCode=1;});
