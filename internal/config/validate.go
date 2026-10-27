// SPDX-License-Identifier: AGPL-3.0-only

package config

import (
	"fmt"
	"path/filepath"
	"regexp"
	"strings"
)

var (
	templateVarRegex  = regexp.MustCompile(`\{([^}]+)\}`)
	validTemplateVars = map[string]bool{
		"year":  true,
		"month": true,
		"day":   true,
		"ext":   true,
		"name":  true,
	}
)

// ValidationError represents one or more configuration validation errors.
type ValidationError struct {
	Errors []string
}

func (e *ValidationError) Error() string {
	if len(e.Errors) == 1 {
		return e.Errors[0]
	}
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("%d validation errors found:\n", len(e.Errors)))
	for _, err := range e.Errors {
		sb.WriteString(fmt.Sprintf("  - %s\n", err))
	}
	return strings.TrimRight(sb.String(), "\n")
}

// Validate checks a Config for structural correctness, semantic validity, and completeness.
// It collects all errors rather than stopping at the first failure.
func Validate(c *Config) error {
	var errs []string
	addErr := func(format string, a ...interface{}) {
		errs = append(errs, fmt.Sprintf(format, a...))
	}

	// 1. Top-level version
	if c.Version != 1 {
		addErr("version: must be 1 (got %d)", c.Version)
	}

	// 2. Settings validation
	if c.Settings.StableAfterSeconds < 1 {
		addErr("settings.stable_after_seconds: must be at least 1 (got %d)", c.Settings.StableAfterSeconds)
	}
	if c.Settings.Conflict != "" && c.Settings.Conflict != "rename" && c.Settings.Conflict != "skip" {
		addErr("settings.conflict: invalid value %q (allowed: 'rename' or 'skip')", c.Settings.Conflict)
	}

	// 3. Watch entries validation
	if len(c.Watch) == 0 {
		addErr("watch: at least one watch entry is required")
	}
	for i, w := range c.Watch {
		if strings.TrimSpace(w.Path) == "" {
			addErr("watch[%d]: path is required", i)
		}
	}

	// 4. Rules validation
	if len(c.Rules) == 0 {
		addErr("rules: at least one rule is required")
	}

	seenNames := make(map[string]int) // name -> index
	for i, r := range c.Rules {
		name := strings.TrimSpace(r.Name)
		if name == "" {
			addErr("rules[%d]: rule name cannot be empty", i)
		} else {
			if prevIdx, seen := seenNames[name]; seen {
				addErr("rules[%d] %q: duplicate rule name (already defined at rules[%d])", i, name, prevIdx)
			} else {
				seenNames[name] = i
			}
		}

		// MoveTo validation
		if strings.TrimSpace(r.MoveTo) == "" {
			addErr("rules[%d] %q: move_to is required", i, r.Name)
		} else {
			// Validate template variables in move_to
			matches := templateVarRegex.FindAllStringSubmatch(r.MoveTo, -1)
			for _, m := range matches {
				varName := m[1]
				if !validTemplateVars[varName] {
					addErr("rules[%d] %q: unknown template variable \"{%s}\" in move_to (allowed: {year}, {month}, {day}, {ext}, {name})", i, r.Name, varName)
				}
			}
		}

		// Match conditions validation: at least one condition required
		hasCondition := len(r.Match.Ext) > 0 ||
			len(r.Match.NameGlob) > 0 ||
			r.Match.NameRegex != "" ||
			r.Match.MinSize != "" ||
			r.Match.MaxSize != "" ||
			r.Match.OlderThan != ""

		if !hasCondition {
			addErr("rules[%d] %q: at least one match condition (ext, name_glob, name_regex, min_size, max_size, older_than) is required", i, r.Name)
		}

		// Validate name_regex
		if r.Match.NameRegex != "" {
			if _, err := regexp.Compile(r.Match.NameRegex); err != nil {
				addErr("rules[%d] %q: invalid name_regex: %v", i, r.Name, err)
			}
		}

		// Validate name_glob
		for _, glob := range r.Match.NameGlob {
			if _, err := filepath.Match(glob, ""); err != nil {
				addErr("rules[%d] %q: invalid name_glob %q: %v", i, r.Name, glob, err)
			}
		}

		// Validate min_size and max_size
		var minSizeVal, maxSizeVal int64
		var hasMin, hasMax bool
		if r.Match.MinSize != "" {
			val, err := ParseSize(r.Match.MinSize)
			if err != nil {
				addErr("rules[%d] %q: invalid min_size: %v", i, r.Name, err)
			} else {
				minSizeVal = val
				hasMin = true
			}
		}
		if r.Match.MaxSize != "" {
			val, err := ParseSize(r.Match.MaxSize)
			if err != nil {
				addErr("rules[%d] %q: invalid max_size: %v", i, r.Name, err)
			} else {
				maxSizeVal = val
				hasMax = true
			}
		}
		if hasMin && hasMax && minSizeVal > maxSizeVal {
			addErr("rules[%d] %q: min_size (%s) cannot be greater than max_size (%s)", i, r.Name, r.Match.MinSize, r.Match.MaxSize)
		}

		// Validate older_than
		if r.Match.OlderThan != "" {
			if _, err := ParseDuration(r.Match.OlderThan); err != nil {
				addErr("rules[%d] %q: invalid older_than: %v", i, r.Name, err)
			}
		}
	}

	if len(errs) > 0 {
		return &ValidationError{Errors: errs}
	}

	return nil
}
