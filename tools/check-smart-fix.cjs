// Browser and WKWebView bridge flows with fixture replies, not a live-model benchmark.
const {chromium,webkit}=require('playwright'),{pathToFileURL}=require('node:url');
const path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const CLEAN='const total = (2 + 3);\nconsole.log(total);\n',BROKEN='const total = (2 + 3;\nconsole.log(total);\n';
const EDIT={before:'const total = (2 + 3;',after:'const total = (2 + 3);'};
const OK={language:'javascript',valid:true,errors:[],advice:'',fixExplanation:'',explanation:{summary:'محاسبه و چاپ مقدار',steps:['محاسبه','چاپ'],uses:['نمونه'],notes:[]}};
const ERR={...OK,valid:false,errors:[{line:1,column:15,severity:'error',message:'پرانتز بسته نشده',hint:'پرانتز را ببند',quote:EDIT.before,reason:'An opening parenthesis is missing its closing delimiter before the semicolon.',confidence:'high'}]};
const wrapper=(content,finish='stop')=>JSON.stringify({choices:[{message:{content:typeof content==='string'?content:JSON.stringify(content)},finish_reason:finish}]});
async function setup(browser,{native=false,reply=OK,code=CLEAN,finish='stop',fix={edits:[EDIT]},fixFinish='stop',delay=0}={}){
 const page=await browser.newPage({viewport:{width:393,height:852},reducedMotion:'reduce'}),requests=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.clear();localStorage.setItem('cognicode.launch-seen.v1','1');localStorage.setItem('cognicode.settings.v1',JSON.stringify({base:'https://fixture.invalid/v1',key:'fixture',model:'gpt-4o-mini',hist:false}));});
 async function respond(body){const isFix=body.messages[0].content.includes('اصلاح‌گر کد دقیق');requests.push({isFix,body});if(delay)await new Promise(r=>setTimeout(r,delay));return wrapper(isFix?fix:reply,isFix?fixFinish:finish);}
 if(native){await page.exposeFunction('fixtureRequest',respond);await page.addInitScript(()=>{window.cancelled=[];window.activities=[];window.webkit={messageHandlers:{aiBridge:{postMessage:async m=>{const body=await window.fixtureRequest(JSON.parse(m.body));window.__nativeAI(m.id,true,200,body);}},aiCancelBridge:{postMessage:m=>window.cancelled.push(m.id)},dynamicIslandBridge:{postMessage:m=>window.activities.push(m)},hapticBridge:{postMessage(){}}}};});}
 else await page.route('https://fixture.invalid/**',async route=>{try{await route.fulfill({contentType:'application/json',body:await respond(route.request().postDataJSON())});}catch(_){} });
 await page.goto(pathToFileURL(path.join(root,native?'native/Web/index.html':'index.html')).href);await page.locator('#launch-splash').waitFor({state:'hidden'});await page.evaluate(()=>WorkspaceStore.ready);await page.waitForTimeout(100);await page.locator('#code').evaluate((ta,value)=>{ta.value=value;ta.dispatchEvent(new Event('input',{bubbles:true}));},code);await page.waitForTimeout(100);return {page,requests,errors};
}
async function analyze(page){await page.locator('#btn-play').click();await page.waitForFunction(()=>!document.querySelector('#btn-play').disabled);}
async function smartFix(page){await page.locator('#btn-smart-fix').click();await page.waitForFunction(()=>!document.querySelector('#btn-smart-fix').disabled);}
async function closeResult(page){if(await page.locator('#sheet-result').evaluate(e=>e.classList.contains('open')))await page.locator('#res-close').click();}
(async()=>{
 const failures=[];
 for(const [engineName,engine] of [['Chromium',chromium],['WebKit',webkit]]){
  let browser;try{browser=await engine.launch({headless:true,channel:engine===chromium?process.env.BROWSER_CHANNEL||undefined:undefined});}catch(e){if(engine===webkit){console.log('SKIP WebKit unavailable: '+e.message.split('\n')[0]);continue;}throw e;}
  async function check(name,task){if(process.env.REVIEW_TEST_FILTER&&!name.includes(process.env.REVIEW_TEST_FILTER))return;try{await task();console.log('PASS '+engineName+' '+name);}catch(e){failures.push(engineName+' '+name+': '+e.message.split('\n')[0]);console.error('FAIL '+failures.at(-1));}}
  try{
   for(const native of [false,true])await check((native?'native bridge':'web')+' exact fix/apply/undo, persistent panel, cache, stale guard',async()=>{
    const {page,requests,errors}=await setup(browser,{native,reply:ERR,code:BROKEN});try{
     await analyze(page);assert.equal(requests.length,1,'analysis must not send a fix request');assert.equal(await page.locator('#magic-fix-card').evaluate(e=>e.hidden),true);
     const before=await page.locator('#problems-list').textContent();assert.ok(before.length);await page.locator('#problems-close').click();assert.equal(await page.locator('#problems').evaluate(e=>e.hidden),false);assert.equal(await page.locator('#problems').evaluate(e=>e.classList.contains('peek')),true);
     await page.locator('#problems header').click();assert.equal(await page.locator('#problems-list').textContent(),before);assert.equal(requests.length,1);
     await page.locator('.p-item').first().click();assert.equal(await page.locator('#problems').evaluate(e=>e.classList.contains('peek')),true);await page.locator('#problems header').click();await smartFix(page);assert.equal(requests.length,2);assert.ok(requests[1].body.max_tokens<=3000);
     assert.equal(await page.locator('#code').inputValue(),BROKEN);assert.equal(await page.locator('#magic-fix-card').evaluate(e=>e.hidden),false);await page.locator('#btn-diff-toggle').click();assert.ok(await page.locator('[data-patch]').count());await smartFix(page);assert.equal(requests.length,2);
     await page.locator('#btn-magic-fix').click();assert.equal(await page.locator('#code').inputValue(),CLEAN);await page.waitForTimeout(250);await page.waitForFunction(()=>!document.querySelector('#btn-play').disabled);await closeResult(page);
     await page.locator('#key-undo').click();assert.equal(await page.locator('#code').inputValue(),BROKEN);await analyze(page);const count=requests.length;await analyze(page);assert.equal(requests.length,count,'unchanged input must reuse its complete review');
     await closeResult(page);if(await page.locator('#problems').evaluate(e=>e.classList.contains('peek')))await page.locator('#problems header').click();await page.locator('#code').fill(BROKEN+'// edited\n');if(await page.locator('#problems').evaluate(e=>e.classList.contains('peek')))await page.locator('#problems header').click();await page.locator('#btn-smart-fix').click();assert.equal(requests.length,count);assert.deepEqual(errors,[]);
    }finally{await page.close();}
   });
   for(const [name,opts] of [
    ['healthy',{reply:OK}],['style-only',{reply:{...OK,valid:false,advice:'بهبود سبک',fixExplanation:'مرتب کن'}}],
    ['fake quote',{reply:{...ERR,errors:[{...ERR.errors[0],quote:'missing from source'}]}}],['low confidence',{reply:{...ERR,errors:[{...ERR.errors[0],quote:CLEAN.split('\n')[0],confidence:'low'}]}}],
    ['truncated',{reply:JSON.stringify(ERR).slice(0,-25),finish:'length'}],['unparseable',{reply:'not JSON'}],['empty',{reply:''}],['oversized',{code:'const big = "'+'x'.repeat(50000)+'";'}]
   ])await check(name+' has no invented hard issues or unsolicited fix',async()=>{
    const {page,requests,errors}=await setup(browser,opts);try{await analyze(page);assert.ok(requests.length<=1);assert.equal(await page.locator('#magic-fix-card').evaluate(e=>e.hidden),true);assert.equal(await page.locator('#problems-list').evaluate(e=>e.querySelectorAll('.p-item.error').length),0);if(name==='healthy')assert.match(await page.locator('#res-verdict').textContent(),/سالم/);if(!['healthy','style-only'].includes(name))assert.match(await page.locator('#res-verdict').textContent(),/کامل تأیید نشد/);assert.ok(!(await page.locator('#res-body').textContent()).includes('"explanation"'));assert.deepEqual(errors,[]);}finally{await page.close();}
   });
   for(const [name,fix,fixFinish] of [['bad anchor',{edits:[{before:'missing',after:'x'}]},'stop'],['new syntax error',{edits:[{before:EDIT.before,after:'const total = ;'}]},'stop'],['truncated fix',{edits:[EDIT]},'length'],['no fix needed',{edits:[]},'stop'],['full rewrite',CLEAN,'stop']])await check(name+' preserves source',async()=>{
    const {page}=await setup(browser,{reply:ERR,code:BROKEN,fix,fixFinish});try{await analyze(page);await smartFix(page);assert.equal(await page.locator('#code').inputValue(),BROKEN);assert.equal(await page.locator('#magic-fix-card').evaluate(e=>e.hidden),true);}finally{await page.close();}
   });
   await check('native cancel ignores late response and retains results',async()=>{
    const {page,requests,errors}=await setup(browser,{native:true,reply:ERR,code:BROKEN,delay:1200});try{await analyze(page);const before=await page.locator('#problems-list').textContent();await page.locator('#btn-smart-fix').click();await page.waitForFunction(()=>document.querySelector('#btn-smart-fix').disabled);await page.locator('#operation-stop').click();await page.waitForFunction(()=>!document.querySelector('#btn-smart-fix').disabled);await page.waitForTimeout(1250);assert.equal(await page.locator('#code').inputValue(),BROKEN);assert.equal(await page.locator('#problems-list').textContent(),before);assert.equal(await page.evaluate(()=>window.cancelled.length),1);assert.equal(requests.length,2);assert.deepEqual(errors,[]);}finally{await page.close();}
   });
  }finally{await browser.close();}
 }
 if(failures.length)throw new Error(failures.join('\n'));
})().catch(e=>{console.error(e);process.exitCode=1;});
