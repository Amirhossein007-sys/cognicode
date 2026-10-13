/* Digital-Analog Dial Clock, adapted from https://codepen.io/vineethtrv/pen/abjrWyW.
   Resource filename stays stable for existing native loaders. */
'use strict';
(function () {
  var clock = document.getElementById('tehran-clock');
  if (!clock) return;
  var secondsRing = clock.querySelector('.dial-seconds'), minutesRing = clock.querySelector('.dial-minutes');
  var hourLabel = clock.querySelector('.dial-hour'), minuteLabel = clock.querySelector('.dial-minute');
  var timeLabel = clock.querySelector('.dial-time'), dateLabel = clock.querySelector('.dial-date');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var dateFormat = new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-arabext', { timeZone: 'UTC', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  var timer, resetFrame, dayKey = '', minuteKey = '', previousTime, secondAngle = 0, minuteAngle = 0;
  var active = true;
  function pad(value) { return ('0' + value).slice(-2); }
  [secondsRing, minutesRing].forEach(function (ring) {
    var nodes = document.createDocumentFragment();
    for (var n = 0; n < 60; n++) {
      var tick = document.createElement('i'); tick.className = 'dial-spike';
      tick.style.setProperty('--tick-angle', n * 6 + 'deg'); tick.dataset.index = pad(n); nodes.appendChild(tick);
    }
    ring.appendChild(nodes);
  });
  function update(animate) {
    clearTimeout(timer); cancelAnimationFrame(resetFrame);
    var now = new Date(), tehran = new Date(now.getTime() + 210 * 60000);
    var h = tehran.getUTCHours(), m = tehran.getUTCMinutes(), s = tehran.getUTCSeconds();
    var stamp = Math.floor(now.getTime() / 1000);
    var motion = animate && previousTime !== undefined && stamp === previousTime + 1 && !reduced.matches && active && !document.hidden && !document.documentElement.classList.contains('focus-mode');
    if (motion) { secondAngle += 6; if (s === 0) minuteAngle += 6; }
    else { secondAngle = s * 6; minuteAngle = m * 6; }
    clock.classList.toggle('is-resetting', !motion);
    secondsRing.style.setProperty('--dial-angle', secondAngle + 'deg');
    minutesRing.style.setProperty('--dial-angle', minuteAngle + 'deg');
    if (!motion) { void secondsRing.offsetWidth; resetFrame = requestAnimationFrame(function () { clock.classList.remove('is-resetting'); }); }
    hourLabel.textContent = pad(h); minuteLabel.textContent = pad(m);
    var nextDay = tehran.toISOString().slice(0, 10), nextMinute = pad(h) + pad(m) + nextDay;
    if (nextDay !== dayKey) {
      var parts = {}; dateFormat.formatToParts(tehran).forEach(function (part) { parts[part.type] = part.value; });
      dayKey = nextDay; dateLabel.textContent = parts.weekday + '، ' + parts.day + ' ' + parts.month + ' ' + parts.year; dateLabel.dateTime = nextDay;
    }
    if (minuteKey !== nextMinute) {
      minuteKey = nextMinute; clock.setAttribute('aria-label', 'ساعت تهران ' + pad(h) + ':' + pad(m) + '، ' + dateLabel.textContent); clock.title = clock.getAttribute('aria-label');
    }
    timeLabel.textContent = pad(h) + ':' + pad(m) + ':' + pad(s); timeLabel.dateTime = now.toISOString(); previousTime = stamp;
    if (active && !document.hidden) timer = setTimeout(function () { update(true); }, 1000 - now.getTime() % 1000);
  }
  function stop() { clearTimeout(timer); cancelAnimationFrame(resetFrame); }
  function resume() { stop(); if (active && !document.hidden) update(false); }
  document.addEventListener('visibilitychange', resume);
  window.addEventListener('pageshow', function () { active = true; resume(); });
  window.addEventListener('pagehide', function () { active = false; stop(); });
  window.addEventListener('cognicode:native-active', function (event) { active = !!event.detail; if (active) resume(); else stop(); });
  reduced.addEventListener('change', resume);
  update(false);
})();
