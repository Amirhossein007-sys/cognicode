# اصلاح نمایش تمام‌صفحهٔ CogniCode

## اجرای جامع پلن بهبود موبایل و هماهنگی ۳ پلتفرم (۲۰۲۶/۱۰/۰۶ — build ۱۶)

پیرو بازبینی جامع و اجرای برنامهٔ عملیاتی ۲۸ یافتهٔ اصلی (F01 تا F28) و پیوست الحاقی (F29 تا F36):

### جدول همگام‌سازی شماره‌های ساخت (نسخهٔ ۱.۱.۰)

| پلتفرم / محیط | نسخهٔ بازاری (`version`) | شمارهٔ ساخت (`build` / `versionCode`) | هدف و وضعیت |
| :--- | :--- | :--- | :--- |
| **وب / PWA مشترک** | `1.1.0` | Build 16 (`cognicode-v30-smart-fix`) | کش آفلاین کامل (شامل موتور زیپ) بدون ارور سهمیه |
| **نسخهٔ iOS بومی** | `1.1.0` | `CFBundleVersion` 16 | سازگار با iOS 18+ و Dynamic Island |
| **نسخهٔ Android بومی** | `1.1.0` | `versionCode` 16 (`targetSdk` 35) | ساخت مجدد R8، Keystore ضد استخراج، API 24+ |

### اهم اقدامات انجام‌شده در این بیلد:
۱. **حفظ کامل ظاهر، هویت بصری و جریان‌های سالم**: تم‌ها، فونت یکان‌بَخ، ساعت مدارگرد تهران، ذرات سونار، انیمیشن‌ها و Live Activity در حالت عمودی (Portrait) صددرصد دست‌نخورده حفظ شدند.
۲. **رفع نقص کرش و پایداری بازیابی بومی (F21)**: جایگزینی ریست فوری شمارنده با پنجرهٔ زمانی پایداری ۳۰ ثانیه‌ای در WebKit؛ جلوگیری قطعی از لوپ لودینگ هنگام کرش‌های پیاپی.
۳. **امن‌سازی شبکه و عدم نشت توکن در ریدایرکت (F22 و F23)**: اعتبارسنجی دقیق URLهای مجاز تنها درون باندل محلی، مسدودسازی IPهای اختصاصی/لوپ‌بک، مسدودسازی هدر Authorization در ریدایرکت‌های میان‌هاستی و جلوگیری از تنزل پروتکل به HTTP.
۴. **حل مشکل چیدمان افقی اندروید (F24)**: اصلاح اختصاصی مدیاکوئری `max-height: 500px` و لنداسکیپ برای ایجاد حداقل ۱۲۰ پیکسل فضای مفید برای ادیتور بدون کوچک‌ترین اثر جانبی در حالت عمودی.
۵. **موتور استخراج ZIP و حل مشکل Deflate خالص (F01, F04, F10, F11)**: پیاده‌سازی کامل موتور دیکامپرشن RFC 1951 Raw Deflate درون کلاینت برای محیط‌های فاقد پشتیبانی DecompressionStream، کنترل دقیق بودجهٔ حافظه (سقف ۳۵MB) و ایجاد دوسیه منصفانه برای چند فایل.
۶. **تطبیق شواهد امنیتی و رفع تناقض بج (F05, F06, F29)**: سنجش خط‌به‌خط نقل‌قول‌های امنیتی در برابر سورس کد و تنزل ادعاهای نامعتبر هوش مصنوعی؛ اتصال هوشمند دکمه به تحلیل معتبر و ایجاد همخوانی ۱۰۰٪ بین بج خطا و پیشنهاد اصلاح.
۷. **سخت‌سازی بیلد ریلیز اندروید با R8 (F14, F35)**: فعال‌سازی shrinker و minify با قواعد اختصاصی `-keepattributes JavascriptInterface` برای حفظ ۱۰ پل ارتباطی جاوااسکریپت در بیلد ریلیز.
۸. **حذف دارایی‌های زائد و بسته‌های سبک‌تر (F31, F33)**: حذف ۱۵۲ کیلوبایت فونت وزیرمتن و ۱.۶ مگابایت آیکون ۱۰۲۴ تکراری از بسته‌های وب، رفع کامل صفت‌های style درون‌خطی و انطباق با CSP.

## مستندات ساخت بیلد ۱۵ — پکیج ارزیابی امنیتی موبایل (۲۰۲۶/۱۰/۰۵ — build ۱۵)

- هماهنگی نسخه‌های بیلد برای شروع ممیزی جامع موبایل.
- استانداردسازی خروجی ابزارهای بررسی و ثبت شواهد baseline.
- آماده‌سازی تنظیمات اولیه اندروید و یکپارچه‌سازی رابط‌های Bridge.

## مستندات ساخت بیلد ۱۴ — پایدارسازی وضعیت‌های مغزی و پروژه (۲۰۲۶/۱۰/۰۴ — build ۱۴)

- رفع ناپایداری مارکی وضعیت مغزی ادیتور هنگام سوییچ بین نشست‌های تاریخچه.
- بهینه‌سازی بارگذاری اولیه فایل‌های چندگانه در پروژه‌های فشرده.
- افزودن تست‌های خودکار برای ابزارهای گزارش‌گیری.

## پنل «از کجا شروع کنیم؟» دوباره دیده می‌شود (۲۰۲۶/۱۰/۰۴ — build ۱۳)

کاربر گزارش داد پنل شروع سریع داخل ادیتور در PWA دیده می‌شود ولی در اپ نصب‌شده نه. دو ایراد
واقعی پیدا و رفع شد، و یک شکاف ساختاری در آزمون‌ها بسته شد:

۱. **پنل هیچ «سطحی» نداشت.** پس‌زمینهٔ `glass-workspace` عملاً با ادیتور پشتش یکی می‌شد؛
اندازه‌گیری پیکسلی در WebKit اختلاف کانالی **۸ از ۷۶۵** (تیره) و **۷** (روشن) می‌داد. حالا پنل از
رنگ سطح بالارفتهٔ خود برنامه (`--bg2`: `#1e293b` تیره / `#ffffff` روشن) با حاشیه و سایهٔ نرم
استفاده می‌کند و اختلاف به **۴۸** و **۷۲** رسید.

