// Native bridge doubles exercise CSS geometry; hardware insets need device validation.
const {chromium,webkit} = require('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const root = path.resolve(__dirname,'..'), output = path.join(root,'artifacts/build-24-validation');
const android = path.join(process.env.COGNI_ANDROID_ROOT||path.resolve(root,'../cognicode-apk'),'app/src/main/assets/web/index.html');
const dimensions = [[320,568],[360,640],[393,852],[412,915],[432,960],[560,820],[568,320],[740,360],[852,393],[932,430],[1280,800]];
(async () => {
  fs.mkdirSync(output,{recursive:true});
  for (const [engine,platform] of [[chromium,'android'],[chromium,'ios'],[webkit,'ios']]) {
    const browser = await engine.launch({headless:true});
    const page = await browser.newPage({viewport:{width:393,height:852}, reducedMotion:'reduce',userAgent:platform==='android'?'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36':undefined});
    const errors=[]; page.on('pageerror', error=>errors.push(error.message));
    await page.addInitScript(android=>{
      if(android) window.AndroidBridge={};
      window.__rainFrames=0;
      const clear=CanvasRenderingContext2D.prototype.clearRect;
      CanvasRenderingContext2D.prototype.clearRect=function(...args){if(this.canvas.classList.contains('dr-main'))window.__rainFrames++;return clear.apply(this,args);};
      localStorage.setItem('cognicode.launch-seen.v1','1');
    },platform==='android');
    try {
      await page.goto(pathToFileURL(platform==='android'?android:path.join(root,'native/Web/index.html')).href);
      await page.locator('#launch-splash').waitFor({state:'hidden'});
      for(const [width,height] of dimensions) for(const theme of ['dark','light']) {
        await page.setViewportSize({width,height});
        const landscape=width>height;
        const insets=landscape?[24,24,28,0]:[32,24,0,0];
        await page.evaluate(({width,insets,theme,platform})=>{
          const root=document.documentElement;
          root.classList.remove('screen-compact','screen-standard','screen-large','screen-large-max');
          root.classList.add('has-notch',width<365?'screen-compact':width>=430?'screen-large-max':width>=412?'screen-large':'screen-standard');
          root.dataset.theme=theme;
          if(platform==='android') window.__onNativeInsetsChange(...insets,0);
          else ['sat','sab','sal','sar'].forEach((key,i)=>root.style.setProperty('--'+key,insets[i]+'px'));
        },{width,insets,theme,platform});
        await page.evaluate(()=>document.fonts.ready);
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        const state=await page.evaluate(()=>{
          const r=selector=>{const el=document.querySelector(selector),rect=el.getBoundingClientRect();return {x:rect.x,y:rect.y,right:rect.right,bottom:rect.bottom,width:rect.width,height:rect.height};};
          return {brand:r('.brand'),actions:r('.top-actions'),buttons:[...document.querySelectorAll('.top-actions button')].map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};}).sort((a,b)=>a.x-b.x),clock:r('.dial-clock'),editor:r('#editor'),bottom:r('.bottom'),scroll:document.documentElement.scrollWidth,
            safeTop:parseFloat(getComputedStyle(document.querySelector('.topbar')).paddingTop),sat:document.documentElement.style.getPropertyValue('--sat'),safe:getComputedStyle(document.documentElement).getPropertyValue('--safe-top'),zone:document.querySelector('.dial-zone'),clockLabel:document.querySelector('#tehran-clock').getAttribute('aria-label'),brandSize:parseFloat(getComputedStyle(document.querySelector('.dial-brand')).fontSize)};
        });
        const context=`${engine.name()} ${platform} ${width}x${height} ${theme}: ${JSON.stringify(state)}`;
        assert.ok(state.scroll<=width,context);
        assert.ok(state.safeTop>=insets[0]+4,context);
        assert.ok(state.buttons.every(button=>button.width>=44&&button.height>=44&&button.y>=insets[0]&&button.right<=width-insets[3]&&button.x>=insets[2]),context);
        for(let i=1;i<state.buttons.length;i++) assert.ok(state.buttons[i].x-state.buttons[i-1].right>=7.99,context);
        assert.ok(state.brand.x>=state.actions.right-0.1,context);
        assert.ok(state.clock.x>=insets[2]&&state.clock.right<=width-insets[3],context);
        assert.ok(state.editor.height>=64&&state.bottom.bottom<=height-insets[1]+1,context);
        assert.equal(state.zone,null); assert.ok(!state.clockLabel.includes('UTC'));
        assert.ok(state.brandSize<=25,context);
        if(width===393||width===432||width===740) await page.screenshot({path:path.join(output,`${platform}-${engine.name()}-${width}-${theme}.png`)});
      }
      if(platform==='android') {
        await page.setViewportSize({width:393,height:852});
        await page.emulateMedia({reducedMotion:'no-preference'});
        await page.waitForTimeout(450);
        const frames=()=>page.evaluate(()=>window.__rainFrames);
        const before=await frames(); await page.waitForTimeout(400); assert.ok(await frames()>before,'Idle rain must animate');
        await page.locator('#code').fill('const test = 1;');
        const focused=await frames(); await page.waitForTimeout(600); assert.equal(await frames(),focused,'Pause for the full editor focus, including gaps between edits');
        await page.locator('#code').evaluate(el=>el.blur()); await page.waitForTimeout(500);
        assert.ok(await frames()>focused,'Resume after keyboard focus ends');
        await page.locator('#btn-settings').click(); await page.waitForTimeout(500);
        const sheet=await frames(); await page.waitForTimeout(600); assert.equal(await frames(),sheet,'Pause while settings is open');
        await page.keyboard.press('Escape'); await page.waitForTimeout(500); assert.ok(await frames()>sheet);
        await page.evaluate(()=>window.dispatchEvent(new CustomEvent('cognicode:native-active',{detail:false})));
        const paused=await frames();await page.waitForTimeout(500);assert.equal(await frames(),paused);
        await page.evaluate(()=>window.dispatchEvent(new CustomEvent('cognicode:native-active',{detail:true})));await page.waitForTimeout(400);assert.ok(await frames()>paused);
        const blur=await page.locator('.icon-btn,.editor,.keys,.bottom,.sheet,.glass-workspace,.analysis-overlay,.dial-face').evaluateAll(elements=>elements.map(el=>getComputedStyle(el).backdropFilter));
        assert.ok(blur.every(value=>value==='none'),JSON.stringify(blur));
      }
      assert.deepEqual(errors,[]);
      console.log(`PASS ${engine.name()} ${platform}: both themes, ${dimensions.length} sizes, 4 insets, 44px controls, 8px gaps, clock, editor and footer${platform==='android'?', interaction/native lifecycle and no backdrop blur':''}`);
    } finally {await browser.close();}
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
