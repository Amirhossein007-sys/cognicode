# Generates THROWAWAY static visual-check pages (never shipped, never synced):
# real styles.css/workspace.css + the real markup fragments, no app.js, so
# headless Edge renders them instantly and deterministically.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

$sampleCode = @'
<!DOCTYPE html>
<html lang="en">
<head>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div class="card">
    <input id="toggle" type="checkbox" />
    <div class="hero register">
      <h2>Welcome back</h2>
      <p>Login to review your saved work.</p>
    </div>
    <div class="hero login">
      <h2>Hello there</h2>
    </div>
  </div>
</body>
</html>
'@

$quickStart = @'
      <div class="quick-start glass-workspace" id="quick-start" dir="rtl">
        <b>از کجا شروع کنیم؟</b><p>کدت را وارد کن؛ کوگنی کنارت بررسی می‌کند.</p>
        <div class="quick-grid">
          <button type="button" data-quick="key-paste">چسباندن کد</button>
          <button type="button" data-quick="key-open">انتخاب فایل</button>
          <button type="button" data-quick="key-camera">اسکن تصویر</button>
          <button type="button" data-quick="key-sample">کد نمونه</button>
        </div>
        <small id="draft-status" role="status">پیش‌نویس به‌صورت خودکار ذخیره می‌شود</small>
      </div>
'@

$escapedCode = [System.Security.SecurityElement]::Escape($sampleCode)
$editorCode = @"
      $quickStart
      <div class="gutter-wrap">
        <div class="gutter" id="gutter" aria-hidden="true">1</div>
      </div>
      <div class="code-area" id="code-area">
        <pre id="highlight" aria-hidden="true"><code id="hl-code">$escapedCode</code></pre>
        <textarea id="code" dir="ltr" spellcheck="false" wrap="off" aria-label="ویرایشگر کد">$escapedCode</textarea>
      </div>
"@

$editorEmpty = @"
      $quickStart
      <div class="gutter-wrap">
        <div class="gutter" id="gutter" aria-hidden="true">1</div>
      </div>
      <div class="code-area" id="code-area">
        <pre id="highlight" aria-hidden="true"><code id="hl-code"></code></pre>
        <textarea id="code" dir="ltr" spellcheck="false" wrap="off" aria-label="ویرایشگر کد" placeholder="کدت را اینجا بنویس یا بچسبان..."></textarea>
      </div>
"@

$playButton = @'
      <div class="playbar">
        <button class="play analysis-button" id="btn-play" type="button">
          <span class="ripple-layer" aria-hidden="true"></span>
          <span class="burst" aria-hidden="true">
            <span class="burst-star bs-1"><svg viewBox="0 0 784.11 815.53"><path fill="currentColor" stroke="none" d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z"/></svg></span>
            <span class="burst-star bs-2"><svg viewBox="0 0 784.11 815.53"><path fill="currentColor" stroke="none" d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z"/></svg></span>
            <span class="burst-star bs-3"><svg viewBox="0 0 784.11 815.53"><path fill="currentColor" stroke="none" d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z"/></svg></span>
            <span class="burst-star bs-4"><svg viewBox="0 0 784.11 815.53"><path fill="currentColor" stroke="none" d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z"/></svg></span>
            <span class="burst-star bs-5"><svg viewBox="0 0 784.11 815.53"><path fill="currentColor" stroke="none" d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z"/></svg></span>
            <span class="burst-star bs-6"><svg viewBox="0 0 784.11 815.53"><path fill="currentColor" stroke="none" d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z"/></svg></span>
          </span>
          <span class="analysis-state">
            <span class="analysis-plane" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none"><path d="M14.2199 21.63C13.0399 21.63 11.3699 20.8 10.0499 16.83L9.32988 14.67L7.16988 13.95C3.20988 12.63 2.37988 10.96 2.37988 9.78001C2.37988 8.61001 3.20988 6.93001 7.16988 5.60001L15.6599 2.77001C17.7799 2.06001 19.5499 2.27001 20.6399 3.35001C21.7299 4.43001 21.9399 6.21001 21.2299 8.33001L18.3999 16.82C17.0699 20.8 15.3999 21.63 14.2199 21.63Z" fill="currentColor"/></svg>
            </span>
            <span class="play-label">تحلیل کد</span>
          </span>
        </button>
        <p class="micro-hint">کد اجرا نمی‌شود — فقط بررسی و توضیح داده می‌شود</p>
      </div>
'@

$overlay = @'
<div class="analysis-overlay" id="analysis-overlay" role="status" aria-live="polite" aria-label="در حال تحلیل کد">
  <div class="terminal-loader" dir="ltr" aria-hidden="true">
    <div class="terminal-header">
      <div class="terminal-title">Status</div>
      <div class="terminal-controls"><span class="control close"></span><span class="control minimize"></span><span class="control maximize"></span></div>
    </div>
    <div class="terminal-text">Loading...</div>
  </div>
  <p class="load-status" id="analysis-status">در حال تحلیل کد با هوش مصنوعی…</p>
</div>
'@

function New-Page($theme, $editorInner, $panelHidden, $withOverlay, $btnClass, $name) {
    $qs = $editorInner
    if ($panelHidden) { $qs = $qs -replace 'class="quick-start glass-workspace"', 'class="quick-start glass-workspace" hidden' }
    $btn = if ($btnClass) {
        $playButton -replace 'class="play analysis-button" id="btn-play"', ('class="play analysis-button ' + $btnClass + '" id="btn-play"')
    } else { $playButton }
    $ov = if ($withOverlay) { $overlay } else { '' }
    $page = @"
<!doctype html>
<html lang="fa" dir="rtl" data-theme="$theme">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<link rel="stylesheet" href="styles.css">
<link rel="stylesheet" href="workspace.css">
</head>
<body>
<div id="app">
  <section class="editor-shell">
    <div class="editor" id="editor">
$qs
    </div>
  </section>
  <footer class="bottom">
$btn
  </footer>
</div>
$ov
</body>
</html>
"@
    Set-Content -LiteralPath (Join-Path $root $name) -Value $page -Encoding UTF8
}

New-Page 'dark'  $editorEmpty $false $false ''          '_vs-panel-dark.html'
New-Page 'light' $editorEmpty $false $false ''          '_vs-panel-light.html'
New-Page 'dark'  $editorCode  $true  $false ''          '_vs-code-dark.html'
New-Page 'light' $editorCode  $true  $false ''          '_vs-code-light.html'
New-Page 'dark'  $editorCode  $true  $true  ''          '_vs-overlay-dark.html'
New-Page 'light' $editorCode  $true  $true  ''          '_vs-overlay-light.html'
New-Page 'dark'  $editorCode  $true  $false ''          '_vs-button-dark.html'
New-Page 'light' $editorCode  $true  $false ''          '_vs-button-light.html'
New-Page 'dark'  $editorCode  $true  $false 'burst'     '_vs-burst-dark.html'
New-Page 'light' $editorCode  $true  $false 'burst'     '_vs-burst-light.html'
Write-Output 'static visual pages written (_vs-*.html)'
