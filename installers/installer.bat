@echo off
chcp 1251

:: Step 1: Install Chocolatey
echo Installing Chocolatey...
powershell -Command "Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))"
echo.

:: Step 2: Install/update WSL 2
echo Install/update WSL 2...
powershell -Command "dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart"
powershell -Command "dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart"
wsl --set-default-version 2
echo.

:: Step 3: Install Docker Desktop
echo Installing Docker Desktop...
choco install docker-desktop -y
echo.

echo Install successfully complete.
echo Please restart your computer and run the program again.
pause
