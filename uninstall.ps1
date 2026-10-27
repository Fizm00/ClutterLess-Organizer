# ClutterLess Organizer (cless) - One-Line Windows Uninstaller
# Usage in PowerShell:
#   irm https://raw.githubusercontent.com/Fizm00/ClutterLess-Organizer/main/uninstall.ps1 | iex
# Or with config removal:
#   $env:CLESS_PURGE_CONFIG="1"; irm https://raw.githubusercontent.com/Fizm00/ClutterLess-Organizer/main/uninstall.ps1 | iex

param(
    [switch]$PurgeConfig = ($env:CLESS_PURGE_CONFIG -eq "1"),
    [switch]$Force
)

$ErrorActionPreference = "Stop"

Write-Host "Uninstalling ClutterLess Organizer (cless)..." -ForegroundColor Cyan

# 1. Terminate any running cless processes
$running = Get-Process -Name "cless" -ErrorAction SilentlyContinue
if ($running) {
    Write-Host "Stopping running cless processes..." -ForegroundColor Yellow
    Stop-Process -Name "cless" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
}

# 2. Locate installation directory
$installDir = Join-Path $env:LOCALAPPDATA "Programs\cless"
if (Test-Path $installDir) {
    Write-Host "Removing binary from $installDir..." -ForegroundColor Cyan
    Remove-Item -Path $installDir -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "Removed $installDir." -ForegroundColor Green
} else {
    Write-Host "Installation directory not found at $installDir (may already be removed)." -ForegroundColor DarkGray
}

# 3. Remove from User PATH
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -like "*$installDir*") {
    $pathParts = $userPath -split ";" | Where-Object { $_ -ne "" -and $_ -ne $installDir -and $_ -ne "$installDir\" }
    $newPath = $pathParts -join ";"
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-Host "Removed $installDir from User PATH." -ForegroundColor Green
}

# 4. Handle configuration directory (%APPDATA%\organizer)
$configDir = Join-Path $env:APPDATA "organizer"
if (Test-Path $configDir) {
    $shouldPurge = $PurgeConfig
    if (-not $shouldPurge -and -not $Force -and [Environment]::UserInteractive -and -not [Console]::IsInputRedirected) {
        $reply = Read-Host "Do you want to delete your configuration and history ($configDir)? [y/N]"
        if ($reply -match "^[yY]$") {
            $shouldPurge = $true
        }
    }

    if ($shouldPurge) {
        Remove-Item -Path $configDir -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "Removed configuration and history at $configDir." -ForegroundColor Green
    } else {
        Write-Host "Configuration preserved at: $configDir" -ForegroundColor DarkGray
        Write-Host "(You can safely delete that folder manually if you wish to wipe all data)." -ForegroundColor DarkGray
    }
}

Write-Host ""
Write-Host "Uninstallation complete! ClutterLess Organizer has been removed from your system." -ForegroundColor Green
