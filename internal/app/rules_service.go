// SPDX-License-Identifier: AGPL-3.0-only

package app

import (
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/Fizm00/organizer/internal/config"
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

// evaluateRuleConditions tests a virtual file against a rule's conditions, returning
// per-condition results, whether all passed, and the rendered destination if matched.
func evaluateRuleConditions(rule RuleDTO, filename string, size int64, modTime time.Time, now time.Time) ([]ConditionEvaluationDTO, bool, string) {
	if now.IsZero() {
		now = time.Now()
	}
	if modTime.IsZero() {
		modTime = now
	}
	if size <= 0 {
		size = 1024
	}

	cleanName := filepath.Base(filename)
	fileExt := engine.ExtractExt(cleanName)

	var conds []ConditionEvaluationDTO
	allPassed := true

	// 1. Extension
	if len(rule.Match.Ext) > 0 {
		var cleanExts []string
		for _, e := range rule.Match.Ext {
			cleanExts = append(cleanExts, strings.ToLower(strings.TrimPrefix(strings.TrimSpace(e), ".")))
		}
		pattern := "[" + strings.Join(cleanExts, ", ") + "]"
		matched := false
		for _, e := range cleanExts {
			if strings.EqualFold(fileExt, e) {
				matched = true
				break
			}
		}
		if !matched {
			allPassed = false
		}
		conds = append(conds, ConditionEvaluationDTO{
			Type:    "ext",
			Pattern: pattern,
			Passed:  matched,
		})
	}

	// 2. Name Glob
	if len(rule.Match.NameGlob) > 0 {
		pattern := "[" + strings.Join(rule.Match.NameGlob, ", ") + "]"
		matched := false
		for _, pat := range rule.Match.NameGlob {
			nameToMatch := cleanName
			patToMatch := pat
			if runtime.GOOS == "windows" {
				nameToMatch = strings.ToLower(nameToMatch)
				patToMatch = strings.ToLower(patToMatch)
			}
			if ok, _ := filepath.Match(patToMatch, nameToMatch); ok {
				matched = true
				break
			}
		}
		if !matched {
			allPassed = false
		}
		conds = append(conds, ConditionEvaluationDTO{
			Type:    "name_glob",
			Pattern: pattern,
			Passed:  matched,
		})
	}

	// 3. Name Regex
	if rule.Match.NameRegex != "" {
		re, err := regexp.Compile(rule.Match.NameRegex)
		matched := false
		if err == nil && re.MatchString(cleanName) {
			matched = true
		}
		if !matched {
			allPassed = false
		}
		conds = append(conds, ConditionEvaluationDTO{
			Type:    "name_regex",
			Pattern: rule.Match.NameRegex,
			Passed:  matched,
		})
	}

	// 4. Min Size
	if rule.Match.MinSize != "" {
		minSize, err := config.ParseSize(rule.Match.MinSize)
		matched := err == nil && size >= minSize
		if !matched {
			allPassed = false
		}
		conds = append(conds, ConditionEvaluationDTO{
			Type:    "min_size",
			Pattern: rule.Match.MinSize,
			Passed:  matched,
		})
	}

	// 5. Max Size
	if rule.Match.MaxSize != "" {
		maxSize, err := config.ParseSize(rule.Match.MaxSize)
		matched := err == nil && size <= maxSize
		if !matched {
			allPassed = false
		}
		conds = append(conds, ConditionEvaluationDTO{
			Type:    "max_size",
			Pattern: rule.Match.MaxSize,
			Passed:  matched,
		})
	}

	// 6. Older Than
	if rule.Match.OlderThan != "" {
		dur, err := config.ParseDuration(rule.Match.OlderThan)
		age := now.Sub(modTime)
		matched := err == nil && age >= dur
		if !matched {
			allPassed = false
		}
		conds = append(conds, ConditionEvaluationDTO{
			Type:    "older_than",
			Pattern: rule.Match.OlderThan,
			Passed:  matched,
		})
	}

	// If no conditions defined, cannot match
	if len(conds) == 0 {
		allPassed = false
	}

	var dest string
	if allPassed && strings.TrimSpace(rule.MoveTo) != "" {
		destDir, err := engine.RenderMoveTo(rule.MoveTo, cleanName, modTime)
		if err == nil {
			dest = filepath.Join(destDir, cleanName)
		}
	}

	return conds, allPassed, dest
}

// Test evaluates a virtual filename against the current rules without touching the filesystem.
func (rs *RulesService) Test(filename string) RuleTestResultDTO {
	rs.mu.RLock()
	defer rs.mu.RUnlock()

	cleanName := filepath.Base(filename)
	cfgDTO := rs.configService.Get()
	now := time.Now()

	for _, rule := range cfgDTO.Rules {
		if rule.Disabled {
			continue
		}
		conds, matched, dest := evaluateRuleConditions(rule, cleanName, 1024, now, now)
		if matched {
			return RuleTestResultDTO{
				Matched:     true,
				RuleName:    rule.Name,
				Destination: dest,
				Reason:      "matched rule " + rule.Name,
				Conditions:  conds,
			}
		}
	}

	// Check fallback
	if strings.TrimSpace(cfgDTO.Settings.FallbackDir) != "" {
		return RuleTestResultDTO{
			Matched:     true,
			RuleName:    "fallback",
			Destination: filepath.Join(cfgDTO.Settings.FallbackDir, cleanName),
			Reason:      "unmatched, routed to fallback directory",
		}
	}

	var firstConds []ConditionEvaluationDTO
	for _, rule := range cfgDTO.Rules {
		if !rule.Disabled {
			firstConds, _, _ = evaluateRuleConditions(rule, cleanName, 1024, now, now)
			break
		}
	}

	return RuleTestResultDTO{
		Matched:    false,
		Reason:     "no rule matched and no fallback directory configured",
		Conditions: firstConds,
	}
}

// TestRule evaluates a virtual filename specifically against a given (e.g. draft) rule.
func (rs *RulesService) TestRule(rule RuleDTO, filename string) RuleTestResultDTO {
	cleanName := filepath.Base(filename)
	now := time.Now()
	conds, matched, dest := evaluateRuleConditions(rule, cleanName, 1024, now, now)

	if matched {
		return RuleTestResultDTO{
			Matched:     true,
			RuleName:    rule.Name,
			Destination: dest,
			Reason:      "matched rule " + rule.Name,
			Conditions:  conds,
		}
	}

	return RuleTestResultDTO{
		Matched:     false,
		RuleName:    rule.Name,
		Destination: "",
		Reason:      "conditions did not match",
		Conditions:  conds,
	}
}
