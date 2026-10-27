BINARY_NAME=organizer
MODULE=github.com/Fizm00/organizer
VERSION?=dev
COMMIT?=$(shell git rev-parse --short HEAD 2>/dev/null || echo "none")
BUILD_DATE?=$(shell date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || echo "unknown")

LDFLAGS=-ldflags "-X '$(MODULE)/internal/version.Version=$(VERSION)' -X '$(MODULE)/internal/version.Commit=$(COMMIT)' -X '$(MODULE)/internal/version.BuildDate=$(BUILD_DATE)'"

.PHONY: all build test vet fmt clean cross-compile

all: fmt vet test build

build:
	go build $(LDFLAGS) -o bin/$(BINARY_NAME) ./cmd/organizer

test:
	go test -v ./...

vet:
	go vet ./...

fmt:
	gofmt -s -w .

clean:
	go clean
	rm -rf bin/ dist/

cross-compile:
	GOOS=windows GOARCH=amd64 go build $(LDFLAGS) -o bin/$(BINARY_NAME)-windows-amd64.exe ./cmd/organizer
	GOOS=linux GOARCH=amd64 go build $(LDFLAGS) -o bin/$(BINARY_NAME)-linux-amd64 ./cmd/organizer
	GOOS=darwin GOARCH=amd64 go build $(LDFLAGS) -o bin/$(BINARY_NAME)-darwin-amd64 ./cmd/organizer
