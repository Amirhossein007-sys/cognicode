// End-to-end behavior with fixture API replies; no real service or credentials.
const {chromium}=require('playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const output=path.join(root,'artifacts','build-7-preview');fs.mkdirSync(output,{recursive:true});
const clean={language:'javascript',valid:true,errors:[],advice:'',explanation:{summary:'نمونهٔ آزمایشی',steps:['خواندن مقدار'],uses:['نمونه'],notes:[]}};
const wrapper=content=>JSON.stringify({choices:[{message:{content:typeof content==='string'?content:JSON.stringify(content)},finish_reason:'stop'}]});
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||undefined});
 try{
  for(const source of ['index.html','native/Web/index.html']){
   const context=await browser.newContext({viewport:{width:393,height:852},reducedMotion:'reduce'});
   await context.addInitScript(()=>{if(!localStorage.getItem('workspace-test-initialized')){localStorage.clear();localStorage.setItem('workspace-test-initialized','1');localStorage.setItem('cognicode.launch-seen.v1','1');localStorage.setItem('cognicode.settings.v1',JSON.stringify({base:'https://fixture.invalid/v1',key:'fixture',hist:true,model:'fixture'}));}Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:text=>{window.copiedText=text;return Promise.resolve();}}});});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   let hold=false, invalid=false, selectedRequests=0;
   await page.route('https://fixture.invalid/**',async route=>{
    const body=route.request().postDataJSON();
    if(hold){await new Promise(r=>setTimeout(r,2200));try{await route.fulfill({body:wrapper(clean),contentType:'application/json'});}catch(_){}return;}
    const sys=body.messages[0].content;
    if(sys.includes('Reply in Persian Markdown')){selectedRequests++;await route.fulfill({body:wrapper('## توضیح انتخاب\n\nاین بخش مقدار را نمایش می‌دهد.'),contentType:'application/json'});return;}
    const isFix=!sys.includes('explanation') && /correct|fix|repair|اصلاح/i.test(sys);
    let answer=clean;
    if(invalid)answer=isFix?'const a = 2;\nconst keep = 3;\nconst b = 4;':{...clean,valid:false,errors:[{line:1,column:1,severity:'error',message:'آزمون تغییر',hint:'اصلاح مقدار'}],fixExplanation:'مقادیر نمونه اصلاح می‌شوند'};
    await route.fulfill({body:wrapper(answer),contentType:'application/json'});
   });
   await page.goto(pathToFileURL(path.join(root,source)).href);
   await page.locator('#launch-splash').waitFor({state:'hidden'});
   await page.evaluate(()=>WorkspaceStore.ready);
   await page.waitForTimeout(300);
   assert.equal(await page.locator('#quick-start').isVisible(),true);
   for(const theme of ['dark','light']){
    await page.evaluate(t=>{document.documentElement.dataset.theme=t;window.Sonar.refresh();},theme);
    await page.waitForTimeout(100);
    await page.screenshot({path:path.join(output,source.startsWith('native')?'native-start-'+theme+'.png':'start-'+theme+'.png')});
    const surfaces=await page.evaluate(()=>['.editor','.keys','.bottom','.quick-start'].map(s=>getComputedStyle(document.querySelector(s)).backgroundColor));
    assert.ok(surfaces.every(s=>s.startsWith('rgba(')),surfaces.join(','));
   }
   const long=Array.from({length:400},(_,i)=>`const value_${i} = ${i};`).join('\n');
   await page.locator('#code').fill(long);await page.waitForTimeout(400);await page.reload();await page.locator('#launch-splash').waitFor({state:'hidden'});
   await page.waitForFunction(code=>document.querySelector('#code').value===code,long);
   await page.locator('#btn-play').click();await page.waitForFunction(()=>!document.querySelector('#btn-play').disabled && (document.querySelector('#res-body').textContent || !document.querySelector('#problems').hidden));
   assert.match(await page.locator('#res-body').innerText(),/بررسی امنیتی/);
   await page.locator('#res-copy').click();assert.match(await page.evaluate(()=>window.copiedText),/بررسی امنیتی/);
   await page.locator('#res-close').click();await page.locator('#btn-history').click();
   await page.locator('.session-row').first().waitFor();await page.locator('#history-search').fill('javascript');assert.ok(await page.locator('.session-row').count()>0);
   await page.locator('.session-row .hist').first().click();assert.equal(await page.locator('#code').inputValue(),long);
   await page.locator('#btn-settings').click();await page.locator('#sheet-settings [data-close]').press('Shift+Tab');
   assert.equal(await page.evaluate(()=>document.querySelector('#sheet-settings').contains(document.activeElement)),true);
   await page.locator('#cfg-text-scale').fill('150');await page.locator('#sheet-settings [data-close]').click();
   assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('text-scale-150')),true);
   await page.locator('#key-focus').click();assert.equal(await page.locator('#tehran-clock').isVisible(),true);assert.equal(await page.locator('.brain-marquee').isVisible(),true);assert.equal(await page.locator('#particles-js').isVisible(),true);
   await page.locator('#key-focus').click();
   await page.locator('#code').fill('const a = 1;\nconst keep = 3;\nconst b = 1;');
   invalid=true;await page.locator('#btn-play').click();await page.waitForFunction(()=>document.querySelector('#btn-play').disabled===false);await page.locator('#btn-diff-toggle').click();
   assert.equal(await page.locator('[data-patch]').count(),2);
   await page.locator('[data-patch]').nth(1).uncheck();invalid=false;await page.locator('#apply-selected').click();
   assert.equal(await page.locator('#code').inputValue(),'const a = 2;\nconst keep = 3;\nconst b = 1;');
   await page.waitForFunction(()=>document.querySelector('#btn-play').disabled===false);await page.waitForTimeout(2000);
   if(await page.locator('#sheet-result').evaluate(e=>e.classList.contains('open')))await page.locator('#res-close').click();
   await page.locator('#code').evaluate(e=>{e.focus();e.setSelectionRange(0,12);e.dispatchEvent(new Event('select'));});await page.locator('#key-explain').click();await page.locator('[data-selection-action="explain"]').click();
   await page.waitForFunction(()=>document.querySelector('#selection-result').textContent.includes('توضیح انتخاب'));assert.equal(selectedRequests,1);await page.locator('#sheet-selection [data-close]').click();
   hold=true;await page.locator('#btn-play').click();await page.locator('#res-stop').click();await page.waitForFunction(()=>!document.querySelector('#btn-play').disabled);
   assert.match(await page.locator('#res-body').innerText(),/متوقف/);assert.equal(await page.locator('#operation-bar').isVisible(),false);
   await page.waitForTimeout(2400);assert.match(await page.locator('#res-body').innerText(),/متوقف/);
   await page.locator('#res-close').click();await page.locator('#code').fill('');await page.waitForTimeout(400);await page.reload();await page.locator('#launch-splash').waitFor({state:'hidden'});await page.waitForTimeout(350);assert.equal(await page.locator('#code').inputValue(),'');
   for(const width of [320,393,440]){await page.setViewportSize({width,height:width===320?568:852});const metrics=await page.evaluate(()=>({bottom:document.querySelector('.bottom').getBoundingClientRect().bottom,height:innerHeight,editor:document.querySelector('.editor').getBoundingClientRect().height,overflow:document.documentElement.scrollWidth>innerWidth}));assert.ok(metrics.editor>50&&!metrics.overflow&&metrics.bottom<=metrics.height+1,JSON.stringify(metrics));}
   assert.deepEqual(errors,[]);
   console.log('PASS '+source+': full draft/session, copy security, focus trap, text size, preserved visuals, partial patches, selected explanation, cancel/late response, empty draft, 3 widths');
   await context.close();
  }
  const nativeContext=await browser.newContext({viewport:{width:393,height:852}});
  await nativeContext.addInitScript(()=>{
   localStorage.clear();localStorage.setItem('cognicode.launch-seen.v1','1');localStorage.setItem('cognicode.settings.v1',JSON.stringify({base:'https://fixture.invalid/v1',key:'fixture-secret',hist:true}));
   localStorage.setItem('cognicode.history.v1',JSON.stringify([{t:123,lang:'javascript',name:'old.js',code:'x'.repeat(6000),sum:'قدیمی',type:'ok'}]));
   window.fixtureRequests=[];window.fixtureActivities=[];window.fixtureCancelled=[];window.fixtureDrafts=[];
   const reply=content=>JSON.stringify({choices:[{message:{content:JSON.stringify(content)},finish_reason:'stop'}]});
   window.webkit={messageHandlers:{
    credentialBridge:{postMessage:()=>queueMicrotask(()=>window.__onNativeCredentialStatus(true,true))},
    draftBridge:{postMessage:message=>{window.fixtureDrafts.push(message);window.__onNativeDraftSaved(true);}},
    aiCancelBridge:{postMessage:message=>window.fixtureCancelled.push(message.id)},
    dynamicIslandBridge:{postMessage:message=>window.fixtureActivities.push(message)},
    themeBridge:{postMessage(){}},
    aiBridge:{postMessage:message=>{
     window.fixtureRequests.push(message);
     if(window.fixtureRequests.length===1)setTimeout(()=>window.__nativeAI(message.id,true,200,reply({valid:false,language:'javascript',errors:[{line:1,column:1,message:'آزمون',severity:'error'}],explanation:{summary:'نمونه',steps:[],uses:[],notes:[]}})),50);
    }}
   }};
  });
  const nativePage=await nativeContext.newPage();await nativePage.goto(pathToFileURL(path.join(root,'native/Web/index.html')).href);await nativePage.locator('#launch-splash').waitFor({state:'hidden'});
  await nativePage.waitForTimeout(300);
  assert.equal(await nativePage.evaluate(()=>JSON.parse(localStorage.getItem('cognicode.settings.v1')).key),undefined);
  await nativePage.locator('#btn-history').click();await nativePage.locator('.session-warning').waitFor();assert.match(await nativePage.locator('.session-warning').innerText(),/۶۰۰۰/);await nativePage.locator('#sheet-history [data-close]').click();
  await nativePage.locator('#code').fill('const original = 1;');await nativePage.waitForTimeout(350);assert.ok(await nativePage.evaluate(()=>window.fixtureDrafts.some(d=>d.code==='const original = 1;')));
  await nativePage.locator('#btn-play').click();await nativePage.waitForFunction(()=>window.fixtureRequests.length===2);
  assert.equal(await nativePage.evaluate(()=>window.fixtureActivities.filter(m=>m.action==='stop').length),0);
  assert.equal(await nativePage.evaluate(()=>window.fixtureRequests[0].key),'__native_keychain__');
  await nativePage.locator('#res-stop').click();await nativePage.waitForFunction(()=>!document.querySelector('#btn-play').disabled);
  assert.equal(await nativePage.evaluate(()=>window.fixtureCancelled.length),1);
  assert.equal(await nativePage.evaluate(()=>window.fixtureActivities.filter(m=>m.action==='stop').length),1);
  assert.equal(await nativePage.locator('#code').inputValue(),'const original = 1;');
  await nativePage.evaluate(()=>{const m=window.fixtureRequests[1];window.__nativeAI(m.id,true,200,JSON.stringify({choices:[{message:{content:'const original = 9;'},finish_reason:'stop'}]}));});
  assert.equal(await nativePage.locator('#code').inputValue(),'const original = 1;');
  console.log('PASS native bridge fixture: key migration without JS export, old-history warning, native draft mirror, activity across two requests, native cancel and ignored late reply');
  await nativeContext.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