۲. **نمایان‌شدن پنل به یک دستور JS گره خورده بود.** `hidden` از HTML برداشته شد (پیش‌فرض
نمایان)، و `syncQuickStart()` جدا شد و از `onEdit()`، `restoreDraft()` و **انتهای
`initialize()` در هر دو مسیر موفق و خطا** صدا زده می‌شود.

۳. **هیچ چکری WebKit را آزمایش نمی‌کرد** در حالی که اپ WKWebView است. چکر جدید
`tools/check-quick-start.cjs` قرارداد پنل را در **Chromium و WebKit** اجرا می‌کند و پیکسل
واقعی می‌خواند؛ در CI هم WebKit نصب می‌شود. `check-glass` هم به‌جای اجبار آلفای ۰.۴–۰.۵ روی
`.quick-start` (همان مقداری که پنل را نامرئی کرده بود) حالا «سطح‌بودن و یکسان‌نبودن با ادیتور»
را می‌سنجد.

کش سرویس‌ورکر به `cognicode-v26-quickstart` و شمارهٔ ساخت به ۱۳ رفت. علتِ اصلی گزارش کاربر با
اطمینان تأیید نشده: پنل در هر ترکیبی از موتور، تم، کلاس‌های دستگاه و پل بومی که آزمایش شد
نمایان بود. اگر IPA نصب‌شده از ساخت ۶ یا قدیمی‌تر باشد، این بخش در آن اصلاً وجود ندارد
(ویژگی build 7 است).

## دکمهٔ تحلیل با انفجار ستاره‌ای فیروزه‌ای (۲۰۲۶/۱۰/۰۴ — build ۱۲)

دکمهٔ «تحلیل کد» از پنل خنثی به دکمهٔ ستاره‌ای طرح Vue ارسالی تغییر کرد: فیل توپُر فیروزه‌ای
(`#38bdf8 → #1aa3e8`) با متن جوهری تیره (`#0b1622`)، و روی هاور/لمس پنل محو می‌شود و ۶ ستاره
(۲۵/۱۵/۱۵/۸/۵/۵ پیکسل) با زمان‌بندی جدا به بیرون پرتاب می‌شوند. متن در هر دو تم از ۴.۵:۱
عبور می‌کند — اندازه‌گیری پیکسلی: **۶.۶۰:۱** روی پنل توپُر و **۱۰.۲۶:۱** روی پنل خالی (دارک)،
**۶.۶۱:۱** و **۶.۴۹:۱** (لایت). در لایت ستاره‌ها و متنِ حالت انفجار تیره‌اند (`#075985`) چون
سفید روی نوار روشن محو می‌شد.

نکات اجرایی: `overflow: hidden` دکمه برداشته شد تا ستاره‌ها بیرون بزنند و به‌جایش ریپل لمسی
داخل یک `.ripple-layer` بریده می‌شود؛ انفجار روی `touchstart` وصل است (نه `pointerdown`) تا
کنسول‌های سنجش کنتراست با کلیک ماوس بی‌اعتبار نشوند؛ `:hover` داخل `@media(hover:hover)` و با
`:not(:disabled)` محدود شده؛ مسیر ستاره‌ها به پایین و دو طرف متمایل است چون نوار ابزار بالای
دکمه `z-index: 4` دارد و هر ستاره‌ای که بالاتر برود پشت آن پنهان می‌شود؛ جابه‌جایی افقی با
`min(170px,44vw)` سقف خورده؛ زیر `prefers-reduced-motion` کل لایهٔ ستاره پنهان می‌شود.
آیکن هواپیمای کاغذی و انیمیشن‌های بارگذاری، متن‌های وضعیت، `shake` و `:focus-visible`
دست‌نخورده ماندند. ارتفاع ۶۸px، عرض ۹۴٪ و شعاع ۱۴px هم تغییری نکرد.

چکر جدید `tools/check-star-burst.cjs` کنتراست را از پیکسل واقعی رندرشده می‌سنجد (نه از اعلان
CSS) و با قلاب `CC_NEGATIVE=1` ثابت می‌شود که بی‌ارزش نیست. کش سرویس‌ورکر به
`cognicode-v25-burst` و شمارهٔ ساخت به ۱۲ رفت. رندر روی آیفون واقعی تأیید نشده است.

## تصحیح موارد کهنه (۲۰۲۶/۱۰/۰۴ — build ۱۱)

سه مورد در ادامهٔ این سند با کد فعلی هم‌خوان نیستند:

- **ارتفاع دکمهٔ تحلیل**: اینجا ۴۴px نوشته شده؛ مقدار واقعی از `#btn-play` در `workspace.css` می‌آید و **۶۸px** است. قاعدهٔ ۴۴px در `styles.css` هم‌ویژگی و بی‌اثر بود و در build ۱۱ حذف شد.
- **سقف ابعاد تصویر**: اینجا ۳۰۷۲ (و ۱۹۲۰ برای گالری) است؛ کد فعلی `resizeImageToBase64(file, 2048)` است.
- **شمارهٔ ساخت**: این سند تا build ۴ را مستند می‌کند؛ از build ۵ به بعد هر دور سند جدا دارد (`BUILD-7.md` … `BUILD-11.md`).

از build ۱۱ به بعد، ورود فایل یا تصویر دیگر تحلیل را خودکار شروع نمی‌کند — فقط دکمهٔ «تحلیل کد».

---

## صفحه آغازین — ۲۰۲۶/۱۰/۰۱

`launch.js` در PWA و WebView یک صفحه دارک با همان پس‌زمینه ذرات برنامه، تصویر
`analysis-brain.svg` و شعار «با کوگنی، کُدت رو تحلیل کن» نمایش می‌دهد. شمارش سه
ثانیه پس از آماده‌شدن فونت/تصویر و اولین فریم آغاز می‌شود و هنگام رفتن به
پس‌زمینه مکث می‌کند. ادیتور در این مدت پنهان و inert است. پس از پایان، تم ذخیره‌شده
کاربر برمی‌گردد؛ بازگشت به جلسه باز از پس‌زمینه این صفحه را تکرار نمی‌کند.

