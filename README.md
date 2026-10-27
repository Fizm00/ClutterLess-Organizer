# ClutterLess Organizer (`cless`)

ClutterLess Organizer (`cless`) is a fast, lightweight, and dependable local file organizer and automator. It monitors cluttered directories (such as Downloads and Desktop) and organizes incoming files into destination directories according to user-defined YAML rules.

The tool is engineered with safety as the primary design constraint: it never overwrites files, never deletes files without verified atomic transfers, provides a full dry-run preview, and maintains an append-only transaction log enabling instant undo.

---

## Features

- **Rule-Based Organization:** Match files by extension, glob patterns, case-insensitive regular expressions, file size thresholds, and file age.
- **Dynamic Path Templating:** Route files to structured directories using template variables like `{year}`, `{month}`, `{day}`, `{ext}`, and `{name}`.
- **Continuous Watch Mode:** Automatically organizes files in real-time using filesystem notifications with debounce and write-stability detection (`stable_after_seconds`).
- **Complete Safety Guarantees:** Automatic conflict avoidance with numbering (`file (1).ext`), verified cross-volume transfers, and locked-file retries.
- **Full Rollback Support:** Every executed move is tracked in a local history log, allowing any batch to be undone with a single command.
- **Platform Aware:** Native Windows Known Folders support (including automatic OneDrive redirection), Windows file attribute detection, Linux XDG directories, and macOS home folders.
- **Zero Runtime Dependencies:** Standalone single binary for Windows, Linux, and macOS (amd64 and arm64).

---

## Installation

### Precompiled Binaries

