// Radio clock: both browser engines, calendar rollover, motion, contrast and fit.
const {chromium,webkit}=require('playwright'),{pathToFileURL}=require('node:url');
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const output=path.resolve(__dirname,'../artifacts/build-24-validation');fs.mkdirSync(output,{recursive:true});
(async()=>{
 for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]) {
  const browser=await engine.launch({headless:true,...(name==='chromium'&&process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
  try {
   for(const source of ['index.html','native/Web/index.html']) for(const zone of ['America/Los_Angeles','Asia/Tokyo']) {
    const page=await browser.newPage({viewport:{width:393,height:852},timezoneId:zone});const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.clock.install({time:new Date('2026-10-12T12:00:00Z')});await page.clock.setFixedTime(new Date('2026-10-12T12:00:00Z'));
    await page.goto(pathToFileURL(path.resolve(__dirname,'..',source)).href);await page.locator('#launch-splash').waitFor({state:'hidden'});
    assert.equal(await page.locator('.dial-time').textContent(),'15:30:00');
    assert.match(await page.locator('.dial-date').textContent(),/۲۰.*مهر.*۱۴۰۵/);
    assert.equal(await page.locator('.dial-brand').textContent(),'Cogni');
    assert.equal(await page.locator('.radio-clock,#matrix-background,.pipboy-clock,.orbital-clock,.pip-date').count(),0);
    assert.equal(await page.locator('.dial-spike').count(),120);
    assert.equal(await page.locator('.dial-face .dial-date').count(),0);
    for(const width of [320,375,393,430,440,560,640]) for(const theme of ['dark','light']) {
     await page.setViewportSize({width,height:width===320?568:852});
     await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
     await page.evaluate(()=>document.fonts.ready);
     const state=await page.evaluate(()=>{
      const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
      const css=s=>getComputedStyle(document.querySelector(s));
      const lum=s=>s.match(/[\d.]+/g).slice(0,3).map(Number).map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;}).reduce((v,n,i)=>v+n*[.2126,.7152,.0722][i],0);
      const ratio=(a,b)=>{a=lum(a);b=lum(b);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);};
      return {header:rect('.topbar'),clock:rect('.dial-clock'),body:rect('.dial-face'),date:rect('.dial-date'),brand:rect('.brand'),actions:rect('.top-actions'),wave:rect('.brain-marquee'),editor:rect('.editor'),bottom:rect('.bottom'),scroll:document.documentElement.scrollWidth,
       buttons:[...document.querySelectorAll('.top-actions button')].map(b=>b.getBoundingClientRect().width),
       contrast:[...['.dial-hour','.dial-minute','.dial-brand','.dial-seconds','.dial-minutes'].map(s=>ratio(css(s).color,css('.dial-face').backgroundColor)),ratio(css('.dial-date').color,css('body').backgroundColor)],
       dateBox:{background:css('.dial-date').backgroundColor,border:css('.dial-date').borderWidth},textTransform:css('.dial-brand').textTransform};
     });
     assert.ok(state.scroll<=width,JSON.stringify(state));
     assert.ok(state.clock.left>=0&&state.clock.right<=width);
     assert.ok(state.date.top>=state.body.bottom+6,'Date must clear the dial foot');
     assert.ok(state.date.bottom<=state.clock.bottom+1);
     assert.ok(state.brand.left>=state.actions.right);
     assert.ok(state.buttons.every(width=>width>=43.99),JSON.stringify(state));
     assert.ok(state.wave.top>=state.header.bottom&&state.wave.bottom<=state.editor.top);
     assert.ok(state.editor.height>100&&state.bottom.bottom<=page.viewportSize().height+1,JSON.stringify(state));
     assert.ok(state.contrast.every(value=>value>=4.5),'Contrast: '+state.contrast.join(','));
     assert.equal(state.dateBox.background,'rgba(0, 0, 0, 0)');assert.equal(state.dateBox.border,'0px');assert.equal(state.textTransform,'none');
     if(source==='index.html'&&zone==='America/Los_Angeles'&&width===393) await page.screenshot({path:path.join(output,'dial-'+name+'-'+theme+'.png')});
    }
    await page.setViewportSize({width:740,height:360});
    const landscape=await page.locator('#editor').boundingBox();assert.ok(landscape.height>=64);
    await page.clock.setSystemTime(new Date('2026-03-20T20:29:59Z'));await page.evaluate(()=>window.dispatchEvent(new Event('pageshow')));
    assert.equal(await page.locator('.dial-time').textContent(),'23:59:59');assert.match(await page.locator('.dial-date').textContent(),/۲۹.*اسفند.*۱۴۰۴/);
    await page.clock.runFor(1000);
    assert.equal(await page.locator('.dial-time').textContent(),'00:00:00');assert.match(await page.locator('.dial-date').textContent(),/۱.*فروردین.*۱۴۰۵/);
    assert.equal(await page.locator('.dial-hour').textContent(),'00');assert.equal(await page.locator('.dial-minute').textContent(),'00');
    assert.equal(await page.locator('.dial-seconds').evaluate(el=>el.style.getPropertyValue('--dial-angle')),'360deg');
    await page.evaluate(()=>window.dispatchEvent(new CustomEvent('cognicode:native-active',{detail:false})));
    const frozen=await page.locator('.dial-time').textContent();await page.clock.runFor(60000);assert.equal(await page.locator('.dial-time').textContent(),frozen);
    await page.clock.setSystemTime(new Date('2026-10-12T20:31:00Z'));await page.evaluate(()=>window.dispatchEvent(new CustomEvent('cognicode:native-active',{detail:true})));
    assert.equal(await page.locator('.dial-time').textContent(),'00:01:00');assert.match(await page.locator('.dial-date').textContent(),/۲۱.*مهر.*۱۴۰۵/);
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await page.locator('.dial-seconds').evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
    assert.deepEqual(errors,[]);await page.close();console.log('PASS '+name+' '+source+' '+zone+': clock, themes/contrast, 7 widths/landscape, rollover, resume and reduced motion');
   }
  }finally{await browser.close();}
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
