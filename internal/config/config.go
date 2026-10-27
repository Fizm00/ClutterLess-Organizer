// SPDX-License-Identifier: AGPL-3.0-only

package config

import (
	"fmt"
	"os"

	"gopkg.in/yaml.v3"
)

// Load reads, parses, applies defaults, and validates a YAML configuration file from the given path.
func Load(path string) (*Config, error) {
	expandedPath := ExpandPath(path)
	data, err := os.ReadFile(expandedPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file %q: %w", expandedPath, err)
	}

	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("failed to parse YAML config: %w", err)
	}

	ApplyDefaults(&cfg)

	if err := Validate(&cfg); err != nil {
		return nil, err
	}

	return &cfg, nil
}