Download the appropriate binary or archive for your operating system and architecture from the [GitHub Releases](https://github.com/Fizm00/ClutterLess-Organizer/releases) page:

- **Windows:** `cless_0.1.0_windows_amd64.zip` / `cless_0.1.0_windows_arm64.zip`
- **Linux:** `cless_0.1.0_linux_amd64.tar.gz` / `cless_0.1.0_linux_arm64.tar.gz`
- **macOS:** `cless_0.1.0_darwin_amd64.tar.gz` / `cless_0.1.0_darwin_arm64.tar.gz`

Extract the binary and place it in your system `PATH` (for example, `C:\Windows\System32` or `%USERPROFILE%\bin` on Windows, or `/usr/local/bin` on Linux and macOS).

### Install via Go

If you have Go installed (version 1.22+):

```bash
go install github.com/Fizm00/organizer/cmd/organizer@latest
```

This installs the binary as `organizer`. You can create an alias or rename the executable to `cless`:

```bash
# On Linux / macOS
ln -s $(go env GOPATH)/bin/organizer /usr/local/bin/cless

# On Windows (PowerShell)
Copy-Item (Join-Path (go env GOPATH) "bin\organizer.exe") (Join-Path (go env GOPATH) "bin\cless.exe")
```

---

## 5-Minute Quickstart

### Step 1: Initialize Configuration
Generate the default configuration file at your standard OS configuration location:

```bash
cless init
```

Default configuration paths:
- **Windows:** `%APPDATA%\organizer\config.yaml`
- **Linux:** `~/.config/organizer/config.yaml`
- **macOS:** `~/Library/Application Support/organizer/config.yaml`

### Step 2: Validate the Configuration
Ensure the YAML syntax and rules are valid:

```bash
cless config validate
```

### Step 3: Test Rules Against Files
Test how specific files will match against your configured rules without touching any files:

```bash
cless rules test invoice_2026.pdf
```

### Step 4: Preview Organization (`--dry-run`)
Simulate moving all matching files currently residing in watched directories:

```bash
cless run --dry-run
```

### Step 5: Execute One-Shot Organization
Execute the planned moves:

```bash
cless run
```

### Step 6: Rollback When Needed
If you need to revert the moves from the previous execution:

```bash
cless undo
```

### Step 7: Run Continuous Watcher
Start the background watcher to process incoming files as soon as downloads finish and stabilize:

```bash
cless watch
```

---

## Configuration Reference

The configuration file is formatted in standard YAML. Below is an example configuration:

```yaml
version: 1

settings:
  stable_after_seconds: 3
  ignore_ext:
    - crdownload
    - part
    - tmp
    - download
    - partial
    - opdownload
  ignore_names:
    - desktop.ini
    - thumbs.db
    - .DS_Store
  ignore_hidden: true
  conflict: rename
  fallback_dir: ""

watch:
  - path: ~/Downloads
    recursive: false
  - path: ~/Desktop
    recursive: false

rules:
  - name: Images
    match:
      ext: [jpg, jpeg, png, gif, webp, bmp, svg]
    move_to: ~/Pictures/Sorted/{year}

  - name: Documents
    match:
      ext: [pdf, docx, doc, xlsx, xls, pptx, txt, md]
    move_to: ~/Documents/Inbox/{ext}

  - name: Invoices
    match:
      name_regex: "(?i)(invoice|faktur|receipt|kwitansi)"
    move_to: ~/Documents/Finance/{year}-{month}

  - name: Installers
    match:
      ext: [exe, msi, dmg, deb, pkg]
    move_to: ~/Downloads/_Installers

  - name: Large Archives
    match:
      ext: [zip, rar, 7z, tar, gz]
      min_size: 1MB
    move_to: ~/Downloads/_Archives

  - name: Old Files
    match:
      older_than: 90d
    move_to: ~/Downloads/_Old
```

### Template Variables

Template variables available within `move_to` destinations:
- `{year}`: 4-digit modification year (e.g. `2026`)
- `{month}`: 2-digit modification month (e.g. `10`)
- `{day}`: 2-digit modification day (e.g. `28`)
- `{ext}`: Lowercase file extension without leading dot (e.g. `pdf`)
- `{name}`: Base filename without extension (e.g. `report`)

---

## Command Reference

| Command | Description | Useful Flags |
|---|---|---|
| `cless init` | Create default configuration file | `--force`, `--path <file>` |
| `cless run` | Organize files in watched folders once | `--dry-run`, `--dir <folder>`, `--yes` |
| `cless watch` | Continuously watch folders for new files | `--dry-run`, `--log-file <file>`, `--initial-run` |
| `cless undo` | Revert previous move operations | `--batch <id>`, `--dry-run` |
| `cless history` | Display recent move batches | `--limit <n>`, `--batch <id>` |
| `cless rules list` | List all configured rules in order | None |
| `cless rules test <file>` | Test which rule matches a given file | None |
| `cless config validate` | Validate configuration file syntax and semantics | None |
| `cless version` | Display version, commit, and build date | None |

Global flags applicable to all commands:
- `--config <path>`: Specify an alternative configuration file location.
- `-v, --verbose`: Enable detailed debug logging.
- `--no-color`: Disable ANSI colored terminal output.

---

## Safety Guarantees

ClutterLess Organizer is constructed around strict data integrity guarantees:

1. **Never Overwrites:** If a file with the destination name already exists, `cless` appends an incremental counter `file (1).ext` unless the rule or conflict strategy specifies skipping.
2. **Never Deletes Without Verification:** File deletions are prohibited across the engine. In cross-drive moves where atomic rename is not supported by the OS, `cless` copies the file to a temporary file at the target, flushes data to physical storage with `fsync`, verifies the exact byte size, renames the temporary file into place, and only then deletes the original source. If any check fails, the temporary file is removed and the source file remains untouched.
3. **Safe Watch Timing:** In `watch` mode, files are only processed once their size and modification timestamps remain static for `stable_after_seconds` seconds. Files actively being written or downloaded (such as `.crdownload` or `.part` files) are ignored until complete and stable.
4. **Non-Destructive Dry Run:** Running any operation with `--dry-run` performs pure in-memory planning without altering the filesystem.
5. **Reversible Moves:** Move operations are recorded in an append-only JSON Lines transaction log (`history.jsonl`). Reverting moves with `cless undo` returns files to their original locations while verifying target occupancy to prevent conflicts.

---

## Autostart on System Login

To have `cless watch` start automatically when you log into your system without opening a visible terminal window:
- **Windows:** Task Scheduler (`schtasks`) or Startup folder VBScript launcher.
- **Linux:** Rootless user systemd service (`systemd --user`).
- **macOS:** User launchd Agent (`launchctl`).

Refer to the complete configuration instructions in [docs/AUTOSTART.md](docs/AUTOSTART.md).

---

## Contributing

Contributions, bug reports, and suggestions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) for development workflows, testing guidelines, and commit standards. For security issues, refer to [SECURITY.md](SECURITY.md).

---

## License

ClutterLess Organizer is free software: you can redistribute it and/or modify it under the terms of the **GNU Affero General Public License** as published by the Free Software Foundation, version 3 of the License (`AGPL-3.0-only`). See [LICENSE](LICENSE) for details.

Third-party dependencies and their respective licenses are documented in [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).
