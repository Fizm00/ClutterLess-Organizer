// SPDX-License-Identifier: AGPL-3.0-only
import React, { useState, useEffect } from 'react';
import { Play, Pause, FolderSync } from 'lucide-react';
import { AppShell, NavRoute } from './components/AppShell';
import { Button } from './components/Button';
import { toast } from './components/Toast';
import { Overview } from './screens/Overview';
import { Styleguide } from './screens/Styleguide';
import { useThemeStore } from './store/themeStore';
import { useWatchStore } from './state/watchStore';
import { useActivityStore } from './state/activityStore';
import { setupEventSubscriptions } from './state/events';
import { t } from './i18n';

export const App: React.FC = () => {
  const [route, setRoute] = useState<NavRoute>('overview');
  const { initTheme } = useThemeStore();
  const { running, start, stop } = useWatchStore();

  useEffect(() => {
    initTheme();
    useWatchStore.getState().init();
    useActivityStore.getState().init();
    const cleanup = setupEventSubscriptions();

    // Visual QA hooks for test automation
    if (typeof window !== 'undefined') {
      (window as any).__setEmptyOverview = () => {
        useActivityStore.setState({ recentActivity: [], needsAttention: [] });
        useWatchStore.setState({ configError: null, watcherLocked: false });
      };
      (window as any).__setErrorOverview = () => {
        useWatchStore.setState({
          configError: {
            path: 'C:/Users/Administrator/.config/cless/config.yaml',
            message: 'mapping values are not allowed in this context',
            line: 14,
          },
          watcherLocked: true,
        });
      };
      (window as any).__setNormalOverview = () => {
        useWatchStore.setState({ configError: null, watcherLocked: false });
        useWatchStore.getState().init();
        useActivityStore.getState().init();
      };
    }

    return () => cleanup();
  }, [initTheme]);

  const handleOrganizeNow = () => {
    toast.show(t('overview.organize_disabled_hint'));
  };

  const handleToggleWatch = async () => {
    if (running) {
      await stop();
    } else {
      await start();
    }
  };

  const renderContent = () => {
    switch (route) {
      case 'overview':
        return <Overview onNavigate={setRoute} onOrganizeNow={handleOrganizeNow} />;
      case 'activity':
        return (
          <div className="text-text-2">
            <p className="type-body">Activity history scaffold ready for Phase G4.</p>
          </div>
        );
      case 'rules':
        return (
          <div className="text-text-2">
            <p className="type-body">Rules management scaffold ready for Phase G5.</p>
          </div>
        );
      case 'folders':
        return (
          <div className="text-text-2">
            <p className="type-body">Folders management scaffold ready for Phase G5.</p>
          </div>
        );
      case 'settings':
        return (
          <div className="text-text-2">
            <p className="type-body">Settings scaffold ready for Phase G7.</p>
          </div>
        );
      case 'styleguide':
      default:
        return <Styleguide />;
    }
  };

  const getHeaderActions = () => {
    switch (route) {
      case 'overview':
        return (
          <>
            <Button variant="primary" onClick={handleOrganizeNow}>
              <FolderSync size={14} strokeWidth={1.75} />
              <span>{t('action.organize_now')}</span>
            </Button>
            <Button variant="secondary" onClick={handleToggleWatch}>
              {running ? (
                <>
                  <Pause size={14} strokeWidth={1.75} />
                  <span>{t('action.pause')}</span>
                </>
              ) : (
                <>
                  <Play size={14} strokeWidth={1.75} />
                  <span>{t('action.resume')}</span>
                </>
              )}
            </Button>
          </>
        );
      case 'rules':
        return <Button variant="primary">{t('action.new_rule')}</Button>;
      case 'folders':
        return <Button variant="primary">{t('action.add_folder')}</Button>;
      default:
        return undefined;
    }
  };

  const getTitle = () => {
    switch (route) {
      case 'overview':
        return t('title.overview');
      case 'activity':
        return t('title.activity');
      case 'rules':
        return t('title.rules');
      case 'folders':
        return t('title.folders');
      case 'settings':
        return t('title.settings');
      case 'styleguide':
        return t('title.styleguide');
    }
  };

  return (
    <AppShell
      currentRoute={route}
      onRouteChange={setRoute}
      headerTitle={getTitle()}
      headerActions={getHeaderActions()}
      isMockMode={true}
    >
      {renderContent()}
    </AppShell>
  );
};

export default App;
