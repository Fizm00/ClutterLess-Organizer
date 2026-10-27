<div align="center">

<img src="assets/hero.svg" alt="ClutterLess Organizer" width="100%" />

<br />

[![License: AGPL v3](https://img.shields.io/badge/license-AGPL_3.0-0ea5e9.svg?style=flat-square)](LICENSE)
[![Go Version](https://img.shields.io/badge/go-1.22+-6366f1.svg?style=flat-square&logo=go&logoColor=white)](https://go.dev/)
[![Release](https://img.shields.io/github/v/release/Fizm00/ClutterLess-Organizer?style=flat-square&color=10b981)](https://github.com/Fizm00/ClutterLess-Organizer/releases/latest)
[![CI](https://img.shields.io/github/actions/workflow/status/Fizm00/ClutterLess-Organizer/ci.yml?branch=main&style=flat-square&label=ci)](https://github.com/Fizm00/ClutterLess-Organizer/actions)
[![Platform](https://img.shields.io/badge/platform-windows%20%7C%20linux%20%7C%20macos-64748b.svg?style=flat-square)](https://github.com/Fizm00/ClutterLess-Organizer/releases)

<br />

**ClutterLess Organizer** (`cless`) is a deterministic local file organizer and background filesystem automator.<br />
Designed for high throughput, zero data loss, and seamless day-to-day desktop hygiene.

[Installation](#installation) • [Quick Start](#quick-start) • [File Categories](#file-categories--routing) • [CLI Reference](#cli-reference) • [Safety Guarantees](#safety-guarantees) • [Uninstall](#uninstallation)

<br />

<img src="assets/demo.svg" alt="cless dry-run interactive preview" width="100%" />

</div>

---

## Overview

Modern developer workflows generate immense file debris: daily downloads, screenshots, code archives, data dumps, and invoices scatter across directories. Manual sorting is tedious and error-prone.

`cless` monitors incoming directories (such as `~/Downloads`) and evaluates user-defined rules to route files to organized directories with dynamic date and extension templating. It operates as either an on-demand batch utility or a headless daemon.

### Design Principles

- **Zero Data Loss Guarantee:** Never overwrites files. Name collisions automatically resolve to incremental suffixes (`file (1).ext`) unless explicitly instructed to skip.
- **Transactional & Reversible:** Every file relocation is recorded in an append-only JSON Lines transaction log. Any batch can be restored to its exact previous location with `cless undo`.
- **Atomic Operations:** Cross-volume transfers use copy, `fsync` validation, byte-size verification, atomic rename, and verified source cleanup.
- **Write-Stability Debounce:** Active downloads (`.crdownload`, `.part`, `.tmp`) and in-flight writes are monitored until their size and modification timestamps stabilize for `stable_after_seconds` before any move takes place.
- **Native OS Integration:** Resolves Windows Known Folders (with OneDrive redirection support), Linux XDG specifications, and macOS system conventions with zero external runtime dependencies.

---

## Installation

### Automated Installer (Recommended)

The automated script inspects system architecture (`amd64` or `arm64`), resolves the latest verified release tag from GitHub without API rate limits, verifies the archive, installs the executable to user programs, and configures the environment `PATH`.

#### Windows (PowerShell)

```powershell
irm https://raw.githubusercontent.com/Fizm00/ClutterLess-Organizer/main/install.ps1 | iex
```

_To install a specific version:_

```powershell
$env:CLESS_VERSION="0.3.0"; irm https://raw.githubusercontent.com/Fizm00/ClutterLess-Organizer/main/install.ps1 | iex
```

#### Linux & macOS (Bash / Zsh)

```bash
curl -fsSL https://raw.githubusercontent.com/Fizm00/ClutterLess-Organizer/main/install.sh | bash
```

_To install a specific version:_

```bash
CLESS_VERSION="0.3.0" curl -fsSL https://raw.githubusercontent.com/Fizm00/ClutterLess-Organizer/main/install.sh | bash
```

---

<details>
<summary><b>Manual Installation (Precompiled Binaries)</b></summary>
<br />

Download standalone archive binaries directly from [GitHub Releases](https://github.com/Fizm00/ClutterLess-Organizer/releases/latest):

| Platform    | Architecture             | Archive                                                                                              |
| ----------- | ------------------------ | ---------------------------------------------------------------------------------------------------- |
| **Windows** | x86_64 / amd64           | [`cless_0.3.0_windows_amd64.zip`](https://github.com/Fizm00/ClutterLess-Organizer/releases/latest)   |
| **Windows** | ARM64                    | [`cless_0.3.0_windows_arm64.zip`](https://github.com/Fizm00/ClutterLess-Organizer/releases/latest)   |
| **Linux**   | x86_64 / amd64           | [`cless_0.3.0_linux_amd64.tar.gz`](https://github.com/Fizm00/ClutterLess-Organizer/releases/latest)  |
| **Linux**   | ARM64                    | [`cless_0.3.0_linux_arm64.tar.gz`](https://github.com/Fizm00/ClutterLess-Organizer/releases/latest)  |
| **macOS**   | Apple Silicon (M-series) | [`cless_0.3.0_darwin_arm64.tar.gz`](https://github.com/Fizm00/ClutterLess-Organizer/releases/latest) |
| **macOS**   | Intel x86_64             | [`cless_0.3.0_darwin_amd64.tar.gz`](https://github.com/Fizm00/ClutterLess-Organizer/releases/latest) |

Extract the binary and place it in a folder included in system `PATH` (such as `%LOCALAPPDATA%\Programs\cless` or `/usr/local/bin`).

</details>

<details>
<summary><b>Build from Source (Go 1.22+)</b></summary>
<br />

```bash
go install github.com/Fizm00/organizer/cmd/organizer@latest
```

_(Installs as `organizer`. Symlink or copy to `cless` for the shorthand alias)._

</details>

---

## Quick Start

### 1. Initialize Default Configuration

Generate a structured configuration file with preconfigured rule sets:

```bash
cless init
```

_Platform default locations:_

- **Windows:** `%APPDATA%\organizer\config.yaml`
- **Linux:** `~/.config/organizer/config.yaml`
- **macOS:** `~/Library/Application Support/organizer/config.yaml`

### 2. Validate Rules Against a File

Verify how rules evaluate without moving any file:

```bash
cless rules test invoice_april_2026.pdf
```

### 3. Dry-Run Preview

Simulate organizing watched folders with zero filesystem modifications:

```bash
cless run --dry-run
```

### 4. Execute Organization

Execute the planned relocations:

```bash
cless run
```

### 5. Revert When Needed

Roll back the previous batch back to original paths:

```bash
cless undo
```

### 6. Continuous Real-Time Watcher

Run as a background filesystem daemon:

```bash
cless watch
```

---

## File Categories & Routing

`cless` provides 11 preconfigured default categories to route clutter into dedicated, structured hierarchies:

| Rule Name      | Match Condition                                                                               | Destination Pattern                  |
| -------------- | --------------------------------------------------------------------------------------------- | ------------------------------------ |
| **Invoices**   | RegEx: `(?i)(invoice\|faktur\|receipt\|kwitansi\|struk\|bukti.transfer\|pembayaran\|tagihan)` | `~/Documents/Finance/{year}-{month}` |
| **Images**     | `jpg, jpeg, png, gif, webp, bmp, svg, ico, tiff, tif, heic`                                   | `~/Pictures/Sorted/{year}`           |
| **Videos**     | `mp4, mkv, mov, avi, wmv, flv, webm, m4v`                                                     | `~/Videos/Sorted/{year}`             |
| **Audio**      | `mp3, wav, flac, aac, ogg, m4a, wma, opus`                                                    | `~/Music/Sorted/{year}`              |
| **Documents**  | `pdf, docx, doc, xlsx, xls, pptx, ppt, txt, md, rtf, odt, ods, odp, csv, tsv`                 | `~/Documents/Inbox/{ext}`            |
| **Books**      | `epub, mobi, azw3, djvu, cbr, cbz`                                                            | `~/Documents/Books`                  |
| **Data**       | `json, xml, yaml, yml, toml, sql, sqlite, db`                                                 | `~/Documents/Data/{ext}`             |
| **Creative**   | `blend, fbx, obj, stl, gltf, glb, dae, 3ds, psd, ai, xd, fig`                                 | `~/Documents/Creative_Assets`        |
| **Installers** | `exe, msi, dmg, deb, pkg, rpm, appimage, apk, iso`                                            | `~/Downloads/_Installers`            |
| **Archives**   | `zip, rar, 7z, tar, gz, bz2, xz, tgz`                                                         | `~/Downloads/_Archives`              |
| **Old stuff**  | File modification age `older_than: 90d`                                                       | `~/Downloads/_Old`                   |

### Path Templating Variables

Destinations in `config.yaml` support dynamic placeholders:

- `{year}`: 4-digit modification year (`2026`)
- `{month}`: 2-digit modification month (`04`)
- `{day}`: 2-digit modification day (`28`)
- `{ext}`: Lowercase file extension without dot (`pdf`)
- `{name}`: Base filename without extension (`contract_draft`)

---

## CLI Reference

```
Usage:
  cless [command] [flags]
```

### Core Commands

| Command                      | Description                                     | Useful Flags                                                      |
| ---------------------------- | ----------------------------------------------- | ----------------------------------------------------------------- |
| `cless run`                  | Execute organization on watched folders         | `--dry-run`, `--dir <path>`, `-y, --yes`                          |
| `cless watch`                | Continuously monitor folders for incoming files | `--dry-run`, `--dir <path>`, `--log-file <path>`, `--initial-run` |
| `cless undo`                 | Revert previous move transactions               | `--batch <id>`, `--dry-run`                                       |
| `cless folder list`          | Display all configured watch folders            | None                                                              |
| `cless folder add <path>`    | Add folder to the permanent watch list          | `-r, --recursive`                                                 |
| `cless folder remove <path>` | Remove folder from the watch list               | None                                                              |

### Configuration & Utilities

| Command                   | Description                                        | Useful Flags                      |
| ------------------------- | -------------------------------------------------- | --------------------------------- |
| `cless init`              | Create default configuration file                  | `--force`, `--path <custom_path>` |
| `cless config edit`       | Open active `config.yaml` in `$EDITOR` or Notepad  | None                              |
| `cless config path`       | Print path to the active configuration file        | None                              |
| `cless config validate`   | Validate configuration syntax and rule definitions | None                              |
| `cless rules list`        | Display active rules in priority order             | None                              |
| `cless rules test <file>` | Test which rule matches a target filename          | None                              |
| `cless history`           | Display recent move transactions and batch IDs     | `--limit <n>`, `--batch <id>`     |
| `cless uninstall`         | Remove binary and clean environment `PATH`         | `--purge-config`, `-y, --yes`     |
| `cless version`           | Display version, commit, and build date            | None                              |

### Global Flags

- `--config <path>`: Override configuration file path.
- `--no-color`: Disable ANSI color escape sequences.
- `-v, --verbose`: Enable detailed debug logging.
- `-h, --help`: Display command usage and contextual examples.

---

## Safety Guarantees

1. **Collision Avoidance:** Existing target filenames are automatically suffixed with incremental numbers (`file (1).ext`) unless configured to skip. Existing data is never overwritten.
2. **Cross-Volume Transfer Integrity:** When source and target reside on different physical drives or partitions, `cless` writes to a temporary file, invokes `fsync` to flush disk buffers, checks exact byte counts, performs an atomic rename, and only then deletes the source file.
3. **Write Stability Debounce:** Files in the process of downloading or unpacking are deferred until file size and modification timestamps remain static for `stable_after_seconds`.
4. **Non-Destructive Simulation:** `--dry-run` performs full rule evaluation and destination calculation in-memory without making filesystem modifications.
5. **Deterministic Transaction Rollback:** Operations append structured JSON Lines records to `history.jsonl`. Restoring via `cless undo` returns files to their origins while checking target occupancy to prevent conflicts

---

## Autostart Daemon

To run `cless watch` automatically upon user login in the background without terminal windows:

- **Windows:** Task Scheduler (`schtasks`) or Startup folder VBScript launcher.
- **Linux:** Systemd user service (`systemctl --user enable cless.service`).
- **macOS:** Launchd user agent (`launchctl load ~/Library/LaunchAgents/com.cless.organizer.plist`).

Complete step-by-step setup guides are provided in [docs/AUTOSTART.md](docs/AUTOSTART.md).

---

## Uninstallation

To remove `cless` from the system:

### Option 1: Native Command

```bash
cless uninstall
```

_Optional parameters: `-y` (skip prompt), `--purge-config` (remove config files and history)._

### Option 2: Automated Script

- **Windows (PowerShell):**
  ```powershell
  irm https://raw.githubusercontent.com/Fizm00/ClutterLess-Organizer/main/uninstall.ps1 | iex
  ```
- **Linux & macOS:**
  ```bash
  curl -fsSL https://raw.githubusercontent.com/Fizm00/ClutterLess-Organizer/main/uninstall.sh | bash
  ```

---

## Contributing

Contributions and bug reports are welcome. Please consult [CONTRIBUTING.md](CONTRIBUTING.md) for local development setup, coding guidelines, and pull request procedures. Security disclosures should follow [SECURITY.md](SECURITY.md).

---

## License

ClutterLess Organizer is licensed under the **GNU Affero General Public License v3.0** (`AGPL-3.0-only`). See [LICENSE](LICENSE) for details.
Third-party licenses are documented in [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).
