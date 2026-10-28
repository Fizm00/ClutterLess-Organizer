# ClutterLess Organizer (cless) - One-Line Windows Installer
# Usage in PowerShell:
#   irm https://raw.githubusercontent.com/Fizm00/ClutterLess-Organizer/main/install.ps1 | iex
# Or specify a version:
#   $env:CLESS_VERSION="1.0.0"; irm https://raw.githubusercontent.com/Fizm00/ClutterLess-Organizer/main/install.ps1 | iex

param(
    [string]$Version = $env:CLESS_VERSION,
    [switch]$Force = ($env:CLESS_FORCE -eq "1")
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($Version)) {
    $Version = "latest"
}

# Helper to compare semantic versions
function Compare-VersionString ($v1, $v2) {
    try {
        $ver1 = [version]$v1
        $ver2 = [version]$v2
        return $ver1.CompareTo($ver2)
    } catch {
        return [string]::Compare($v1, $v2, [StringComparison]::OrdinalIgnoreCase)
    }
}

# 1. Determine architecture
$arch = "amd64"
if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") {
    $arch = "arm64"
}

# 2. Resolve version and release tag
$repo = "Fizm00/ClutterLess-Organizer"
$tag = "v1.0.0"

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
$installDir = Join-Path $env:LOCALAPPDATA "Programs\cless"
$defaultExe = Join-Path $installDir "cless.exe"

# 3. Detect existing installation and compare versions
$installedExe = $null
if (Test-Path $defaultExe) {
    $installedExe = $defaultExe
} else {
    $cmd = Get-Command "cless" -ErrorAction SilentlyContinue
    if ($cmd) {
        $installedExe = $cmd.Source
    }
}

$installAction = "install" # "install", "upgrade", "reinstall", "downgrade"
$installedVersion = $null

if ($installedExe -and (Test-Path $installedExe)) {
    try {
        $verOut = & $installedExe version 2>$null
        if ($verOut -match "version ([vV]?[0-9]+\.[0-9]+(?:\.[0-9]+)?)") {
            $installedVersion = $Matches[1].TrimStart("v")
        }
    } catch {}
}

if ($installedVersion) {
    $cmp = Compare-VersionString $installedVersion $cleanVersion
    if ($cmp -eq 0) {
        # Same version already installed
        Write-Host "ClutterLess Organizer v$installedVersion is already installed at: $installedExe" -ForegroundColor Cyan
        if (-not $Force) {
            $canPrompt = [Environment]::UserInteractive -and -not [Console]::IsInputRedirected
            if ($canPrompt) {
                $reply = Read-Host "Do you want to reinstall? [y/N]"
                if ($reply -notmatch "^[yY](?:es)?$") {
                    Write-Host "Reinstall canceled. Existing version v$installedVersion preserved." -ForegroundColor Yellow
                    return
                }
            } else {
                Write-Host "Reinstall skipped (already on version v$installedVersion). Use -Force to override." -ForegroundColor Yellow
                return
            }
        }
        $installAction = "reinstall"
        Write-Host "Reinstalling ClutterLess Organizer v$cleanVersion..." -ForegroundColor Cyan
    } elseif ($cmp -lt 0) {
        # Installed version is older -> UPGRADE
        $installAction = "upgrade"
        Write-Host "Existing installation detected: v$installedVersion" -ForegroundColor DarkGray
        Write-Host "Upgrading ClutterLess Organizer to v$cleanVersion..." -ForegroundColor Cyan
    } else {
        # Installed version is newer -> DOWNGRADE
        Write-Host "A newer version (v$installedVersion) is already installed at: $installedExe" -ForegroundColor Yellow
        if (-not $Force) {
            $canPrompt = [Environment]::UserInteractive -and -not [Console]::IsInputRedirected
            if ($canPrompt) {
                $reply = Read-Host "Do you want to downgrade to v$cleanVersion? [y/N]"
                if ($reply -notmatch "^[yY](?:es)?$") {
                    Write-Host "Downgrade canceled. Existing version v$installedVersion preserved." -ForegroundColor Yellow
                    return
                }
            } else {
                Write-Host "Downgrade skipped. Use -Force to override." -ForegroundColor Yellow
                return
            }
        }
        $installAction = "downgrade"
        Write-Host "Downgrading ClutterLess Organizer to v$cleanVersion..." -ForegroundColor Cyan
    }
} else {
    Write-Host "Installing ClutterLess Organizer (cless v$cleanVersion)..." -ForegroundColor Cyan
}

# 4. Terminate any running cless process before replacing binary
$running = Get-Process -Name "cless" -ErrorAction SilentlyContinue
if ($running) {
    Write-Host "Stopping active cless process before replacing binary..." -ForegroundColor Yellow
    Stop-Process -Name "cless" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
}

# 5. Download and extract
$zipName = "cless_${cleanVersion}_windows_${arch}.zip"
$downloadUrl = "https://github.com/$repo/releases/download/$tag/$zipName"
$tempZip = Join-Path $env:TEMP $zipName

Write-Host "Downloading $zipName (version: $tag) from GitHub..." -ForegroundColor Cyan
Invoke-WebRequest -Uri $downloadUrl -OutFile $tempZip -UseBasicParsing

Write-Host "Extracting to $installDir..." -ForegroundColor Cyan
New-Item -ItemType Directory -Path $installDir -Force | Out-Null
Expand-Archive -Path $tempZip -DestinationPath $installDir -Force
Remove-Item -Force $tempZip

# 6. Add to User PATH if not present
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$installDir*") {
    $newPath = if ([string]::IsNullOrWhiteSpace($userPath)) { $installDir } else { "$userPath;$installDir" }
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-Host "Added $installDir to User PATH." -ForegroundColor Green
}
$env:Path += ";$installDir"

Write-Host ""
switch ($installAction) {
    "upgrade" {
        Write-Host "Upgrade successful! ClutterLess Organizer updated: v$installedVersion -> v$cleanVersion" -ForegroundColor Green
    }
    "reinstall" {
        Write-Host "Reinstall successful! (Version: $cleanVersion)" -ForegroundColor Green
    }
    "downgrade" {
        Write-Host "Downgrade successful! (Version: $cleanVersion)" -ForegroundColor Green
    }
    default {
        Write-Host "Installation successful! (Version: $cleanVersion)" -ForegroundColor Green
    }
}
Write-Host "ClutterLess Organizer is installed at: $installDir\cless.exe"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Open a new terminal window (or restart your terminal)."
Write-Host "  2. Run 'cless init' to create your configuration."
Write-Host "  3. Run 'cless run --dry-run' to test safely."
Write-Host "  4. Type 'cless help' anytime to explore all commands and practical examples."
Write-Host ""
Write-Host "To uninstall in the future, run: irm https://raw.githubusercontent.com/$repo/main/uninstall.ps1 | iex" -ForegroundColor DarkGray
