// SPDX-License-Identifier: AGPL-3.0-only

package app

import (
	"strings"
	"sync"
	"time"

	"github.com/Fizm00/organizer/internal/engine"
)

// RulesService provides management, validation, and testing of organization rules.
type RulesService struct {
	configService *ConfigService
	mu            sync.RWMutex
}

// NewRulesService creates a new RulesService connected to the given ConfigService.
func NewRulesService(cs *ConfigService) *RulesService {
	return &RulesService{
		configService: cs,
	}
}

// List returns the currently configured rules in their evaluation order.
func (rs *RulesService) List() []RuleDTO {
	rs.mu.RLock()
	defer rs.mu.RUnlock()
	return rs.configService.Get().Rules
}

// Upsert adds a new rule or updates an existing rule with the same name.
func (rs *RulesService) Upsert(rule RuleDTO) error {
	rs.mu.Lock()
	defer rs.mu.Unlock()

	cfgDTO := rs.configService.Get()
	found := false
	for i, r := range cfgDTO.Rules {
		if strings.EqualFold(r.Name, rule.Name) {
			cfgDTO.Rules[i] = rule
			found = true
			break
		}
	}
	if !found {
		cfgDTO.Rules = append(cfgDTO.Rules, rule)
	}

	return rs.configService.Save(cfgDTO)
}

// Delete removes a rule by name. Returns ErrRuleNotFound if no rule matches.
func (rs *RulesService) Delete(name string) error {
	rs.mu.Lock()
	defer rs.mu.Unlock()

	cfgDTO := rs.configService.Get()
	var updated []RuleDTO
	found := false

	for _, r := range cfgDTO.Rules {
		if strings.EqualFold(r.Name, name) {
			found = true
			continue
		}
		updated = append(updated, r)
	}

	if !found {
		return NewAppError(ErrRuleNotFound, "Rule not found", "Ensure the rule name exists", name)
	}

	cfgDTO.Rules = updated
	return rs.configService.Save(cfgDTO)
}

// Reorder rearranges the rules to match the provided list of rule names.
func (rs *RulesService) Reorder(names []string) error {
	rs.mu.Lock()
	defer rs.mu.Unlock()

	cfgDTO := rs.configService.Get()
	ruleMap := make(map[string]RuleDTO)
	for _, r := range cfgDTO.Rules {
		ruleMap[strings.ToLower(r.Name)] = r
	}

	var reordered []RuleDTO
	seen := make(map[string]bool)

	for _, name := range names {
		key := strings.ToLower(name)
		if r, ok := ruleMap[key]; ok && !seen[key] {
			reordered = append(reordered, r)
			seen[key] = true
		}
	}

	// Append any rules that were not included in names
	for _, r := range cfgDTO.Rules {
		key := strings.ToLower(r.Name)
		if !seen[key] {
			reordered = append(reordered, r)
		}
	}

	cfgDTO.Rules = reordered
	return rs.configService.Save(cfgDTO)
}

// Test evaluates a virtual filename against the current rules without touching the filesystem.
func (rs *RulesService) Test(filename string) RuleTestResultDTO {
	rs.mu.RLock()
	defer rs.mu.RUnlock()

	rawCfg := rs.configService.GetConfig()
	compiledRules, err := engine.CompileRules(rawCfg.Rules)
	if err != nil {
		return RuleTestResultDTO{
			Matched: false,
			Reason:  "rules compilation error: " + err.Error(),
		}
	}

	matched, ruleName, destOrReason := engine.TestMatch(filename, 1024, time.Now(), compiledRules, time.Now())
	if matched {
		return RuleTestResultDTO{
			Matched:     true,
			RuleName:    ruleName,
			Destination: destOrReason,
			Reason:      "matched rule " + ruleName,
		}
	}

	// Check fallback
	if strings.TrimSpace(rawCfg.Settings.FallbackDir) != "" {
		return RuleTestResultDTO{
			Matched:     true,
			RuleName:    "fallback",
			Destination: rawCfg.Settings.FallbackDir,
			Reason:      "unmatched, routed to fallback directory",
		}
	}

	return RuleTestResultDTO{
		Matched: false,
		Reason:  "no rule matched and no fallback directory configured",
	}
}
