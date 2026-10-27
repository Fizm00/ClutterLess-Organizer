# ROADMAP

Update the Status column at the end of every phase.

| Phase | Name | Outcome | Status |
|---|---|---|---|
| 0 | Bootstrap | Repo skeleton, `go.mod`, cobra root, `version`, LICENSE, CI build | DONE |
| 1 | Config & Rules | YAML load/validate, matcher, planner (read-only), `rules list/test`, `config validate`, `init` | DONE |
| 2 | Mover & Run | Safe move, conflict rename, cross-drive fallback, retry, `run`, `--dry-run` | DONE |
| 3 | History & Undo | JSONL history, batches, `history`, `undo` | TODO |
| 4 | Watch | fsnotify watcher, stability check, debounce, `watch` | TODO |
| 5 | Platform polish | Windows known folders, hidden attr, locked-file handling, Linux/macOS verification, autostart docs | TODO |
| 6 | Release | goreleaser, GitHub Actions, README, usage docs, v0.1.0 | TODO |
| 7 | GUI (future) | Wails or Fyne GUI over existing engine | LATER |

## Phase details and acceptance criteria

### Phase 0: Bootstrap
- `go build ./...` works; `organizer version` prints version info.
- Layout matches `AGENT.md`. AGPL-3.0 `LICENSE` present. SPDX headers added.
- CI workflow builds and tests on Windows, Linux, macOS.

### Phase 1: Config & Rules
- `organizer init` writes the default config from `CONFIG_SPEC.md`.
- `config validate` reports precise errors.
- `rules test <file>` shows the matching rule and resolved destination.
- Matcher unit tests cover ext (case, `.tar.gz`), glob, regex, size, age, AND semantics, first-match-wins.
- Nothing moves files yet.

### Phase 2: Mover & Run
- `run` organizes existing files; `--dry-run` has zero side effects (tested).
- Conflict never overwrites (tested).
- Cross-drive fallback implemented and unit-tested via an injectable rename function.
- Locked-file retry then skip, with warning.
- Summary output with counts.

### Phase 3: History & Undo
- Each real move recorded with `batch_id`.
- `undo` restores the last batch; handles occupied source and missing dest.
- `history` lists batches.

### Phase 4: Watch
- New files are moved only after stable for `stable_after_seconds`.
- Temp extensions ignored; duplicate events debounced.
- Graceful shutdown on Ctrl+C.

### Phase 5: Platform polish
- Windows hidden-attribute check, known-folder defaults, path sanitizing.
- Linux and macOS builds verified; platform-specific tests behind build tags.
- Docs for autostart: Task Scheduler / Startup folder (Windows), systemd user unit (Linux), launchd plist (macOS).

### Phase 6: Release
- goreleaser config; tagged release produces binaries for all three OS.
- README with install, quickstart, config reference, safety notes, AGPL notice.

### Phase 7: GUI (future, do not start before 0-6 done)
- Decide Wails vs Fyne. Reuse engine, config, history. Out of scope for now.

## Open questions (fill in as they come up)

- Final project/binary name and Go module path.
- Should `run` ask for confirmation by default?
- Subfolder handling when `recursive: true` (flatten vs preserve structure).
