// Scroll correctness and interaction regressions, including a full 30,000-line file.
// No AI service or API key is used. Timing is reported, not asserted against a
// machine-dependent FPS threshold; DOM work and visible glyph alignment are checked.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');
const entry=process.env.COGNI_ENTRY||path.join(root,'index.html');
const widths=process.env.COGNI_SCROLL_WIDTH?[Number(process.env.COGNI_SCROLL_WIDTH)]:[393,1280];
const output=process.env.COGNI_OUTPUT||path.join(root,'artifacts/editor-scroll-validation');
fs.mkdirSync(output,{recursive:true});
const frames=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));

(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'chrome'});
 const results=[];
 try{for(const width of widths)for(const theme of ['dark','light']){
  const page=await browser.newPage({viewport:{width,height:852},hasTouch:true,isMobile:width<600});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(android=>{localStorage.clear();if(android)window.AndroidBridge={};},entry.replaceAll('\\','/').includes('/assets/web/'));
  await page.goto(pathToFileURL(entry).href);
  await page.locator('#launch-splash').waitFor({state:'hidden'});await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
  const source=Array.from({length:30000},(_,i)=>`const row_${i+1} = { text: "کد ${i+1} 🧠", enabled: true, value: ${i} };`).join('\n');
  await page.locator('#code').evaluate((ta,s)=>{ta.value=s;ta.dispatchEvent(new Event('input',{bubbles:true}));},source);
  await page.waitForFunction(()=>document.querySelector('#gutter').dataset.lines==='30000'&&document.querySelector('#hl-code').dataset.highlightState==='ready');
  const geometry=await page.evaluate(async()=>{
   const ta=document.querySelector('#code'),hl=document.querySelector('#highlight'),code=document.querySelector('#hl-code'),g=document.querySelector('#gutter');
   const source=ta.value,lines=source.split('\n'),lh=parseFloat(getComputedStyle(ta).lineHeight),out=[];
   function glyph(root,line){
    let current=+root.dataset.lineStart||0;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
    while((node=walker.nextNode())){let offset=0;for(const part of node.data.split('\n')){
     if(current===line&&part.length){const r=document.createRange();r.setStart(node,offset);r.setEnd(node,offset+1);return r.getBoundingClientRect();}
     offset+=part.length+1;if(offset<=node.data.length)current++;
    }}throw Error('Visible glyph missing: '+line);
   }
   const max=ta.scrollHeight-ta.clientHeight;
   for(const top of [0,137,25000,375000,max,375000,81,0]){
    ta.scrollTop=top;ta.scrollLeft=top?70:0;ta.dispatchEvent(new Event('scroll'));
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const start=+code.dataset.lineStart,end=+code.dataset.lineEnd;
    if(code.textContent!==lines.slice(start,end).join('\n')+'\n')throw Error('Rendered source differs');
    const line=Math.min(lines.length-1,Math.floor(ta.scrollTop/lh)+1);
    const a=glyph(code,line),b=glyph(g,line);
    if(Math.abs(a.top-b.top)>.7)throw Error('Number/text drift: '+(a.top-b.top));
    if(hl.scrollTop!==ta.scrollTop||g.scrollTop!==ta.scrollTop||hl.scrollLeft!==ta.scrollLeft)throw Error('Scroll layers disagree');
    const rows=Math.ceil(ta.clientHeight/lh);
    if(end-start>rows*3+22)throw Error('Unbounded rendered lines');
    out.push({top:ta.scrollTop,left:ta.scrollLeft,rendered:end-start});
   }
   if(ta.value!==source)throw Error('Scrolling changed source');
   return out;
  });
  await page.locator('#editor').evaluate(ed=>ed.dispatchEvent(new WheelEvent('wheel',{deltaY:-100,ctrlKey:true,bubbles:true,cancelable:true})));
  await page.waitForTimeout(200);
  await page.locator('#zoom-hud').evaluate(el=>el.click());
  assert.equal(await page.locator('#code').inputValue(),source,'zoom preserves complete source');
  // Keyboard navigation and native text selection retain the complete backing file.
  await page.locator('#code').evaluate(ta=>{ta.focus();ta.setSelectionRange(120,120);});
  await page.keyboard.press('ArrowRight');await page.keyboard.press('Shift+ArrowRight');
  assert.deepEqual(await page.locator('#code').evaluate(ta=>[ta.selectionStart,ta.selectionEnd]),[121,122]);
  await page.keyboard.insertText('/*scroll-test*/');await page.keyboard.press('Control+z');
  assert.equal(await page.locator('#code').inputValue(),source,'editing/undo preserves full source');
  if(width===393&&theme==='dark'){
   const cdp=await page.context().newCDPSession(page);
   async function moves(expression){const {result}=await cdp.send('Runtime.evaluate',{expression});const {listeners}=await cdp.send('DOMDebugger.getEventListeners',{objectId:result.objectId});return listeners.filter(l=>l.type==='touchmove'&&!l.passive).length;}
   assert.equal(await moves('document'),0,'normal scrolling must not have a document-level blocking touchmove');
   assert.equal(await moves('document.querySelector("#editor")'),0,'one-finger scrolling must not wait on pinch handling');
   const pinch=await page.evaluate(async()=>{
    const ed=document.querySelector('#editor'),ta=document.querySelector('#code');
    const before=parseFloat(getComputedStyle(ta).fontSize);
    const touch=(id,x)=>new Touch({identifier:id,target:ed,clientX:x,clientY:350});
    ed.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,cancelable:true,touches:[touch(1,100),touch(2,200)]}));
    ed.dispatchEvent(new TouchEvent('touchmove',{bubbles:true,cancelable:true,touches:[touch(1,80),touch(2,220)]}));
    ed.dispatchEvent(new TouchEvent('touchend',{bubbles:true,cancelable:true,touches:[]}));
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    return {before,after:parseFloat(getComputedStyle(ta).fontSize)};
   });
   assert.ok(pinch.after>pinch.before,'custom two-finger zoom remains functional');
   assert.equal(await moves('document.querySelector("#editor")'),0,'pinch blocker must be removed on release');
   await page.locator('#zoom-hud').evaluate(el=>el.click());
   await page.locator('#code').evaluate(ta=>{ta.blur();ta.scrollTop=5000;});await page.waitForTimeout(100);
   const box=await page.locator('#code').boundingBox(),before=await page.locator('#code').evaluate(ta=>ta.scrollTop);
   const x=box.x+box.width/2,y=box.y+box.height*.8;
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*12}]});await page.waitForTimeout(16);}
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(250);
   assert.ok(await page.locator('#code').evaluate(ta=>ta.scrollTop)>before+40,'real single-finger swipe scrolls natively');
   const recycling=await page.evaluate(async()=>{
    const ta=document.querySelector('#code'),code=document.querySelector('#hl-code');let changes=0,maxDom=0;
    const observer=new MutationObserver(rs=>{for(const r of rs)if(r.type==='childList')changes++;});observer.observe(code,{childList:true,subtree:true});
    for(let i=0;i<80;i++){ta.scrollTop=25000+i*15;ta.dispatchEvent(new Event('scroll'));await new Promise(requestAnimationFrame);maxDom=Math.max(maxDom,code.querySelectorAll('*').length);}
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));observer.disconnect();
    return {changes,maxDom};
   });
   assert.ok(recycling.changes<18,'token DOM should remain stable across ordinary scrolling: '+JSON.stringify(recycling));
   assert.ok(recycling.maxDom<2000,'visible DOM remains bounded');
   await page.waitForTimeout(400);assert.equal(await page.locator('html').evaluate(el=>el.classList.contains('editor-scrolling')),false,'idle state is restored after fling');
   results.push({width,theme,recycling,pinch});
   await page.screenshot({path:path.join(output,'editor-scroll-dark.png')});
  }
  const minified='const minified = '+Array.from({length:2000},(_,i)=>`item[${i}]`).join('+')+'; // <tag> & متن';
  await page.locator('#code').evaluate((ta,s)=>{ta.value=s;ta.dispatchEvent(new Event('input',{bubbles:true}));},minified);
  await page.waitForFunction(s=>document.querySelector('#hl-code').textContent===s+'\n'&&document.querySelector('#hl-code').dataset.highlightState==='ready',minified);
  assert.ok(await page.locator('#hl-code').evaluate(el=>el.querySelectorAll('*').length)<10,'very long minified lines must not create thousands of token nodes');
  await page.locator('#code').evaluate(ta=>{ta.scrollLeft=ta.scrollWidth;ta.dispatchEvent(new Event('scroll'));});
  await page.evaluate(frames);
  assert.deepEqual(await page.evaluate(()=>[document.querySelector('#code').scrollLeft,document.querySelector('#highlight').scrollLeft]),await page.locator('#code').evaluate(ta=>[ta.scrollLeft,ta.scrollLeft]));
  assert.equal(await page.locator('#code').inputValue(),minified,'horizontal scroll preserves full minified source');
  // Small files, then blank input, must discard previous virtualized content.
  for(const text of ['const small = 1;\n// فارسی','']){
   await page.locator('#code').evaluate((ta,s)=>{ta.value=s;ta.dispatchEvent(new Event('input',{bubbles:true}));},text);
   await page.waitForFunction(s=>document.querySelector('#hl-code').textContent===s+'\n',text);
  }
  assert.deepEqual(errors,[]);results.push({width,theme,geometry});await page.close();
 }}finally{await browser.close();}
 fs.writeFileSync(path.join(output,'editor-scroll-regressions.json'),JSON.stringify(results,null,2));
 console.log('PASS editor scroll: 30,000 lines; phone/desktop; light/dark; both axes and directions; rendered glyph alignment; source integrity; zoom; native swipe; bounded DOM; selection and undo; empty/small file reset.');
})().catch(e=>{console.error(e);process.exitCode=1;});
