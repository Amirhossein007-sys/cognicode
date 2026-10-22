const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),entry=process.env.COGNI_ENTRY||path.join(root,'index.html');
const output=process.env.COGNI_OUTPUT||path.join(root,'artifacts/marquee-validation');
fs.mkdirSync(output,{recursive:true});
const HISTORY='cognicode.marquee.history.v1';
const waitReady=page=>page.waitForFunction(()=>document.querySelector('.gm-track').getAnimations().some(a=>a.playState==='running'));
const position=page=>page.locator('.gm-track').evaluate(el=>new DOMMatrixReadOnly(getComputedStyle(el).transform).m41);
(async()=>{
 const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true});
 const results=[];
 try{for(const width of [320,393,1280])for(const theme of ['dark','light']){
  const page=await browser.newPage({viewport:{width,height:852},isMobile:width<600,hasTouch:width<600});
  const errors=[],api=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/https?:.*(?:openai|generativelanguage|gapgpt)/.test(r.url()))api.push(r.url());});
  await page.addInitScript(android=>{if(android)window.AndroidBridge={};},entry.replaceAll('\\','/').includes('/assets/web/'));
  await page.goto(pathToFileURL(entry).href);await page.locator('#launch-splash').waitFor({state:'hidden'});await waitReady(page);
  await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
  const speed=await page.locator('.gm-track').evaluate(async track=>{
   const read=()=>new DOMMatrixReadOnly(getComputedStyle(track).transform).m41;
   const sample=()=>new Promise(resolve=>requestAnimationFrame(()=>resolve({time:document.timeline.currentTime,x:read()})));
   const before=await sample();await new Promise(resolve=>setTimeout(resolve,400));const after=await sample();
   return (after.x-before.x)/((after.time-before.time)/1000);
  });
  assert.ok(Math.abs(speed-32)<5,'constant readable speed, got '+speed);
  const seams=await page.locator('.gm-track').evaluate(async track=>{
   const errors=[];
   for(let i=0;i<8;i++){
    const a=track.getAnimations()[0],duration=a.effect.getTiming().duration;
    a.pause();a.currentTime=duration-.01;
    const second=track.children[1],before=second.getBoundingClientRect().right;
    await new Promise(resolve=>{a.addEventListener('finish',resolve,{once:true});a.finish();});
    errors.push(Math.abs(second.getBoundingClientRect().right-before));
    const viewport=track.parentElement.getBoundingClientRect(),strip=track.getBoundingClientRect();
    if(strip.left>viewport.left+1||strip.right<viewport.right-1)throw Error('Empty strip gap');
   }
   return errors;
  });
  assert.ok(Math.max(...seams)<1,'seam position must not jump: '+seams);
  if(width===393&&theme==='dark'){
   // A fresh cycle contains all 12 daypart messages plus 96 general messages.
   const context=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
   const fresh=await context.newPage();await fresh.goto(pathToFileURL(entry).href);await fresh.locator('#launch-splash').waitFor({state:'hidden'});await waitReady(fresh);
   const unique=await fresh.locator('.gm-track').evaluate(async track=>{
    const messages=[];
    for(let i=0;i<108;i++){
     messages.push(track.firstElementChild.textContent);
     const a=track.getAnimations()[0];await new Promise(resolve=>{a.addEventListener('finish',resolve,{once:true});a.finish();});
    }
    return {count:messages.length,unique:new Set(messages).size};
   });
   assert.equal(unique.unique,108,'no repetition before the full message pool is shown');
   const history=await fresh.evaluate(key=>JSON.parse(localStorage.getItem(key)),HISTORY);
   await fresh.reload();await waitReady(fresh);
   const first=await fresh.locator('.gm-item').first().getAttribute('data-message-id');
   assert.ok(!history.seen.includes(first),'reload must not immediately repeat a seen message');
   await context.close();
   // Mobile taps must not leave a sticky hover/focus pause.
   await page.locator('.gm-badge').tap();await waitReady(page);
   await page.evaluate(()=>window.dispatchEvent(new CustomEvent('cognicode:editor-scrolling',{detail:true})));
   assert.equal(await page.locator('.gm-track').evaluate(el=>el.getAnimations()[0].playState),'paused');
   const paused=await position(page);await page.waitForTimeout(180);assert.ok(Math.abs(await position(page)-paused)<.1,'editor pause preserves position');
   await page.evaluate(()=>window.dispatchEvent(new CustomEvent('cognicode:editor-scrolling',{detail:false})));await waitReady(page);
   await page.evaluate(()=>window.dispatchEvent(new CustomEvent('cognicode:native-active',{detail:false})));
   assert.equal(await page.locator('.gm-track').evaluate(el=>el.getAnimations()[0].playState),'paused');
   await page.evaluate(()=>window.dispatchEvent(new CustomEvent('cognicode:native-active',{detail:true})));await waitReady(page);
   await page.evaluate(()=>window.dispatchEvent(new CustomEvent('cognicode:editor-scrolling',{detail:true})));
   const badgeAnchor=await page.locator('.gm-item').first().evaluate(el=>el.getBoundingClientRect().right);
   await page.locator('.dp-pill-btn[data-slot="morning"]').click();assert.match(await page.locator('.gm-badge-text').textContent(),/صبح/);
   const oldFirst=await page.locator('.gm-item').first().textContent();
   await page.locator('.dp-pill-btn[data-slot="night"]').click();assert.match(await page.locator('.gm-badge-text').textContent(),/شب/);
   assert.equal(await page.locator('.gm-item').first().textContent(),oldFirst,'daypart changes leave currently visible words intact');
   assert.ok(Math.abs(await page.locator('.gm-item').first().evaluate(el=>el.getBoundingClientRect().right)-badgeAnchor)<1,'daypart badge changes must not shift the visible sentence');
   await page.evaluate(()=>window.dispatchEvent(new CustomEvent('cognicode:editor-scrolling',{detail:false})));await waitReady(page);
   await page.locator('#dp-live-btn').click();
   await page.locator('.gm-track').evaluate(track=>{const a=track.getAnimations()[0];a.pause();a.currentTime=a.effect.getTiming().duration*.4;});
   const before=await position(page);await page.setViewportSize({width:440,height:852});await page.waitForTimeout(150);
   assert.ok(await position(page)>before-2,'resize must preserve current position');
   await page.setViewportSize({width:393,height:852});await waitReady(page);
   results.push({unique});
  }
  if(width===1280){
   await page.locator('#status-marquee').hover();
   assert.equal(await page.locator('.gm-track').evaluate(el=>el.getAnimations()[0].playState),'paused','desktop hover pauses');
   await page.mouse.move(0,0);await waitReady(page);
   await page.locator('#status-marquee').focus();
   assert.equal(await page.locator('.gm-track').evaluate(el=>el.getAnimations()[0].playState),'paused','keyboard focus pauses');
   await page.locator('#status-marquee').evaluate(el=>el.blur());await waitReady(page);
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>document.querySelector('#status-marquee').classList.contains('gm-static')&&document.querySelector('.gm-track').getAnimations().length===0);
  assert.equal(await page.locator('.gm-track').evaluate(el=>el.getAnimations().length),0,'Reduce Motion must have no moving animation');
  const staticText=await page.locator('.gm-item').first().textContent();assert.ok(staticText.trim().length>20);
  const fit=await page.locator('.gm-item').first().evaluate(el=>({width:el.scrollWidth,available:el.clientWidth}));
  assert.ok(fit.width<=fit.available+1,'static message must wrap instead of clipping');
  await page.emulateMedia({reducedMotion:'no-preference'});await waitReady(page);
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('cognicode:energy-change',{detail:{lowPower:true}})));
  assert.equal(await page.locator('.gm-track').evaluate(el=>el.getAnimations().length),0,'low power uses static messages');
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('cognicode:energy-change',{detail:{lowPower:false,thermal:0}})));await waitReady(page);
  const bounded=await page.locator('.gm-track').evaluate(el=>({items:el.children.length,elements:el.querySelectorAll('*').length}));assert.ok(bounded.items<=10&&bounded.elements<=20);
  if(width===393)await page.screenshot({path:path.join(output,`marquee-${theme}.png`)});
  assert.deepEqual(errors,[]);assert.deepEqual(api,[],'marquee must never call an AI API');
  results.push({width,theme,speed,seamMax:Math.max(...seams),bounded});await page.close();
 }
 // The component keeps working with unavailable or corrupt history storage.
 for(const broken of ['corrupt','unavailable']){
  const page=await browser.newPage({viewport:{width:393,height:852}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({key,broken})=>{
   if(broken==='corrupt')localStorage.setItem(key,'{broken');
   else{for(const name of ['getItem','setItem']){const original=Storage.prototype[name];Storage.prototype[name]=function(k,...args){if(k===key)throw new Error('Storage unavailable');return original.call(this,k,...args);};}}
  },{key:HISTORY,broken});
  await page.goto(pathToFileURL(entry).href);await waitReady(page);assert.deepEqual(errors,[]);await page.close();
 }
 }finally{await browser.close();}
 fs.writeFileSync(path.join(output,'marquee-validation.json'),JSON.stringify(results,null,2));
 console.log('PASS marquee: stable speed; seamless recycling; 108 distinct messages per cycle; persistent history; phone/desktop; light/dark; resize; dayparts; hover/focus; mobile taps; editor/native pauses; reduced motion; bounded DOM; optional storage; zero API calls.');
})().catch(e=>{console.error(e);process.exitCode=1;});
