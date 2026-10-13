// Compare composited pixels, including the vignette, in both browser engines.
const {chromium,webkit}=require('playwright'), sharp=require('sharp');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),output=path.join(root,'artifacts/build-24-validation');
(async()=>{
  fs.mkdirSync(output,{recursive:true});const results=[];
  for(const engine of [chromium,webkit]) {
    const browser=await engine.launch({headless:true});
    try {
      const page=await browser.newPage({viewport:{width:393,height:852},reducedMotion:'reduce'});
      await page.goto(pathToFileURL(path.join(root,'native/Web/index.html')).href);
      await page.locator('#launch-splash').waitFor({state:'hidden'});
      await page.locator('#app').evaluate(el=>el.style.visibility='hidden');
      for(const theme of ['dark','light']) {
        await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;window.DataRain.refresh();},theme);
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        await page.evaluate(()=>window.DataRain.refresh());
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        const metric=async label=>{
          const bytes=await page.screenshot({path:path.join(output,`rain-${engine.name()}-${theme}-${label}.png`)});
          const {data,info}=await sharp(bytes).removeAlpha().raw().toBuffer({resolveWithObject:true});
          const base=theme==='light'?[246,248,252]:[8,14,27];let energy=0,visible=0;
          for(let i=0;i<data.length;i+=info.channels) {
            const delta=Math.max(...base.map((value,channel)=>Math.abs(value-data[i+channel])));
            energy+=delta;if(delta>=10)visible++;
          }
          return {meanChannelDifference:energy/(info.width*info.height),visiblePixels:visible};
        };
        const after=await metric('after');
        await page.evaluate(theme=>{
          const opacity=theme==='light'?'.48':'.62';
          const gradient=theme==='light'?'#f6f8fc66 0, #f6f8fcb3 100%':'#080e1b80 0, #080e1bb3 100%';
          document.querySelector('.dr-main').style.opacity=opacity;
          document.querySelector('.dr-vignette').style.background=`radial-gradient(ellipse at 50% 40%,${gradient})`;
        },theme);
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        const before=await metric('before');
        await page.evaluate(()=>{document.querySelector('.dr-main').style.removeProperty('opacity');document.querySelector('.dr-vignette').style.removeProperty('background');});
        assert.ok(after.visiblePixels>before.visiblePixels*1.35&&after.meanChannelDifference>before.meanChannelDifference,JSON.stringify({engine:engine.name(),theme,before,after}));
        results.push({engine:engine.name(),theme,before,after});
      }
    }finally{await browser.close();}
  }
  fs.writeFileSync(path.join(output,'rain-visibility.json'),JSON.stringify(results,null,2)+'\n');
  console.log('PASS composited rain visibility: '+JSON.stringify(results));
})().catch(error=>{console.error(error);process.exitCode=1;});
