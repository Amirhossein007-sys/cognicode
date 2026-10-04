پکیج حداقلی آپلود CogniCode — ساخت ۱۵ (۱.۱.۰ + ۱۵) — ۲۷ فایل
==============================================================

این پوشه فقط فایل‌هایی را دارد که نسبت به آخرین چیزی که به ریپو آپلود شده
واقعاً تغییر کرده‌اند. محتویات پوشه را روی ریشهٔ ریپو (با همان ساختار پوشه‌ها)
بریزید و به main کامیت بزنید؛ اکشن «Build CogniCode IPA» خودکار می‌سازد و
خروجی: CogniCode-1.1.0-build-15-<run_number>.ipa
سپس مثل همیشه: حذف برنامهٔ قبلی از آیفون + نصب IPA جدید.

چرا همین ۲۷ فایل کافی است؟
--------------------------
- پوشهٔ native/Web عمداً در پکیج نیست: در CI اسکریپت tools/sync-native.ps1
  آن را از روی فایل‌های ریشه از نو می‌سازد و بعد از آن چکِ یکسانی انجام می‌شود.
- بقیهٔ فایل‌ها (مانیفست، آیکون‌ها، فونت‌ها، بقیهٔ سورس Swift، ios.yml و…) با
  آخرین نسخهٔ آپلودشده بایت‌به‌بایت یکی است و آپلود دوباره لازم ندارند.
- ضمناً تغییراتِ ساختِ ۱۴ (که هرگز پکیج و آپلود نشده بود) داخل همین فایل‌هاست:
  checker.js، workspace.css، sonar.js، تغییرات malwatch و چند چکر tools — پس
  با این آپلود، ریپو از نظر محتوا دقیقاً با نسخهٔ محلی یکی می‌شود.

فهرست فایل‌ها
-------------
ریشه (وب و نسخه):
  index.html            — دکمهٔ «اصلاح هوشمند» + متای ساخت ۱۵
  styles.css            — استایل ردیف ابزار و حالت نگاه‌سریع پنل مشکلات
  app.js                — نگاه‌سریع، اصلاح هوشمند، نگاشت خطای کوتا، پل API
  workspace-features.js — سقف توکن ۲۰۰۰، پیام‌های خطای فارسی، پرش به اولین ایراد
  syntax.js             — تشخیص درست PHP (دیگر الکسیر تشخیص داده نمی‌شود)
  sw.js                 — کش v29-smart-fix
  release.json          — ساخت ۱۵
  release-manifest.json — هش‌های تازه
  checker.js            — بهبودهای ساخت ۱۴ (خالص‌سازی کد چسبانده/OCR)
  malwatch.js ، sonar.js ، workspace.css — تغییرات معوقهٔ ساخت ۱۴
نیتیو:
  native/CogniCode/Info.plist           — CFBundleVersion ۱۵
  native/CogniCodeWidgets/Info.plist    — CFBundleVersion ۱۵
  native/CogniCode/App/WebView.swift    — تغییر معوقه (اسلواگ/وب‌ویو)
  native/project.yml                    — CURRENT_PROJECT_VERSION ۱۵
ابزارهای CI (تغییر معوقه):
  tools/*.cjs و tools/*.ps1 و tools/test-engine-upgrade.html

هشدار برای بیلدهای بعدی
-----------------------
شمارهٔ ساخت باید در ۵ جا با هم یکی باشد وگرنه CI رد می‌شود:
  release.json ، متای cognicode-release در index.html ،
  هر دو Info.plist ، CURRENT_PROJECT_VERSION در native/project.yml
