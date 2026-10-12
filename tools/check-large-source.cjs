const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),sandbox={console,TextDecoder,TextEncoder,Uint8Array,DataView,Set,Map};sandbox.window=sandbox;sandbox.self=sandbox;vm.createContext(sandbox);
for(const file of ['syntax.js','checker.js','malwatch.js','project-zip.js','vendor/acorn.js','vendor/php-parser.js','vendor/babel-parser.js','review-engine.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),sandbox,{filename:file});
const E=sandbox.ReviewEngine;
for(const ending of ['', '\n', '\r\n']){
 const code=Array.from({length:30000},()=> '// source').join(ending==='\r\n'?'\r\n':'\n')+ending;
 assert.equal(E.lineCount(code),30000);assert.equal(E.inputProblem(code),'');assert.ok(E.inputProblem(code+'\nextra'));
}
for(const language of ['php','typescript']){
 const lines=Array.from({length:30000},(_,i)=>language==='php'?`$v${i} = (${i} + 1);`:`const v${i}: number = (${i} + 1);`);if(language==='php')lines[0]='<?php '+lines[0];
 const start=performance.now(),code=lines.join('\n');assert.equal(E.local(code,language).errors.length,0);assert.equal(E.local(code,language).coverage.checkedLines,30000);
 lines[29999]=lines[29999].replace(');',';');assert.equal(E.local(lines.join('\n'),language).errors[0].line,30000);
 assert.equal(E.aiChunks(code,language).map(c=>c.text).join('\n'),code);console.log(`PASS ${language}: 30,000-line full grammar parse, final-line error, all AI chunks (${Math.round(performance.now()-start)}ms)`);
}
const content=Array.from({length:30000},(_,i)=>`const value${i} = ${i}; // ${'comment '.repeat(5)}`).join('\n');
const file={path:'src/large.js',name:'large.js',content,ext:'js',lines:30000,size:content.length};
const project=sandbox.ProjectZip.detectProject([file],'large.zip'),dossier=sandbox.ProjectZip.generateDossier(project),sections=E.sections(dossier,'javascript');
assert.equal(sections.length,1);assert.equal(sections[0].code,content);assert.equal(sections[0].complete,true);assert.equal(E.inputProblem(dossier),'');
const bigger={...file,content:content+'\nconst extra=1;',lines:30001};
const partial=sandbox.ProjectZip.generateDossier(sandbox.ProjectZip.detectProject([bigger],'too-big.zip'));
assert.ok(partial.includes('پوشش جزئی'));assert.equal(E.sections(partial,'javascript')[0].complete,false);assert.equal(E.lineCount(E.sections(partial,'javascript')[0].code),30000);assert.equal(E.inputProblem(partial),'');
console.log('PASS 30,000-line limit, final newline/CRLF, full ZIP source over 1MB and explicit partial ZIP coverage');
