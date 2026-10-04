# Build 13 — پنل «از کجا شروع کنیم؟» دوباره دیده می‌شود

نسخه ۱.۱.۰، ساخت ۱۳، بازبینی 2026.10.04.3.

گزارش کاربر: پنل شروع سریع داخل ادیتور (چسباندن کد / انتخاب فایل / اسکن تصویر / کد نمونه)
در PWA دیده می‌شود ولی در اپ نصب‌شده روی آیفون دیده نمی‌شود.

---

## ۱. آنچه واقعاً پیدا شد — یک ایراد اندازه‌گیری‌شده

پنل `#quick-start` کلاس `glass-workspace` را دارد و پس‌زمینه‌اش `rgba(15,23,42,.46)` (تیره)
و `rgba(255,255,255,.24)` (روشن) بود. اندازه‌گیری **پیکسل واقعاً رندرشده** نشان داد این رنگ
عملاً با پس‌زمینهٔ ادیتورِ پشتش یکی می‌شود:

| موتور | تم | اختلاف کانالی پنل با ادیتور (از ۷۶۵) |
|---|---|---|
| WebKit (همان موتور اپ) | تیره | **۸** |
| WebKit | روشن | **۷** |
| Chromium | تیره | ۱۷ |
| Chromium | روشن | ۳۰ |

یعنی در موتور WebKit — همان چیزی که WKWebView استفاده می‌کند — پنل هیچ «سطحی» نداشت و فقط با
متن و دکمه‌هایش دیده می‌شد؛ با حاشیهٔ ۱ پیکسلیِ `rgba(255,255,255,.08)` که روی نمایشگر گوشی
تقریباً محو است. این نزدیک‌ترین چیز به «این بخش نمایش داده نمی‌شود» است که در سورس پیدا شد.

**اصلاح:** پنل حالا از رنگ سطحِ بالارفتهٔ خود برنامه استفاده می‌کند — `--bg2` که در تیره
`#1e293b` و در روشن `#ffffff` است — به‌همراه حاشیهٔ روشن‌تر و سایهٔ نرم.

| موتور | تم | اختلاف کانالی قبل → بعد |
|---|---|---|
| WebKit | تیره | ۸ → **۴۸** |
| WebKit | روشن | ۷ → **۷۲** |
| Chromium | تیره | ۱۷ → **۴۶** |
| Chromium | روشن | ۳۰ → **۷۱** |

## ۲. ایراد دوم: پنل به یک دستور JS گره خورده بود

`#quick-start` در HTML صفت `hidden` داشت و فقط با **یک خط** در `workspace-features.js` نمایان
می‌شد (`$('quick-start').hidden = !!ta.value.trim()` که فقط از `onEdit()` صدا زده می‌شد). اگر آن
مسیر در محیط بومی کامل اجرا نشود، پنل تا اولین کلیدِ کاربر پنهان می‌ماند و راه بازیابی ندارد.

**اصلاح:**
- صفت `hidden` از HTML برداشته شد؛ پنل حالا **به‌صورت پیش‌فرض نمایان** است و نیازی به JS ندارد.
  (هنگام صفحهٔ شروع، `html.launch-pending` همه‌چیز را با `visibility` پنهان می‌کند، پس پرش دیده نمی‌شود.)
- `syncQuickStart()` به یک تابع جدا تبدیل شد و حالا از سه جا صدا زده می‌شود: `onEdit()`،
  `restoreDraft()`، و **انتهای `initialize()` در هر دو مسیر موفق و خطا**. یعنی پس از
  آماده‌شدن حافظه، وضعیت پنل قطعی می‌شود؛ حتی اگر بازیابی پیش‌نویس اجرا نشده باشد.
- `syncQuickStart` به API برگشتی `WorkspaceFeatures` اضافه شد.

## ۳. ایراد سوم (ساختاری): هیچ چکری WebKit را آزمایش نمی‌کرد

اپ نصب‌شده WKWebView است، ولی **هر هجده چکر این مخزن کرومیوم را اجرا می‌کنند**. یعنی هر تفاوت
رندر مخصوص WebKit — دقیقاً همان دسته‌ای که کاربر گزارش کرده — بدون دیده‌شدن به دستگاه می‌رسد.
این دلیلِ اصلی این است که ایراد بالا تا حالا کشف نشده بود.

