// SPDX-License-Identifier: AGPL-3.0-only

package config

import (
	"bytes"
	"fmt"
	"os"
	"strings"

	"gopkg.in/yaml.v3"
)

// AddWatchEntry appends a new watch entry to the YAML file at configPath,
// preserving comments and document structure.
func AddWatchEntry(configPath string, entry WatchEntry) error {
	expandedPath := ExpandPath(configPath)
	data, err := os.ReadFile(expandedPath)
	if err != nil {
		return fmt.Errorf("failed to read config file %q: %w", expandedPath, err)
	}

	var root yaml.Node
	if err := yaml.Unmarshal(data, &root); err != nil {
		return fmt.Errorf("failed to parse YAML: %w", err)
	}

	if len(root.Content) == 0 || root.Content[0].Kind != yaml.MappingNode {
		return fmt.Errorf("invalid YAML structure: expected mapping at top level")
	}

	doc := root.Content[0]
	var watchValNode *yaml.Node

	for i := 0; i < len(doc.Content); i += 2 {
		keyNode := doc.Content[i]
		if keyNode.Value == "watch" && i+1 < len(doc.Content) {
			watchValNode = doc.Content[i+1]
			break
		}
	}

	if watchValNode == nil {
		// Create a "watch" key and sequence value
		keyNode := &yaml.Node{Kind: yaml.ScalarNode, Tag: "!!str", Value: "watch"}
		watchValNode = &yaml.Node{Kind: yaml.SequenceNode, Tag: "!!seq"}
		doc.Content = append(doc.Content, keyNode, watchValNode)
	}

	if watchValNode.Kind != yaml.SequenceNode {
		return fmt.Errorf("'watch' field in YAML is not a list")
	}

	// Check if entry already exists (by path)
	cleanNewPath := normalizePath(entry.Path)
	cleanNewExpanded := normalizePath(ExpandPath(entry.Path))
	for _, item := range watchValNode.Content {
		if item.Kind == yaml.MappingNode {
			for j := 0; j < len(item.Content); j += 2 {
				k := item.Content[j]
				if k.Value == "path" && j+1 < len(item.Content) {
					v := item.Content[j+1].Value
					if normalizePath(v) == cleanNewPath || normalizePath(ExpandPath(v)) == cleanNewExpanded {
						return fmt.Errorf("folder %q is already in the watch list", entry.Path)
					}
				}
			}
		}
	}

	// Create new mapping node for the watch entry
	pathKey := &yaml.Node{Kind: yaml.ScalarNode, Tag: "!!str", Value: "path"}
	pathVal := &yaml.Node{Kind: yaml.ScalarNode, Tag: "!!str", Value: entry.Path}
	recKey := &yaml.Node{Kind: yaml.ScalarNode, Tag: "!!str", Value: "recursive"}
	recVal := &yaml.Node{Kind: yaml.ScalarNode, Tag: "!!bool", Value: fmt.Sprintf("%t", entry.Recursive)}

	newEntryNode := &yaml.Node{
		Kind: yaml.MappingNode,
		Tag:  "!!map",
		Content: []*yaml.Node{
			pathKey, pathVal,
			recKey, recVal,
		},
	}

	watchValNode.Content = append(watchValNode.Content, newEntryNode)

	return writeYAMLNode(expandedPath, &root)
}

// RemoveWatchEntry removes a watch entry matching folderPath from configPath,
// preserving comments and document structure.
func RemoveWatchEntry(configPath string, folderPath string) error {
	expandedPath := ExpandPath(configPath)
	data, err := os.ReadFile(expandedPath)
	if err != nil {
		return fmt.Errorf("failed to read config file %q: %w", expandedPath, err)
	}

	var root yaml.Node
	if err := yaml.Unmarshal(data, &root); err != nil {
		return fmt.Errorf("failed to parse YAML: %w", err)
	}

	if len(root.Content) == 0 || root.Content[0].Kind != yaml.MappingNode {
		return fmt.Errorf("invalid YAML structure: expected mapping at top level")
	}

	doc := root.Content[0]
	var watchValNode *yaml.Node

	for i := 0; i < len(doc.Content); i += 2 {
		keyNode := doc.Content[i]
		if keyNode.Value == "watch" && i+1 < len(doc.Content) {
			watchValNode = doc.Content[i+1]
			break
		}
	}

	if watchValNode == nil || watchValNode.Kind != yaml.SequenceNode {
		return fmt.Errorf("no 'watch' list found in %s", expandedPath)
	}

	targetClean := normalizePath(folderPath)
	targetExpanded := normalizePath(ExpandPath(folderPath))

	var filtered []*yaml.Node
	removed := false

	for _, item := range watchValNode.Content {
		matched := false
		if item.Kind == yaml.MappingNode {
			for j := 0; j < len(item.Content); j += 2 {
				k := item.Content[j]
				if k.Value == "path" && j+1 < len(item.Content) {
					val := item.Content[j+1].Value
					valClean := normalizePath(val)
					valExpanded := normalizePath(ExpandPath(val))
					if valClean == targetClean || valExpanded == targetExpanded || valClean == targetExpanded || valExpanded == targetClean {
						matched = true
						removed = true
						break
					}
				}
			}
		}
		if !matched {
			filtered = append(filtered, item)
		}
	}

	if !removed {
		return fmt.Errorf("folder %q was not found in the watch list", folderPath)
	}

	watchValNode.Content = filtered
	return writeYAMLNode(expandedPath, &root)
}

func normalizePath(p string) string {
	p = strings.TrimSpace(p)
	p = strings.ReplaceAll(p, "\\", "/")
	p = strings.TrimRight(p, "/")
	return strings.ToLower(p)
}

func writeYAMLNode(destPath string, root *yaml.Node) error {
	var buf bytes.Buffer
	enc := yaml.NewEncoder(&buf)
	enc.SetIndent(2)
	if err := enc.Encode(root); err != nil {
		return fmt.Errorf("failed to serialize YAML: %w", err)
	}
	if err := enc.Close(); err != nil {
		return fmt.Errorf("failed to finalize YAML encoder: %w", err)
	}
	return os.WriteFile(destPath, buf.Bytes(), 0644)
}
