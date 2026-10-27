// SPDX-License-Identifier: AGPL-3.0-only

package ui

import "fmt"

const (
	resetCode   = "\033[0m"
	boldCode    = "\033[1m"
	dimCode     = "\033[2m"
	redCode     = "\033[31m"
	greenCode   = "\033[32m"
	yellowCode  = "\033[33m"
	blueCode    = "\033[34m"
	magentaCode = "\033[35m"
	cyanCode    = "\033[36m"
	grayCode    = "\033[90m"
)

// Styler formats strings with ANSI styling or plaintext depending on colorEnabled.
type Styler struct {
	Enabled bool
}

// NewStyler returns a Styler instance.
func NewStyler(enabled bool) *Styler {
	return &Styler{Enabled: enabled}
}

func (s *Styler) apply(code, text string) string {
	if !s.Enabled {
		return text
	}
	return code + text + resetCode
}

func (s *Styler) Bold(text string) string    { return s.apply(boldCode, text) }
func (s *Styler) Dim(text string) string     { return s.apply(dimCode, text) }
func (s *Styler) Gray(text string) string    { return s.apply(grayCode, text) }
func (s *Styler) Red(text string) string     { return s.apply(redCode, text) }
func (s *Styler) Green(text string) string   { return s.apply(greenCode, text) }
func (s *Styler) Yellow(text string) string  { return s.apply(yellowCode, text) }
func (s *Styler) Blue(text string) string    { return s.apply(blueCode, text) }
func (s *Styler) Magenta(text string) string { return s.apply(magentaCode, text) }
func (s *Styler) Cyan(text string) string    { return s.apply(cyanCode, text) }

// Badges
func (s *Styler) BadgeDryRun() string {
	if !s.Enabled {
		return "[DRY-RUN]"
	}
	return boldCode + cyanCode + "[DRY-RUN]" + resetCode
}

func (s *Styler) BadgeMove() string {
	if !s.Enabled {
		return "[MOVE]"
	}
	return boldCode + greenCode + "[MOVE]" + resetCode
}

func (s *Styler) BadgeSkip() string {
	if !s.Enabled {
		return "[SKIP]"
	}
	return grayCode + "[SKIP]" + resetCode
}

func (s *Styler) BadgeUnmatched() string {
	if !s.Enabled {
		return "[UNMATCHED]"
	}
	return boldCode + yellowCode + "[UNMATCHED]" + resetCode
}

func (s *Styler) BadgeFail() string {
	if !s.Enabled {
		return "[FAIL]"
	}
	return boldCode + redCode + "[FAIL]" + resetCode
}

func (s *Styler) RuleTag(ruleName string) string {
	if !s.Enabled {
		return fmt.Sprintf("(rule: %s)", ruleName)
	}
	return fmt.Sprintf("%s(rule: %s)%s", grayCode, s.Cyan(ruleName), resetCode)
}
