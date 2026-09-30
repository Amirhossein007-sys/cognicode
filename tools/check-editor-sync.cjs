// Editor alignment + scroll-sync regression checks.
//
// Guards three defects, all of which showed up as "the line numbers are not connected
// to the lines":
//
//  1. The gutter had `height: auto`, so its scrollHeight equalled its clientHeight and
//     `gutter.scrollTop = ta.scrollTop` was a silent no-op — the numbers never moved.
//  2. The error overlay and the gutter error dots have position:absolute children, so
//     they never build scrollable overflow and `scrollTop` on them was always 0. They
//     are now moved with translateY instead.
//  3. `#hl-code` fell back to the UA stylesheet's `code { font-family: monospace }`, so
//     the highlighted code rendered in a different font with a 27px line pitch while the
//     gutter and textarea used 25px — a permanent 240px drift by line 120.
//
// Defect 3 was invisible to a formula-based check (comparing `paddingTop + n*lineHeight`
// between layers), so this checker measures REAL rendered glyph positions with
// Range.getBoundingClientRect(). Do not replace these with arithmetic.
//
// Run: NODE_PATH=<playwright> BROWSER_CHANNEL=chrome node tools/check-editor-sync.cjs
const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const assert = require('node:assert/strict');

const LINES = 120;
const SAMPLE = Array.from({ length: LINES }, (_, i) => `const handler_${i + 1} = () => { return ${i + 1}; };`).join('\n');
const PROBE_LINES = [1, 2, 3, 20, 45, 60, 90, 119, 120];
const SCROLL_STEPS = [0, 137, 500, 1200, 2000];
const MARK_LINES = [20, 60, 90];
const TOLERANCE = 0.6;

// Injected helpers: real rendered geometry, not arithmetic. Everything is measured on
// demand, because a cached measurement goes stale as soon as a layer scrolls.
const HELPERS = `
window.__m = (function () {
  var hlCode = document.getElementById('hl-code');
  var gutter = document.getElementById('gutter');

  function allLineTops(root) {
    var tops = {};
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var line = 1, node;
    while ((node = walker.nextNode())) {
      var s = node.data, start = 0;
      for (;;) {
        var nl = s.indexOf('\\n', start);
        var end = nl < 0 ? s.length : nl;
        if (end > start && tops[line] === undefined) {
          var r = document.createRange();
          r.setStart(node, start);
          r.setEnd(node, start + 1);
          tops[line] = r.getBoundingClientRect().top;
        }
        if (nl < 0) break;
        line++; start = nl + 1;
      }
    }
    return tops;
  }

  function numberTop(lineNo) {
    var s = gutter.firstChild.data;
    var idx = 0, l = 1;
    while (l < lineNo) {
      var nl = s.indexOf('\\n', idx);
      if (nl < 0) return null;
      idx = nl + 1; l++;
    }
    var r = document.createRange();
    r.setStart(gutter.firstChild, idx);
    r.setEnd(gutter.firstChild, Math.min(s.length, idx + 1));
    return r.getBoundingClientRect().top;
  }

  function measure(lines) {
    var code = allLineTops(hlCode);
    var out = { code: {}, number: {} };
    lines.forEach(function (ln) {
      if (code[ln] !== undefined) out.code[ln] = code[ln];
      var n = numberTop(ln);
      if (n !== null) out.number[ln] = n;
    });
    return out;
  }

  return { measure: measure, allLineTops: allLineTops };
})();
`;