LaunchScreen.storyboard نیز همان مغز و شعار را با قیود safe area نمایش می‌دهد.
پس‌زمینه استاتیک سیستم iOS از تصویربرداری واقعی پس‌زمینه وب گرفته شده و مغز PNG
همان منبع WidgetKit است. حرکت ذرات و زمان سه ثانیه در رابط مشترک وب اجرا می‌شوند؛
صفحه لانچ سیستم‌عامل زمان‌بندی یا انیمیشن سفارشی ندارد. کش PWA به v16 ارتقا یافت.

`tools/check-launch.cjs` دارک‌بودن، متن دقیق، حفاظت از تم کاربر، زمان سه ثانیه و
عدم تکرار روی pageshow را در سه عرض و هر دو منبع وب/native بررسی می‌کند. برای
بازسازی تصویر پس‌زمینه سیستم و پیش‌نمایش، آن را با `--capture` اجرا کنید.
XML storyboard و وجود منابع بررسی شده‌اند؛ کامپایل Xcode و آزمون روی آیفون واقعی
در محیط ویندوز انجام نشده است.

## ساعت و هدر — ۲۰۲۶/۱۰/۰۱

به‌روزرسانی بعدی همین روز: مسیر EEG با منحنی‌های SVG نرم جایگزین شد. نتیجه
کامل بدون ایراد سبز، ایراد/هشدار قرمز و پاسخ نامعتبر/ناقص یا شکست شبکه بدون
رنگ تأیید نمایش داده می‌شود. تغییر کد نتیجه رنگی قبلی را پاک می‌کند. تاریخ
اکنون روز هفته، سال و روز/نام ماه شمسی را در قاب کوچک نشان می‌دهد.

ورود تصویر: PNG با حداکثر ضلع ۳۰۷۲، detail:high، استخراج JSON و درخواست دوم
برای مقایسه متن با تصویر. متن ناخوانا، پاسخ بریده یا نامعتبر جای پیش‌نویس را
نمی‌گیرد. پس از ورود موفق تصویر، تحلیل خودکار شروع می‌شود. فایل UTF-8/UTF-16
با BOM پشتیبانی می‌شود؛ متن خالی، باینری و encoding نامعتبر رد می‌شود و فایل
معتبر بعد از ورود به ادیتور با API تنظیم‌شده یا موتور محلی تحلیل می‌شود.

بودجه خروجی تحلیل افزایش یافته و دستور تحلیل روی شواهد، شرایط مرزی، امنیت،
async و پرهیز از حدس تقویت شده است. JSON ترمیم‌شده/ناقص حکم سلامت نمی‌گیرد و
بازنویسی خودکار پیشنهاد نمی‌دهد. برای کد بیش از ۴۸۰۰۰ نویسه، درخواست AI ارسال
نمی‌شود و محدودیت صریح گزارش می‌شود؛ میانه فایل دیگر پنهانی حذف نمی‌شود.

آزمون‌های check-code-import با API شبیه‌سازی‌شده مسیر دوربین/گالری، بازبینی دوم،
تحلیل خودکار، UTF-16، باینری و پاسخ ناقص/ناخوانا/بدون کد را در هر دو منبع وب و
native/Web بررسی می‌کنند. check-ai-report حالت سالم، ناسالم، پاسخ خالی و JSON
نامعتبر/بریده و محدودیت فایل را بررسی می‌کند. این آزمون‌ها سنجش دقت یک مدل
واقعی نیستند؛ سرویس واقعی و نصب روی آیفون در این محیط آزموده نشده‌اند.

کامپوننت OrbitalClock ارسالی برای ساختار JavaScript فعلی در `orbital-clock.js`
بازنویسی شد؛ وابستگی React/Tailwind اضافه نشده است. هدر با ستون‌های جانبی برابر
ساعت را وسط قرار می‌دهد. عقربه‌ها UTC+03:30 و تاریخ تقویم Persian با منطقه زمانی
Asia/Tehran را نمایش می‌دهند؛ به منطقه زمانی دستگاه وابسته نیستند. تاریخ همیشه
پیداست و ساعت هنگام بازگشت از پس‌زمینه به‌روز می‌شود.

نوار موج مغزی تزئینی است و داده پزشکی دریافت یا نمایش نمی‌دهد. حرکت نوار با
Reduce Motion متوقف می‌شود. افزایش محدود فضای هدر و نوار، ارتفاع ادیتور را کم
می‌کند؛ اندازه متن و هم‌ترازی لایه‌های کد تغییر نکرده است. دکمه تحلیل ۴۴ پیکسل
ارتفاع و ۹۴٪ عرض دارد. منابع جدید در sync-native و کش نسخه v14 ثبت شده‌اند.

آزمون‌های Chromium: پنج عرض ۳۲۰ تا ۴۴۰ در دو تم برای منابع PWA و native،
مرکز هدر و عدم هم‌پوشانی، نیمه‌شب تهران/نوروز در دستگاه با منطقه زمانی آمریکا،
Reduce Motion، هندسه کیبورد در شش اندازه و هم‌ترازی واقعی لایه‌های کد موفق بودند.
تصاویر هر دو تم بررسی شدند. ساخت IPA و بررسی Safari/WKWebView روی آیفون واقعی
در محیط ویندوز انجام نشده است.

علت مشخص در سورس: `info.path` در XcodeGen فایل Info.plist را تولید و بازنویسی می‌کرد؛ تنظیمات لانچ دستی در `info.properties` تعریف نشده بودند. اکنون `INFOPLIST_FILE` مستقیماً به فایل موجود اشاره می‌کند. نسبت تصویر native ارسالی نیز با پنجرهٔ سازگاری ۳۲۰×۴۸۰ مطابقت دارد؛ اثبات نهایی روی گوشی نیازمند نصب خروجی جدید است.

اصلاحات همراه:
- ارتفاع صفحه با باز و بسته شدن کیبورد تغییر می‌کند؛ ارتفاع ثابت متناقض حذف شد.
- transform روی ریشهٔ صفحه حذف شد تا پنل‌های fixed به viewport متصل بمانند.
- تزریق تکراری viewport پیش از آماده‌شدن document.head حذف شد؛ متادیتای index.html مرجع است.
- هم‌پوشانی کیبورد در مختصات خود WebView محاسبه می‌شود.
- CI تغییر ناخواستهٔ plist بعد از XcodeGen و نقص منابع در app کامپایل‌شده را بررسی می‌کند.

