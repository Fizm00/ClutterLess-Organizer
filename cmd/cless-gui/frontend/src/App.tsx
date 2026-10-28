// SPDX-License-Identifier: AGPL-3.0-only
import React, { useState, useEffect } from 'react';
import { Play, Pause, FolderSync, Plus, FolderPlus } from 'lucide-react';
import { AppShell, NavRoute } from './components/AppShell';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Kbd } from './components/Kbd';
import { Overview } from './screens/Overview';
import { Activity } from './screens/Activity';
import { Rules } from './screens/Rules';
import { Folders } from './screens/Folders';
import { PreviewSheet } from './screens/Preview';
import { UndoDialog } from './components/UndoDialog';
import { Styleguide } from './screens/Styleguide';
import { Onboarding } from './screens/Onboarding';
import { Settings } from './screens/Settings';
import { useThemeStore } from './store/themeStore';
import { useWatchStore } from './state/watchStore';
import { useActivityStore } from './state/activityStore';
import { useRulesStore } from './state/rulesStore';
import { useFoldersStore } from './state/foldersStore';
import { useOnboardingStore } from './state/onboardingStore';
import { setupEventSubscriptions } from './state/events';
import { useLocaleStore, t } from './i18n';
import { toast } from 'sonner';

export const App: React.FC = () => {
  const [route, setRoute] = useState<NavRoute>(() => {
    if (
      typeof window !== 'undefined' &&
      (window.location.pathname === '/styleguide' || window.location.hash === '#/styleguide')
    ) {
      return 'styleguide';
    }
    return 'overview';
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [undoBatchId, setUndoBatchId] = useState<string | null>(null);
  const { initTheme } = useThemeStore();
  useLocaleStore(s => s.locale);
  const { running, start, stop } = useWatchStore();
  const { isFirstRun } = useOnboardingStore();

  useEffect(() => {
    initTheme();
    useOnboardingStore.getState().checkFirstRun();
    useWatchStore.getState().init();
    useActivityStore.getState().init();
    const cleanup = setupEventSubscriptions();

    // Global keyboard shortcuts (DESIGN.md section 9)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'O' || e.key === 'o')) {
        e.preventDefault();
        setPreviewOpen(true);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setRoute('settings');
        return;
      }
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
      (window as any).__setRoute = (r: NavRoute) => setRoute(r);
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
      (window as any).__setEmptyRules = () => {
        useRulesStore.setState({ rules: [] });
      };
      (window as any).__setManyRules = () => {
        const dummyRules = Array.from({ length: 25 }, (_, i) => ({
          name: `Rule ${i + 1}`,
          disabled: i % 5 === 0,
          moveTo: `~/Sorted/Category_${(i % 5) + 1}/{year}`,
          match: { ext: ['jpg', 'png', 'pdf'] },
        }));
        useRulesStore.setState({ rules: dummyRules });
      };
      (window as any).__setLongNameRule = () => {
        useRulesStore.setState({
          rules: [
            {
              name: 'Quarterly Corporate Enterprise Financial Audit Reconciliation Reports Rule 2026',
              disabled: false,
              moveTo:
                'C:/Users/Administrator/Documents/Corporate_Enterprise_Financial_Records/2026/Q1_Audits/Reconciliations/Finalized/{year}-{month}',
              match: {
                nameRegex:
                  '(?i)(quarterly_financial_audit_reconciliation_report_final_v2_approved_signed)',
                ext: ['pdf', 'xlsx'],
              },
            },
          ],
        });
      };
      (window as any).__openNewRuleEditor = () => {
        useRulesStore.getState().openEditor();
      };
      (window as any).__openEditRuleEditor = () => {
        const rules = useRulesStore.getState().rules;
        if (rules.length > 0) {
          useRulesStore.getState().openEditor(rules[0]);
        }
      };
      (window as any).__setRecursiveWarningFolders = () => {
        useFoldersStore.setState({
          folders: [
            { path: '~/Downloads', recursive: true },
            { path: '~/Desktop', recursive: false },
          ],
          warnings: [
            {
              folderPath: '~/Downloads',
              ruleName: 'Archives',
              moveTo: '~/Downloads/_Archives',
              message:
                'Rule "Archives" destination (~/Downloads/_Archives) is inside this recursive folder.',
            },
          ],
          fileCounts: {
            '~/Downloads': 42,
            '~/Desktop': 8,
          },
        });
      };
      (window as any).__showOnboardingStep = (step: 1 | 2 | 3) => {
        useOnboardingStore.setState({ isFirstRun: true, step });
      };
      (window as any).__hideOnboarding = () => {
        useOnboardingStore.setState({ isFirstRun: false });
      };
      (window as any).__showCloseToTrayToast = () => {
        toast(t('toast.close_to_tray'));
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
        return <Rules />;
      case 'folders':
        return <Folders />;
      case 'settings':
        return <Settings />;
      case 'styleguide':
      default:
        return <Styleguide />;
    }
  };

  const getHeaderActions = () => {
    switch (route) {
      case 'overview':
        return (
          <TooltipProvider delayDuration={300}>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleWatch}
              aria-label={running ? t('action.pause') : t('action.resume')}
            >
              {running ? (
                <>
                  <Pause className="size-4 text-muted-foreground" />
                  <span>{t('action.pause')}</span>
                </>
              ) : (
                <>
                  <Play className="size-4 text-muted-foreground" />
                  <span>{t('action.resume')}</span>
                </>
              )}
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleOrganizeNow}
                  aria-label={t('action.organize_now')}
                >
                  <FolderSync className="size-4" />
                  <span>{t('action.organize_now')}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <span className="inline-flex items-center gap-1.5">
                  {t('action.organize_now')} <Kbd>Ctrl+Shift+O</Kbd>
                </span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'activity':
        return (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOrganizeNow}
                  aria-label={t('action.organize_now')}
                >
                  <FolderSync className="size-4 text-muted-foreground" />
                  <span>{t('action.organize_now')}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <span className="inline-flex items-center gap-1.5">
                  {t('action.organize_now')} <Kbd>Ctrl+Shift+O</Kbd>
                </span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'rules':
        return (
          <Button variant="default" size="sm" onClick={() => useRulesStore.getState().openEditor()}>
            <Plus className="size-4" />
            <span>{t('action.new_rule')}</span>
          </Button>
        );
      case 'folders':
        return (
          <Button variant="default" size="sm" onClick={() => void useFoldersStore.getState().addFolder()}>
            <FolderPlus className="size-4" />
            <span>{t('action.add_folder')}</span>
          </Button>
        );
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

  if (isFirstRun) {
    return <Onboarding />;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <AppShell
        currentRoute={route}
        onRouteChange={setRoute}
        headerTitle={getTitle()}
        headerActions={getHeaderActions()}
      >
        {renderContent()}
      </AppShell>

      <PreviewSheet
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onUndoRequest={batchId => setUndoBatchId(batchId)}
      />

      <UndoDialog
        batchId={undoBatchId}
        open={!!undoBatchId}
        onOpenChange={open => {
          if (!open) setUndoBatchId(null);
        }}
      />
    </TooltipProvider>
  );
};

export default App;
