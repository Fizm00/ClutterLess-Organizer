# ClutterLess Organizer (cless) - One-Line Windows Installer
# Usage in PowerShell:
#   irm https://raw.githubusercontent.com/Fizm00/ClutterLess-Organizer/main/install.ps1 | iex
# Or specify a version:
#   $env:CLESS_VERSION="0.3.0"; irm https://raw.githubusercontent.com/Fizm00/ClutterLess-Organizer/main/install.ps1 | iex

param(
    [string]$Version = $env:CLESS_VERSION
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($Version)) {
    $Version = "latest"
}

Write-Host "Installing ClutterLess Organizer (cless)..." -ForegroundColor Cyan

# 1. Determine architecture
$arch = "amd64"
if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") {
    $arch = "arm64"
}

# 2. Resolve version and release tag
$repo = "Fizm00/ClutterLess-Organizer"
$tag = "v0.3.0"

if ($Version -eq "latest") {
    Write-Host "Resolving latest release..." -ForegroundColor DarkGray
    # Try HTTP 302 redirect on releases/latest first (fast, reliable, no API rate limits)
    try {
        $req = [System.Net.HttpWebRequest]::Create("https://github.com/$repo/releases/latest")
        $req.AllowAutoRedirect = $false
        $req.Method = "HEAD"
        $req.UserAgent = "cless-installer"
        $resp = $req.GetResponse()
        $location = $resp.GetResponseHeader("Location")
        $resp.Close()
        if ($location -match "releases/tag/(v?[0-9\.]+.*)$") {
            $tag = $Matches[1]
        }
    } catch {
        # Fallback to GitHub API if redirect check fails
        try {
            $releaseJson = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/latest" -Headers @{ "User-Agent" = "cless-installer" }
            if ($releaseJson.tag_name) {
                $tag = $releaseJson.tag_name
            }
        } catch {
            Write-Host "Note: Using default release tag $tag" -ForegroundColor DarkGray
        }
    }
} else {
    $tag = if ($Version.StartsWith("v")) { $Version } else { "v$Version" }
}

$cleanVersion = $tag.TrimStart("v")
$zipName = "cless_${cleanVersion}_windows_${arch}.zip"
$downloadUrl = "https://github.com/$repo/releases/download/$tag/$zipName"
$tempZip = Join-Path $env:TEMP $zipName
$installDir = Join-Path $env:LOCALAPPDATA "Programs\cless"

Write-Host "Downloading $zipName (version: $tag) from GitHub..." -ForegroundColor Cyan
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
Write-Host "Installation successful! (Version: $cleanVersion)" -ForegroundColor Green
Write-Host "ClutterLess Organizer is installed at: $installDir\cless.exe"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Open a new terminal window (or restart your terminal)."
Write-Host "  2. Run 'cless init' to create your configuration."
Write-Host "  3. Run 'cless run --dry-run' to test safely."
Write-Host "  4. Type 'cless help' anytime to explore all commands and practical examples."
Write-Host ""
Write-Host "To uninstall in the future, run: irm https://raw.githubusercontent.com/$repo/main/uninstall.ps1 | iex" -ForegroundColor DarkGray
