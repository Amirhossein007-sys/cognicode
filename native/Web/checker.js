/* ═══════════════════════════════════════════════
   کدنما — موتور بررسی محلی کد
   ۱) بررسی ساختاری: براکت‌ها، رشته‌ها و کامنت‌ها
   ۲) هشدارهای سبک: حلقه بی‌نهایت، eval، کلید هاردکد…
   ۳) توضیح‌ساز آفلاین (وقتی هوش مصنوعی در دسترس نیست)
   ═══════════════════════════════════════════════ */
'use strict';

window.Checker = (function () {

  var FA = '۰۱۲۳۴۵۶۷۸۹';
  function fa(x) { return String(x).replace(/[0-9]/g, function (d) { return FA[+d]; }); }

  /* ── پیکربندی اسکن هر زبان ──
     CLIKE: ' برای کاراکتر-لیترال C-خانواده ('"') اضافه شد تا پرانتز/براکت داخل
     آن به‌عنوان کد شمرده نشود. regex: برای شناسایی /.../ در js/ts/go. */
  var CLIKE = { line: '//', block: ['/*', '*/'], quotes: ['"', "'"], escape: true };
  var CONF = {
    swift:      { line: '//', block: ['/*', '*/'], quotes: ['"'], escape: true, triple: '"""' },
    javascript: { line: '//', block: ['/*', '*/'], quotes: ['"', "'", '`'], escape: true, multiline: ['`'], regex: true },
    typescript: { line: '//', block: ['/*', '*/'], quotes: ['"', "'", '`'], escape: true, multiline: ['`'], regex: true },
    java:       CLIKE,
    c:          CLIKE,
    cpp:        CLIKE,
    csharp:     CLIKE,
    kotlin:     CLIKE,
    dart:       CLIKE,
    go:         { line: '//', block: ['/*', '*/'], quotes: ['"', "'", '`'], escape: true, multiline: ['`'], regex: true },
    rust:       { line: '//', block: ['/*', '*/'], quotes: ['"'], escape: true },
    php:        CLIKE,
    ruby:       { line: '#', block: null, quotes: ['"', "'"], escape: true },
    python:     { line: '#', block: null, quotes: ['"', "'"], escape: true, triple: ['"""', "'''"] },
    bash:       { line: '#', block: null, quotes: ['"', "'"], escape: true },
    css:        { line: null, block: ['/*', '*/'], quotes: ['"', "'"], escape: false },
    json:       { line: null, block: null, quotes: ['"'], escape: true },
    sql:        { line: '--', block: ['/*', '*/'], quotes: ["'"], escape: false },
    html:       null,
    text:       null,
    objectivec: CLIKE,
    scala:      CLIKE,
    /* گرووی: کوتیشن‌های تکی/دوتایی تک‌خطی‌اند؛ فقط حالت سه‌گانه چندخطی است */
    groovy:     { line: '//', block: ['/*', '*/'], quotes: ['"', "'"], escape: true, triple: ['"""', "'''"] },
    solidity:   CLIKE,
    perl:       { line: '#', block: null, quotes: ['"', "'"], escape: true },
    lua:        { line: '--', block: null, quotes: ['"', "'"], escape: true },
    r:          { line: '#', block: null, quotes: ['"', "'"], escape: true },
    julia:      { line: '#', block: null, quotes: ['"'], escape: true },
    haskell:    { line: '--', block: ['{-', '-}'], quotes: ['"'], escape: true },
    elixir:     { line: '#', block: null, quotes: ['"', "'"], escape: true },
    /* متلب: ' بعد از اتم (شناسه/عدد/براکت بسته) ترنسپوز است نه شروع رشته */
    matlab:     { line: '%', block: null, quotes: ["'"], escape: false, aposAfterAtom: true },
    vb:         { line: "'", block: null, quotes: ['"'], escape: false },
    pascal:     { line: '//', block: ['{', '}'], quotes: ["'"], escape: false },
    fsharp:     { line: '//', block: ['(*', '*)'], quotes: ['"'], escape: true, triple: ['"""'] },
    asm:        { line: ';', block: null, quotes: ['"', "'"], escape: true }
  };

  var PAIRS = { ')': '(', ']': '[', '}': '{' };
  var CLOSER = { '(': ')', '[': ']', '{': '}' };

  /* ── هلپرهای رجکس-لیترال (js/ts/go) و ترنسپوز متلب ──
     تشخیص تقسیم یا شروع رجکس با «کاراکثر معنادار قبلی»: بعد از شناسه/عدد/براکت
     بسته تقسیم است؛ بعد از اپراتور یا کلیدواژه، شروع رجکس. */
  var REGEX_PREV_OPS = '(,=:[!&|?;{}+-*%~^<>';
  var REGEX_KEYWORDS = /^(?:return|typeof|instanceof|in|of|new|delete|void|case|do|else|yield|await|throw)$/;
  function regexLiteralStart(code, i) {
    var j = i - 1;
    while (j >= 0 && (code[j] === ' ' || code[j] === '\t' || code[j] === '\n' || code[j] === '\r')) j--;
    if (j < 0) return true; // شروع فایل
    var c = code[j];
    if (REGEX_PREV_OPS.indexOf(c) >= 0) return true;
    if (/[A-Za-z0-9_$]/.test(c)) {
      var k = j;
      while (k >= 0 && /[A-Za-z0-9_$]/.test(code[k])) k--;
      return REGEX_KEYWORDS.test(code.slice(k + 1, j + 1));
    }
    return false;
  }
  function regexLiteralEnd(code, i) {
    var j = i + 1, inClass = false;
    while (j < code.length) {
      var c = code[j];
      if (c === '\\') { j += 2; continue; }
      if (c === '\n') return -1; // رجکس نمی‌تواند خط بشکند → تقسیم است
      if (inClass) { if (c === ']') inClass = false; }
      else if (c === '[') inClass = true;
      else if (c === '/') {
        j++;
        while (j < code.length && /[a-z]/i.test(code[j])) j++; // فلگ‌ها
        return j;
      }
      j++;
    }
    return -1;
  }
  function prevAtomEnd(code, i) {
    var j = i - 1;
    while (j >= 0 && (code[j] === ' ' || code[j] === '\t')) j--;
    return j >= 0 && /[A-Za-z0-9_\)\]\}.'"]/.test(code[j]);
  }
  /* کاراکتر-لیترال زبان راست ('c' یا '\n' یا '\'') تا با پرانتز/براکت اشتباه نشود و لایف‌تایم ('a) را خراب نکند */
  function isRustCharLiteral(code, i) {
    if (code[i] !== "'") return false;
    if (code[i + 1] !== '\\' && code[i + 1] !== '\n' && code[i + 2] === "'") return true;
    if (code[i + 1] === '\\') {
      var q = code.indexOf("'", i + 2);
      if (q > 0 && q <= i + 12 && code.slice(i, q).indexOf('\n') === -1) return true;
    }
    return false;
  }

  /* ── بررسی ساختاری: براکت، رشته، کامنت ── */
  function staticCheck(code, langKey) {
    var conf = CONF[langKey];
    var errors = [];
    if (!conf || !code) return errors;

    function err(ln, cl, msg, hint) {
      if (errors.length < 25) errors.push({ line: ln, column: cl, severity: 'error', message: msg, hint: hint || '' });
    }

    // خطاهای ساختاری انتهای فایل (کامنت/رشته/براکت بازمانده) مهم‌ترین‌ها هستند
    // و نباید قربانی سقف ضد-اسپم ۲۵تایی خطاهای میانی شوند
    function errAlways(ln, cl, msg, hint) {
      errors.push({ line: ln, column: cl, severity: 'error', message: msg, hint: hint || '' });
    }

    var stack = [];
    var state = 'code';        // code | lcom | bcom | str | tstr
    var quote = '', blockEnd = '', tripleMark = '';
    var sLine = 1, sCol = 1;
    var line = 1, col = 1;
    var i = 0, n = code.length;

    while (i < n) {
      var ch = code[i];

      if (ch === '\n') {
        if (state === 'str') {
          var multiline = conf.multiline && conf.multiline.indexOf(quote) >= 0;
          if (!multiline) {
            err(sLine, sCol, 'رشته با «' + quote + '» در خط ' + fa(sLine) + ' بسته نشده', 'کوتیشن پایانی رشته را اضافه کن');
            state = 'code';
          }
        }
        if (state === 'lcom') state = 'code';
        line++; col = 1; i++;
        continue;
      }

      if (state === 'code') {
        if (conf.line && code.startsWith(conf.line, i)) {
          state = 'lcom'; i += conf.line.length; col += conf.line.length; continue;
        }
        if (conf.block && code.startsWith(conf.block[0], i)) {
          state = 'bcom'; blockEnd = conf.block[1]; sLine = line; sCol = col;
          i += conf.block[0].length; col += conf.block[0].length; continue;
        }
        if (conf.regex && ch === '/' && regexLiteralStart(code, i)) {
          var reEnd = regexLiteralEnd(code, i);
          if (reEnd > 0) { col += (reEnd - i); i = reEnd; continue; }
        }
        if (langKey === 'rust' && isRustCharLiteral(code, i)) {
          var endQr = code.indexOf("'", i + (code[i + 1] === '\\' ? 2 : 1));
          if (endQr > i) { col += (endQr + 1 - i); i = endQr + 1; continue; }
        }
        if (conf.quotes.indexOf(ch) >= 0) {
          if (conf.aposAfterAtom && prevAtomEnd(code, i)) { i++; col++; continue; } // ترنسپوز، نه رشته
          sLine = line; sCol = col;
          var isTriple = false;
          if (conf.triple) {
            var marks = Array.isArray(conf.triple) ? conf.triple : [conf.triple];
            for (var t = 0; t < marks.length; t++) {
              if (marks[t][0] === ch && code.startsWith(marks[t], i)) { isTriple = true; tripleMark = marks[t]; break; }
            }
          }
          if (isTriple) { state = 'tstr'; i += tripleMark.length; col += tripleMark.length; }
          else { state = 'str'; quote = ch; i++; col++; }
          continue;
        }
        if (ch === '(' || ch === '[' || ch === '{') {
          stack.push({ ch: ch, line: line, col: col });
          i++; col++; continue;
        }
        if (ch === ')' || ch === ']' || ch === '}') {
          var top = stack.pop();
          if (!top) {
            err(line, col, '«' + ch + '» بسته شده ولی بازشدهٔ متناظری ندارد', 'یک «' + PAIRS[ch] + '» جا افتاده یا این «' + ch + '» اضافی است');
          } else if (top.ch !== PAIRS[ch]) {
            err(line, col, 'بسته‌شدن ناهماهنگ: «' + ch + '» ولی آخرین بازشده «' + top.ch + '» در خط ' + fa(top.line) + ' بود', 'باید به‌جای «' + ch + '» از «' + CLOSER[top.ch] + '» استفاده شود');
          }
          i++; col++; continue;
        }
        i++; col++;
        continue;
      }

      if (state === 'lcom') { i++; col++; continue; }

      if (state === 'bcom') {
        if (code.startsWith(blockEnd, i)) { state = 'code'; i += blockEnd.length; col += blockEnd.length; }
        else { i++; col++; }
        continue;
      }

      if (state === 'str') {
        if (conf.escape && ch === '\\') {
          // خط م continuado: newline مصرف‌شده باید شمارندهٔ خط را هم جلو ببرد
          if (code[i + 1] === '\n') { line++; col = 1; i += 2; }
          else { i += 2; col += 2; }
          continue;
        }
        if (ch === quote) { state = 'code'; }
        i++; col++;
        continue;
      }

      if (state === 'tstr') {
        if (code.startsWith(tripleMark, i)) { state = 'code'; i += tripleMark.length; col += tripleMark.length; }
        else { i++; col++; }
        continue;
      }
    }

    if (state === 'bcom') errAlways(sLine, sCol, 'کامنت بلوکی که در خط ' + fa(sLine) + ' باز شده بسته نشده', 'با «' + blockEnd + '» ببندش');
    if (state === 'tstr') errAlways(sLine, sCol, 'رشتهٔ چندخطی که در خط ' + fa(sLine) + ' باز شده بسته نشده', 'علامت پایانی ' + tripleMark + ' را اضافه کن');
    if (state === 'str') errAlways(sLine, sCol, 'رشته‌ای که در خط ' + fa(sLine) + ' با «' + quote + '» باز شده بسته نشده', 'کوتیشن پایانی را اضافه کن');
    for (var k = 0; k < stack.length && k < 6; k++) {
      var o = stack[k];
      errAlways(o.line, o.col, '«' + o.ch + '» بازشده در خط ' + fa(o.line) + ' هرگز بسته نشد', 'جای «' + CLOSER[o.ch] + '» را پیدا و اضافه کن');
    }
    return errors;
  }

  /* ── حذف فقط کامنت‌ها (رشته‌ها با محتوا حفظ می‌شوند) ──
     هشدارهای سبک باید بر «کد» سنجیده شوند نه کامنت‌ها؛ مثلاً http:// داخل
     کامنتِ آموزشی نباید هشدار «اتصال ناامن» بسازد. رشته‌ها حفظ می‌شوند چون
     هشدارهایی مثل «کلید هاردکد» روی مقدارِ رشته سنجیده می‌شوند.
     شمارهٔ خطوط حفظ می‌شود (خروجی خط‌به‌خط است). */
  function commentFreeLines(code, conf) {
    if (!code) return [];
    if (!conf) return code.split('\n');
    var out = [], buf = '';
    var state = 'code', quote = '', blockEnd = '', tripleMark = '';
    var i = 0, n = code.length;
    while (i < n) {
      var ch = code[i];
      if (ch === '\n') {
        if (state === 'lcom') state = 'code';
        /* رشتهٔ تک‌خطی بسته‌نشده: از خط بعد دوباره کد است (ساده‌سازی عمدی) */
        if (state === 'str' && !(conf.multiline && conf.multiline.indexOf(quote) >= 0)) state = 'code';
        out.push(buf); buf = ''; i++; continue;
      }
      if (state === 'code') {
        if (conf.line && code.startsWith(conf.line, i)) { state = 'lcom'; i += conf.line.length; continue; }
        if (conf.block && code.startsWith(conf.block[0], i)) { state = 'bcom'; blockEnd = conf.block[1]; i += conf.block[0].length; continue; }
        if (conf.regex && ch === '/' && regexLiteralStart(code, i)) {
          var reEnd = regexLiteralEnd(code, i);
          if (reEnd > 0) { buf += code.slice(i, reEnd); i = reEnd; continue; }
        }
        if (conf.quotes.indexOf(ch) >= 0) {
          if (conf.aposAfterAtom && prevAtomEnd(code, i)) { buf += ch; i++; continue; }
          /* آپاستروفِ متنی (don't) یا جداکنندهٔ رقم C++ (1'000) بعد از حرف/عدد
             رشتهٔ جعلی نمی‌سازد که نیمهٔ بقیهٔ خط بلعیده شود */
          if (ch === "'" && conf.escape && i > 0 && /[A-Za-z0-9_$]/.test(code[i - 1])) { buf += ch; i++; continue; }
          var isTriple = false;
          if (conf.triple) {
            var marks = Array.isArray(conf.triple) ? conf.triple : [conf.triple];
            for (var t = 0; t < marks.length; t++) {
              if (marks[t][0] === ch && code.startsWith(marks[t], i)) { isTriple = true; tripleMark = marks[t]; break; }
            }
          }
          if (isTriple) { state = 'tstr'; buf += tripleMark; i += tripleMark.length; }
          else { state = 'str'; quote = ch; buf += ch; i++; }
          continue;
        }
        buf += ch; i++; continue;
      }
      if (state === 'lcom') { i++; continue; }
      if (state === 'bcom') {
        if (code.startsWith(blockEnd, i)) { state = 'code'; i += blockEnd.length; } else i++;
        continue;
      }
      if (state === 'str') {
        if (conf.escape && ch === '\\') {
          if (code[i + 1] === '\n') { out.push(buf + ch); buf = ''; i += 2; continue; }
          buf += ch;
          if (i + 1 < n) { buf += code[i + 1]; i += 2; continue; }
          i++; continue;
        }
        if (ch === quote) state = 'code';
        buf += ch; i++; continue;
      }
      if (state === 'tstr') {
        if (code.startsWith(tripleMark, i)) { state = 'code'; buf += tripleMark; i += tripleMark.length; }
        else { buf += ch; i++; }
        continue;
      }
    }
    out.push(buf);
    return out;
  }

  /* ── هشدارهای سبک ── */
  var LINT = [
    { rx: /while\s*\(\s*(?:true|1)\s*\)|while\s+True\b/, msg: 'حلقهٔ بی‌نهایت بالقوه', hint: 'شرط خروج باید داخل بدنهٔ حلقه برقرار شود' },
    { rx: /\beval\s*\(|\bexec\s*\(/, msg: 'استفاده از eval/exec ریسک امنیتی دارد', hint: 'ورودی کاربر را هرگز مستقیم به eval نده' },
    { rx: /http:\/\/(?!localhost|127\.0\.0\.1)/, msg: 'اتصال ناامن HTTP به‌جای HTTPS', hint: '' },
    { rx: /(?:password|passwd|secret|api[_-]?key|apikey|token)\s*[:=]\s*["'][^"']{4,}["']/i, msg: 'احتمال قرارگرفتن کلید یا رمز به‌صورت مستقیم در کد', hint: 'مقادیر حساس را از متغیر محیطی یا فایل تنظیمات بخوان' },
    { rx: /catch\s*\([^)]*\)\s*\{\s*\}|except\s*:\s*(?:pass\s*)?(?:#.*)?$/, msg: 'خطاها بی‌صدا نادیده گرفته می‌شوند (catch/except خالی)', hint: 'لااقل خطا را ثبت (log) کن' },
    /* todo:true → فقط این قاعده روی خطوط خام اجرا می‌شود چون TODO ذاتاً داخل کامنت زندگی می‌کند */
    { rx: /\bTODO\b|\bFIXME\b/, msg: 'یادداشت کار ناتمام (TODO/FIXME) در کد هست', hint: '', todo: true }
  ];

  function lintWarnings(code, langKey) {
    var out = [], seen = {};
    if (!code) return out;
    var rawLines = code.split('\n');
    /* قواعد روی «کد بدون کامنت» اجرا می‌شوند تا مثال‌های داخل کامنتِ آموزشی
       هشدار کاذب نسازند؛ فقط قاعدهٔ TODO روی خطوط خام می‌ماند. */
    var lines = rawLines;
    try { lines = commentFreeLines(code, CONF[langKey]); } catch (e) { lines = rawLines; }
    for (var i = 0; i < rawLines.length && out.length < 10; i++) {
      for (var j = 0; j < LINT.length; j++) {
        var target = LINT[j].todo ? rawLines[i] : lines[i];
        if (target && LINT[j].rx.test(target)) {
          var key = (i + 1) + LINT[j].msg;
          if (seen[key]) continue;
          seen[key] = true;
          out.push({ line: i + 1, column: 1, severity: 'warning', message: LINT[j].msg, hint: LINT[j].hint });
          break;
        }
      }
    }
    return out;
  }

  /* ── جداکردن «فقط کد»: کامنت‌ها و رشته‌ها حذف می‌شوند تا متن عادی داخلشان گول نزند ── */
  function codeOnlyLines(code, langKey) {
    var conf = CONF[langKey];
    if (!code) return [];
    var lines = code.split('\n');
    if (!conf) return lines;
    var out = [];
    for (var j = 0; j < lines.length; j++) out.push('');
    var state = 'code', quote = '', blockEnd = '', tripleMark = '';
    var line = 0, i = 0, n = code.length;
    while (i < n) {
      var ch = code[i];
      if (ch === '\n') {
        if (state === 'lcom') state = 'code';
        line++; i++; continue;
      }
      if (state === 'code') {
        if (conf.line && code.startsWith(conf.line, i)) { state = 'lcom'; i += conf.line.length; continue; }
        if (conf.block && code.startsWith(conf.block[0], i)) { state = 'bcom'; blockEnd = conf.block[1]; i += conf.block[0].length; continue; }
        if (conf.regex && ch === '/' && regexLiteralStart(code, i)) {
          var reEnd = regexLiteralEnd(code, i);
          if (reEnd > 0) { out[line] += code.slice(i, reEnd); i = reEnd; continue; }
        }
        if (langKey === 'rust' && isRustCharLiteral(code, i)) {
          var endQr2 = code.indexOf("'", i + (code[i + 1] === '\\' ? 2 : 1));
          if (endQr2 > i) { i = endQr2 + 1; continue; }
        }
        if (conf.quotes.indexOf(ch) >= 0) {
          if (conf.aposAfterAtom && prevAtomEnd(code, i)) { out[line] += ch; i++; continue; } // ترنسپوز، نه رشته
          var isTriple = false;
          if (conf.triple) {
            var marks = Array.isArray(conf.triple) ? conf.triple : [conf.triple];
            for (var t = 0; t < marks.length; t++) {
              if (marks[t][0] === ch && code.startsWith(marks[t], i)) { isTriple = true; tripleMark = marks[t]; break; }
            }
          }
          if (isTriple) { state = 'tstr'; i += tripleMark.length; }
          else { state = 'str'; quote = ch; i++; }
          continue;
        }
        out[line] += ch; i++; continue;
      }
      if (state === 'lcom') { i++; continue; }
      if (state === 'bcom') {
        if (code.startsWith(blockEnd, i)) { state = 'code'; i += blockEnd.length; } else i++;
        continue;
      }
      if (state === 'str') {
        if (conf.escape && ch === '\\') {
          if (code[i + 1] === '\n') { line++; i += 2; continue; }
          i += 2; continue;
        }
        if (ch === quote) state = 'code';
        i++; continue;
      }
      if (state === 'tstr') {
        if (code.startsWith(tripleMark, i)) { state = 'code'; i += tripleMark.length; } else i++;
        continue;
      }
    }
    return out;
  }

  /* ── بررسی سخت‌گیر «آیا این اصلاً کد است؟» ──
     متن عادی/چرتی را در هر زبان می‌گیرد و با خط و شماره، ارور می‌دهد */
  var NON_ASCII_LETTERS = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\u0400-\u04FF\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/;
  var STRUCTURE_RX = /[=+\-*/%<>!&|^~.:;,?()[\]{}@#$]/;

  function looksLikeCodeCheck(code, langKey) {
    var errors = [];
    if (langKey === 'html' || !CONF[langKey]) return errors; // HTML متن داخل تگ دارد؛ بررسی نمی‌شود

    /* جیسون با مقادیر صرفاً رشته‌ای، در codeOnlyLines تهی می‌شود و نباید هشدار کاذب بگیرد */
    if (langKey === 'json') {
      try {
        JSON.parse(code);
        return errors;
      } catch (e) {
        if (/^\s*[\{\[]/.test(code)) return errors;
      }
    }

    var lines = codeOnlyLines(code, langKey);
    var body = lines.join('\n');

    /* ۱) خط‌به‌خط: جمله‌های غیرانگلیسیِ بدون هیچ ساختار کد = متن، نه کد */
    var proseLines = [];
    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i];
      if (!ln.trim()) continue;
      var count = 0, m;
      var g = new RegExp(NON_ASCII_LETTERS.source, 'g');
      while ((m = g.exec(ln)) !== null) { count++; if (count >= 2) break; }
      if (count >= 2 && !STRUCTURE_RX.test(ln)) proseLines.push(i + 1);
    }
    if (proseLines.length) {
      var shown = Math.min(proseLines.length, 5);
      for (var p = 0; p < shown; p++) {
        errors.push({
          line: proseLines[p], column: 1, severity: 'error',
          message: 'خط ' + fa(proseLines[p]) + ' کد نیست — متن عادی نوشته شده',
          hint: 'این خط باید کد واقعی باشد یا اگر توضیح است، اول آن علامت کامنت زبان بگذار'
        });
      }
      if (proseLines.length > shown) {
        errors.push({
          line: proseLines[shown], column: 1, severity: 'error',
          message: 'و ' + fa(proseLines.length - shown) + ' خط دیگر هم متن عادی است',
          hint: 'کل متن را به کد واقعی تبدیل کن'
        });
      }
      return errors;
    }

    /* ۲) بررسی کلی: بدنه کد باید نشانه‌های واقعی کدنویسی داشته باشد */
    var kw = Syntax.keywordCount(body, langKey);
    var ops = (body.match(/[=+\-*/%<>!&|^~.:;,?()[\]{}@#$]/g) || []).length;
    var idents = (body.match(/[A-Za-z_][A-Za-z0-9_]*/g) || []).length;
    var numbers = (body.match(/\d/g) || []).length;
    var callLike = /[\w$.)\]]\s*\(/.test(body);
    var meaningful = kw >= 1 || (ops >= 2 && idents >= 1) || (ops >= 1 && numbers >= 1) || (callLike && idents >= 1);

    if (body.replace(/\s/g, '') === '') {
      errors.push({
        line: 1, column: 1, severity: 'warning',
        message: 'کد قابل بررسی پیدا نشد (فقط کامنت یا خط خالی است)',
        hint: 'چند خط کد واقعی بنویس تا بررسی شود'
      });
    } else if (!meaningful) {
      errors.push({
        line: 1, column: 1, severity: 'error',
        message: 'این متن شبیه کد ' + (Syntax.LANGS[langKey] ? Syntax.LANGS[langKey].label : '') + ' نیست',
        hint: 'به نظر می‌رسد متن عادی تایپ شده؛ کد واقعی به همین زبان وارد کن تا بررسی شود'
      });
    }
    return errors;
  }


  /* ═══════════ استخراج «فقط کد» از متن خام چسبانده‌شده ═══════════
     متن کپی‌شده از شبکه‌های اجتماعی/وبلاگ/پیام‌رسان معمولاً با متن عادی قاطی
     است (کپشن، هشتگ، جملهٔ فارسی، «مشاهده بیشتر»، شمارهٔ خط ادیتور). این بخش
     هرچه کد نیست را تشخیص می‌دهد و کنار می‌گذارد تا موتور تحلیل گول متن نخورد:
       ۱) اگر بلاک مارک‌داون ``` وجود دارد، فقط محتوای فنس‌ها کد است.
       ۲) شماره‌گذاری خط ادیتور (۱۲: / ۱۲) / ۱۲|) اگر همه‌گیر باشد برمی‌دارد.
       ۳) خط‌به‌خط: جمله‌های غیرکد حذف می‌شوند؛ ولی خطی که ادامهٔ رشته یا
          کامنت چندخطی است (متن فارسی داخل """ پایتون یا ` جاوااسکریپت)
          هرگز حذف نمی‌شود. */
  var FENCE_RX = /^[ \t]*(?:```|~~~)[ \t]*([A-Za-z0-9+#._-]*)[ \t]*$/;
  var GUTTER_RX = /^[ \t]*\d{1,4}[.)|\]:](?![ \t]*\d)[ \t]?/;
  /* نشانه‌های ساختار کد؛ نقطه/کاما عمداً نیستند چون در جملهٔ عادی هم می‌آیند */
  var CODEISH_RX = /[=+\-*/%<>!&|^~()[\]{}\\@$"'`;]/;

  function keepAsComment(line, conf) {
    var t = String(line).replace(/^\s+/, '');
    if (!t) return false;
    if (conf) {
      if (conf.line && t.indexOf(conf.line) === 0) return true;
      if (conf.block && t.indexOf(conf.block[0]) === 0) return true;
      return false;
    }
    /* زبان نامشخص: فقط نشانگرهای قطعی؛ «#» نمی‌آید چون هشتگ هم هست */
    return /^(?:\/\/|--|\/\*|<!--|\(\*|\{-|%)/.test(t);
  }

  function isProseLine(line, conf) {
    var t = String(line).replace(/\s+$/, '');
    if (!t.trim()) return false;
    if (keepAsComment(line, conf)) return false; // کامنت بخش مشروع کد است
    /* خط حاوی URL — قبل از آزمون ساختار، چون خودِ «https://» اسلش دارد و کد
       جلوه می‌کند. فقط وقتی کد است که کنارش ساختار واقعی هم باشد (فراخوانی،
       انتساب، براکت). «منبع: https://…» کپشن است، ولی fetch('https://…') کد است. */
    if (/https?:\/\//i.test(t)) {
      var rest = t.replace(/https?:\/\/\S+/gi, '');
      if (!/[=+*<>!&|^~()[\]{}@$"'`]/.test(rest) && !/\w\s*\(/.test(rest)) return true;
      return false;
    }
    /* @ و # قبل از آزمون ساختار برمی‌دارند: منشن/هشتگِ شبکهٔ اجتماعی «کد» نیست
       ولی دکوریتور @State و فراخوانی @app.route خودشان بقیهٔ ساختار را دارند */
    var bare = t.replace(/[@#]/g, '');
    if (CODEISH_RX.test(bare)) return false;     // نشانهٔ ساختار کد دارد → کد است
    /* شمارندهٔ غیر-ASCII عام است تا ایموجی و نماد (👇🔥…) هم شمرده شوند، نه فقط
       حروف زبان‌های دیگر؛ خط کد واقعی تقریباً هرگز ۲+ نویسهٔ غیر-ASCII بیرون
       رشته/کامنت ندارد و رشته هم معمولاً کوتیشن/ساختار دارد */
    var nonAscii = 0, m;
    var g = new RegExp('[^\\x00-\\x7F]', 'g');
    while ((m = g.exec(t)) !== null) { nonAscii++; if (nonAscii >= 2) break; }
    if (nonAscii >= 2) return true;              // جملهٔ فارسی/عربی/سیریلیک/CJK/ایموجی
    if (nonAscii >= 1) {
      /* یک‌دو نویسهٔ غیرانگلیسی + نماد و بدون هیچ ساختار: تیتر و شکلک */
      return t.replace(/[A-Za-z0-9\s]/g, '').length >= 2;
    }
    /* انگلیسی: جملهٔ بلند چندکلمه‌ایِ بدون ساختار که با نشانهٔ جمله تمام می‌شود */
    var words = t.split(/\s+/).filter(function (w) { return /[A-Za-z]{2,}/.test(w); });
    return words.length >= 5 && /[.!?,]$/.test(t);
  }

  function extractFenced(text) {
    var lines = text.split('\n'), blocks = [], buf = null, fenceLang = null, dropped = 0;
    for (var i = 0; i < lines.length; i++) {
      var m = lines[i].match(FENCE_RX);
      if (m) {
        if (buf === null) { buf = []; fenceLang = m[1] || null; }
        else { blocks.push({ lang: fenceLang, code: buf.join('\n') }); buf = null; }
        dropped++; // خود خط فنس متن نیست
        continue;
      }
      if (buf !== null) buf.push(lines[i]);
      else if (lines[i].trim()) dropped++; // متن بیرونِ فنس
    }
    if (buf !== null) blocks.push({ lang: fenceLang, code: buf.join('\n') }); // فنس بسته‌نشده
    if (!blocks.length) return null;
    return {
      code: blocks.map(function (b) { return b.code; }).join('\n\n'),
      dropped: dropped,
      lang: blocks[0].lang || null
    };
  }

  function stripGutters(text) {
    var lines = text.split('\n'), numbered = 0, nonBlank = 0, i;
    for (i = 0; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      nonBlank++;
      if (GUTTER_RX.test(lines[i])) numbered++;
    }
    /* فقط وقتی الگو همه‌گیر است که شمارهٔ خط ادیتور است؛ وگرنه کدهایی که خودشان
       با عدد شروع می‌شوند دست‌نخورده می‌مانند */
    if (numbered < 3 || nonBlank === 0 || numbered / nonBlank < 0.6) return text;
    for (i = 0; i < lines.length; i++) lines[i] = lines[i].replace(GUTTER_RX, '');
    return lines.join('\n');
  }

  /* وضعیت ابتدای هر خط: خطی که ادامهٔ رشته/کامنت چندخطی است حذف نمی‌شود */
  function lineStartStates(code, langKey) {
    var conf = CONF[langKey];
    if (!conf || !code) return null;
    var out = ['code'];
    var state = 'code', quote = '', blockEnd = '', tripleMark = '';
    var i = 0, n = code.length;
    while (i < n) {
      var ch = code[i];
      if (ch === '\n') {
        if (state === 'lcom') state = 'code';
        if (state === 'str' && !(conf.multiline && conf.multiline.indexOf(quote) >= 0)) state = 'code';
        out.push(state); i++; continue;
      }
      if (state === 'code') {
        if (conf.line && code.startsWith(conf.line, i)) { state = 'lcom'; i += conf.line.length; continue; }
        if (conf.block && code.startsWith(conf.block[0], i)) { state = 'bcom'; blockEnd = conf.block[1]; i += conf.block[0].length; continue; }
        if (conf.regex && ch === '/' && regexLiteralStart(code, i)) {
          var reEnd = regexLiteralEnd(code, i);
          if (reEnd > 0) { i = reEnd; continue; }
        }
        if (conf.quotes.indexOf(ch) >= 0) {
          if (conf.aposAfterAtom && prevAtomEnd(code, i)) { i++; continue; }
          if (ch === "'" && conf.escape && i > 0 && /[A-Za-z0-9_$]/.test(code[i - 1])) { i++; continue; }
          var isTriple = false;
          if (conf.triple) {
            var marks = Array.isArray(conf.triple) ? conf.triple : [conf.triple];
            for (var t = 0; t < marks.length; t++) {
              if (marks[t][0] === ch && code.startsWith(marks[t], i)) { isTriple = true; tripleMark = marks[t]; break; }
            }
          }
          if (isTriple) { state = 'tstr'; i += tripleMark.length; }
          else { state = 'str'; quote = ch; i++; }
          continue;
        }
        i++; continue;
      }
      if (state === 'lcom') { i++; continue; }
      if (state === 'bcom') { if (code.startsWith(blockEnd, i)) { state = 'code'; i += blockEnd.length; } else i++; continue; }
      if (state === 'str') {
        if (conf.escape && ch === '\\') { i += 2; continue; }
        if (ch === quote) state = 'code';
        i++; continue;
      }
      if (state === 'tstr') { if (code.startsWith(tripleMark, i)) { state = 'code'; i += tripleMark.length; } else i++; continue; }
    }
    return out;
  }

  var FENCE_LANG_ALIASES = {
    js: 'javascript', mjs: 'javascript', cjs: 'javascript', jsx: 'javascript',
    ts: 'typescript', tsx: 'typescript',
    py: 'python', py3: 'python',
    rb: 'ruby', rs: 'rust',
    cs: 'csharp', 'c#': 'csharp',
    'c++': 'cpp',
    sh: 'bash', zsh: 'bash',
    golang: 'go', kt: 'kotlin'
  };
  function resolveFenceLang(name) {
    if (!name) return null;
    var k = String(name).trim().toLowerCase();
    if (CONF[k]) return k;
    if (FENCE_LANG_ALIASES[k] && CONF[FENCE_LANG_ALIASES[k]]) return FENCE_LANG_ALIASES[k];
    return null;
  }

  function extractCode(text, langHint) {
    text = String(text || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    if (!text.trim()) return { code: '', dropped: 0, langHint: 'text' };

    /* ۱) بلاک مارک‌داون: هرچه داخل فنس است کد است و بقیه متن */
    var fence = extractFenced(text);
    if (fence) {
      var fenceCode = fence.code.replace(/^\n+/, '').replace(/\s+$/, '');
      var resolved = resolveFenceLang(fence.lang);
      var fenceLang = resolved ? resolved : (Syntax.detect(fenceCode) !== 'text' ? Syntax.detect(fenceCode) : null);
      return { code: fenceCode, dropped: fence.dropped, langHint: fenceLang || 'text' };
    }

    /* ۲) شمارهٔ خط ادیتور */
    text = stripGutters(text);

    /* ۳) فیلتر خط‌به‌خط متن عادی. برای HTML متنِ آزاد داخل فایل مجاز است،
       پس فیلتر نمی‌شود؛ برای بقیه زبان detect داخلی هم کمک می‌کند. */
    var conf = resolveFenceLang(langHint);
    if (!conf) {
      var det = Syntax.detect(text);
      if (det !== 'text') conf = det;
    }
    var skipProseFilter = conf === 'html'; // html و text: متنِ داخل فایل جزء ساختار است
    var lines = text.split('\n');
    var states = null;
    if (!skipProseFilter && conf) {
      try { states = lineStartStates(text, conf); } catch (e) { states = null; }
    }

    var kept = [], dropped = 0, i;
    for (i = 0; i < lines.length; i++) {
      var ln = lines[i];
      if (!ln.trim()) { kept.push(''); continue; }
      var insideLiteral = !!(states && states[i] && states[i] !== 'code' && states[i] !== 'lcom');
      if (!insideLiteral && !skipProseFilter && isProseLine(ln, conf)) { dropped++; continue; }
      kept.push(ln);
    }
    var code = kept.join('\n')
      .replace(/\n{4,}/g, '\n\n\n') /* فاصله‌های خیلی باز از متن پیست مانده‌اند */
      .replace(/^\n+/, '')
      .replace(/\s+$/, '');
    if (!code) return { code: '', dropped: dropped, langHint: conf || 'text' };
    return { code: code, dropped: dropped, langHint: conf || 'text' };
  }

  function uniq(arr) {
    var seen = {}, out = [];
    for (var i = 0; i < arr.length; i++) if (!seen[arr[i]]) { seen[arr[i]] = true; out.push(arr[i]); }
    return out;
  }

  function localExplain(code, langKey, warns) {
    var L = Syntax.LANGS[langKey] || Syntax.LANGS.text;
    var lines = code.split('\n');
    var fns = uniq((code.match(/\b(?:function|def|func|fn|fun|sub|procedure|proc)\s+([A-Za-z_]\w*)/g) || [])
      .map(function (s) { return s.trim().split(/\s+/)[1]; }));
    var classes = uniq((code.match(/\b(?:class|struct|interface|enum|protocol|record|trait)\s+([A-Za-z_]\w*)/g) || [])
      .map(function (s) { return s.trim().split(/\s+/)[1]; }));
    var imports = (code.match(/\b(?:import|include|using|require|use)\b/g) || []).length;
    var loops = (code.match(/\b(?:for|while|forEach|loop)\b/g) || []).length;
    var conds = (code.match(/\b(?:if|elif|else if|switch|match|guard)\b/g) || []).length;
    var returns = (code.match(/\breturn\b/g) || []).length;
    var prints = (code.match(/\b(?:print|println|printf|puts|echo)\s*\(|console\.log/g) || []).length;

    var md = '';
    md += '> 🔌 **حالت آفلاین** — این توضیح با موتور داخلی و بدون هوش مصنوعی ساخته شده و فقط «ساختار» کد را توصیف می‌کند. برای تحلیل کامل و دقیق، از ⚙️ تنظیمات کلید API را وارد کن.\n\n';

    md += '## 🧭 این کد چه می‌کند؟\n';
    md += 'این قطعه کد به زبان **' + L.label + '** نوشته شده (' + fa(lines.length) + ' خط)';
    var parts = [];
    if (fns.length) parts.push(fa(fns.length) + ' تابع');
    if (classes.length) parts.push(fa(classes.length) + ' کلاس/نوع');
    if (loops) parts.push(fa(loops) + ' حلقه');
    if (conds) parts.push(fa(conds) + ' شرط');
    if (parts.length) md += ' و شامل ' + parts.join('، ') + ' است. ';
    else md += ' و بدون تعریف تابع یا کلاس، به‌صورت خطی اجرا می‌شود. ';
    if (prints) md += 'در ' + fa(prints) + ' نقطه هم خروجی چاپ می‌کند.';
    md += '\n\n';

    md += '## ⚙️ چطور کار می‌کند؟\n';
    if (imports) md += '- اجرا از بالای فایل شروع می‌شود و ابتدا ' + fa(imports) + ' ماژول/کتابخانه بیرونی بارگذاری می‌شود.\n';
    if (fns.length) {
      md += '- توابع تعریف‌شده: ' + fns.slice(0, 8).map(function (f) { return '`' + f + '`'; }).join('، ') + ' — این‌ها هنگام «فراخوانی» اجرا می‌شوند، نه هنگام تعریف.\n';
    }
    if (classes.length) md += '- انواع تعریف‌شده: ' + classes.slice(0, 6).map(function (c) { return '`' + c + '`'; }).join('، ') + '.\n';
    if (loops) md += '- حلقه‌ها بخشی از داده‌ها را چندبار پردازش می‌کنند.\n';
    if (conds) md += '- شرط‌ها مسیر اجرا را بر اساس داده‌ها تغییر می‌دهند.\n';
    if (returns) md += '- در ' + fa(returns) + ' نقطه مقداری به بیرون برگردانده می‌شود (return).\n';
    if (!imports && !fns.length && !classes.length && !loops && !conds) md += '- کد سطر به سطر و به‌ترتیب اجرا می‌شود.\n';
    md += '\n';

    md += '## 🎯 به چه دردی می‌خورد؟\n';
    md += '- چنین قطعه‌ای معمولاً به‌عنوان یکی از بلوک‌های منطقیِ یک برنامهٔ بزرگ‌تر به کار می‌رود.\n';
    if (prints) md += '- چون خروجی چاپ می‌کند، احتمالاً برای آزمایش، یادگیری یا اسکریپت‌های خط فرمان نوشته شده است.\n';
    if (fns.length || classes.length) md += '- ساختار تابع/کلاس‌محور دارد؛ یعنی برای استفادهٔ مجدد در جاهای دیگر پروژه طراحی شده است.\n';
    md += '- تشخیص دقیق کاربرد به تحلیل معنایی هوش مصنوعی نیاز دارد که در حالت آفلاین در دسترس نیست.\n';
    md += '\n';

    md += '## ⚠️ نکات مهم\n';
    md += '- این توضیح فقط از روی «ساختار» کد است و جای تحلیل هوش مصنوعی را نمی‌گیرد.\n';
    (warns || []).forEach(function (w) {
      md += '- 🔶 ' + w.message + ' (بررسی محلی — خط ' + fa(w.line) + ')\n';
    });
    return md;
  }

  return {
    staticCheck: staticCheck,
    looksLikeCodeCheck: looksLikeCodeCheck,
    lintWarnings: lintWarnings,
    localExplain: localExplain,
    /* CONF برای موتور Malwatch: تشخیص کامنت/رشتهٔ هر زبان (رشته‌ها حفظ می‌شوند) */
    CONF: CONF,
    /* codeOnlyLines برای Malwatch: کامنت و رشته هر دو حذف می‌شوند تا قواعدی مثل
       «کاراکتر نامرئی» فقط داخل کد واقعی عمل کنند، نه داخل متن فارسی رشته‌ها */
    codeOnlyLines: codeOnlyLines,
    /* commentFreeLines: فقط کامنت‌ها حذف می‌شوند؛ برای lint و گزارش‌گیری روی کد */
    commentFreeLines: commentFreeLines,
    /* extractCode: پالایش متن چسبانده‌شده/استخراج‌شده از تصویر به «فقط کد» */
    extractCode: extractCode
  };
})();
