param([Parameter(Mandatory=$true)][string]$BaselinePath, [string]$OutputSuffix = '')
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskBaseline = (Resolve-Path -LiteralPath $BaselinePath).Path
$taskRelease = Get-Content -LiteralPath (Join-Path $taskRoot 'release.json') -Raw | ConvertFrom-Json
& (Join-Path $PSScriptRoot 'sync-native.ps1')
& node (Join-Path $PSScriptRoot 'verify-release.cjs') --manifest
if ($LASTEXITCODE -ne 0) { throw 'Release validation failed' }
$taskName = 'CogniCode-' + $taskRelease.version + '-build-' + $taskRelease.build + '-update'
if ($OutputSuffix) {
    if ($OutputSuffix -notmatch '^[a-z0-9-]+$') { throw 'OutputSuffix must contain lowercase letters, numbers or hyphens' }
    $taskName += '-' + $OutputSuffix
}
$taskOutput = Join-Path $taskRoot 'artifacts'
New-Item -ItemType Directory -Force -Path $taskOutput | Out-Null
$taskStaging = Join-Path $taskOutput ($taskName + '-' + [guid]::NewGuid().ToString('N').Substring(0,8))
New-Item -ItemType Directory -Path $taskStaging | Out-Null
$taskCandidates = @('index.html','styles.css','workspace.css','workspace-store.js','workspace-features.js','change-set.js','project-zip.js','app.js','syntax.js','checker.js','malwatch.js','sonar.js','orbital-clock.js','launch.js','sw.js','manifest.webmanifest','apple-touch-icon.png','native/project.yml','release.json','release-manifest.json','RELEASE-1.1.0.md')
foreach ($taskDirectory in @('fonts','icons','native/CogniCode','native/CogniCodeWidgets','native/Web','tools','.github')) {
    Get-ChildItem -LiteralPath (Join-Path $taskRoot $taskDirectory) -Recurse -File | ForEach-Object {
        $taskCandidates += [IO.Path]::GetRelativePath($taskRoot, $_.FullName)
    }
}
$taskChanged = @()
foreach ($taskRelative in ($taskCandidates | Sort-Object -Unique)) {
    $taskSource = Join-Path $taskRoot $taskRelative
    $taskPrevious = Join-Path $taskBaseline $taskRelative
    if ((Test-Path -LiteralPath $taskPrevious -PathType Leaf) -and
        ((Get-FileHash -LiteralPath $taskSource).Hash -eq (Get-FileHash -LiteralPath $taskPrevious).Hash)) { continue }
    $taskDestination = Join-Path $taskStaging $taskRelative
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $taskDestination) | Out-Null
    Copy-Item -LiteralPath $taskSource -Destination $taskDestination
    $taskChanged += $taskRelative.Replace('\','/')
}
$taskZip = Join-Path $taskOutput ($taskName + '.zip')
# ZipFile retains .github and relative directory names on Windows and macOS.
if (Test-Path -LiteralPath $taskZip) { throw "Package already exists: $taskZip" }
[IO.Compression.ZipFile]::CreateFromDirectory($taskStaging, $taskZip)
$taskArchive = [IO.Compression.ZipFile]::OpenRead($taskZip)
try {
    foreach ($taskRelative in $taskChanged) {
        if (!$taskArchive.GetEntry($taskRelative)) { throw "Missing archive entry: $taskRelative" }
    }
} finally { $taskArchive.Dispose() }
$taskChanged | Set-Content -LiteralPath (Join-Path $taskOutput ($taskName + '-files.txt')) -Encoding utf8
Write-Output "Verified update package: $taskZip ($($taskChanged.Count) files)"
