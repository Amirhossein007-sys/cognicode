# Measure the painted (non-black) content bounds of a launch-screen screenshot.
# Usage: pwsh -File tools/measure-launch-bounds.ps1 -ImagePath <screenshot.png>
param(
    [Parameter(Mandatory = $true)]
    [string]$ImagePath
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

if (-not (Test-Path -LiteralPath $ImagePath)) {
    throw "Screenshot not found: $ImagePath"
}

$bmp = New-Object System.Drawing.Bitmap((Resolve-Path -LiteralPath $ImagePath).Path)
try {
    # Scan vertically along the center column for the first/last non-black pixel.
    $midX = [int]($bmp.Width / 2)
    $topAppY = -1
    $bottomAppY = -1

    for ($y = 0; $y -lt $bmp.Height; $y++) {
        $p = $bmp.GetPixel($midX, $y)
        # Treat near-black as background (letterboxing); anything brighter is content.
        if ($p.R -gt 5 -or $p.G -gt 5 -or $p.B -gt 5) {
            if ($topAppY -eq -1) { $topAppY = $y }
            $bottomAppY = $y
        }
    }

    Write-Output "App content spans vertically from Y = $topAppY to Y = $bottomAppY (image height: $($bmp.Height))"

    if ($topAppY -lt 0) {
        Write-Output 'No non-black content found; the screenshot is entirely background.'
        return
    }

    # Horizontal span a little below the top edge, inside the content band.
    $testY = [Math]::Min($topAppY + 100, $bmp.Height - 1)
    $leftX = -1
    $rightX = -1
    for ($x = 0; $x -lt $bmp.Width; $x++) {
        $p = $bmp.GetPixel($x, $testY)
        if ($p.R -gt 5 -or $p.G -gt 5 -or $p.B -gt 5) {
            if ($leftX -eq -1) { $leftX = $x }
            $rightX = $x
        }
    }
    Write-Output "App content spans horizontally at Y=$testY from X = $leftX to X = $rightX (image width: $($bmp.Width))"
}
finally {
    $bmp.Dispose()
}
