// Exercise real Worker/importScripts over HTTP, with main-thread parsing disabled.
const {chromium,webkit}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 // WebKit upgrades loopback HTTP subresources under the production HTTPS CSP.
 // Relax that directive only in this local test response; shipping CSP is untouched.
 const server=http.createServer((req,res)=>{const relative=decodeURIComponent(req.url.split('?')[0]).replace(/^\//,'')||'index.html',file=path.resolve(root,relative);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.html')?'text/html':'application/octet-stream');const data=fs.readFileSync(file);res.end(file.endsWith('.html')?data.toString().replace('; upgrade-insecure-requests',''):data);}catch(_){res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{for(const [name,engine] of [['Chromium',chromium],['WebKit',webkit]]){
  const browser=await engine.launch({headless:true,channel:engine===chromium?process.env.BROWSER_CHANNEL||undefined:undefined});
  try{const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.waitForFunction(()=>window.ReviewEngine&&window.ReviewService);await page.evaluate(()=>{ReviewEngine.local=()=>{throw Error('main-thread fallback must not run');};});
   const result=await page.evaluate(async()=>{
    const code=Array.from({length:5000},(_,i)=>`const v${i} = (${i} + 1);`).join('\n'),start=performance.now();
    const good=await ReviewService.local(code,'javascript'),ms=performance.now()-start;
    const bad=await ReviewService.local(code.slice(0,-2)+';','javascript');
    return {good:good.errors.length,bad:bad.errors.map(e=>e.line),ms};
   });assert.equal(result.good,0);assert.deepEqual(result.bad,[5000]);console.log(`PASS ${name} real review worker: 5000-line full parse ${result.ms.toFixed(1)}ms; final-token mutation detected`);
  }finally{await browser.close();}
 }}finally{await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
