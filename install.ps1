# ClutterLess Organizer (cless) - One-Line Windows Installer
# Usage in PowerShell:
#   irm https://raw.githubusercontent.com/Fizm00/ClutterLess-Organizer/main/install.ps1 | iex

$ErrorActionPreference = "Stop"

Write-Host "Installing ClutterLess Organizer (cless)..." -ForegroundColor Cyan

# 1. Determine architecture
$arch = "amd64"
if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") {
    $arch = "arm64"
}

# 2. Get latest release version from GitHub API
$repo = "Fizm00/ClutterLess-Organizer"
$apiUrl = "https://api.github.com/repos/$repo/releases/latest"
$tag = "v0.1.0"
$version = "0.1.0"

try {
    $releaseJson = Invoke-RestMethod -Uri $apiUrl -Headers @{ "User-Agent" = "cless-installer" }
    if ($releaseJson.tag_name) {
        $tag = $releaseJson.tag_name
        $version = $tag.TrimStart("v")
    }
} catch {
    Write-Host "Note: Using default release tag $tag" -ForegroundColor DarkGray
}

$zipName = "cless_${version}_windows_${arch}.zip"
$downloadUrl = "https://github.com/$repo/releases/download/$tag/$zipName"
$tempZip = Join-Path $env:TEMP $zipName
$installDir = Join-Path $env:LOCALAPPDATA "Programs\cless"

Write-Host "Downloading $zipName from GitHub..." -ForegroundColor Cyan
Invoke-WebRequest -Uri $downloadUrl -OutFile $tempZip -UseBasicParsing

# 3. Extract executable
Write-Host "Extracting to $installDir..." -ForegroundColor Cyan
New-Item -ItemType Directory -Path $installDir -Force | Out-Null
Expand-Archive -Path $tempZip -DestinationPath $installDir -Force
Remove-Item -Force $tempZip

# 4. Add to User PATH if not present
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$installDir*") {
    $newPath = if ([string]::IsNullOrWhiteSpace($userPath)) { $installDir } else { "$userPath;$installDir" }
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-Host "Added $installDir to User PATH." -ForegroundColor Green
}
$env:Path += ";$installDir"

Write-Host ""
Write-Host "Installation successful!" -ForegroundColor Green
Write-Host "ClutterLess Organizer is installed at: $installDir\cless.exe"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Open a new terminal window."
Write-Host "  2. Run 'cless init' to create your configuration."
Write-Host "  3. Run 'cless run --dry-run' to test safely."
