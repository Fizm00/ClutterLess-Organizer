# Changelog

All notable changes to ClutterLess Organizer (`cless`) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-29

### Added
- **ClutterLess Desktop GUI (`cless-gui`):**
  - Brand new cross-platform desktop application built with Wails v3, React, TypeScript, and an official neutral shadcn/ui design on Tailwind CSS v4.
  - Interactive file organization preview sheet with per-file checkboxes, destination previews, and live run progress.
  - Complete Activity view with transaction batches, batch-level and file-level status badges, and safe one-click undo rollback.
  - Visual Rules editor with drag-and-drop and keyboard reordering (Alt+Up/Down), multi-criteria condition builder, dynamic path template insertion chips, and live syntax validation matching the CLI.
  - Real-time Rule Tester for rapid evaluation of arbitrary filenames against active configurations.
  - Watched Folders screen with folder browser dialog and recursive scanning controls.
  - System tray integration with live watcher status dots (active, paused, error), close-to-tray mode, single instance forwarding, and native desktop notifications.
  - Comprehensive Settings screen with Dark/Light/System theme switcher, write stability delay, conflict resolution strategy, and configuration management.
  - Per-user Windows NSIS installer (`cless-gui_1.0.0_windows_amd64_installer.exe`) with Start Menu shortcut, WebView2 bootstrapper detection, opt-in "Start with Windows" checkbox, and clean uninstaller preserving user data unless explicitly confirmed.
  - Multi-platform CI and GitHub release pipelines for Windows, Linux, and macOS.

## [0.3.0] - 2026-10-28

### Added
- **Uninstall Capabilities:**
  - Added native `cless uninstall` command with interactive confirmation or non-interactive `-y/--yes` flag and optional `--purge-config` flag.
  - Added dedicated one-line Windows uninstaller script (`uninstall.ps1`) that gracefully stops running instances, removes the binary directory, and removes `cless` from User `PATH`.
  - Added dedicated one-line Linux/macOS uninstaller script (`uninstall.sh`) with multi-user permissions handling and optional config purging via `CLESS_PURGE_CONFIG=1`.
- **Intelligent Release Resolution in Installers:**
  - Updated `install.ps1` and `install.sh` to default to `latest` release tag.
  - Implemented GitHub 302 redirect inspection (`/releases/latest`) to avoid unauthenticated GitHub API rate limits.
  - Added custom version override support via `$env:CLESS_VERSION` or script parameter.
  - Added helpful next-steps guidance pointing users to `cless help`.
- **Substantially Expanded Default Rule Sets:**
  - **Invoices & Finance:** Auto-detects Indonesian and English financial keywords (`invoice`, `faktur`, `receipt`, `kwitansi`, `struk`, `bukti.transfer`, `pembayaran`, `tagihan`) -> `~/Documents/Finance/{year}-{month}`.
  - **Images:** Expanded to `jpg, jpeg, png, gif, webp, bmp, svg, ico, tiff, tif, heic` -> `~/Pictures/Sorted/{year}`.
  - **Videos:** Added dedicated video organization (`mp4, mkv, mov, avi, wmv, flv, webm, m4v`) -> `~/Videos/Sorted/{year}`.
  - **Audio:** Added dedicated music and audio organization (`mp3, wav, flac, aac, ogg, m4a, wma, opus`) -> `~/Music/Sorted/{year}`.
  - **Documents:** Expanded with presentation and data tables (`pdf, docx, doc, xlsx, xls, pptx, ppt, txt, md, rtf, odt, ods, odp, csv, tsv`) -> `~/Documents/Inbox/{ext}`.
  - **Books:** Added digital reading category (`epub, mobi, azw3, djvu, cbr, cbz`) -> `~/Documents/Books`.
  - **Data & Config:** Added structured data category (`json, xml, yaml, yml, toml, sql, sqlite, db`) -> `~/Documents/Data/{ext}`.
  - **Creative & 3D:** Added 3D modeling and digital design assets (`blend, fbx, obj, stl, gltf, glb, dae, 3ds, psd, ai, xd, fig`) -> `~/Documents/Creative_Assets`.
  - **Installers:** Expanded installer packages (`exe, msi, dmg, deb, pkg, rpm, appimage, apk, iso`) -> `~/Downloads/_Installers`.
  - **Archives:** Removed size constraint to sort all compressed packages (`zip, rar, 7z, tar, gz, bz2, xz, tgz`) -> `~/Downloads/_Archives`.
  - **Old Files:** Re-organize files untouched for over 90 days (`older_than: 90d`) -> `~/Downloads/_Old`.
