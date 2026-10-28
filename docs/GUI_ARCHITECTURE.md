# GUI_ARCHITECTURE

The existing CLI architecture (`docs/ARCHITECTURE.md`) is unchanged. The GUI is a second front end over the same engine.

## 1. Principles

- **No business logic in the frontend and none in the Wails bootstrap.** The frontend renders state and sends intents. All decisions (matching, planning, moving, undoing) happen in Go through the existing packages.
- **A testable service layer.** `internal/app` exposes plain Go services with no Wails imports. They are unit-tested without a window. Wails only wraps them.
- **Engine stays UI-agnostic.** If the engine lacks progress callbacks or structured results needed by the GUI, add them to the engine in a backwards-compatible way (CLI behavior and tests must not change).
- **The same safety rules apply.** All constraints in `AGENT.md` section 2 (never delete, never overwrite, every move logged, dry-run is side-effect free) hold for every GUI code path.

## 2. Layout (same Go module as the CLI)

```
cmd/cless/                    # existing CLI (unchanged)
cmd/cless-gui/
├── main.go                   # Wails bootstrap only: create app, register services, windows, tray
├── frontend/                 # React + TS + Vite app (embedded at build)
│   ├── src/
│   │   ├── api/              # typed wrapper over generated bindings + mock implementation
│   │   ├── components/       # design-system components (DESIGN.md section 6)
│   │   ├── screens/          # Overview, Activity, Rules, Folders, Settings, Onboarding
│   │   ├── state/            # Zustand stores, event subscriptions
│   │   ├── i18n/             # en.ts (id.ts later)
│   │   └── styles/           # tokens.css, base.css, fonts
│   └── package.json
├── build/                    # icons, installer assets, platform manifests
internal/app/                 # service layer (no Wails imports)
├── config_service.go
├── rules_service.go
├── organize_service.go       # Preview, Run
├── history_service.go        # Batches, Batch, Undo
├── watch_service.go          # Start, Stop, Status + event emission
├── system_service.go         # PickFolder, OpenPath, Autostart, Version
├── events.go                 # event names + payload types
├── dto.go                    # JSON-friendly types exposed to the frontend
└── errors.go                 # typed errors with code, message, hint
```

If Wails v3 scaffolding dictates a slightly different layout, keep the separation: bootstrap in `cmd/cless-gui`, everything else in `internal/app`, and record the deviation in this file.

## 3. Services (Go -> TypeScript)

Bound via Wails generated bindings. DTOs are plain structs with JSON tags; no `time.Time` pointers or `regexp` types cross the boundary (use RFC3339 strings and raw strings).

| Service | Methods (sketch) |
|---|---|
| `ConfigService` | `Get() Config`, `Validate(Config) []ValidationError`, `Save(Config) error` (backs up to `config.yaml.bak`, preserves comments best-effort via the yaml.v3 Node API), `Path() string`, `ResetToDefaults()` |
| `RulesService` | `List() []Rule`, `Upsert(Rule)`, `Delete(name)`, `Reorder([]name)`, `Test(filename string) RuleTestResult` |
| `OrganizeService` | `Preview(PreviewOptions) Plan`, `Run(RunRequest{PlanID or selected sources}) RunResult` (emits progress events) |
| `HistoryService` | `Batches(limit, filter) []Batch`, `Batch(id) BatchDetail`, `UndoPreview(id) Plan`, `Undo(id) UndoResult` |
| `WatchService` | `Start()`, `Stop()`, `Status() WatchStatus` |
| `SystemService` | `PickFolder() string`, `RevealPath(path)`, `OpenConfig()`, `Autostart.Get/Set`, `Version() VersionInfo`, `Theme` helpers if needed |

`Preview` returns a `Plan` with stable IDs per planned move; `Run` executes only the IDs the user left checked. Re-validate at execution time (the file may have changed since preview) and report per-file outcomes.

## 4. Events (Go -> frontend)

| Event | Payload | Emitted when |
|---|---|---|
| `watch:status` | `{running, folders[], error?}` | Watcher started, stopped, or failed |
| `file:moved` | `MoveRecord` + `batchId` | A file was moved (watch or run) |
| `file:skipped` | `{path, reason}` | Skipped (unstable, conflict=skip, ignored by rule) |
| `file:failed` | `{path, error}` | Move failed after retries |
| `run:progress` | `{done, total}` | During `Run` |
| `config:changed` | `{path}` | Config file changed on disk or saved |
| `app:error` | `AppError` | Non-recoverable error to surface in UI |

Frontend subscribes in one place (`state/events.ts`) and updates stores; components never subscribe directly.

## 5. Concurrency and shared state

- **One watcher owner.** The watcher runs inside the GUI process under `WatchService`. A lock file in the state directory (`watcher.lock`, containing PID and start time) prevents the GUI watcher and `cless watch` from running simultaneously. If the lock is held by a live process, `WatchService.Start` returns a typed error `WATCHER_ALREADY_RUNNING` and the UI shows the banner from `DESIGN.md` 7.10. Stale locks (dead PID) are replaced.
- **Single GUI instance.** Second launch focuses the existing window (Wails single-instance support, or a named lock/IPC fallback).
- **History file** is append-only JSONL shared with the CLI. Writes use one `write` per record; undo marks records via the existing history API. GUI and CLI may both read it at any time.
- **Config reload.** `ConfigService.Save` triggers a watcher reload without restarting the process. External edits to `config.yaml` are detected (fsnotify on the file) and emit `config:changed`; the UI shows a non-blocking toast "Config changed on disk. Reloaded." If the new config is invalid, keep the last valid config running and show the error banner.
- **Long operations** (`Run` on thousands of files) run in goroutines with context cancellation; the UI stays responsive and `Cancel` is available.

