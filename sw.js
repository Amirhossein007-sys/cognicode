/* کوگنی کد (CogniCode) — سرویس‌ورکر: کش پوستهٔ اپ برای اجرای آفلاین */
'use strict';

var CACHE = 'cognicode-v9-particles-gallery-2026';
var ASSETS = [
  './',
  './index.html',
  './styles.css',
  './syntax.js',
  './checker.js',
  './sonar.js',
  './app.js',
  './manifest.webmanifest',
  './apple-touch-icon.png',
  './apple-touch-icon-precomposed.png',
  './favicon.png',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './fonts/Vazirmatn-Regular.woff2',
  './fonts/Vazirmatn-Bold.woff2',
  './fonts/Vazirmatn-ExtraBold.woff2'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); })
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


