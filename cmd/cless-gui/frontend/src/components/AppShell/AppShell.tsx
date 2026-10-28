import React from 'react';
import {
  LayoutDashboard,
  History,
  SlidersHorizontal,
  Folder,
  Settings,
  Palette,
  Layers,
} from 'lucide-react';
import { StatusDot, WatcherState } from '../StatusDot';
import { Toaster } from '../Toast';
import { Kbd } from '../Kbd';
import { useWatchStore } from '../../state/watchStore';
import { cn } from '../../lib/utils';
import { t } from '../../i18n';

export type NavRoute = 'overview' | 'activity' | 'rules' | 'folders' | 'settings' | 'styleguide';

export interface AppShellProps {
  currentRoute: NavRoute;
  onRouteChange: (route: NavRoute) => void;
  headerTitle: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  isMockMode?: boolean;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentRoute,
  onRouteChange,
  headerTitle,
  headerActions,
  children,
  isMockMode = true,
}) => {
  const { running, folders, watcherLocked, configError } = useWatchStore();

  let statusState: WatcherState = 'paused';
  let statusLabel = t('watch.status.paused');

  if (watcherLocked || configError) {
    statusState = 'error';
    statusLabel = t('watch.status.error');
  } else if (running) {
    statusState = 'watching';
    statusLabel = t('watch.status.watching', { count: folders.length });
  }

  const navItems: Array<{ route: NavRoute; label: string; icon: React.ReactNode }> = [
    { route: 'overview', label: t('nav.overview'), icon: <LayoutDashboard size={15} strokeWidth={1.75} /> },
    { route: 'activity', label: t('nav.activity'), icon: <History size={15} strokeWidth={1.75} /> },
    { route: 'rules', label: t('nav.rules'), icon: <SlidersHorizontal size={15} strokeWidth={1.75} /> },
    { route: 'folders', label: t('nav.folders'), icon: <Folder size={15} strokeWidth={1.75} /> },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <aside className="w-sidebar min-w-sidebar max-w-sidebar h-full bg-bg-sidebar border-r border-border flex flex-col shrink-0 select-none">
        {/* Sidebar Header */}
        <div className="h-14 px-4 border-b border-border-subtle flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-accent/15 border border-accent/30 text-accent shadow-xs shrink-0">
              <Layers size={15} strokeWidth={2} />
            </span>
            <span className="font-sans text-subtitle font-semibold tracking-tight text-foreground">
              {t('nav.brand')}
            </span>
          </div>
          <span className="font-mono text-caption text-muted-foreground bg-muted/80 px-1.5 py-0.5 rounded-md border border-border-subtle">
            v1.0
          </span>
        </div>

        {/* Workspace Navigation */}
        <div className="flex flex-col flex-1 py-3.5 px-2.5 gap-1">
          <span className="px-2.5 pb-1 font-sans text-caption font-semibold uppercase tracking-wider text-text-3">
            Workspace
          </span>
          <nav className="flex flex-col gap-0.5" aria-label="Main Navigation">
            {navItems.map(item => {
              const isSelected = currentRoute === item.route;
              return (
                <button
                  key={item.route}
                  type="button"
                  data-testid={`nav-${item.route}`}
                  className={cn(
                    'relative flex items-center gap-2.5 h-8 px-2.5 rounded-md border font-sans text-body cursor-pointer text-left transition-all duration-fast ease w-full',
                    isSelected
                      ? 'bg-muted text-foreground font-medium border-border shadow-xs'
                      : 'bg-transparent text-muted-foreground font-regular border-transparent hover:bg-muted/50 hover:text-foreground'
                  )}
                  onClick={() => onRouteChange(item.route)}
                  aria-current={isSelected ? 'page' : undefined}
                >
                  {isSelected && (
                    <span
                      className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-accent"
                      aria-hidden="true"
                    />
                  )}
                  <span className={cn('flex items-center shrink-0', isSelected ? 'text-accent' : 'text-text-3')}>
                    {item.icon}
                  </span>
                  <span className="whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* System Footer & Watcher Status Card */}
        <div className="flex flex-col gap-1 px-2.5 pt-2.5 pb-3 border-t border-border-subtle">
          <span className="px-2.5 pb-0.5 font-sans text-caption font-semibold uppercase tracking-wider text-text-3">
            System
          </span>
          {isMockMode && (
            <button
              type="button"
              className={cn(
                'relative flex items-center gap-2.5 h-8 px-2.5 rounded-md border font-sans text-body cursor-pointer text-left transition-all duration-fast ease w-full',
                currentRoute === 'styleguide'
                  ? 'bg-muted text-foreground font-medium border-border shadow-xs'
                  : 'bg-transparent text-muted-foreground font-regular border-transparent hover:bg-muted/50 hover:text-foreground'
              )}
              onClick={() => onRouteChange('styleguide')}
              aria-current={currentRoute === 'styleguide' ? 'page' : undefined}
            >
              {currentRoute === 'styleguide' && (
                <span
                  className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-accent"
                  aria-hidden="true"
                />
              )}
              <span className={cn('flex items-center shrink-0', currentRoute === 'styleguide' ? 'text-accent' : 'text-text-3')}>
                <Palette size={15} strokeWidth={1.75} />
              </span>
              <span className="whitespace-nowrap overflow-hidden text-ellipsis">Styleguide</span>
            </button>
          )}

          <button
            type="button"
            data-testid="nav-settings"
            className={cn(
              'relative flex items-center justify-between gap-2.5 h-8 px-2.5 rounded-md border font-sans text-body cursor-pointer text-left transition-all duration-fast ease w-full',
              currentRoute === 'settings'
                ? 'bg-muted text-foreground font-medium border-border shadow-xs'
                : 'bg-transparent text-muted-foreground font-regular border-transparent hover:bg-muted/50 hover:text-foreground'
            )}
            onClick={() => onRouteChange('settings')}
            aria-current={currentRoute === 'settings' ? 'page' : undefined}
          >
            {currentRoute === 'settings' && (
              <span
                className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-accent"
                aria-hidden="true"
              />
            )}
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={cn('flex items-center shrink-0', currentRoute === 'settings' ? 'text-accent' : 'text-text-3')}>
                <Settings size={15} strokeWidth={1.75} />
              </span>
              <span className="whitespace-nowrap overflow-hidden text-ellipsis">{t('nav.settings')}</span>
            </div>
            <Kbd className="opacity-75">Ctrl+,</Kbd>
          </button>

          <div className="mt-2 px-3 py-2.5 rounded-lg bg-card border border-border shadow-xs flex items-center justify-between">
            <StatusDot state={statusState} label={statusLabel} />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex flex-col flex-1 h-full min-w-0 overflow-hidden bg-background">
        <header className="flex items-center justify-between px-8 h-14 border-b border-border bg-card/85 backdrop-blur-md shrink-0">
          <h1 className="font-sans text-title font-semibold tracking-tight text-foreground">{headerTitle}</h1>
          {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
        </header>

        <section className="flex-1 overflow-y-auto px-8 py-6 flex flex-col items-start min-w-0">{children}</section>
      </main>

      <Toaster />
    </div>
  );
};
