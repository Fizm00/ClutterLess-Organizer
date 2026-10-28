// SPDX-License-Identifier: AGPL-3.0-only

package app

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/Fizm00/organizer/internal/history"
)

func TestOrganizeService_PreviewZeroSideEffects(t *testing.T) {
	tempDir := t.TempDir()
	sourceDir := filepath.Join(tempDir, "source")
	destDir := filepath.Join(tempDir, "dest")
	_ = os.MkdirAll(sourceDir, 0755)
	_ = os.MkdirAll(destDir, 0755)

	f1 := filepath.Join(sourceDir, "doc.pdf")
	_ = os.WriteFile(f1, []byte("pdf content"), 0644)

	configPath := filepath.Join(tempDir, "config.yaml")
	cs, _ := NewConfigService(configPath, nil)
	defer cs.Close()

	// Configure rule pointing to destDir
	_ = cs.Save(ConfigDTO{
		Settings: SettingsDTO{StableAfterSeconds: 1, Conflict: "rename"},
		Rules: []RuleDTO{
			{Name: "PDFs", MoveTo: destDir, Match: MatchDTO{Ext: []string{"pdf"}}},
		},
		Watch: []WatchEntryDTO{
			{Path: sourceDir, Recursive: false},
		},
	})

	hist, _ := history.NewStorage(filepath.Join(tempDir, "history.jsonl"))
	sink := NewMemoryEventSink()
	osvc := NewOrganizeService(cs, hist, sink)

	plan, err := osvc.Preview(PreviewOptionsDTO{Dir: sourceDir})
	if err != nil {
		t.Fatalf("preview failed: %v", err)
	}

	if plan.Total != 1 || plan.MoveCount != 1 {
		t.Errorf("expected 1 planned move, got total=%d, moves=%d", plan.Total, plan.MoveCount)
	}
	if plan.PlanID == "" {
		t.Errorf("expected non-empty PlanID")
	}
	if plan.Items[0].ID == "" {
		t.Errorf("expected non-empty item ID")
	}

	// Verify ZERO side effects on filesystem
	if _, err := os.Stat(f1); os.IsNotExist(err) {
		t.Errorf("source file was moved or deleted during preview!")
	}
	expectedDest := filepath.Join(destDir, "doc.pdf")
	if _, err := os.Stat(expectedDest); err == nil {
		t.Errorf("dest file was created during preview!")
	}
}

func TestOrganizeService_RunSelectedIDsOnly(t *testing.T) {
	tempDir := t.TempDir()
	sourceDir := filepath.Join(tempDir, "source")
	destDir := filepath.Join(tempDir, "dest")
	_ = os.MkdirAll(sourceDir, 0755)
	_ = os.MkdirAll(destDir, 0755)

	f1 := filepath.Join(sourceDir, "file1.pdf")
	f2 := filepath.Join(sourceDir, "file2.pdf")
	_ = os.WriteFile(f1, []byte("content 1"), 0644)
	_ = os.WriteFile(f2, []byte("content 2"), 0644)

	configPath := filepath.Join(tempDir, "config.yaml")
	cs, err := NewConfigService(configPath, nil)
	if err != nil {
		t.Fatalf("failed to create ConfigService: %v", err)
	}
	defer cs.Close()

	if err := cs.Save(ConfigDTO{
		Watch:    []WatchEntryDTO{{Path: sourceDir}},
		Settings: SettingsDTO{StableAfterSeconds: 1, Conflict: "rename"},
		Rules: []RuleDTO{
			{Name: "PDFs", MoveTo: destDir, Match: MatchDTO{Ext: []string{"pdf"}}},
		},
	}); err != nil {
		t.Fatalf("failed to save test config: %v", err)
	}

	hist, _ := history.NewStorage(filepath.Join(tempDir, "history.jsonl"))
	sink := NewMemoryEventSink()
	osvc := NewOrganizeService(cs, hist, sink)

	// Preview both files
	plan, err := osvc.Preview(PreviewOptionsDTO{Dir: sourceDir})
	if err != nil {
		t.Fatalf("preview failed: %v", err)
	}
	if len(plan.Items) != 2 {
		t.Fatalf("expected 2 items in preview, got %d", len(plan.Items))
	}

	// Select ONLY the first item (matching file1.pdf)
	var selectedID string
	for _, item := range plan.Items {
		if filepath.Base(item.Source) == "file1.pdf" {
			selectedID = item.ID
			break
		}
	}
	if selectedID == "" {
		t.Fatalf("could not find file1.pdf in plan")
	}

	// Run with only selectedID
	req := RunRequestDTO{
		PlanID:      plan.PlanID,
		Dir:         sourceDir,
		SelectedIDs: []string{selectedID},
	}
	res, err := osvc.Run(context.Background(), req)
	if err != nil {
		t.Fatalf("run failed: %v", err)
	}

	if res.Moved != 1 {
		t.Errorf("expected 1 file moved, got %d", res.Moved)
	}

	// Verify file1 moved and file2 stayed in source
	if _, err := os.Stat(filepath.Join(destDir, "file1.pdf")); err != nil {
		t.Errorf("file1.pdf was not moved to destDir: %v", err)
	}
	if _, err := os.Stat(f2); err != nil {
		t.Errorf("file2.pdf was moved even though it was not selected!")
	}

	// Verify progress events were emitted
	if sink.Count(EventRunProgress) == 0 {
		t.Errorf("expected EventRunProgress to be emitted")
	}
	if sink.Count(EventFileMoved) == 0 {
		t.Errorf("expected EventFileMoved to be emitted")
	}
}

