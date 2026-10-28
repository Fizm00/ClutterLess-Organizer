// SPDX-License-Identifier: AGPL-3.0-only
import React, { useEffect, useState } from 'react';
import { ExternalLink, RotateCcw, Download, FileText, FolderOpen } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TagInput } from '@/components/TagInput';
import { toast } from 'sonner';
import { api } from '@/api';
import { ConfigDTO, VersionInfo } from '@/api/types';
import { useThemeStore, ThemeMode } from '@/store/themeStore';
import { useLocaleStore, Locale, t } from '@/i18n';

export const Settings: React.FC = () => {
  const { mode: themeMode, setMode: setThemeMode } = useThemeStore();
  const { locale, setLocale } = useLocaleStore();

  const [config, setConfig] = useState<ConfigDTO | null>(null);
  const [versionInfo, setVersionInfo] = useState<VersionInfo>({
    version: '0.1.0-dev',
    commit: 'HEAD',
    buildDate: '2026-04-18',
  });
  const [autostart, setAutostartState] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadConfig = async () => {
    try {
      const cfg = await api.config.get();
      setConfig(cfg);
    } catch (err) {
      console.error('Failed to load config:', err);
    }

    try {
      const auto = await api.system.getAutostart();
      setAutostartState(auto);
    } catch {
      // ignore
    }

    try {
      const ver = await api.system.version();
      if (ver) {
        setVersionInfo(ver);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void loadConfig();
  }, []);

  const handleUpdateConfig = async (updater: (prev: ConfigDTO) => ConfigDTO) => {
    if (!config) return;
    const updated = updater(JSON.parse(JSON.stringify(config)));
    setConfig(updated);
    try {
      setSaving(true);
      await api.config.save(updated);
      toast(t('toast.settings_saved'));
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAutostart = async (checked: boolean) => {
    setAutostartState(checked);
    try {
      await api.system.setAutostart(checked);
      await handleUpdateConfig(prev => {
        prev.settings.autostart = checked;
        return prev;
      });
    } catch (err) {
      console.error('Failed to set autostart:', err);
    }
  };

  const handleOpenConfig = async () => {
    try {
      await api.system.openConfig();
    } catch (err) {
      console.error('Failed to open config:', err);
    }
  };

  const handleOpenHistory = async () => {
    try {
      await api.system.openHistory();
    } catch (err) {
      console.error('Failed to open history:', err);
    }
  };

  const handleExportConfig = () => {
    if (!config) return;
    try {
      const configStr = JSON.stringify(config, null, 2);
      const blob = new Blob([configStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'clutterless-config.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast(t('toast.config_exported'));
    } catch (err) {
      console.error('Failed to export config:', err);
    }
  };

  const handleResetToDefaults = async () => {
    try {
      await api.config.resetToDefaults();
      await loadConfig();
      setResetDialogOpen(false);
      toast(t('toast.config_reset'));
    } catch (err) {
      console.error('Failed to reset defaults:', err);
    }
  };

  const settings = config?.settings;

  return (
    <div className="w-full max-w-xl flex flex-col gap-6 pb-12" data-testid="settings-screen">
      {/* 1. Appearance Section */}
      <section className="flex flex-col gap-2" aria-labelledby="heading-appearance">
        <div className="flex flex-col gap-0.5">
          <h2 id="heading-appearance" className="text-sm font-medium text-foreground">
            {t('settings.appearance')}
          </h2>
          <p className="text-xs text-muted-foreground">{t('settings.appearance_desc')}</p>
        </div>

        <div className="flex flex-col divide-y border-t mt-1">
          {/* Theme Row */}
          <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">{t('settings.theme')}</span>
              <span className="text-sm text-muted-foreground">{t('settings.theme_desc')}</span>
            </div>
            <Tabs
              value={themeMode}
              onValueChange={val => setThemeMode(val as ThemeMode)}
            >
              <TabsList aria-label={t('settings.theme')}>
                <TabsTrigger value="dark">{t('settings.theme.dark')}</TabsTrigger>
                <TabsTrigger value="light">{t('settings.theme.light')}</TabsTrigger>
                <TabsTrigger value="system">{t('settings.theme.system')}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Language Row */}
          <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">{t('settings.language')}</span>
              <span className="text-sm text-muted-foreground">{t('settings.language_desc')}</span>
            </div>
            <Tabs
              value={locale}
              onValueChange={val => setLocale(val as Locale)}
            >
              <TabsList aria-label={t('settings.language')}>
                <TabsTrigger value="en">{t('settings.language.en')}</TabsTrigger>
                <TabsTrigger value="id">{t('settings.language.id')}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </section>

      <Separator />

      {/* 2. Behavior Section */}
      <section className="flex flex-col gap-2" aria-labelledby="heading-behavior">
        <div className="flex flex-col gap-0.5">
          <h2 id="heading-behavior" className="text-sm font-medium text-foreground">
            {t('settings.behavior')}
          </h2>
          <p className="text-xs text-muted-foreground">{t('settings.behavior_desc')}</p>
        </div>

        <div className="flex flex-col divide-y border-t mt-1">
          {/* Stable After Seconds Row */}
          <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <label htmlFor="input-stable-after" className="text-sm font-medium text-foreground">
                {t('settings.stable_after')}
              </label>
              <span className="text-sm text-muted-foreground">{t('settings.stable_after_desc')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                id="input-stable-after"
                type="number"
                min={1}
                max={60}
                value={settings?.stableAfterSeconds ?? 3}
                disabled={saving || !settings}
                onChange={e => {
                  const val = Math.max(1, Math.min(60, parseInt(e.target.value, 10) || 1));
                  void handleUpdateConfig(prev => {
                    prev.settings.stableAfterSeconds = val;
                    return prev;
                  });
                }}
                className="w-20 text-center"
              />
              <span className="text-sm text-muted-foreground">sec</span>
            </div>
          </div>

          {/* Conflict Resolution Row */}
          <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">{t('settings.conflict')}</span>
              <span className="text-sm text-muted-foreground">{t('settings.conflict_desc')}</span>
            </div>
            <Tabs
              value={(settings?.conflict as 'rename' | 'skip') || 'rename'}
              onValueChange={val => {
                void handleUpdateConfig(prev => {
                  prev.settings.conflict = val as 'rename' | 'skip';
                  return prev;
                });
              }}
            >
              <TabsList aria-label={t('settings.conflict')}>
                <TabsTrigger value="rename">{t('settings.conflict.rename')}</TabsTrigger>
                <TabsTrigger value="skip">{t('settings.conflict.skip')}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Ignore Hidden Files Row */}
          <div className="py-3.5 flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">
                {t('settings.ignore_hidden')}
              </span>
              <span className="text-sm text-muted-foreground">
                {t('settings.ignore_hidden_desc')}
              </span>
            </div>
            <Switch
              id="setting-ignore-hidden"
              checked={settings?.ignoreHidden ?? true}
              disabled={saving || !settings}
              onCheckedChange={checked => {
                void handleUpdateConfig(prev => {
                  prev.settings.ignoreHidden = checked;
                  return prev;
                });
              }}
              data-testid="switch-ignore-hidden"
            />
          </div>

          {/* Ignored Extensions Row */}
          <div className="py-3.5 flex flex-col gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">{t('settings.ignore_ext')}</span>
              <span className="text-sm text-muted-foreground">{t('settings.ignore_ext_desc')}</span>
            </div>
            <TagInput
              tags={settings?.ignoreExt ?? []}
              placeholder="e.g. tmp, crdownload..."
              aria-label={t('settings.ignore_ext')}
              disabled={saving || !settings}
              onChange={newTags => {
                void handleUpdateConfig(prev => {
                  prev.settings.ignoreExt = newTags;
                  return prev;
                });
              }}
            />
          </div>

          {/* Ignored Names Row */}
          <div className="py-3.5 flex flex-col gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">{t('settings.ignore_names')}</span>
              <span className="text-sm text-muted-foreground">{t('settings.ignore_names_desc')}</span>
            </div>
            <TagInput
              tags={settings?.ignoreNames ?? []}
              placeholder="e.g. desktop.ini, .DS_Store..."
              aria-label={t('settings.ignore_names')}
              disabled={saving || !settings}
              onChange={newTags => {
                void handleUpdateConfig(prev => {
                  prev.settings.ignoreNames = newTags;
                  return prev;
                });
              }}
            />
          </div>
        </div>
      </section>

      <Separator />

      {/* 3. System Section */}
      <section
        className="flex flex-col gap-2"
        aria-labelledby="heading-system"
        data-testid="settings-system-section"
      >
        <div className="flex flex-col gap-0.5">
          <h2 id="heading-system" className="text-sm font-medium text-foreground">
            {t('settings.system_title')}
          </h2>
          <p className="text-xs text-muted-foreground">{t('settings.system_desc')}</p>
        </div>

        <div className="flex flex-col divide-y border-t mt-1">
          {/* Autostart Row */}
          <div className="py-3.5 flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">{t('settings.autostart')}</span>
              <span className="text-sm text-muted-foreground">{t('settings.autostart_desc')}</span>
            </div>
            <Switch
              id="setting-autostart"
              checked={autostart}
              onCheckedChange={handleToggleAutostart}
              data-testid="switch-autostart"
            />
          </div>

          {/* Notifications Row */}
          <div className="py-3.5 flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">
                {t('settings.notifications')}
              </span>
              <span className="text-sm text-muted-foreground">
                {t('settings.notifications_desc')}
              </span>
            </div>
            <Switch
              id="setting-notifications"
              checked={settings?.notificationsEnabled ?? false}
              disabled={saving || !settings}
              onCheckedChange={checked => {
                void handleUpdateConfig(prev => {
                  prev.settings.notificationsEnabled = checked;
                  return prev;
                });
              }}
              data-testid="switch-notifications"
            />
          </div>

          {/* Close to Tray Row */}
          <div className="py-3.5 flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">
                {t('settings.close_to_tray')}
              </span>
              <span className="text-sm text-muted-foreground">
                {t('settings.close_to_tray_desc')}
              </span>
            </div>
            <Switch
              id="setting-close-to-tray"
              checked={settings?.closeToTray ?? true}
              disabled={saving || !settings}
              onCheckedChange={checked => {
                void handleUpdateConfig(prev => {
                  prev.settings.closeToTray = checked;
                  return prev;
                });
              }}
              data-testid="switch-close-to-tray"
            />
          </div>
        </div>
      </section>

      <Separator />

      {/* 4. Data Section */}
      <section className="flex flex-col gap-2" aria-labelledby="heading-data">
        <div className="flex flex-col gap-0.5">
          <h2 id="heading-data" className="text-sm font-medium text-foreground">
            {t('settings.data')}
          </h2>
          <p className="text-xs text-muted-foreground">{t('settings.data_desc')}</p>
        </div>

        <div className="flex flex-col divide-y border-t mt-1">
          {/* Open Config File Row */}
          <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">{t('settings.open_config')}</span>
              <span className="text-sm text-muted-foreground">{t('settings.open_config_desc')}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenConfig}
              aria-label={t('settings.open_config')}
            >
              <FolderOpen className="size-4 text-muted-foreground" />
              <span>{t('action.open_config')}</span>
            </Button>
          </div>

          {/* Open History Log Row */}
          <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">
                {t('settings.open_history')}
              </span>
              <span className="text-sm text-muted-foreground">
                {t('settings.open_history_desc')}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenHistory}
              aria-label={t('settings.open_history')}
            >
              <FileText className="size-4 text-muted-foreground" />
              <span>{t('action.open_file')}</span>
            </Button>
          </div>

          {/* Export Config Row */}
          <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">
                {t('settings.export_config')}
              </span>
              <span className="text-sm text-muted-foreground">
                {t('settings.export_config_desc')}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportConfig}
              aria-label={t('settings.export_config')}
            >
              <Download className="size-4 text-muted-foreground" />
              <span>{t('action.export')}</span>
            </Button>
          </div>

          {/* Reset to Defaults Row (Destructive fill only inside confirm dialog per C.6) */}
          <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">
                {t('settings.reset_defaults')}
              </span>
              <span className="text-sm text-muted-foreground">
                {t('settings.reset_defaults_desc')}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResetDialogOpen(true)}
              aria-label={t('settings.reset_defaults')}
              data-testid="btn-reset-defaults"
            >
              <RotateCcw className="size-4 text-muted-foreground" />
              <span>{t('action.reset_defaults')}</span>
            </Button>
          </div>
        </div>
      </section>

      <Separator />

      {/* 5. About Section */}
      <section className="flex flex-col gap-2" aria-labelledby="heading-about">
        <div className="flex flex-col gap-0.5">
          <h2 id="heading-about" className="text-sm font-medium text-foreground">
            {t('settings.about')}
          </h2>
          <p className="text-xs text-muted-foreground">{t('settings.about_desc')}</p>
        </div>

        <div className="flex flex-col divide-y border-t mt-1 text-sm">
          <div className="py-3 flex items-center justify-between gap-4">
            <span className="text-muted-foreground">{t('settings.version')}</span>
            <span className="text-foreground">{versionInfo.version}</span>
          </div>

          <div className="py-3 flex items-center justify-between gap-4">
            <span className="text-muted-foreground">{t('settings.commit')}</span>
            <span className="text-foreground">{versionInfo.commit}</span>
          </div>

          <div className="py-3 flex items-center justify-between gap-4">
            <span className="text-muted-foreground">{t('settings.build_date')}</span>
            <span className="text-foreground">{versionInfo.buildDate}</span>
          </div>

          <div className="py-3 flex items-center justify-between gap-4">
            <span className="text-muted-foreground">{t('settings.license')}</span>
            <span className="text-foreground">{t('settings.license_name')}</span>
          </div>

          <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-muted-foreground">{t('settings.links')}</span>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/aifrak/clutterless"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-foreground underline-offset-4 hover:underline"
              >
                <span>{t('settings.link_repo')}</span>
                <ExternalLink className="size-3.5 text-muted-foreground" />
              </a>
              <a
                href="file:///THIRD_PARTY_LICENSES.md"
                onClick={e => {
                  e.preventDefault();
                  void api.system.revealPath('THIRD_PARTY_LICENSES.md');
                }}
                className="inline-flex items-center gap-1 text-foreground underline-offset-4 hover:underline"
              >
                <span>{t('settings.link_licenses')}</span>
                <ExternalLink className="size-3.5 text-muted-foreground" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Reset Confirmation Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.reset_confirm_title')}</DialogTitle>
            <DialogDescription>{t('settings.reset_confirm_desc')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
              {t('action.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleResetToDefaults()}
              data-testid="btn-confirm-reset"
            >
              {t('settings.reset_confirm_button')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
