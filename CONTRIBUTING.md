# Contributing to ClutterLess Organizer (`cless`)

Thank you for your interest in contributing to ClutterLess Organizer!

## Development Guidelines

### Prerequisites
- Go 1.22+ (stable)
- Git

### Building Locally
```bash
# Build binary
go build -o bin/cless ./cmd/organizer

# Test version info
./bin/cless version
```

### Running Tests
```bash
# Run unit and integration tests
go test -v ./...

# Run race detector and vet
go vet ./...
go test -race ./...
```

### Dependency Policy
- The project is licensed under **AGPL-3.0**.
- Any new dependencies must use an AGPL-compatible permissive license (MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause).
- Adding new dependencies requires prior discussion and human approval.

### Commit Conventions
We follow the Conventional Commits specification:
- `feat:` New features
- `fix:` Bug fixes
- `test:` Test additions or refactoring
- `docs:` Documentation updates
- `refactor:` Code improvements without feature changes
- `chore:` Maintenance or build script updates

Keep commits focused on one logical change.
