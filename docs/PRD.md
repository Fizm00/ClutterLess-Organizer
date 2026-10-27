# PRD — Smart Local File Organizer & Automator

## 1. Problem

Folders like `Downloads` and `Desktop` fill up with unsorted files. Users waste time sorting manually or never do. Existing tools are either heavy GUIs, paid, or not rule-driven.

## 2. Product

A lightweight, open-source (AGPL-3.0) CLI tool that watches chosen folders and automatically moves files into sub-folders according to user-defined rules. Safe by design: dry-run, no overwrites, full undo.

## 3. Target user

Individual power users and developers, Windows first, who are comfortable editing a YAML file and running a CLI.

## 4. Goals

- G1: Rapidly tidy a folder with `organizer run`.
- G2: Continuously tidy with `organizer watch`.
- G3: Users trust it: `--dry-run` shows exactly what would happen; `undo` reverses it.
- G4: One small binary per OS, no runtime, no Docker.
- G5: Core engine reusable by a future GUI.

## 5. Non-goals (for now)

- No GUI (later phase, only after CLI is stable).
- No cloud sync, no network features, no telemetry.
- No deleting, compressing, or modifying file contents.
- No content-based classification (AI/ML, OCR) in v1.
- No Docker image.

## 6. Core features (v1)

| ID | Feature | Phase |
|---|---|---|
| F1 | YAML config with rules | 1 |
| F2 | Rule matching by extension, name glob/regex, size, age | 1 |
| F3 | One-shot organize (`run`) | 2 |
| F4 | Conflict-safe moving, cross-drive fallback | 2 |
| F5 | Dry-run | 2 |
| F6 | Move history + `undo` | 3 |
| F7 | Continuous watching with debounce | 4 |
| F8 | Windows polish, cross-platform checks, autostart docs | 5 |
| F9 | Release pipeline, README | 6 |
| F10 | GUI | 7 (future) |

## 7. Success criteria

- Fresh user can go from download to working setup in under 5 minutes using `organizer init`.
- No data loss in any tested scenario (conflicts, locked files, cross-drive, interrupted runs).
- Works on Windows 10/11 first; builds on Linux and macOS.

## 8. Risks

| Risk | Mitigation |
|---|---|
| Moving half-downloaded files | Ignore temp extensions + size-stability check |
| Locked files on Windows | Retry with backoff, then skip and log |
| Cross-drive rename fails | Copy, verify size, then delete source |
| Redirected folders (OneDrive) | Config paths, not hardcoded defaults; resolve known folders on Windows |
| User distrust | Dry-run, undo, clear logs |
