const {chromium,webkit}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/build-26-validation');fs.mkdirSync(out,{recursive:true});
const models=['gpt-6.1-sol','claude-sonnet-5-5','deepseek-v4-pro','glm-5.3','gemini-3.8-flash','custom-code-model','empty-chat'];
const clean={valid:true,errors:[],explanation:{summary:'کد کامل بررسی شد',steps:[],uses:[],notes:[]}};
(async()=>{
for(const [engine,platform,file]of [[chromium,'android',path.join(root,'artifacts/build-26-android/app/src/main/assets/web/index.html')],[webkit,'ios',path.join(root,'native/Web/index.html')],[chromium,'web',path.join(root,'index.html')]]){
 const browser=await engine.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:393,height:852},reducedMotion:'reduce'}),errors=[],requests=[];let getStatus=200,invalid=false,empty=false,hold=false,denyClaude=true;
 page.on('pageerror',e=>errors.push(e.message));
 async function fixture(message){
   const method=message.method||'POST',body=method==='POST'?JSON.parse(message.body):null;requests.push({method,url:message.url,body});
   if(hold&&method==='GET')await new Promise(resolve=>setTimeout(resolve,700));
   if(method==='GET')return {ok:getStatus===200,status:getStatus,text:getStatus===200?(invalid?'<html>invalid</html>':JSON.stringify({data:empty?[]:[...models.map(id=>({id})),{id:'gpt-6.1-sol'},{id:'text-embedding-3-small'},{id:'sora-2'},{id:'image-gen'}]})):JSON.stringify({error:{message:'fixture unavailable'}})};
   if(denyClaude&&body.model.startsWith('claude'))return {ok:false,status:403,text:JSON.stringify({error:{message:'no permission'}})};
   const probe=body.messages.length===1&&body.messages[0].content.includes('Reply only with OK');
   const content=probe?(body.model==='empty-chat'?'':'OK'):body.messages[0].content.includes('code teacher and reviewer')?'توضیح کامل خط و عملگرها':JSON.stringify(clean);
   return {ok:true,status:200,text:JSON.stringify({choices:[{message:{content},finish_reason:'stop'}]})};
 }
 await page.exposeFunction('modelFixture',fixture);
 await page.addInitScript(platform=>{
   localStorage.clear();localStorage.setItem('cognicode.settings.v1',JSON.stringify({key:'fake-test-key',base:'https://fixture.invalid/v1/chat/completions',hist:false}));
   const send=async message=>{const r=await window.modelFixture(message);window.__nativeAI(message.id,r.ok,r.status,r.text);};
   if(platform==='android')window.AndroidBridge={aiBridge:json=>send(JSON.parse(json)),aiCancelBridge(){},credentialBridge(){},draftBridge(){},hapticBridge(){}};
   if(platform==='ios')window.webkit={messageHandlers:{aiBridge:{postMessage:send},aiCancelBridge:{postMessage(){}},credentialBridge:{postMessage(){}},draftBridge:{postMessage(){}},hapticBridge:{postMessage(){}},themeBridge:{postMessage(){}},dynamicIslandBridge:{postMessage(){}}}};
 },platform);
 if(platform==='web')await page.route('https://fixture.invalid/**',async route=>{const request=route.request(),r=await fixture({url:request.url(),method:request.method(),body:request.postData()||''});await route.fulfill({status:r.status,contentType:'application/json',body:r.text});});
 await page.goto(pathToFileURL(file).href);await page.locator('#launch-splash').waitFor({state:'hidden'});await page.locator('#btn-settings').click();
 const settled=()=>page.waitForFunction(()=>!document.querySelector('#cfg-test').disabled&&document.querySelector('#operation-bar').hidden);
 const test=async()=>{await page.locator('#cfg-test').click();await settled();};
 const choose=async id=>{await page.locator('#cfg-model-search').fill(id);await page.locator('input[data-model="'+id+'"]').click();await settled();};
 await test();assert.equal(requests.length,1);assert.equal(requests[0].method,'GET');assert.equal(requests[0].url,'https://fixture.invalid/v1/models');assert.equal(await page.locator('#model-options input').count(),models.length);assert.doesNotMatch(await page.locator('#st-ai-txt').textContent(),/AI آماده/);
 await choose('gpt-6.1-sol');assert.equal(await page.locator('#st-ai-txt').textContent(),'AI آماده');assert.equal(await page.locator('#cfg-model').inputValue(),'gpt-6.1-sol');
 await choose('claude-sonnet-5-5');assert.match(await page.locator('#model-options').textContent(),/دسترسی تأیید نشد/);assert.equal(await page.locator('#model-options input:checked').count(),0);assert.equal(await page.locator('#cfg-model option').count(),1);
 await choose('empty-chat');assert.match(await page.locator('#cfg-test-line').textContent(),/پاسخ متنی کامل/);assert.equal(await page.locator('#cfg-model option').count(),1);
 await choose('deepseek-v4-pro');assert.equal(await page.locator('#cfg-model option').count(),2);await page.locator('#cfg-model').selectOption('deepseek-v4-pro');
 await page.keyboard.press('Escape');await page.locator('#code').fill('const value = 1;');const before=requests.length;await page.locator('#btn-play').click();await page.waitForFunction(()=>!document.querySelector('#btn-play').disabled&&document.querySelector('#operation-bar').hidden);await page.locator('#sheet-result').waitFor({state:'visible'});
 assert.deepEqual(new Set(requests.slice(before).map(r=>r.body.model)),new Set(['gpt-6.1-sol','deepseek-v4-pro']));assert.equal(requests.length-before,2);assert.match(await page.locator('#res-verdict').textContent(),/سالم/);
 await page.keyboard.press('Escape');await page.locator('#code').evaluate(ta=>ta.setSelectionRange(0,ta.value.length));await page.locator('#key-explain').click();await page.locator('[data-selection-action="explain"]').click();await page.waitForFunction(()=>document.querySelector('#selection-stop').hidden);assert.equal(requests.at(-1).body.model,'deepseek-v4-pro');
 await page.keyboard.press('Escape');await page.locator('#btn-settings').click();denyClaude=false;await choose('claude-sonnet-5-5');await choose('glm-5.3');await choose('gemini-3.8-flash');const five=requests.length;await choose('custom-code-model');assert.equal(requests.length,five);assert.equal(await page.locator('#cfg-model option').count(),5);
 await page.keyboard.press('Escape');await page.locator('#code').fill('const five = 5;');const ensemble=requests.length;await page.locator('#btn-play').click();await page.waitForFunction(()=>!document.querySelector('#btn-play').disabled&&document.querySelector('#operation-bar').hidden);await page.locator('#sheet-result').waitFor({state:'visible'});assert.equal(requests.length-ensemble,5);assert.equal(new Set(requests.slice(ensemble).map(r=>r.body.model)).size,5);await page.keyboard.press('Escape');await page.locator('#btn-settings').click();
 await page.locator('#cfg-key').fill('changed-fake-key');await page.locator('#cfg-base').click();assert.doesNotMatch(await page.locator('#st-ai-txt').textContent(),/AI آماده/);assert.equal(await page.locator('#cfg-model option').count(),0);
 getStatus=401;const unauthorized=requests.length;await test();assert.equal(requests.length-unauthorized,1);assert.match(await page.locator('#cfg-test-line').textContent(),/۴۰۱/);assert.equal(await page.locator('#model-options input').count(),0);
 getStatus=200;invalid=true;await test();assert.match(await page.locator('#cfg-test-line').textContent(),/نامعتبر/);invalid=false;empty=true;await test();assert.match(await page.locator('#cfg-test-line').textContent(),/مدل متنی پیدا نشد/);empty=false;
 getStatus=404;await test();console.log(JSON.stringify({platform,fallback:await page.locator('#cfg-test-line').textContent(),requests:requests.slice(-7).map(r=>({method:r.method,model:r.body?.model}))}));assert.equal(await page.locator('#model-options input').count(),5);assert.doesNotMatch(await page.locator('#st-ai-txt').textContent(),/AI آماده/);
 getStatus=200;hold=true;await page.locator('#cfg-test').click();await page.waitForFunction(()=>!document.querySelector('#operation-bar').hidden);await page.locator('#cfg-base').fill('https://other.invalid/v1');await page.waitForTimeout(900);assert.equal(await page.locator('#model-options input').count(),0);assert.doesNotMatch(await page.locator('#st-ai-txt').textContent(),/AI آماده/);await settled();hold=false;
 await page.locator('#cfg-base').fill('https://fixture.invalid/v1');await page.locator('#manual-model-details summary').click();await page.locator('#cfg-manual-model').fill('custom-code-model');await page.locator('#cfg-manual-test').click();await settled();assert.equal(await page.locator('#cfg-model').inputValue(),'custom-code-model');assert.equal(await page.locator('#st-ai-txt').textContent(),'AI آماده');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('cognicode.settings.v1')));if(platform!=='web')assert.equal(saved.key,undefined,'Native settings must never persist the API key in plaintext');
 assert.deepEqual(errors,[]);await page.screenshot({path:path.join(out,platform+'-model-picker.png')});console.log('PASS '+platform+': authenticated discovery, selected-model probes, permissions/empty replies, one/two/five-model reviews, primary model, max five, credential invalidation, 401/invalid/empty/fallback/manual, stale cancellation and native key privacy');
 }finally{await browser.close();}
}
})().catch(error=>{console.error(String(error.stack||error).slice(0,2200));process.exitCode=1;});
