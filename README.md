# ClutterLess Organizer (`cless`)

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)
[![Go Version](https://img.shields.io/badge/Go-1.22%2B-00ADD8.svg?logo=go)](https://go.dev/)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey.svg)](https://github.com/Fizm00/ClutterLess-Organizer/releases)
[![Release](https://img.shields.io/github/v/release/Fizm00/ClutterLess-Organizer?color=green)](https://github.com/Fizm00/ClutterLess-Organizer/releases/latest)

**ClutterLess Organizer** (`cless`) is a fast, lightweight, and dependable local file organizer and background automator. It watches cluttered directories (such as your `Downloads` folder or `Desktop`) and automatically organizes incoming files into clean, categorized directories based on smart, customizable rules.

Engineered with safety as the #1 design constraint: `cless` never overwrites files, never deletes files without verified transfers, provides a full non-destructive `--dry-run` simulation, and maintains an append-only transaction log enabling instant one-shot `undo`.

---

## ✨ Features

- 🎯 **Deep Category Recognition:** Out-of-the-box organization for Invoices, Images, Videos, Audio, Documents, eBooks, Data/Code, Creative/3D assets, Installers, Archives, and Aged files.
- 🎨 **Interactive Terminal Experience:** Modern CLI with animated spinners, real-time live progress bars, colored status badges, and aesthetic framed summary reports.
- 🛡️ **Zero Data Loss Guarantee:** Never overwrites files. Automatically resolves collisions by appending numbered counters (e.g., `invoice (1).pdf`).
- 🔄 **One-Shot Rollback (`cless undo`):** Every file move is recorded in an append-only JSON Lines transaction log. Revert any batch back to its original location with a single command.
- 👁️ **Continuous Real-Time Watcher (`cless watch`):** Monitors folders in the background using OS filesystem events and only moves files after write stability (`stable_after_seconds`), ensuring downloads and copies finish completely before processing.
- 🗂️ **Interactive Folder Management:** Add or remove watched folders directly from your terminal using `cless folder add ~/Desktop` or `cless folder list`.
- 🔀 **Dynamic Path Templating:** Dynamically route files using template variables like `{year}`, `{month}`, `{day}`, `{ext}`, and `{name}`.
- 🌐 **Platform Aware:** Native Windows Known Folders support (including automatic OneDrive redirection), Windows file attribute detection, Linux XDG directories, and macOS home folders.
- 📦 **Single Standalone Binary:** Zero runtime dependencies, minimal memory footprint (< 15 MB).

---

## 🚀 Installation

### Automated One-Line Install (Recommended)

The installer automatically detects your operating system and CPU architecture (amd64 or arm64), downloads the **latest verified release** from GitHub, unpacks the executable, and adds it to your user `PATH`.

#### Windows (PowerShell)
Open PowerShell (no admin privileges required) and run:
```powershell
irm https://raw.githubusercontent.com/Fizm00/ClutterLess-Organizer/main/install.ps1 | iex
```

> **Tip:** To install a specific version instead of latest, set `$env:CLESS_VERSION`:
> ```powershell
> $env:CLESS_VERSION="0.3.0"; irm https://raw.githubusercontent.com/Fizm00/ClutterLess-Organizer/main/install.ps1 | iex
> ```

#### Linux & macOS (Bash / Zsh)
Open your terminal and run:
```bash
curl -fsSL https://raw.githubusercontent.com/Fizm00/ClutterLess-Organizer/main/install.sh | bash
```

> **Tip:** To install a specific version:
> ```bash
> CLESS_VERSION="0.3.0" curl -fsSL https://raw.githubusercontent.com/Fizm00/ClutterLess-Organizer/main/install.sh | bash
> ```

---

### Manual Download (Precompiled Binaries)

Download the precompiled archive for your platform directly from [GitHub Releases](https://github.com/Fizm00/ClutterLess-Organizer/releases/latest):

| Operating System | Architecture | Package |
|---|---|---|
| **Windows** | x86_64 / amd64 | [`cless_0.3.0_windows_amd64.zip`](https://github.com/Fizm00/ClutterLess-Organizer/releases/latest) |
| **Windows** | ARM64 | [`cless_0.3.0_windows_arm64.zip`](https://github.com/Fizm00/ClutterLess-Organizer/releases/latest) |
| **Linux** | x86_64 / amd64 | [`cless_0.3.0_linux_amd64.tar.gz`](https://github.com/Fizm00/ClutterLess-Organizer/releases/latest) |
| **Linux** | ARM64 | [`cless_0.3.0_linux_arm64.tar.gz`](https://github.com/Fizm00/ClutterLess-Organizer/releases/latest) |
| **macOS** | Apple Silicon (M1/M2/M3/M4) | [`cless_0.3.0_darwin_arm64.tar.gz`](https://github.com/Fizm00/ClutterLess-Organizer/releases/latest) |
| **macOS** | Intel (x86_64) | [`cless_0.3.0_darwin_amd64.tar.gz`](https://github.com/Fizm00/ClutterLess-Organizer/releases/latest) |

Extract the binary and place it into any folder inside your system `PATH` (such as `%LOCALAPPDATA%\Programs\cless` on Windows or `/usr/local/bin` on Linux/macOS).

### Install via Go

If you have Go installed (version 1.22+):
```bash
go install github.com/Fizm00/organizer/cmd/organizer@latest
```
*(Binary installs as `organizer`. You can symlink or copy it to `cless` for the short alias).*

---

## 🗑️ Uninstallation

If you ever wish to remove `cless`, you can do so cleanly with one command:

### Option 1: Built-in Command (Fastest)
```bash
cless uninstall
```
Flags:
- `-y, --yes`: Skip confirmation prompt.
- `--purge-config`: Also remove configuration files and transaction history logs.

### Option 2: Automated One-Line Script
- **Windows (PowerShell):**
  ```powershell
  irm https://raw.githubusercontent.com/Fizm00/ClutterLess-Organizer/main/uninstall.ps1 | iex
  ```
- **Linux & macOS:**
  ```bash
  curl -fsSL https://raw.githubusercontent.com/Fizm00/ClutterLess-Organizer/main/uninstall.sh | bash
  ```

---

## ⚡ 5-Minute Quickstart

### 1. Initialize Configuration
Generate your default configuration file:
```bash
cless init
```
*Standard OS config locations:*
- **Windows:** `%APPDATA%\organizer\config.yaml`
- **Linux:** `~/.config/organizer/config.yaml`
- **macOS:** `~/Library/Application Support/organizer/config.yaml`

### 2. Test Rules Without Moving Anything
Test which rule matches a particular file name:
```bash
cless rules test invoice_april_2026.pdf
```

### 3. Preview Organization with Dry-Run
Simulate organizing your `Downloads` directory safely:
```bash
cless run --dry-run
```
You will see an exact preview of every file destination and a detailed summary table.

### 4. Execute Organization
Once you are happy with the preview, organize the files:
```bash
cless run
```

### 5. Need to Undo?
If you organized something by mistake or want to return files back to `Downloads`:
```bash
cless undo
```

### 6. Continuous Background Organization
Let `cless` monitor your downloads in real-time. Whenever a file finishes downloading, it will automatically be organized:
```bash
cless watch
```

---

## 📁 Default File Categories & Rules

`cless` comes preloaded with comprehensive rules designed to maximize clutter reduction while keeping your files logical and easy to find:

| Category | Matched File Extensions / Patterns | Default Destination |
|---|---|---|
| **Invoices & Receipts** | RegEx: `(?i)(invoice\|faktur\|receipt\|kwitansi\|struk\|bukti.transfer\|pembayaran\|tagihan)` | `~/Documents/Finance/{year}-{month}` |
| **Images** | `jpg, jpeg, png, gif, webp, bmp, svg, ico, tiff, tif, heic` | `~/Pictures/Sorted/{year}` |
| **Videos** | `mp4, mkv, mov, avi, wmv, flv, webm, m4v` | `~/Videos/Sorted/{year}` |
| **Audio** | `mp3, wav, flac, aac, ogg, m4a, wma, opus` | `~/Music/Sorted/{year}` |
| **Documents** | `pdf, docx, doc, xlsx, xls, pptx, ppt, txt, md, rtf, odt, ods, odp, csv, tsv` | `~/Documents/Inbox/{ext}` |
| **Books & Comics** | `epub, mobi, azw3, djvu, cbr, cbz` | `~/Documents/Books` |
| **Data & Configs** | `json, xml, yaml, yml, toml, sql, sqlite, db` | `~/Documents/Data/{ext}` |
| **Creative & 3D** | `blend, fbx, obj, stl, gltf, glb, dae, 3ds, psd, ai, xd, fig` | `~/Documents/Creative_Assets` |
| **Installers** | `exe, msi, dmg, deb, pkg, rpm, appimage, apk, iso` | `~/Downloads/_Installers` |
| **Archives** | `zip, rar, 7z, tar, gz, bz2, xz, tgz` | `~/Downloads/_Archives` |
| **Old Stuff** | Files not modified in > 90 days (`older_than: 90d`) | `~/Downloads/_Old` |

---

## 🛠️ Command Reference

| Command | Description | Useful Options |
|---|---|---|
| `cless run` | Organize files in watched folders once | `--dry-run`, `--dir <folder>`, `-y, --yes` |
| `cless watch` | Continuously monitor folders for incoming files | `--dry-run`, `--dir <folder>`, `--log-file <file>`, `--initial-run` |
| `cless undo` | Revert previous move operations back to source | `--batch <id>`, `--dry-run` |
| `cless folder list` | List all folders currently watched | None |
| `cless folder add <path>` | Add a folder to the watch list | `-r, --recursive` |
| `cless folder remove <path>` | Remove a folder from the watch list | None |
| `cless init` | Create default configuration file | `--force`, `--path <custom_path>` |
| `cless config edit` | Open active `config.yaml` in Notepad / `$EDITOR` | None |
| `cless config path` | Print the absolute path to your configuration file | None |
| `cless config validate` | Validate configuration file syntax and semantics | None |
| `cless rules list` | List all active rules in priority order | None |
| `cless rules test <file>` | Test which rule matches a given filename | None |
| `cless history` | Display recent move transactions | `--limit <n>`, `--batch <id>` |
| `cless uninstall` | Remove binary and clean system PATH | `--purge-config`, `-y, --yes` |
| `cless version` | Display version, commit, and build date | None |

### Global Flags
- `--config <path>`: Override the default configuration file location.
- `-v, --verbose`: Enable detailed debug logging.
- `--no-color`: Disable ANSI color rendering.
- `-h, --help`: Display command usage, practical examples, and descriptions.

---

## ⚙️ Path Templating Variables

When specifying `move_to` destinations in your `config.yaml`, you can use dynamic placeholders:

- `{year}`: 4-digit modification year (e.g. `2026`)
- `{month}`: 2-digit modification month (e.g. `10`)
- `{day}`: 2-digit modification day (e.g. `28`)
- `{ext}`: Lowercase file extension without leading dot (e.g. `pdf`)
- `{name}`: Original file name without extension (e.g. `annual_report`)

Example:
```yaml
move_to: "~/Documents/Archive/{year}/{month}/{ext}"
```

---

## 🔒 Safety & Integrity Guarantees

1. **Conflict Resolution:** If a file with the destination name already exists, `cless` renames incoming files automatically (`file (1).ext`) unless configured to `skip`. It will **never** overwrite existing data.
2. **Atomic Verification:** On cross-drive transfers, `cless` writes to a temporary file, calls `fsync` to flush physical storage, validates byte size, atomically moves the file into position, and only then deletes the source.
3. **Write Stability Debounce:** Files actively downloading (like `.crdownload` or `.part`) or large files being copied are ignored until their file size and modification timestamps have been completely static for `stable_after_seconds`.
4. **Non-Destructive Dry Run:** Every command supports `--dry-run` to preview operations without modifying a single byte on your drive.
5. **Full Reversibility:** Every execution is logged in `history.jsonl`. Running `cless undo` returns files safely to their origin.

---

## 🤖 Running in the Background on Boot

To start `cless watch` automatically when logging into your computer without a visible terminal window:
- **Windows:** Use Task Scheduler or Startup folder VBScript launcher.
- **Linux:** Rootless user systemd service (`systemd --user`).
- **macOS:** User launchd Agent (`launchctl`).

Full setup instructions for all three platforms are documented in [docs/AUTOSTART.md](docs/AUTOSTART.md).

---

## 🤝 Contributing

Contributions, feedback, and bug reports are warmly welcome! Please check [CONTRIBUTING.md](CONTRIBUTING.md) for local development setup, testing guidelines, and PR guidelines. For security inquiries, see [SECURITY.md](SECURITY.md).

---

## 📄 License

ClutterLess Organizer is licensed under the **GNU Affero General Public License v3.0** (`AGPL-3.0-only`). See [LICENSE](LICENSE) for details.
Third-party dependencies and their respective licenses are listed in [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).
