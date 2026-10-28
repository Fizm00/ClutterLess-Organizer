import { useState, useEffect } from 'react';
import { api, isMockMode, VersionInfo } from './api';

function App() {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState<number>(0);

  useEffect(() => {
    api.system
      .version()
      .then((info) => setVersionInfo(info))
      .catch((err) => setError(String(err)));

    const unsubscribe = api.onTick((currentTick) => {
      setTick(currentTick);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif', lineHeight: '1.5' }}>
      <h1>ClutterLess GUI — Phase G0 Spike</h1>
      <p>
        <strong>Runtime Mode:</strong>{' '}
        <span style={{ color: isMockMode ? 'orange' : 'green' }}>
          {isMockMode ? 'Mock Browser (dev:mock)' : 'Wails v3 Native Runtime'}
        </span>
      </p>

      <section style={{ marginTop: '20px', border: '1px solid #ccc', padding: '16px' }}>
        <h2>System Service (Go Binding)</h2>
        {error && <p style={{ color: 'red' }}>Error: {error}</p>}
        {versionInfo ? (
          <ul>
            <li>
              <strong>Version:</strong> {versionInfo.version}
            </li>
            <li>
              <strong>Commit:</strong> {versionInfo.commit}
            </li>
            <li>
              <strong>Build Date:</strong> {versionInfo.buildDate}
            </li>
          </ul>
        ) : (
          <p>Loading version from Go backend...</p>
        )}
      </section>

      <section style={{ marginTop: '20px', border: '1px solid #ccc', padding: '16px' }}>
        <h2>Go Event Bridge (Tick Stream)</h2>
        <p>
          <strong>Tick Counter:</strong> {tick}
        </p>
      </section>

      <section style={{ marginTop: '20px', border: '1px solid #ccc', padding: '16px' }}>
        <h2>G0 Gates Checklist</h2>
        <ul>
          <li>a. Window & React hot-reload</li>
          <li>b. Typed Go method call (Version)</li>
          <li>c. Typed Go event stream (Tick)</li>
          <li>d. System tray with Open/Quit & close-to-tray</li>
          <li>e. Standalone executable build</li>
          <li>f. Single-instance focus mechanism</li>
        </ul>
      </section>
    </div>
  );
}

export default App;
