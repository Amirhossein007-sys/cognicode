# اصلاح نمایش تمام‌صفحهٔ CogniCode

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
