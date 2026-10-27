# ARCHITECTURE

## 1. Principles

- `engine` is pure logic and I/O on files. No CLI, no printing, no global state.
- Layers depend downward only: `cli → engine/watcher/history/config`. `engine` must not import `cli`.
- Plan first, execute second: the engine produces a **Plan** (list of intended moves). Executing a plan is a separate step. Dry-run = build plan and stop.
- Everything that touches the filesystem is behind small interfaces where it helps testing.

## 2. Packages

### `internal/config`
Load YAML, apply defaults, validate, expand `~` and env vars, compile regexes.
Exposes `Config`, `Load(path)`, `Default()`, `Validate()`.

### `internal/engine`
- `Rule`, `Matcher`: decide which rule matches a file (first match wins).
- `Planner`: given a directory (or single file) and rules, returns `[]PlannedMove`.
- `Mover`: executes a `PlannedMove` safely (conflict rename, cross-drive fallback, retry on locked files).
- `Organizer`: orchestrates plan + execute + history recording.

### `internal/watcher`
fsnotify wrapper. Emits "file ready" events only after:
1. the file is not an ignored/temp extension, and
2. size and mtime are unchanged for `stable_after_seconds`.
Handles Create and Rename-into events. Debounces duplicates.

### `internal/history`
Append-only JSON Lines log. Each move = one record with a `batch_id`.
Supports `Append`, `LastBatch`, `Batches`, `Undo(batchID)`.

### `internal/platform`
OS-specific code behind build tags: known-folder lookup (Windows), default config/state dirs, file-lock error detection.

### `internal/cli`
Cobra commands. Parse flags, call engine/watcher/history, format output. No business logic.

## 3. Core types (sketch, adapt as needed)

```go
type Rule struct {
    Name   string
    Match  Match
    MoveTo string // may contain template vars, see CONFIG_SPEC
}

type Match struct {
    Ext        []string       // lowercase, no dot
    NameGlob   []string
    NameRegex  *regexp.Regexp
    MinSize    *int64         // bytes
    MaxSize    *int64
    OlderThan  *time.Duration
}

type PlannedMove struct {
    Source   string
    Dest     string // final destination (conflict already resolved at plan time or exec time)
    RuleName string
    Skipped  bool   // true if intentionally skipped
    Reason   string // why skipped or why matched
}

type MoveRecord struct {
    BatchID   string
    Time      time.Time
    Source    string
    Dest      string
    Rule      string
    Size      int64
}
```

## 4. Data flow

```
run:    config → Planner(scan dir) → Plan → [dry-run? print : Mover.exec each] → history.Append
watch:  config → Watcher → (file ready) → Planner(single file) → Mover → history.Append
undo:   history.LastBatch → for each record reverse move (Dest→Source) → mark undone
```

## 5. Move algorithm (Mover)

1. Resolve final dest; create dest dir if missing (not in dry-run).
2. If dest exists → pick `name (1).ext`, `name (2).ext`, ...
3. Try `os.Rename`.
4. If it fails with cross-device error → copy to dest temp name, fsync, verify size, rename temp to final, then remove source.
5. If it fails with a locked/in-use error → retry with backoff (e.g. 3 tries: 500ms, 1s, 2s), then skip + log warning.
6. On success → return `MoveRecord` for history.

## 6. Concurrency

- `run`: sequential by default (simple, predictable).
- `watch`: one goroutine for fsnotify, one worker handling stable files via channel. Graceful shutdown on SIGINT/SIGTERM via `context.Context`.

## 7. Storage locations

| Item | Location |
|---|---|
| Config | `os.UserConfigDir()/organizer/config.yaml` (override `--config`) |
| History | `os.UserConfigDir()/organizer/history.jsonl` (or state dir) |
| Logs (watch mode) | stderr; optional `--log-file` |

## 8. Approved dependencies

`cobra`, `fsnotify`, `yaml.v3`. Anything else requires human approval.

## 9. Future GUI

A GUI (Wails or Fyne, decided later) will import `internal/engine`, `internal/config`, `internal/history`. To allow this, keep those packages free of CLI concerns. If external import is needed, move them out of `internal/` to `pkg/` at that time.
