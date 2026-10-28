// SPDX-License-Identifier: AGPL-3.0-only

package app

// VersionInfo holds version and build metadata exposed to the frontend.
type VersionInfo struct {
	Version   string `json:"version"`
	Commit    string `json:"commit"`
	BuildDate string `json:"buildDate"`
}

// ---- Config DTOs ----

// WatchEntryDTO represents a monitored folder path in configuration.
type WatchEntryDTO struct {
	Path      string `json:"path"`
	Recursive bool   `json:"recursive"`
}

// SettingsDTO contains global configuration settings.
type SettingsDTO struct {
	StableAfterSeconds   int      `json:"stableAfterSeconds"`
	Conflict             string   `json:"conflict"`
	FallbackDir          string   `json:"fallbackDir"`
	IgnoreHidden         bool     `json:"ignoreHidden"`
	IgnoreExt            []string `json:"ignoreExt"`
	IgnoreNames          []string `json:"ignoreNames"`
	CloseToTray          *bool    `json:"closeToTray,omitempty"`
	NotificationsEnabled bool     `json:"notificationsEnabled"`
	Autostart            bool     `json:"autostart"`
	OnboardingCompleted  bool     `json:"onboardingCompleted"`
}

// OnboardingRequestDTO contains user choices from the first-run onboarding wizard.
type OnboardingRequestDTO struct {
	WatchFolders []string `json:"watchFolders"`
	RuleSet      string   `json:"ruleSet"` // "recommended" or "empty"
	Autostart    bool     `json:"autostart"`
}

// MatchDTO contains rule conditions with JSON-friendly types.
type MatchDTO struct {
	Ext       []string `json:"ext,omitempty"`
	NameGlob  []string `json:"nameGlob,omitempty"`
	NameRegex string   `json:"nameRegex,omitempty"` // raw regex string
	MinSize   string   `json:"minSize,omitempty"`   // human-readable or bytes string (e.g. "1MB")
	MaxSize   string   `json:"maxSize,omitempty"`
	OlderThan string   `json:"olderThan,omitempty"` // duration string (e.g. "30d")
}

// RuleDTO represents a user organization rule.
type RuleDTO struct {
	Name     string   `json:"name"`
	Disabled bool     `json:"disabled,omitempty"`
	MoveTo   string   `json:"moveTo"`
	Match    MatchDTO `json:"match"`
}

// ConfigDTO represents full application configuration serializable to frontend.
type ConfigDTO struct {
	Settings SettingsDTO     `json:"settings"`
	Watch    []WatchEntryDTO `json:"watch"`
	Rules    []RuleDTO       `json:"rules"`
}

// ValidationErrorDTO describes a validation problem on a config field.
type ValidationErrorDTO struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// ConditionEvaluationDTO describes the evaluation outcome for an individual rule condition.
type ConditionEvaluationDTO struct {
	Type    string `json:"type"`    // "ext", "name_glob", "name_regex", "min_size", "max_size", "older_than"
	Pattern string `json:"pattern"` // human-readable pattern e.g. "[jpg, png]" or "(?i)(invoice)"
	Passed  bool   `json:"passed"`
	Details string `json:"details,omitempty"`
}

// RuleTestResultDTO contains the outcome of testing a rule against a virtual file name.
type RuleTestResultDTO struct {
	Matched     bool                     `json:"matched"`
	RuleName    string                   `json:"ruleName,omitempty"`
	Destination string                   `json:"destination,omitempty"`
	Reason      string                   `json:"reason"`
	Conditions  []ConditionEvaluationDTO `json:"conditions,omitempty"`
}

// FolderWarningDTO describes a warning condition for a watched folder.
type FolderWarningDTO struct {
	FolderPath string `json:"folderPath"`
	RuleName   string `json:"ruleName"`
	MoveTo     string `json:"moveTo"`
	Message    string `json:"message"`
}

// ---- Organize DTOs ----

// PreviewOptionsDTO contains parameters for generating an organization preview.
type PreviewOptionsDTO struct {
	Dir string `json:"dir,omitempty"` // optional directory override
}

