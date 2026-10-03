// Pipboy clock, fixed UTC+03:30/Persian date, header fit and readable themes.
const {chromium}=require('playwright'),{pathToFileURL}=require('node:url');
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const output=path.resolve(__dirname,'../artifacts/build-10-preview');fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||undefined});
 try {for(const source of ['index.html','native/Web/index.html']) {for(const zone of ['America/Los_Angeles','Asia/Tokyo']) {
  const page=await browser.newPage({viewport:{width:393,height:852},timezoneId:zone});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date('2026-10-03T12:00:00Z')});await page.clock.setFixedTime(new Date('2026-10-03T12:00:00Z'));
  await page.goto(pathToFileURL(path.resolve(__dirname,'..',source)).href);await page.locator('#launch-splash').waitFor({state:'hidden'});
  assert.equal(await page.locator('.pip-time').textContent(),'۱۵:۳۰');assert.equal(await page.locator('.pip-date').textContent(),'۱۴۰۵/۰۷/۱۱');
  assert.equal(await page.locator('.orbital-clock,.orbital-calendar,.orbital-date').count(),0,'Old clock/date must be removed');
  for(const width of [320,375,393,430,440,560]) {await page.setViewportSize({width,height:width===320?568:852});for(const theme of ['dark','light']) {
   await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);await page.evaluate(()=>document.fonts.ready);
   const state=await page.evaluate(()=>{
    const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
    const rgb=s=>s.startsWith('#')?s.slice(1).match(/../g).map(n=>parseInt(n,16)):s.match(/[\d.]+/g).slice(0,3).map(Number);
    const lum=s=>rgb(s).map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;}).reduce((v,n,i)=>v+n*[.2126,.7152,.0722][i],0);
    const ratio=(a,b)=>{a=lum(a);b=lum(b);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);};
    const css=s=>getComputedStyle(document.querySelector(s));
    return {header:rect('.topbar'),clock:rect('.pipboy-clock'),screen:rect('.pip-crt-screen'),time:rect('.pip-time'),date:rect('.pip-date'),brand:rect('.brand'),actions:rect('.top-actions'),buttons:[...document.querySelectorAll('.top-actions button')].map(b=>{const r=b.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width};}),wave:rect('.brain-marquee'),editor:rect('.editor'),bottom:rect('.bottom'),scroll:document.documentElement.scrollWidth,
      contrast:[ratio(css('.pip-time').color,css('.pip-terminal-block').backgroundColor),ratio(css('.pip-date').color,css('.pip-crt-screen').backgroundColor),ratio(css('.pip-top-bar').color,css('.pip-crt-screen').backgroundColor)]};
   });
   assert.ok(state.scroll<=width);assert.ok(state.clock.left>=0&&state.clock.right<=width);assert.ok(state.time.left>=state.screen.left&&state.time.right<=state.screen.right);assert.ok(state.date.left>=state.screen.left&&state.date.right<=state.screen.right);
   assert.ok(state.buttons.every(b=>b.width>=44&&b.left>=0&&b.right<=width));assert.ok(state.brand.left>=state.actions.right);
   assert.ok(state.wave.top>=state.header.bottom&&state.wave.bottom<=state.editor.top);assert.ok(state.editor.height>100&&state.bottom.bottom<=page.viewportSize().height+1,JSON.stringify(state));
   assert.ok(state.contrast.every(n=>n>=4.5),'Insufficient contrast: '+state.contrast.join(','));
   if(source==='index.html'&&zone==='America/Los_Angeles'&&width===393)await page.screenshot({path:path.join(output,'clock-'+theme+'.png')});
  }}
  // At Tehran midnight the minute and Persian year/date change together.
  await page.clock.setSystemTime(new Date('2026-03-20T20:29:59Z'));await page.evaluate(()=>window.dispatchEvent(new Event('pageshow')));
  assert.equal(await page.locator('.pip-time').textContent(),'۲۳:۵۹');assert.equal(await page.locator('.pip-date').textContent(),'۱۴۰۴/۱۲/۲۹');
  await page.clock.runFor(1000);assert.equal(await page.locator('.pip-time').textContent(),'۰۰:۰۰');assert.equal(await page.locator('.pip-date').textContent(),'۱۴۰۵/۰۱/۰۱');
  assert.match(await page.locator('#tehran-clock').getAttribute('aria-label'),/۱۴۰۵.*UTC\+۳:۳۰/);
  // App resume refreshes immediately even if background timers never fired.
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
  await page.clock.setSystemTime(new Date('2026-10-03T20:31:00Z'));await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  assert.equal(await page.locator('.pip-time').textContent(),'۰۰:۰۱');assert.equal(await page.locator('.pip-date').textContent(),'۱۴۰۵/۰۷/۱۲');
  await page.emulateMedia({reducedMotion:'reduce'});for(const selector of ['.pip-hazard','.pip-colon','.pip-screen-glass'])assert.equal(await page.locator(selector).evaluate(el=>getComputedStyle(el,el.classList.contains('pip-screen-glass')?'::after':null).animationName),'none');
  assert.deepEqual(errors,[]);await page.close();console.log('PASS '+source+' '+zone+': 6 widths/both themes/contrast, Tehran +03:30, Persian year rollover, resume and reduced motion');
 }} }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
