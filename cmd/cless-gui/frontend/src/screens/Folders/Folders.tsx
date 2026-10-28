// SPDX-License-Identifier: AGPL-3.0-only
import React, { useEffect, useState } from 'react';
import {
  MoreHorizontal,
  Folder,
  Trash2,
  AlertTriangle,
  Layers,
  HardDrive,
  FileStack,
} from 'lucide-react';
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

function getFolderDisplayName(folderPath: string): string {
  const parts = folderPath.replace(/\\/g, '/').split('/').filter(Boolean);
  return parts[parts.length - 1] || folderPath;
}

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

  const totalFiles = folders.reduce((acc, f) => {
    const val = fileCounts[f.path];
    return typeof val === 'number' ? acc + val : acc;
  }, 0);

  const recursiveCount = folders.filter(f => f.recursive).length;

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* 1. Top Summary Bento Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full">
        <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border shadow-xs">
          <div className="flex flex-col gap-0.5">
            <span className="font-sans text-caption font-medium text-text-3 uppercase tracking-wider">
              {t('folders.title')}
            </span>
            <span className="font-mono text-title font-semibold text-foreground">
              {folders.length}
            </span>
            <span className="font-sans text-caption text-text-2">{t('folders.caption')}</span>
          </div>
          <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent/10 border border-accent/25 text-accent shrink-0">
            <HardDrive size={17} strokeWidth={1.75} />
          </span>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border shadow-xs">
          <div className="flex flex-col gap-0.5">
            <span className="font-sans text-caption font-medium text-text-3 uppercase tracking-wider">
              Detected Files
            </span>
            <span className="font-mono text-title font-semibold text-foreground">
              {totalFiles}
            </span>
            <span className="font-sans text-caption text-text-2">Items across watched targets</span>
          </div>
          <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/25 text-blue-500 shrink-0">
            <FileStack size={17} strokeWidth={1.75} />
          </span>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border shadow-xs">
          <div className="flex flex-col gap-0.5">
            <span className="font-sans text-caption font-medium text-text-3 uppercase tracking-wider">
              Subfolder Mode
            </span>
            <span className="font-mono text-title font-semibold text-foreground">
              {recursiveCount} / {folders.length}
            </span>
            <span className="font-sans text-caption text-text-2">Recursive scanning enabled</span>
          </div>
          <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/25 text-purple-500 shrink-0">
            <Layers size={17} strokeWidth={1.75} />
          </span>
        </div>
      </div>

      {/* 2. Folders Bento Cards Grid */}
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
          {folders.map(folder => {
            const countState = fileCounts[folder.path];
            const folderWarnings = warnings.filter(
              w => w.folderPath.toLowerCase() === folder.path.toLowerCase()
            );
            const displayName = getFolderDisplayName(folder.path);

            return (
              <div
                key={folder.path}
                className="flex flex-col justify-between rounded-xl border border-border bg-card shadow-xs overflow-hidden transition-all duration-fast ease hover:border-border-strong"
              >
                {/* Card Body */}
                <div className="p-5 flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent/15 border border-accent/25 text-accent shrink-0 shadow-xs"
                        aria-hidden="true"
                      >
                        <Folder size={18} strokeWidth={1.75} />
                      </span>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-sans text-subtitle font-semibold text-foreground truncate">
                            {displayName}
                          </span>
                          <Badge state="moved">Active</Badge>
                        </div>
                        <span className="font-sans text-caption text-text-3">
                          Monitored directory target
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* File Count Badge */}
                      {countState === 'counting' ? (
                        <Badge className="text-caption animate-pulse">
                          {t('folders.counting')}
                        </Badge>
                      ) : countState === 'error' || countState === undefined ? (
                        <Badge className="text-caption">-- files</Badge>
                      ) : (
                        <Badge className="text-caption font-mono">
                          {t('folders.files_count', { count: countState.toString() })}
                        </Badge>
                      )}

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

                  {/* Path Box */}
                  <div className="flex items-center justify-between bg-muted/60 border border-border-subtle rounded-lg px-3 py-2">
                    <Path
                      path={folder.path}
                      onReveal={() => void revealFolder(folder.path)}
                      className="text-small font-medium"
                    />
                  </div>

                  {/* Inline Warning for Recursive Loop */}
                  {folderWarnings.map((w, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 border-l-4 border-l-amber-500 px-3 py-2 text-small text-amber-500"
                    >
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        {t('folders.warn_recursive_dest', { rule: w.ruleName, dest: w.moveTo })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Card Footer: Recursive Toggle */}
                <Tooltip content={t('folders.recursive_tooltip')}>
                  <div className="px-5 py-3 bg-muted/30 border-t border-border-subtle flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Layers className="h-3.5 w-3.5 text-text-3" />
                      <span className="text-small font-medium text-text-2 select-none">
                        {t('folders.recursive')}
                      </span>
                      <span className="text-caption text-text-3 hidden sm:inline">
                        — Include subdirectories
                      </span>
                    </div>
                    <Switch
                      checked={folder.recursive}
                      onCheckedChange={() => void toggleRecursive(folder.path)}
                      aria-label={`Toggle recursive monitoring for ${folder.path}`}
                    />
                  </div>
                </Tooltip>
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
