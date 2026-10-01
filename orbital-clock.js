/* OrbitalClock: framework-free adaptation for the PWA and native WKWebView. */
'use strict';
(function () {
  var clock = document.getElementById('orbital-clock');
  if (!clock) return;
  var svg = clock.querySelector('svg');
  var dateLabel = clock.querySelector('time');
  var hands = ['hour', 'minute', 'second'].map(function (name) {
    return clock.querySelector('.orbital-' + name);
  });
  var dateFormat = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit'
  });
  var fullDateFormat = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    timeZone: 'Asia/Tehran', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  var timeFormat = new Intl.DateTimeFormat('fa-IR', {
    timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  var markers = [];
  for (var i = 0; i < 12; i++) {
    var marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    var angle = (i * 30 - 90) * Math.PI / 180;
    marker.setAttribute('cx', String(50 + 38 * Math.cos(angle)));
    marker.setAttribute('cy', String(50 + 38 * Math.sin(angle)));
    marker.setAttribute('r', i % 3 === 0 ? '2' : '1.4');
    marker.setAttribute('class', 'orbital-marker' + (i % 3 === 0 ? ' orbital-cardinal' : ''));
    clock.querySelector('.orbital-markers').appendChild(marker);
    markers.push(marker);
  }
  var timer;
  function update() {
    var now = new Date();
    // Fixed UTC+03:30 requested by the user; independent of the device timezone.
    var tehran = new Date(now.getTime() + 210 * 60000);
    var seconds = tehran.getUTCSeconds();
    var minutes = tehran.getUTCMinutes() + seconds / 60;
    var hours = tehran.getUTCHours() % 12 + minutes / 60;
    [hours * 30, minutes * 6, seconds * 6].forEach(function (angle, index) {
      hands[index].setAttribute('transform', 'rotate(' + angle + ' 50 50)');
    });
    markers.forEach(function (marker, index) {
      marker.classList.toggle('orbital-active', Math.floor(hours) === index);
    });
    dateLabel.textContent = dateFormat.format(now);
    dateLabel.dateTime = tehran.toISOString().slice(0, 10);
    dateLabel.title = fullDateFormat.format(now);
    dateLabel.setAttribute('aria-label', 'تاریخ شمسی تهران، ' + dateLabel.title);
    svg.setAttribute('aria-label', 'ساعت تهران ' + timeFormat.format(now) + '، UTC+۳:۳۰');
    clearTimeout(timer);
    if (!document.hidden) timer = setTimeout(update, 1000 - now.getMilliseconds());
  }
  document.addEventListener('visibilitychange', update);
  window.addEventListener('pageshow', update);
  window.addEventListener('pagehide', function () { clearTimeout(timer); });
  update();
})();
