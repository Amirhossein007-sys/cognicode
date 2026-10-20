/* Shared web/iOS/Android request budgets. Never persist prompts or credentials. */
'use strict';
(function (root) {
  const limits = Object.freeze({operation: 32000, calls: 3, input: 14000, output: 4000, reviewOutput: 2400, selectionOutput: 1800, sourceBytes: 9000, reviewChunks: 2});
  const fail = message => { const error = new Error(message); error.name = 'AIBudgetError'; return error; };
  function bytes(text) {
    let size = 0;
    for (const char of String(text)) { const n = char.codePointAt(0); size += n < 128 ? 1 : n < 2048 ? 2 : n < 65536 ? 3 : 4; }
    return size;
  }
  function take(text, maximum) {
    let size = 0, length = 0;
    for (const char of String(text)) { const count = bytes(char); if (size + count > maximum) break; size += count; length += char.length; }
    return String(text).slice(0, length);
  }
  function inputReserve(messages) {
    if (!Array.isArray(messages) || !messages.length) throw fail('درخواست خالی ارسال نشد');
    let size = 256;
    for (const message of messages) {
      size += 32 + bytes(message.role || '');
      if (typeof message.content === 'string') size += bytes(message.content);
      else if (Array.isArray(message.content)) {
        for (const part of message.content) {
          if (part.type === 'text') size += bytes(part.text || '');
          // Image tokenization varies by model; reserve rather than claim exact billing.
          else if (part.type === 'image_url') size += 8192;
          else throw fail('نوع ورودی هوش مصنوعی برای کنترل مصرف شناخته‌شده نیست');
        }
      } else throw fail('قالب ورودی هوش مصنوعی معتبر نیست');
    }
    return size;
  }
  function operation() { return {calls: 0, spent: 0, held: 0, cacheHits: 0, reported: 0, unknown: 0,input:0,output:0,reasoning:0,cached:0}; }
  function reserve(state, messages, requested) {
    if (!state) throw fail('عملیات فعال برای کنترل مصرف وجود ندارد');
    const input = inputReserve(messages), output = Math.min(limits.output, Math.max(1, Math.floor(Number(requested) || limits.reviewOutput)));
    if (input > limits.input) throw fail('ورودی این درخواست بزرگ است؛ فایل یا بخش کوچک‌تری انتخاب کن. هیچ درخواستی ارسال نشد.');
    if (state.calls >= limits.calls || state.spent + state.held + input + output > limits.operation)
      throw fail('سقف مصرف این عملیات رسید؛ برای جلوگیری از هزینهٔ بیشتر ادامه ارسال نشد. بخش کوچک‌تری را جداگانه بررسی کن.');
    const ticket = {state, input, output, reserved: input + output, settled: false};
    state.calls++; state.held += ticket.reserved; return ticket;
  }
  const number = value => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 1e9 ? value : null;
  function usage(value) {
    if (!value || typeof value !== 'object') return null;
    const gemini=value.promptTokenCount!==undefined;
    const thoughts=number(value.thoughtsTokenCount)||0,tools=number(value.toolUsePromptTokenCount)||0;
    const input = number(value.prompt_tokens ?? value.input_tokens ?? (gemini?(number(value.promptTokenCount)===null?null:value.promptTokenCount+tools):null));
    const output = number(value.completion_tokens ?? value.output_tokens ?? (gemini?(number(value.candidatesTokenCount)===null?null:value.candidatesTokenCount+thoughts):null));
    if (input === null || output === null) return null;
    const total = number(value.total_tokens ?? value.totalTokenCount ?? input + output);
    if (total === null || total < input + output || total === 0) return null;
    return {input, output, total, reasoning: Math.min(output, number(value.completion_tokens_details?.reasoning_tokens ?? value.output_tokens_details?.reasoning_tokens ?? value.thoughtsTokenCount) || 0), cached: Math.min(input, number(value.prompt_tokens_details?.cached_tokens ?? value.input_tokens_details?.cached_tokens ?? value.cachedContentTokenCount) || 0)};
  }
  function settle(ticket, value) {
    if (ticket.settled) return null;
    ticket.settled = true;
    const reported = usage(value), charge = reported ? reported.total : ticket.reserved;
    ticket.state.held -= ticket.reserved; ticket.state.spent += charge;
    ticket.state[reported ? 'reported' : 'unknown'] += charge;
    if(reported)for(const key of ['input','output','reasoning','cached'])ticket.state[key]+=reported[key];
    return {known: !!reported, input: reported?.input || 0, output: reported?.output || 0, total: reported?.total || 0, reasoning: reported?.reasoning || 0, cached: reported?.cached || 0, reservation: reported ? 0 : ticket.reserved};
  }
  function ledger(storage, key = 'cognicode.ai-usage.v1') {
    const empty = () => ({calls: 0, input: 0, output: 0, total: 0, reasoning: 0, cached: 0, reservation: 0, cacheHits: 0, recent: []});
    let state = empty();
    try {
      const saved = JSON.parse(storage?.getItem(key) || 'null');
      if (saved && Object.keys(empty()).filter(k => k !== 'recent').every(k => number(saved[k]) !== null))
        for (const name of Object.keys(state)) if (name !== 'recent') state[name] = saved[name];
      if(Array.isArray(saved?.recent)) state.recent=saved.recent.slice(-20).filter(r=>typeof r.known==='boolean'&&['input','output','total','reasoning','cached','reservation'].every(k=>number(r[k])!==null)).map(r=>({known:r.known,input:r.input,output:r.output,total:r.total,reasoning:r.reasoning,cached:r.cached,reservation:r.reservation}));
    } catch (_) {}
    function save() { try { storage?.setItem(key, JSON.stringify(state)); } catch (_) {} }
    return {
      record(record) { if (!record) return; state.calls++; for (const name of ['input','output','total','reasoning','cached','reservation']) state[name] += record[name]; state.recent.push({...record}); state.recent = state.recent.slice(-20); save(); },
      hit() { state.cacheHits++; save(); },
      snapshot() { return JSON.parse(JSON.stringify(state)); }
    };
  }
  function split(text, firstLine = 1, maximum = limits.sourceBytes) {
    if (!Number.isFinite(maximum) || maximum < 4) throw fail('اندازهٔ بخش معتبر نیست');
    const chunks = []; let group = [], size = 0, start = firstLine;
    function flush() { if (group.length) chunks.push({text: group.join('\n'), line: start, lastLine: start + group.length - 1}); group = []; size = 0; }
    String(text).split('\n').forEach((line, index) => {
      const lineNumber = firstLine + index, count = bytes(line);
      if (count > maximum) {
        flush(); let from = 0;
        while (from < line.length) { const part = take(line.slice(from), maximum); chunks.push({text: part, line: lineNumber, lastLine: lineNumber, column: from + 1, continuation: true}); from += part.length; }
      } else {
        if (size + count + (group.length ? 1 : 0) > maximum) flush();
        if (!group.length) start = lineNumber;
        group.push(line); size += count + 1;
      }
    }); flush(); return chunks;
  }
  function reviewPlan(files) {
    const all = []; let current = null;
    for (const file of files) for (const raw of split(file.code, file.line, 8000)) {
      const part = {...raw, path: file.path || '', language: file.language, complete: file.complete && raw.text === file.code};
      const fileLines=file.code.split('\n').length-(file.code.endsWith('\n')?1:0);
      part.sourceLastLine=Math.min(part.lastLine,file.line+fileLines-1);
      const header='--- File: '+take(part.path || 'source',240)+'; original global lines '+part.line+'-'+part.lastLine+(part.continuation?'; partial line column '+part.column:'')+' ---\n';
      const text=header+part.text;
      if (current && bytes(current.text)+bytes(text)+2<=limits.sourceBytes) {
        current.text+='\n\n'+text; current.parts.push(part);current.lastLine=part.lastLine;
        current.complete=current.complete && part.complete;
        if(current.language!==part.language)current.language='mixed';
      } else {
        current={...part,text,parts:[part]};all.push(current);
      }
    }
    return {chunks: all.slice(0, limits.reviewChunks), totalChunks: all.length, partial: all.length > limits.reviewChunks || files.some(file => !file.complete)};
  }
  const api = {limits, bytes, take, inputReserve, operation, reserve, usage, settle, ledger, split, reviewPlan};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AIBudget = api;
})(typeof window !== 'undefined' ? window : globalThis);
