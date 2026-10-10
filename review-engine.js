/* Conservative local review and exact AI edits; no source code is executed. */
'use strict';
window.ReviewEngine = (function () {
  var cached = null, phpParser = null;
  var extensions = { php: 'php', js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', py: 'python', htm: 'html', html: 'html', css: 'css', json: 'json', swift: 'swift', sh: 'bash', sql: 'sql' };
  function sections(code, language) {
    var single = [{ code: code, language: language, start: 0, line: 1, complete: true, path: '' }];
    if (!/^\/\* ═══ درخت فایل‌های پروژه ═══ \*\/$/m.test(code)) return single;
    var rx = /^\/\* ─── فایل: (.+) \((\d+) سطر\) ─── \*\/\n/gm, found = [], m;
    while ((m = rx.exec(code))) found.push({ path: m[1], expected: +m[2], header: m.index, start: rx.lastIndex });
    if (!found.length) return single;
    return found.map(function (file, i) {
      var end = i + 1 < found.length ? found[i + 1].header : code.length;
      var text = code.slice(file.start, end).replace(/\n+$/, '');
      var cut = text.indexOf('\n// ... [ادامه کد فایل برای خلاصه حفظ شد] ...');
      var notice = text.indexOf('\n// ⚠️ توجه: برخی فایل‌ها');
      if (notice >= 0) text = text.slice(0, notice).replace(/\n+$/, '');
      if (cut >= 0) text = text.slice(0, cut);
      return { code: text, start: file.start, end: file.start + text.length, line: code.slice(0, file.start).split('\n').length,
        path: file.path, language: extensions[file.path.split('.').pop().toLowerCase()] || Syntax.detect(text), complete: cut < 0 };
    });
  }
  function local(code, language) {
    if (cached && cached.code === code && cached.language === language) return cached.result;
    var files = sections(code, language), errors = [], warnings = [], findings = [], evidence = [], score = 0, verdict = 'clean';
    files.forEach(function (file) {
      function locate(issue) { return Object.assign({}, issue, { line: issue.line + file.line - 1, file: file.path, fileLine: issue.line }); }
      // A cut excerpt is not a complete translation unit. Never report missing EOF delimiters for it.
      if (file.complete) errors = errors.concat(syntaxErrors(file).map(locate));
      warnings = warnings.concat(Checker.lintWarnings(file.code, file.language).map(locate));
      var mal = Malwatch.scan(file.code, file.language);
      findings = findings.concat(mal.findings.map(locate)); score += mal.score || 0;
      evidence = evidence.concat((mal.evidence || []).map(locate));
      if (mal.verdict === 'malicious' || (mal.verdict === 'suspicious' && verdict === 'clean')) verdict = mal.verdict;
    });
    var result = { errors: errors, warnings: warnings, security: { findings: findings, evidence: evidence, score: Math.min(100, score), verdict: verdict },
      syntaxComplete: files.every(function (f) { return f.complete && (f.language === 'javascript' && !!window.acorn || f.language === 'typescript' && !!window.BabelParser || f.language === 'php' && !!window.PhpParser || f.language === 'json'); }),
      partial: files.some(function (f) { return !f.complete; }) || code.indexOf('پوشش جزئی') >= 0, files: files };
    cached = { code: code, language: language, result: result };
    return result;
  }
  function syntaxErrors(file) {
    var failure = null;
    if (file.language === 'javascript' && window.acorn) {
      try { window.acorn.parse(file.code, { ecmaVersion: 'latest', sourceType: 'module', allowAwaitOutsideFunction: true, allowReturnOutsideFunction: true, locations: true }); return []; }
      catch (moduleError) {
        try { window.acorn.parse(file.code, { ecmaVersion: 'latest', sourceType: 'script', allowAwaitOutsideFunction: true, allowReturnOutsideFunction: true, locations: true }); return []; }
        catch (_) { failure = moduleError; }
      }
    }
    // Parse JSX as grammar, never guess it from '<name' (which also matches a<b).
    if ((file.language === 'typescript' || (file.language === 'javascript' && failure)) && window.BabelParser) {
      var plugins = file.language === 'typescript' ? ['typescript', 'decorators-legacy'] : [];
      var options = { sourceType: 'unambiguous', allowAwaitOutsideFunction: true, allowReturnOutsideFunction: true, attachComment: false, plugins: plugins };
      try { window.BabelParser.parse(file.code, options); return []; }
      catch (plainError) {
        try { window.BabelParser.parse(file.code, Object.assign({}, options, { plugins: plugins.concat(['jsx']) })); return []; }
        catch (jsxError) { failure = /(?:=\s*|return\s*|\(\s*)<[A-Za-z>]/.test(file.code) ? jsxError : plainError; }
      }
    } else if (file.language === 'php' && window.PhpParser) {
      if (!phpParser) phpParser = new window.PhpParser({ parser: { suppressErrors: false, version: '8.4' } });
      try {
        if (/<\?(?:php\b|=)/i.test(file.code)) phpParser.parseCode(file.code, file.path || 'input.php');
        else phpParser.parseEval(file.code);
        return [];
      } catch (phpError) { failure = phpError; }
    } else if (file.language === 'json') {
      try { JSON.parse(file.code); return []; }
      catch (jsonError) {
        var position = /position (\d+)/.exec(jsonError.message), line = /line (\d+) column (\d+)/.exec(jsonError.message);
        var prefix = file.code.slice(0, position ? +position[1] : file.code.length).split('\n');
        jsonError.loc = { line: line ? +line[1] : prefix.length, column: line ? +line[2] - 1 : prefix[prefix.length - 1].length };
        failure = jsonError;
      }
    }
    if (failure) {
      // Parser failures have a concrete grammar location, unlike prose/style guesses.
      if (failure.name !== 'SyntaxError' && !/Parse Error|syntax error/.test(failure.message)) throw failure;
      return [{ line: failure.loc ? failure.loc.line : (failure.lineNumber || 1), column: (failure.loc ? failure.loc.column : (failure.columnNumber || 0)) + 1,
        severity: 'error', source: 'parser', verified: true, message: 'خطای نحو ' + file.language + ': ' + failure.message, hint: 'ساختار این خط را طبق نحو زبان اصلاح کن' }];
    }
    return Checker.staticCheck(file.code, file.language).map(function (issue) {
      return Object.assign({}, issue, { severity: 'warning', source: 'structure', hint: 'بررسی ساختاری است؛ برای تأیید نحو این زبان از تحلیل AI یا ابزار رسمی زبان استفاده کن' });
    });
  }
  function confirmIssues(issues, code, language) {
    var lines = code.split('\n'), files = sections(code, language);
    return (issues || []).filter(function (issue) {
      if (!issue || !Number.isInteger(issue.line) || issue.line < 1 || issue.line > lines.length) return false;
      if (typeof issue.message !== 'string' || !issue.message.trim()) return false;
      if (typeof issue.quote !== 'string' || !issue.quote.trim() || lines[issue.line - 1].indexOf(issue.quote) < 0) return false;
      if (typeof issue.reason !== 'string' || issue.reason.trim().length < 12 || issue.confidence !== 'high') return false;
      // Project headers, file trees and a deliberately cut EOF are not source defects.
      return files.some(function (f) { return issue.line >= f.line && issue.line < f.line + f.code.split('\n').length && f.complete; });
    }).map(function (issue) { var file = files.find(function (f) { return issue.line >= f.line && issue.line < f.line + f.code.split('\n').length; }); return Object.assign({}, issue, { source: 'ai', verified: true, file: file.path, fileLine: issue.line - file.line + 1 }); });
  }
  function dedupe(issues) {
    var seen = new Set();
    var parserLines = new Set(issues.filter(function (issue) { return issue.source === 'parser'; }).map(function (issue) { return issue.line; }));
    return issues.filter(function (issue) { if (issue.source === 'ai' && issue.severity !== 'warning' && parserLines.has(issue.line)) return false; var key = issue.line + ':' + issue.severity + ':' + issue.message; if (seen.has(key)) return false; seen.add(key); return true; });
  }
  function applyEdits(code, edits, issues, language) {
    if (!Array.isArray(edits) || edits.length > 12) throw new Error('قالب اصلاح معتبر نیست؛ کد تغییر نکرد');
    if (!edits.length) return code;
    var files = sections(code, language);
    var changes = edits.map(function (edit) {
      if (!edit || typeof edit.before !== 'string' || !edit.before || typeof edit.after !== 'string') throw new Error('اصلاح باید متن اصلی و جایگزین دقیق داشته باشد');
      var start = code.indexOf(edit.before), end = start + edit.before.length;
      if (start < 0 || code.indexOf(edit.before, start + 1) >= 0) throw new Error('محل اصلاح یکتا نیست یا با کد اصلی تطبیق ندارد');
      var first = code.slice(0, start).split('\n').length, last = first + edit.before.split('\n').length - 1;
      if (!issues.some(function (issue) { return issue.line >= first - 3 && issue.line <= last + 3; })) throw new Error('اصلاح به ایراد گزارش‌شده مربوط نیست');
      if (!files.some(function (f) { return f.complete && start >= f.start && end <= (f.end == null ? code.length : f.end); })) throw new Error('اصلاح از مرز فایل یا بخش کامل کد خارج شده است');
      if (edit.before.length > 4000 || edit.after.length > 6000 || edit.before.length - edit.after.length > 600) throw new Error('اصلاح بیش از حد گسترده است؛ بخش کوتاه‌تری را بررسی کن');
      return { start: start, end: end, text: edit.after };
    }).sort(function (a, b) { return a.start - b.start; });
    for (var i = 1; i < changes.length; i++) if (changes[i].start < changes[i - 1].end) throw new Error('اصلاح‌های هم‌پوشان پذیرفته نمی‌شوند');
    var result = code;
    changes.slice().reverse().forEach(function (edit) { result = result.slice(0, edit.start) + edit.text + result.slice(edit.end); });
    function signature(e) { return e.message.replace(/[۰-۹0-9]+/g, '#'); }
    var counts = {};
    local(code, language).errors.forEach(function (e) { var key = signature(e); counts[key] = (counts[key] || 0) + 1; });
    local(result, language).errors.forEach(function (e) { var key = signature(e); if (e.source === 'parser' || !counts[key]) throw new Error('اصلاح پیشنهادی هنوز خطای نحو دارد؛ کد تغییر نکرد'); counts[key]--; });
    return result;
  }
  function aiChunks(code, language, limit) {
    limit = limit || 16000;
    var chunks = [];
    sections(code, language).forEach(function (file) {
      var lines = file.code.split('\n'), start = 0;
      while (start < lines.length) {
        var end = start, size = 0;
        while (end < lines.length && (end === start || size + lines[end].length + 1 <= limit)) size += lines[end++].length + 1;
        chunks.push({ text: lines.slice(start, end).join('\n'), line: file.line + start, language: file.language,
          path: file.path, complete: file.complete && start === 0 && end === lines.length });
        start = end;
      }
    });
    return chunks;
  }
  // Keep an issue ledger across edits. A changed AI quote is awaiting review, not proof of a fix.
  function reconcile(ledger, before, code, fresh, language) {
    var oldLines = before.split('\n'), lines = code.split('\n'), prefix = 0, suffix = 0;
    while (prefix < Math.min(oldLines.length, lines.length) && oldLines[prefix] === lines[prefix]) prefix++;
    while (suffix < Math.min(oldLines.length, lines.length) - prefix && oldLines[oldLines.length - 1 - suffix] === lines[lines.length - 1 - suffix]) suffix++;
    var remaining = fresh.slice(), result = [], files = sections(code, language);
    function key(e) { return [e.source, e.file || '', e.message.replace(/\d+/g, '#')].join(':'); }
    ledger.forEach(function (previous) {
      var er = Object.assign({}, previous), oldLine = previous.line - 1;
      er.line = Math.max(1, Math.min(lines.length, oldLine < prefix ? oldLine + 1 : oldLine >= oldLines.length - suffix ? oldLine + lines.length - oldLines.length + 1 : prefix + 1));
      var match = remaining.findIndex(function (x) { return key(x) === key(er) && Math.abs(x.line - er.line) <= 3; });
      if (match >= 0) { er = Object.assign({}, remaining.splice(match, 1)[0], { state: 'open' }); }
      else if (er.source === 'ai') {
        var quoteLine = er.quote ? lines.findIndex(function (line) { return line.indexOf(er.quote) >= 0; }) : -1;
        er.state = quoteLine >= 0 ? 'open' : 'pending';
        if (quoteLine >= 0) er.line = quoteLine + 1;
      } else {
        var file = files.find(function (f) { return f.path === (er.file || ''); });
        var parserBlocked = fresh.some(function (x) { return x.source === 'parser' && (x.file || '') === (er.file || ''); });
        er.state = !file || !file.complete || (er.source === 'parser' && (parserBlocked || !/^(javascript|typescript|php|json)$/.test(file.language))) ? 'pending' : 'resolved';
      }
      result.push(er);
    });
    return result.concat(remaining.map(function (er) { return Object.assign({}, er, { state: 'open' }); }));
  }
  return { local: local, sections: sections, confirmIssues: confirmIssues, dedupe: dedupe, applyEdits: applyEdits, aiChunks: aiChunks, reconcile: reconcile };
})();
