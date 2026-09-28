/* کوگنی کد (CogniCode) — سرویس‌ورکر: کش پوستهٔ اپ برای اجرای آفلاین */
'use strict';

var CACHE = 'cognicode-v14-visual-2026';

/* فقط فایل‌هایی که واقعاً صفحه/مانيفست مصرف می‌کنند (بدون بایت تکراری) */
var PRECACHE = [
  './',
  './index.html',
  './styles.css',
  './syntax.js',
  './checker.js',
  './sonar.js',
  './app.js',
  './manifest.webmanifest',
  './apple-touch-icon.png',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './fonts/Vazirmatn-Regular.woff2',
  './fonts/Vazirmatn-Bold.woff2',
  './fonts/Vazirmatn-ExtraBold.woff2'
];

/* کد و مانیفست همیشه از شبکه تازه می‌آیند (network-first) تا آپدیت برنامه
   هرگز پشت کش گیر نکند؛ آیکون‌ها و فونت‌های تغییرناپذیر cache-first می‌مانند */
var FRESH_NAMES = ['index.html', 'styles.css', 'syntax.js', 'checker.js', 'sonar.js', 'app.js', 'manifest.webmanifest'];

function isFresh(url) {
  var name = url.pathname.split('/').pop();
  return url.pathname.endsWith('/') || FRESH_NAMES.indexOf(name) >= 0;
}

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(PRECACHE); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // درخواست‌های هوش مصنوعی مستقیم به شبکه می‌روند
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(function () { return caches.match('./index.html'); }));
    return;
  }
  if (isFresh(url)) {
    // شبکه اول؛ فقط وقتی آفلاین بود به کش برمی‌گردیم
    e.respondWith(
      fetch(e.request).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        return res;
      }).catch(function () {
        return caches.match(e.request).then(function (hit) { return hit || Response.error(); });
      })
    );
    return;
  }
  // فونت/آیکون: کش اول، در نبودش شبکه + ذخیره برای دفعات بعد
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        return res;
      });
    })
  );
});
