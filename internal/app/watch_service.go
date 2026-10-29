// SPDX-License-Identifier: AGPL-3.0-only

package app

import (
	"context"
	"sync"
	"time"

	"github.com/Fizm00/organizer/internal/engine"
	"github.com/Fizm00/organizer/internal/history"
)

// WatchService orchestrates real-time folder monitoring, exclusively protected by WatcherLock.
type WatchService struct {
	configService *ConfigService
	history       *history.Storage
	eventSink     EventSink
	stateDir      string

	mu         sync.Mutex
	running    bool
	runID      uint64
	lock       *WatcherLock
	cancelFunc context.CancelFunc
	doneCh     chan struct{}
	errText    string
}

// NewWatchService creates a new WatchService.
func NewWatchService(cs *ConfigService, hist *history.Storage, sink EventSink, stateDir string) *WatchService {
	if sink == nil {
		sink = &NoopEventSink{}
	}
	return &WatchService{
		configService: cs,
		history:       hist,
		eventSink:     sink,
		stateDir:      stateDir,
	}
}

// Start acquires the watcher lock and begins monitoring configured directories in the background.
func (ws *WatchService) Start() error {
	ws.mu.Lock()
	defer ws.mu.Unlock()

	if ws.running {
		return nil
	}

	// 1. Acquire exclusive watcher lock
	lock, err := AcquireWatcherLock(ws.stateDir)
	if err != nil {
		ws.errText = err.Error()
		ws.emitStatusLocked()
		return err
	}
	ws.lock = lock

	// 2. Prepare context and channels
	ctx, cancel := context.WithCancel(context.Background())
	doneCh := make(chan struct{})
	ws.runID++
	myRunID := ws.runID
	ws.cancelFunc = cancel
	ws.doneCh = doneCh
	ws.running = true
	ws.errText = ""

	rawCfg := ws.configService.GetConfig()
	organizer := engine.NewOrganizer(rawCfg)
	if ws.history != nil {
		organizer.History = ws.history
	}

	opts := engine.WatchOptions{
		InitialRun: false,
		DryRun:     false,
		LogFn: func(m engine.MoveResult) {
			if m.Failed {
				ws.eventSink.Emit(EventFileFailed, FileFailedPayload{
					Path:  m.Source,
					Error: m.Reason,
				})
			} else if m.Skipped {
				ws.eventSink.Emit(EventFileSkipped, FileSkippedPayload{
					Path:   m.Source,
					Reason: m.Reason,
				})
			} else {
				ws.eventSink.Emit(EventFileMoved, FileMovedPayload{
					Source: m.Source,
					Dest:   m.Dest,
					Rule:   m.RuleName,
					Size:   m.Size,
					Time:   time.Now().UTC().Format(time.RFC3339),
				})
			}
		},
	}

	// 3. Launch watcher in background goroutine
	go func() {
		defer func() {
			defer close(doneCh)
			ws.mu.Lock()
			if ws.runID == myRunID {
				ws.running = false
				if ws.lock != nil {
					_ = ws.lock.Release()
					ws.lock = nil
				}
				ws.emitStatusLocked()
			}
			ws.mu.Unlock()
		}()

		_, watchErr := organizer.Watch(ctx, opts)
		if watchErr != nil && ctx.Err() == nil {
			ws.mu.Lock()
			if ws.runID == myRunID {
				ws.errText = watchErr.Error()
				ws.eventSink.Emit(EventAppError, NewAppError(ErrWatcherStartFailed, "Watcher encountered error", "", watchErr.Error()))
			}
			ws.mu.Unlock()
		}
	}()

	ws.emitStatusLocked()
	return nil
}

// Stop terminates the active watcher and releases the lock.
func (ws *WatchService) Stop() error {
	ws.mu.Lock()
	if !ws.running {
		ws.mu.Unlock()
		return nil
	}

	ws.runID++
	doneCh := ws.doneCh
	ws.doneCh = nil
	if ws.cancelFunc != nil {
		ws.cancelFunc()
		ws.cancelFunc = nil
	}
	if ws.lock != nil {
		_ = ws.lock.Release()
		ws.lock = nil
	}
	ws.running = false
	ws.emitStatusLocked()
	ws.mu.Unlock()

	if doneCh != nil {
		select {
		case <-doneCh:
		case <-time.After(500 * time.Millisecond):
		}
	}
	return nil
}

// Reload restarts the watcher with updated configuration without giving up the lock.
func (ws *WatchService) Reload() error {
	ws.mu.Lock()
	if !ws.running {
		ws.emitStatusLocked()
		ws.mu.Unlock()
		return nil
	}
	ws.mu.Unlock()

	if err := ws.Stop(); err != nil {
		return err
	}
	return ws.Start()
}

// Status returns the current monitoring status and active folder paths.
func (ws *WatchService) Status() WatchStatusDTO {
	ws.mu.Lock()
	defer ws.mu.Unlock()
	return ws.statusLocked()
}

func (ws *WatchService) statusLocked() WatchStatusDTO {
	folders := make([]string, 0)
	for _, w := range ws.configService.Get().Watch {
		folders = append(folders, w.Path)
	}
	return WatchStatusDTO{
		Running: ws.running,
		Folders: folders,
		Error:   ws.errText,
	}
}

func (ws *WatchService) emitStatusLocked() {
	ws.eventSink.Emit(EventWatchStatus, ws.statusLocked())
}
