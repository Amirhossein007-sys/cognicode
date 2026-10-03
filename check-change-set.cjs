const assert = require('node:assert/strict');
const {build, apply} = require('../change-set.js');
for (const [a,b] of [['','x'],['a\nb\nc\n','a\nnew\nc\n'],['a\nb','insert\na\nb'],['a\nb','a'],['a\na\nb','a\nb\na'],['a\n','a\n\n'],['x','x'],['a\nb\nc\nd','A\nb\nc\nD']]) {
  const patches=build(a,b);
  assert.equal(apply(a,a,patches,patches.map(p=>p.id)),b);
  assert.equal(apply(a,a,patches,[]),a);
  assert.throws(()=>apply(a,a+'changed',patches,patches.map(p=>p.id)),/تغییر/);
}
const base='a\nb\nc\nd', patches=build(base,'A\nb\nc\nD');
assert.equal(patches.length,2);
assert.equal(apply(base,base,patches,[patches[1].id]),'a\nb\nc\nD');
let seed=17;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed;};
for(let n=0;n<250;n++){
  const a=Array.from({length:rnd()%40},()=>String(rnd()%8)).join('\n');
  const b=Array.from({length:rnd()%40},()=>String(rnd()%8)).join('\n');
  const p=build(a,b);assert.equal(apply(a,a,p,p.map(x=>x.id)),b);
}
const large=Array.from({length:1100},(_,i)=>String(i)).join('\n');
assert.equal(build(large,large+'\nnew')[0].whole,true);
console.log('PASS exact patches: insert/delete/repeated lines, partial selection, stale rejection, large-file fallback, 250 randomized pairs');
