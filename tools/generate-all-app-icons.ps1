param(
    [string]$SourcePath = 'C:\Users\Amirii\Desktop\cognicode\icons\source-app-icon.jpg',
    [string]$CognicodeRoot = 'C:\Users\Amirii\Desktop\cognicode',
    [string]$AndroidRoot = 'C:\Users\Amirii\Desktop\cognicode-apk'
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

if (-not (Test-Path $SourcePath)) {
    throw "Source icon not found at: $SourcePath"
}

$srcBmp = [System.Drawing.Bitmap]::FromFile($SourcePath)
Write-Output ("Source loaded: {0}x{1}" -f $srcBmp.Width, $srcBmp.Height)

function Save-Resized([System.Drawing.Bitmap]$source, [int]$w, [int]$h, [string]$destPath) {
    $dir = Split-Path -Parent $destPath
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    
    $target = [System.Drawing.Bitmap]::new($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($target)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    $g.DrawImage($source, 0, 0, $w, $h)
    $g.Dispose()

    $target.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $target.Dispose()
    Write-Output ("Saved: {0} ({1}x{2})" -f (Split-Path -Leaf $destPath), $w, $h)
}

function Save-Rounded([System.Drawing.Bitmap]$source, [int]$size, [float]$radiusPct, [string]$destPath) {
    $dir = Split-Path -Parent $destPath
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }

    $target = [System.Drawing.Bitmap]::new($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($target)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $r = [float]($size * $radiusPct)
    $d = $r * 2
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc(0, 0, $d, $d, 180, 90)
    $path.AddArc(($size - $d), 0, $d, $d, 270, 90)
    $path.AddArc(($size - $d), ($size - $d), $d, $d, 0, 90)
    $path.AddArc(0, ($size - $d), $d, $d, 90, 90)
    $path.CloseFigure()

    $g.SetClip($path)
    $g.DrawImage($source, 0, 0, $size, $size)
    $path.Dispose()
    $g.Dispose()

    $target.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $target.Dispose()
    Write-Output ("Saved rounded icon: {0} ({1}x{1})" -f (Split-Path -Leaf $destPath), $size)
}

function Save-Circular([System.Drawing.Bitmap]$source, [int]$size, [string]$destPath) {
    $dir = Split-Path -Parent $destPath
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }

    $target = [System.Drawing.Bitmap]::new($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($target)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddEllipse(0, 0, $size, $size)
    $g.SetClip($path)
    $g.DrawImage($source, 0, 0, $size, $size)
    $path.Dispose()
    $g.Dispose()

    $target.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $target.Dispose()
    Write-Output ("Saved circular icon: {0} ({1}x{1})" -f (Split-Path -Leaf $destPath), $size)
}

function Save-AdaptiveForeground([System.Drawing.Bitmap]$source, [int]$size, [string]$destPath) {
    # In Android adaptive icons, canvas is 108dp, safe circle is 72dp (ratio = 72/108 = 0.666).
    # We scale the icon to fill ~74% of the canvas so the entire glowing 3D button is in view.
    $dir = Split-Path -Parent $destPath
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }

    $target = [System.Drawing.Bitmap]::new($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($target)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $innerScale = 0.74
    $innerSize = [int]($size * $innerScale)
    $offset = [int](($size - $innerSize) / 2)

    # Use a smooth path clip for the foreground layer so it fades/clips gracefully
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $cornerRadius = [float]($innerSize * 0.22)
    $d = $cornerRadius * 2
    $path.AddArc($offset, $offset, $d, $d, 180, 90)
    $path.AddArc(($offset + $innerSize - $d), $offset, $d, $d, 270, 90)
    $path.AddArc(($offset + $innerSize - $d), ($offset + $innerSize - $d), $d, $d, 0, 90)
    $path.AddArc($offset, ($offset + $innerSize - $d), $d, $d, 90, 90)
    $path.CloseFigure()

    $g.SetClip($path)
    $g.DrawImage($source, $offset, $offset, $innerSize, $innerSize)
    $path.Dispose()
    $g.Dispose()

    $target.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $target.Dispose()
    Write-Output ("Saved adaptive foreground: {0} ({1}x{1})" -f (Split-Path -Leaf $destPath), $size)
}

function Save-Maskable([System.Drawing.Bitmap]$source, [int]$size, [string]$destPath) {
    # PWA Maskable icon with 10% safe margin, dark navy background matching icon corners
    $dir = Split-Path -Parent $destPath
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }

    $target = [System.Drawing.Bitmap]::new($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($target)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    $bgColor = [System.Drawing.Color]::FromArgb(255, 11, 19, 32)
    $g.Clear($bgColor)

    $innerScale = 0.82
    $innerSize = [int]($size * $innerScale)
    $offset = [int](($size - $innerSize) / 2)
    $g.DrawImage($source, $offset, $offset, $innerSize, $innerSize)
    $g.Dispose()

    $target.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $target.Dispose()
    Write-Output ("Saved maskable icon: {0} ({1}x{1})" -f (Split-Path -Leaf $destPath), $size)
}

# ─────────────────────────────────────────────────────────────
# ۱. تولید آیکون‌های وب و PWA در ریشه پروژه cognicode
# ─────────────────────────────────────────────────────────────
Write-Output "`n[1/4] Generating Web & PWA icons..."
Save-Resized $srcBmp 1024 1024 (Join-Path $CognicodeRoot 'icons\icon-1024.png')
Save-Resized $srcBmp 512  512  (Join-Path $CognicodeRoot 'icons\icon-512.png')
Save-Resized $srcBmp 192  192  (Join-Path $CognicodeRoot 'icons\icon-192.png')
Save-Resized $srcBmp 180  180  (Join-Path $CognicodeRoot 'icons\icon-180.png')
Save-Resized $srcBmp 64   64   (Join-Path $CognicodeRoot 'icons\icon-64.png')
Save-Resized $srcBmp 32   32   (Join-Path $CognicodeRoot 'icons\icon-32.png')
Save-Resized $srcBmp 32   32   (Join-Path $CognicodeRoot 'favicon.png')
Save-Resized $srcBmp 180  180  (Join-Path $CognicodeRoot 'apple-touch-icon.png')
Save-Maskable $srcBmp 512 (Join-Path $CognicodeRoot 'icons\maskable-512.png')

# ─────────────────────────────────────────────────────────────
# ۲. تولید آیکون‌های پروژه نیتیو iOS (Xcode Assets & Web)
# ─────────────────────────────────────────────────────────────
Write-Output "`n[2/4] Generating iOS native icons..."
$iosAppIcon = Join-Path $CognicodeRoot 'native\CogniCode\Assets.xcassets\AppIcon.appiconset\icon-1024.png'
Save-Resized $srcBmp 1024 1024 $iosAppIcon

$iosWidgetLogo = Join-Path $CognicodeRoot 'native\CogniCodeWidgets\Assets.xcassets\ActivityLogo.imageset\logo.png'
Save-Resized $srcBmp 180 180 $iosWidgetLogo

$iosWeb = Join-Path $CognicodeRoot 'native\Web'
Save-Resized $srcBmp 180 180 (Join-Path $iosWeb 'apple-touch-icon.png')
Save-Resized $srcBmp 180 180 (Join-Path $iosWeb 'icons\icon-180.png')
Save-Resized $srcBmp 192 192 (Join-Path $iosWeb 'icons\icon-192.png')
Save-Resized $srcBmp 512 512 (Join-Path $iosWeb 'icons\icon-512.png')
Save-Resized $srcBmp 1024 1024 (Join-Path $iosWeb 'icons\icon-1024.png')
Save-Maskable $srcBmp 512 (Join-Path $iosWeb 'icons\maskable-512.png')

# ─────────────────────────────────────────────────────────────
# ۳. تولید آیکون‌های پروژه نیتیو اندروید (Mipmap densities)
# ─────────────────────────────────────────────────────────────
Write-Output "`n[3/4] Generating Android mipmap icons..."
$androidRes = Join-Path $AndroidRoot 'app\src\main\res'

$densities = @(
    @{ Name = 'mipmap-mdpi';    Legacy = 48;  Fg = 108 },
    @{ Name = 'mipmap-hdpi';    Legacy = 72;  Fg = 162 },
    @{ Name = 'mipmap-xhdpi';   Legacy = 96;  Fg = 216 },
    @{ Name = 'mipmap-xxhdpi';  Legacy = 144; Fg = 324 },
    @{ Name = 'mipmap-xxxhdpi'; Legacy = 192; Fg = 432 }
)

foreach ($d in $densities) {
    $targetDir = Join-Path $androidRes $d.Name
    Save-Rounded $srcBmp $d.Legacy 0.18 (Join-Path $targetDir 'ic_launcher.png')
    Save-Circular $srcBmp $d.Legacy (Join-Path $targetDir 'ic_launcher_round.png')
    Save-AdaptiveForeground $srcBmp $d.Fg (Join-Path $targetDir 'ic_launcher_foreground.png')
}

# ─────────────────────────────────────────────────────────────
# ۴. دارایی‌های وب داخل پکیج اندروید
# ─────────────────────────────────────────────────────────────
Write-Output "`n[4/4] Generating Android web asset icons..."
$androidAssetsWeb = Join-Path $AndroidRoot 'app\src\main\assets\web'
Save-Resized $srcBmp 180 180 (Join-Path $androidAssetsWeb 'apple-touch-icon.png')
Save-Resized $srcBmp 180 180 (Join-Path $androidAssetsWeb 'icons\icon-180.png')
Save-Resized $srcBmp 192 192 (Join-Path $androidAssetsWeb 'icons\icon-192.png')
Save-Resized $srcBmp 512 512 (Join-Path $androidAssetsWeb 'icons\icon-512.png')
Save-Resized $srcBmp 1024 1024 (Join-Path $androidAssetsWeb 'icons\icon-1024.png')
Save-Maskable $srcBmp 512 (Join-Path $androidAssetsWeb 'icons\maskable-512.png')

$srcBmp.Dispose()
Write-Output "`nALL APP ICONS SUCCESSFULLY GENERATED!"
