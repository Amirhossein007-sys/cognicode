/* Pipboy/CRT clock: retains this filename as the web/native resource entry point. */
'use strict';
(function () {
  var clock = document.getElementById('tehran-clock');
  if (!clock) return;
  var timeLabel = clock.querySelector('.pip-time');
  var dateLabel = clock.querySelector('.pip-date');
  var hoursLabel = clock.querySelector('.pip-hours');
  var minutesLabel = clock.querySelector('.pip-minutes');
  // Shift the instant once, then format in UTC. Time and calendar share the fixed
  // UTC+03:30 requested by the user, independently of device zone or DST rules.
  var offset = 210 * 60000;
  var timeFormat = new Intl.DateTimeFormat('fa-IR-u-nu-arabext', {
    timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  var dateFormat = new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-arabext', {
    timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit'
  });
  var fullDateFormat = new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-arabext', {
    timeZone: 'UTC', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  function parts(format, date) {
    var value = {};
    format.formatToParts(date).forEach(function (part) { value[part.type] = part.value; });
    return value;
  }
  var timer;
  function update() {
    clearTimeout(timer);
    var now = new Date();
    var tehran = new Date(now.getTime() + offset);
    var time = parts(timeFormat, tehran), date = parts(dateFormat, tehran);
    hoursLabel.textContent = time.hour;
    minutesLabel.textContent = time.minute;
    dateLabel.textContent = date.year + '/' + date.month + '/' + date.day;
    dateLabel.dateTime = tehran.toISOString().slice(0, 10);
    timeLabel.dateTime = now.toISOString();
    var timeText = time.hour + ':' + time.minute;
    var fullDate = fullDateFormat.format(tehran);
    timeLabel.setAttribute('aria-label', 'ساعت تهران ' + timeText + '، UTC+۳:۳۰');
    dateLabel.setAttribute('aria-label', 'تاریخ شمسی تهران، ' + fullDate);
    clock.setAttribute('aria-label', 'ساعت تهران ' + timeText + '، ' + fullDate + '، UTC+۳:۳۰');
    clock.title = clock.getAttribute('aria-label');
    // The display shows minutes; one update at each minute boundary is enough.
    if (!document.hidden) timer = setTimeout(update, 60000 - (now.getTime() % 60000));
  }
  document.addEventListener('visibilitychange', update);
  window.addEventListener('pageshow', update);
  window.addEventListener('pagehide', function () { clearTimeout(timer); });
  update();
})();
