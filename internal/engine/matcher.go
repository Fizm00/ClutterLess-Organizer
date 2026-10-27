// SPDX-License-Identifier: AGPL-3.0-only

package engine

import (
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"time"

	"github.com/Fizm00/organizer/internal/config"
)

// CompileRule converts a configuration RuleConfig into an executable engine Rule.
func CompileRule(rc config.RuleConfig) (Rule, error) {
	rule := Rule{
		Name:   rc.Name,
		MoveTo: rc.MoveTo,
	}

	// Normalize extensions (lowercase, remove leading dots)
	for _, ext := range rc.Match.Ext {
		cleanExt := strings.ToLower(strings.TrimPrefix(strings.TrimSpace(ext), "."))
		if cleanExt != "" {
			rule.Match.Ext = append(rule.Match.Ext, cleanExt)
		}
	}

	rule.Match.NameGlob = rc.Match.NameGlob

	if rc.Match.NameRegex != "" {
		re, err := regexp.Compile(rc.Match.NameRegex)
		if err != nil {
			return Rule{}, err
		}
		rule.Match.NameRegex = re
	}

	if rc.Match.MinSize != "" {
		size, err := config.ParseSize(rc.Match.MinSize)
		if err != nil {
			return Rule{}, err
		}
		rule.Match.MinSize = &size
	}

	if rc.Match.MaxSize != "" {
		size, err := config.ParseSize(rc.Match.MaxSize)
		if err != nil {
			return Rule{}, err
		}
		rule.Match.MaxSize = &size
	}

	if rc.Match.OlderThan != "" {
		dur, err := config.ParseDuration(rc.Match.OlderThan)
		if err != nil {
			return Rule{}, err
		}
		rule.Match.OlderThan = &dur
	}

	return rule, nil
}

// CompileRules converts a slice of RuleConfigs into executable Rules.
func CompileRules(rcs []config.RuleConfig) ([]Rule, error) {
	var rules []Rule
	for _, rc := range rcs {
		rule, err := CompileRule(rc)
		if err != nil {
			return nil, err
		}
		rules = append(rules, rule)
	}
	return rules, nil
}

// Matches evaluates whether a single file satisfies all conditions of a rule (AND semantics).
func (r *Rule) Matches(fi FileInfo, now time.Time) bool {
	// 1. Extension check
	if len(r.Match.Ext) > 0 {
		fileExt := ExtractExt(fi.Name)
		matched := false
		for _, e := range r.Match.Ext {
			if strings.EqualFold(fileExt, e) {
				matched = true
				break
			}
		}
		if !matched {
			return false
		}
	}

	// 2. Name glob check (at least one glob pattern must match)
	if len(r.Match.NameGlob) > 0 {
		matched := false
		for _, pattern := range r.Match.NameGlob {
			nameToMatch := fi.Name
			patToMatch := pattern
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
			return false
		}
	}

	// 3. Name regex check
	if r.Match.NameRegex != nil {
		if !r.Match.NameRegex.MatchString(fi.Name) {
			return false
		}
	}

	// 4. Min size check
	if r.Match.MinSize != nil {
		if fi.Size < *r.Match.MinSize {
			return false
		}
	}

	// 5. Max size check
	if r.Match.MaxSize != nil {
		if fi.Size > *r.Match.MaxSize {
			return false
		}
	}

	// 6. OlderThan check
	if r.Match.OlderThan != nil {
		age := now.Sub(fi.ModTime)
		if age < *r.Match.OlderThan {
			return false
		}
	}

	return true
}

// MatchFirst returns the first rule that matches the given file (first-match-wins).
// If no rule matches, it returns nil.
func MatchFirst(fi FileInfo, rules []Rule, now time.Time) *Rule {
	for i := range rules {
		if rules[i].Matches(fi, now) {
			return &rules[i]
		}
	}
	return nil
}
