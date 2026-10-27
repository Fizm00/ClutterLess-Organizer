# ClutterLess Organizer (`organizer` / `cless`)

A cross-platform CLI tool that acts as an automatic janitor for local files, watching cluttered folders (such as Downloads and Desktop) and organizing files into target directories based on user-defined rules with safe conflict handling and undo support.

## Status

**Work in Progress** — Currently in active development (Phase 0: Bootstrap completed).

## Prerequisites

- [Go](https://go.dev/) (latest stable version, Go 1.24+ recommended)

## Development

### Using Make (Linux / macOS / Git Bash)

```bash
# Format code
make fmt

# Run static analysis
make vet

# Run unit tests
make test

# Build local binary
make build

# Build for Windows, Linux, and macOS
make cross-compile
```

### Using PowerShell (Windows)

```powershell
# Format code
gofmt -s -w .

# Run static analysis
go vet ./...

# Run unit tests
go test -v ./...

# Run directly
go run ./cmd/organizer version

# Build local binary
go build -o bin/organizer.exe ./cmd/organizer

# Build with version metadata via ldflags
$VERSION="v0.1.0"
$COMMIT=$(git rev-parse --short HEAD)
$BUILD_DATE=(Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
go build -ldflags "-X 'github.com/Fizm00/organizer/internal/version.Version=$VERSION' -X 'github.com/Fizm00/organizer/internal/version.Commit=$COMMIT' -X 'github.com/Fizm00/organizer/internal/version.BuildDate=$BUILD_DATE'" -o bin/organizer.exe ./cmd/organizer

# Cross-compile for Linux and macOS
$env:GOARCH="amd64"
$env:GOOS="linux"; go build -o bin/organizer-linux-amd64 ./cmd/organizer
$env:GOOS="darwin"; go build -o bin/organizer-darwin-amd64 ./cmd/organizer
Remove-Item Env:GOOS; Remove-Item Env:GOARCH
```

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0-only).
