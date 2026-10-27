# CLI_SPEC

Binary: `organizer`. Framework: cobra.

## Global flags

| Flag | Meaning |
|---|---|
| `--config <path>` | Config file override |
| `-v, --verbose` | Debug logging |
| `--no-color` | Disable colored output |

## Commands

### `organizer init`
Create a default config at the default location. Refuses to overwrite unless `--force`.
Flags: `--force`, `--path <file>`.

### `organizer run`
Organize files that are currently in watched folders, once.

| Flag | Meaning |
|---|---|
| `--dry-run` | Print the plan; change nothing |
| `--dir <path>` | Organize this folder only (instead of config `watch`) |
| `--yes` | Skip confirmation prompt (if any) |

Output: one line per file: `[MOVE] Downloads\a.pdf -> Documents\Inbox\pdf\a.pdf (rule: Documents)`; skipped/unmatched lines in a distinct style; final summary: moved N, skipped N, unmatched N, failed N.

### `organizer watch`
Run continuously. Same as `run` for each newly stable file. Stops on Ctrl+C with a summary.
Flags: `--dry-run`, `--log-file <path>`, `--dir <path>`, `--initial-run`.

### `organizer folder list` (or `organizer folder`)
List all watched folders currently configured.

### `organizer folder add <path>`
Add a folder to the watched directories list in `config.yaml`.
Flags: `-r, --recursive`.

### `organizer folder remove <path>`
Remove a folder from the watched directories list in `config.yaml`.

### `organizer undo`
Reverse the last batch of moves.
Flags: `--batch <id>`, `--dry-run`.
Behavior: for each record, move Dest back to Source. If Source is occupied, rename (never overwrite). If Dest no longer exists, report and continue.

### `organizer history`
List recent batches (id, time, count). `--limit N`, `--batch <id>` shows details.

### `organizer rules list`
Print rules in order with their conditions and destinations.

### `organizer rules test <file>`
Show which rule would match the given file and where it would go. No changes.

### `organizer config validate`
Validate the config; print errors with rule name and field. Exit code non-zero on failure.

### `organizer config path`
Print the path to the active configuration file.

### `organizer config edit`
Open the configuration file in the user's default text editor (`$EDITOR` or `notepad.exe`).

### `organizer version`
Print version, commit, build date (injected via ldflags).

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | General error |
| 2 | Invalid config or usage |
| 3 | Partial failure (some moves failed) |

## Output conventions

- Human-readable by default. Add `--json` for machine-readable output on `run`, `history`, and `rules list` (can be added in a later phase).
- Errors go to stderr; normal output to stdout.
- Never print stack traces to the user; use `-v` for detail.