- **Exhaustive Documentation:**
  - Overhauled `README.md` with full badges, installation, uninstallation, detailed file category tables, command references, and architecture guides.

## [0.2.0] - 2026-10-28

### Added
- **Interactive Terminal UI:**
  - Animated braille spinner (`⠋`, `⠙`, `⠹`...) during scan and planning phase.
  - ANSI-styled status badges (`[MOVE]`, `[DRY-RUN]`, `[SKIP]`, `[UNMATCHED]`, `[FAIL]`) with full `--no-color` and `NO_COLOR` environment support.
  - Fully-framed execution summary box displaying duration and metrics with precise ANSI-aware cell padding.
  - Live pulse indicator (`● Watching...`) in continuous watch mode.
- **Rich Categorized Help (`cless help`, `cless`):**
  - Custom ASCII banner logo with categorized command groups (Core, Folder Management, Configuration, System).
  - Quick-start practical examples section for fast onboarding.
- **Folder Management CLI:**
  - `cless folder list`: inspect watched directories and their expansions.
  - `cless folder add <path> [-r, --recursive]`: dynamically add watch folders directly to `config.yaml` while preserving comments.
  - `cless folder remove <path>`: dynamically remove folders from the watch list.
- **Config Helper Commands:**
  - `cless config edit`: opens `config.yaml` directly in the user's default text editor (`notepad.exe` or `$EDITOR`).
  - `cless config path`: prints active configuration file path.
- **Targeted Watch Flag:**
  - Added `--dir <path>` flag to `cless watch` matching `cless run --dir`.

### Changed
- Default watch target is now strictly `~/Downloads` only (Desktop removed from default to protect desktop icons).
- Added `.lnk` and `.url` shortcuts to default `ignore_ext` list.
- Fixed Darwin/Linux cross-compilation errors for Windows-specific error constants.

## [0.1.0] - 2026-10-28

### Added
- **Core CLI:** Subcommands `init`, `run`, `watch`, `undo`, `history`, `rules list`, `rules test`, `config validate`, and `version`.
- **Flexible Matchers:** Filter files by lowercase extension, glob patterns, case-insensitive regex, file size boundaries (`500KB`, `2GB`), and file age (`30d`, `2w`).
- **Mover & Safety Guarantees:**
  - Conflict resolution using automatic counter suffix (`file (1).ext`) or skip mode.
  - Zero overwrites and zero deletions of untransferred files.
  - Cross-volume fallback for moves across different drives/volumes (copy, fsync, verify size, atomic rename, and verified source cleanup).
  - Retry with exponential backoff for locked Windows files.
  - Dry-run mode (`--dry-run`) with zero side effects.
- **Move History & Undo:**
  - Append-only JSON Lines history logging for every successful move.
  - Batch tracking with granular rollback (`cless undo`).
  - Safe restoration without overwriting existing files at the original location.
- **Continuous Watch Mode:**
  - Real-time directory monitoring powered by `fsnotify`.
  - Configurable debounce and file write stability checking (`stable_after_seconds`).
  - Dynamic subdirectory discovery in recursive watch mode while automatically excluding rule destination folders to prevent endless loops.
  - Single worker processing queue with time-window batch grouping for intuitive bulk undos.
  - Graceful termination on SIGINT (Ctrl+C) and SIGTERM.
- **Platform Polish:**
  - Windows Known Folder API integration (`SHGetKnownFolderPath`) with automatic OneDrive redirection support.
  - Linux XDG user directory resolution (`~/.config/user-dirs.dirs`).
  - Windows file attribute detection for hidden and system files (`FILE_ATTRIBUTE_HIDDEN`, `FILE_ATTRIBUTE_SYSTEM`).
  - Windows 260 MAX_PATH validation and sanitization of reserved device names (`CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9`).
- **Documentation & Release Automation:**
  - Complete autostart documentation for Windows Task Scheduler, Linux systemd, and macOS launchd.
  - Multi-OS GitHub Actions workflow and GoReleaser pipeline for Windows, Linux, and macOS (amd64 and arm64).
