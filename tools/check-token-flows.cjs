'use strict';
// Fixture-only: no real API, credentials, paid requests or user documents.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {pathToFileURL}=require('node:url'),B=require('../ai-budget.js'),root=path.resolve(__dirname,'..');
const output=process.env.COGNI_OUTPUT||path.join(root,'artifacts/token-flows');fs.mkdirSync(output,{recursive:true});
const ok={language:'javascript',valid:true,errors:[],advice:'',fixExplanation:'',explanation:{summary:'گزارش کوتاه نمونه',steps:['خواندن کد'],uses:[],notes:[]}};
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'chrome'});
 try{for(const native of [false,true]){
  const context=await browser.newContext({viewport:{width:393,height:852},reducedMotion:'reduce'});
  const calls=[],errors=[];let finish='stop',hold=false;
  const respond=async body=>{calls.push(body);if(hold)await new Promise(r=>setTimeout(r,600));const selection=body.messages[0].content.includes('Reply concisely in Persian Markdown');return JSON.stringify({choices:[{message:{content:selection?'توضیح کوتاه انتخاب':JSON.stringify(ok)},finish_reason:selection?finish:'stop'}],usage:{prompt_tokens:100,completion_tokens:50,total_tokens:150,completion_tokens_details:{reasoning_tokens:10}}});};
  await context.addInitScript(()=>{
   localStorage.clear();localStorage.setItem('cognicode.launch-seen.v1','1');
   localStorage.setItem('cognicode.settings.v1',JSON.stringify({base:'https://fixture.invalid/v1',key:'fixture-only',model:'fixture-model',hist:false,modelCatalog:[{id:'fixture-model',name:'Fixture',state:'verified'}],selectedModels:[{model:'fixture-model',name:'Fixture'}]}));
  });
  const page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR '+e.message);});
  if(native){
   await page.exposeFunction('fixtureReply',respond);
   await page.addInitScript(()=>{
    window.webkit={messageHandlers:{
     credentialBridge:{postMessage:()=>queueMicrotask(()=>window.__onNativeCredentialStatus(true,true))},draftBridge:{postMessage:()=>{}},hapticBridge:{postMessage:()=>{}},themeBridge:{postMessage:()=>{}},aiCancelBridge:{postMessage:()=>{}},dynamicIslandBridge:{postMessage:()=>{}},
     aiBridge:{postMessage:async m=>{const result=await window.fixtureReply(JSON.parse(m.body));window.__nativeAI(m.id,true,200,result);}}
    }};
   });
  }
  await page.route('https://**/*',async route=>{
   if(route.request().url().startsWith('https://fixture.invalid/'))await route.fulfill({body:await respond(route.request().postDataJSON()),contentType:'application/json'});
   else await route.abort();
  });
  await page.goto(pathToFileURL(path.join(root,native?'native/Web/index.html':'index.html')).href);
  await page.locator('#launch-splash').waitFor({state:'hidden'});
  await page.locator('#code').fill('const total = 2 + 3;\nconsole.log(total);');
  await page.locator('#btn-play').click();await page.locator('#sheet-result.open').waitFor();
  assert.equal(calls.length,1);assert.ok((calls[0].max_tokens||calls[0].max_completion_tokens)<=2400);assert.ok(B.inputReserve(calls[0].messages)<=B.limits.input);
  assert.match(await page.locator('#ai-usage-summary').textContent(),/۱۵۰/);
  await page.locator('#res-close').click();await page.locator('#btn-play').click();await page.locator('#sheet-result.open').waitFor();assert.equal(calls.length,1,'unchanged review must not send again');
  await page.locator('#res-close').click();await page.locator('#sheet-result.open').waitFor({state:'hidden'});
  const large=Array.from({length:2500},(_,i)=>`const row_${i} = ${i};`).join('\n');
  await page.locator('#code').evaluate((el,text)=>{el.value=text;el.dispatchEvent(new Event('input',{bubbles:true}));},large);await page.locator('#btn-play').click();await page.locator('#sheet-result.open').waitFor();
  assert.equal(calls.length,3,'large review capped at two bounded excerpts');assert.match(await page.locator('#res-verdict').textContent(),/کامل تأیید نشد/);assert.match(await page.locator('#review-summary').textContent(),/پوشش AI/);
  await page.locator('#res-close').click();
  const selection=Array.from({length:600},(_,i)=>`const selected_${i} = ${i};`).join('\n');await page.locator('#code').fill(selection);
  await page.locator('#code').evaluate(el=>{el.focus();el.setSelectionRange(0,el.value.length);el.dispatchEvent(new Event('select'));});
  await page.locator('#key-explain').click();finish='length';const before=calls.length;
  await page.locator('[data-selection-action="explain"]').click();await page.waitForFunction(()=>document.querySelector('#selection-stop').hidden);
  assert.equal(calls.length,before+1,'truncation must not trigger continuation');assert.equal(calls.at(-1).max_tokens||calls.at(-1).max_completion_tokens,1800);
  assert.match(await page.locator('#selection-result').textContent(),/ادامهٔ خودکار خاموش/);assert.match(await page.locator('#selection-result').textContent(),/توضیح کوتاه انتخاب/);
  finish='stop';hold=true;
  await page.locator('[data-selection-action="review"]').click();await page.waitForFunction(()=>!document.querySelector('#selection-stop').hidden);await page.locator('#selection-stop').click();await page.waitForFunction(()=>document.querySelector('#selection-stop').hidden);
  assert.match(await page.locator('#selection-result').textContent(),/متوقف/);hold=false;
  await page.locator('#sheet-selection [data-close]').click();await page.locator('#btn-settings').click();await page.locator('#sheet-settings.open').waitFor();
  if(!native)await page.screenshot({path:path.join(output,'token-controls.png')});
  assert.deepEqual(errors,[]);console.log(`PASS ${native?'iOS bridge':'web'}: bounded small/large reviews, exact cache hit, usage counters, honest partial coverage, truncated selection without continuation, cancellation`);
  await context.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e.message?.split('\n').slice(-12).join('\n'));process.exitCode=1;});
