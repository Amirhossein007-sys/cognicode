// MatrixRain in the real web/iOS/Android bundles: launch, contrast and lifecycle.
const {chromium,webkit}=require('playwright'),sharp=require('sharp');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url'),root=path.resolve(__dirname,'..');
const output=path.join(root,'artifacts/build-21-validation');fs.mkdirSync(output,{recursive:true});
const luminosity=rgb=>rgb.map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;}).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0);
async function canvasHash(page){return page.locator('#matrix-background canvas').evaluate(canvas=>{const bytes=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let hash=2166136261;for(let i=0;i<bytes.length;i++)hash=Math.imul(hash^bytes[i],16777619);return hash>>>0;});}
async function contrast(page,selector){
 const target=page.locator(selector).first();
 const data=await target.evaluate(el=>{const r=el.getBoundingClientRect();return {color:getComputedStyle(el).color,left:r.left,top:r.top,right:r.right,bottom:r.bottom};});
 await target.evaluate(el=>(el.closest('#highlight')||el).style.setProperty('opacity','0','important'));
 await page.clock.runFor(50);
 await target.evaluate(el=>getComputedStyle(el.closest('#highlight')||el).opacity);
 await page.waitForTimeout(100);
 const hiddenImage=await page.screenshot();
 const {data:pixels,info}=await sharp(hiddenImage).removeAlpha().raw().toBuffer({resolveWithObject:true});
 await target.evaluate(el=>(el.closest('#highlight')||el).style.removeProperty('opacity'));
 await page.clock.runFor(50);
 const foreground=luminosity(data.color.match(/[\d.]+/g).slice(0,3).map(Number));let minimum=100;
 for(let y=Math.max(0,Math.ceil(data.top));y<Math.min(info.height,data.bottom);y+=2) for(let x=Math.max(0,Math.ceil(data.left));x<Math.min(info.width,data.right);x+=2){
  const index=(y*info.width+x)*info.channels,background=luminosity([...pixels.subarray(index,index+3)]);
  minimum=Math.min(minimum,(Math.max(foreground,background)+.05)/(Math.min(foreground,background)+.05));
 }
 if(minimum<4.5){console.log('CONTRAST DIAGNOSTIC',selector,data,info,await page.evaluate(()=>devicePixelRatio));fs.writeFileSync(path.join(output,'contrast-diagnostic.png'),hiddenImage);}
  assert.ok(minimum>=4.5,selector+' pixel contrast '+minimum.toFixed(2));return Math.round(minimum*100)/100;
}
(async()=>{
 const measurements=[];
 for(const [engineName,engine] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await engine.launch({headless:true,...(engineName==='chromium'?{channel:process.env.BROWSER_CHANNEL||undefined}:{})});
  try{
   const sources=[['web',path.join(root,'index.html')],['ios',path.join(root,'native/Web/index.html')]];
   const androidFile=path.resolve(process.env.ANDROID_WEB_ROOT||path.join(root,'../cognicode-apk/app/src/main/assets/web'),'index.html');
   if(fs.existsSync(androidFile))sources.push(['android',androidFile]);
   else console.log('Android bundle absent: checking web and iOS in this checkout');
   for(const [platform,file] of sources) for(const theme of ['dark','light']){
    const page=await browser.newPage({viewport:{width:393,height:852},reducedMotion:'reduce',colorScheme:theme==='dark'?'light':'dark'});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(({theme,android})=>{
     localStorage.clear();localStorage.setItem('cognicode.theme',theme);if(android)window.AndroidBridge={};
     window.__matrixPaints=0;const fill=CanvasRenderingContext2D.prototype.fillRect;
     CanvasRenderingContext2D.prototype.fillRect=function(...args){if(this.canvas.parentElement?.id==='matrix-background')window.__matrixPaints++;return fill.apply(this,args);};
    },{theme,android:platform==='android'});
    await page.clock.install({time:new Date('2026-10-12T12:00:00Z')});await page.clock.pauseAt(new Date('2026-10-12T12:00:01Z'));
    await page.goto(pathToFileURL(file).href);
    await page.evaluate(()=>Promise.all([document.fonts.ready,document.querySelector('.launch-brain').decode()]));await page.clock.runFor(50);
    assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),theme,'Launch must honour stored theme');
    assert.equal(await page.locator('#launch-splash').isVisible(),true);
    assert.equal(await page.locator('#matrix-background canvas').count(),1);
    assert.equal(await page.locator('#particles-js,.sonar').count(),0);
    assert.equal(await page.evaluate(()=>typeof window.Sonar),'undefined');
    const background=await page.locator('#matrix-background').evaluate(el=>({pointer:getComputedStyle(el).pointerEvents,z:getComputedStyle(el).zIndex,visible:getComputedStyle(el).visibility}));
    assert.deepEqual(background,{pointer:'none',z:'0',visible:'visible'});
    const launchContrast=await contrast(page,'.launch-content p');
    await page.evaluate(()=>window.__sameMatrix=document.querySelector('#matrix-background canvas'));
    await page.clock.runFor(platform==='android'?300:3100);
    assert.equal(await page.locator('#launch-splash').isVisible(),false);
    assert.equal(await page.evaluate(()=>window.__sameMatrix===document.querySelector('#matrix-background canvas')),true);
    assert.equal(await page.evaluate(()=>document.getElementById('app').inert),false);
    await page.screenshot({path:path.join(output,'matrix-'+engineName+'-'+platform+'-'+theme+'.png')});
    const dateContrast=await contrast(page,'.radio-date'),brandContrast=await contrast(page,'.brand-txt b');
    await page.locator('#code').fill('const answer = 42;\n// توضیح خوانای فارسی\nconsole.log(answer);');await page.clock.runFor(150);
    await page.locator('#code').blur();
    const keywordContrast=await contrast(page,'.tk-c-kw'),commentContrast=await contrast(page,'.tk-c-com');
    const first=await canvasHash(page);await page.clock.runFor(1000);
    assert.equal(await canvasHash(page),first,'Reduced motion keeps the Matrix static');
    // Media-query change events and compositor frames follow real time. Resume
    // the clock for cadence/lifecycle checks after the deterministic launch.
    await page.clock.resume();
    await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(150);
    const count=await page.evaluate(()=>window.__matrixPaints);await page.waitForTimeout(1000);
    const paints=await page.evaluate(count=>window.__matrixPaints-count,count);
    assert.ok(paints>=14&&paints<=21,'20fps bound: '+paints);
    await page.evaluate(()=>window.dispatchEvent(new CustomEvent('cognicode:native-active',{detail:false})));
    const paused=await page.evaluate(()=>window.__matrixPaints);await page.waitForTimeout(1000);assert.equal(await page.evaluate(()=>window.__matrixPaints),paused);
    await page.evaluate(()=>window.dispatchEvent(new CustomEvent('cognicode:native-active',{detail:true})));
    await page.waitForTimeout(1000);assert.ok(await page.evaluate(paused=>window.__matrixPaints>paused,paused));
    await page.emulateMedia({reducedMotion:'reduce'});
    for(const width of [320,430,640]){await page.setViewportSize({width,height:width===320?568:852});await page.waitForTimeout(100);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
    await page.setViewportSize({width:740,height:360});await page.waitForTimeout(100);assert.ok((await page.locator('#editor').boundingBox()).height>=120);
    assert.ok(await page.locator('#key-open').evaluate(button=>{const r=button.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===button;}),'Matrix must allow button hit testing');
    assert.deepEqual(errors,[]);measurements.push({engineName,platform,theme,launchContrast,dateContrast,brandContrast,keywordContrast,commentContrast,paints});
    console.log('PASS Matrix '+engineName+' '+platform+' '+theme+': launch/app, pixel contrast, click-through, 20fps, pause/resume, motion and resize');await page.close();
   }
  }finally{await browser.close();}
 }
 fs.writeFileSync(path.join(output,'matrix-contrast.json'),JSON.stringify(measurements,null,2)+'\n');
})().catch(error=>{console.error(error);process.exitCode=1;});