بررسی انجام‌شده در ویندوز: اعتبار plist، نحو app.js و هندسهٔ صفحه/کیبورد در مرورگر Chromium برای 375×812، 393×852، 430×932 و 440×956 موفق بودند. این آزمون‌ها جای اجرای WKWebView و بررسی safe area روی iOS را نمی‌گیرند. Xcode و شبیه‌ساز در این محیط در دسترس نبودند؛ IPA ساخته نشده است.

## بازبینی دوم با SwiftUI Expert

تنظیمات `INFOPLIST_FILE`، منبع لانچ، اندازه‌گیری WebView توسط SwiftUI و مالکیت فاصله‌های امن/کیبورد بررسی شدند. ریشه عمداً safe area کیبورد را نادیده می‌گیرد، زیرا محتوای وب آن را مدیریت می‌کند؛ کوچک‌کردن هم‌زمان قاب SwiftUI و صفحهٔ وب باعث کاهش دوبرابری فضا می‌شود.

دو ایراد دیگر اصلاح شدند:
- نام مدل‌های ناشناخته دارای علامت نقل‌قول (مانند `6.9"`) در JavaScript تزریقی خطای نحوی ایجاد می‌کرد. داده‌ها اکنون با JSONSerialization منتقل می‌شوند و نسخهٔ سیستم‌عامل واقعی گزارش می‌شود.
- پیام‌گیرهای WebKit هنگام dismantle حذف می‌شوند تا چرخهٔ نگهداری Coordinator/WebView شکسته شود. رصدگر کیبورد نیز به همان Coordinator تعلق دارد و همراه آن پاک‌سازی می‌شود.

آزمون اسکریپت دستگاه: شش حالت شامل نام‌های نقل‌قول‌دار و تزریق قبل/بعد از آماده‌شدن DOM موفق بود. آزمون هندسهٔ وب به صفحهٔ کوتاه 375×667 و حالت بدون کلاس‌های native هم گسترش یافت. این آزمون اخیر هنوز callback کیبورد native را شبیه‌سازی می‌کند، نه رفتار واقعی Safari.

دکمه‌های برنامه HTML هستند و از قبل جلوهٔ شیشه‌ای CSS دارند. افزودن دکمهٔ موازی SwiftUI ضروری تشخیص داده نشد؛ Liquid Glass بومی اضافه نشده است. استفاده از WKWebView برای پشتیبانی iOS 18 و پل‌های موجود حفظ شد.

وضعیت نهایی: اصلاح علت محتمل letterboxing در سورس تأیید شد؛ ساخت Xcode، اجرای WKWebView، safe area واقعی، تغییر تم و پاک‌سازی حافظه روی دستگاه هنوز آزموده نشده‌اند. خروجی IPA در این محیط تولید نشده است.

## اجرای گردش کار ساخت

فایل‌های اصلاح‌شده را در مخزن GitHub خود قرار دهید. در Actions، گردش کار `Build CogniCode IPA` را با `Run workflow` اجرا کنید. پس از موفقیت، artifact به نام `CogniCode-ipa` حاوی `CogniCode-unsigned.ipa` است. این خروجی بدون امضاست و برای نصب به روش امضای مورد استفادهٔ شما نیاز دارد. برای خروجی امضاشده، گواهی و provisioning profile مناسب لازم است.

## بررسی روی آیفون

پس از نصب خروجی جدید، تمام‌صفحه‌بودن، فاصله از ناچ و نشانگر خانه، دسترسی به نوار ابزار هنگام بازشدن کیبورد و بازگشت ارتفاع پس از بستن آن را بررسی کنید. همچنین تنظیمات، تغییر تم و انتخاب تصویر را امتحان کنید. با سه بار لمس برند، ابعاد viewport در ابزار تشخیص موجود نمایش داده می‌شود؛ در آیفون‌های جدید نباید ۳۲۰×۴۸۰ باشد.

اگر نمایش قدیمی باقی ماند، ابتدا مطمئن شوید IPA جدید را نصب کرده‌اید. پیش از هر حذف و نصب مجدد، از داده‌ها و تنظیمات محلی برنامه پشتیبان بگیرید.

## تغییر رفتار کیبورد — ۲۰۲۶/۰۹/۲۵

طبق درخواست جدید، کیبورد باید روی صفحه ظاهر شود و چیدمان اصلی ثابت بماند. این تصمیم جایگزین رفتار کاهش ارتفاع صفحه در توضیحات قبلی است. وابستگی bottom صفحه به ارتفاع کیبورد، انیمیشن آن، مخفی‌کردن نوار اجرا و تغییر فاصلهٔ نوار پایین حذف شدند. callback کیبورد فقط وضعیت بازبودن را برای بستن با سوایپ نگه می‌دارد. فایل‌های وب با native/Web همگام شدند.

آزمون هندسه اکنون ثابت‌ماندن قاب صفحه، ادیتور و نوار پایین را در چرخه‌های بازشدن، تغییر ارتفاع و بسته‌شدن کیبورد بررسی می‌کند. این آزمون callback را در مرورگر شبیه‌سازی می‌کند؛ اسکرول خودکار WKWebView هنگام فوکوس و رفتار واقعی کیبورد باید روی آیفون بررسی شوند. در این محیط ویندوز IPA ساخته نشده است.

## GradientWave and analysis activity (2026-09-26)

The supplied React component's MiniGl/simplex-noise engine is adapted in
`gradient-wave.js`. This project is plain JavaScript (including WKWebView), so
React, shadcn and Tailwind are not runtime dependencies. `sonar.js` manages
its theme, visibility, reduced-motion and WebGL context lifecycle. Four
palette entries avoid the original vec4 overflow; the mesh covers the whole
viewport. The backing buffer uses CSS-pixel resolution and bounded mesh
segments to limit GPU cost on high-DPR iPhones. requestAnimationFrame follows
the browser's available cadence, without a hard 60 fps cap or frame-based speed.
Actual 120 Hz delivery remains controlled by WebKit/iOS, power and thermal state.

Native Live Activities now have an embedded WidgetKit extension, a shared
attributes type, and the actual app logo. Compact leading shows the logo and
trailing shows the waveform while analysis runs; completion/error use distinct
symbols. Stale activities ask the user to reopen the app. Activities from the
previous session are ended at app launch.

