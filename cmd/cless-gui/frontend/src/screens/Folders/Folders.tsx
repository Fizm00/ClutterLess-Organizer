// SPDX-License-Identifier: AGPL-3.0-only
import React, { useEffect, useState } from 'react';
import { MoreHorizontal, Folder, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Path, EmptyState } from '@/components';
import { useFoldersStore } from '@/state/foldersStore';
import { t } from '@/i18n';

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

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col gap-3 w-full">
        <p className="text-sm text-muted-foreground">{t('folders.caption')}</p>

        <div className="rounded-lg border w-full overflow-hidden">
          {folders.length === 0 && !loading ? (
            <div className="px-4">
              <EmptyState
                title={t('empty.no_folders_title')}
                description={t('empty.no_folders_desc')}
                action={
                  <Button variant="default" size="sm" onClick={() => void addFolder()}>
                    {t('folders.add')}
                  </Button>
                }
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4 text-xs text-muted-foreground">Folder</TableHead>
                  <TableHead className="w-28 text-right text-xs text-muted-foreground">Files</TableHead>
                  <TableHead className="w-28 text-xs text-muted-foreground">
                    {t('folders.recursive')}
                  </TableHead>
                  <TableHead className="w-10 pr-4 text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {folders.map(folder => {
                  const countState = fileCounts[folder.path];
                  const folderWarnings = warnings.filter(
                    w => w.folderPath.toLowerCase() === folder.path.toLowerCase()
                  );
                  const displayName = getFolderDisplayName(folder.path);

                  return (
                    <TableRow key={folder.path} className="group h-11">
                      <TableCell className="pl-4">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-sm font-medium text-foreground">
                              {displayName}
                            </span>
                            <Path
                              path={folder.path}
                              onReveal={() => void revealFolder(folder.path)}
                            />
                          </div>
                          {folderWarnings.map((w, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-1.5 text-xs text-destructive"
                            >
                              <AlertTriangle className="size-3.5 shrink-0" />
                              <span>
                                {t('folders.warn_recursive_dest', {
                                  rule: w.ruleName,
                                  dest: w.moveTo,
                                })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </TableCell>

                      <TableCell className="text-right font-mono text-xs tabular-nums text-muted-foreground">
                        {countState === 'counting' ? (
                          <span>{t('folders.counting')}</span>
                        ) : countState === 'error' || countState === undefined ? (
                          <span>—</span>
                        ) : (
                          <span>{t('folders.files_count', { count: countState.toString() })}</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="inline-flex items-center">
                              <Switch
                                checked={folder.recursive}
                                onCheckedChange={() => void toggleRecursive(folder.path)}
                                aria-label={`Toggle recursive monitoring for ${folder.path}`}
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>{t('folders.recursive_tooltip')}</TooltipContent>
                        </Tooltip>
                      </TableCell>

                      <TableCell className="pr-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Menu for ${folder.path}`}
                            >
                              <MoreHorizontal className="size-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => void revealFolder(folder.path)}>
                              <Folder className="size-4 text-muted-foreground" />
                              <span>{t('path.show_in_file_manager')}</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setFolderToRemove(folder.path)}
                            >
                              <Trash2 className="size-4" />
                              <span>{t('action.delete')}</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Remove Confirmation Dialog */}
        <Dialog
          open={Boolean(folderToRemove)}
          onOpenChange={open => {
            if (!open) setFolderToRemove(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {t('folders.remove_title', { path: folderToRemove || '' })}
              </DialogTitle>
              <DialogDescription>{t('folders.remove_desc')}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFolderToRemove(null)}>
                {t('action.cancel')}
              </Button>
              <Button variant="destructive" onClick={() => void confirmRemove()}>
                {t('action.delete')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};
