foreach ($f in @(
  'C:\Users\Amirii\Desktop\cognicode\native\CogniCode\Info.plist',
  'C:\Users\Amirii\Desktop\cognicode\native\CogniCodeWidgets\Info.plist')) {
  try {
    [xml](Get-Content $f -Raw -Encoding UTF8) | Out-Null
    Write-Host ($f + ' -> XML OK')
  } catch {
    Write-Host ($f + ' -> XML ERROR: ' + $_.Exception.Message)
  }
}
