import React from 'react';
import {
  LayoutDashboard,
  History,
  SlidersHorizontal,
  Folder,
  Settings,
  Palette,
} from 'lucide-react';
import { StatusDot, WatcherState } from '../StatusDot';
import { Toaster } from '../Toast';
import { useWatchStore } from '../../state/watchStore';
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
    { route: 'overview', label: t('nav.overview'), icon: <LayoutDashboard size={16} strokeWidth={1.5} /> },
    { route: 'activity', label: t('nav.activity'), icon: <History size={16} strokeWidth={1.5} /> },
    { route: 'rules', label: t('nav.rules'), icon: <SlidersHorizontal size={16} strokeWidth={1.5} /> },
    { route: 'folders', label: t('nav.folders'), icon: <Folder size={16} strokeWidth={1.5} /> },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-app">
      <aside className="w-sidebar min-w-sidebar max-w-sidebar h-full bg-bg-sidebar border-r border-border flex flex-col py-4 shrink-0 select-none">
        <div className="px-4 pb-4 flex items-center">
          <span className="font-sans text-subtitle font-semibold tracking-tight text-text-1">{t('nav.brand')}</span>
        </div>

        <nav className="flex flex-col gap-0.5 flex-1" aria-label="Main Navigation">
          {navItems.map(item => {
            const isSelected = currentRoute === item.route;
            return (
              <button
                key={item.route}
                type="button"
                className={`flex items-center gap-2 h-7 px-4 border-0 border-l-2 font-sans text-body cursor-pointer text-left transition-colors duration-fast ease w-full ${
                  isSelected
                    ? 'bg-bg-selected text-text-1 font-semibold border-l-accent'
                    : 'bg-transparent text-text-2 font-regular border-l-transparent hover:bg-bg-raised hover:text-text-1'
                }`}
                onClick={() => onRouteChange(item.route)}
                aria-current={isSelected ? 'page' : undefined}
              >
                <span className="flex items-center text-inherit shrink-0">{item.icon}</span>
                <span className="whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex flex-col gap-0.5 pt-2 border-t border-border-subtle">
          {isMockMode && (
            <button
              type="button"
              className={`flex items-center gap-2 h-7 px-4 border-0 border-l-2 font-sans text-body cursor-pointer text-left transition-colors duration-fast ease w-full ${
                currentRoute === 'styleguide'
                  ? 'bg-bg-selected text-text-1 font-semibold border-l-accent'
                  : 'bg-transparent text-text-2 font-regular border-l-transparent hover:bg-bg-raised hover:text-text-1'
              }`}
              onClick={() => onRouteChange('styleguide')}
              aria-current={currentRoute === 'styleguide' ? 'page' : undefined}
            >
              <span className="flex items-center text-inherit shrink-0">
                <Palette size={16} strokeWidth={1.5} />
              </span>
              <span className="whitespace-nowrap overflow-hidden text-ellipsis">Styleguide</span>
            </button>
          )}

          <button
            type="button"
            className={`flex items-center gap-2 h-7 px-4 border-0 border-l-2 font-sans text-body cursor-pointer text-left transition-colors duration-fast ease w-full ${
              currentRoute === 'settings'
                ? 'bg-bg-selected text-text-1 font-semibold border-l-accent'
                : 'bg-transparent text-text-2 font-regular border-l-transparent hover:bg-bg-raised hover:text-text-1'
            }`}
            onClick={() => onRouteChange('settings')}
            aria-current={currentRoute === 'settings' ? 'page' : undefined}
          >
            <span className="flex items-center text-inherit shrink-0">
              <Settings size={16} strokeWidth={1.5} />
            </span>
            <span className="whitespace-nowrap overflow-hidden text-ellipsis">{t('nav.settings')}</span>
          </button>

          <div className="px-4 pt-3 pb-1">
            <StatusDot state={statusState} label={statusLabel} />
          </div>
        </div>
      </aside>

      <main className="flex flex-col flex-1 h-full min-w-0 overflow-hidden bg-bg-app">
        <header className="flex items-center justify-between px-8 pt-6 pb-4 border-b border-border-subtle shrink-0">
          <h1 className="font-sans text-title font-semibold tracking-tight text-text-1">{headerTitle}</h1>
          {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
        </header>

        <section className="flex-1 overflow-y-auto px-8 py-6 flex flex-col items-start min-w-0">{children}</section>
      </main>

      <Toaster />
    </div>
  );
};
