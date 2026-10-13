const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../ai-reviewers.js'),'utf8'),sandbox);
const api=sandbox.window.AIReviewers,models=api.list({});assert.equal(models.length,5);assert.equal(new Set(models.map(model=>model.id)).size,5);assert.equal(models[4].model,'gemini-3.8-flash');
const reviews=models.map((model,index)=>({...model,report:{valid:true,errors:[],explanation:{summary:'review '+index,steps:[],uses:[],notes:[]},coverage:{totalChunks:1,reviewedChunks:1}}}));
let report=api.merge(reviews);assert.equal(report.incomplete,false);assert.equal(report.coverage.completedReviewers,5);assert.equal(report.reviewers.length,5);
reviews[1]={...models[1],error:'HTTP 503'};report=api.merge(reviews);assert.equal(report.incomplete,true);assert.equal(report.valid,false);assert.equal(report.coverage.completedReviewers,4);assert.ok(report.explanation.notes.some(note=>note.includes('Claude')&&note.includes('503')));
reviews[1]={...models[1],report:{valid:true,incomplete:true,errors:[],explanation:{notes:['Response was cut off']}}};report=api.merge(reviews);assert.equal(report.coverage.completedReviewers,4);assert.match(report.reviewers[1].error,/cut off/);
reviews[0].report.security={verdict:'malicious',confidence:'high',evidence:[{line:1,quote:'real source',verified:true}]};report=api.merge(reviews);assert.equal(report.security.verdict,'malicious');
console.log('PASS exactly five reviewers, honest partial coverage, per-model failures and verified security preservation');
