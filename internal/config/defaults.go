// SPDX-License-Identifier: AGPL-3.0-only

package config

import (
	"os"
	"path/filepath"
)

const (
	// DefaultStableAfterSeconds is the default debounce/stability duration in seconds.
	DefaultStableAfterSeconds = 3
	// DefaultConflictStrategy is the default file conflict resolution strategy ("rename").
	DefaultConflictStrategy = "rename"
)

// DefaultIgnoreExt lists temporary, in-progress download extensions, and desktop shortcuts ignored by default.
var DefaultIgnoreExt = []string{"crdownload", "part", "tmp", "download", "partial", "opdownload", "lnk", "url"}

// DefaultIgnoreNames lists system and desktop metadata files ignored by default.
var DefaultIgnoreNames = []string{"desktop.ini", "thumbs.db", ".DS_Store"}

// Default returns a fresh Config struct populated with standard defaults.
func Default() *Config {
	defaultIgnoreHidden := true
	return &Config{
		Version: 1,
		Settings: Settings{
			StableAfterSeconds: DefaultStableAfterSeconds,
			IgnoreExt:          append([]string(nil), DefaultIgnoreExt...),
			IgnoreNames:        append([]string(nil), DefaultIgnoreNames...),
			IgnoreHidden:       &defaultIgnoreHidden,
			Conflict:           DefaultConflictStrategy,
			FallbackDir:        "",
		},
		Watch: []WatchEntry{
			{Path: "~/Downloads", Recursive: false},
		},
		Rules: []RuleConfig{
			{
				Name: "Invoices",
				Match: MatchConfig{
					NameRegex: "(?i)(invoice|faktur|receipt|kwitansi|struk|bukti.transfer|pembayaran|tagihan)",
				},
				MoveTo: "~/Documents/Finance/{year}-{month}",
			},
			{
				Name: "Images",
				Match: MatchConfig{
					Ext: []string{"jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "ico", "tiff", "tif", "heic"},
				},
				MoveTo: "~/Pictures/Sorted/{year}",
			},
			{
				Name: "Videos",
				Match: MatchConfig{
					Ext: []string{"mp4", "mkv", "mov", "avi", "wmv", "flv", "webm", "m4v"},
				},
				MoveTo: "~/Videos/Sorted/{year}",
			},
			{
				Name: "Audio",
				Match: MatchConfig{
					Ext: []string{"mp3", "wav", "flac", "aac", "ogg", "m4a", "wma", "opus"},
				},
				MoveTo: "~/Music/Sorted/{year}",
			},
			{
				Name: "Documents",
				Match: MatchConfig{
					Ext: []string{"pdf", "docx", "doc", "xlsx", "xls", "pptx", "ppt", "txt", "md", "rtf", "odt", "ods", "odp", "csv", "tsv"},
				},
				MoveTo: "~/Documents/Inbox/{ext}",
			},
			{
				Name: "Books",
				Match: MatchConfig{
					Ext: []string{"epub", "mobi", "azw3", "djvu", "cbr", "cbz"},
				},
				MoveTo: "~/Documents/Books",
			},
			{
				Name: "Data",
				Match: MatchConfig{
					Ext: []string{"json", "xml", "yaml", "yml", "toml", "sql", "sqlite", "db"},
				},
				MoveTo: "~/Documents/Data/{ext}",
			},
			{
				Name: "Creative",
				Match: MatchConfig{
					Ext: []string{"blend", "fbx", "obj", "stl", "gltf", "glb", "dae", "3ds", "psd", "ai", "xd", "fig"},
				},
				MoveTo: "~/Documents/Creative_Assets",
			},
			{
				Name: "Installers",
				Match: MatchConfig{
					Ext: []string{"exe", "msi", "dmg", "deb", "pkg", "rpm", "appimage", "apk", "iso"},
				},
				MoveTo: "~/Downloads/_Installers",
			},
			{
				Name: "Archives",
				Match: MatchConfig{
					Ext: []string{"zip", "rar", "7z", "tar", "gz", "bz2", "xz", "tgz"},
				},
				MoveTo: "~/Downloads/_Archives",
			},
			{
				Name: "Old stuff",
				Match: MatchConfig{
					OlderThan: "90d",
				},
				MoveTo: "~/Downloads/_Old",
			},
		},
	}
}

// DefaultYAML returns the default configuration formatted as commented YAML.
func DefaultYAML() string {
	return `# ClutterLess Organizer Configuration
# Documentation: https://github.com/Fizm00/ClutterLess-Organizer

version: 1

settings:
  stable_after_seconds: 3        # file size/mtime must be unchanged this long before moving (watch mode)
  ignore_ext: [crdownload, part, tmp, download, partial, opdownload, lnk, url]
  ignore_names: ["desktop.ini", "thumbs.db", ".DS_Store"]
  ignore_hidden: true
  conflict: rename               # only "rename" and "skip" are allowed. Never overwrite.
  fallback_dir: ""               # if non-empty, unmatched files go here; empty = leave in place

watch:
  - path: ~/Downloads
    recursive: false
  # Add more folders if desired, e.g.:
  # - path: ~/Desktop
  #   recursive: false

rules:
  - name: Invoices
    match:
      name_regex: "(?i)(invoice|faktur|receipt|kwitansi|struk|bukti.transfer|pembayaran|tagihan)"
    move_to: "~/Documents/Finance/{year}-{month}"

  - name: Images
    match:
      ext: [jpg, jpeg, png, gif, webp, bmp, svg, ico, tiff, tif, heic]
    move_to: ~/Pictures/Sorted/{year}

  - name: Videos
    match:
      ext: [mp4, mkv, mov, avi, wmv, flv, webm, m4v]
    move_to: ~/Videos/Sorted/{year}

  - name: Audio
    match:
      ext: [mp3, wav, flac, aac, ogg, m4a, wma, opus]
    move_to: ~/Music/Sorted/{year}

  - name: Documents
    match:
      ext: [pdf, docx, doc, xlsx, xls, pptx, ppt, txt, md, rtf, odt, ods, odp, csv, tsv]
    move_to: "~/Documents/Inbox/{ext}"

  - name: Books
    match:
      ext: [epub, mobi, azw3, djvu, cbr, cbz]
    move_to: ~/Documents/Books

  - name: Data
    match:
      ext: [json, xml, yaml, yml, toml, sql, sqlite, db]
    move_to: "~/Documents/Data/{ext}"

  - name: Creative
    match:
      ext: [blend, fbx, obj, stl, gltf, glb, dae, 3ds, psd, ai, xd, fig]
    move_to: ~/Documents/Creative_Assets

  - name: Installers
    match:
      ext: [exe, msi, dmg, deb, pkg, rpm, appimage, apk, iso]
    move_to: ~/Downloads/_Installers

  - name: Archives
    match:
      ext: [zip, rar, 7z, tar, gz, bz2, xz, tgz]
    move_to: ~/Downloads/_Archives

  - name: Old stuff
    match:
      older_than: 90d
    move_to: ~/Downloads/_Old
`
}

// DefaultConfigPath returns the standard configuration file path on the current OS:
// os.UserConfigDir()/organizer/config.yaml.
func DefaultConfigPath() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(configDir, "organizer", "config.yaml"), nil
}

// ApplyDefaults applies default settings if fields were omitted in user configuration.
func ApplyDefaults(cfg *Config) {
	if cfg.Settings.StableAfterSeconds <= 0 {
		cfg.Settings.StableAfterSeconds = DefaultStableAfterSeconds
	}
	if len(cfg.Settings.IgnoreExt) == 0 {
		cfg.Settings.IgnoreExt = append([]string(nil), DefaultIgnoreExt...)
	}
	if len(cfg.Settings.IgnoreNames) == 0 {
		cfg.Settings.IgnoreNames = append([]string(nil), DefaultIgnoreNames...)
	}
	if cfg.Settings.IgnoreHidden == nil {
		defaultIgnoreHidden := true
		cfg.Settings.IgnoreHidden = &defaultIgnoreHidden
	}
	if cfg.Settings.Conflict == "" {
		cfg.Settings.Conflict = DefaultConflictStrategy
	}
}
