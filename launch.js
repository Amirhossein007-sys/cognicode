/* Paint the launch identity after assets are ready; Android enters promptly. */
'use strict';
(function () {
  var splash = document.getElementById('launch-splash');
  if (!splash) return;
  var root = document.documentElement, savedTheme;
  try { savedTheme = localStorage.getItem('cognicode.theme'); } catch (_) {}
  var dark = savedTheme ? savedTheme !== 'light' : !matchMedia('(prefers-color-scheme: light)').matches;
  root.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]').setAttribute('content', dark ? '#020604' : '#f3f8f4');
  var android = !!(window.AndroidBridge || /android/i.test(navigator.userAgent));
  var remaining = android ? 250 : 3000, started = false, finished = false, since = null, timer;
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
    // Keep the same user theme and Matrix canvas when entering the editor.
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
    window.webkit.messageHandlers.themeBridge.postMessage({ dark: dark });
  }
})();
