# GUI_ROADMAP

Update the Status column at the end of every phase. The CLI roadmap (`docs/ROADMAP.md`) is complete and is not modified by GUI work, except for docs that must mention the GUI at release time.

| Phase | Name | Outcome | Status |
|---|---|---|---|
| G0 | Spike & scaffold | Wails v3 + React app runs on Windows; binding, event, tray, build verified; go/no-go gate | DONE |
| G1 | Service layer | `internal/app` services with tests, events, watcher lock; no UI | TODO |
| G2 | Design system & shell | Tokens, fonts, components, app shell, theming, `/styleguide` route, mock API | TODO |
| G3 | Overview & watch control | Overview screen, live activity, pause/resume, error banners | TODO |
| G4 | Preview, run, activity, undo | Preview sheet, run with progress, Activity screen, undo flow | TODO |
| G5 | Rules & folders | Rule list with reorder, rule editor, tester, folders screen | TODO |
| G6 | System integration | Tray, close-to-tray, single instance, autostart, notifications, onboarding | TODO |
| G7 | Settings & polish | Settings screen, a11y pass, edge states, performance, optional Indonesian strings | TODO |
| G8 | Packaging & release | Windows installer, CI for GUI, README and screenshots, release | TODO |

## Acceptance criteria

### G0
- Gate checklist from `GUI_DECISION.md` passes on Windows, with notes on any workaround.
- `cmd/cless-gui` builds in the same module; CLI build and tests unaffected.
- Written go/no-go note appended to `GUI_DECISION.md`.

### G1
- Every service method in `GUI_ARCHITECTURE.md` section 3 implemented and unit-tested without Wails.
- Events defined and emitted through an interface (`EventSink`) so tests can capture them.
- Watcher lock prevents two watchers; stale lock replaced.
- CLI behavior and tests unchanged.

### G2
- `tokens.css` matches `DESIGN.md` section 4 exactly; both themes.
- Components in section 6 implemented with keyboard and focus behavior; `/styleguide` route (mock build only) shows all components and states in both themes.
- App shell (sidebar, header, content) matches section 5. Visual QA checklist passes; screenshots committed.

### G3
- Overview matches 7.1 with live data and events; Pause/Resume works; banners from 7.10 for invalid config and watcher already running.

### G4
- Preview sheet (7.3), Run with progress and cancel, Activity (7.2) with batch grouping, filter, search, and undo flow with confirmation.
- Undo never overwrites; occupied sources renamed; missing destinations reported.

### G5
- Rules screen (7.4) with drag and keyboard reorder, enable/disable, duplicate, delete; editor (7.5) with live validation matching CLI messages; tester; Folders screen (7.6).
- Saving writes a valid `config.yaml`, creates `.bak`, reloads the watcher.

### G6
- Tray menu (7.9), close-to-tray option, single-instance, opt-in autostart (platform-correct), native notifications (opt-in), onboarding (7.8).

### G7
- Settings (7.7), full keyboard pass, screen-reader labels, error copy review against `DESIGN.md` section 8, 60+ char filename and 120+ char path handling, 5,000-row history performance (virtualized list), optional `id.ts`.

### G8
- Windows installer (NSIS) installs, launches, uninstalls cleanly; GUI build in CI for 3 OS; README gains a GUI section with real screenshots; release notes; third-party licenses updated.

## Open questions

- Custom title bar vs native frame (default: native).
- Code signing for the Windows installer (cost and process).
- Whether to merge `cless-gui` into the main release archive or ship separately (default: separate archive and installer).
