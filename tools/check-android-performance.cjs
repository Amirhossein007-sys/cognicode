// Exercise the actual file: Android bundle, local worker, scroll and failure path.
const {chromium}=require('playwright'),{pathToFileURL}=require('node:url');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const androidRoot=process.env.COGNI_ANDROID_ROOT||path.resolve(__dirname,'../../cognicode-apk');
const sample='/* comment\ncontinued < & > */\n'+Array.from({length:900},(_,i)=>`const row${i} = { text: "<Cogni & code>", value: ${i} };`).join('\n');
(async()=>{
 assert.match(fs.readFileSync(path.join(androidRoot,'app/build.gradle'),'utf8'),/minSdk 30\b/);
 const bundle=path.join(androidRoot,'app/src/main/assets/web');
 for(const file of ['styles.css','workspace.css','dial-clock.css','app.js','syntax.js','orbital-clock.js','data-rain.js','data-rain.css','launch.js']) {
  assert.ok(fs.readFileSync(path.join(bundle,file)).equals(fs.readFileSync(path.resolve(__dirname,'..',file))),'Stale Android asset: '+file);
 }
 const index=fs.readFileSync(path.join(bundle,'index.html'),'utf8');
 assert.ok(index.indexOf('src="android-bridge.js"')<index.indexOf('src="launch.js"'),'Native hooks must initialize before app scripts');
 const browser=await chromium.launch({headless:true});
 try {
  for(const failWorker of [false,true]) {
   const page=await browser.newPage({viewport:{width:393,height:852},userAgent:'Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36'});
   const errors=[],violations=[];page.on('pageerror',error=>errors.push(error.message));
   await page.addInitScript(()=>{window.AndroidBridge={};window.__violations=[];document.addEventListener('securitypolicyviolation',event=>window.__violations.push(event.violatedDirective));});
   await page.goto(pathToFileURL(path.join(bundle,'index.html')).href);await page.locator('#launch-splash').waitFor({state:'hidden'});
   await page.evaluate(fail=>{
    const highlight=Syntax.highlight;window.__mainHighlights=0;window.__highlightSizes=[];
    Syntax.highlight=function(...args){if(args[0].length>=4000)window.__mainHighlights++;window.__highlightSizes.push(args[0].length);return highlight.apply(this,args);};
    if(fail)Syntax.createWorker=function(){throw new Error('Forced worker unavailability');};
   },failWorker);
   await page.locator('#code').fill(sample);
   await page.waitForFunction(()=>document.querySelector('#hl-code').dataset.highlightState==='ready'&&document.querySelector('#hl-code .tk-c-kw'));
   await page.locator('#code').evaluate(ta=>{ta.scrollTop=0;ta.dispatchEvent(new Event('scroll'));});
   assert.equal(await page.locator('#hl-code').textContent(),sample+'\n');
   assert.match(await page.locator('#hl-code .tk-c-com').allTextContents().then(parts=>parts.join(' ')),/continued < & >/);
   assert.equal(await page.evaluate(()=>window.__mainHighlights>0),failWorker,JSON.stringify(await page.evaluate(()=>window.__highlightSizes)));
   const medium=sample.split('\n').slice(0,130).join('\n');
   assert.ok(medium.length>=4000&&medium.length<20000);
   await page.locator('#code').fill(medium);
   await page.waitForFunction(()=>document.querySelector('#hl-code').dataset.highlightState==='ready'&&document.querySelector('#hl-code').textContent===document.querySelector('#code').value+'\n');
   assert.equal(await page.evaluate(()=>window.__mainHighlights>0),failWorker,'Medium sources also use the local worker');
   await page.locator('#code').fill(sample);
   await page.waitForFunction(()=>document.querySelector('#hl-code').dataset.highlightState==='ready'&&document.querySelector('#hl-code').textContent===document.querySelector('#code').value+'\n');
   for(const scroll of [0,1200,7200,16000]) {
    await page.locator('#code').evaluate((ta,scroll)=>{ta.scrollTop=scroll;ta.dispatchEvent(new Event('scroll'));},scroll);
    const state=await page.evaluate(()=>({code:document.querySelector('#hl-code').textContent,spans:document.querySelectorAll('#hl-code span').length,scroll:document.querySelector('#code').scrollTop,highlightScroll:document.querySelector('#highlight').scrollTop,gutterScroll:document.querySelector('#gutter').scrollTop}));
    assert.equal(state.code,sample+'\n');assert.equal(state.scroll,state.highlightScroll);assert.equal(state.scroll,state.gutterScroll);
    assert.ok(state.spans<900,'Only the viewport token DOM should be mounted: '+state.spans);
   }
   // A response for a previous edit must never overwrite current text/language.
   for(let edit=0;edit<3;edit++){await page.locator('#code').fill(sample+'\n// newest '+edit);await page.waitForTimeout(90);}
   await page.waitForFunction(()=>document.querySelector('#hl-code').dataset.highlightState==='ready'&&document.querySelector('#hl-code').textContent===document.querySelector('#code').value+'\n');
   await page.waitForTimeout(1000);
   await page.locator('#code').fill('const small = 1;');
   await page.waitForFunction(()=>document.querySelector('#hl-code').textContent==='const small = 1;\n');
   await page.locator('#key-undo').click();
   assert.ok((await page.locator('#code').inputValue()).includes('// newest 2'),'Undo retains the long source');
   for(const theme of ['dark','light']) {
    await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
    await page.waitForFunction(()=>getComputedStyle(document.querySelector('#editor')).backgroundColor===getComputedStyle(document.body).backgroundColor);
    const colors=await page.locator('#editor').evaluate(el=>({editor:getComputedStyle(el).backgroundColor,page:getComputedStyle(document.body).backgroundColor,blur:getComputedStyle(el).backdropFilter}));
    assert.equal(colors.editor,colors.page);assert.equal(colors.blur,'none');
    if(!failWorker){await page.locator('#code').fill('');await page.screenshot({path:path.resolve(__dirname,'../artifacts/build-23-validation/dial-android-'+theme+'.png')});}
   }
   violations.push(...await page.evaluate(()=>window.__violations));assert.deepEqual(violations,[]);assert.deepEqual(errors,[]);
   console.log('PASS Android 11 bundle '+(failWorker?'worker fallback':'local worker')+': source identity, multiline tokens, viewport DOM, scroll, rapid edits, undo, themes and CSP');
   await page.close();
  }
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
