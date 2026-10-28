// SPDX-License-Identifier: AGPL-3.0-only
import React, { useState, useEffect } from 'react';
import { Play, Pause, FolderSync } from 'lucide-react';
import { AppShell, NavRoute } from './components/AppShell';
import { Button } from './components/Button';
import { Overview } from './screens/Overview';
import { Activity } from './screens/Activity';
import { PreviewSheet } from './screens/Preview';
import { UndoDialog } from './components/UndoDialog';
import { Styleguide } from './screens/Styleguide';
import { useThemeStore } from './store/themeStore';
import { useWatchStore } from './state/watchStore';
import { useActivityStore } from './state/activityStore';
import { setupEventSubscriptions } from './state/events';
import { t } from './i18n';

export const App: React.FC = () => {
  const [route, setRoute] = useState<NavRoute>('overview');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [undoBatchId, setUndoBatchId] = useState<string | null>(null);
  const { initTheme } = useThemeStore();
  const { running, start, stop } = useWatchStore();

  useEffect(() => {
    initTheme();
    useWatchStore.getState().init();
    useActivityStore.getState().init();
    const cleanup = setupEventSubscriptions();

    // Global keyboard shortcuts (DESIGN.md section 9)
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+O: Organize now
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'O' || e.key === 'o')) {
        e.preventDefault();
        setPreviewOpen(true);
        return;
      }
      // Ctrl+,: Settings
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setRoute('settings');
        return;
      }
      // Ctrl+Z on Activity: Undo last batch
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z') && route === 'activity') {
        const batches = useActivityStore.getState().batches;
        const lastActiveBatch = batches.find(b => !b.allUndone);
        if (lastActiveBatch) {
          e.preventDefault();
          setUndoBatchId(lastActiveBatch.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

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
      (window as any).__openPreview = () => setPreviewOpen(true);
      (window as any).__openUndo = (id = 'batch-20260418-142200') => setUndoBatchId(id);
      (window as any).__setEmptyActivity = () => {
        useActivityStore.setState({ batches: [], batchDetails: {} });
      };
      (window as any).__setManyBatches = (count = 100) => {
        const dummyBatches = Array.from({ length: count }, (_, i) => ({
          id: `batch-mock-${20260000 + i}`,
          time: new Date(Date.now() - i * 3600000).toISOString(),
          total: (i % 5) + 1,
          moved: (i % 5) + 1,
          undone: 0,
          allUndone: i % 4 === 0,
        }));
        useActivityStore.setState({ batches: dummyBatches });
      };
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      cleanup();
    };
  }, [initTheme, route]);

  const handleOrganizeNow = () => {
    setPreviewOpen(true);
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
        return <Activity onOrganizeNow={handleOrganizeNow} />;
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
      case 'activity':
        return (
          <Button variant="secondary" onClick={handleOrganizeNow}>
            <FolderSync size={14} strokeWidth={1.75} />
            <span>{t('action.organize_now')}</span>
          </Button>
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
    <>
      <AppShell
        currentRoute={route}
        onRouteChange={setRoute}
        headerTitle={getTitle()}
        headerActions={getHeaderActions()}
        isMockMode={true}
      >
        {renderContent()}
      </AppShell>

      {/* Preview Sheet (DESIGN.md 7.3) */}
      <PreviewSheet
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onUndoRequest={batchId => setUndoBatchId(batchId)}
      />

      {/* Undo Confirmation Dialog (DESIGN.md 7.2) */}
      <UndoDialog
        batchId={undoBatchId}
        open={!!undoBatchId}
        onOpenChange={open => {
          if (!open) setUndoBatchId(null);
        }}
      />
    </>
  );
};

export default App;
