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
  var calm = window.matchMedia('(max-width:680px), (pointer:coarse)');
  var energySaving = !!(window.__cogniEnergy && (window.__cogniEnergy.lowPower || window.__cogniEnergy.thermal >= 1));
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
    var motion = animate && previousTime !== undefined && stamp === previousTime + 1 && !reduced.matches && !calm.matches && !energySaving && active && !document.hidden && !document.documentElement.classList.contains('focus-mode');
    if (motion) { secondAngle += 6; if (s === 0) minuteAngle += 6; }
    else { secondAngle = s * 6; minuteAngle = m * 6; }
    clock.classList.toggle('is-resetting', !motion);
    if (!calm.matches || !animate || s % 5 === 0) {
      var secondsValue = secondAngle + 'deg';
      if (secondsRing.style.getPropertyValue('--dial-angle') !== secondsValue) secondsRing.style.setProperty('--dial-angle', secondsValue);
    }
    var minutesValue = minuteAngle + 'deg';
    if (minutesRing.style.getPropertyValue('--dial-angle') !== minutesValue) minutesRing.style.setProperty('--dial-angle', minutesValue);
    if (!motion && !reduced.matches && !calm.matches && !energySaving) { void secondsRing.offsetWidth; resetFrame = requestAnimationFrame(function () { clock.classList.remove('is-resetting'); }); }
    if (hourLabel.textContent !== pad(h)) hourLabel.textContent = pad(h);
    if (minuteLabel.textContent !== pad(m)) minuteLabel.textContent = pad(m);
    var nextDay = tehran.toISOString().slice(0, 10), nextMinute = pad(h) + pad(m) + nextDay;
    if (nextDay !== dayKey) {
      var parts = {}; dateFormat.formatToParts(tehran).forEach(function (part) { parts[part.type] = part.value; });
      dayKey = nextDay; dateLabel.textContent = parts.weekday + '، ' + parts.day + ' ' + parts.month + ' ' + parts.year; dateLabel.dateTime = nextDay;
    }
    if (minuteKey !== nextMinute) {
      minuteKey = nextMinute; clock.setAttribute('aria-label', 'ساعت تهران ' + pad(h) + ':' + pad(m) + '، ' + dateLabel.textContent); clock.title = clock.getAttribute('aria-label');
    }
    timeLabel.textContent = pad(h) + ':' + pad(m) + (energySaving ? '' : ':' + pad(s)); timeLabel.dateTime = now.toISOString(); previousTime = stamp;
    var period = energySaving ? 60000 : 1000;
    if (active && !document.hidden) timer = setTimeout(function () { update(true); }, period - now.getTime() % period);
  }
  function stop() { clearTimeout(timer); cancelAnimationFrame(resetFrame); }
  function resume() { stop(); if (active && !document.hidden) update(false); }
  document.addEventListener('visibilitychange', resume);
  window.addEventListener('pageshow', function () { active = true; resume(); });
  window.addEventListener('pagehide', function () { active = false; stop(); });
  window.addEventListener('cognicode:native-active', function (event) { active = !!event.detail; if (active) resume(); else stop(); });
  reduced.addEventListener('change', resume);
  calm.addEventListener('change', resume);
  window.addEventListener('cognicode:energy-change', function (event) { var energy = event.detail || {}; energySaving = !!(energy.lowPower || energy.thermal >= 1); resume(); });
  update(false);
})();
