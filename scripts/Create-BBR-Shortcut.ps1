[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$launcherPath = Join-Path $PSScriptRoot 'open-bug-bounty-report.ps1'

if (-not (Test-Path -LiteralPath $launcherPath -PathType Leaf)) {
    throw "The launcher script was not found: $launcherPath"
}

$desktopPath = [Environment]::GetFolderPath([Environment+SpecialFolder]::DesktopDirectory)
$shortcutPath = Join-Path $desktopPath 'Bug Bounty Report.lnk'
$powershellPath = (Get-Command -Name 'powershell.exe' -CommandType Application -ErrorAction Stop).Source

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $powershellPath
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$launcherPath`""
$shortcut.WorkingDirectory = $projectRoot
$shortcut.Description = 'Open Bug Bounty Report and ensure Ollama is available.'
$shortcut.Save()

Write-Host "Desktop shortcut created: $shortcutPath"
