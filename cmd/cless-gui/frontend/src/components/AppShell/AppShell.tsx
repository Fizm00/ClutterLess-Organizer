import React from 'react';
import {
  LayoutDashboard,
  History,
  SlidersHorizontal,
  Folder,
  Settings,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Toaster } from '@/components/ui/sonner';
import { StatusDot, WatcherState } from '../StatusDot';
import { Kbd } from '../Kbd';
import { useWatchStore } from '@/state/watchStore';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';

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
    {
      route: 'overview',
      label: t('nav.overview'),
      icon: <LayoutDashboard className="size-4 text-muted-foreground" />,
    },
    {
      route: 'activity',
      label: t('nav.activity'),
      icon: <History className="size-4 text-muted-foreground" />,
    },
    {
      route: 'rules',
      label: t('nav.rules'),
      icon: <SlidersHorizontal className="size-4 text-muted-foreground" />,
    },
    {
      route: 'folders',
      label: t('nav.folders'),
      icon: <Folder className="size-4 text-muted-foreground" />,
    },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Narrow Sidebar built from shadcn Button ghost primitives */}
      <aside className="w-52 shrink-0 border-r bg-sidebar text-sidebar-foreground flex flex-col select-none">
        {/* Brand Header: Logo (only place with cyan brand color) + Name */}
        <div className="flex items-center gap-2.5 h-14 px-4 shrink-0">
          <Layers className="size-4 text-brand shrink-0" />
          <span className="text-sm font-semibold tracking-tight text-foreground">
            {t('nav.brand')}
          </span>
        </div>

        {/* Primary Navigation */}
        <nav className="flex flex-col flex-1 px-2 py-1 gap-0.5" aria-label="Main Navigation">
          {navItems.map(item => {
            const isSelected = currentRoute === item.route;
            return (
              <Button
                key={item.route}
                type="button"
                variant="ghost"
                size="sm"
                data-testid={`nav-${item.route}`}
                className={cn(
                  'w-full justify-start gap-2.5 px-2.5 font-normal',
                  isSelected
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                onClick={() => onRouteChange(item.route)}
                aria-current={isSelected ? 'page' : undefined}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </Button>
            );
          })}
        </nav>

        {/* Sidebar Footer: Watcher Status Line + Settings */}
        <div className="flex flex-col gap-1 p-2 border-t">
          <div className="px-2.5 py-1.5">
            <StatusDot state={statusState} label={statusLabel} />
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-testid="nav-settings"
            className={cn(
              'w-full justify-between px-2.5 font-normal',
              currentRoute === 'settings'
                ? 'bg-accent text-accent-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => onRouteChange('settings')}
            aria-current={currentRoute === 'settings' ? 'page' : undefined}
          >
            <span className="flex items-center gap-2.5 truncate">
              <Settings className="size-4 text-muted-foreground shrink-0" />
              <span className="truncate">{t('nav.settings')}</span>
            </span>
            <Kbd>Ctrl+,</Kbd>
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex flex-col flex-1 h-full min-w-0 overflow-hidden bg-background">
        <header className="flex items-center justify-between px-6 h-14 shrink-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {headerTitle}
          </h1>
          {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
        </header>
        <Separator />

        <section className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 items-start min-w-0">
          {children}
        </section>
      </main>

      <Toaster position="bottom-right" />
    </div>
  );
};
