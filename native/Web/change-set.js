/* Exact line patches against an immutable base. Never locate by fuzzy matching. */
'use strict';
(function (root) {
  function build(base, proposed) {
    const a = base.split('\n'), b = proposed.split('\n');
    if (a.length > 1000 || b.length > 1000 || a.length * b.length > 500000) {
      return [{ id: 'whole', start: 0, end: a.length, before: a, after: b, whole: true }];
    }
    const dp = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
    for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    let i = 0, j = 0, current = null;
    const patches = [];
    function flush() { if (current) { current.id = 'change-' + patches.length; patches.push(current); current = null; } }
    while (i < a.length || j < b.length) {
      if (i < a.length && j < b.length && a[i] === b[j]) { flush(); i++; j++; continue; }
      if (!current) current = { start: i, end: i, before: [], after: [] };
      if (j < b.length && (i === a.length || dp[i][j + 1] >= dp[i + 1][j])) current.after.push(b[j++]);
      else { current.before.push(a[i++]); current.end = i; }
    }
    flush();
    return patches;
  }
  function apply(base, current, patches, ids) {
    if (current !== base) throw new Error('کد از زمان پیشنهاد تغییر کرده؛ دوباره تحلیل کن');
    const lines = base.split('\n'), selected = new Set(ids);
    for (const patch of patches.slice().reverse()) {
      if (!selected.has(patch.id)) continue;
      if (lines.slice(patch.start, patch.end).join('\n') !== patch.before.join('\n')) throw new Error('نسخهٔ تغییر با کد تطبیق ندارد');
      lines.splice(patch.start, patch.end - patch.start, ...patch.after);
    }
    return lines.join('\n');
  }
  const api = { build, apply };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ChangeSet = api;
})(typeof window !== 'undefined' ? window : globalThis);
