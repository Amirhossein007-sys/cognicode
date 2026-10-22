/* ══════════════════════════════════════════════════════════════
   Glass Marquee: Seamless, locally shuffled messages for 4 dayparts
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
  // Grouped by daypart; every set participates in the non-repeating pool.
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
          'عصر دل‌انگیزت بخیر؛ با آرامش خطوط کد رو تمیز و بازبینی کن! 🍂',
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

  // Local, curated messages: no network request or AI token use.
  const EVERYDAY_MESSAGES = [
    'قرار نیست امروز همه‌چیز را بسازی؛ یک بخش کوچک را خوب تمام کن. 🌱',
    'گاهی بهترین تغییر، حذف چند خطی است که دیگر لازم نیستند. ✂️',
    'قبل از راه‌حل بعدی، یک بار دیگر خود مسئله را با صدای بلند بخوان. 🔍',
    'پیشرفت همیشه پرسر‌وصدا نیست؛ گاهی یک تست سبز کوچک است. ✅',
    'کدی بنویس که فردای خسته‌ات هم بتواند آن را بفهمد. ☕',
    'اگر راه‌حل پیچیده شد، شاید وقت ساده‌تر پرسیدن سؤال رسیده باشد. 💡',
    'یک نام روشن برای متغیر، هدیه‌ای به نفر بعدی است؛ حتی اگر خودت باشی. 🏷️',
    'همین که امروز چیزی را بهتر فهمیدی، یک قدم جلو آمده‌ای. ✨',
    'راه‌حل خوب از گوش‌دادن دقیق به مسئله شروع می‌شود. 🎧',
    'باگ‌ها دربارهٔ کد خبر می‌دهند، دربارهٔ ارزش تو قضاوت نمی‌کنند. 🌿',
    'اول درستش کن؛ بعد با اندازه‌گیری سراغ سریع‌ترکردنش برو. ⏱️',
    'یک نمونهٔ کوچک بساز؛ ایده‌ها روی صفحه واضح‌تر می‌شوند. 🧩',
    'امروز یک چیز تازه یاد بگیر و همان را در یک مثال کوچک امتحان کن. 🧪',
    'وقتی گیر کردی، ورودی و خروجی را روی کاغذ بنویس. 📝',
    'کمی فاصله از مانیتور، گاهی نزدیک‌ترین راه به جواب است. 🚶',
    'لازم نیست جواب همه‌چیز را حفظ باشی؛ پیدا‌کردن جواب هم یک مهارت است. 🧭',
    'یک خطای قابل بازتولید، از یک حدس طولانی ارزشمندتر است. 🔬',
    'قبل از تغییر بزرگ، یک نسخهٔ امن از کار خوب امروزت نگه دار. 💾',
    'یک کامیت کوچک و روشن، مسیر برگشت را هم روشن نگه می‌دارد. 🌳',
    'تست خوب، رفتار مهم برنامه را توضیح می‌دهد. 🛡️',
    'برای ورودی خالی هم جا بگذار؛ دنیای واقعی همیشه مرتب نیست. 📦',
    'پیام خطای روشن، بخشی از احترام به کاربر است. 💬',
    'گاهی راه رسیدن به پاسخ، پیدا‌کردن کوچک‌ترین مثالِ خراب است. 🔎',
    'قبل از افزودن وابستگی، ببین واقعاً چه مسئله‌ای را حل می‌کند. 🧰',
    'خوانایی امروز، سرعت تغییرات فرداست. 📖',
    'کنجکاوی را نگه دار؛ خیلی از راه‌حل‌ها با «اگر این‌طور شود چه؟» شروع می‌شوند. 💭',
    'یک استراحت کوتاه، عقب‌افتادن نیست؛ مراقبت از ابزار اصلی کار توست. 🍵',
    'توضیح سادهٔ یک ایده، نشانهٔ فهم عمیق آن است. 🗣️',
    'نتیجهٔ عجیب را نادیده نگیر؛ شاید مهم‌ترین سرنخ همان باشد. 🕵️',
    'هر چیزی که کار می‌کند، الزاماً برای همهٔ ورودی‌ها درست نیست. 🎯',
    'یک سؤال خوب می‌تواند ساعت‌ها آزمون‌وخطا را کوتاه کند. ❓',
    'مستند کوتاه و به‌روز، از توضیح طولانی و فراموش‌شده مفیدتر است. 🗂️',
    'امروز یک گوشهٔ مبهم از پروژه را برای خودت روشن کن. 🕯️',
    'از همان ابتدا به کسی فکر کن که با برنامه‌ات کار خواهد کرد. 🤝',
    'چیزی که برای تو واضح است، شاید برای کاربر نیاز به یک نشانهٔ کوچک داشته باشد. 🪧',
    'جزئیات کوچکِ خوب، تجربه‌ای می‌سازند که کاربر به آن اعتماد می‌کند. 💎',
    'به‌جای حدس دربارهٔ کندی، زمان بخش‌های مختلف را اندازه بگیر. 📊',
    'وقتی دو راه نزدیک‌اند، راهی را انتخاب کن که فهمیدنش آسان‌تر است. 🛤️',
    'کد خوب جا برای تغییر دارد؛ لازم نیست آینده را یک‌جا پیش‌بینی کند. 🌤️',
    'اشتباه دیروز می‌تواند مثال آموزشیِ مفید امروز باشد. 📚',
    'گاهی با توضیح باگ برای یک دوست، جواب را خودت پیدا می‌کنی. 🦆',
    'همهٔ هشدارها یکسان نیستند؛ اول سراغ چیزی برو که واقعاً اثر دارد. 🚦',
    'موفقیت کوچک امروزت را ثبت کن؛ روزهای سخت به یادآوری آن نیاز دارند. 🏅',
    'از پروژه‌ای که نصفه مانده هم چیزی یاد گرفته‌ای؛ تجربه گم نمی‌شود. 🌾',
    'به‌جای مقایسه با دیگران، کد امروزت را با کد چند ماه پیش خودت مقایسه کن. 🪴',
    'یادگیری با سرعت خودت هم یادگیری است. مسیرت را ادامه بده. 🐾',
    'یک تابع با مسئولیت روشن، جست‌وجوی خطا را هم ساده‌تر می‌کند. 🧱',
    'قبل از تغییر رفتار، مطمئن شو رفتار فعلی را می‌شناسی. 🗺️',
    'دادهٔ نمونهٔ خوب، سؤال‌های پنهان پروژه را آشکار می‌کند. 🧬',
    'حالت خطا را هم طراحی کن؛ کاربر آنجا بیشتر به راهنمایی نیاز دارد. 🛟',
    'کاری که طول می‌کشد، باید نشانه‌ای از پیشرفت داشته باشد. ⌛',
    'دسترس‌پذیری از جزئیات واقعی شروع می‌شود: متن خوانا، فوکوس روشن و کنترل قابل استفاده. 👁️',
    'یک دکمهٔ واضح، از چند توضیح اضافه جلو می‌زند. 🔘',
    'برای حذف‌کردن هم فکر کن؛ دادهٔ کاربر ارزشمند است. 🗝️',
    'یک تغییر در هر قدم، فهمیدن نتیجه را آسان‌تر می‌کند. 👣',
    'قبل از سپردن کار به حافظه، نکتهٔ مهمش را جایی بنویس. 📌',
    'اگر یک خطا مدام برمی‌گردد، یک مثال آزمون برایش نگه دار. 🧷',
    'همیشه لازم نیست از صفر شروع کنی؛ گاهی یک اصلاح دقیق کافی است. 🪡',
    'وقتی راه‌حل جواب داد، یک بار هم دلیل جواب‌دادنش را مرور کن. 🧠',
    'به مسیر برگشت فکر کن؛ تغییر قابل برگشت با خیال راحت‌تر بررسی می‌شود. ↩️',
    'یک مرز روشن میان بخش‌ها، تغییرات بعدی را کم‌دردسرتر می‌کند. 🧵',
    'ابزار خوب کمک می‌کند بهتر فکر کنی، نه اینکه همهٔ تصمیم‌ها را به جایت بگیرد. 🛠️',
    'ساده شروع کن؛ پیچیدگی لازم، خودش دلیلش را نشان می‌دهد. 🌼',
    'کمی آب بنوش و شانه‌هایت را رها کن؛ بدنت هم همراه این پروژه است. 💧',
    'به چشم‌هایت فرصت بده؛ چند لحظه به نقطه‌ای دور نگاه کن. 🌄',
    'پیش از پایان کار، برای شروع بعدی خودت یک یادداشت کوتاه بگذار. 📮',
    'برای یادگرفتن یک مفهوم، آن را در یک مثال متفاوت به کار ببر. 🔄',
    'خوشحالیِ پیدا‌کردن جواب را از خودت نگیر؛ این لحظه‌ها بخشی از مسیرند. 🎉',
    'قرار نیست اولین نسخه، بهترین نسخه باشد؛ قرار است چیزی به تو یاد بدهد. 🛶',
    'کمک‌خواستن می‌تواند کوتاه‌ترین راهِ یادگیری یک نکتهٔ تازه باشد. 🙋',
    'کد دیگران را با سؤال بخوان: چرا این تصمیم را گرفته‌اند؟ 🧐',
    'یک مرور آرام پیش از ارسال، خیلی از اشتباه‌های کوچک را پیدا می‌کند. 🔖',
    'نتیجه‌ای که قابل توضیح باشد، راحت‌تر قابل اعتماد می‌شود. 🪟',
    'گاهی کیفیت یعنی کاربر مجبور نباشد چیزی را حدس بزند. 🧑‍💻',
    'برای حالت قطع اینترنت هم فکری داشته باش؛ همیشه همه‌چیز در دسترس نیست. 📶',
    'از خطای تازه نترس؛ حالا دربارهٔ مسئله چیز بیشتری می‌دانی. 🔦',
    'پروژهٔ بزرگ با قدم‌های مشخص جلو می‌رود، نه با نگرانی‌های بزرگ. 🏗️',
    'تجربه یعنی این بار می‌دانی اول کجا را نگاه کنی. 🧿',
    'یک توضیح مهربان در بازبینی کد، هم مسئله را حل می‌کند هم همکاری را بهتر می‌کند. 🌻',
    'نام یک مسئله را دقیق انتخاب کن؛ نصف گفت‌وگو از همین‌جا روشن می‌شود. 🖊️',
    'پیش از بهینه‌سازی، مشخص کن چه چیزی باید بهتر شود و چطور می‌سنجی‌اش. 📏',
    'کارِ تمام‌شدهٔ کوچک، از طرح بی‌پایانِ بزرگ انرژی بیشتری می‌دهد. 🔋',
    'به آن بخش کوچکی که بالاخره درست شد لبخند بزن؛ زحمتش را خودت می‌دانی. 😊',
    'یک مثال نقض، می‌تواند از ده مثال موفق آموزنده‌تر باشد. 🧮',
    'پیش‌فرض‌ها را بنویس؛ بسیاری از باگ‌ها پشت یک فرض نانوشته پنهان‌اند. 🪶',
    'اگر امروز خسته‌ای، قدم بعدی را کوچک‌تر کن؛ ارزش مسیرت کم نمی‌شود. 🌙',
    'کاربر معمولاً زحمت پشت صحنه را نمی‌بیند؛ راحتی‌ای را می‌بیند که ساخته‌ای. 🪄',
    'یک خروجی قابل بررسی، شروع یک گفت‌وگوی مفید است. 📬',
    'همهٔ جواب‌ها فوری پیدا نمی‌شوند؛ بعضی مسئله‌ها با کمی زمان روشن‌تر می‌شوند. 🌊',
    'وقتی چیزی را حذف می‌کنی، بررسی کن چه کسی هنوز به آن تکیه دارد. 🧩',
    'پایان خوبِ امروز می‌تواند فقط مشخص‌کردن قدم اولِ فردا باشد. 🌅',
    'زمانی که برای فهمیدن می‌گذاری، در تغییرات بعدی به تو برمی‌گردد. ⏳',
    'گاهی یک نگاه تازه به همان کد قدیمی، مسیر جدیدی نشان می‌دهد. 🪞',
    'یک نام، یک مثال و یک تست روشن؛ ایده‌ات حالا راحت‌تر منتقل می‌شود. 🗒️',
    'خلاقیت فقط ساختن چیز تازه نیست؛ پیدا‌کردن راه ساده‌تر هم هست. 🎨',
    'امروز هم می‌شود چیزی کوچک ساخت که زندگی کسی را کمی راحت‌تر کند. 🌍',
  ];

  const viewport = marquee.querySelector('.gm-viewport');
  if (!viewport) return;
  const HISTORY_KEY = 'cognicode.marquee.history.v1';
  const SPEED = 32; // CSS pixels/second, independent of sentence length.
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const hoverDevice = matchMedia('(hover: hover) and (pointer: fine)');
  const pools = {};
  function messageId(text) {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
    return (hash >>> 0).toString(16).padStart(8, '0');
  }
  for (const slot of Object.keys(MESSAGES_BY_DAYPART)) {
    pools[slot] = [...new Set([...MESSAGES_BY_DAYPART[slot].dailySets.flat(), ...EVERYDAY_MESSAGES])]
      .map(text => ({id: messageId(text), text}));
  }
  let seen = new Set(), lastSeen = '';
  try {
    const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');
    if (saved && Array.isArray(saved.seen)) seen = new Set(saved.seen.filter(id => typeof id === 'string' && /^[0-9a-f]{8}$/.test(id)).slice(-512));
    if (saved && typeof saved.last === 'string') lastSeen = saved.last;
  } catch (_) { /* Storage is optional, including private browsing. */ }
  function persist() {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify({seen: [...seen], last: lastSeen})); } catch (_) {}
  }
  let currentSlot = '', animation = null, offset = 0, motionFrom = 0, motionTo = 0;
  let minuteTimer = 0, staticTimer = 0, resizeFrame = 0, fontsReady = false;
  let nativeActive = true, inViewport = true, editorScrolling = false, hovering = false, focused = false;
  let energySaving = !!(window.__cogniEnergy && (window.__cogniEnergy.lowPower || window.__cogniEnergy.thermal >= 1));
  let quoteObserver;
  function foreground() { return nativeActive && !document.hidden && inViewport; }
  function staticMode() { return reducedMotion.matches || energySaving || typeof track.animate !== 'function'; }
  function mayMove() { return foreground() && !editorScrolling && !hovering && !focused; }
  function nextMessage() {
    const pool = pools[currentSlot] || pools.night;
    const queued = new Set([...track.children].map(node => node.dataset.messageId));
    let available = pool.filter(q => !seen.has(q.id) && !queued.has(q.id));
    if (!available.length) {
      const ids = new Set(pool.map(q => q.id));
      seen = new Set([...seen].filter(id => !ids.has(id) || id === lastSeen));
      available = pool.filter(q => !seen.has(q.id) && !queued.has(q.id));
      persist();
    }
    return available[Math.floor(Math.random() * available.length)] || pool[0];
  }
  function remember(node) {
    if (!node || !node.isConnected || !foreground()) return;
    const id = node.dataset.messageId;
    if (id && !seen.has(id)) { seen.add(id); lastSeen = id; persist(); }
  }
  function appendMessage() {
    const quote = nextMessage(), item = document.createElement('span'), divider = document.createElement('span');
    item.className = 'gm-item'; item.dir = 'rtl'; item.dataset.messageId = quote.id;
    item.setAttribute('aria-hidden', 'true');
    divider.className = 'gm-divider'; divider.setAttribute('aria-hidden', 'true');
    item.append(document.createTextNode(quote.text), divider); track.appendChild(item);
    if (quoteObserver) quoteObserver.observe(item);
    return item;
  }
  function fillQueue() {
    if (staticMode()) { if (!track.firstElementChild) appendMessage(); return; }
    const width = viewport.clientWidth;
    if (!width) return;
    while (track.children.length < 10 && (track.children.length < 3 || track.scrollWidth < width + track.firstElementChild.offsetWidth + 80)) appendMessage();
  }
  function recycleFirst() {
    const first = track.firstElementChild;
    if (first) { if (quoteObserver) quoteObserver.unobserve(first); first.remove(); }
    appendMessage();
    if (track.firstElementChild) { track.firstElementChild.setAttribute('aria-hidden', 'false'); remember(track.firstElementChild); }
  }
  function freeze() {
    if (animation) {
      const progress = animation.effect.getComputedTiming().progress;
      if (progress !== null) offset = motionFrom + (motionTo - motionFrom) * progress;
      animation.onfinish = null; animation.cancel(); animation = null;
    }
    track.style.transform = 'translate3d(' + offset + 'px,0,0)';
  }
  function animateNext() {
    if (!fontsReady || staticMode() || !mayMove() || !viewport.clientWidth || animation) return;
    fillQueue();
    let width = track.firstElementChild.getBoundingClientRect().width;
    // A font-size change can shorten the item already leaving the viewport.
    for (let i = 0; offset >= width && width > 0 && i < 10; i++) { offset -= width; recycleFirst(); width = track.firstElementChild.getBoundingClientRect().width; }
    if (width <= 0) return;
    motionFrom = offset; motionTo = width;
    const running = track.animate([{transform: 'translate3d(' + offset + 'px,0,0)'}, {transform: 'translate3d(' + width + 'px,0,0)'}],
      {duration: Math.max(1, (width - offset) / SPEED * 1000), easing: 'linear', fill: 'forwards'});
    animation = running;
    running.onfinish = () => {
      if (animation !== running) return;
      animation = null; running.onfinish = null; running.cancel();
      offset = 0; track.style.transform = 'translate3d(0,0,0)';
      recycleFirst(); animateNext();
    };
    remember(track.firstElementChild);
  }
  function clockSlot() {
    if (window.DaypartClock && typeof window.DaypartClock.getSlot === 'function') return window.DaypartClock.getSlot();
    const now = new Date(Date.now() + 210 * 60000), total = now.getUTCHours() * 60 + now.getUTCMinutes();
    return total >= 300 && total < 720 ? 'morning' : total >= 720 && total < 990 ? 'noon' : total >= 990 && total < 1260 ? 'afternoon' : 'night';
  }
  function updateMarquee(slotId) {
    const slot = Object.prototype.hasOwnProperty.call(pools, slotId) ? slotId : clockSlot();
    if (slot === currentSlot) return;
    currentSlot = Object.prototype.hasOwnProperty.call(pools, slot) ? slot : 'night';
    const data = MESSAGES_BY_DAYPART[currentSlot];
    if (badgeIcon) badgeIcon.textContent = data.icon;
    if (badgeText) badgeText.textContent = data.label;
    // Leave visible words alone. Only replace messages fully outside the viewport.
    const bounds = viewport.getBoundingClientRect();
    for (const node of [...track.children]) {
      const rect = node.getBoundingClientRect();
      if (rect.right <= bounds.left && !staticMode()) {
        if (quoteObserver) quoteObserver.unobserve(node);
        node.remove();
      }
    }
    if (!track.children.length) appendMessage();
    if (fontsReady) fillQueue();
  }
  function syncState() {
    clearTimeout(minuteTimer); clearTimeout(staticTimer);
    const isStatic = staticMode(), wasStatic = marquee.classList.contains('gm-static');
    if (isStatic !== wasStatic) { freeze(); offset = 0; track.style.transform = 'translate3d(0,0,0)'; }
    marquee.classList.toggle('gm-static', isStatic);
    marquee.classList.toggle('gm-running', !isStatic && mayMove());
    if (animation) { if (mayMove() && !isStatic) animation.play(); else animation.pause(); }
    if (foreground()) {
      minuteTimer = setTimeout(() => { updateMarquee(); syncState(); }, 60000);
      if (isStatic && mayMove()) staticTimer = setTimeout(() => { recycleFirst(); syncState(); }, 18000);
    }
    if (!isStatic) animateNext();
    else if (viewport.clientWidth) remember(track.firstElementChild);
  }
  function layoutChanged() {
    if (!fontsReady || resizeFrame) return;
    resizeFrame = requestAnimationFrame(() => { resizeFrame = 0; freeze(); fillQueue(); syncState(); });
  }
  track.replaceChildren(); track.setAttribute('aria-live', 'off');
  marquee.tabIndex = 0;
  if (window.IntersectionObserver) {
    quoteObserver = new IntersectionObserver(entries => {
      const clip = viewport.getBoundingClientRect();
      for (const entry of entries) {
        const node = entry.target;
        if (!node.isConnected) continue;
        const rect = node.getBoundingClientRect(), visible = entry.isIntersecting && rect.right > clip.left && rect.left < clip.right;
        node.setAttribute('aria-hidden', String(!visible));
        if (visible) remember(node);
      }
    }, {root: viewport, threshold: 0});
    new IntersectionObserver(entries => { inViewport = entries[0].isIntersecting; syncState(); }).observe(marquee);
  }
  marquee.addEventListener('mouseenter', () => { hovering = hoverDevice.matches; syncState(); });
  marquee.addEventListener('mouseleave', () => { hovering = false; syncState(); });
  marquee.addEventListener('focusin', () => { focused = marquee.matches(':focus-visible'); syncState(); });
  marquee.addEventListener('focusout', () => { focused = false; syncState(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) updateMarquee(); syncState(); });
  window.addEventListener('pagehide', () => { nativeActive = false; syncState(); });
  window.addEventListener('pageshow', () => { nativeActive = true; updateMarquee(); syncState(); });
  window.addEventListener('cognicode:native-active', e => { nativeActive = !!e.detail; if (nativeActive) updateMarquee(); syncState(); });
  window.addEventListener('cognicode:editor-scrolling', e => { editorScrolling = !!e.detail; syncState(); });
  window.addEventListener('cognicode:energy-change', e => { const energy = e.detail || {}; energySaving = !!(energy.lowPower || energy.thermal >= 1); syncState(); });
  window.addEventListener('cognicode:daypart-change', e => { if (e.detail && Object.prototype.hasOwnProperty.call(pools, e.detail.slot)) updateMarquee(e.detail.slot); });
  reducedMotion.addEventListener('change', syncState);
  if (window.ResizeObserver) new ResizeObserver(layoutChanged).observe(viewport);
  else window.addEventListener('resize', layoutChanged, {passive: true});
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', layoutChanged);
  updateMarquee();
  Promise.resolve(document.fonts ? document.fonts.ready : null).then(() => { fontsReady = true; fillQueue(); syncState(); });
  window.GlassMarquee = {setSlot: updateMarquee};
})();
