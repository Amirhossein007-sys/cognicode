param(
    [switch]$Lan
)
$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $scriptDir

# پیش‌فرض فقط روی loopback: origin «http://localhost» یک secure context است، پس
# سرویس‌ورکر، کلیپ‌بورد و Web Share در تست PWA کار می‌کنند. با -Lan روی کل
# شبکه باز می‌شود (بدون احراز هویت) و آن origin دیگر secure context نیست.
$bindIp = if ($Lan) { [System.Net.IPAddress]::Any } else { [System.Net.IPAddress]::Loopback }
$listener = [System.Net.Sockets.TcpListener]::new($bindIp, 8791)
$listener.Start()
if ($Lan) { Write-Output "serving $root on http://0.0.0.0:8791/ (LAN reachable — insecure context for remote devices)" }
else { Write-Output "serving $root on http://localhost:8791/ (use -Lan to expose on the LAN)" }

$mimes = @{
  '.html' = 'text/html; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.js'   = 'text/javascript; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.webmanifest' = 'application/manifest+json; charset=utf-8'
  '.png'  = 'image/png'
  '.woff2' = 'font/woff2'
  '.svg'  = 'image/svg+xml'
}

function Send-Response($stream, [int]$code, [string]$ctype, [byte[]]$body) {
  $status = if ($code -eq 200) { 'OK' } elseif ($code -eq 404) { 'Not Found' } else { 'Error' }
  $head = "HTTP/1.1 $code $status`r`nContent-Type: $ctype`r`nContent-Length: $($body.Length)`r`nCache-Control: no-store`r`nConnection: close`r`nAccess-Control-Allow-Origin: *`r`n`r`n"
  $hb = [System.Text.Encoding]::ASCII.GetBytes($head)
  $stream.Write($hb, 0, $hb.Length)
  if ($body.Length -gt 0) { $stream.Write($body, 0, $body.Length) }
  $stream.Flush()
}

while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $client.ReceiveTimeout = 5000
    $stream = $client.GetStream()
    $buf = New-Object byte[] 16384
    $read = $stream.Read($buf, 0, $buf.Length)
    if ($read -le 0) { throw 'empty request' }
    $req = [System.Text.Encoding]::ASCII.GetString($buf, 0, $read)
    $line = ($req -split "`r`n")[0]
    $parts = $line -split ' '
    if ($parts.Count -lt 2) { throw 'bad request line' }
    $path = $parts[1] -replace '\?.*$', ''
    if ($path -eq '/') { $path = '/index.html' }
    $path = [Uri]::UnescapeDataString($path)
    $file = Join-Path $root ($path -replace '/', '\')
    $rootFull = (Resolve-Path $root).Path
    if ((Test-Path $file -PathType Leaf) -and ((Resolve-Path $file).Path.StartsWith($rootFull, [System.StringComparison]::OrdinalIgnoreCase))) {
      $bytes = [System.IO.File]::ReadAllBytes($file)
      $ext = [System.IO.Path]::GetExtension($file).ToLower()
      $ctype = $mimes[$ext]
      if (-not $ctype) { $ctype = 'application/octet-stream' }
      Send-Response $stream 200 $ctype $bytes
    } else {
      Send-Response $stream 404 'text/plain; charset=utf-8' ([System.Text.Encoding]::UTF8.GetBytes('404 - peyda nashod'))
    }
  } catch { }
  finally {
    try { $client.Close() } catch { }
  }
}
