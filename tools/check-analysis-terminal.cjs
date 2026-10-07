const {chromium}=require('playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const output=path.resolve(__dirname,'../artifacts/build-14-preview');fs.mkdirSync(output,{recursive:true});
const code='const answer = 41;\nconsole.log(answer);';
const report={language:'javascript',valid:false,errors:[],advice:'مقدار را بررسی کن.',fixExplanation:'مقدار نمونه اصلاح شد.',explanation:{summary:'کد نمونه',steps:['چاپ مقدار'],uses:['آزمون'],notes:[]}};
const response=content=>JSON.stringify({choices:[{message:{content:typeof content==='string'?content:JSON.stringify(content)},finish_reason:'stop'}]});
// Gate each HTTP phase independently, so a quick fixture cannot hide a premature dismissal.
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||undefined});
 try {for(const source of ['index.html','native/Web/index.html']) {for(const theme of ['dark','light']) {
  const page=await browser.newPage({viewport:{width:393,height:852}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(t=>{localStorage.setItem('cognicode.theme',t);localStorage.setItem('cognicode.settings.v1',JSON.stringify({base:'https://fixture.invalid/v1',key:'fixture',model:'fixture',hist:false}));},theme);
  const requests=[];
  await page.route('https://fixture.invalid/**',async route=>{
   const index=requests.length;let release;const gate=new Promise(r=>release=r);requests.push({release});await gate;
   try{await route.fulfill({contentType:'application/json',body:response(index===0?report:'const answer = 42;\nconsole.log(answer);')});}catch(_){}
  });
  await page.goto(pathToFileURL(path.resolve(__dirname,'..',source)).href);await page.locator('#launch-splash').waitFor({state:'hidden'});
  await page.locator('#code').fill(code);await page.waitForTimeout(350);
  // Keyboard focus must never switch to a fake sent/success state.
  await page.locator('#btn-play').focus();assert.equal(await page.locator('.play-label').innerText(),'تحلیل کد');
  assert.equal(await page.locator('#btn-play').getAttribute('disabled'),null);
  if(source==='index.html')await page.screenshot({path:path.join(output,'button-'+theme+'.png')});
  await page.locator('#btn-play').click();while(requests.length<1)await page.waitForTimeout(20);
  // New contract: a full-screen blurred overlay carries the terminal; the result
  // sheet with its header tools must NOT appear while the analysis is running.
  await page.locator('#analysis-overlay .terminal-loader').waitFor({state:'visible'});
  assert.equal(await page.locator('#sheet-result').getAttribute('class')||'','sheet','the result sheet stays closed during the analysis');
  assert.equal(await page.locator('#analysis-overlay button').count(),0,'the loading overlay must not contain any buttons');
  assert.equal(await page.locator('#operation-bar').isVisible(),false,'no operation bar above the overlay');
  const blur=await page.evaluate(()=>{const s=getComputedStyle(document.querySelector('#analysis-overlay'));return s.webkitBackdropFilter||s.backdropFilter;});
  assert.match(String(blur),/blur/,'the app page behind the overlay must be blurred');
  const contrast = await page.evaluate(() => {
   const rgb = value => value.startsWith('#') ? value.slice(1).match(/../g).map(n=>parseInt(n,16)) : value.match(/[\d.]+/g).map(Number).slice(0,3);
   const luminance = value => rgb(value).map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;}).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0);
   const ratio = (a,b) => {a=luminance(a);b=luminance(b);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);};
   const overlay=getComputedStyle(document.querySelector('#analysis-overlay')),terminal=getComputedStyle(document.querySelector('.analysis-overlay .terminal-loader')),header=getComputedStyle(document.querySelector('.analysis-overlay .terminal-header')),title=getComputedStyle(document.querySelector('.analysis-overlay .terminal-title')),status=getComputedStyle(document.querySelector('#analysis-status')),button=getComputedStyle(document.querySelector('#btn-play'));
   // Check text against both extremes under each translucent layer.
   const obg=overlay.backgroundColor.match(/[\d.]+/g).map(Number),oAlpha=obg[3]??1;
   const tbg=terminal.backgroundColor.match(/[\d.]+/g).map(Number),tAlpha=tbg[3]??1;
   const overlayExtremes=[0,255].map(base=>'rgb('+obg.slice(0,3).map(n=>Math.round(n*oAlpha+base*(1-oAlpha))).join(',')+')');
   const terminalRatios=[0,255].map(base=>ratio(terminal.color,'rgb('+tbg.slice(0,3).map(n=>n*tAlpha+base*(1-tAlpha)).join(',')+')'));
   return [...terminalRatios,
     ratio(title.color,header.backgroundColor),
     ...overlayExtremes.map(bg=>ratio(status.color,bg)),
     ratio(button.color,button.getPropertyValue('--analysis-neutral-1').trim()),
     ratio(button.color,button.getPropertyValue('--analysis-neutral-2').trim())];
  });
  assert.ok(contrast.every(r=>r>=4.5),'All labels need 4.5:1 contrast: '+contrast.join(','));
  assert.equal(await page.locator('.analysis-overlay .brain-loader,.analysis-overlay .sk').count(),0);
  assert.equal(await page.locator('.analysis-overlay .terminal-text').textContent(),'Loading...');
  assert.equal(await page.locator('#btn-play').isDisabled(),true);
  // Still visible after a full typing/deletion cycle with the request pending.
  await page.waitForTimeout(4300);assert.equal(await page.locator('#analysis-overlay').isVisible(),true);
  for(const width of [320,393,440]) {
   await page.setViewportSize({width,height:width===320?568:852});
   const geometry=await page.evaluate(()=>{const r=document.querySelector('.analysis-overlay .terminal-loader').getBoundingClientRect(),t=document.querySelector('.analysis-overlay .terminal-text').getBoundingClientRect();return {left:r.left,right:r.right,textLeft:t.left,textRight:t.right,width:innerWidth,scroll:document.documentElement.scrollWidth};});
   assert.ok(geometry.left>=0&&geometry.right<=width);assert.ok(geometry.textLeft>=geometry.left&&geometry.textRight<=geometry.right);assert.ok(geometry.scroll<=width);
  }
  await page.setViewportSize({width:393,height:852});
  if(source==='index.html'){await page.locator('.analysis-overlay .terminal-text').evaluate(el=>el.getAnimations().forEach(a=>{a.pause();a.currentTime=2000;}));await page.screenshot({path:path.join(output,'terminal-'+theme+'.png')});}
  requests[0].release();let fixWait=0; while(requests.length<2 && fixWait<300){ await page.waitForTimeout(20); fixWait++; }
  assert.equal(await page.locator('#analysis-overlay').isVisible(),true,'Loading must persist through the fix phase');
  assert.match(await page.locator('#res-status').evaluate(el => el.textContent),/اصلاح|پیشنهادی/);
  assert.match(await page.locator('#analysis-status').innerText(),/اصلاح|پیشنهادی/,'the overlay mirrors the fix phase');
  requests[1].release();await page.waitForFunction(()=>!document.querySelector('#btn-play').disabled);
  assert.equal(await page.locator('#analysis-overlay').isVisible(),false,'the overlay ends with the analysis');
  assert.match(await page.locator('#sheet-result').getAttribute('class'),/open/,'the completed report opens its own sheet');
  assert.equal(await page.locator('.play-label').innerText(),'تحلیل کد');
  assert.equal(await page.locator('#code').inputValue(),code,'Visual change must not apply the proposed fix');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#analysis-overlay').isVisible(),false);
  assert.deepEqual(errors,[]);await page.close();console.log('PASS '+source+' '+theme+': overlay-only loading, no buttons, blurred app, contrast, analysis/fix phases, sheet opens with the report, code preserved');
 }}
 // Offline analysis uses the same overlay, then opens the report sheet.
 const offline=await browser.newPage();await offline.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);await offline.locator('#launch-splash').waitFor({state:'hidden'});
 await offline.locator('#code').fill(code);await offline.locator('#btn-play').click();await offline.locator('#api-choice-offline').click();await offline.locator('#analysis-overlay').waitFor({state:'visible'});await offline.waitForFunction(()=>!document.querySelector('#btn-play').disabled);assert.equal(await offline.locator('#analysis-overlay').isVisible(),false);await offline.close();
 // A stale result also dismisses the overlay without overwriting code edited elsewhere.
 const stale=await browser.newPage();await stale.addInitScript(()=>localStorage.setItem('cognicode.settings.v1',JSON.stringify({base:'https://fixture.invalid/v1',key:'fixture',model:'fixture',hist:false})));
 let releaseStale;await stale.route('https://fixture.invalid/**',async route=>{await new Promise(r=>releaseStale=r);await route.fulfill({contentType:'application/json',body:response({...report,valid:true})});});
 await stale.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);await stale.locator('#launch-splash').waitFor({state:'hidden'});await stale.locator('#code').fill(code);await stale.locator('#btn-play').click();while(!releaseStale)await stale.waitForTimeout(20);
 await stale.locator('#code').evaluate(el=>{el.value='const changed = true;';el.dispatchEvent(new Event('input',{bubbles:true}));});releaseStale();await stale.waitForFunction(()=>!document.querySelector('#btn-play').disabled);assert.equal(await stale.locator('#analysis-overlay').isVisible(),false);assert.equal(await stale.locator('#code').inputValue(),'const changed = true;');await stale.close();console.log('PASS offline and discarded stale result: overlay ends, code stays intact');
 // With reduced motion the complete loading text remains readable, with no blink.
 const page=await browser.newPage({reducedMotion:'reduce'});await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);await page.locator('#launch-splash').waitFor({state:'hidden'});
 assert.equal(await page.locator('.analysis-overlay .terminal-text').evaluate(el=>getComputedStyle(el).animationName),'none');await page.close();console.log('PASS reduced motion: stationary full text');
 }finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
