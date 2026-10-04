const {chromium}=require('playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||undefined});
 const output=path.resolve(__dirname,'../artifacts/build-9-tool-preview');fs.mkdirSync(output,{recursive:true});
 try {for(const source of ['index.html','native/Web/index.html']) {
  const page=await browser.newPage({viewport:{width:393,height:852},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  // Deterministic start: a draft/session restored from a previous page must never
  // overwrite what this test types, and the drag-to-scroll detector must not see a
  // stray mousemove between mousedown and mouseup (it would swallow the click).
  await page.addInitScript(()=>{localStorage.clear();localStorage.setItem('cognicode.launch-seen.v1','1');localStorage.setItem('cognicode.settings.v1',JSON.stringify({hist:false}));});
  await page.goto(pathToFileURL(path.resolve(__dirname,'..',source)).href);
  await page.locator('#launch-splash').waitFor({state:'hidden'});
  await page.evaluate(()=>window.WorkspaceStore?window.WorkspaceStore.ready.then(()=>true):true);
  await page.waitForTimeout(600);
  await page.mouse.move(4,4);
  await page.locator('#key-focus').click();assert.equal(await page.locator('#key-focus').getAttribute('aria-pressed'),'true');
  assert.match(await page.locator('#key-focus').innerText(),/تمرکز/);
  await page.locator('#key-focus').click();assert.equal(await page.locator('#key-focus').getAttribute('aria-pressed'),'false');
  await page.locator('#code').fill('const a = 1;\nconsole.log(a);');
  await page.locator('#code').evaluate(el=>{el.setSelectionRange(18,18);});
  await page.mouse.move(4,4);
  await page.locator('#key-explain').click();await page.locator('#sheet-selection').waitFor({state:'visible'});
  assert.equal(await page.locator('#selection-code').innerText(),'console.log(a);');
  await page.keyboard.press('Escape');
  await page.locator('#sheet-selection').waitFor({state:'hidden'});
  await page.locator('#code').evaluate(el=>el.setSelectionRange(0,12));
  await page.mouse.move(4,4);
  await page.locator('#key-explain').click();await page.locator('#sheet-selection').waitFor({state:'visible'});
  assert.equal(await page.locator('#selection-code').innerText(),'const a = 1;');
  await page.keyboard.press('Escape');
  await page.locator('#sheet-selection').waitFor({state:'hidden'});
  await page.waitForTimeout(3600);
  for(const width of [320,393,440]) {await page.setViewportSize({width,height:width===320?568:852});
   for(const theme of ['dark','light']) {
    await page.evaluate(t=>{document.documentElement.dataset.theme=t;document.querySelector('#btn-play').classList.add('loading');document.querySelector('#btn-play').disabled=true;},theme);
    const result=await page.locator('#btn-play').evaluate(el=>{const css=getComputedStyle(el),spin=getComputedStyle(el,'::after'),label=el.querySelector('.play-label').getBoundingClientRect(),r=el.getBoundingClientRect(),wave=getComputedStyle(document.querySelector('.brain-marquee'));return {direction:css.flexDirection,opacity:css.opacity,spinH:parseFloat(spin.height),labelBottom:label.bottom,buttonBottom:r.bottom,gap:parseFloat(css.rowGap),bg:wave.backgroundImage,animation:getComputedStyle(document.querySelector('.brain-marquee-track')).animationName,width:document.documentElement.scrollWidth};});
    assert.equal(result.direction,'row');assert.equal(result.opacity,'1');assert.ok(result.labelBottom<=result.buttonBottom-5);assert.ok(result.bg.includes('linear-gradient'));assert.ok(result.width<=width);
    if(width===393&&source==='index.html')await page.screenshot({path:path.join(output,'loading-'+theme+'.png')});
   }
  }
  assert.deepEqual(errors,[]);await page.close();console.log('PASS '+source+': named tools, focus toggle, current line and selected text, contained analysis button, grid in both themes at 320/393/440');
 }}finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
