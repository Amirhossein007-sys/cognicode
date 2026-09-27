Add-Type -AssemblyName System.Drawing
$filePath = "C:\Users\Amirii\.gemini\antigravity\brain\eb757029-b6f6-445e-8011-1cf879c43156\.user_uploaded\media_1790179198667.png"
$bmp = New-Object System.Drawing.Bitmap($filePath)

# Scan vertically along center X
$midX = [int]($bmp.Width / 2)
$topAppY = -1
$bottomAppY = -1

for ($y = 0; $y -lt $bmp.Height; $y++) {
    $p = $bmp.GetPixel($midX, $y)
    # Check if not pure black (R > 5 or G > 5 or B > 5)
    if ($p.R -gt 5 -or $p.G -gt 5 -or $p.B -gt 5) {
        if ($topAppY -eq -1) { $topAppY = $y }
        $bottomAppY = $y
    }
}

Write-Output "App Content spans vertically from Y = $topAppY to Y = $bottomAppY (Total height: $($bmp.Height))"

# Check horizontal span at Y = $topAppY + 100
$testY = $topAppY + 100
$leftX = -1
$rightX = -1
for ($x = 0; $x -lt $bmp.Width; $x++) {
    $p = $bmp.GetPixel($x, $testY)
    if ($p.R -gt 5 -or $p.G -gt 5 -or $p.B -gt 5) {
        if ($leftX -eq -1) { $leftX = $x }
        $rightX = $x
    }
}
Write-Output "App Content spans horizontally at Y=$testY from X = $leftX to X = $rightX (Total width: $($bmp.Width))"

$bmp.Dispose()
