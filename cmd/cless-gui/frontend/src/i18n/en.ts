// English string dictionary (Single source of truth for UI copy: DESIGN.md section 8)
export const en = {
  // Navigation & Shell
  'nav.brand': 'ClutterLess',
  'nav.overview': 'Overview',
  'nav.activity': 'Activity',
  'nav.rules': 'Rules',
  'nav.folders': 'Folders',
  'nav.settings': 'Settings',

  // Watcher Status
  'watch.status.watching': 'Watching {count} folders',
  'watch.status.paused': 'Watcher paused',
  'watch.status.error': 'Watcher error',
  'watch.last_moved': 'last file moved {time}',

  // Overview Screen
  'overview.status.watching_with_time': 'Watching {count} folders - last file moved {time}',
  'overview.status.watching_idle': 'Watching {count} folders - waiting for new files',
  'overview.status.paused': 'Watcher paused',
  'overview.recent_activity': 'Recent activity',
  'overview.view_all': 'View all ->',
  'overview.needs_attention': 'Needs attention',
  'overview.organize_disabled_hint': 'Interactive preview & organization will be enabled in Phase G4.',

  // Error Banners (DESIGN.md 7.10)
  'error.config_invalid': 'Configuration in {path} contains invalid syntax',
  'error.config_invalid_line': 'Configuration error in {path} (line {line}): {message}',
  'error.watcher_already_running': 'A watcher is already running (cless watch). Close it to control watching from here.',
  'action.open_config': 'Open config',

  // Actions
  'action.organize_now': 'Organize now',
  'action.pause': 'Pause',
  'action.resume': 'Resume',
  'action.undo': 'Undo',
  'action.undo_batch': 'Undo batch',
  'action.cancel': 'Cancel',
  'action.save': 'Save',
  'action.save_rule': 'Save rule',
  'action.delete': 'Delete',
  'action.edit': 'Edit',
  'action.duplicate': 'Duplicate',
  'action.copy': 'Copy',
  'action.copied': 'Copied to clipboard',
  'action.reveal': 'Show in file manager',
  'action.close': 'Close',
  'action.retry': 'Retry',
  'action.reset_defaults': 'Reset to defaults',
  'action.add_folder': 'Add folder',
  'action.new_rule': 'New rule',
  'action.test_file': 'Test a file name...',

  // Screen Titles
  'title.overview': 'Overview',
  'title.activity': 'Activity',
  'title.rules': 'Rules',
  'title.folders': 'Folders',
  'title.settings': 'Settings',
  'title.styleguide': 'Component Styleguide',

  // Components & Common
  'badge.moved': 'Moved',
  'badge.skipped': 'Skipped',
  'badge.failed': 'Failed',
  'badge.undone': 'Undone',
  'badge.applied': 'Applied',

  'path.copy_path': 'Copy full path',
  'path.show_in_file_manager': 'Show in file manager',

  'empty.no_activity_title': 'Nothing moved yet',
  'empty.no_activity_desc': 'New files in your watched folders will appear here.',
  'empty.no_rules_title': 'No active rules',
  'empty.no_rules_desc': 'Add a rule to organize incoming files automatically.',
  'empty.no_folders_title': 'No folders watched',
  'empty.no_folders_desc': 'Add a folder to begin watching for new downloads or documents.',

  // Dialogs & Sheets
  'dialog.preview_title': 'Preview',
  'dialog.preview_counts': '{moveCount} will move - {skipCount} skipped - {unmatchedCount} unmatched',
  'dialog.preview_notice': 'Nothing has been moved yet.',
  'dialog.confirm_title': 'Confirm Action',

  // Settings
  'settings.appearance': 'Appearance',
  'settings.theme': 'Theme',
  'settings.theme.dark': 'Dark',
  'settings.theme.light': 'Light',
  'settings.theme.system': 'System',

  // Toasts
  'toast.restored': 'Restored {count} files. {conflicts} conflicts.',
  'toast.config_reloaded': 'Config changed on disk. Reloaded.',
} as const;

export type TranslationKey = keyof typeof en;

