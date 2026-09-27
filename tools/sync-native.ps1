# تک‌منبع همگام‌سازی وب‌اپ با پوشه نیتیو (قبل از هر commit اجرا کن)
# همین اسکریپت در CI هم استفاده می‌شود (.github/workflows/ios.yml) تا درفت نشود.
# روی macOS هم با pwsh اجرا می‌شود؛ پس فقط از دستورهای سازگار pwsh استفاده کن.
$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $scriptDir
$web = Join-Path $root 'native/Web'

if (-not (Test-Path $web)) { New-Item -ItemType Directory -Path $web | Out-Null }

$files = @('index.html', 'styles.css', 'syntax.js', 'checker.js', 'sonar.js', 'app.js', 'sw.js', 'manifest.webmanifest', 'apple-touch-icon.png', 'apple-touch-icon-precomposed.png', 'favicon.png')
foreach ($f in $files) {
    $src = Join-Path $root $f
    if (Test-Path $src) {
        Copy-Item $src (Join-Path $web $f) -Force
    }
}

foreach ($dir in @('fonts', 'icons')) {
    $dst = Join-Path $web $dir
    if (-not (Test-Path $dst)) { New-Item -ItemType Directory -Path $dst | Out-Null }
    Copy-Item (Join-Path (Join-Path $root $dir) '*') $dst -Force
}

# در اپ نیتیو، کش سرویس‌ورکر معنا ندارد — پاکش می‌کنیم تا ثبت نشود
$swPath = Join-Path $web 'sw.js'
Set-Content -Path $swPath -Value '/* no service worker inside the native app */' -Encoding UTF8

Write-Output 'native/Web synced'