**اصلاح:** چکر جدید `tools/check-quick-start.cjs` که همان قرارداد را در **هر دو موتور** اجرا
می‌کند و اگر WebKit نصب نباشد، با پیام روشن رد می‌شود (نه شکست):

- پنل روی ادیتور خالی نمایان است و هر دو گزینهٔ «اسکن تصویر» و «انتخاب فایل» را دارد؛
- **پیکسل واقعی** خوانده می‌شود: «چیده‌شده» با «رندرشده» یکی گرفته نمی‌شود. دو معیار سنجیده
  می‌شود — نسبت پیکسل‌هایی که با پنهان‌کردن پنل تغییر می‌کنند، و اختلاف رنگی سطح پنل با ادیتور؛
- پیش‌نویسِ بومی پنل را دوطرفه تعیین می‌کند (کددار → پنهان، خالی → نمایان)؛
- تایپ پنل را پنهان می‌کند و خالی‌کردن ادیتور برمی‌گرداند؛
- در هر دو تم.

در `.github/workflows/ios.yml` مرحلهٔ «Install WebKit for the engine-parity check» اضافه شد و
چکر جدید به فهرست اجرا پیوست. ضمناً یک جاافتادگی از build 12 هم بسته شد: چکر
`check-star-burst.cjs` هرگز به فهرست CI اضافه نشده بود و از این پس اجرا می‌شود.

## ۴. چکر `check-glass` تقویت شد، نه تضعیف

`check-glass` قبلاً آلفای پس‌زمینهٔ `.quick-start` را در بازهٔ ۰.۴–۰.۵ (تیره) و ۰.۲–۰.۲۵ (روشن)
اجبار می‌کرد — یعنی دقیقاً همان مقداری که پنل را نامرئی کرده بود. آن یک شرط برای `.quick-start`
حذف شد و جایگزینش دو شرط معنادارتر آمد: پنل باید همچنان `rgba` باشد، باید **با رنگ ادیتور یکی
نباشد**، و باید سطحی و خوانا بماند (آلفا ≥ ۰.۹). سطوح `.editor` / `.keys` / `.bottom` بدون
تغییر قبلی خود را نگه داشتند.

---

## فایل‌هایی که باید روی ریپازیتوری آپلود شوند

بستهٔ آماده: `artifacts/CogniCode-build-13-changes-only/` (۲۲ فایل، با همان مسیرها).

**اجباری — ریشهٔ مخزن (۱۰ فایل)**
`index.html` · `workspace.css` · `workspace-features.js` · `app.js` · `sw.js` ·
`release.json` · `release-manifest.json` · `.github/workflows/ios.yml` ·
`BUILD-12.md` (جدید) · `BUILD-13.md` (جدید)

> حداقلِ واقعی برای اینکه build سبز شود ۱۳ فایل است: هفت فایل ریشه
> (`index.html`, `workspace.css`, `workspace-features.js`, `app.js`, `sw.js`, `release.json`,
> `.github/workflows/ios.yml`) + سه چکر در `tools/` + سه فایل بومی
> (`native/CogniCode/Info.plist`, `native/CogniCodeWidgets/Info.plist`, `native/project.yml`).
> `release-manifest.json` را CI با `--manifest` بازتولید می‌کند و سه سند (`BUILD-12.md`,
> `BUILD-13.md`, `native/BUILD-NOTES.md`) فقط مستندات‌اند. در بسته هستند چون رسم مخزن است.
> **`tools/check-star-burst.cjs` و `tools/check-quick-start.cjs` را با
> `.github/workflows/ios.yml` هم‌زمان بفرستید**؛ اگر workflow برود ولی چکر نباشد، CI روی
> `node tools/check-*.cjs` شکست می‌خورد.

در همین بسته یک ایراد دیگر هم درست شد: نام artifact در `.github/workflows/ios.yml` روی
**build-11** هاردکد مانده بود و دو ساخت عقب بود؛ حالا از `release.json` خوانده می‌شود، پس IPA
دانلودی با شمارهٔ ساخت درست برچسب می‌خورد.

