/* ══════════════════════════════════════════════════════════════
   Glass Marquee: Daily Rotating Motivational Quotes for 4 Dayparts
   صبح · ظهر · عصر · شب
   ══════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  const marquee = document.getElementById('status-marquee') || document.querySelector('.glass-marquee');
  if (!marquee) return;

  const badgeIcon = marquee.querySelector('.gm-badge-icon');
  const badgeText = marquee.querySelector('.gm-badge-text');
  const track = marquee.querySelector('.gm-track');
  if (!track) return;

  // Rich dictionary of warm greetings & programming motivational quotes:
  // Organized by Daypart, with multiple daily sets that rotate every day.
  const MESSAGES_BY_DAYPART = {
    morning: {
      icon: '🌅',
      label: 'صبح بخیر',
      dailySets: [
        [
          'روزتون شیرین و پر انرژی؛ با ذهنی تازه و روحیه‌ای سرشار کدهای شگفت‌انگیز خلق کن! ☀️',
          'صبحتون بخیر و نیکی؛ امروز بهترین فرصت برای فتح قله‌های جدید یادگیری و موفقیته! 🚀',
          'یک فنجان چای داغ و شروع برنامه‌نویسی با فکری باز؛ روزت سرشار از خلاقیت! ☕✨',
          'صبح روشن شما شاد؛ هر باگ امروز پله‌ای برای رسیدن به کمال کدهایتان است! 🌱',
        ],
        [
          'صبح پر امید؛ آغاز روزی درخشان برای نوشتن کدهای تمیز و معماری‌های بی‌نقص! 💎',
          'روزتون شیرین و پرانرژی؛ ذهن خلاقت آماده ساختن راه‌حل‌های بزرگ است! 💡',
          'سلامی گرم در آغاز روز؛ امروز جهان با کدهای تو جای بهتری برای زندگی خواهد بود! 🌍',
          'انرژی صبحگاهی همراهت؛ با آرامش و تمرکز گام‌های بزرگ بردار! 🎯',
        ],
        [
          'صبح دل‌انگیز و پرنشاط؛ کدهایت را با عشق بنویس تا اثری ماندگار خلق کنی! 🌟',
          'روزت سرشار از موفقیت‌های غیرمنتظره و راه‌حل‌های هوشمندانه! ⚡',
          'یک صبح تازه یعنی یک شانس دوباره برای بهینه‌سازی و پیشرفت روزافزون! 🛠️',
          'امروز رو با انگیزه آغاز کن؛ هیچ کدی آن‌قدر پیچیده نیست که از پسش برنیایی! 💪',
        ],
      ],
    },
    noon: {
      icon: '☀️',
      label: 'ظهر بخیر',
      dailySets: [
        [
          'ظهرتون زیبا و دل‌نشین؛ خسته نباشید و پرتوان به سوی اهداف درخشان امروز! 🌤️',
          'نیمروزتون پر برکت و سرشار از تمرکز؛ پیشرفت‌های امروزت رو جشن بگیر! 💡',
          'یک وقفه کوتاه برای آرامش ذهن، و بازگشت با قدرت برای حل مسائل بزرگ! 🍵',
          'ظهرتون بهشت؛ هنر یک برنامه‌نویس واقعی تبدیل پیچیدگی‌ها به سادگی است! 🎯',
        ],
        [
          'ظهر سرشار از انرژی؛ نیمی از روز گذشت و نیمی دیگر پر از فرصت‌های طلایی است! ✨',
          'خداقوت برنامه‌نویس؛ ذهن تو توانمندترین ابزار برای غلبه بر هر چالشی است! 🧠',
          'نیمروزی آرام و ثمربخش؛ هر خط کدی که اصلاح می‌کنی ارزش سیستم را بالاتر می‌برد! 🛡️',
          'انرژی نیمروزت بالا؛ موفقیت حاصل استمرار و پشتکار در همین لحظه‌هاست! 🔥',
        ],
        [
          'ظهرتون به کام؛ استراحت کوتاه، نفس عمیق و ادامه مسیر با انگیزه دوچندان! 🌿',
          'با آرامش کارهایت را پیش ببر؛ کیفیت کد بالاتر از کمیت کد است! 💎',
          'ظهر آفتابیتون پربرکت؛ امروز کارهایی رو به سرانجام می‌رسونی که بهشون افتخار کنی! 🏆',
          'تمرکزت رو حفظ کن؛ کدهای تمیز بازتابی از تفکر شفاف و منظم توست! 🧩',
        ],
      ],
    },
    afternoon: {
      icon: '🌇',
      label: 'عصر بخیر',
      dailySets: [
        [
          'عصرتون قشنگ و رویایی؛ خستگی روز رو به لبخند رضایت از کارهای امروز بسپار! 🌅',
          'عصر دل‌انگیز پاییز؛ با آرامش خطوط کد رو تمیز و بازبینی کن! 🍂',
          'غروبی سرشار از آرامش؛ زمان عالی برای مرور دستاوردها و بهینه‌سازی الگوریتم‌ها! 🌇',
          'عصرتون پر از حس خوب؛ خلق هر خط کدِ تمیز یک شاهکار هنریِ ماندگار است! 💻',
        ],
        [
          'عصر قشنگتون پر از آرامش؛ قهوه‌ای بنوش و به پیشرفت‌های امروزت لبخند بزن! ☕',
          'غروب زیبا و الهام‌بخش؛ ایده‌های خلاقانه در آرامش عصرگاهی شکوفا می‌شوند! 🎨',
          'خداقوت به دستان هنرمندت؛ امروز یک قدم دیگر به چشم‌انداز بزرگت نزدیک‌تر شدی! 🚀',
          'عصرتون خوش؛ مرور کدها با چشمانی باز و ذهنی آرام لذت دیگری دارد! 🔍',
        ],
        [
          'عصرتون سرشار از حس سبکی و شادابی؛ قدردان تلاش خستگی‌ناپذیر امروزت باش! 💫',
          'لحظات آرام عصرگاهی؛ فرصتی برای نظم بخشیدن به پروژه‌ها و مستندسازی ایده‌ها! 📝',
          'غروب چشم‌نواز؛ هر تلاشی که امروز کردی ثمره شیرین فردایت را می‌سازد! 🌳',
          'عصرتون شاداب؛ آرامش بهترین کاتالیزور برای تصمیم‌های برنامه‌نویسی درست است! 🕊️',
        ],
      ],
    },
    night: {
      icon: '🌙',
      label: 'شب بخیر',
      dailySets: [
        [
          'شبتون پر ستاره و رویایی؛ در سکوت شب خلاقیت عمیق‌ترین شکل خود را پیدا می‌کند! 🌙',
          'شبی پر از آرامش و ستاره‌های درخشان؛ استراحت آرام برای ذهنی که فردا شگفتی خواهد آفرید! ✨',
          'شب شما آرام و دل‌پذیر؛ کدنویسی در سکوت نیمه‌شب، لذتی بی‌همتاست! 🌌',
          'آرامش شب همراه رویاهای قشنگتون؛ کدهات رو مرتب کن و به رویاهات بال پرواز بده! 🌟',
        ],
        [
          'شبتون پر ستاره؛ خسته نباشی از یک روز پرتلاش و سازنده! 🌠',
          'سکوت شب، بهترین همراه برای تمرکز عمیق و حل معماهای دشوار الگوریتمی! 🔮',
          'خوابی عمیق و رویاهایی درخشان؛ فردا روز دیگری است برای درخشیدن تو! 🛌',
          'آرامش شبانگاهی گوارای وجودت؛ ذهنت را سبک کن و به آرامش بسپار! 🕯️',
        ],
        [
          'شبتون مهتابی و آرام؛ زیبایی کدها در تاریکی شب نمایان‌تر است! 🌙',
          'ستاره‌های آسمان گواه تلاش تو هستند؛ خسته نباشی قهرمان کدنویسی! 🔭',
          'شب زیباتون خوش؛ استراحت کافی کلید حفظ خلاقیت و هوش سرشار است! 💤',
          'شبی سرشار از صلح و آسایش؛ فردا روزی تازه برای فتح افق‌های نوین است! 🌈',
        ],
      ],
    },
  };

  // Determine current Tehran Daypart:
  // صبح: 05:00 - 12:00 | ظهر: 12:00 - 16:30 | عصر: 16:30 - 21:00 | شب: 21:00 - 05:00
  function getTehranSlot() {
    const now = new Date();
    const tehran = new Date(now.getTime() + (now.getTimezoneOffset() + 210) * 60000);
    const total = tehran.getHours() * 60 + tehran.getMinutes();
    if (total >= 5 * 60 && total < 12 * 60) return 'morning';
    if (total >= 12 * 60 && total < 16 * 60 + 30) return 'noon';
    if (total >= 16 * 60 + 30 && total < 21 * 60) return 'afternoon';
    return 'night';
  }

  // Get daily seed (changes each calendar day)
  function getDaySeed() {
    const now = new Date();
    const tehran = new Date(now.getTime() + (now.getTimezoneOffset() + 210) * 60000);
    const startOfYear = new Date(tehran.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((tehran - startOfYear) / 86400000);
    return Math.abs(dayOfYear);
  }

  let currentSlot = '';
  let currentSeed = -1;

  function updateMarquee(slotId) {
    const slot = slotId || getTehranSlot();
    const seed = getDaySeed();

    if (slot === currentSlot && seed === currentSeed) return;
    currentSlot = slot;
    currentSeed = seed;

    const slotData = MESSAGES_BY_DAYPART[slot] || MESSAGES_BY_DAYPART.night;
    const sets = slotData.dailySets;
    const quotes = sets[seed % sets.length];

    if (badgeIcon) badgeIcon.textContent = slotData.icon;
    if (badgeText) badgeText.textContent = slotData.label;

    // Build seamless scrolling track (duplicated twice for infinite flow)
    const quoteHtml = quotes
      .map(
        (q) => `<span class="gm-item">${q}</span><span class="gm-divider" aria-hidden="true"></span>`
      )
      .join('');

    track.innerHTML = quoteHtml + quoteHtml;
  }

  // Listen to Daypart changes from DaypartClock
  window.addEventListener('cognicode:daypart-change', (e) => {
    if (e.detail && e.detail.slot) {
      updateMarquee(e.detail.slot);
    }
  });

  // Check periodically (every minute)
  setInterval(() => {
    updateMarquee();
  }, 60000);

  // Initial update
  updateMarquee();

  window.GlassMarquee = {
    setSlot: updateMarquee,
  };
})();