PWA has no ActivityKit API. Its accessible in-app status capsule provides the
logo and animated bars (static with Reduce Motion). The native app hides this
web capsule and uses ActivityKit only; request failures or disabled activities
are reported with the existing toast. Apple's
Live Activity animation limits do not permit promising a continuously running
Now Playing equalizer; the native waveform is a status symbol with a transition
when state changes, not an audio playback session.

Validation on Windows: Node syntax checks, device-script tests (6 cases),
check-layout.cjs (6 viewport configurations), check-gradient.cjs for web and
native bundles (WebGL, themes, reduced motion, start/completion/dismissal,
context loss/recovery). Screenshots: wave-light.png and wave-dark.png.
Run tools/sync-native.ps1 before building. The IPA verifier now requires the
embedded extension and its assets. The unsigned CI IPA must be signed together
with its extension before installation. Xcode compilation, physical Dynamic
Island presentation and ProMotion frame pacing still require a Mac/iPhone.

## Native system activity routing (2026-09-27)

Play starts a system ActivityKit request once analysis actually begins (an empty
editor or the API-setup chooser does not start an activity). The native bridge
suppresses the web status capsule. PWA keeps its existing behavior. The compact
WidgetKit presentation remains app logo leading and waveform trailing; minimal,
expanded and Lock Screen layouts remain provided by the extension.

DynamicIslandManager now owns a typed activity on the main actor, reports
request failure/disabled authorization, checks that the signing tool preserved
the extension, and ends immediately on completion/error or web-process teardown.
It clears prior-session activities at launch and bounds orphaned activities with
a 120-second in-process timeout (the AI request has a 90-second timeout). This
timer is not guaranteed to execute while iOS suspends the app; staleDate marks
outdated content, and restart cleanup ends abandoned activities. This does not
add a server/APNs background progress system.

Apple controls presentation: https://developer.apple.com/design/human-interface-guidelines/live-activities

## دور بهینه‌سازی و رفع باگ موتور — ۲۰۲۶/۰۹/۲۷

پس از بازبینی صفر تا صد کل برنامه، همهٔ یافته‌ها پیاده شد — بدون هیچ تغییری در
طراحی و ظاهر (شرط صریح کاربر) و بدون فیکس صفحه‌های کوچک (به درخواست کاربر):

- نقطه‌های خطای گاتر اکنون با اسکرول کد همراهی می‌کنند (syncScroll) و اورلی خطا
  با padding-top ۱۲px دقیقاً هم‌تراز متن است؛ jumpToLine نیز پدینگ واقعی را لحاظ می‌کند.
- رنگ نقطه‌های زبان با کلاس `.ld-*` اعمال می‌شود؛ CSP بدون unsafe-inline نایل‌استایل
  را رد می‌کرد و نقطه‌ها بی‌رنگ رندر می‌شدند. ۳۶ کلاس رنگ از LANGS تولید شد.
- سرویس‌ورکر v12: network-first برای کد و مانیفست (پایان تلهٔ کش کهنه)،
  cache-first فقط برای فونت/آیکون، حذف بایت‌های تکراری (favicon.png و precomposed).
- گارد تحلیل-کهنه در runAnalysis (کد وسط تحلیل تغییر کند نتیجه اعمال نمی‌شود)،
  stopOnce برای Live Activity، کنسل تایمر ۹۰ثانیه‌ای nativeSend، پیام تایم‌اوت مجزا.
- مهاجرت تنظیمات one-shot شد (با ذخیرهٔ فوری نتیجه) تا انتخاب بعدی کاربر حفظ شود؛
  پارس تاریخچه از تنظیمات جدا شد تا خرابی یکی دیگری را پاک نکند.
- detect() به داخل دیبانس ۸۰ms هایلایت منتقل شد؛ رجکس‌های تشخیص css/python کران‌دار
  شدند (رفع حالت چندجمله‌ای روی ورودی‌های بزرگ).
- چکر: کاراکتر-لیترال C-خانواده/Go/R، رجکس-لیترال js/ts/go با heuristics کاراکتر
  قبلی، ترنسپوز متلب، multiline درست گرووی، شمارش خط با ادامهٔ رشته، خطاهای EOF
  خارج از سقف ۲۵تایی، گارد null برای lintWarnings/codeOnlyLines.
- reduced-motion کامل شد (armPulse/glowPulse/sparkleRotate/dotBlink/ripplePop/mdRise)
  و سه حفرهٔ کنتراست تم روشن بسته شد (.lang-item.sel/:active، .key.danger).
- WebView.swift: وضعیت Live Activity به‌صورت لیترال JSON تزریق می‌شود نه interpolation خام.
- پاک‌سازی: ۹ فایل یتیم حذف شد (۶ PNG پس‌زمینه، favicon، precomposed،
  gradient-wave.js ×۲) و sync-native.ps1 به‌روز شد. متغیر مرده analyzed و
  المنت/CSS مرده cur-line حذف شدند.

راستی‌آزمایی مرورگر (Chromium، ویوپورت 393×852): ۱۶ تست موتور بررسی/تشخیص،
سینک اسکرول، رنگ نقطه‌ها، مهاجرت دو-سناریویی، کش v12 — همه سبز. اسکرین‌شات
تم تاریک/روشن با قبل مقایسه شد و طراحی تغییری نکرده است.
The owning app cannot force permanent foreground Dynamic Island visibility or
the system music player's continuously animated equalizer. Do not remove PlugIns
when signing/installing the IPA. With Live Activities enabled, validate on an
actual Dynamic Island iPhone: start a long AI analysis, leave the app while it is
still running, check the compact logo/waveform and expanded status, then return
and verify completion removes the activity. Also test disabled Live Activities,
AI failure, repeated analyses and relaunch. Local checks do not certify native
presentation, signing or Xcode compilation.

`tools/check-native-activity.cjs` passes success, code-error, unexpected-exception
and PWA scenarios using a WKWebView bridge double in a browser. It verifies the
Play flow sends start/stop, suppresses the native web capsule, reports disabled
authorization and preserves PWA feedback.

## Gallery import and particle background (2026-09-27)

