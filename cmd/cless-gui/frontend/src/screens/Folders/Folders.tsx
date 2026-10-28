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
    <div className="flex flex-col gap-5 w-full">
      {/* Subtitle / Caption */}
      <div className="flex items-center justify-between px-1">
        <span className="text-small text-text-2">
          {t('folders.caption')}
        </span>
        <span className="font-mono text-caption text-text-3">
          {folders.length} monitored
        </span>
      </div>

      {/* Folders List */}
      {folders.length === 0 && !loading ? (
        <div className="flex flex-col bg-card border border-border rounded-xl shadow-xs overflow-hidden w-full p-6">
          <EmptyState
            title={t('empty.no_folders_title')}
            description={t('empty.no_folders_desc')}
            action={
              <Button variant="primary" onClick={() => void addFolder()}>
                {t('folders.add')}
              </Button>
            }
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3 w-full">
          {folders.map(folder => {
            const countState = fileCounts[folder.path];
            const folderWarnings = warnings.filter(
              w => w.folderPath.toLowerCase() === folder.path.toLowerCase()
            );

            return (
              <div
                key={folder.path}
                className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-4 shadow-xs transition-all duration-fast ease hover:border-border-strong"
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Folder Icon + Path */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                      className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent/15 border border-accent/25 text-accent shrink-0"
                      aria-hidden="true"
                    >
                      <Folder size={16} strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <Path
                        path={folder.path}
                        onReveal={() => void revealFolder(folder.path)}
                        className="text-body font-medium"
                      />
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-3.5 shrink-0">
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
                      <div className="flex items-center gap-2 pl-3.5 border-l border-border-subtle">
                        <Layers className="h-3.5 w-3.5 text-text-3" />
                        <span className="text-small text-text-2 select-none">
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
                          className="h-8 w-8 p-0 text-text-3 hover:text-text-1"
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
                    className="flex items-start gap-2.5 rounded-md bg-amber-500/10 border-l-2 border-amber-500 px-3 py-2 text-small text-amber-500 mt-1"
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
        <p className="text-small text-text-2">
          Removing this folder will stop automatic organization. No existing files will be touched.
        </p>
      </Dialog>
    </div>
  );
};
