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
  'overview.watching_header': 'Watching',
  'overview.status.watching_with_time': 'Watching {count} folders - last file moved {time}',
  'overview.status.watching_idle': 'Watching {count} folders - waiting for new files',
  'overview.status.paused': 'Watcher paused',
  'overview.recent_activity': 'Recent activity',
  'overview.view_all': 'View all',
  'overview.needs_attention': 'Needs attention',
  'overview.organize_disabled_hint': 'Interactive preview & organization will be enabled in Phase G4.',

  // Error Banners (DESIGN.md 7.10)
  'error.config_invalid': 'Configuration in {path} contains invalid syntax',
  'error.config_invalid_line': 'Configuration error in {path} (line {line}): {message}',
  'error.watcher_already_running': 'A watcher is already running (cless watch). Close it to control watching from here.',
  'action.open_config': 'Open config',

  // Actions
  'action.organize_now': 'Organize now',
  'action.move_files': 'Move {count} files',
  'action.move_file': 'Move 1 file',
  'action.pause': 'Pause',
  'action.resume': 'Resume',
  'action.undo': 'Undo',
  'action.undo_batch': 'Undo batch',
  'action.restore_files': 'Restore {count} files',
  'action.restore_file': 'Restore 1 file',
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
  'action.retry_file': 'Retry file',
  'action.reset_defaults': 'Reset to defaults',
  'action.add_folder': 'Add folder',
  'action.new_rule': 'New rule',
  'action.test_file': 'Test a file name...',

  // Activity Screen (DESIGN.md 7.2)
  'activity.filter.all': 'All',
  'activity.filter.applied': 'Applied',
  'activity.filter.undone': 'Undone',
  'activity.search_placeholder': 'Filter by filename or destination...',
  'activity.empty_title': 'No activity history',
  'activity.empty_desc': 'Files moved by automatic watching or manual runs will appear here.',
  'activity.empty_filter_title': 'No matching records',
  'activity.empty_filter_desc': 'Try clearing the search query or changing the status filter.',
  'activity.batch_files': '{count} files',
  'activity.batch_file': '1 file',
  'activity.status.applied': 'Applied',
  'activity.status.undone': 'Undone',
  'activity.status.partially_undone': 'Partially undone',
  'activity.already_undone_tooltip': 'Already undone',

  // Preview & Run (DESIGN.md 7.3)
  'preview.section.will_move': 'Will move ({count})',
  'preview.section.skipped': 'Skipped ({count})',
  'preview.section.unmatched': 'Unmatched ({count})',
  'preview.running_progress': 'Moving {done} of {total} files...',
  'preview.cancelled': 'Organization cancelled by user',
  'preview.summary_title': 'Organization complete',
  'preview.summary_desc': '{moved} moved · {skipped} skipped · {failed} failed',
  'preview.empty_title': 'No files to organize',
  'preview.empty_desc': 'All files in your watched folders already match their destinations or are ignored.',

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
  'dialog.undo_title': 'Undo batch {id}?',
  'dialog.undo_desc': 'The following files will be restored to their original locations. This action is final.',
  'dialog.confirm_title': 'Confirm Action',

  // Settings
  'settings.appearance': 'Appearance',
  'settings.theme': 'Theme',
  'settings.theme.dark': 'Dark',
  'settings.theme.light': 'Light',
  'settings.theme.system': 'System',

  // Toasts
  'toast.restored': 'Restored {count} files. {conflicts} conflicts.',
  'toast.files_moved': 'Moved {count} files.',
  'toast.config_reloaded': 'Config changed on disk. Reloaded.',
  'toast.rule_saved': 'Rule saved.',
  'toast.rule_deleted': 'Rule deleted.',
  'toast.folder_added': 'Folder added to watch list.',
  'toast.folder_removed': 'Folder removed from watch list.',

  // Rules (DESIGN.md 7.4)
  'rules.caption': 'First match wins.',
  'rules.reordered': 'Rule {name} moved to position {position} of {total}',
  'rules.empty_title': 'No rules defined',
  'rules.empty_desc': 'Create rules to automatically categorize and move incoming files.',
  'rules.delete_title': 'Delete rule "{name}"?',
  'rules.delete_desc': 'This rule will be removed from your configuration and can no longer match incoming files. This action cannot be undone.',
  'rules.action_reorder_up': 'Move rule up',
  'rules.action_reorder_down': 'Move rule down',

  // Rule Editor (DESIGN.md 7.5)
  'editor.title_new': 'New rule',
  'editor.title_edit': 'Edit rule',
  'editor.name_label': 'Rule name',
  'editor.name_placeholder': 'e.g. Invoices, Pictures, Installers',
  'editor.match_header': 'Match conditions',
  'editor.match_and_notice': 'All added conditions must match (AND).',
  'editor.add_condition': 'Add condition',
  'editor.cond_ext': 'Extensions',
  'editor.cond_glob': 'File name glob',
  'editor.cond_regex': 'File name regex',
  'editor.cond_min_size': 'Min size',
  'editor.cond_max_size': 'Max size',
  'editor.cond_older_than': 'Older than',
  'editor.dest_label': 'Destination folder',
  'editor.dest_placeholder': 'e.g. ~/Documents/Finance/{year}-{month}',
  'editor.dest_preview': 'Sample destination: {sample}',
  'editor.yaml_toggle': 'YAML',
  'editor.test_button': 'Test against a file...',
  'editor.external_change_warning': 'Configuration was changed on disk by another program. Review before saving.',

  // Rule Tester (DESIGN.md 7.4 / 7.5)
  'tester.title': 'Test a file name',
  'tester.placeholder': 'Enter file name (e.g. invoice_2026_04.pdf)...',
  'tester.test_button': 'Test file',
  'tester.matched': 'Matched: Rule "{name}"',
  'tester.unmatched': 'Unmatched',
  'tester.destination': 'Destination: {path}',
  'tester.conditions_header': 'Evaluated conditions:',

  // Folders (DESIGN.md 7.6)
  'folders.title': 'Watched folders',
  'folders.caption': 'Folders actively monitored for incoming files.',
  'folders.add': 'Add folder',
  'folders.files_count': '{count} files',
  'folders.counting': 'Counting files...',
  'folders.recursive': 'Recursive',
  'folders.recursive_tooltip': 'Monitor subdirectories inside this folder',
  'folders.remove_title': 'Stop watching {path}?',
  'folders.remove_desc': 'This folder will no longer be monitored. Existing files will remain in place.',
  'folders.warn_recursive_dest': 'Warning: Rule "{rule}" destination ({dest}) is inside this recursive folder.',
} as const;

export type TranslationKey = keyof typeof en;

