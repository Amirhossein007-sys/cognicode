/* Full-source review off the UI thread, including native file: URLs. */
'use strict';
window.ReviewService = (function () {
  var worker, boot, sourceLoading, unavailable = false, serial = 0, pending = {}, cached;
  function aborted() { var error = new Error('عملیات متوقف شد'); error.name = 'AbortError'; return error; }
  function fallback(code, language, signal) {
    return new Promise(function (resolve, reject) { setTimeout(function () {
      if (signal && signal.aborted) { reject(aborted()); return; }
      try { resolve(ReviewEngine.local(code, language)); } catch (error) { reject(error); }
    }, 0); });
  }
  function nativeSource() {
    if (typeof window.__reviewWorkerSource === 'string') return Promise.resolve(window.__reviewWorkerSource);
    if (sourceLoading) return sourceLoading;
    sourceLoading = new Promise(function (resolve, reject) {
      var script = document.createElement('script'), timer;
      function finish(error) {
        clearTimeout(timer); script.remove();
        if (error) { sourceLoading = null; reject(error); }
        else resolve(window.__reviewWorkerSource);
      }
      script.src = 'review-worker-bundle.js'; script.async = true;
      script.onload = function () { finish(typeof window.__reviewWorkerSource === 'string' ? null : new Error('Missing review worker source')); };
      script.onerror = function () { finish(new Error('Review worker could not load')); };
      timer = setTimeout(function () { finish(new Error('Review worker startup timed out')); }, 15000);
      document.head.appendChild(script);
    });
    return sourceLoading;
  }
  function prepareWorker() {
    if (boot) return boot.promise;
    if (worker) return Promise.resolve(worker);
    if (unavailable || !window.Worker) return Promise.reject(new Error('Worker unavailable'));
    var state = {}, resolveBoot, rejectBoot;
    state.promise = new Promise(function (resolve, reject) { resolveBoot = resolve; rejectBoot = reject; });
    state.reject = rejectBoot; boot = state;
    function fail(error) {
      if (boot !== state && worker !== state.worker) return;
      clearTimeout(state.timer); if (state.url) URL.revokeObjectURL(state.url);
      if (worker) worker.terminate(); worker = null; boot = null; unavailable = true;
      rejectBoot(error);
      Object.keys(pending).forEach(function (id) { pending[id].fallback(); });
    }
    Promise.resolve(location.protocol === 'file:' ? nativeSource() : null).then(function (source) {
      if (boot !== state) return;
      try {
        if (source) state.url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
        worker = state.worker = new Worker(state.url || 'review-worker.js');
        worker.onmessage = function (event) {
          if (event.data.ready) {
            clearTimeout(state.timer); if (state.url) URL.revokeObjectURL(state.url);
            if (boot === state) { boot = null; resolveBoot(worker); }
            return;
          }
          var task = pending[event.data.id];
          if (task) { if (event.data.error) task.reject(new Error(event.data.error)); else task.done(event.data.result); }
        };
        worker.onerror = function (event) { event.preventDefault(); fail(new Error('Review worker failed')); };
        state.timer = setTimeout(function () { fail(new Error('Review worker startup timed out')); }, 15000);
      } catch (error) { fail(error); }
    }, fail);
    return state.promise;
  }
  function local(code, language, options) {
    var signal = options && options.signal, problem = ReviewEngine.inputProblem(code);
    if (signal && signal.aborted) return Promise.reject(aborted());
    if (problem) return Promise.reject(new Error(problem));
    if (cached && cached.code === code && cached.language === language) return Promise.resolve(cached.result);
    var task = new Promise(function (resolve, reject) {
      var id = ++serial, settled = false, startedFallback = false;
      function cleanup() { settled = true; delete pending[id]; if (signal) signal.removeEventListener('abort', cancel); }
      function done(result) { if (settled) return; cleanup(); resolve(result); }
      function failed(error) { if (settled) return; cleanup(); reject(error); }
      function cancel() {
        failed(aborted());
        // Terminate CPU work when this is the only outstanding review.
        if (!Object.keys(pending).length && worker) { worker.terminate(); worker = null;
          if (boot) { clearTimeout(boot.timer); if (boot.url) URL.revokeObjectURL(boot.url); boot.reject(aborted()); boot = null; }
        }
      }
      function useFallback() {
        if (settled || startedFallback) return; startedFallback = true;
        fallback(code, language, signal).then(done, failed);
      }
      pending[id] = { done: done, reject: failed, fallback: useFallback };
      if (signal) signal.addEventListener('abort', cancel, { once: true });
      prepareWorker().then(function (ready) { if (!settled) ready.postMessage({ id: id, code: code, language: language }); }, useFallback);
    });
    return task.then(function (result) { cached = { code: code, language: language, result: result }; return result; });
  }
  return { local: local };
})();
