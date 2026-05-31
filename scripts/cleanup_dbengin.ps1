# Cleanup script: remove Run key, stop process, delete files
Remove-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name 'UserAppStartup' -ErrorAction SilentlyContinue
Write-Output 'Removed Run key (if present)'

# Show remaining Run value (if any)
try { $val = (Get-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -ErrorAction SilentlyContinue).UserAppStartup } catch { $val = $null }
if ($val) { Write-Output "Remaining Run value: $val" } else { Write-Output 'No UserAppStartup value present' }

# Attempt to stop dbengin process
Stop-Process -Name dbengin -Force -ErrorAction SilentlyContinue
Write-Output 'Stop-Process attempted'

# Paths to delete
$paths = @(
  'C:\Users\DEEBYTE COMPUTERS\AppData\Local\Microsoft\PlayReady\dbengin.exe',
  'C:\Users\DEEBYTE COMPUTERS\Documents\Js\downloaded_from_gdown.exe'
)

foreach ($p in $paths) {
  if (Test-Path $p) {
    try {
      Remove-Item -Path $p -Force -ErrorAction Stop
      Write-Output "Deleted: $p"
    } catch {
      Write-Output "Failed to delete: $p => $($_.Exception.Message)"
    }
  } else {
    Write-Output "Not found: $p"
  }
}

Write-Output 'Final existence check:'
foreach ($p in $paths) { Write-Output "$p -> $(Test-Path $p)" }
