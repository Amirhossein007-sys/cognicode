const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../selection-explainer.js'),'utf8'),sandbox);const api=sandbox.window.SelectionExplanation;
const lines=['first','',...Array.from({length:30},(_,i)=>'const row'+i+'=1;'),'🌟'.repeat(4000),'last'];
const chunks=api.plan(lines.join('\n'),10),rebuilt=Array(lines.length).fill('');
for(const chunk of chunks){if(chunk.continuation){rebuilt[chunk.line-10]+=chunk.text;assert.ok(!/[\uD800-\uDBFF]$/.test(chunk.text));}else chunk.text.split('\n').forEach((line,i)=>rebuilt[chunk.line-10+i]=line);}
assert.deepEqual(rebuilt,lines);assert.ok(chunks.every(chunk=>chunk.text.length<=3000));
(async()=>{let calls=0;const text=await api.complete([{role:'user',content:'full source'}],async messages=>{assert.equal(messages[0].content,'full source');calls++;return {message:{content:['first partial','next partial','final complete'][calls-1]},finishReason:calls===3?'stop':'length'};},()=>{});
assert.equal(text,'first partialnext partialfinal complete');assert.equal(calls,3);
await assert.rejects(()=>api.complete([],async()=>({message:{content:'duplicate'},finishReason:'length'}),()=>{}),/توضیح کامل/);
let stopped=false;await assert.rejects(()=>api.complete([],async()=>{stopped=true;return {message:{content:'partial'},finishReason:'length'};},()=>{if(stopped){const error=Error('stop');error.name='AbortError';throw error;}}),error=>error.name==='AbortError');
console.log('PASS full source/blank-line/Unicode coverage, continuation instead of shortening, repeated-response guard and cancellation');})().catch(error=>{console.error(error);process.exitCode=1;});