## 6. Error model

All service errors return a typed `AppError{Code, Message, Hint, Details}` serializable to the frontend. Codes are stable strings (`CONFIG_INVALID`, `WATCHER_ALREADY_RUNNING`, `FILE_LOCKED`, `PERMISSION_DENIED`, `PATH_TOO_LONG`, `UNDO_SOURCE_OCCUPIED`, ...). The frontend maps codes to copy via the i18n dictionary and falls back to `Message`.

## 7. Frontend structure rules

- `api/` is the only place that imports generated bindings. It exports a typed `api` object. A **mock implementation** (`api/mock.ts`, realistic sample data including edge cases like 70-char filenames) is selected when running the frontend in a plain browser (`npm run dev:mock`), so screens can be built and screenshot-tested without the Go runtime.
- State: Zustand stores per domain (`watchStore`, `activityStore`, `rulesStore`, `settingsStore`). No global mutable singletons outside stores.
- Styling: Tailwind CSS v4 with a locked `@theme` block where all defaults are cleared (`--color-*: initial`, `--radius-*: initial`, etc.) and populated strictly with `DESIGN.md` and shadcn/ui semantic tokens. Arbitrary values (`bg-[#...]`, `p-[...]`) are strictly forbidden and enforced by ESLint. Component primitives in `frontend/src/components/` follow the **shadcn/ui ("New York" style)** pattern (Radix headless primitives + `class-variance-authority` + `cn()` helper in `src/lib/utils.ts`); screens only compose them. Heavy monolithic component kits (MUI, Chakra, Mantine) remain strictly banned.
- Components are presentational; screens compose them and talk to stores.
- Tests: Vitest + Testing Library for components and stores; Go tests for `internal/app`; Playwright (dev dependency) against the mock build for screenshots and keyboard-navigation checks.

## 8. Approved dependencies (GUI)

Go: `github.com/wailsapp/wails/v3` (and its transitive deps). Anything else: ask first.

Frontend: `react`, `react-dom`, `typescript`, `vite`, `@vitejs/plugin-react`, `tailwindcss`, `@tailwindcss/vite`, `clsx`, `tailwind-merge`, `class-variance-authority`, `zustand`, `lucide-react`, `@radix-ui/react-dialog`, `-dropdown-menu`, `-tooltip`, `-switch`, `-tabs`, `-popover`, `-select`, `-checkbox`, `@dnd-kit/core`, `@dnd-kit/sortable` (Phase G5 only), `@fontsource-variable/inter`, `@fontsource-variable/jetbrains-mono`; dev: `vitest`, `@testing-library/react`, `jsdom`, `playwright`, `eslint`, `prettier`. Anything else: ask first. Heavy monolithic component kits (MUI, Chakra, Mantine), CSS-in-JS runtimes, or animation libraries remain strictly banned.

## 9. Build and release notes

- Dev: `wails3 dev` (hot reload). Browser-only UI work: `npm run dev:mock` inside `cmd/cless-gui/frontend`.
- Build: `wails3 build` produces `cless-gui(.exe)`. Windows installer via NSIS (Wails template) in Phase G8. CI builds the GUI on Windows, Linux, macOS; Linux needs webkit2gtk dev packages.
- Versioning: GUI and CLI share the version number; the GUI About screen shows version, commit, build date from the same ldflags.

## 10. Desktop Integration & CLI Flags

The GUI executable (`cless-gui`) supports command-line flags for system integration and background startup:

| Flag | Type | Description |
|---|---|---|
| `--hidden` | boolean | Launch the application minimized directly into the system tray without displaying the main window. Used by autostart entries. |
| `--config <path>` | string | Specify a custom path to `config.yaml` instead of the default operating system config path. |

### System Integration Summary
- **System Tray:** Monochrome template icons (`tray_active.png`, `tray_paused.png`, `tray_error.png`) reflecting live watcher status. Left-click restores and focuses the window. Context menu provides status line, quick pause/resume, organize now, and quit.
- **Close-to-Tray:** Window close button hides the window to the tray when enabled (default active). First-time minimize displays a discrete toast notification: *"Still running in the tray."* Real termination occurs via Tray -> Quit or `Ctrl+Q`.
- **Single Instance:** Subsequent launches automatically forward focus to the existing window instance without spawning duplicate processes.
- **Autostart:** Rootless per-user autostart (`HKCU\Software\Microsoft\Windows\CurrentVersion\Run` on Windows; `~/.config/autostart/*.desktop` on Linux; `~/Library/LaunchAgents/*.plist` on macOS). Always launches with `--hidden`.
- **Native Notifications:** Debounced notification aggregator coalesces rapid file moves into summaries (e.g. *"12 files organized from Downloads"*). Notifications are suppressed while the main window is focused.

