'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),output=process.env.COGNI_OUTPUT||path.join(root,'artifacts/activity-ui');
require('node:fs').mkdirSync(output,{recursive:true});
function contrast(a,b){const lum=s=>{const rgb=s.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];};const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'chrome'});
 try{
 const page=await browser.newPage({viewport:{width:393,height:852},reducedMotion:'reduce'});page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{if(!localStorage.getItem('ui-fixture')){localStorage.clear();localStorage.setItem('ui-fixture','1');localStorage.setItem('cognicode.launch-seen.v1','1');localStorage.setItem('cognicode.settings.v1',JSON.stringify({base:'https://fixture.invalid/v1',key:'fixture-only',model:'fixture-model',hist:false,modelCatalog:[{id:'fixture-model',name:'Fixture',state:'verified'}],selectedModels:[{model:'fixture-model',name:'Fixture'}]}));}});
 let release;await page.route('https://**/*',async route=>{if(!route.request().url().startsWith('https://fixture.invalid/'))return route.abort();await new Promise(resolve=>release=resolve);await route.fulfill({contentType:'application/json',body:JSON.stringify({choices:[{message:{content:JSON.stringify({language:'javascript',valid:true,errors:[],explanation:{summary:'نمونه',steps:[],uses:[],notes:[]}})},finish_reason:'stop'}],usage:{prompt_tokens:100,completion_tokens:50,total_tokens:150}})});});
 await page.goto(pathToFileURL(path.join(root,'index.html')).href);await page.locator('#launch-splash').waitFor({state:'hidden'});
 await page.locator('#code').fill('const total = 2 + 3;');await page.locator('#btn-play').click();await page.locator('#operation-bar').waitFor({state:'visible'});
 const ratios=[];
 for(const theme of ['dark','light']){
  await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
  for(const [width,height] of [[320,568],[393,852],[1280,800]]){
   await page.setViewportSize({width,height});
   const colors=await page.evaluate(()=>{const bar=document.querySelector('#operation-bar'),text=document.querySelector('#operation-stage'),stop=document.querySelector('#operation-stop'),box=bar.getBoundingClientRect();return {background:getComputedStyle(bar).backgroundColor,text:getComputedStyle(text).color,stopBackground:getComputedStyle(stop).backgroundColor,stopText:getComputedStyle(stop).color,left:box.left,right:box.right};});
   assert.ok(contrast(colors.background,colors.text)>=4.5);assert.ok(contrast(colors.stopBackground,colors.stopText)>=4.5);assert.ok(colors.left>=0&&colors.right<=width);
   ratios.push({theme,width,text:contrast(colors.background,colors.text).toFixed(2),stop:contrast(colors.stopBackground,colors.stopText).toFixed(2)});
  }
  await page.setViewportSize({width:393,height:852});await page.screenshot({path:path.join(output,`operation-${theme}.png`)});
 }
 release();await page.locator('#sheet-result.open').waitFor();await page.waitForFunction(()=>document.querySelector('#res-token-usage').textContent.includes('۱۵۰'));
 assert.match(await page.locator('#res-token-usage').textContent(),/ورودی ۱۰۰.*خروجی ۵۰/);
 await page.locator('#res-close').click();await page.locator('#btn-settings').click();await page.locator('#sheet-settings.open').waitFor();
 assert.match(await page.locator('#ai-quota-status').textContent(),/نامشخص/);assert.equal(await page.locator('#usage-total').textContent(),'۱۵۰');assert.match(await page.locator('#ai-key-usage').textContent(),/۱۵۰/);
 for(const theme of ['dark','light']){await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);await page.screenshot({path:path.join(output,`usage-${theme}.png`)});}
 await page.reload();await page.locator('#launch-splash').waitFor({state:'hidden'});await page.locator('#btn-settings').click();assert.equal(await page.locator('#usage-total').textContent(),'۱۵۰');assert.match(await page.locator('#ai-usage-last').textContent(),/۱۵۰/);assert.match(await page.locator('#ai-usage-requests').textContent(),/۱۰۰/);
 await page.locator('#sheet-settings [data-close]').click();
 await page.evaluate(()=>{window.endBusyFixture=AppBusy.begin('در حال خواندن فایل نمونه…');});await page.locator('#app-busy').waitFor({state:'visible'});await page.evaluate(()=>window.endBusyFixture());await page.locator('#app-busy').waitFor({state:'hidden'});
 assert.equal(await page.locator('.work-spinner').first().evaluate(el=>getComputedStyle(el).animationName),'none','respect reduced motion');
 await page.locator('#btn-settings').click();await page.locator('#cfg-key').fill('another-fixture-only');await page.locator('#cfg-key').press('Tab');assert.match(await page.locator('#ai-key-usage').textContent(),/۰ توکن/);assert.equal(await page.locator('#usage-total').textContent(),'۱۵۰','global total survives key change');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({pass:true,checks:'light/dark task contrast, 3 viewport sizes, loading cleanup, reduced motion, immediate input/output receipt, persisted totals/recent/last operation, honest unknown quota, isolated key period',ratios},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
