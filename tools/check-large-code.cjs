// Real mobile file: bundles, full 30,000-line import and chunked AI fixtures.
const { chromium, webkit } = require('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const sample = '/* comment\nمتن فارسی در کامنت */\n' + Array.from({length:29998},(_,i)=>`const row${i} = { value: ${i}, text: "Cogni" };`).join('\n') + '\n';
// Keep exactly 30,000 physical lines while breaking the final one.
const finalError = sample.trimEnd().split('\n').slice(0,-1).join('\n') + '\nconst last = (;\n';
const sources = [['web',path.join(root,'index.html')],['ios',path.join(root,'native/Web/index.html')]];
const android = path.join(root,'../cognicode-apk/app/src/main/assets/web/index.html');
if(fs.existsSync(android))sources.push(['android',android]);
const output=path.join(root,'artifacts/build-'+JSON.parse(fs.readFileSync(path.join(root,'release.json'),'utf8')).build+'-validation');fs.mkdirSync(output,{recursive:true});
(async()=>{
 const measurements=[];
 for(const [engineName,engine] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await engine.launch({headless:true,...(engine===chromium?{channel:process.env.BROWSER_CHANNEL||undefined}:{})});
  try{for(const [platform,file] of sources){
   if(process.env.LARGE_TEST_FILTER&&!`${engineName} ${platform}`.includes(process.env.LARGE_TEST_FILTER))continue;
   const page=await browser.newPage({viewport:{width:393,height:852},reducedMotion:'reduce'}),errors=[],requests=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.addInitScript(platform=>{
    localStorage.clear();if(platform==='android')window.AndroidBridge={};
    localStorage.setItem('cognicode.settings.v1',JSON.stringify({key:'fixture',base:'https://large.fixture.invalid/v1',model:'gpt-4o-mini',hist:false}));
    window.__violations=[];document.addEventListener('securitypolicyviolation',e=>window.__violations.push(e.violatedDirective));
   },platform);
   let inflight=0,maxInflight=0,failChunk=false;
   async function respond(body){
    inflight++;maxInflight=Math.max(maxInflight,inflight);
    assert.ok(!body.messages[0].content.includes('اصلاح‌گر کد دقیق'),'No unsolicited fix');
    requests.push(body.messages[1].content);
    await new Promise(resolve=>setTimeout(resolve,15));inflight--;
    if(failChunk){failChunk=false;return {ok:false,status:429,text:'{"error":{"message":"fixture rate limit"}}'};}
    return {ok:true,status:200,text:JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({valid:true,errors:[],explanation:{summary:'بررسی این بخش',steps:[],uses:[],notes:[]}})}}]})};
   }
   if(platform!=='web'){
    await page.exposeFunction('largeFixture',respond);
    await page.addInitScript(platform=>{
     async function reply(m){const r=await window.largeFixture(JSON.parse(m.body));window.__nativeAI(m.id,r.ok,r.status,r.text);}
     if(platform==='android')window.AndroidBridge.aiBridge=json=>reply(JSON.parse(json));
     else window.webkit={messageHandlers:{aiBridge:{postMessage:reply},dynamicIslandBridge:{postMessage(){}},themeBridge:{postMessage(){}}}};
    },platform);
   }else await page.route('https://large.fixture.invalid/**',async route=>{const r=await respond(route.request().postDataJSON());await route.fulfill({status:r.status,contentType:'application/json',body:r.text});});
   await page.goto(pathToFileURL(file).href);await page.locator('#launch-splash').waitFor({state:'hidden'});await page.evaluate(()=>WorkspaceStore.ready);
   const started=Date.now();
   await page.locator('#file-input').setInputFiles({name:'large.js',mimeType:'text/javascript',buffer:Buffer.from(sample)});
   await page.waitForFunction(code=>document.querySelector('#code').value===code,sample);
   await page.waitForFunction(()=>document.querySelector('#hl-code').dataset.highlightState==='ready',null,{timeout:30000});
   assert.equal(await page.locator('#code').inputValue(),sample);
   const visible=await page.locator('#hl-code').evaluate(el=>({text:el.textContent,start:+el.dataset.lineStart,end:+el.dataset.lineEnd}));
   assert.equal(visible.text,sample.split('\n').slice(visible.start,visible.end).join('\n')+'\n');
   assert.equal(requests.length,0,'Import must not analyse automatically');
   const importAndHighlightMs=Date.now()-started;
   for(const top of [0,375000,750000]){
    await page.locator('#code').evaluate((ta,top)=>{ta.scrollTop=top;ta.dispatchEvent(new Event('scroll'));},top);
    const state=await page.evaluate(()=>({spans:document.querySelectorAll('#hl-code span').length,ta:document.querySelector('#code').scrollTop,hl:document.querySelector('#highlight').scrollTop,gutter:document.querySelector('#gutter').scrollTop}));
    assert.ok(state.spans<1000,'Viewport-only token DOM: '+state.spans);assert.equal(state.ta,state.hl);assert.equal(state.ta,state.gutter);
   }
   await page.locator('#file-input').setInputFiles({name:'too-many.js',mimeType:'text/javascript',buffer:Buffer.from(sample+'const over = 1;\n')});
   await page.waitForFunction(()=>document.querySelector('.toast').textContent.includes('۳۰٬۰۰۰'));assert.equal(await page.locator('#code').inputValue(),sample);
   // Disable main-thread parsing: a pass proves the native Blob worker is used.
   await page.evaluate(()=>{ReviewEngine.local=()=>{throw Error('Main-thread parser must not run');};});
   const scanned=await page.evaluate(async({sample,finalError})=>{
    let beats=0;const timer=setInterval(()=>beats++,10),start=performance.now();
    const good=await ReviewService.local(sample,'javascript'),ms=performance.now()-start;
    const bad=await ReviewService.local(finalError,'javascript');clearInterval(timer);
    const controller=new AbortController(),cancelled=ReviewService.local(sample.replace('value: 0','value: 9'),'javascript',{signal:controller.signal});controller.abort();
    let abortName;try{await cancelled;}catch(error){abortName=error.name;}
    return {good:good.errors.length,lines:good.coverage.checkedLines,bad:bad.errors.map(e=>e.line),ms,beats,abortName};
   },{sample,finalError});
   assert.equal(scanned.good,0);assert.equal(scanned.lines,30000);assert.deepEqual(scanned.bad,[30000]);assert.ok(scanned.beats>=2,'UI timer should progress during review');assert.equal(scanned.abortName,'AbortError');
   console.log(`SCAN ${engineName} ${platform}: ${Math.round(scanned.ms)}ms, 30,000 lines, final-line error and cancellation`);
   await page.locator('#btn-play').click();await page.waitForFunction(()=>!document.querySelector('#btn-play').disabled,null,{timeout:90000});
   assert.match(await page.locator('#res-verdict').textContent(),/سالم/);
   const chunks=await page.evaluate(code=>ReviewEngine.aiChunks(code,'javascript').map(c=>c.text),sample);
   assert.equal(chunks.join('\n'),sample,'No source byte may be omitted by AI chunking');
   assert.equal(requests.length,chunks.length*5);for(const chunk of chunks)assert.ok(requests.some(request=>request.endsWith(chunk)),'Every chunk must reach the selected API transport');
   assert.ok(maxInflight<=2,'Bounded API concurrency');
   await page.locator('#res-close').click();
   // UTF-16 + CRLF preserve the full file, including its terminal newline.
   await page.locator('#file-input').setInputFiles({name:'large-utf16.js',mimeType:'text/plain',buffer:Buffer.concat([Buffer.from([255,254]),Buffer.from(sample.replace(/\n/g,'\r\n'),'utf16le')])});
   await page.waitForFunction(()=>document.querySelector('.toast').textContent.includes('large-utf16.js'));
   await page.waitForFunction(code=>document.querySelector('#code').value===code,sample);
   if(platform==='web'){
    failChunk=true;await page.locator('#code').evaluate((ta,code)=>{ta.value=code;ta.dispatchEvent(new Event('input',{bubbles:true}));},sample.replace('value: 0','value: 9'));
    await page.locator('#btn-play').click();await page.waitForFunction(()=>!document.querySelector('#btn-play').disabled,null,{timeout:90000});
    assert.match(await page.locator('#res-verdict').textContent(),/کامل تأیید نشد/,'A failed AI chunk must not produce a complete verdict');
   }
   assert.deepEqual(await page.evaluate(()=>window.__violations),[]);assert.deepEqual(errors,[]);
   measurements.push({engineName,platform,sourceBytes:Buffer.byteLength(sample),importAndHighlightMs,reviewMs:Math.round(scanned.ms),uiTimerTicks:scanned.beats,chunks:chunks.length,maxInflight});
   fs.writeFileSync(path.join(output,'large-code.json'),JSON.stringify(measurements,null,2)+'\n');
   console.log(`PASS ${engineName} ${platform}: 30,000 lines, UTF-8/16, exact source, final-line error, responsive native worker, cancel, viewport/scroll, all AI chunks and limit`);await page.close();
  }}finally{await browser.close();}
 }
 fs.writeFileSync(path.join(output,'large-code.json'),JSON.stringify(measurements,null,2)+'\n');
})().catch(error=>{console.error(String(error.stack||error).slice(0,1800));process.exitCode=1;});
