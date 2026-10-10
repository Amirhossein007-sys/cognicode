/* Exact source identity, worker where supported, and a native/file URL fallback. */
'use strict';
window.ReviewService = (function () {
  var worker, workerReady = false, unavailable = window.location.protocol === 'file:', serial = 0, pending = {}, cached;
  function fallback(code, language) {
    return new Promise(function (resolve, reject) { setTimeout(function () {
      try { resolve(ReviewEngine.local(code, language)); } catch (error) { reject(error); }
    }, 0); });
  }
  function disableWorker() {
    unavailable = true;
    if (worker) worker.terminate();
    worker = null;
    Object.keys(pending).forEach(function (id) { pending[id].fallback(); });
  }
  function local(code, language) {
    if (cached && cached.code === code && cached.language === language) return Promise.resolve(cached.result);
    var task = new Promise(function (resolve, reject) {
      var id = ++serial, timer;
      function done(result) { clearTimeout(timer); delete pending[id]; resolve(result); }
      function useFallback() { clearTimeout(timer); delete pending[id]; fallback(code, language).then(resolve, reject); }
      if (unavailable || !window.Worker) { useFallback(); return; }
      pending[id] = { done: done, fallback: useFallback, ready: function () { clearTimeout(timer); } };
      try {
        if (!worker) {
          worker = new Worker('review-worker.js');
          worker.onmessage = function (event) {
            if (event.data.ready) { workerReady = true; Object.keys(pending).forEach(function (id) { pending[id].ready(); }); return; }
            var p = pending[event.data.id]; if (p) { if (event.data.error) p.fallback(); else p.done(event.data.result); }
          };
          worker.onerror = function (event) { event.preventDefault(); disableWorker(); };
        }
        // WKWebView custom schemes can refuse workers without an error callback.
        if (!workerReady) timer = setTimeout(disableWorker, 1500);
        worker.postMessage({ id: id, code: code, language: language });
      } catch (_) { disableWorker(); }
    });
    return task.then(function (result) { cached = { code: code, language: language, result: result }; return result; });
  }
  return { local: local };
})();
