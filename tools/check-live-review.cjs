// Real shared UI in Chromium/WebKit and the actual Android adapter; fixture API only.
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/build-19-validation');fs.mkdirSync(out,{recursive:true});
const OK={language:'javascript',valid:true,errors:[],advice:'',fixExplanation:'',explanation:{summary:'بررسی نمونه',steps:[],uses:[],notes:[]}};
const wrap=o=>JSON.stringify({choices:[{message:{content:JSON.stringify(o)},finish_reason:'stop'}]});
const clean=Array.from({length:5000},(_,i)=>`const value_${i} = (${i} + 1);`).join('\n');
const badLine='const value_4999 = (4999 + 1;',goodLine='const value_4999 = (4999 + 1);',broken=clean.replace(goodLine,badLine);
const timings=[];
async function setup(browser,mode){
 const page=await browser.newPage({viewport:{width:393,height:852},reducedMotion:'reduce'}),requests=[],errors=[],gates=[];let hold=true;
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.clear();localStorage.setItem('cognicode.launch-seen.v1','1');localStorage.setItem('cognicode.settings.v1',JSON.stringify({base:'https://fixture.invalid/v1',key:'fixture',model:'gpt-4o-mini',hist:false}));});
 async function respond(body){const fix=body.messages[0].content.includes('اصلاح‌گر کد دقیق');requests.push({body,fix});if(hold&&!fix)await new Promise(r=>gates.push(r));return wrap(fix?{edits:[{before:badLine,after:goodLine}]}:OK);}
 if(mode==='web') await page.route('https://fixture.invalid/**',async route=>{try{await route.fulfill({contentType:'application/json',body:await respond(route.request().postDataJSON())});}catch(_){} });
 else{
  await page.exposeFunction('fixtureRequest',respond);
  await page.addInitScript(android=>{
   window.cancelled=[];
   const ai=async m=>{const body=await window.fixtureRequest(JSON.parse(m.body));window.__nativeAI(m.id,true,200,body);};
   if(android)window.AndroidBridge={aiBridge:s=>ai(JSON.parse(s)),aiCancelBridge:s=>window.cancelled.push(JSON.parse(s).id),hapticBridge(){},dynamicIslandBridge(){},credentialBridge(){},draftBridge(){}};
   else window.webkit={messageHandlers:{aiBridge:{postMessage:ai},aiCancelBridge:{postMessage:m=>window.cancelled.push(m.id)},hapticBridge:{postMessage(){}},dynamicIslandBridge:{postMessage(){}}}};
  },mode==='android');
 }
 const file=mode==='android'?path.resolve(root,'../cognicode-apk/app/src/main/assets/web/index.html'):path.join(root,mode==='ios'?'native/Web/index.html':'index.html');
 await page.goto(pathToFileURL(file).href);await page.locator('#launch-splash').waitFor({state:'hidden'});await page.evaluate(()=>WorkspaceStore.ready);await page.waitForTimeout(100);
 return {page,requests,errors,release(){hold=false;gates.splice(0).forEach(r=>r());}};
}
async function input(page,code){await page.locator('#code').evaluate((ta,code)=>{ta.value=code;ta.dispatchEvent(new Event('input',{bubbles:true}));},code);}
(async()=>{
 for(const [engineName,engine] of [['Chromium',chromium],['WebKit',webkit]]){
  const browser=await engine.launch({headless:true,channel:engine===chromium?process.env.BROWSER_CHANNEL||undefined:undefined});
  try{for(const mode of ['web','ios',...(fs.existsSync(path.resolve(root,'../cognicode-apk/app/src/main/assets/web/index.html'))?['android']:[])]){
   const t=await setup(browser,mode),{page,requests,errors}=t;
   try{
    await input(page,broken);const started=Date.now();await page.locator('#btn-play').click();
    await page.waitForFunction(()=>!document.querySelector('#key-problems').hidden&&document.querySelectorAll('.p-item.error').length>0);
    const elapsed=Date.now()-started;assert.ok(elapsed<5000,`offline results took ${elapsed}ms`);timings.push({engine:engineName,mode,lines:5000,offlineMs:elapsed});
    assert.equal(await page.locator('#analysis-overlay').isVisible(),false,'waiting for API must not block the editor');
    await page.waitForFunction(()=>document.querySelector('#operation-bar').hidden===false);
    assert.equal(await page.locator('#problems-list').locator('.p-item.error').count(),1);
    await page.locator('#problems-close').click();assert.equal(await page.locator('#problems').isVisible(),false);assert.equal(await page.locator('#key-problems').isVisible(),true);
    await page.locator('#key-problems').click();assert.equal(await page.locator('#problems').isVisible(),true);
    await page.locator('.p-item.error').click();assert.equal(await page.locator('#problems').isVisible(),false);
    await input(page,clean);await page.waitForFunction(()=>document.querySelectorAll('.p-item.resolved').length===1);
    await page.waitForFunction(()=>!document.querySelector('#btn-play').disabled);t.release();
    await page.locator('#key-problems').click();assert.match(await page.locator('.p-item.resolved').textContent(),/حل شد/);
    assert.equal(await page.locator('.p-item.error').count(),0);assert.equal(await page.locator('#code').inputValue(),clean);
    await page.screenshot({path:path.join(out,`live-resolved-${engineName}-${mode}.png`)});
    await page.locator('#btn-play').click();await page.waitForFunction(()=>!document.querySelector('#btn-play').disabled);
    if(await page.locator('#sheet-result').evaluate(e=>e.classList.contains('open')))await page.locator('#res-close').click();
    const count=requests.length;await page.locator('#btn-play').click();await page.waitForFunction(()=>!document.querySelector('#btn-play').disabled);assert.equal(requests.length,count,'exact unchanged code may reuse AI review');
    if(await page.locator('#sheet-result').evaluate(e=>e.classList.contains('open')))await page.locator('#res-close').click();
    await input(page,broken);await page.waitForFunction(()=>document.querySelectorAll('.p-item.error').length===1);
    await page.locator('#btn-play').click();await page.waitForFunction(()=>!document.querySelector('#btn-play').disabled);
    assert.ok(requests.length>count,'editing a single syntax token invalidates the healthy AI result');
    assert.match(await page.locator('.p-item.error').textContent(),/۵۰۰۰/,'the last line is actually parsed');
    if(!(await page.locator('#problems').isVisible()))await page.locator('#key-problems').click();
    const fixes=requests.filter(r=>r.fix).length;await page.locator('#btn-smart-fix').click();await page.waitForFunction(()=>!document.querySelector('#btn-smart-fix').disabled);
    assert.equal(requests.filter(r=>r.fix).length,fixes+1);const fix=requests.find(r=>r.fix);assert.ok(fix.body.messages[1].content.length<4000,'fix input should be a small exact source window');
    assert.equal(await page.locator('#magic-fix-card').evaluate(e=>e.hidden),false);await page.locator('#btn-magic-fix').click();assert.equal(await page.locator('#code').inputValue(),clean);
    await page.waitForTimeout(350);await page.waitForFunction(()=>!document.querySelector('#btn-play').disabled);
    assert.deepEqual(errors,[]);console.log(`PASS ${engineName} ${mode}: 5000-line immediate result ${elapsed}ms, tab, live resolution, last-line mutation, exact cache, targeted fix`);
   }finally{t.release();await page.close();}
  }}finally{await browser.close();}
 }
 fs.writeFileSync(path.join(out,'ui-timings.json'),JSON.stringify(timings,null,2)+'\n');
})().catch(e=>{console.error(e);process.exitCode=1;});
