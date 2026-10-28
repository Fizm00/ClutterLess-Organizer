import React from 'react';
import {
  LayoutDashboard,
  History,
  SlidersHorizontal,
  Folder,
  Settings,
  Palette,
  Layers,
  Sun,
  Moon,
  ChevronRight,
} from 'lucide-react';
import { StatusDot, WatcherState } from '../StatusDot';
import { Toaster } from '../Toast';
import { Kbd } from '../Kbd';
import { IconButton } from '../IconButton';
import { useWatchStore } from '../../state/watchStore';
import { useThemeStore } from '../../store/themeStore';
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
  const { resolvedTheme, setMode } = useThemeStore();

  let statusState: WatcherState = 'paused';
  let statusLabel = t('watch.status.paused');

  if (watcherLocked || configError) {
    statusState = 'error';
    statusLabel = t('watch.status.error');
  } else if (running) {
    statusState = 'watching';
    statusLabel = t('watch.status.watching', { count: folders.length });
  }

  const navItems: Array<{ route: NavRoute; label: string; icon: React.ReactNode; badge?: number }> = [
    {
      route: 'overview',
      label: t('nav.overview'),
      icon: <LayoutDashboard size={15} strokeWidth={1.75} />,
    },
    {
      route: 'activity',
      label: t('nav.activity'),
      icon: <History size={15} strokeWidth={1.75} />,
    },
    {
      route: 'rules',
      label: t('nav.rules'),
      icon: <SlidersHorizontal size={15} strokeWidth={1.75} />,
    },
    {
      route: 'folders',
      label: t('nav.folders'),
      icon: <Folder size={15} strokeWidth={1.75} />,
      badge: folders.length,
    },
  ];

  const toggleQuickTheme = () => {
    setMode(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-sidebar text-foreground p-2 gap-1">
      {/* Shadcn Inset Sidebar */}
      <aside className="w-sidebar min-w-sidebar max-w-sidebar h-full bg-bg-sidebar flex flex-col shrink-0 select-none px-1.5">
        {/* Sidebar Brand Card */}
        <div className="h-12 px-2.5 mb-2 rounded-lg flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground shadow-sm shrink-0">
              <Layers size={16} strokeWidth={2.25} />
            </span>
            <div className="flex flex-col">
              <span className="font-sans text-body font-semibold tracking-tight text-foreground leading-none">
                {t('nav.brand')}
              </span>
              <span className="font-mono text-caption text-text-3 mt-0.5 leading-none">
                Desktop Organizer
              </span>
            </div>
          </div>
          <span className="font-mono text-caption text-accent bg-accent/10 px-1.5 py-0.5 rounded-md border border-accent/25">
            v1.0
          </span>
        </div>

        {/* Workspace Navigation */}
        <div className="flex flex-col flex-1 py-1 gap-1">
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
                    'relative flex items-center justify-between gap-2.5 h-9 px-2.5 rounded-lg border font-sans text-body cursor-pointer text-left transition-all duration-fast ease w-full',
                    isSelected
                      ? 'bg-card text-foreground font-semibold border-border shadow-xs'
                      : 'bg-transparent text-muted-foreground font-regular border-transparent hover:bg-card/50 hover:text-foreground'
                  )}
                  onClick={() => onRouteChange(item.route)}
                  aria-current={isSelected ? 'page' : undefined}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={cn('flex items-center shrink-0', isSelected ? 'text-accent' : 'text-text-3')}>
                      {item.icon}
                    </span>
                    <span className="whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={cn(
                        'font-mono text-caption px-1.5 py-0.2 rounded-md border text-xs',
                        isSelected
                          ? 'bg-accent/15 text-accent border-accent/30'
                          : 'bg-muted text-text-3 border-border-subtle'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* System Footer & Watcher Status Card */}
        <div className="flex flex-col gap-1 pt-2 pb-1 border-t border-border-subtle">
          <span className="px-2.5 pb-0.5 font-sans text-caption font-semibold uppercase tracking-wider text-text-3">
            System
          </span>
          {isMockMode && (
            <button
              type="button"
              className={cn(
                'relative flex items-center gap-2.5 h-8.5 px-2.5 rounded-lg border font-sans text-body cursor-pointer text-left transition-all duration-fast ease w-full',
                currentRoute === 'styleguide'
                  ? 'bg-card text-foreground font-semibold border-border shadow-xs'
                  : 'bg-transparent text-muted-foreground font-regular border-transparent hover:bg-card/50 hover:text-foreground'
              )}
              onClick={() => onRouteChange('styleguide')}
              aria-current={currentRoute === 'styleguide' ? 'page' : undefined}
            >
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
              'relative flex items-center justify-between gap-2.5 h-8.5 px-2.5 rounded-lg border font-sans text-body cursor-pointer text-left transition-all duration-fast ease w-full',
              currentRoute === 'settings'
                ? 'bg-card text-foreground font-semibold border-border shadow-xs'
                : 'bg-transparent text-muted-foreground font-regular border-transparent hover:bg-card/50 hover:text-foreground'
            )}
            onClick={() => onRouteChange('settings')}
            aria-current={currentRoute === 'settings' ? 'page' : undefined}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={cn('flex items-center shrink-0', currentRoute === 'settings' ? 'text-accent' : 'text-text-3')}>
                <Settings size={15} strokeWidth={1.75} />
              </span>
              <span className="whitespace-nowrap overflow-hidden text-ellipsis">{t('nav.settings')}</span>
            </div>
            <Kbd className="opacity-75">Ctrl+,</Kbd>
          </button>

          {/* Rich Watcher Status Card */}
          <div className="mt-1.5 p-2.5 rounded-xl bg-card border border-border shadow-xs flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="font-mono text-caption uppercase tracking-wider text-text-3">
                Background Engine
              </span>
              <span
                className={cn(
                  'font-mono text-caption px-1.5 rounded-sm',
                  statusState === 'watching'
                    ? 'text-success bg-success/10'
                    : statusState === 'error'
                    ? 'text-danger bg-danger/10'
                    : 'text-text-3 bg-muted'
                )}
              >
                {statusState === 'watching' ? 'LIVE' : statusState === 'error' ? 'ERR' : 'IDLE'}
              </span>
            </div>
            <StatusDot state={statusState} label={statusLabel} />
          </div>
        </div>
      </aside>

      {/* Shadcn Inset Main Content Panel (Rounded-xl Elevated Surface) */}
      <main className="flex flex-col flex-1 h-full min-w-0 overflow-hidden bg-background rounded-xl border border-border shadow-elevation">
        <header className="flex items-center justify-between px-7 h-14 border-b border-border-subtle bg-card/60 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-sans text-small text-text-3 hidden sm:inline">Workspace</span>
            <ChevronRight size={13} className="text-text-3 hidden sm:inline" aria-hidden="true" />
            <h1 className="font-sans text-subtitle font-semibold tracking-tight text-foreground">
              {headerTitle}
            </h1>
          </div>
          <div className="flex items-center gap-2.5">
            {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
            <div className="h-4 w-px bg-border-subtle mx-0.5" aria-hidden="true" />
            <IconButton
              icon={
                resolvedTheme === 'dark' ? (
                  <Sun size={15} strokeWidth={1.75} />
                ) : (
                  <Moon size={15} strokeWidth={1.75} />
                )
              }
              label={t('settings.theme')}
              onClick={toggleQuickTheme}
            />
          </div>
        </header>

        <section className="flex-1 overflow-y-auto px-7 py-6 flex flex-col items-start min-w-0">
          {children}
        </section>
      </main>

      <Toaster />
    </div>
  );
};
