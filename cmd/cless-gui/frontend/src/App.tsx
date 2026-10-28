import React, { useState, useEffect } from 'react';
import { AppShell, NavRoute } from './components/AppShell';
import { Button } from './components/Button';
import { Styleguide } from './screens/Styleguide';
import { useThemeStore } from './store/themeStore';
import { t } from './i18n';

export const App: React.FC = () => {
  const [route, setRoute] = useState<NavRoute>('styleguide');
  const { initTheme } = useThemeStore();

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  const renderContent = () => {
    switch (route) {
      case 'overview':
        return (
          <div style={{ color: 'var(--text-2)' }}>
            <p className="type-body">Overview screen scaffold ready for Phase G3.</p>
          </div>
        );
      case 'activity':
        return (
          <div style={{ color: 'var(--text-2)' }}>
            <p className="type-body">Activity history scaffold ready for Phase G4.</p>
          </div>
        );
      case 'rules':
        return (
          <div style={{ color: 'var(--text-2)' }}>
            <p className="type-body">Rules management scaffold ready for Phase G5.</p>
          </div>
        );
      case 'folders':
        return (
          <div style={{ color: 'var(--text-2)' }}>
            <p className="type-body">Folders management scaffold ready for Phase G5.</p>
          </div>
        );
      case 'settings':
        return (
          <div style={{ color: 'var(--text-2)' }}>
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
            <Button variant="primary">{t('action.organize_now')}</Button>
            <Button variant="secondary">{t('action.pause')}</Button>
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