// PlanItemDTO represents a single planned file move with a stable ID.
type PlanItemDTO struct {
	ID       string `json:"id"`
	Source   string `json:"source"`
	Dest     string `json:"dest"`
	RuleName string `json:"ruleName"`
	Skipped  bool   `json:"skipped"`
	Reason   string `json:"reason"`
}

// PlanDTO represents a full batch preview of proposed moves.
type PlanDTO struct {
	PlanID    string        `json:"planId"`
	Items     []PlanItemDTO `json:"items"`
	Total     int           `json:"total"`
	MoveCount int           `json:"moveCount"`
	SkipCount int           `json:"skipCount"`
}

// RunRequestDTO contains instructions for executing organization.
type RunRequestDTO struct {
	PlanID      string   `json:"planId,omitempty"`
	SelectedIDs []string `json:"selectedIds,omitempty"` // if empty, runs all
	Dir         string   `json:"dir,omitempty"`
}

// MoveResultDTO represents the outcome of moving a single file.
type MoveResultDTO struct {
	ID       string `json:"id"`
	Source   string `json:"source"`
	Dest     string `json:"dest"`
	Size     int64  `json:"size"`
	RuleName string `json:"ruleName"`
	Skipped  bool   `json:"skipped"`
	Failed   bool   `json:"failed"`
	Reason   string `json:"reason"`
}

// RunResultDTO summarizes an entire execution run.
type RunResultDTO struct {
	BatchID   string          `json:"batchId"`
	Moves     []MoveResultDTO `json:"moves"`
	Moved     int             `json:"moved"`
	Skipped   int             `json:"skipped"`
	Failed    int             `json:"failed"`
	Unmatched int             `json:"unmatched"`
}

// ---- History DTOs ----

// HistoryFilterDTO contains filtering criteria for history batch queries.
type HistoryFilterDTO struct {
	Query  string `json:"query,omitempty"`  // search substring
	Status string `json:"status,omitempty"` // "all", "active", "undone"
	Since  string `json:"since,omitempty"`  // RFC3339 timestamp string
	Until  string `json:"until,omitempty"`  // RFC3339 timestamp string
}

// BatchSummaryDTO summarizes a history batch for listing.
type BatchSummaryDTO struct {
	ID        string `json:"id"`
	Time      string `json:"time"` // RFC3339 timestamp
	Total     int    `json:"total"`
	Moved     int    `json:"moved"`
	Undone    int    `json:"undone"`
	AllUndone bool   `json:"allUndone"`
}

// RecordDTO represents a single history move record.
type RecordDTO struct {
	BatchID string `json:"batchId"`
	Time    string `json:"time"` // RFC3339 timestamp
	Source  string `json:"source"`
	Dest    string `json:"dest"`
	Rule    string `json:"rule"`
	Size    int64  `json:"size"`
	Status  string `json:"status"`
}

// BatchDetailDTO contains a batch summary and all associated records.
type BatchDetailDTO struct {
	Summary BatchSummaryDTO `json:"summary"`
	Records []RecordDTO     `json:"records"`
}

// UndoMoveResultDTO represents the restoration outcome of an individual file.
type UndoMoveResultDTO struct {
	OriginalSource string `json:"originalSource"`
	CurrentDest    string `json:"currentDest"`
	RestoredTo     string `json:"restoredTo,omitempty"`
	Skipped        bool   `json:"skipped"`
	Failed         bool   `json:"failed"`
	Reason         string `json:"reason"`
}

// UndoResultDTO summarizes an undo operation.
type UndoResultDTO struct {
	BatchID  string              `json:"batchId"`
	Moves    []UndoMoveResultDTO `json:"moves"`
	Restored int                 `json:"restored"`
	Skipped  int                 `json:"skipped"`
	Failed   int                 `json:"failed"`
	Message  string              `json:"message"`
}

// ---- Watch DTOs ----

// WatchStatusDTO contains the current state of the directory watcher.
type WatchStatusDTO struct {
	Running bool     `json:"running"`
	Folders []string `json:"folders"`
	Error   string   `json:"error,omitempty"`
}
