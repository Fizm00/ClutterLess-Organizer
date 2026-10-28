// SPDX-License-Identifier: AGPL-3.0-only
import React, { useEffect, useState } from 'react';
import { ExternalLink, RotateCcw, Download, FileText, FolderOpen } from 'lucide-react';
import { Switch } from '../../components/Switch';
import { Button } from '../../components/Button';
import { SegmentedControl } from '../../components/SegmentedControl';
import { TagInput } from '../../components/TagInput';
import { Dialog } from '../../components/Dialog';
import { api } from '../../api';
import { ConfigDTO, VersionInfo } from '../../api/types';
import { useThemeStore, ThemeMode } from '../../store/themeStore';
import { useLocaleStore, Locale, t } from '../../i18n';

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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load config & system metadata
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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 3000);
  };

  const handleUpdateConfig = async (updater: (prev: ConfigDTO) => ConfigDTO) => {
    if (!config) return;
    const updated = updater(JSON.parse(JSON.stringify(config)));
    setConfig(updated);
    try {
      setSaving(true);
      await api.config.save(updated);
      showToast(t('toast.settings_saved'));
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
      // Export config as clean JSON / YAML formatting
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
      showToast(t('toast.config_exported'));
    } catch (err) {
      console.error('Failed to export config:', err);
    }
  };

  const handleResetToDefaults = async () => {
    try {
      await api.config.resetToDefaults();
      await loadConfig();
      setResetDialogOpen(false);
      showToast(t('toast.config_reset'));
    } catch (err) {
      console.error('Failed to reset defaults:', err);
    }
  };

  const settings = config?.settings;

  return (
    <div className="w-full max-w-3xl flex flex-col gap-10 pb-16" data-testid="settings-screen">
      {/* Toast notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 right-4 z-50 bg-bg-surface border border-border shadow-elevation rounded-sm p-3 flex items-center gap-3 text-small text-text-1 animate-in fade-in slide-in-from-bottom-2"
          data-testid="settings-toast"
        >
          <div className="w-2 h-2 rounded-full bg-accent" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Appearance Section */}
      <section className="flex flex-col gap-3" aria-labelledby="heading-appearance">
        <div className="flex flex-col gap-0.5">
          <h2 id="heading-appearance" className="text-title font-semibold text-text-1">
            {t('settings.appearance')}
          </h2>
          <p className="text-small text-text-3">{t('settings.appearance_desc')}</p>
        </div>

        <div className="flex flex-col divide-y divide-border-subtle border-y border-border-subtle">
          {/* Theme Row */}
          <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-body font-medium text-text-1">{t('settings.theme')}</span>
              <span className="text-small text-text-2">{t('settings.theme_desc')}</span>
            </div>
            <SegmentedControl<ThemeMode>
              ariaLabel={t('settings.theme')}
              value={themeMode}
              onChange={setThemeMode}
              options={[
                { value: 'dark', label: t('settings.theme.dark') },
                { value: 'light', label: t('settings.theme.light') },
                { value: 'system', label: t('settings.theme.system') },
              ]}
              className="self-start sm:self-center"
            />
          </div>

          {/* Language Row */}
          <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-body font-medium text-text-1">{t('settings.language')}</span>
              <span className="text-small text-text-2">{t('settings.language_desc')}</span>
            </div>
            <SegmentedControl<Locale>
              ariaLabel={t('settings.language')}
              value={locale}
              onChange={setLocale}
              options={[
                { value: 'en', label: t('settings.language.en') },
                { value: 'id', label: t('settings.language.id') },
              ]}
              className="self-start sm:self-center"
            />
          </div>
        </div>
      </section>

      {/* 2. Behavior Section */}
      <section className="flex flex-col gap-3" aria-labelledby="heading-behavior">
        <div className="flex flex-col gap-0.5">
          <h2 id="heading-behavior" className="text-title font-semibold text-text-1">
            {t('settings.behavior')}
          </h2>
          <p className="text-small text-text-3">{t('settings.behavior_desc')}</p>
        </div>

        <div className="flex flex-col divide-y divide-border-subtle border-y border-border-subtle">
          {/* Stable After Seconds Row */}
          <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <label htmlFor="input-stable-after" className="text-body font-medium text-text-1">
                {t('settings.stable_after')}
              </label>
              <span className="text-small text-text-2">{t('settings.stable_after_desc')}</span>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-center">
              <input
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
                className="w-20 px-3 py-1 text-center font-mono text-small bg-bg-surface border border-border rounded-md text-text-1 focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <span className="text-small text-text-3 font-sans">sec</span>
            </div>
          </div>

          {/* Conflict Resolution Row */}
          <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-body font-medium text-text-1">{t('settings.conflict')}</span>
              <span className="text-small text-text-2">{t('settings.conflict_desc')}</span>
            </div>
            <SegmentedControl<'rename' | 'skip'>
              ariaLabel={t('settings.conflict')}
              value={(settings?.conflict as 'rename' | 'skip') || 'rename'}
              onChange={val => {
                void handleUpdateConfig(prev => {
                  prev.settings.conflict = val;
                  return prev;
                });
              }}
              options={[
                { value: 'rename', label: t('settings.conflict.rename') },
                { value: 'skip', label: t('settings.conflict.skip') },
              ]}
              className="self-start sm:self-center"
            />
          </div>

          {/* Ignore Hidden Files Row */}
          <div className="py-4 flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-body font-medium text-text-1">
                {t('settings.ignore_hidden')}
              </span>
              <span className="text-small text-text-2">
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
          <div className="py-4 flex flex-col gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-body font-medium text-text-1">{t('settings.ignore_ext')}</span>
              <span className="text-small text-text-2">{t('settings.ignore_ext_desc')}</span>
            </div>
            <div className="pt-1">
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
          </div>

          {/* Ignored Names Row */}
          <div className="py-4 flex flex-col gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-body font-medium text-text-1">{t('settings.ignore_names')}</span>
              <span className="text-small text-text-2">{t('settings.ignore_names_desc')}</span>
            </div>
            <div className="pt-1">
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
        </div>
      </section>

      {/* 3. System Section */}
      <section className="flex flex-col gap-3" aria-labelledby="heading-system" data-testid="settings-system-section">
        <div className="flex flex-col gap-0.5">
          <h2 id="heading-system" className="text-title font-semibold text-text-1">
            {t('settings.system_title')}
          </h2>
          <p className="text-small text-text-3">{t('settings.system_desc')}</p>
        </div>

        <div className="flex flex-col divide-y divide-border-subtle border-y border-border-subtle">
          {/* Autostart Row */}
          <div className="py-4 flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-body font-medium text-text-1">{t('settings.autostart')}</span>
              <span className="text-small text-text-2">{t('settings.autostart_desc')}</span>
            </div>
            <Switch
              id="setting-autostart"
              checked={autostart}
              onCheckedChange={handleToggleAutostart}
              data-testid="switch-autostart"
            />
          </div>

          {/* Notifications Row */}
          <div className="py-4 flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-body font-medium text-text-1">
                {t('settings.notifications')}
              </span>
              <span className="text-small text-text-2">
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
          <div className="py-4 flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-body font-medium text-text-1">
                {t('settings.close_to_tray')}
              </span>
              <span className="text-small text-text-2">
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

      {/* 4. Data Section */}
      <section className="flex flex-col gap-3" aria-labelledby="heading-data">
        <div className="flex flex-col gap-0.5">
          <h2 id="heading-data" className="text-title font-semibold text-text-1">
            {t('settings.data')}
          </h2>
          <p className="text-small text-text-3">{t('settings.data_desc')}</p>
        </div>

        <div className="flex flex-col divide-y divide-border-subtle border-y border-border-subtle">
          {/* Open Config File Row */}
          <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-body font-medium text-text-1">{t('settings.open_config')}</span>
              <span className="text-small text-text-2">{t('settings.open_config_desc')}</span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleOpenConfig}
              className="self-start sm:self-center"
              aria-label={t('settings.open_config')}
            >
              <FolderOpen size={14} strokeWidth={1.5} className="mr-1.5" />
              <span>{t('action.open_config')}</span>
            </Button>
          </div>

          {/* Open History Log Row */}
          <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-body font-medium text-text-1">
                {t('settings.open_history')}
              </span>
              <span className="text-small text-text-2">
                {t('settings.open_history_desc')}
              </span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleOpenHistory}
              className="self-start sm:self-center"
              aria-label={t('settings.open_history')}
            >
              <FileText size={14} strokeWidth={1.5} className="mr-1.5" />
              <span>{t('action.open_file')}</span>
            </Button>
          </div>

          {/* Export Config Row */}
          <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-body font-medium text-text-1">
                {t('settings.export_config')}
              </span>
              <span className="text-small text-text-2">
                {t('settings.export_config_desc')}
              </span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportConfig}
              className="self-start sm:self-center"
              aria-label={t('settings.export_config')}
            >
              <Download size={14} strokeWidth={1.5} className="mr-1.5" />
              <span>{t('action.export')}</span>
            </Button>
          </div>

          {/* Reset to Defaults Row */}
          <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-body font-medium text-text-danger">
                {t('settings.reset_defaults')}
              </span>
              <span className="text-small text-text-2">
                {t('settings.reset_defaults_desc')}
              </span>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setResetDialogOpen(true)}
              className="self-start sm:self-center"
              aria-label={t('settings.reset_defaults')}
              data-testid="btn-reset-defaults"
            >
              <RotateCcw size={14} strokeWidth={1.5} className="mr-1.5" />
              <span>{t('action.reset_defaults')}</span>
            </Button>
          </div>
        </div>
      </section>

      {/* 5. About Section */}
      <section className="flex flex-col gap-3" aria-labelledby="heading-about">
        <div className="flex flex-col gap-0.5">
          <h2 id="heading-about" className="text-title font-semibold text-text-1">
            {t('settings.about')}
          </h2>
          <p className="text-small text-text-3">{t('settings.about_desc')}</p>
        </div>

        <div className="flex flex-col divide-y divide-border-subtle border-y border-border-subtle text-small">
          {/* Version */}
          <div className="py-3 flex items-center justify-between gap-4">
            <span className="text-text-2 font-medium">{t('settings.version')}</span>
            <span className="font-mono text-text-1">{versionInfo.version}</span>
          </div>

          {/* Commit */}
          <div className="py-3 flex items-center justify-between gap-4">
            <span className="text-text-2 font-medium">{t('settings.commit')}</span>
            <span className="font-mono text-text-1">{versionInfo.commit}</span>
          </div>

          {/* Build Date */}
          <div className="py-3 flex items-center justify-between gap-4">
            <span className="text-text-2 font-medium">{t('settings.build_date')}</span>
            <span className="font-mono text-text-1">{versionInfo.buildDate}</span>
          </div>

          {/* License */}
          <div className="py-3 flex items-center justify-between gap-4">
            <span className="text-text-2 font-medium">{t('settings.license')}</span>
            <span className="font-mono text-text-1">{t('settings.license_name')}</span>
          </div>

          {/* Links */}
          <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-text-2 font-medium">{t('settings.links')}</span>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/aifrak/clutterless"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-accent hover:underline focus:outline-none focus:ring-1 focus:ring-accent rounded-sm"
              >
                <span>{t('settings.link_repo')}</span>
                <ExternalLink size={12} strokeWidth={1.5} />
              </a>
              <a
                href="file:///THIRD_PARTY_LICENSES.md"
                onClick={e => {
                  e.preventDefault();
                  // reveal license in file manager if possible
                  void api.system.revealPath('THIRD_PARTY_LICENSES.md');
                }}
                className="inline-flex items-center gap-1 text-accent hover:underline focus:outline-none focus:ring-1 focus:ring-accent rounded-sm"
              >
                <span>{t('settings.link_licenses')}</span>
                <ExternalLink size={12} strokeWidth={1.5} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Reset Confirmation Dialog */}
      <Dialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
        title={t('settings.reset_confirm_title')}
        description={t('settings.reset_confirm_desc')}
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" onClick={() => setResetDialogOpen(false)}>
              {t('action.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={handleResetToDefaults}
              data-testid="btn-confirm-reset"
            >
              {t('settings.reset_confirm_button')}
            </Button>
          </div>
        }
      >
        <div className="py-2 text-small text-text-2">
          {t('settings.reset_confirm_desc')}
        </div>
      </Dialog>
    </div>
  );
};

