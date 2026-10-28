// SPDX-License-Identifier: AGPL-3.0-only
import React, { useEffect, useState } from 'react';
import { Switch } from '../../components/Switch';
import { api } from '../../api';
import { t } from '../../i18n';

export const SystemSettings: React.FC = () => {
  const [autostart, setAutostartState] = useState(false);
  const [notifications, setNotificationsState] = useState(false);
  const [closeToTray, setCloseToTrayState] = useState(true);

  useEffect(() => {
    // Load current config and autostart state
    api.config.get().then(cfg => {
      if (cfg.settings) {
        if (cfg.settings.closeToTray !== undefined) {
          setCloseToTrayState(cfg.settings.closeToTray);
        }
        if (cfg.settings.notificationsEnabled !== undefined) {
          setNotificationsState(cfg.settings.notificationsEnabled);
        }
      }
    }).catch(() => {});

    api.system.getAutostart().then(enabled => {
      setAutostartState(enabled);
    }).catch(() => {});
  }, []);

  const handleToggleAutostart = async (checked: boolean) => {
    setAutostartState(checked);
    try {
      await api.system.setAutostart(checked);
      const cfg = await api.config.get();
      cfg.settings.autostart = checked;
      await api.config.save(cfg);
    } catch (err) {
      console.error('Failed to update autostart:', err);
    }
  };

  const handleToggleNotifications = async (checked: boolean) => {
    setNotificationsState(checked);
    try {
      const cfg = await api.config.get();
      cfg.settings.notificationsEnabled = checked;
      await api.config.save(cfg);
    } catch (err) {
      console.error('Failed to update notifications:', err);
    }
  };

  const handleToggleCloseToTray = async (checked: boolean) => {
    setCloseToTrayState(checked);
    try {
      const cfg = await api.config.get();
      cfg.settings.closeToTray = checked;
      await api.config.save(cfg);
    } catch (err) {
      console.error('Failed to update closeToTray:', err);
    }
  };

  return (
    <div className="w-full max-w-2xl flex flex-col gap-6" data-testid="settings-system-section">
      <div className="flex flex-col gap-1">
        <h2 className="text-title font-semibold text-text-1">
          {t('settings.system_title')}
        </h2>
        <p className="text-small text-text-3">
          Configure background execution, system tray integration, and desktop alerts.
        </p>
      </div>

      <div className="flex flex-col divide-y divide-border-subtle border-y border-border-subtle">
        {/* Autostart row */}
        <div className="py-4 flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-body font-medium text-text-1">
              {t('settings.autostart')}
            </span>
            <span className="text-small text-text-2">
              {t('settings.autostart_desc')}
            </span>
          </div>
          <Switch
            id="setting-autostart"
            checked={autostart}
            onCheckedChange={handleToggleAutostart}
            data-testid="switch-autostart"
          />
        </div>

        {/* Notifications row */}
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
            checked={notifications}
            onCheckedChange={handleToggleNotifications}
            data-testid="switch-notifications"
          />
        </div>

        {/* Close to tray row */}
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
            checked={closeToTray}
            onCheckedChange={handleToggleCloseToTray}
            data-testid="switch-close-to-tray"
          />
        </div>
      </div>
    </div>
  );
};