func TestOrganizeService_FileChangedBetweenPreviewAndRun(t *testing.T) {
	tempDir := t.TempDir()
	sourceDir := filepath.Join(tempDir, "source")
	destDir := filepath.Join(tempDir, "dest")
	_ = os.MkdirAll(sourceDir, 0755)

	f1 := filepath.Join(sourceDir, "phantom.pdf")
	_ = os.WriteFile(f1, []byte("temp"), 0644)

	configPath := filepath.Join(tempDir, "config.yaml")
	cs, err := NewConfigService(configPath, nil)
	if err != nil {
		t.Fatalf("failed to create ConfigService: %v", err)
	}
	defer cs.Close()

	if err := cs.Save(ConfigDTO{
		Watch:    []WatchEntryDTO{{Path: sourceDir}},
		Settings: SettingsDTO{StableAfterSeconds: 1, Conflict: "rename"},
		Rules: []RuleDTO{
			{Name: "PDFs", MoveTo: destDir, Match: MatchDTO{Ext: []string{"pdf"}}},
		},
	}); err != nil {
		t.Fatalf("failed to save test config: %v", err)
	}

	hist, _ := history.NewStorage(filepath.Join(tempDir, "history.jsonl"))
	sink := NewMemoryEventSink()
	osvc := NewOrganizeService(cs, hist, sink)

	plan, err := osvc.Preview(PreviewOptionsDTO{Dir: sourceDir})
	if err != nil {
		t.Fatalf("failed to preview: %v", err)
	}
	if len(plan.Items) == 0 {
		t.Fatalf("expected items in preview, got 0")
	}

	// Delete file before Run to simulate file removed/changed between preview and run
	_ = os.Remove(f1)

	res, err := osvc.Run(context.Background(), RunRequestDTO{
		PlanID:      plan.PlanID,
		Dir:         sourceDir,
		SelectedIDs: []string{plan.Items[0].ID},
	})
	if err != nil {
		t.Fatalf("expected graceful handling of missing file, got error: %v", err)
	}

	if res.Failed != 1 {
		t.Errorf("expected 1 failed move, got %d", res.Failed)
	}
}

func TestOrganizeService_ContextCancellation(t *testing.T) {
	tempDir := t.TempDir()
	sourceDir := filepath.Join(tempDir, "source")
	destDir := filepath.Join(tempDir, "dest")
	_ = os.MkdirAll(sourceDir, 0755)

	f1 := filepath.Join(sourceDir, "doc.pdf")
	_ = os.WriteFile(f1, []byte("data"), 0644)

	configPath := filepath.Join(tempDir, "config.yaml")
	cs, _ := NewConfigService(configPath, nil)
	defer cs.Close()

	_ = cs.Save(ConfigDTO{
		Watch: []WatchEntryDTO{{Path: sourceDir}},
		Settings: SettingsDTO{StableAfterSeconds: 1, Conflict: "rename"},
		Rules: []RuleDTO{
			{Name: "PDFs", MoveTo: destDir, Match: MatchDTO{Ext: []string{"pdf"}}},
		},
	})

	osvc := NewOrganizeService(cs, nil, nil)

	ctx, cancel := context.WithCancel(context.Background())
	cancel() // cancel immediately

	_, err := osvc.Run(ctx, RunRequestDTO{Dir: sourceDir})
	if err == nil {
		t.Errorf("expected error when context is cancelled, got nil")
	}
	if appErr, ok := err.(*AppError); !ok || appErr.Code != ErrOperationCancelled {
		t.Errorf("expected ErrOperationCancelled, got %v", err)
	}
}

func TestOrganizeService_RetryFile(t *testing.T) {
	tempDir := t.TempDir()
	sourceDir := filepath.Join(tempDir, "source")
	destDir := filepath.Join(tempDir, "dest")
	_ = os.MkdirAll(sourceDir, 0755)
	_ = os.MkdirAll(destDir, 0755)

	f1 := filepath.Join(sourceDir, "retry_me.pdf")
	_ = os.WriteFile(f1, []byte("retry content"), 0644)

	configPath := filepath.Join(tempDir, "config.yaml")
	cs, err := NewConfigService(configPath, nil)
	if err != nil {
		t.Fatalf("failed to create ConfigService: %v", err)
	}
	defer cs.Close()

	if err := cs.Save(ConfigDTO{
		Watch:    []WatchEntryDTO{{Path: sourceDir}},
		Settings: SettingsDTO{StableAfterSeconds: 1, Conflict: "rename"},
		Rules: []RuleDTO{
			{Name: "PDFs", MoveTo: destDir, Match: MatchDTO{Ext: []string{"pdf"}}},
		},
	}); err != nil {
		t.Fatalf("failed to save test config: %v", err)
	}

	hist, _ := history.NewStorage(filepath.Join(tempDir, "history.jsonl"))
	sink := NewMemoryEventSink()
	osvc := NewOrganizeService(cs, hist, sink)

	res, err := osvc.RetryFile(context.Background(), f1)
	if err != nil {
		t.Fatalf("retry failed: %v", err)
	}

	if res.Failed || res.Skipped {
		t.Errorf("expected successful move, got failed=%v, skipped=%v, reason=%s", res.Failed, res.Skipped, res.Reason)
	}

	expectedDest := filepath.Join(destDir, "retry_me.pdf")
	if _, err := os.Stat(expectedDest); err != nil {
		t.Errorf("expected file to exist at %s: %v", expectedDest, err)
	}

	if sink.Count(EventFileMoved) == 0 {
		t.Errorf("expected EventFileMoved on retry")
	}
}