(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: 393, height: 852 } });
    await page.goto(pathToFileURL(path.resolve(__dirname, '../index.html')).href);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(600);

    await page.evaluate(code => {
      const ta = document.getElementById('code');
      ta.value = code;
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }, SAMPLE);
    await page.waitForTimeout(500);

    // ── 1. The gutter must be a real scroll container with the textarea's geometry
    const geo = await page.evaluate(() => {
      const ta = document.getElementById('code');
      const g = document.getElementById('gutter');
      const pre = document.getElementById('highlight');
      const csPre = getComputedStyle(pre);
      return {
        ta: { scrollH: ta.scrollHeight, max: ta.scrollHeight - ta.clientHeight },
        gutter: { clientH: g.clientHeight, scrollH: g.scrollHeight, max: g.scrollHeight - g.clientHeight },
        gutterOverflowY: getComputedStyle(g).overflowY,
        gutterPadTop: g.style.paddingTop,
        gutterPadBottom: g.style.paddingBottom,
        prePadTop: csPre.paddingTop,
        prePadBottom: csPre.paddingBottom,
        numbers: g.textContent.trim().split('\n').length,
      };
    });
    assert.equal(geo.numbers, LINES, 'gutter must render one number per line');
    assert.ok(geo.gutter.scrollH > geo.gutter.clientH,
      `gutter must be scrollable (scrollH ${geo.gutter.scrollH} > clientH ${geo.gutter.clientH}) — did .gutter lose height:100%?`);
    assert.equal(geo.gutterOverflowY, 'hidden', 'gutter must clip, not show a scrollbar');
    assert.equal(geo.gutter.scrollH, geo.ta.scrollH,
      'gutter scrollHeight must equal the textarea scrollHeight or the two clamp at different offsets');
    assert.equal(geo.gutter.max, geo.ta.max, 'gutter max scrollTop must equal the textarea max scrollTop');
    assert.equal(geo.gutterPadTop, geo.prePadTop, 'gutter padding-top must be synced from the code layer');
    assert.equal(geo.gutterPadBottom, geo.prePadBottom, 'gutter padding-bottom must be synced from the code layer');
    console.log(`PASS geometry: gutter is scrollable, ${geo.gutter.scrollH}px content in ${geo.gutter.clientH}px viewport`);

    // ── 2. Every layer must render on one shared line grid.
    //      This is the assertion that catches a font/metrics mismatch: if #hl-code falls
    //      back to the UA `monospace` font its pitch becomes 27px instead of 25px and the
    //      code visibly slides away from the numbers further down the file.
    await page.evaluate(HELPERS);
    const grid = await page.evaluate(() => {
      const ta = document.getElementById('code');
      const lh = parseFloat(getComputedStyle(ta).lineHeight);
      const preCode = document.getElementById('hl-code');
      const font = getComputedStyle(preCode).fontFamily;
      const taFont = getComputedStyle(ta).fontFamily;
      const tops = window.__m.allLineTops(document.getElementById('hl-code'));
      const pitch = [];
      for (let n = 1; n < 120; n++) {
        if (tops[n] === undefined || tops[n + 1] === undefined) continue;
        pitch.push(+(tops[n + 1] - tops[n]).toFixed(2));
      }
      const bad = pitch.filter(p => Math.abs(p - lh) > 0.3);
      return { lh, font, taFont, pitchCount: pitch.length, distinctPitches: [...new Set(pitch)], bad: bad.slice(0, 5) };
    });
    assert.equal(grid.font, grid.taFont,
      `the highlighted code must use the editor font, got ${grid.font} vs ${grid.taFont} — is .code-area pre code { font: inherit } missing?`);
    assert.equal(grid.bad.length, 0,
      `highlighted code must use the ${grid.lh}px line grid; measured pitches ${grid.distinctPitches.slice(0, 5).join(', ')}`);
    console.log(`PASS grid: code layer shares the editor font and the ${grid.lh}px line pitch (${grid.pitchCount} gaps checked)`);

    // ── 3. Real rendered alignment of every gutter number against its code line
    const rows = await page.evaluate(({ steps, lines }) => {
      const ta = document.getElementById('code');
      const g = document.getElementById('gutter');
      const out = [];
      steps.forEach(st => {
        ta.scrollTop = st;
        ta.dispatchEvent(new Event('scroll'));   // runs the app's real syncScroll
        const m = window.__m.measure(lines);     // measured fresh, after the scroll
        const row = { requested: st, taScrollTop: ta.scrollTop, gutterScrollTop: g.scrollTop, worst: 0, worstLine: null };
        lines.forEach(ln => {
          if (m.code[ln] === undefined || m.number[ln] === undefined) return;
          const delta = m.number[ln] - m.code[ln];
          if (Math.abs(delta) > Math.abs(row.worst)) { row.worst = +delta.toFixed(2); row.worstLine = ln; }
        });
        out.push(row);
      });
      return out;
    }, { steps: SCROLL_STEPS, lines: PROBE_LINES });

    rows.forEach(r => {
      assert.equal(r.gutterScrollTop, r.taScrollTop,
        `gutter must follow the textarea at scrollTop ${r.requested} (got ${r.gutterScrollTop})`);
      assert.ok(Math.abs(r.worst) <= TOLERANCE,
        `gutter number drifted ${r.worst}px from its own code line (line ${r.worstLine}) at scrollTop ${r.requested}`);
    });
    console.log(`PASS alignment: rendered number vs rendered code within ${TOLERANCE}px for ${PROBE_LINES.length} lines at ${SCROLL_STEPS.length} scroll positions`);

    // ── 4. Error markers must sit on their real code line, not on a computed guess
    await page.evaluate(lines => {
      const ta = document.getElementById('code');
      const errOv = document.getElementById('err-overlay');
      const gutErrs = document.getElementById('gutter-errs');
      const lh = parseFloat(getComputedStyle(ta).lineHeight);
      const padTop = parseFloat(getComputedStyle(ta).paddingTop);
      window.__marks = lines.map(ln => {
        const y = (ln - 1) * lh + padTop;
        const bar = document.createElement('div');
        bar.className = 'err-line';
        bar.style.top = y + 'px';
        bar.style.height = lh + 'px';
        errOv.appendChild(bar);
        const dot = document.createElement('i');
        dot.className = 'err';
        dot.style.top = y + 'px';
        gutErrs.appendChild(dot);
        return { ln, y };
      });
    }, MARK_LINES);

    const marks = await page.evaluate(({ steps, lines }) => {
      const ta = document.getElementById('code');
      const pre = document.getElementById('highlight');
      const lh = parseFloat(getComputedStyle(ta).lineHeight);
      const padTop = parseFloat(getComputedStyle(pre).paddingTop);
      const bars = document.querySelectorAll('#err-overlay .err-line');
      const dots = document.querySelectorAll('#gutter-errs i');
      const out = [];
      steps.forEach(st => {
        ta.scrollTop = st;
        ta.dispatchEvent(new Event('scroll'));
        const m = window.__m.measure(lines.concat([1]));
        // A glyph sits a few px inside its line box (the font's ascent gap), so the
        // marker boxes must be compared against the LINE BOX top, not the glyph top.
        // Calibrate that inset from line 1 instead of hard-coding a number. The pre's
        // border box does not move when it scrolls, so its own scrollTop must be
        // subtracted to get line 1's line-box top.
        const lineBoxTop1 = pre.getBoundingClientRect().top + padTop - pre.scrollTop;
        const inset = m.code[1] - lineBoxTop1;
        const row = { requested: st, taScrollTop: ta.scrollTop, items: [] };
        window.__marks.forEach((mk, i) => {
          if (m.code[mk.ln] === undefined) return;
          const lineBoxTop = m.code[mk.ln] - inset;
          const bar = bars[i].getBoundingClientRect();
          const dot = dots[i].getBoundingClientRect();
          row.items.push({
            ln: mk.ln,
            barDelta: +(bar.top - lineBoxTop).toFixed(2),
            dotDelta: +((dot.top + dot.height / 2) - (lineBoxTop + lh / 2)).toFixed(2),
            onScreen: bar.bottom > 0 && bar.top < window.innerHeight,
          });
        });
        out.push(row);
      });
      return out;
    }, { steps: SCROLL_STEPS, lines: MARK_LINES });

    marks.forEach(r => r.items.forEach(m => {
      assert.ok(Math.abs(m.barDelta) <= TOLERANCE,
        `error bar on line ${m.ln} drifted ${m.barDelta}px from the rendered code line at scrollTop ${r.requested}`);
      assert.ok(Math.abs(m.dotDelta) <= TOLERANCE,
        `gutter error dot on line ${m.ln} drifted ${m.dotDelta}px from the rendered code line at scrollTop ${r.requested}`);
    }));
    // markers below the fold must be clipped, and appear once scrolled to
    assert.equal(marks[0].items.find(i => i.ln === 90).onScreen, false,
      'a marker far below the fold must be clipped when scrollTop is 0');
    assert.equal(marks.find(r => r.taScrollTop === 2000).items.find(i => i.ln === 90).onScreen, true,
      'the line-90 marker must be visible after scrolling to it');
    console.log(`PASS markers: error bars and gutter dots sit on their real code lines and clip correctly`);

    await page.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
