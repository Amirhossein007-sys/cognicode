# تک‌منبع همگام‌سازی وب‌اپ با پوشه نیتیو (قبل از هر commit اجرا کن)
# همین اسکریپت در CI هم استفاده می‌شود (.github/workflows/ios.yml) تا درفت نشود.
# روی macOS هم با pwsh اجرا می‌شود؛ پس فقط از دستورهای سازگار pwsh استفاده کن.
$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $scriptDir
$web = Join-Path $root 'native/Web'

if (-not (Test-Path $web)) { New-Item -ItemType Directory -Path $web | Out-Null }

$files = @('index.html', 'styles.css', 'workspace.css', 'workspace-store.js', 'workspace-features.js', 'change-set.js', 'project-zip.js', 'syntax.js', 'checker.js', 'malwatch.js', 'review-engine.js', 'review-service.js', 'review-worker.js', 'sonar.js', 'orbital-clock.js', 'launch.js', 'app.js', 'sw.js', 'manifest.webmanifest', 'apple-touch-icon.png')
foreach ($f in $files) {
    $src = Join-Path $root $f
    if (-not (Test-Path -LiteralPath $src -PathType Leaf)) { throw "Required web resource is missing: $f" }
    Copy-Item -LiteralPath $src -Destination (Join-Path $web $f) -Force
}

foreach ($dir in @('fonts', 'icons', 'vendor')) {
    $dst = Join-Path $web $dir
    if (-not (Test-Path $dst)) { New-Item -ItemType Directory -Path $dst | Out-Null }
    Copy-Item (Join-Path (Join-Path $root $dir) '*') $dst -Force
}

# در اپ نیتیو، کش سرویس‌ورکر معنا ندارد — پاکش می‌کنیم تا ثبت نشود
$swPath = Join-Path $web 'sw.js'
Set-Content -Path $swPath -Value '/* no service worker inside the native app */' -Encoding UTF8

Write-Output 'native/Web synced'

# همگام‌سازی دارایی‌های اندروید با حفظ تزریق android-bridge.js
$androidWeb = Join-Path (Split-Path -Parent $root) 'cognicode-apk/app/src/main/assets/web'
if (Test-Path $androidWeb) {
    foreach ($f in $files) {
        if ($f -eq 'index.html') {
            $content = Get-Content -LiteralPath (Join-Path $root 'index.html') -Raw -Encoding UTF8
            if ($content -notmatch 'android-bridge\.js') {
                $content = $content.Replace('</body>', "<script src=`"android-bridge.js`"></script>`n</body>")
            }
            Set-Content -LiteralPath (Join-Path $androidWeb 'index.html') -Value $content -Encoding UTF8
            continue
        }
        Copy-Item -LiteralPath (Join-Path $root $f) -Destination (Join-Path $androidWeb $f) -Force
    }
    foreach ($dir in @('fonts', 'icons', 'vendor')) {
        $dst = Join-Path $androidWeb $dir
        if (-not (Test-Path $dst)) { New-Item -ItemType Directory -Path $dst | Out-Null }
        Copy-Item (Join-Path (Join-Path $root $dir) '*') $dst -Force
    }
    Set-Content -Path (Join-Path $androidWeb 'sw.js') -Value '/* no service worker inside the native app */' -Encoding UTF8
    Write-Output 'cognicode-apk web assets synced'
}
