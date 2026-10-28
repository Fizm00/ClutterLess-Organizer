// SPDX-License-Identifier: AGPL-3.0-only

package app

import (
	"fmt"
)

// Standard stable error codes exposed to the frontend.
const (
	ErrConfigInvalid         = "CONFIG_INVALID"
	ErrConfigNotFound        = "CONFIG_NOT_FOUND"
	ErrConfigSaveFailed      = "CONFIG_SAVE_FAILED"
	ErrWatcherAlreadyRunning = "WATCHER_ALREADY_RUNNING"
	ErrWatcherNotRunning     = "WATCHER_NOT_RUNNING"
	ErrWatcherStartFailed    = "WATCHER_START_FAILED"
	ErrRuleNotFound          = "RULE_NOT_FOUND"
	ErrRuleAlreadyExists     = "RULE_ALREADY_EXISTS"
	ErrFileLocked            = "FILE_LOCKED"
	ErrPermissionDenied      = "PERMISSION_DENIED"
	ErrPathTooLong           = "PATH_TOO_LONG"
	ErrUndoSourceOccupied    = "UNDO_SOURCE_OCCUPIED"
	ErrUndoDestMissing       = "UNDO_DEST_MISSING"
	ErrUndoAlreadyUndone     = "UNDO_ALREADY_UNDONE"
	ErrBatchNotFound         = "BATCH_NOT_FOUND"
	ErrOperationCancelled    = "OPERATION_CANCELLED"
	ErrInternal              = "INTERNAL_ERROR"
)

// AppError is the typed JSON-serializable error structure for all frontend-facing errors.
type AppError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Hint    string `json:"hint,omitempty"`
	Details string `json:"details,omitempty"`
}

func (e *AppError) Error() string {
	if e.Details != "" {
		return fmt.Sprintf("[%s] %s: %s", e.Code, e.Message, e.Details)
	}
	return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

// NewAppError creates a new structured AppError.
func NewAppError(code, message, hint, details string) *AppError {
	return &AppError{
		Code:    code,
		Message: message,
		Hint:    hint,
		Details: details,
	}
}

// AsAppError wraps an arbitrary Go error into an AppError, preserving AppError if already typed.
func AsAppError(err error, defaultCode string) *AppError {
	if err == nil {
		return nil
	}
	if appErr, ok := err.(*AppError); ok {
		return appErr
	}
	return NewAppError(defaultCode, err.Error(), "", "")
}
