// Regression: a successful API reply must not become a ReferenceError while
// rendering its duration. Also exercise error/retry paths and the iOS bridge.
const {chromium,webkit}=require('playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 for(const [name,engine] of [['Chromium',chromium],['WebKit',webkit]]){
  const browser=await engine.launch({headless:true,channel:engine===chromium?process.env.BROWSER_CHANNEL||undefined:undefined});
  try{for(const native of [false,true]){
   const page=await browser.newPage({viewport:{width:393,height:852},reducedMotion:'reduce'}),errors=[],calls=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{localStorage.clear();localStorage.setItem('cognicode.launch-seen.v1','1');});
   let status=200;
   const respond=async body=>{
    calls.push(body);await new Promise(resolve=>setTimeout(resolve,150));
    return {status,body:status===200?JSON.stringify({choices:[{message:{content:'سلام'},finish_reason:'stop'}]}):JSON.stringify({error:{message:'Invalid API key',code:'invalid_api_key'}})};
   };
   if(native){
    await page.exposeFunction('connectionFixture',respond);
    await page.addInitScript(()=>{window.webkit={messageHandlers:{aiBridge:{postMessage:async message=>{const reply=await window.connectionFixture(JSON.parse(message.body));window.__nativeAI(message.id,reply.status===200,reply.status,reply.body);}}}};});
   }else await page.route('https://connection.invalid/**',async route=>{const reply=await respond(route.request().postDataJSON());await route.fulfill({status:reply.status,contentType:'application/json',body:reply.body});});
   await page.goto(pathToFileURL(path.join(root,native?'native/Web/index.html':'index.html')).href);
   await page.locator('#launch-splash').waitFor({state:'hidden'});
   await page.locator('#btn-settings').click();
   await page.locator('#cfg-base').fill('https://connection.invalid/v1');
   await page.locator('#cfg-key').fill('fixture-key');
   await page.locator('#cfg-model').fill('gpt-4o-mini');
   for(const expectedStatus of [200,401,200]){
    status=expectedStatus;const before=calls.length;
    await page.locator('#cfg-test').click();
    await page.waitForFunction(()=>!document.querySelector('#cfg-test').classList.contains('busy'));
    assert.equal(calls.length,before+1,'each test must send exactly one request');
    const text=await page.locator('#cfg-test-line').textContent();
    assert.ok(!/t0|connectionTestStartedAt|find variable|not defined|NaN|Infinity/i.test(text),text);
    if(status===200){
     assert.match(text,/✓ اتصال برقرار است \(\d+\.\d ثانیه\)/);
     assert.equal(await page.locator('#cfg-test-line').evaluate(el=>el.classList.contains('ok')),true);
     const seconds=Number(text.match(/\((\d+\.\d) ثانیه/)[1]);assert.ok(Number.isFinite(seconds)&&seconds>=0.1,text);
    }else{assert.equal(await page.locator('#cfg-test-line').evaluate(el=>el.classList.contains('fail')),true);assert.ok(text.startsWith('✕'),text);}
    assert.deepEqual(errors,[]);
   }
   await page.close();console.log(`PASS ${name} ${native?'iOS bridge':'web'}: entered settings, success duration, auth failure, successful retry, busy state cleared`);
  }}finally{await browser.close();}
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