**اجباری — ابزارها (۳ فایل؛ CI این‌ها را اجرا می‌کند)**
`tools/check-star-burst.cjs` (جدید) · `tools/check-quick-start.cjs` (جدید) ·
`tools/check-glass.cjs` (ویرایش‌شده)

**اجباری — بومی (۴ فایل)**
`native/CogniCode/Info.plist` · `native/CogniCodeWidgets/Info.plist` ·
`native/project.yml` · `native/BUILD-NOTES.md` (مستندات)

**نسخهٔ همگام `native/Web` (۵ فایل)**
`native/Web/index.html` · `native/Web/workspace.css` · `native/Web/workspace-features.js` ·
`native/Web/app.js` · `native/Web/sw.js`

این پنج فایل را CI خودش با `tools/sync-native.ps1` از ریشه بازسازی می‌کند، پس اگر آپلودشان
نکنید build شکست نمی‌خورد؛ فقط برای اطمینان در بسته آمده‌اند. **`native/Web/sw.js` باید همان
نسخهٔ خنثی‌شده باشد (یک خط کامنت)، نه کپی `sw.js` ریشه** — اگر اشتباهی کپی شود،
`verify-release.cjs` در CI آن را می‌گیرد.

اگر مخزن شما هنوز بستهٔ **build 11** را نگرفته، این فهرست کافی نیست؛ در آن حالت کل مجموعهٔ
منابع را یک‌بار آپلود کنید (یا فهرست تغییرات build 11 را از `BUILD-11.md` بردارید).

---

## اعتبارسنجی اجراشده در ویندوز

- `check-quick-start` → PASS ×۴ (Chromium + WebKit، هر دو تم). WebKit با
  `npx playwright install webkit` نصب شد (نسخهٔ ۲۳۵۹).
- `check-glass`، `check-workspace` ×۳، `check-analysis-terminal`، `check-star-burst`،
  `check-ui-refinements`، `check-layout`، `check-orbital-header`، `check-persian-font`،
  `check-native-activity`، `check-editor-sync`، `check-code-import`، `check-report-rendering`،
  `check-malwatch`، `check-launch`، `check-change-set`، `check-device-script`، `check-ai-report`
  → طبق `artifacts/suite2.log`
- `verify-release.cjs` → PASS `1.1.0 (13)` با ۲۲ منبع وب/native بایت‌به‌بایت یکسان
- `verify-ios-bundle.py` → «Source launch configuration verified»
- بازرسی چشمی: `artifacts/paint-webkit-{dark,light}.png` و
  `artifacts/build-13-quick-start/quick-start-webkit.png`

## تأییدنشده (صادقانه)

- **علتِ اصلی گزارش کاربر با اطمینان تأیید نشده است.** پنل در Chromium و WebKit، با کلاس‌های
  دستگاه (`has-dynamic-island`، `screen-large-max`، …)، در هر دو تم، با و بدون پل بومی، و با
  پیش‌نویس خالی/پرمحتوا آزمایش شد و **در همهٔ این حالت‌ها نمایان بود**. دو ایراد واقعی که در
  بالا پیدا و رفع شدند، محتمل‌ترین توضیح‌های در‌دسترس‌اند — ولی تا وقتی شمارهٔ ساختِ اپ نصب‌شده
  و یک اسکرین‌شات از گوشی نباشد، نمی‌توان گفت کدام‌یک علتِ همان مشاهده بوده است.
- **پنل شروع سریع یک ویژگی build 7 است.** اگر IPA نصب‌شده از ساخت ۶ یا قدیمی‌تر باشد، این بخش
  در آن اصلاً وجود ندارد. `artifacts/baseline-before-build-7` هیچ `quick-start` ندارد.
- کامپایل Xcode، امضا و رندر واقعی روی دستگاه همچنان تأییدنشده است.
- `check-gradient` و `check-gallery-particles` در این بسته جداگانه اجرا نشدند (خطای محیطی
  شناخته‌شدهٔ `Array buffer allocation failed` در اجرای دسته‌ای)؛ تغییرات به مسیر آن‌ها مربوط نیست.

---

*پایان بستهٔ ۱۳.*
