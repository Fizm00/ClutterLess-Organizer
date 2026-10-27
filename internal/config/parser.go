// SPDX-License-Identifier: AGPL-3.0-only

package config

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"
)

var (
	sizeRegex     = regexp.MustCompile(`(?i)^\s*([0-9]+(?:\.[0-9]+)?)\s*([a-z]+)?\s*$`)
	durationRegex = regexp.MustCompile(`(?i)^\s*([0-9]+(?:\.[0-9]+)?)\s*([a-z]+)\s*$`)
)

// ParseSize parses human-readable binary file sizes (e.g., "500KB", "1MB", "2GB").
// Sizes are 1024-based.
func ParseSize(s string) (int64, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return 0, fmt.Errorf("size cannot be empty")
	}

	matches := sizeRegex.FindStringSubmatch(s)
	if len(matches) < 2 {
		return 0, fmt.Errorf("invalid size format %q", s)
	}

	value, err := strconv.ParseFloat(matches[1], 64)
	if err != nil {
		return 0, fmt.Errorf("invalid size number %q: %w", matches[1], err)
	}
	if value < 0 {
		return 0, fmt.Errorf("size cannot be negative")
	}

	unit := ""
	if len(matches) > 2 {
		unit = strings.ToUpper(strings.TrimSpace(matches[2]))
	}

	var multiplier float64
	switch unit {
	case "", "B", "BYTES":
		multiplier = 1
	case "K", "KB", "KIB":
		multiplier = 1024
	case "M", "MB", "MIB":
		multiplier = 1024 * 1024
	case "G", "GB", "GIB":
		multiplier = 1024 * 1024 * 1024
	case "T", "TB", "TIB":
		multiplier = 1024 * 1024 * 1024 * 1024
	default:
		return 0, fmt.Errorf("unknown size unit %q in %q", unit, s)
	}

	return int64(value * multiplier), nil
}

// ParseDuration parses human-friendly duration strings supporting days and weeks
// in addition to standard units (e.g., "30d", "2w", "12h", "45m", "10s").
func ParseDuration(s string) (time.Duration, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return 0, fmt.Errorf("duration cannot be empty")
	}

	matches := durationRegex.FindStringSubmatch(s)
	if len(matches) < 3 {
		return 0, fmt.Errorf("invalid duration format %q", s)
	}

	value, err := strconv.ParseFloat(matches[1], 64)
	if err != nil {
		return 0, fmt.Errorf("invalid duration number %q: %w", matches[1], err)
	}
	if value < 0 {
		return 0, fmt.Errorf("duration cannot be negative")
	}

	unit := strings.ToLower(strings.TrimSpace(matches[2]))
	var unitDuration time.Duration
	switch unit {
	case "s", "sec", "second", "seconds":
		unitDuration = time.Second
	case "m", "min", "minute", "minutes":
		unitDuration = time.Minute
	case "h", "hr", "hour", "hours":
		unitDuration = time.Hour
	case "d", "day", "days":
		unitDuration = 24 * time.Hour
	case "w", "wk", "week", "weeks":
		unitDuration = 7 * 24 * time.Hour
	default:
		return 0, fmt.Errorf("unknown duration unit %q in %q", unit, s)
	}

	return time.Duration(value * float64(unitDuration)), nil
}
