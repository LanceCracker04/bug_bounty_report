[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$ollamaApiUrl = 'http://127.0.0.1:11434/api/tags'
$appUrl = 'https://bug-bounty-report.vercel.app'
$requiredOrigin = 'https://bug-bounty-report.vercel.app'
$stdoutLog = Join-Path $env:TEMP 'bbr-ollama-stdout.log'
$stderrLog = Join-Path $env:TEMP 'bbr-ollama-stderr.log'

function Test-OllamaAvailable {
    try {
        $response = Invoke-WebRequest -Uri $ollamaApiUrl -Method Get -TimeoutSec 1 -UseBasicParsing
        return $response.StatusCode -eq 200
    }
    catch {
        return $false
    }
}

function Get-ProcessExitCodeText {
    param(
        [System.Diagnostics.Process]$Process
    )

    if ($null -eq $Process) {
        return 'Not available (the launcher did not start a process).'
    }

    try {
        $Process.Refresh()
        if ($Process.HasExited) {
            return [string]$Process.ExitCode
        }
    }
    catch {
        return 'Not available.'
    }

    return 'Not available (the process is still running).'
}

function Show-OllamaStartupFailure {
    param(
        [Parameter(Mandatory)]
        [string]$Details,

        [string]$OllamaPath,

        [System.Diagnostics.Process]$Process,

        [Parameter(Mandatory)]
        [bool]$ProcessStarted
    )

    if ([string]::IsNullOrWhiteSpace($OllamaPath)) {
        $OllamaPath = 'Not resolved.'
    }

    $processStartedText = if ($ProcessStarted) { 'Yes' } else { 'No' }
    $exitCodeText = Get-ProcessExitCodeText -Process $Process
    $message = @"
Bug Bounty Report could not make Ollama available at $ollamaApiUrl.

$Details

Ollama executable path: $OllamaPath
Process started: $processStartedText
Process exit code: $exitCodeText
Standard output log: $stdoutLog
Standard error log: $stderrLog

You may run this command manually:
ollama serve
"@

    try {
        Add-Type -AssemblyName System.Windows.Forms -ErrorAction Stop

        $form = New-Object System.Windows.Forms.Form
        $form.Text = 'Bug Bounty Report - Ollama unavailable'
        $form.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen
        $form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedDialog
        $form.ClientSize = [System.Drawing.Size]::new(760, 380)
        $form.MinimizeBox = $false
        $form.MaximizeBox = $false
        $form.ShowInTaskbar = $true

        $detailsBox = New-Object System.Windows.Forms.TextBox
        $detailsBox.Location = [System.Drawing.Point]::new(12, 12)
        $detailsBox.Size = [System.Drawing.Size]::new(736, 292)
        $detailsBox.Multiline = $true
        $detailsBox.ReadOnly = $true
        $detailsBox.ScrollBars = [System.Windows.Forms.ScrollBars]::Vertical
        $detailsBox.WordWrap = $true
        $detailsBox.Text = $message

        $openWithoutAiButton = New-Object System.Windows.Forms.Button
        $openWithoutAiButton.Text = 'Open App Without Local AI'
        $openWithoutAiButton.Location = [System.Drawing.Point]::new(388, 324)
        $openWithoutAiButton.Size = [System.Drawing.Size]::new(218, 30)
        $openWithoutAiButton.DialogResult = [System.Windows.Forms.DialogResult]::Yes

        $cancelButton = New-Object System.Windows.Forms.Button
        $cancelButton.Text = 'Cancel'
        $cancelButton.Location = [System.Drawing.Point]::new(618, 324)
        $cancelButton.Size = [System.Drawing.Size]::new(130, 30)
        $cancelButton.DialogResult = [System.Windows.Forms.DialogResult]::Cancel

        [void]$form.Controls.Add($detailsBox)
        [void]$form.Controls.Add($openWithoutAiButton)
        [void]$form.Controls.Add($cancelButton)
        $form.AcceptButton = $openWithoutAiButton
        $form.CancelButton = $cancelButton

        try {
            $dialogResult = $form.ShowDialog()
            return $dialogResult -eq [System.Windows.Forms.DialogResult]::Yes
        }
        finally {
            $form.Dispose()
        }
    }
    catch {
        # This fallback is only used if the Windows Forms dialog cannot be created.
        Write-Warning "$message`nThe application was not opened."
        return $false
    }
}

function Open-BugBountyReport {
    try {
        Start-Process -FilePath $appUrl -ErrorAction Stop
    }
    catch {
        Write-Warning "Ollama is available, but the browser could not be opened automatically. Open $appUrl manually."
    }
}

if (Test-OllamaAvailable) {
    Open-BugBountyReport
    exit 0
}

$ollamaPath = $null
$process = $null
$processStarted = $false
$failureDetails = $null
$ollamaAvailable = $false
$startupMutex = New-Object System.Threading.Mutex($false, 'Local\BugBountyReport.OllamaStartup')
$mutexAcquired = $false

try {
    try {
        $mutexAcquired = $startupMutex.WaitOne(0)
    }
    catch [System.Threading.AbandonedMutexException] {
        $mutexAcquired = $true
    }

    if ($mutexAcquired) {
        # Re-check after acquiring the mutex so a concurrent launcher cannot create a duplicate server.
        if (-not (Test-OllamaAvailable)) {
            $ollamaPath = (Get-Command ollama.exe -ErrorAction Stop).Source

            if ([string]::IsNullOrWhiteSpace($env:OLLAMA_ORIGINS)) {
                $env:OLLAMA_ORIGINS = $requiredOrigin
            }
            elseif ($env:OLLAMA_ORIGINS -notlike "*$requiredOrigin*") {
                $env:OLLAMA_ORIGINS = "$($env:OLLAMA_ORIGINS),$requiredOrigin"
            }

            foreach ($logPath in @($stdoutLog, $stderrLog)) {
                if (Test-Path -LiteralPath $logPath -PathType Leaf) {
                    Remove-Item -LiteralPath $logPath -Force -ErrorAction Stop
                }
            }

            $process = Start-Process `
                -FilePath $ollamaPath `
                -ArgumentList @('serve') `
                -WindowStyle Hidden `
                -PassThru `
                -RedirectStandardOutput $stdoutLog `
                -RedirectStandardError $stderrLog `
                -ErrorAction Stop
            $processStarted = $true
        }
    }
    else {
        $failureDetails = 'Another Bug Bounty Report launcher is already starting Ollama. This launcher did not start a second process.'
    }

    $deadline = (Get-Date).AddSeconds(45)
    while ((Get-Date) -lt $deadline) {
        if (Test-OllamaAvailable) {
            $ollamaAvailable = $true
            break
        }

        if ($null -ne $process) {
            $process.Refresh()
            if ($process.HasExited) {
                $failureDetails = "Ollama exited before its API became available (exit code $($process.ExitCode))."
                break
            }
        }

        Start-Sleep -Seconds 1
    }

    if ([string]::IsNullOrWhiteSpace($failureDetails)) {
        $failureDetails = 'Ollama did not become available within 45 seconds.'
    }
}
catch {
    $failureDetails = "Ollama could not be started. $($_.Exception.Message)"
}
finally {
    if ($mutexAcquired) {
        $startupMutex.ReleaseMutex()
    }
    $startupMutex.Dispose()
}

if ($ollamaAvailable) {
    Open-BugBountyReport
    exit 0
}

if (Show-OllamaStartupFailure -Details $failureDetails -OllamaPath $ollamaPath -Process $process -ProcessStarted $processStarted) {
    Open-BugBountyReport
    exit 0
}

exit 1
