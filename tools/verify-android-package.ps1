param([string]$AndroidRoot = 'C:\Users\Amirii\Desktop\cognicode-apk')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskRelease = Get-Content -LiteralPath (Join-Path $taskRoot 'release.json') -Raw | ConvertFrom-Json
$taskDirectory = Join-Path $taskRoot ('artifacts/build-' + $taskRelease.build + '-validation')
$taskApk = Join-Path $taskDirectory ('CogniCode-build-' + $taskRelease.build + '-debug.apk')
$taskAssets = Join-Path $AndroidRoot 'app/src/main/assets/web'
$taskZip = [IO.Compression.ZipFile]::OpenRead($taskApk)
$taskSha = [Security.Cryptography.SHA256]::Create()
$taskMatched = 0
try {
    foreach ($taskSource in Get-ChildItem -LiteralPath $taskAssets -Recurse -File) {
        $taskRelative = $taskSource.FullName.Substring($taskAssets.Length).TrimStart('\', '/').Replace('\', '/')
        $taskEntry = $taskZip.GetEntry('assets/web/' + $taskRelative)
        if (-not $taskEntry) { throw "Missing packaged web file: $taskRelative" }
        $taskStream = $taskEntry.Open()
        try { $taskPackagedHash = [BitConverter]::ToString($taskSha.ComputeHash($taskStream)).Replace('-', '') } finally { $taskStream.Dispose() }
        if ($taskPackagedHash -ne (Get-FileHash -LiteralPath $taskSource.FullName -Algorithm SHA256).Hash) { throw "Stale packaged web file: $taskRelative" }
        $taskMatched++
    }
    if (@($taskZip.Entries | Where-Object { $_.FullName.StartsWith('assets/web/') -and $_.Name }).Count -ne $taskMatched) { throw 'APK has unexpected additional web files' }
} finally { $taskZip.Dispose(); $taskSha.Dispose() }
$taskSdk = Join-Path $env:LOCALAPPDATA 'Android/Sdk/build-tools/34.0.0'
$taskBadging = (& (Join-Path $taskSdk 'aapt.exe') dump badging $taskApk) -join "`n"
if ($LASTEXITCODE -ne 0) { throw 'APK metadata verification failed' }
if ($taskBadging -notmatch "package: name='com.cognicode.app.debug' versionCode='$($taskRelease.build)' versionName='$($taskRelease.version)'" -or $taskBadging -notmatch "sdkVersion:'30'" -or $taskBadging -notmatch "targetSdkVersion:'35'") { throw 'APK metadata differs from the release' }
$env:JAVA_HOME = 'C:\Users\Amirii\.jdks\jbr-21.0.11'
$taskSigning = (& (Join-Path $taskSdk 'apksigner.bat') verify --print-certs $taskApk) -join "`n"
if ($LASTEXITCODE -ne 0) { throw 'APK signature verification failed' }
$taskSignature = [regex]::Match($taskSigning, 'Signer #1 certificate SHA-256 digest: ([a-f0-9]+)').Groups[1].Value
if ($taskSignature -ne 'c2ed4a29cbb6978992a467c1742c334ba9f361cc69156ed19f3b9e88b333437e') { throw 'Debug signing certificate changed from build 24' }
$taskReport = [ordered]@{result='PASS'; build=$taskRelease.build; package='com.cognicode.app.debug'; minSdk=30; targetSdk=35; packagedWebFiles=$taskMatched; apkBytes=(Get-Item -LiteralPath $taskApk).Length; apkSha256=(Get-FileHash -LiteralPath $taskApk -Algorithm SHA256).Hash.ToLower(); certificateSha256=$taskSignature}
$taskJson = $taskReport | ConvertTo-Json
Set-Content -LiteralPath (Join-Path $taskDirectory 'android-package.json') -Value $taskJson -Encoding utf8
Write-Output $taskJson
