# Changelog

All notable changes to ClutterLess Organizer (`cless`) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