The + file button now offers text file, photo library (image/* without capture),
and camera. Gallery and camera share a Vision import pipeline: validate file
size/type, resize to at most 1920 pixels, send to the configured AI endpoint,
then place extracted code into the editor with Undo support. The import sheet
explains image transmission. The user reviews the transcription and presses
Analyze; extraction does not invent a progress percentage or silently analyze
unreviewed OCR. A configured image-capable model and network access are required.
No-code, invalid-image and service-error cases preserve existing editor text.
Controls prevent overlapping image imports/analysis. Native image extraction
also starts/stops the existing ActivityKit bridge. PWA requests have a 90-second
abort timeout. HEIC decoding depends on the platform; unsupported images prompt
for JPEG/PNG rather than hanging the import.

The supplied particles-bg React design is adapted to the existing dependency-free
web architecture in sonar.js (the Sonar facade preserves existing call sites).
It implements cyan/blue particles, pulsing radius/opacity, distance-linked lines,
bouncing motion, desktop hover links, and bounded particle insertion on unused
background space. Buttons and editor gestures are not intercepted. No React,
Tailwind, shadcn or CDN is required. The old GradientWave script is no longer
loaded or precached. The service-worker cache version is bumped for this update.

Animation uses elapsed time and requestAnimationFrame, capped particle density
and a maximum 2x backing resolution. It pauses when hidden or in Reduce Motion;
theme changes reuse the canvas. Native/Web is synchronized from root sources.
Stable editor/panel surfaces preserve readability over the moving background;
the toolbar header also gets a theme-aware surface, with increased-contrast
media-query support.

Windows validation: check-gallery-particles.cjs exercises web fetch and a native
bridge double, gallery chooser, image payload, successful import/Undo, no-code,
server failure, invalid image, file import, both themes and Reduce Motion.
The AI response is mocked: physical iOS photo-picker behavior, provider/model
Vision support, actual OCR accuracy and native compilation still require device
and service validation. The existing keyboard-layout and native activity tests
are also run after integration.

## Glass surfaces and native activity diagnostics (2026-09-27)

Editor, editing toolbar and bottom controls now use translucent theme-specific
surfaces with a restrained 5px blur. Secondary labels/line numbers are strengthened;
the Play gradient is darkened to support its white label. Increased contrast and
Reduce Transparency use opaque surfaces. Both web/native resources are synced.

Native ActivityKit diagnostics are now persistent in Settings: extension presence,
user/system authorization, last request result, active activity count and the
actual NSError domain/code/message. Missing extension, disabled permission and
non-foreground requests are distinguished. Successful request acceptance is not
reported as proof of Dynamic Island rendering. The panel is native-only, and
native ActivityKit continues to end when analysis completes without a web capsule.

Inspected the local downloaded unsigned IPA in Downloads/ipa's: the WidgetKit
extension, its Assets.car, correct parent/extension identifiers and the main
NSSupportsLiveActivities key are present. This does not prove the sideloaded copy
retains the extension or that iOS permits/displays it. User has not yet tested
visibility outside the owning app. There is no verified on-device root cause or
confirmed rendering fix. iOS controls foreground/compact presentation; no public
API is used to force a permanent music-style island inside the owning app.

Validation: check-glass.cjs verifies translucent surfaces in both themes, the
increased-contrast fallback, native diagnostics rendering and PWA isolation;
check-native-activity.cjs covers analysis success/error/exception and PWA behavior;
check-layout.cjs covers six screen configurations and keyboard overlay behavior.
Native compilation and physical-device ActivityKit rendering remain unverified.

## Light glass / black-island investigation — build 2

Only light-theme glass is changed: editor opacity .22, toolbar opacity .24,
backdrop blur 2px. Dark glass retains .46/.42 and 5px blur. Light syntax colors
for numbers, types, functions, strings and attributes are darkened after contrast
sampling against the rendered blue glass. Accessibility opaque fallbacks remain.

The reported black expanded island is consistent with an activity whose widget
content did not render, but no extension crash log or physical-device trace is
available to prove the cause. Rendering mitigations: remove symbol replacement
transition, rasterize/cache logo images once at exactly 20/24/32/40pt (3x), provide
a system-symbol fallback, and include an explicit app title in expanded content.
No glassEffect is added to the system island. The app's glass panels are HTML in
WKWebView; SwiftUI Liquid Glass modifiers cannot apply to individual DOM panels.

The coordinator is main-actor isolated; ActivityKit start no longer takes an extra
DispatchQueue hop before the AI request captures its activity ID. Analysis gets
a bounded UIKit background task. When the associated native network request
finishes while the app is backgrounded, native code ends only that activity,
without waiting for suspended JavaScript. This means network response received,
not a claim that the returned code has no errors; result rendering occurs on
return. Expiration releases the background task and closes the activity; late
callbacks cannot close a newer session. This is finite runtime, not APNs or an
unlimited background job. Force-quitting is not supported as continued analysis.

App and extension build numbers are now 2, shown in native diagnostics alongside
the actual ActivityKit state. The bundle verifier checks matching build numbers,
compiled Live Activities support and the extension executable. Device validation:
install build 2 preserving PlugIns; start an AI analysis, go Home before it ends,
inspect compact/expanded views and completion, and capture diagnostics plus iOS
version if the island remains blank. Xcode compilation/device rendering and
background execution timing remain unverified on this Windows host.

Validation: JS syntax, source plist verification, glass/dynamic-contrast browser
checks, and native-bridge success/error/exception/PWA regression checks passed.

## Dynamic Island live-activity persistence fix — build 3 (2026-09-27)

گزارش کاربر (iOS 27، نصب با Sideloadly، Live Activities فعال در تنظیمات):
هنگام تحلیل و خروج از برنامه، آیلند هیچ چیزی نشان نمی‌داد و با لمس طولانی
به یک نوار سیاه خالی دراز می‌شد (اسکرین‌شات ثبت شده).

دو علت مستقل پیدا شد:

۱. باگ کد — اصلاح شد: هندلر انقضای background task در DynamicIslandManager
Activity را حدود ۳۰ ثانیه بعد از خروج از برنامه کاملاً می‌بست (background-expired)
و آیلند خالی می‌شد، حتی اگر اکستنشن سالم بود. اکنون تعلیق پروسه Activity را
نمی‌کشد: محتوای صادقانهٔ «برای دیدن نتیجهٔ بررسی برنامه را باز کن» با staleDate
۶۰ ثانیه‌ای جایگزین می‌شود و networkFinished یا بازکردن برنامه آن را جمع می‌کند.
همچنین پایان تحلیل با dismissalPolicy ‏.after(4s) چند ثانیه قابل‌دیدن می‌ماند
نه اینکه همان لحظه محو شود.

۲. رندر به امضای اکستنشن وابسته است: آرتیفکت CI با tools/inspect-ipa.ps1
بازرسی شد؛ PlugIns/CogniCodeWidgets.appex با فایل اجرایی و Assets.car موجود است.
امضای اپکس تودرتو توسط Sideloadly همان حالت شناخته‌شدهٔ «اکستنشن کشته‌شده در
اجرا» را می‌سازد: Activity ثبت می‌شود، رندر هرگز انجام نمی‌شود و نتیجه همان
آیلند سیاه خالیِ کش‌آمده است. کد و UI ویجت نیازی به تغییر نداشتند و
تغییری هم نکردند.

Build اپ و اکستنشن به ۳ ارتقا یافت تا پنل دیاگنوستیک نصب جدید را تأیید کند.
رویهٔ دستگاه: اجرای گردش کار Build CogniCode IPA، دانلود CogniCode-ipa، امضا
با حفظ PlugIns (Sideloadly یا 3uTools؛ در صورت تکرار مشکل SideStore/AltStore یا
سرتیفیکیت کامل)، حذف و نصب مجدد، چک «نسخهٔ ساخت: ۳» در پنل دیاگنوستیک، شروع
تحلیل، خروج در چند ثانیهٔ اول و دیدن لوگو/موج در آیلند و محتوای expanded با
لمس طولانی. اگر در همان ثانیه‌های اول آیلند خالی بود و پنل «افزونه: موجود» و
«فعالیت‌های فعال: ۱» می‌گفت، امضای اپکس خراب است؛ راه حل تعویض روش امضاست نه
تغییر کد.

## اعمال گزارش بازبینی CODE-REVIEW-2026-09-27 — 2026/09/28

گزارش بازبینی خط‌به‌خط راستی‌آزمایی شد (تطبیق با کد، فایل‌به‌فایل) و موارد
تأییدشده اعمال شدند — بدون هیچ تغییری در طراحی و ظاهر:

- A1 هم‌ترازی نوار/نقطهٔ خطا: editorPadTop به top حساب‌شده اضافه شد و
  padding-top بی‌اثرِ والد از .err-overlay و .gutter-errs حذف شد (فرزندِ
  position:absolute به padding box چیده می‌شود و padding والد رویش اثر ندارد).
- A2 آیکن چشم با toggleAttribute (hidden روی SVGElement تعریف نشده است).
- A3 اعلام وضعیت Live Activity بعد از رندر منتقل شد؛ اگر رندر استثنا بدهد
  catch وضعیت «خطا» را می‌فرستد — سناریوی native-exception سبز می‌شود.
- A4 شیت‌های بسته visibility:hidden + pointer-events:none با تأخیر ترنزیشن
  گرفتند (VoiceOver/Tab دیگر محتوای شیت بسته را نمی‌بیند؛ بصری تغییری نیست).
- A5 رهایی قفل Tab با Escape (الگوی VS Code) — tabNavReleased با blur ریست
  می‌شود.
- A6 ذخیرهٔ PNG کارت در اپ نیتیو حالا از پل saveImage می‌رود: فایل موقت PNG
  نوشته و برگهٔ اشتراک iOS باز می‌شود؛ در PWA همان دانلود قبلی.
- B1 مدل‌های استدلالی (o1/o3… و gpt-5) به‌جای temperature/max_tokens بدنهٔ
  max_completion_tokens می‌گیرند.
- B2 مقدار enterkeyhint به «enter» اصلاح شد.
- B3 نوار وضعیت PWA در تم تاریک «black» می‌شود (خوانا؛ بدون ریسک هم‌پوشانی
  black-translucent).
- B4 preload فونت حذف شد (خطای CORS از file:// و قرمزی check-gradient رفع).
- C: کلید مردهٔ UIStatusBarStyle از plist حذف شد، measure.ps1 (مسیر شخصیِ
  خارج از مخزن) پاک شد، .gitignore اضافه شد، serve.ps1 پیش‌فرض روی Loopback
  رفت (با -Lan شبکه‌ای)، پل AI حالا localhost/.localhost/.local/.internal و
  IP-literal را رد می‌کند (isBlockedHost)، notifyWeb فقط ارتفاع می‌فرستد و
  شاخهٔ مردهٔ Array.isArray در __nativeAI حذف شد.

دو تصحیح نسبت به خودِ گزارش: (۱) مورد «.editor backdrop-filter:none تناقض
مستندات» نادرست بود — آن خط (۱۶۷۹) قبل از قوانین blur (۱۷۲۳ به بعد) است و
cascade قانون بعدی را اعمال می‌کند؛ بلور ادیتور فعال است و فقط کد مرده است،
دست نخورد. (۲) در DeviceIntelligence فقط کلاس device-pro حذف شد؛ device-max
در styles.css مصرف دارد و --device-model/--device-screen-class قراردادِ
assertشدهٔ check-device-script هستند (CI همین تست را اجرا می‌کند) — حذفشان
CI را قرمز می‌کرد، پس ماندند.

عمداً تغییر نکرد: viewport بدون زوم (تصمیم عمدی قبلی)، کلید API در
localStorage (هشدار در UI موجود)، نام JetBrains Mono در فونت‌استک (بی‌ضرر)،
ctx.direction روی canvas کارت (اعمالش چیدمان متن مختلط را تغییر می‌دهد و
بدون بازبینی بصری مجاز نیست).

اعتبارسنجی در ویندوز: Node/مرورگر در این محیط نیست؛ منطق تست‌ها با کد تطبیق
داده شد (native-exception اکنون «error» می‌فرستد، check-gradient بدون خطای
فونت سبز می‌شود) و هر دو Info.plist از نظر XML معتبرند. اجرای واقعی مجموعه
تست با مرحلهٔ «Verify device JavaScript» در CI انجام می‌شود.

## ریشهٔ واقعی باگ Dynamic Island — کلید گمشدهٔ plist اکستنشن — build 4 (2026/09/28)

درخواست کاربر: آیلند فقط باید باز شود، فقط لوگو نشان دهد و کار کند؛ پنل
«وضعیت Live Activity» در تنظیمات هم حذف شود؛ و علت کارنکردن آیلند پیدا شود.

### علت پیدا شد — و علتِ قبلی نادرست تشخیص داده شده بود

`CogniCodeWidgets/Info.plist` هیچ‌کدام از این کلیدها را نداشت:

- `NSSupportsLiveActivities`
- `NSSupportsLiveActivitiesFrequentUpdates`

`NSSupportsLiveActivities` فقط در Info.plist اپ اصلی بود. کافی نیست: صاحب
`ActivityConfiguration` خودِ اکستنشن است و WidgetKit بدون این کلید بدنهٔ آیلند
را رندر نمی‌کند. نتیجه، رفتار دقیقاً همان است که کاربر گزارش کرده بود — Activity
با موفقیت ثبت می‌شود (`started`، «فعالیت‌های فعال: ۱») اما آیلند سیاه و خالی
می‌ماند.

این باگِ قطعی و درون‌مخزنی است. تشخیص قبلی در بخش «build 3» که همه‌چیز را به
«امضای اپکس توسط Sideloadly» نسبت داده بود، ناقص بود: آن سناریو هم ممکن است
رخ دهد، ولی اول باید کلید plist درست شود. هر دو plist اکنون بازرسی و تست شدند.

### تغییرات

1. `CogniCodeWidgets/Info.plist`: افزودن `NSSupportsLiveActivities=true` و
   `NSSupportsLiveActivitiesFrequentUpdates=true`؛ `CFBundleVersion` → ۴.
2. `CogniCode/Info.plist` و `project.yml` (هر دو target): نسخهٔ build → ۴.
3. `DynamicIslandManager.swift` ساده شد برای چرخهٔ عمرِ قابل‌اتکا:
   - `backgroundTask` و `markWaitingAfterBackgroundExpiry` حذف شدند — منبع اصلی
     پایان‌یافتنِ زودهنگام و آیلندِ خالی پس از خروج از برنامه.
   - شرط `applicationState == .active` از `startAnalysis` حذف شد (مسیر
     `not-foreground` حذف شد).
   - `staleDate` از ۱۲۰ ثانیه به `nil` رفت؛ آیلند تا فراخوانی `stop` زنده می‌ماند.
   - `endAnalysis` با `dismissalPolicy: .immediate` (بدون پنجرهٔ ۴ ثانیه‌ای
     بی‌محتوای باقی‌مانده).
   - `networkFinished` شرط `applicationState == .background` را از دست داد.
   - مهلت ایمنی از ۱۲۰ به ۶۰۰ ثانیه رفت (صرفاً برای جلوگیری از آیلندِ معلق).
   - `diagnostics()` حفظ شد ولی بدون UI؛ فقط برای لاگ.
   - هدر `UIKit` چون دیگر `UIBackgroundTask` مصرف نمی‌شود هنوز لازم است
     (`UIApplication` ارجاعی نمانده — فقط `ActivityAuthorizationInfo`).
4. ویجت فقط لوگو: `AnalysisIndicator` (waveform/checkmark) و همهٔ متن‌های وضعیت
   از compact/expanded/minimal حذف شدند. `expanded` اکنون فقط `.center` با لوگو.
5. پنل «وضعیت Live Activity» از تنظیمات کامل حذف شد:
   - `index.html`: بلوک `native-activity-settings` حذف شد.
   - `app.js`: `__onNativeActivityDiagnostics` و `refreshNativeActivity` و
     فراخوانی‌اش در `openSheet` حذف شدند؛ پیام `not-foreground` از
     `__onNativeActivityStatus` حذف شد.
   - `styles.css`: قانون مردهٔ `#native-activity-details` حذف شد.
   - `WebView.swift`: تزریق `__onNativeActivityDiagnostics` حذف شد (کد مرده).
   - **توست خطا نگه داشته شد** (تصمیم کاربر): اگر آیلند باز نشد، اپ دلیلش را
     (`disabled` / `missing-extension` / `unavailable`) نشان می‌دهد.
6. `tools/check-glass.cjs`: assert روی پنل حذف‌شده جایگزین شد با
   `count() === 0` برای «پنل از تنظیمات حذف شده».

### اعتبارسنجی اجراشده در ویندوز (نه فقط تطبیق کد)

Playwright + کروم سیستمی، `NODE_PATH` روی workspace مدیریت‌شده:

- `check-native-activity.cjs` → PASS ×۴ (native-success/error/exception/pwa)
- `check-glass.cjs` → PASS (هر دو تم، کنتراست بالا، ایزولاسیون PWA)
- `check-layout.cjs` → PASS ×۶ (هر شش اندازه + کیبورد)
- `check-device-script.cjs` → PASS
- `check-gradient.cjs` → PASS ×۲
- `check-gallery-particles.cjs` → PASS ×۲
- `verify-ios-bundle.py` → «Source launch configuration verified»
- بازرسی plist با `plistlib`: کلیدهای اکستنشن موجود، نسخهٔ build هر دو = ۴

### آنچه هنوز تأییدنشده می‌ماند — صادقانه

- **ترجمه و کامپایل Swift تست نشده است.** این محیط Swift/Xcode ندارد؛
  `CogniCodeWidgets.swift` و `DynamicIslandManager.swift` فقط بازرسی چشمی شدند.
  صحت `DynamicIslandExpandedRegion(.center)` در زمان کامپایل تأیید می‌شود.
- **رندر واقعی روی دستگاه تست نشده است.** دو ریسک باقی است: (۱) iOS رفتار
  آیلند در حالت foreground را خودش کنترل می‌کند و نمایش دائمی تضمین نمی‌شود؛
  (۲) اگر Sideloadly امضای اکستنشن را خراب کند، حتی با plist درست هم رندر
  نمی‌شود. برای همین توست‌های خطا نگه داشته شدند تا این دو حالت قابل‌تفکیک باشند.
- رویهٔ دستگاه: گردش کار Build CogniCode IPA را اجرا کن، `CogniCode-ipa` را
  **با حفظ PlugIns** امضا و نصب کن، سپس «بررسی کد» بزن و ببین لوگو در آیلند
  ظاهر می‌شود.
