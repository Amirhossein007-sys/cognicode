// Offline correctness, source preservation and exact-edit safety. No API or execution of user code.
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const sandbox = { console, TextDecoder, TextEncoder, Uint8Array, DataView, Set, Map };
sandbox.window = sandbox; sandbox.self = sandbox;
vm.createContext(sandbox);
for (const file of ['syntax.js','checker.js','malwatch.js','project-zip.js','vendor/acorn.js','vendor/php-parser.js','vendor/babel-parser.js','review-engine.js']) vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),sandbox,{filename:file});
const {Checker, ReviewEngine:E, ProjectZip} = sandbox;
const php = `<?php
/** Plugin Name: Valid SEO Plugin */
add_action('wp_head', 'seo_head');
function seo_head() {
  $html = <<<'HTML'
<section xmlns="http://www.w3.org/1999/xhtml">
متن فارسی معتبر داخل افزونه
<script>const demo = "eval(x)"; const braces = "}]";</script>
</section>
HTML;
  echo $html;
}
?>
<p>این متن HTML معتبر است (و کد PHP نیست)</p>
<?php #[Deprecated] function old_hook() { return true; }
`;
assert.equal(Checker.staticCheck(php,'php').length,0);
assert.equal(Checker.extractCode(php,'php').code,php,'paste must preserve HTML and nowdoc text');
assert.equal(E.local(php,'php').errors.length,0,'a valid plugin must have no errors');
assert.equal(E.local(php,'php').warnings.length,0,'XML namespaces and quoted code are not connections/eval calls');
assert.ok(E.local('<?php $x = ;','php').errors.length,'PHP grammar error detected without an API');
assert.ok(E.local('const x = ;','javascript').errors.length,'JS grammar error detected without an API');
assert.ok(E.local('const marker = "/* ═══ درخت فایل‌های پروژه ═══ */";\nconst x = ;','javascript').errors.length,'a dossier marker inside source must not bypass parsing');
for (const [language,valid,broken] of [
 ['javascript','if (a<b) { console.log(a); }','if (a<b) { console.log(a; }'],
 ['javascript','const View = () => <div>{1}</div>;','const View = () => <div>{1}</span>;'],
 ['typescript','const total: number = (1 + 2);','const total: number = (1 + 2;'],
 ['typescript','const id = <T>(x: T): T => x;','const id = <T>(x: T: T => x;'],
 ['json','{"ok": [1, 2]}','{"ok": [1, 2}']
]) {
 assert.equal(E.local(valid,language).errors.length,0,'valid '+language);
 assert.ok(E.local(broken,language).errors.some(e=>e.source==='parser'),'missing token '+language);
 assert.equal(E.local(valid,language).errors.length,0,'repair invalidates broken cache');
}
for (const language of ['javascript','php']) {
 const lines=Array.from({length:6000},(_,i)=>language==='php'?`$v${i} = (${i} + 1);`:`const v${i} = (${i} + 1);`);
 if(language==='php')lines[0]='<?php '+lines[0];
 const valid=lines.join('\n'),start=performance.now();assert.equal(E.local(valid,language).errors.length,0);
 console.log(`FULL SCAN ${language} 6000 lines: ${(performance.now()-start).toFixed(1)}ms`);
 for(const index of [0,3000,5999]) {
  const bad=lines.slice();bad[index]=bad[index].replace(');',';');
  const result=E.local(bad.join('\n'),language);assert.ok(result.errors.length,'token removed at '+(index+1));assert.equal(result.errors[0].line,index+1);
  const ledger=E.reconcile(result.errors, bad.join('\n'),valid,E.local(valid,language).errors,language);assert.ok(ledger.every(e=>e.state==='resolved'));
 }
 const chunks=E.aiChunks(valid,language);assert.equal(chunks.map(c=>c.text).join('\n'),valid,'AI chunk plan covers every source byte');
}
const semantic={source:'ai',line:1,quote:'x.foo()',message:'null access',severity:'error'};
assert.equal(E.reconcile([semantic],'x.foo()','x?.foo()',[],'javascript')[0].state,'pending','editing AI evidence is not proof of semantic repair');
for (const code of ['const سلام = 1; console.log(سلام);','export const x = await Promise.resolve(1);','const x = `سلام\nمتن فارسی`;','function f() { return /[}]/.test("}"); }']) assert.equal(E.local(code,'javascript').errors.length,0,code);
assert.ok(Checker.staticCheck('<?php $s = <<<END\ntext\n','php').some(e=>e.message.includes('heredoc')),'unterminated heredoc remains a real error');
const files = [{path:'plugin/main.php',content:php,ext:'php'}, {path:'plugin/a.js',content:'const x = 1;\n',ext:'js'}, {path:'plugin/a.css',content:'body { color: red; }',ext:'css'}].map(f=>({...f,lines:f.content.split('\n').length,size:f.content.length,name:f.path.split('/').pop()}));
const project=ProjectZip.detectProject(files,'plugin.zip'), dossier=ProjectZip.generateDossier(project);
assert.equal(E.local(dossier,'php').errors.length,0,'mixed PHP/JS/CSS project is checked file by file');
assert.equal(E.sections(dossier,'php').length,3);
const broken=DossierWith('const broken = ;');
function DossierWith(code) { return ProjectZip.generateDossier(ProjectZip.detectProject([{...files[1],content:code,lines:1,size:code.length}],'sample.zip')); }
const result=E.local(broken,'php'); assert.equal(result.errors[0].file,'plugin/a.js'); assert.equal(result.errors[0].fileLine,1);
const bigPhp=php+'\nfunction partial() {\n'+'  $x = 1;\n'.repeat(140000)+'}\n';
const partial=ProjectZip.generateDossier(ProjectZip.detectProject([{...files[0],content:bigPhp,lines:bigPhp.split('\n').length,size:bigPhp.length},files[1]],'big.zip'));
assert.equal(E.local(partial,'php').partial,true); assert.equal(E.local(partial,'php').errors.length,0,'truncated excerpt must not create missing EOF errors');
const base='const total = (2 + 3;\nconsole.log(total);\n', issues=[{line:1,severity:'error'}];
const edit={before:'const total = (2 + 3;',after:'const total = (2 + 3);'};
assert.equal(E.applyEdits(base,[edit],issues,'javascript'),'const total = (2 + 3);\nconsole.log(total);\n','only the exact block changes and trailing newline is preserved');
for (const edits of [[{before:'missing',after:'x'}],[{before:'const',after:'let'},{before:'const total',after:'let total'}],[{before:edit.before,after:'const total = ;'}]]) assert.throws(()=>E.applyEdits(base,edits,issues,'javascript'));
assert.throws(()=>E.applyEdits('x();\nx();',[{before:'x();',after:'y();'}],issues,'javascript'),'ambiguous anchors rejected');
assert.throws(()=>E.applyEdits(base,[edit],[{line:99}],'javascript'),'unrelated edits rejected');
const evidence={line:1,quote:edit.before,reason:'An opening parenthesis has no matching closing parenthesis.',confidence:'high',message:'براکت باز'};
assert.equal(E.confirmIssues([evidence],base,'javascript').length,1);
for (const bad of [{...evidence,quote:'not in source'},{...evidence,confidence:'low'},{...evidence,reason:''},{...evidence,line:999}]) assert.equal(E.confirmIssues([bad],base,'javascript').length,0);
const large=Array.from({length:1071},(_,i)=>`const value_${i} = ${i};`).join('\n');
const start=performance.now(); const first=E.local(large,'javascript'); const elapsed=performance.now()-start;
const repeatStart=performance.now(); for(let i=0;i<100;i++) assert.equal(E.local(large,'javascript'),first); const cached=performance.now()-repeatStart;
console.log(`PASS offline: valid plugin, PHP/JS grammar errors, Unicode, literal preservation, mixed ZIP, partial coverage, file locations, exact patches and evidence. 1071 lines: ${elapsed.toFixed(1)}ms; 100 cached scans: ${cached.toFixed(2)}ms (desktop Node, not an iPhone benchmark).`);
