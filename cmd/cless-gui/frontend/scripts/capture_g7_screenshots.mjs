// SPDX-License-Identifier: AGPL-3.0-only
import { chromium } from 'playwright';
import { preview } from 'vite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function capture() {
  const rootDir = path.resolve(__dirname, '..');
  const outDir = path.resolve(rootDir, '../../../docs/screenshots/g7');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log('Starting Vite preview server on port 4178...');
  const server = await preview({
    root: rootDir,
    preview: { port: 4178 },
  });

  const url = 'http://localhost:4178';
  console.log(`Server running at ${url}`);

  const browser = await chromium.launch({ channel: 'msedge' });
  const context = await browser.newContext();
  const page = await context.newPage();

  const viewports = [
    { width: 1080, height: 700, label: '1080x700' },
    { width: 880, height: 560, label: '880x560' },
  ];

  const themes = ['dark', 'light'];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });

    for (const theme of themes) {
      await page.emulateMedia({ colorScheme: theme });

      const setupPage = async (lang = 'en') => {
        await page.goto(`${url}/`);
        await page.waitForLoadState('networkidle');
        await page.evaluate(({ t, l }) => {
          window.localStorage.setItem('cless-theme', t);
          window.localStorage.setItem('cless-locale', l);
          if (t === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
          } else {
            document.documentElement.removeAttribute('data-theme');
          }
          if (typeof window.__hideOnboarding === 'function') {
            window.__hideOnboarding();
          }
        }, { t: theme, l: lang });
        await page.waitForTimeout(100);
      };

      // 1. Overview Screen
      await setupPage('en');
      await page.click('[data-testid="nav-overview"]').catch(() => {});
      await page.waitForTimeout(150);
      await page.screenshot({ path: path.join(outDir, `overview_${vp.label}_${theme}.png`) });
      console.log(`Saved: overview_${vp.label}_${theme}.png`);

      // 2. Activity Screen
      await setupPage('en');
      await page.click('[data-testid="nav-activity"]');
      await page.waitForTimeout(150);
      await page.screenshot({ path: path.join(outDir, `activity_${vp.label}_${theme}.png`) });
      console.log(`Saved: activity_${vp.label}_${theme}.png`);

      // 3. Rules Screen
      await setupPage('en');
      await page.click('[data-testid="nav-rules"]');
      await page.waitForTimeout(150);
      await page.screenshot({ path: path.join(outDir, `rules_${vp.label}_${theme}.png`) });
      console.log(`Saved: rules_${vp.label}_${theme}.png`);

      // 4. Folders Screen
      await setupPage('en');
      await page.click('[data-testid="nav-folders"]');
      await page.waitForTimeout(150);
      await page.screenshot({ path: path.join(outDir, `folders_${vp.label}_${theme}.png`) });
      console.log(`Saved: folders_${vp.label}_${theme}.png`);

      // 5. Settings Screen (English)
      await setupPage('en');
      await page.click('[data-testid="nav-settings"]');
      await page.waitForSelector('[data-testid="settings-screen"]');
      await page.waitForTimeout(150);
      await page.screenshot({ path: path.join(outDir, `settings_en_${vp.label}_${theme}.png`) });
      console.log(`Saved: settings_en_${vp.label}_${theme}.png`);

      // 6. Settings Screen (Indonesian)
      await setupPage('id');
      await page.click('[data-testid="nav-settings"]');
      await page.waitForSelector('[data-testid="settings-screen"]');
      await page.waitForTimeout(150);
      await page.screenshot({ path: path.join(outDir, `settings_id_${vp.label}_${theme}.png`) });
      console.log(`Saved: settings_id_${vp.label}_${theme}.png`);

      // 7. Settings Reset Confirmation Dialog (only at 1080x700 to verify modal presentation)
      if (vp.label === '1080x700') {
        await setupPage('en');
        await page.click('[data-testid="nav-settings"]');
        await page.waitForSelector('[data-testid="btn-reset-defaults"]');
        await page.click('[data-testid="btn-reset-defaults"]');
        await page.waitForSelector('[data-testid="btn-confirm-reset"]');
        await page.waitForTimeout(150);
        await page.screenshot({ path: path.join(outDir, `settings_reset_dialog_${theme}.png`) });
        console.log(`Saved: settings_reset_dialog_${theme}.png`);
      }
    }
  }

  await browser.close();
  await server.close();
  console.log('Phase G7 Visual QA capture complete!');
}

capture().catch(err => {
  console.error('Visual QA capture failed:', err);
  process.exit(1);
});
