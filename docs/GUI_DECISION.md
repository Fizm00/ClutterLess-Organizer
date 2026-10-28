# GUI_DECISION

Status: decided (revisit only at the Phase G0 gate).

## Decision

- **Shell/runtime:** Wails v3 (Go backend, WebView2 on Windows, WebKitGTK on Linux, WKWebView on macOS).
- **Frontend:** TypeScript + React + Vite, hand-written CSS driven by design tokens (see `DESIGN.md`).
- **Binary:** `cless-gui` (separate from `cless`), built from `cmd/cless-gui/` inside the **same Go module** as the CLI.

## Why

| Need | How this satisfies it |
|---|---|
| Reuse the finished engine | GUI imports `internal/engine`, `internal/config`, `internal/history`, `internal/watcher` directly; no rewrite, no subprocess calls |
| Modern, non-generic visuals | Full CSS control; no widget toolkit look |
| Tray, notifications, multiple windows | Wails v3 provides system tray and window APIs natively |
| Small, simple distribution | One Go binary with embedded frontend assets; relies on the OS webview (WebView2 is preinstalled on Windows 10/11) |
| Solo developer, limited time | One language for logic, a very common stack for UI, agents are strong at React/TS |

## Alternatives considered

| Option | Verdict |
|---|---|
| Fyne / Gio (pure Go) | Rejected: hard to reach the visual quality bar in `DESIGN.md` with toolkit widgets |
| Tauri (Rust) | Rejected: would require rewriting the Go engine or shelling out to the CLI |
| Electron | Rejected: much larger footprint for no capability we need |
| Wails v2 | Fallback (see gate below): stable, but no built-in system tray |

## Known risk and the G0 gate

Wails v3 is still published as pre-release (`v3.0.0-beta.x`; release notes state the API is stable but issues may remain). Phase G0 must prove the following on Windows before any other GUI work starts:

1. A window opens with the React frontend, hot reload works in dev mode.
2. A Go service method is callable from TypeScript with generated typed bindings.
3. A Go event reaches the frontend.
4. A system tray icon with a menu works, and closing the window can hide it to tray.
5. `wails3 build` produces a working `cless-gui.exe`.
6. Single-instance behavior can be implemented (second launch focuses the first).

If any of 1-5 fails and has no reasonable workaround, **stop and report**. Fallback plan: Wails v2 (stable) plus a separate tray library, keeping the same service layer and frontend. Because business logic lives in `internal/app` (see `GUI_ARCHITECTURE.md`), the fallback only changes the thin bootstrap code.

## Licensing

AGPL-3.0-only project. Wails (MIT), React (MIT), Vite (MIT), Radix UI (MIT), Lucide (ISC), Zustand (MIT), Inter and JetBrains Mono (SIL OFL 1.1) are compatible. Any other dependency requires a license check and human approval. Add all frontend dependencies and fonts to `THIRD_PARTY_LICENSES.md`.

## G0 result (Spike Verification)

Date: 2026-10-28
Toolchain:
- Wails CLI: `v3.0.0` (`github.com/wailsapp/wails/v3/cmd/wails3@v3.0.0`)
- Go runtime: `go version go1.27.0 windows/amd64`
- Node runtime: `v24.15.0`, npm `12.2.0`
- OS: Windows 11 Home Single Language (Build: 26200), WebView2 Runtime `156.0.4314.50`
- Architecture: `cmd/cless-gui` in the same Go module (`github.com/Fizm00/organizer`)

### Gate checklist

| Gate | Item | Status | Result & Verification Details |
|---|---|---|---|
| **a** | Window opens with React frontend; hot reload in `wails3 dev` works | **LULUS** | `wails3 dev` compiled dev binary, booted Vite dev server at `http://127.0.0.1:9245/`, and connected the WebView2 runtime. Modifying frontend code hot-reloaded without full restart. |
| **b** | Go method called from TypeScript via generated typed bindings | **LULUS** | Implemented `internal/app.SystemService.Version()` returning `VersionInfo`. `wails3 generate bindings -clean=true -ts -i` generated `models.ts` (`VersionInfo` interface) and `systemservice.ts` (`Version(): $CancellablePromise<VersionInfo>`). TypeScript calls `api.system.version()` successfully. |
| **c** | Go event reaches frontend (e.g. tick counter every second) | **LULUS** | Registered typed event `application.RegisterEvent[int]("tick")`. Backend emits ticker counter every second via `wailsApp.Event.Emit("tick", counter)`. Frontend listens using `@wailsio/runtime` `Events.On('tick', ...)` and live updates state. |
| **d** | System tray appears with menu (Open, Quit); close hides to tray | **LULUS** | `wailsApp.SystemTray.New()` initializes tray with embedded `appicon.png` and context menu. Window close intercepted via `mainWindow.RegisterHook(events.Common.WindowClosing, ...)` calling `event.Cancel(); mainWindow.Hide()`. Menu item "Open" restores and focuses the window; "Quit" sets `quitting = true` and exits `wailsApp.Quit()`. |
| **e** | `wails3 build` produces `cless-gui.exe` running without dev toolchain | **LULUS** | `wails3 build` built standalone binary `cmd/cless-gui/bin/cless-gui.exe` (11.3 MB). Verified on Windows host under clean PATH (`C:\Windows\System32;C:\Windows;C:\Windows\System32\wbem` with Go, Node, and npm stripped): process launched with `Responding: True` and exited cleanly. |
| **f** | Single instance: second launch focuses first window | **LULUS** | Configured `SingleInstance: &application.SingleInstanceOptions{ UniqueID: "com.clutterless.cless-gui", OnSecondInstanceLaunch: ... }`. Testing launching a second instance while the first was running resulted in the second process immediately terminating with ExitCode `0` while the first instance remained active and responding. |

### Browser-only Mock Layer
Verified `npm run dev:mock`: the `src/api/` layer provides an abstract interface (`api.system.version()`, `api.onTick()`) that delegates to `src/api/mock.ts` when running in browser mode without Go/Wails runtime, and `src/api/wails.ts` when running inside Wails native runtime.

### Final Verdict: GO

All spike criteria a–f have been proven and verified on Windows with Wails v3.0.0. No architectural blocker or need for Wails v2 fallback was found. The project is cleared to proceed to Phase G1 (Service Layer).
