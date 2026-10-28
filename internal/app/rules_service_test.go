// SPDX-License-Identifier: AGPL-3.0-only

package app

import (
	"path/filepath"
	"testing"
)

func TestRulesService_CRUD(t *testing.T) {
	tempDir := t.TempDir()
	configPath := filepath.Join(tempDir, "config.yaml")

	cs, err := NewConfigService(configPath, nil)
	if err != nil {
		t.Fatalf("failed to create ConfigService: %v", err)
	}
	defer cs.Close()

	rs := NewRulesService(cs)

	initialRules := rs.List()
	initialCount := len(initialRules)

	// 1. Add new rule
	newRule := RuleDTO{
		Name:   "Presentations",
		MoveTo: "~/Presentations",
		Match: MatchDTO{
			Ext: []string{"pptx", "key"},
		},
	}
	if err := rs.Upsert(newRule); err != nil {
		t.Fatalf("failed to upsert new rule: %v", err)
	}
	if len(rs.List()) != initialCount+1 {
		t.Errorf("expected %d rules, got %d", initialCount+1, len(rs.List()))
	}

	// 2. Update existing rule
	updatedRule := newRule
	updatedRule.MoveTo = "~/MyPresentations"
	if err := rs.Upsert(updatedRule); err != nil {
		t.Fatalf("failed to update rule: %v", err)
	}
	// Count should remain unchanged
	if len(rs.List()) != initialCount+1 {
		t.Errorf("expected %d rules after update, got %d", initialCount+1, len(rs.List()))
	}

	// 3. Reorder rules
	rules := rs.List()
	firstRuleName := rules[0].Name
	lastRuleName := rules[len(rules)-1].Name
	reorderedNames := []string{lastRuleName, firstRuleName}

	if err := rs.Reorder(reorderedNames); err != nil {
		t.Fatalf("failed to reorder rules: %v", err)
	}
	if rs.List()[0].Name != lastRuleName {
		t.Errorf("expected first rule after reorder to be %s, got %s", lastRuleName, rs.List()[0].Name)
	}

	// 4. Delete existing rule
	if err := rs.Delete("Presentations"); err != nil {
		t.Fatalf("failed to delete rule: %v", err)
	}
	afterDeleteRules := rs.List()
	if len(afterDeleteRules) != initialCount {
		var names []string
		for _, r := range afterDeleteRules {
			names = append(names, r.Name)
		}
		t.Errorf("expected %d rules after deletion, got %d. Rules: %v", initialCount, len(afterDeleteRules), names)
	}

	// 5. Delete non-existent rule
	err = rs.Delete("NonExistentRule")
	if err == nil {
		t.Errorf("expected error deleting non-existent rule, got nil")
	}
	if appErr, ok := err.(*AppError); !ok || appErr.Code != ErrRuleNotFound {
		t.Errorf("expected ErrRuleNotFound, got %v", err)
	}
}

func TestRulesService_Test(t *testing.T) {
	tempDir := t.TempDir()
	configPath := filepath.Join(tempDir, "config.yaml")

	cs, err := NewConfigService(configPath, nil)
	if err != nil {
		t.Fatalf("failed to create ConfigService: %v", err)
	}
	defer cs.Close()

	rs := NewRulesService(cs)

	// Add custom test rule
	if err := rs.Upsert(RuleDTO{
		Name:   "SpecialInvoices",
		MoveTo: "~/Documents/Special",
		Match: MatchDTO{
			NameGlob: []string{"custom_special_*.xyz"},
		},
	}); err != nil {
		t.Fatalf("failed to add custom rule: %v", err)
	}

	// Match custom file
	res := rs.Test("custom_special_123.xyz")
	if !res.Matched || res.RuleName != "SpecialInvoices" {
		t.Errorf("expected custom_special_123.xyz to match SpecialInvoices rule, got %+v", res)
	}
	if len(res.Conditions) == 0 || !res.Conditions[0].Passed {
		t.Errorf("expected conditions to report passed: %+v", res.Conditions)
	}

	// Test single draft rule via TestRule
	draftRule := RuleDTO{
		Name:   "DraftReceipts",
		MoveTo: "~/Receipts",
		Match: MatchDTO{
			Ext:       []string{"pdf"},
			NameRegex: "(?i)receipt",
		},
	}
	draftRes := rs.TestRule(draftRule, "store_receipt_2026.pdf")
	if !draftRes.Matched {
		t.Errorf("expected draftRule to match, got %+v", draftRes)
	}
	if len(draftRes.Conditions) != 2 {
		t.Fatalf("expected 2 conditions evaluated, got %d", len(draftRes.Conditions))
	}
	if !draftRes.Conditions[0].Passed || !draftRes.Conditions[1].Passed {
		t.Errorf("expected all conditions to pass, got %+v", draftRes.Conditions)
	}

	// Test failing condition in draftRule
	failRes := rs.TestRule(draftRule, "store_invoice_2026.pdf")
	if failRes.Matched {
		t.Errorf("expected failRes not to match receipt regex")
	}

	// Match unmatched file
	res2 := rs.Test("completely_random_file.unknownxyz")
	if res2.Matched && res2.RuleName != "fallback" {
		t.Errorf("expected completely_random_file.unknownxyz to be unmatched or fallback, got %+v", res2)
	}
}
