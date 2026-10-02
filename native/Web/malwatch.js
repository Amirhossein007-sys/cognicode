/* ═══════════════════════════════════════════════
   کوگنی کد — موتور آفلاین تشخیص کد مخرب (Malwatch)
   الگوبرداری مفهومی از قواعد GuardDog دیتاداگ (Apache-2.0)
   و نگاشت به تکنیک‌های MITRE ATT&CK؛ کاملاً آفلاین و محلی.
   خروجی: یافته‌های خط‌محور + امتیاز ریسک ۰..۱۰۰ + حکم نهایی.
   این موتور کد را «اجرا» نمی‌کند و توصیهٔ اجرا هم نمی‌دهد؛
   فقط از روی متن، نشانه‌های رفتار مخرب را گزارش می‌کند.
   ═══════════════════════════════════════════════ */
'use strict';

window.Malwatch = (function () {

  var FA = '۰۱۲۳۴۵۶۷۸۹';
  function fa(x) { return String(x).replace(/[0-9]/g, function (d) { return FA[+d]; }); }

  /* وزن هر شدت در امتیاز ریسک؛ low فقط در فهرست شواهد می‌آید و امتیاز ندارد */
  var WEIGHT = { critical: 40, high: 22, medium: 10, low: 0 };
  var SEV_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

  /* ── حذف فقط کامنت‌ها (رشته‌ها حفظ می‌شوند) ──
     URL وب‌هوک و فرمان‌های curl و… داخل رشته‌ها زندگی می‌کنند؛ پس برخلاف
     codeOnlyLines که رشته را هم می‌برد، اینجا رشته با محتوا نگه داشته می‌شود.
     کامنت‌ها حذف می‌شوند تا متن آموزشی/توضیحی هشدار کاذب نسازد. */
  function commentFreeLines(code, conf) {
    if (!code) return [];
    if (!conf) return code.split('\n');
    var out = [], buf = '', line = 0;
    var state = 'code', quote = '', blockEnd = '';
    var i = 0, n = code.length;
    while (i < n) {
      var ch = code[i];
      if (ch === '\n') {
        if (state === 'lcom') state = 'code';
        // رشتهٔ تک‌خطی بسته‌نشده: خط بعد، دوباره کد است (ساده‌سازی عمدی)
        if (state === 'str' && !(conf.multiline && conf.multiline.indexOf(quote) >= 0)) state = 'code';
        out.push(buf); buf = ''; line++; i++; continue;
      }
      if (state === 'code') {
        if (conf.line && code.startsWith(conf.line, i)) { state = 'lcom'; i += conf.line.length; continue; }
        if (conf.block && code.startsWith(conf.block[0], i)) { state = 'bcom'; blockEnd = conf.block[1]; i += conf.block[0].length; continue; }
        if (conf.quotes && conf.quotes.indexOf(ch) >= 0) { state = 'str'; quote = ch; buf += ch; i++; continue; }
        buf += ch; i++; continue;
      }
      if (state === 'lcom') { i++; continue; }
      if (state === 'bcom') {
        if (code.startsWith(blockEnd, i)) { state = 'code'; i += blockEnd.length; continue; }
        i++; continue;
      }
      if (state === 'str') {
        if (conf.escape && ch === '\\') {
          buf += ch;
          if (i + 1 < n) { buf += code[i + 1]; i += 2; continue; }
          i++; continue;
        }
        if (ch === quote) state = 'code';
        buf += ch; i++; continue;
      }
    }
    out.push(buf);
    return out;
  }

  /* ── قواعد خط‌به‌خط ──
     sev: شدت · attack: شناسه MITRE ATT&CK · rx: الگوی تشخیص در یک خط */
  var LINE_RULES = [
    /* ── اجرا و فراخوانی فرآیند ── */
    { id: 'exec-eval', sev: 'medium', attack: 'T1059', rx: /\beval\s*\(|new\s+Function\s*\(|\bexec\s*\(/,
      msg: 'اجراهای پویا (eval/exec) در کد هست', hint: 'eval/exec دروازهٔ اصلی تزریق کد است؛ ورودی را هرگز مستقیم اجرا نکن' },
    { id: 'exec-base64-inline', sev: 'critical', attack: 'T1027/T1059', rx: /eval\s*\(\s*atob\s*\(|eval\s*\(\s*Buffer\.from\s*\([^)]*base64|Function\s*\(\s*atob\s*\(|exec\s*\(\s*base64\.b64decode|exec\s*\(\s*b64decode/,
      msg: 'کد از داخل Base64 دیکود و بلافاصله اجرا می‌شود', hint: 'این امضای کلاسیک بدافزار است؛ محتوای رشته را دیکود کنید و ببینید چیست' },
    { id: 'exec-fetched', sev: 'high', attack: 'T1105/T1059', rx: /exec\s*\(\s*(?:requests\.|urlopen\(|urllib|\w+\.text)|eval\s*\(\s*(?:requests\.|urlopen\(|\w+\.response)/,
      msg: 'محتوای دانلودشده از اینترنت بلافاصله اجرا می‌شود', hint: 'کدِ از شبکه دانلودی هرگز نباید بی‌بازبینی اجرا شود' },
    { id: 'download-exec-pipe', sev: 'critical', attack: 'T1059/T1105', rx: /(?:curl|wget)[^\n|;]{0,120}\|\s*(?:sudo\s+)?(?:ba|z|da|k)?sh\b/,
      msg: 'دانلود از اینترنت و هدایت مستقیم به شل (curl | bash)', hint: 'این الگو یعنی «هرچه سرور گفت اجرا کن» — ریسک کامل در دست سرور فرمان‌ده' },
    { id: 'powershell-cradle', sev: 'critical', attack: 'T1059.001', rx: /IEX\s*\([^)]*Download|Invoke-Expression\s*\([^)]*Download|DownloadString\s*\(/i,
      msg: 'الگوی cradle پاورشل: دانلود کد و اجرای درون‌حافظه', hint: 'بارزترین ابزار اجرای بدون-فایل مهاجمان ویندوزی است' },
    { id: 'powershell-hidden', sev: 'high', attack: 'T1059.001/T1564', rx: /powershell[^;\n]{0,60}(\s-e\s|\s-enc\s|-WindowStyle\s+Hidden|\s-w\s+hidden|-nop\s)/i,
      msg: 'پاورشل با پنهان‌کاری (انکودشده یا بدون پنجره) فراخوانی شده', hint: 'پرچم‌های -enc / hidden تقریباً همیشه نشانهٔ رفتار پنهان‌اند' },
    { id: 'lolbas-download', sev: 'medium', attack: 'T1105', rx: /\b(certutil\s+-urlcache|bitsadmin\s+\/transfer|mshta\s+http|rundll32\s+javascript)/i,
      msg: 'ابزار بومی ویندوز برای دانلود/اجرای payload به‌کار رفته (LOLBAS)', hint: 'این ابزارها برای پنهان‌ماندن در لاگ‌ها سوءاستفاده می‌شوند' },
    { id: 'webshell-php', sev: 'critical', attack: 'T1505.003', rx: /\b(?:system|exec|passthru|shell_exec)\s*\(\s*\$_(GET|POST|REQUEST|COOKIE)/,
      msg: 'امضای وب‌شل: ورودی HTTP مستقیم به تابع اجرای فرمان می‌رود', hint: 'این یعنی هرکس URL را بزند، روی سرور فرمان اجرا می‌کند' },
    { id: 'shell-php-generic', sev: 'medium', attack: 'T1059', rx: /\bshell_exec\s*\(|\bpassthru\s*\(|\bos\.system\s*\(|\bos\.popen\s*\(/,
      msg: 'فراخوانی مستقیم شل/فرآیند در کد هست', hint: 'ورودی کاربر هرگز نباید به این توابع برسد؛ فهرست سفید ورودی بسازید' },
    { id: 'node-childprocess', sev: 'medium', attack: 'T1059', rx: /require\s*\(\s*['"]child_process['"]\s*\)|\bfrom\s+subprocess\s+import|subprocess\.(?:call|run|Popen)\s*\(/,
      msg: 'اجرای فرآیند بیرونی (child process) در کد هست', hint: 'فقط با ورودی پاک‌سازی‌شده و فهرست سفید فرمان‌ها امن است' },
    { id: 'reverse-shell-nc', sev: 'critical', attack: 'T1059.004', rx: /\bnc(?:at)?\s+-e\b|\bnc\s+-l[^\n]{0,30}-c\s+\/bin\/sh|mkfifo[^\n]{0,40}\bnc\b/,
      msg: 'الگوی شل معکوس/اتصال شل با netcat', hint: 'این یعنی کنترل کامل دستگاه از راه دور — در کد عادی جای این الگو نیست' },
    { id: 'silent-exec', sev: 'medium', attack: 'T1564', rx: /\bsubprocess\b[^\n]{0,80}(?:stdout|stderr)\s*=\s*DEVNULL/,
      msg: 'اجرای بی‌صدا با پنهان‌کردن خروجی و خطا', hint: 'بدافزار برای دیده‌نشدن، خروجی فرآیند را خفه می‌کند' },

    /* ── پنهان‌سازی (Obfuscation) ── */
    { id: 'obf-0x-mangling', sev: 'high', attack: 'T1027', rx: /_0x[a-f0-9]{3,}\b/i,
      msg: 'نام‌های متغیر مَنگل‌شدهٔ obfuscator (الگوی _0x…)', hint: 'امضای رایج obfuscator.io و بدافزارهای npm؛ کد را دی‌ابفوسکیت کنید' },
    { id: 'obf-b64-blob', sev: 'medium', attack: 'T1027', rx: /[A-Za-z0-9+/]{60,}={0,2}/,
      msg: 'رشتهٔ طولانی احتمالاً انکودشده (Base64) در کد', hint: 'محتوای رشته را دیکود کنید تا ماهیتش روشن شود' },
    { id: 'obf-hex-blob', sev: 'medium', attack: 'T1027', rx: /(?:\\x[0-9a-fA-F]{2}){20,}/,
      msg: 'دنبالهٔ طولانی بایت‌های hex گریز در کد', hint: 'معمولاً payload یا رشتهٔ پنهان‌شده است' },
    { id: 'obf-dynamic-import', sev: 'medium', attack: 'T1027.007', rx: /__import__\s*\(\s*[^'"]|importlib\.import_module\s*\(\s*[^'"]/,
      msg: 'ایمپورت داینامیک با نام محاسبه‌شده', hint: 'نام ماژول از رشتهٔ انکودشده درمی‌آید؟ روش سادهٔ پنهان‌کاری وابستگی مخرب است' },
    { id: 'obf-pyarmor', sev: 'high', attack: 'T1027', rx: /__pyarmor|pyarmor_/i,
      msg: 'کد با PyArmor مبهم‌سازی شده', hint: 'ابزاری که بدافزارهای PyPI از آن برای گریز از بازبینی استفاده می‌کنند' },
    { id: 'obf-hidden-require', sev: 'high', attack: 'T1027.007', rx: /module\._load|process\.mainModule|global\.require|require\.cache\s*\[/,
      msg: 'دستکاری مکانیزم بارگذاری ماژول در جاوااسکریپت', hint: 'پنهان‌کردن require واقعی، ترفند رایج استیلرهای npm است' },
    { id: 'obf-trojan-source', sev: 'high', attack: 'T1027', rx: /[\u202A-\u202E\u2066-\u2069]/,
      msg: 'کاراکترهای دوسوگرا (bidi) در کد — الگوی «Trojan Source»', hint: 'این کاراکترها ترتیب نمایش کد را جعل می‌کنند و چشم بازبین را گول می‌زنند' },
    { id: 'obf-invisible', sev: 'high', attack: 'T1027', rx: /[\u200B\u200D\u2060\uFEFF]/,
      msg: 'کاراکتر پنهان (zero-width) داخل کد شناسایی شد', hint: 'کاراکترهای نامرئی در شناسه‌ها می‌توانند بک‌دور نامرئی بسازند' },
    { id: 'obf-log-suppress', sev: 'medium', attack: 'T1564', rx: /console\.(?:log|warn|error|info)\s*=\s*(?:function\s*\(\s*\)\s*\{\s*\}|noop|noOp)/,
      msg: 'خاموش‌کردن کنسول همراه با بقیهٔ کد', hint: 'بدافزارها لاگ را کور می‌کنند تا تحلیل دشوار شود' },

    /* ── خروج داده و C2 ── */
    { id: 'exfil-discord', sev: 'critical', attack: 'T1041', rx: /discord(?:app)?\.com\/api\/webhooks/i,
      msg: 'وب‌هوک Discord هاردکد شده — کانال خروج داده', hint: 'کانال محبوب استیلرهای npm/PyPI برای ارسال توکن و اطلاعات' },
    { id: 'exfil-telegram', sev: 'high', attack: 'T1041', rx: /api\.telegram\.org\/bot[^/\s]+\/send/i,
      msg: 'ارسال داده با API ربات تلگرام', hint: 'اگر ربات ارسال‌کنندهٔ گزارش خودتان نیست، این نشانهٔ خروج داده است' },
    { id: 'exfil-drop-paste', sev: 'high', attack: 'T1041', rx: /pastebin\.com\/raw|ghostbin|hastebin|termbin|transfer\.sh|file\.io|anonfiles|0x0\.st/i,
      msg: 'سرویس ذخیره/چسبانک برای انداختن یا برداشتن داده', hint: 'بدافزار از این سرویس‌ها هم payload می‌گیرد هم داده می‌فرستد' },
    { id: 'exfil-shortener', sev: 'medium', attack: 'T1041', rx: /bit\.ly\/|tinyurl\.com\/|cutt\.ly\/|is\.gd\/|rb\.gy\/|shorturl\.at\//i,
      msg: 'کوتاه‌کنندهٔ لینک در کد', hint: 'مقصد واقعی لینک پنهان است؛ URL نهایی را باز کنید' },
    { id: 'exfil-tunnel', sev: 'medium', attack: 'T1572', rx: /ngrok\.io|ngrok-free\.app|localtunnel\.me|serveo\.net|portmap\.io/i,
      msg: 'تونل عمومی موقت در کد', hint: 'تونل‌ها راه دور زدن مهاجم به شبکهٔ داخلی را باز می‌کنند' },
    { id: 'exfil-dns', sev: 'high', attack: 'T1048.003', rx: /dnscat|dns2tcp|\biodine\b/i,
      msg: 'ابزار خروج داده از طریق DNS', hint: 'کوئری‌های DNS از فایروال‌ها راحت رد می‌شوند؛ داده انکود در نام دامنه می‌رود' },
    { id: 'c2-bare-ip', sev: 'medium', attack: 'T1071', rx: /https?:\/\/(?!127\.|0\.|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.|169\.254\.)\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/,
      msg: 'اتصال به IP خام به‌جای دامنه', hint: 'سرور فرمان‌دهی معمولاً IP خام است؛ مقصد را بررسی کنید' },

    /* ── ماینر و منابع ── */
    { id: 'impact-cryptominer', sev: 'critical', attack: 'T1496', rx: /stratum\+tcp|stratum\+ssl|coinhive|minerd|xmrig|cryptonight|nanopool|f2pool|nicehash|moneroocean/i,
      msg: 'نشانهٔ استخراج رمزارز (cryptojacking) در کد', hint: 'کد شما را به ماینر تبدیل می‌کند؛ CPU را به هدر می‌دهد و باتری را می‌سوزاند' },

    /* ── جمع‌آوری اطلاعات و ورودی ── */
    { id: 'collect-keylogger', sev: 'high', attack: 'T1056.001', rx: /GetAsyncKeyState|SetWindowsHookExW?\b|\bpynput\b|keyboard\.Listener|\bkeylog/i,
      msg: 'الگوی کلیدلاگر (ضبط ورودی کیبورد)', hint: 'در برنامهٔ عادی جای این فراخوانی‌ها نیست' },
    { id: 'collect-clipboard', sev: 'medium', attack: 'T1115', rx: /\bclipboard\b|pbpaste|pbcopy|win32clipboard|NSPasteboard/i,
      msg: 'دسترسی به کلیپ‌بورد سیستم', hint: 'استیلرها کلیپ‌بورد را می‌خوانند و آدرس کیف‌پول را جابه‌جا می‌کنند' },
    { id: 'collect-sensitive-files', sev: 'high', attack: 'T1552', rx: /id_rsa|id_ed25519|authorized_keys|\.ssh\/|cookies\.sqlite|Login\s+Data|wallet\.dat|keystore\.jks|\.aws\/credentials|\.kube\/config/i,
      msg: 'دسترسی به مسیرهای حساس (کلید SSH، کوکی مرورگر، کیف‌پول…)', hint: 'خواندن این مسیرها نشانهٔ سرقت اعتبارنامه است' },
    { id: 'collect-screen', sev: 'medium', attack: 'T1113', rx: /ImageGrab|screencapture\s+-x|CGWindowListCreateImage|BitBlt\s*\(/i,
      msg: 'گرفتن اسکرین‌شات از صفحهٔ کاربر', hint: 'جمع‌آوری تصویر صفحه در برنامهٔ عادی کاربردی ندارد' },
    { id: 'collect-sysinfo', sev: 'low', attack: 'T1082', rx: /platform\.machine\(\)|uname\s*\(|GetComputerName|systeminfo\b|wmic\s+/i,
      msg: 'جمع‌آوری مشخصات سیستم', hint: 'به‌تنهایی مشکوک نیست؛ ترکیب با ارسال شبکه خطرناک است' },
    { id: 'collect-env', sev: 'low', attack: 'T1552.001', rx: /process\.env|os\.environ|getenv\s*\(/i,
      msg: 'خواندن متغیرهای محیطی', hint: 'متغیرهای محیطی معمولاً حاوی کلید و رمزند' },

    /* ── پایداری (Persistence) ── */
    { id: 'persist-schedule', sev: 'high', attack: 'T1053', rx: /crontab\b|\/etc\/cron\.|\bschtasks\b\s+\/create|launchctl\s+load|RunAtLoad|LaunchAgents|CurrentVersion\\+Run\b|\breg\s+add\b/i,
      msg: 'راه‌اندازی ماندگاری/زمان‌بندی (cron، schtasks، autostart)', hint: 'اجرای دوبارهٔ خود پس از ری‌استارت، رفتار بدافزار ماندگار است' },

    /* ── تخریب ── */
    { id: 'impact-destroy', sev: 'critical', attack: 'T1485', rx: /rm\s+-[a-zA-Z]*r[a-zA-Z]*f\s+(?:[\/~*]\s?|$HOME|\*)|shutil\.rmtree\s*\(\s*['"]\/|Remove-Item[^\n]{0,40}-Recurse[^\n]{0,20}-Force[^\n]{0,20}\bC:\\|:\(\)\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/,
      msg: 'دستور تخریب وسیع فایل‌سیستم (rm -rf / یا معادل)', hint: 'این الگو می‌تواند کل دیسک را پاک کند — «fork bomb» هم پوشش داده شده' },

    /* ── وب (CWE Top 25) ── */
    { id: 'web-sqli-concat', sev: 'medium', attack: 'CWE-89', rx: /(?:SELECT|INSERT|UPDATE|DELETE)\s[^\n]{0,80}\+\s*(?:req\.|\$|input|params|userInput)/i,
      msg: 'کوئری SQL با چسباندن ورودی کاربر ساخته می‌شود', hint: 'SQL Injection (رتبهٔ ۲ CWE Top 25) — از کوئری پارامتری استفاده کنید' },
    { id: 'web-xss-raw', sev: 'low', attack: 'CWE-79', rx: /document\.write\s*\(|\.innerHTML\s*=\s*(?:req\.|\$|input|response\.data)/i,
      msg: 'ورودی کاربر بدون پاک‌سازی به DOM می‌رود', hint: 'XSS (رتبهٔ ۱ CWE Top 25) — متن را قبل از درج sanitize کنید' },
    { id: 'npm-install-hook', sev: 'high', attack: 'T1204', rx: /['"](?:pre|post)?install['"]\s*:\s*['"][^'"]*(?:curl\s|wget\s|node\s+-e|https?:\/\/)/i,
      msg: 'اسکریپت نصب (pre/post install) فرمان یا دانلود دارد', hint: 'اسکریپت‌های نصب، دروازهٔ اصلی حملات زنجیرهٔ تأمین npm هستند' }
  ];

  /* ── قواعد فایل‌محور: ترکیب چند نشانه در کل فایل ── */
  var FILE_RULES = [
    { id: 'combo-reverse-shell', sev: 'critical', attack: 'T1059.004',
      test: function (body) {
        return /socket\.socket\s*\(/.test(body) && /dup2\s*\(/.test(body) && /\/bin\/(?:ba)?sh/.test(body);
      },
      msg: 'امضای شل معکوس: سوکت + انتقال stdio به شل', hint: 'ترکیب socket+dup2+/bin/sh یعنی اتصال شل به مقصد بیرونی' },
    { id: 'combo-clipboard-wallet', sev: 'critical', attack: 'T1115',
      test: function (body) {
        var clip = /\bclipboard\b|pbpaste|pbcopy|win32clipboard|NSPasteboard/i.test(body);
        var wallet = /\bbc1[a-z0-9]{20,}|0x[a-fA-F0-9]{40}|\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/.test(body);
        var swap = /\.replace\s*\(|\bsub\s*\(|\bRegExp\s*\(/.test(body);
        return clip && wallet && swap;
      },
      msg: 'امضای جابه‌جاساز آدرس کیف‌پول در کلیپ‌بورد', hint: 'خواندن کلیپ‌بورد + جایگزینی با الگوی آدرس رمزارز = سرقت تراکنش' },
    { id: 'combo-exec-decode', sev: 'high', attack: 'T1027/T1059',
      test: function (body) {
        var run = /\beval\s*\(|\bexec\s*\(|new\s+Function\s*\(/.test(body);
        var decode = /\batob\s*\(|\bb64decode|frombase64|base64_decode/i.test(body);
        return run && decode;
      },
      msg: 'ترکیب اجرا + دیکود Base64 در یک فایل', hint: 'کد احتمالاً payload انکودشده را باز و اجرا می‌کند؛ رشته‌ها را دیکود کنید' },
    { id: 'combo-iex-download', sev: 'critical', attack: 'T1059.001',
      test: function (body) {
        return /\bIEX\b|Invoke-Expression/i.test(body) && /DownloadString|DownloadFile|Invoke-WebRequest/i.test(body);
      },
      msg: 'ترکیب Invoke-Expression + دانلود وب', hint: 'کلاسیک‌ترین ریسک اجرای بدون-فایل ویندوز' },
    { id: 'combo-exfil-sysinfo', sev: 'high', attack: 'T1082/T1041',
      test: function (body) {
        var info = /platform\.|uname\s*\(|systeminfo|os\.name|os\.hostname|GetComputerName/i.test(body);
        var send = /requests\.post|fetch\s*\(|XMLHttpRequest|urlopen\s*\(|\bcurl\s|\bwget\s/i.test(body);
        return info && send;
      },
      msg: 'جمع‌آوری مشخصات سیستم همراه با ارسال شبکه', hint: 'ترکیب «چه دستگاهی است» + «برای کی می‌فرستد» نشانهٔ نقشهٔ برداشت اطلاعات است' }
  ];

  /* نگاشت شناسهٔ قاعده به شدت — برای مرتب‌سازی و امتیازدهی */
  var RULE_SEV = {};
  (function () {
    var i;
    for (i = 0; i < LINE_RULES.length; i++) RULE_SEV[LINE_RULES[i].id] = LINE_RULES[i].sev;
    for (i = 0; i < FILE_RULES.length; i++) RULE_SEV[FILE_RULES[i].id] = FILE_RULES[i].sev;
  })();

  /* ── موتور اسکن ── */
  function scan(code, langKey) {
    var conf = (window.Checker && Checker.CONF) ? Checker.CONF[langKey] : null;
    var lines = commentFreeLines(code, conf);
    var body = lines.join('\n');

    var findings = [], evidence = [], categories = [], seen = {};
    var i, j, r;

    function push(rule, line) {
      if (seen[rule.id]) return;
      seen[rule.id] = true;
      if (categories.indexOf(rule.attack) < 0) categories.push(rule.attack);
      if (rule.sev === 'low') {
        if (evidence.length < 12) evidence.push({ line: line, rule: rule.id, message: rule.msg });
        return;
      }
      if (findings.length < 15) {
        findings.push({
          line: Math.max(1, line), column: 1,
          /* عمداً warning: حکم مخرب‌بودن نباید وارد جریان «اصلاح خودکار» ادیتور شود */
          severity: 'warning',
          message: rule.msg,
          hint: rule.hint,
          attack: rule.attack,
          rule: rule.id,
          source: 'malwatch'
        });
      }
    }

    for (i = 0; i < lines.length; i++) {
      var ln = lines[i];
      if (!ln) continue;
      for (j = 0; j < LINE_RULES.length && findings.length < 15; j++) {
        r = LINE_RULES[j];
        if (seen[r.id]) continue;
        if (r.rx.test(ln)) push(r, i + 1);
      }
    }

    for (j = 0; j < FILE_RULES.length && findings.length < 15; j++) {
      r = FILE_RULES[j];
      if (seen[r.id]) continue;
      try { if (r.test(body)) push(r, 1); } catch (e) {}
    }

    findings.sort(function (a, b) {
      var oa = SEV_ORDER[RULE_SEV[a.rule]] !== undefined ? SEV_ORDER[RULE_SEV[a.rule]] : 9;
      var ob = SEV_ORDER[RULE_SEV[b.rule]] !== undefined ? SEV_ORDER[RULE_SEV[b.rule]] : 9;
      return oa - ob || a.line - b.line;
    });

    var score = 0;
    for (i = 0; i < findings.length; i++) score += WEIGHT[RULE_SEV[findings[i].rule]] || 0;
    /* هم‌زمانی چند دستهٔ رفتاری، پیچیدگی واقعی مخرب‌بودن را بالا می‌برد */
    var groups = {};
    for (i = 0; i < categories.length; i++) groups[String(categories[i]).split('/')[0]] = true;
    var distinct = Object.keys(groups).length;
    if (distinct >= 3) score += 10;
    if (score > 100) score = 100;

    var verdict = score >= 50 ? 'malicious' : score >= 20 ? 'suspicious' : 'clean';
    return {
      verdict: verdict,
      score: score,
      distinctGroups: distinct,
      findings: findings,
      evidence: evidence,
      categories: categories,
      scanned: lines.length
    };
  }

  return { scan: scan };
})();
