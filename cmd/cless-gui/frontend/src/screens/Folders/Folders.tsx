// SPDX-License-Identifier: AGPL-3.0-only
import React, { useEffect, useState } from 'react';
import { MoreHorizontal, Folder, Trash2, AlertTriangle, Layers } from 'lucide-react';
import { Button } from '../../components/Button';
import { Path } from '../../components/Path';
import { Switch } from '../../components/Switch';
import { Badge } from '../../components/Badge';
import { Menu } from '../../components/Menu';
import { Dialog } from '../../components/Dialog';
import { EmptyState } from '../../components/EmptyState';
import { Tooltip } from '../../components/Tooltip';
import { useFoldersStore } from '../../state/foldersStore';
import { t } from '../../i18n';

export const Folders: React.FC = () => {
  const {
    folders,
    fileCounts,
    warnings,
    loading,
    fetchFolders,
    addFolder,
    removeFolder,
    toggleRecursive,
    revealFolder,
  } = useFoldersStore();

  const [folderToRemove, setFolderToRemove] = useState<string | null>(null);

  useEffect(() => {
    void fetchFolders();
  }, [fetchFolders]);

  const confirmRemove = async () => {
    if (folderToRemove) {
      await removeFolder(folderToRemove);
      setFolderToRemove(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto w-full">
      {/* Subtitle / Caption */}
      <div className="text-xs text-text-muted -mt-2">
        {t('folders.caption')}
      </div>

      {/* Folders List */}
      {folders.length === 0 && !loading ? (
        <EmptyState
          title={t('empty.no_folders_title')}
          description={t('empty.no_folders_desc')}
          action={
            <Button variant="primary" onClick={() => void addFolder()}>
              {t('folders.add')}
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {folders.map(folder => {
            const countState = fileCounts[folder.path];
            const folderWarnings = warnings.filter(
              w => w.folderPath.toLowerCase() === folder.path.toLowerCase()
            );

            return (
              <div
                key={folder.path}
                className="flex flex-col gap-2 rounded-md border border-border bg-bg-surface p-4 transition-colors hover:border-border/80"
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Folder Path */}
                  <div className="min-w-0 flex-1">
                    <Path
                      path={folder.path}
                      onReveal={() => void revealFolder(folder.path)}
                      className="text-sm font-medium"
                    />
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-3 shrink-0">
                    {/* File Count Badge */}
                    <div>
                      {countState === 'counting' ? (
                        <Badge className="text-caption animate-pulse">
                          {t('folders.counting')}
                        </Badge>
                      ) : countState === 'error' || countState === undefined ? (
                        <Badge className="text-caption">
                          -- files
                        </Badge>
                      ) : (
                        <Badge className="text-caption font-mono">
                          {t('folders.files_count', { count: countState.toString() })}
                        </Badge>
                      )}
                    </div>

                    {/* Recursive Switch with Tooltip */}
                    <Tooltip content={t('folders.recursive_tooltip')}>
                      <div className="flex items-center gap-2 pl-2 border-l border-border">
                        <Layers className="h-3.5 w-3.5 text-text-muted" />
                        <span className="text-xs text-text-secondary select-none">
                          {t('folders.recursive')}
                        </span>
                        <Switch
                          checked={folder.recursive}
                          onCheckedChange={() => void toggleRecursive(folder.path)}
                          aria-label={`Toggle recursive monitoring for ${folder.path}`}
                        />
                      </div>
                    </Tooltip>

                    {/* Menu Actions */}
                    <Menu
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 p-0 text-text-muted hover:text-text-primary"
                          aria-label={`Menu for ${folder.path}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      }
                      items={[
                        {
                          label: t('path.show_in_file_manager'),
                          icon: <Folder className="h-3.5 w-3.5" />,
                          onClick: () => void revealFolder(folder.path),
                        },
                        {
                          label: t('action.delete'),
                          icon: <Trash2 className="h-3.5 w-3.5 text-danger" />,
                          danger: true,
                          onClick: () => setFolderToRemove(folder.path),
                        },
                      ]}
                    />
                  </div>
                </div>

                {/* Inline Warning for Recursive Loop */}
                {folderWarnings.map((w, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 rounded-sm bg-amber-500/10 border-l-2 border-amber-500 px-3 py-2 text-xs text-amber-500 mt-1"
                  >
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      {t('folders.warn_recursive_dest', { rule: w.ruleName, dest: w.moveTo })}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Remove Confirmation Dialog */}
      <Dialog
        open={Boolean(folderToRemove)}
        onOpenChange={open => {
          if (!open) setFolderToRemove(null);
        }}
        title={t('folders.remove_title', { path: folderToRemove || '' })}
        description={t('folders.remove_desc')}
        footer={
          <div className="flex items-center gap-2 justify-end w-full">
            <Button variant="secondary" size="default" onClick={() => setFolderToRemove(null)}>
              {t('action.cancel')}
            </Button>
            <Button variant="danger" size="default" onClick={confirmRemove}>
              {t('action.delete')}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-text-muted">
          Removing this folder will stop automatic organization. No existing files will be touched.
        </p>
      </Dialog>
    </div>
  );
};
