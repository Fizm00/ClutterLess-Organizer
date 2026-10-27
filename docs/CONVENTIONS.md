# CONVENTIONS

## Go style

- Follow standard Go style; run `gofmt` and `go vet`.
- Small packages, small functions, clear names. Exported identifiers have doc comments.
- Errors: return errors, wrap with `fmt.Errorf("context: %w", err)`. No panics for expected failures. Define sentinel/typed errors where callers need to branch (e.g. `ErrLocked`, `ErrCrossDevice`).
- Pass `context.Context` as first arg to anything long-running (watcher, copy).
- No global mutable state. Inject dependencies (clock, filesystem helpers) when needed for tests.
- Logging with `log/slog`; structured key/values. The engine logs at debug/warn only; user-facing output belongs to `cli`.
- Keep `cmd/organizer/main.go` tiny: wire and call `cli.Execute()`.

## Testing

- Table-driven tests where natural.
- Use `t.TempDir()`; **never** touch real Downloads/Desktop or home.
- Test names describe behavior: `TestMover_RenamesOnConflict`.
- Cover: matcher edge cases (case, no extension, double extension like `.tar.gz`), conflict naming, dry-run no side effects, undo with occupied source, config validation errors.
- Time-dependent logic (`older_than`, `{year}`) takes a clock/`time.Time` argument for determinism.

## Windows gotchas (must handle)

1. **Case-insensitive FS**: normalize extensions to lowercase for matching.
2. **Locked files**: moving a file open in another process fails; retry with backoff, then skip.
3. **Cross-drive moves**: `os.Rename` fails across volumes; use copy+verify+delete.
4. **Path length**: be aware of 260-char limit; surface a clear error rather than failing obscurely.
5. **Reserved names** (`CON`, `NUL`, ...) and illegal chars in rendered template paths: sanitize template output.
6. **Redirected known folders** (OneDrive Desktop/Documents): do not hardcode `C:\Users\X\Downloads`; use config paths and known-folder lookup in `internal/platform`.
7. **Hidden/system attribute**: respect `ignore_hidden` using the Windows file attribute, not only a leading dot.
8. **Path separators**: always `filepath.Join`; display paths with the OS separator.

## Safety rules (repeat of AGENT.md essentials)

- No overwrite. No delete (except verified copy-then-delete for cross-drive).
- History written for every real move. Dry-run writes nothing.
- A destination folder inside a recursively watched folder must be excluded from scanning.

## Commits

Conventional Commits: `feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`.
One logical change per commit.

## Licensing

- Project is AGPL-3.0. Include the full `LICENSE`.
- Add SPDX header to each Go file: `// SPDX-License-Identifier: AGPL-3.0-only`.
- Before adding a dependency, verify its license is AGPL-compatible.
