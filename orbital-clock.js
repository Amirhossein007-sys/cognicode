/* Cogni vintage radio clock. Resource filename retained for existing bundles. */
'use strict';
(function () {
  var clock = document.getElementById('tehran-clock');
  if (!clock) return;
  var cardsHost = clock.querySelector('.radio-cards');
  var timeLabel = clock.querySelector('.radio-time');
  var dateLabel = clock.querySelector('.radio-date');
  var wheel = clock.querySelector('.radio-seconds-wheel');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var dateFormat = new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-arabext', {
    timeZone: 'UTC', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  var digits = [], timer, wrapTimer, dayKey = '', minuteKey = '', previousSecond;
  var active = true, initialized = false;
  function pad(value) { return ('0' + value).slice(-2); }
  function valueAt(card, name, value) { card.querySelector('.radio-' + name + ' .radio-value').textContent = value; }
  for (var i = 0; i < 4; i++) {
    var card = document.createElement('span');
    card.className = 'radio-digit';
    ['upper', 'lower', 'front', 'back'].forEach(function (name) {
      var half = document.createElement('span'); half.className = 'radio-' + name;
      var value = document.createElement('span'); value.className = 'radio-value'; value.textContent = '–';
      half.appendChild(value); card.appendChild(half);
    });
    cardsHost.appendChild(card); digits.push(card);
  }
  // Duplicate rows on both ends make the 59 → 00 roll continuous.
  var rows = document.createDocumentFragment();
  for (var n = -2; n <= 61; n++) {
    var row = document.createElement('span'); row.textContent = pad((n + 60) % 60); rows.appendChild(row);
  }
  wheel.appendChild(rows);
  function setDigit(card, next, animate) {
    var old = card.dataset.value;
    if (old === next) return;
    clearTimeout(card.flipTimer); card.classList.remove('is-flipping');
    card.dataset.value = next;
    valueAt(card, 'upper', next); valueAt(card, 'front', old || next); valueAt(card, 'back', next);
    valueAt(card, 'lower', animate && old ? old : next);
    if (animate && old) {
      card.classList.add('is-flipping');
      card.flipTimer = setTimeout(function () { valueAt(card, 'lower', next); card.classList.remove('is-flipping'); }, 620);
    }
  }
  function update(animate) {
    clearTimeout(timer); clearTimeout(wrapTimer);
    var now = new Date();
    var tehran = new Date(now.getTime() + 210 * 60000);
    var hours = pad(tehran.getUTCHours()), minutes = pad(tehran.getUTCMinutes()), seconds = tehran.getUTCSeconds();
    var nextMinute = hours + minutes;
    var motion = animate && initialized && !reduced.matches && !document.hidden && active && !document.documentElement.classList.contains('focus-mode');
    nextMinute.split('').forEach(function (value, index) { setDigit(digits[index], value, motion); });
    var nextDay = tehran.toISOString().slice(0, 10);
    if (nextDay !== dayKey) {
      var dateParts = {};
      dateFormat.formatToParts(tehran).forEach(function (part) { dateParts[part.type] = part.value; });
      dayKey = nextDay;
      dateLabel.textContent = dateParts.weekday + '، ' + dateParts.day + ' ' + dateParts.month + ' ' + dateParts.year;
      dateLabel.dateTime = nextDay;
    }
    if (nextMinute + nextDay !== minuteKey || !initialized) {
      minuteKey = nextMinute + nextDay;
      clock.setAttribute('aria-label', 'ساعت تهران ' + hours + ':' + minutes + '، ' + dateLabel.textContent + '، UTC+۳:۳۰');
      clock.title = clock.getAttribute('aria-label');
    }
    timeLabel.textContent = hours + ':' + minutes + ':' + pad(seconds);
    timeLabel.dateTime = now.toISOString();
    wheel.classList.toggle('is-resetting', !motion);
    var wrap = motion && previousSecond === 59 && seconds === 0;
    wheel.style.transform = 'translateY(-' + (wrap ? 60 : seconds) * 12 + 'px)';
    if (wrap) wrapTimer = setTimeout(function () {
      wheel.classList.add('is-resetting'); wheel.style.transform = 'translateY(0)';
    }, 480);
    previousSecond = seconds; initialized = true;
    if (active && !document.hidden) timer = setTimeout(function () { update(true); }, 1000 - now.getTime() % 1000);
  }
  function stop() {
    clearTimeout(timer); clearTimeout(wrapTimer);
    digits.forEach(function (card) { clearTimeout(card.flipTimer); card.classList.remove('is-flipping'); valueAt(card, 'lower', card.dataset.value); });
  }
  function resume() { stop(); if (active && !document.hidden) update(false); }
  document.addEventListener('visibilitychange', resume);
  window.addEventListener('pageshow', function () { active = true; resume(); });
  window.addEventListener('pagehide', function () { active = false; stop(); });
  window.addEventListener('cognicode:native-active', function (event) { active = !!event.detail; if (active) resume(); else stop(); });
  reduced.addEventListener('change', resume);
  update(false);
})();
