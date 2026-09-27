param([string]$IpaPath)
Add-Type -AssemblyName System.IO.Compression.FileSystem
$z = [System.IO.Compression.ZipFile]::OpenRead($IpaPath)
$names = $z.Entries.FullName
Write-Host ("ENTRIES: " + $names.Count)
Write-Host ("APPEX entries: " + (@($names | Where-Object { $_ -like '*CogniCodeWidgets.appex*' }).Count))
foreach ($k in @(
  'Payload/CogniCode.app/PlugIns/CogniCodeWidgets.appex/CogniCodeWidgets',
  'Payload/CogniCode.app/PlugIns/CogniCodeWidgets.appex/Info.plist',
  'Payload/CogniCode.app/PlugIns/CogniCodeWidgets.appex/Assets.car',
  'Payload/CogniCode.app/PlugIns/CogniCodeWidgets.appex/_CodeSignature/CodeResources')) {
  Write-Host ($k + ' -> ' + [bool]($names -contains $k))
}
$e = $z.GetEntry('Payload/CogniCode.app/PlugIns/CogniCodeWidgets.appex/Info.plist')
if ($e) {
  $r = New-Object System.IO.StreamReader($e.Open())
  $xml = $r.ReadToEnd(); $r.Close()
  Write-Host '--- APPEX Info.plist ---'
  foreach ($k in @('CFBundleIdentifier','CFBundleExecutable','CFBundleVersion','CFBundlePackageType')) {
    if ($xml -match ('<key>' + $k + '</key>\s*<string>([^<]+)</string>')) { Write-Host ($k + ' = ' + $Matches[1]) }
  }
}
$m = $z.GetEntry('Payload/CogniCode.app/Info.plist')
if ($m) {
  $r = New-Object System.IO.StreamReader($m.Open())
  $xml = $r.ReadToEnd(); $r.Close()
  Write-Host '--- MAIN Info.plist ---'
  foreach ($k in @('CFBundleIdentifier','CFBundleVersion','NSSupportsLiveActivities')) {
    if ($xml -match ('<key>' + $k + '</key>\s*<(true|string)>([^<]*)</')) { Write-Host ($k + ' = ' + $Matches[2]) }
  }
}
$z.Dispose()
