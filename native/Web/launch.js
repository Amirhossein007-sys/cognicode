/* Keep three visible seconds on every fresh launch, after assets paint. */
'use strict';
(function () {
  var splash = document.getElementById('launch-splash');
  if (!splash) return;
  var remaining = 3000, started = false, finished = false, since = null, timer;
  function finish() {
    if (finished) return;
    finished = true;
    try { localStorage.setItem('cognicode.launch-seen.v1', '1'); } catch (_) {}
    clearTimeout(timer);
    document.removeEventListener('visibilitychange', visibilityChanged);
    document.documentElement.classList.remove('launch-pending');
    splash.hidden = true;
    var app = document.getElementById('app');
    app.removeAttribute('inert');
    app.removeAttribute('aria-hidden');
    // Restore the user's app theme only after the always-dark launch presentation.
    window.dispatchEvent(new Event('cognicode:launch-complete'));
  }
  function resume() {
    if (!started || finished || document.hidden) return;
    if (remaining <= 0) { finish(); return; }
    since = performance.now();
    timer = setTimeout(finish, remaining);
  }
  function visibilityChanged() {
    clearTimeout(timer);
    if (document.hidden && since !== null) {
      remaining = Math.max(0, remaining - (performance.now() - since));
      since = null;
    } else if (!document.hidden) resume();
  }
  document.addEventListener('visibilitychange', visibilityChanged);
  // Start after the logo and type are ready and a frame has actually been painted.
  Promise.all([
    document.fonts.ready,
    splash.querySelector('img').decode().catch(function () {})
  ]).then(function () {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { started = true; resume(); });
    });
  });
  if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.themeBridge) {
    window.webkit.messageHandlers.themeBridge.postMessage({ dark: true });
  }
})();
