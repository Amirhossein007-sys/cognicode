/* ══════════════════════════════════════════════════════════════
   Daypart Clock (Flip Clock / Select-10 Style Engine)
   Tehran Timezone (UTC + 3:30) & 4 Dayparts: صبح، ظهر، عصر، شب
   ══════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  const clock = document.getElementById('tehran-clock');
  if (!clock) return;

  const hourUnit = clock.querySelector('#dp-hour .dp-digit') || clock.querySelector('.dp-hour');
  const minuteUnit = clock.querySelector('#dp-minute .dp-digit') || clock.querySelector('.dp-minute');
  const periodUnit = clock.querySelector('#dp-period .dp-digit') || clock.querySelector('.dp-period');
  const greetingEl = clock.querySelector('#dp-greeting') || clock.querySelector('.dp-greeting');
  const dateEl = clock.querySelector('.dp-date') || clock.querySelector('.dial-date');
  const liveBtn = clock.querySelector('#dp-live-btn');
  const dialTime = clock.querySelector('.dial-time');
  const pillButtons = clock.querySelectorAll('.dp-pill-btn');

  // Schedule according to user requirements:
  // شب: ۲۱:۰۰ تا ۰۵:۰۰ | صبح: ۰۵:۰۰ تا ۱۲:۰۰ | ظهر: ۱۲:۰۰ تا ۱۶:۳۰ | عصر: ۱۶:۳۰ تا ۲۱:۰۰
  const SLOTS = {
    morning: {
      id: 'morning',
      label: 'صبح',
      previewH: '08',
      previewM: '00',
      previewP: 'AM',
      startMin: 5 * 60,       // 05:00
      endMin: 12 * 60,        // 12:00
      greeting: 'شیفت صبحگاهی · آغاز روز با انرژی و نشاط',
      periodType: 'day',
    },
    noon: {
      id: 'noon',
      label: 'ظهر',
      previewH: '12',
      previewM: '30',
      previewP: 'PM',
      startMin: 12 * 60,      // 12:00
      endMin: 16 * 60 + 30,   // 16:30
      greeting: 'شیفت نیمروز · اوج تمرکز و پیشرفت کارها',
      periodType: 'day',
    },
    afternoon: {
      id: 'afternoon',
      label: 'عصر',
      previewH: '05',
      previewM: '30',
      previewP: 'PM',
      startMin: 16 * 60 + 30, // 16:30
      endMin: 21 * 60,        // 21:00
      greeting: 'شیفت عصرگاهی · مرور دستاوردها و آرامش ذهن',
      periodType: 'night',
    },
    night: {
      id: 'night',
      label: 'شب',
      previewH: '10',
      previewM: '00',
      previewP: 'PM',
      startMin: 21 * 60,      // 21:00
      endMin: 5 * 60,         // 05:00
      greeting: 'ساعات آرام شب · کدنویسی در آرامش و سکوت',
      periodType: 'night',
    },
  };

  let isLive = true;
  let activeSlot = 'night';
  let timer = null;
  let active = true;
  let energySaving = !!(window.__cogniEnergy && (window.__cogniEnergy.lowPower || window.__cogniEnergy.thermal >= 1));

  function pad(n) {
    return ('0' + n).slice(-2);
  }

  // Get Tehran Time (UTC + 3:30 / +210 min)
  function getTehranDate() {
    const now = new Date();
    return new Date(now.getTime() + (now.getTimezoneOffset() + 210) * 60000);
  }

  function determineSlot(h24, m) {
    const total = h24 * 60 + m;
    if (total >= SLOTS.morning.startMin && total < SLOTS.morning.endMin) return 'morning';
    if (total >= SLOTS.noon.startMin && total < SLOTS.noon.endMin) return 'noon';
    if (total >= SLOTS.afternoon.startMin && total < SLOTS.afternoon.endMin) return 'afternoon';
    return 'night';
  }

  function setDigitWithAnimation(el, newText) {
    if (!el || el.textContent === newText) return;
    el.style.transform = 'translateY(8px)';
    el.style.opacity = '0';
    setTimeout(() => {
      el.textContent = newText;
      el.style.transform = 'translateY(0)';
      el.style.opacity = '1';
    }, 120);
  }

  function updateDate(tehran) {
    if (!dateEl) return;
    try {
      const df = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
        timeZone: 'Asia/Tehran',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
      const formatted = df.format(tehran);
      if (dateEl.textContent !== formatted) {
        dateEl.textContent = formatted;
        dateEl.setAttribute('aria-label', 'تاریخ شمسی: ' + formatted);
      }
    } catch (e) {
      dateEl.textContent = 'تهران';
    }
  }

  function updateSlotUI(slotId) {
    activeSlot = slotId;
    const slot = SLOTS[slotId] || SLOTS.night;

    clock.dataset.period = slot.periodType;
    if (greetingEl) {
      greetingEl.textContent = slot.greeting;
    }

    // Highlight only the active daypart button and light up its LED lamp!
    pillButtons.forEach((btn) => {
      const match = btn.dataset.slot === slotId;
      btn.classList.toggle('is-active', match);
      btn.setAttribute('aria-checked', match ? 'true' : 'false');
    });

    // Notify other components (like marquee or theme) about daypart changes
    window.dispatchEvent(new CustomEvent('cognicode:daypart-change', { detail: { slot: slotId } }));
  }

  function render() {
    clearTimeout(timer);
    const tehran = getTehranDate();
    updateDate(tehran);

    const h24 = tehran.getHours();
    const m = tehran.getMinutes();
    const s = tehran.getSeconds();

    if (isLive) {
      const p = h24 >= 12 ? 'PM' : 'AM';
      const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
      const hStr = pad(h12);
      const mStr = pad(m);

      setDigitWithAnimation(hourUnit, hStr);
      setDigitWithAnimation(minuteUnit, mStr);
      setDigitWithAnimation(periodUnit, p);

      const slotId = determineSlot(h24, m);
      updateSlotUI(slotId);

      if (liveBtn) {
        liveBtn.style.opacity = '1';
        const txt = liveBtn.querySelector('.dp-live-text');
        if (txt) txt.textContent = 'وقت تهران';
      }
    }

    if (dialTime) {
      dialTime.textContent = pad(h24) + ':' + pad(m) + ':' + pad(s);
    }

    const interval = energySaving ? 60000 : 1000;
    if (active && !document.hidden) {
      const nextTick = interval - (tehran.getTime() % interval);
      timer = setTimeout(render, nextTick);
    }
  }

  // Preset pill button clicks
  pillButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const slotId = btn.dataset.slot;
      const slot = SLOTS[slotId];
      if (!slot) return;

      isLive = false;
      setDigitWithAnimation(hourUnit, slot.previewH);
      setDigitWithAnimation(minuteUnit, slot.previewM);
      setDigitWithAnimation(periodUnit, slot.previewP);
      updateSlotUI(slotId);

      if (liveBtn) {
        liveBtn.style.opacity = '1';
        const txt = liveBtn.querySelector('.dp-live-text');
        if (txt) txt.textContent = 'بازگشت به زنده';
      }
    });
  });

  if (liveBtn) {
    liveBtn.addEventListener('click', () => {
      isLive = true;
      render();
    });
  }

  // Lifecycle listeners
  function stop() {
    clearTimeout(timer);
  }
  function resume() {
    stop();
    if (active && !document.hidden) render();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else resume();
  });
  window.addEventListener('pageshow', () => { active = true; resume(); });
  window.addEventListener('pagehide', () => { active = false; stop(); });
  window.addEventListener('cognicode:native-active', (e) => {
    active = !!e.detail;
    if (active) resume();
    else stop();
  });
  window.addEventListener('cognicode:energy-change', (e) => {
    const energy = e.detail || {};
    energySaving = !!(energy.lowPower || energy.thermal >= 1);
    resume();
  });

  // Initial call
  render();

  window.DaypartClock = {
    getSlot: () => activeSlot,
    isLive: () => isLive,
    refresh: render,
  };
})();
