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
  const outDir = path.resolve(rootDir, '../../../docs/screenshots/redesign');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log('Starting Vite preview server on port 4179...');
  const server = await preview({
    root: rootDir,
    preview: { port: 4179 },
  });

  const url = 'http://localhost:4179';
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

      const setupPage = async () => {
        await page.goto(`${url}/`);
        await page.waitForLoadState('networkidle');
        await page.evaluate(({ t }) => {
          window.localStorage.setItem('cless-theme', t);
          window.localStorage.setItem('cless-locale', 'en');
          if (t === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
          } else {
            document.documentElement.removeAttribute('data-theme');
          }
          if (typeof window.__hideOnboarding === 'function') {
            window.__hideOnboarding();
          }
        }, { t: theme });
        await page.waitForTimeout(150);
      };

      const checkNoHorizontalOverflow = async (screenName) => {
        const overflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        if (overflow) {
          console.error(`Horizontal overflow detected on ${screenName} (${vp.label}, ${theme})`);
        }
      };

      // 1. Overview
      await setupPage();
      await page.evaluate(() => window.__setRoute('overview'));
      await page.waitForTimeout(200);
      await checkNoHorizontalOverflow('overview');
      await page.screenshot({ path: path.join(outDir, `overview_${vp.label}_${theme}.png`) });
      console.log(`Saved: overview_${vp.label}_${theme}.png`);

      // 2. Activity
      await setupPage();
      await page.evaluate(() => window.__setRoute('activity'));
      await page.waitForTimeout(150);
      await page.click('button[aria-label="Expand batch"]').catch(() => {});
      await page.waitForTimeout(200);
      await checkNoHorizontalOverflow('activity');
      await page.screenshot({ path: path.join(outDir, `activity_${vp.label}_${theme}.png`) });
      console.log(`Saved: activity_${vp.label}_${theme}.png`);

      // 3. Rules
      await setupPage();
      await page.evaluate(() => window.__setRoute('rules'));
      await page.waitForTimeout(200);
      await checkNoHorizontalOverflow('rules');
      await page.screenshot({ path: path.join(outDir, `rules_${vp.label}_${theme}.png`) });
      console.log(`Saved: rules_${vp.label}_${theme}.png`);

      // 4. Folders
      await setupPage();
      await page.evaluate(() => window.__setRoute('folders'));
      await page.waitForTimeout(200);
      await checkNoHorizontalOverflow('folders');
      await page.screenshot({ path: path.join(outDir, `folders_${vp.label}_${theme}.png`) });
      console.log(`Saved: folders_${vp.label}_${theme}.png`);

      // 5. Styleguide
      await setupPage();
      await page.evaluate(() => window.__setRoute('styleguide'));
      await page.waitForTimeout(200);
      await checkNoHorizontalOverflow('styleguide');
      await page.screenshot({ path: path.join(outDir, `styleguide_${vp.label}_${theme}.png`) });
      console.log(`Saved: styleguide_${vp.label}_${theme}.png`);

      // 6. PreviewSheet
      await setupPage();
      await page.evaluate(() => {
        window.__setRoute('overview');
        window.__openPreview();
      });
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(outDir, `preview_sheet_${vp.label}_${theme}.png`) });
      console.log(`Saved: preview_sheet_${vp.label}_${theme}.png`);

      // 7. UndoDialog
      await setupPage();
      await page.evaluate(() => {
        window.__setRoute('activity');
        window.__openUndo('batch-20260418-142200');
      });
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(outDir, `undo_dialog_${vp.label}_${theme}.png`) });
      console.log(`Saved: undo_dialog_${vp.label}_${theme}.png`);

      // 8. Settings
      await setupPage();
      await page.evaluate(() => window.__setRoute('settings'));
      await page.waitForTimeout(200);
      await checkNoHorizontalOverflow('settings');
      await page.screenshot({ path: path.join(outDir, `settings_${vp.label}_${theme}.png`) });
      console.log(`Saved: settings_${vp.label}_${theme}.png`);
    }
  }

  await browser.close();
  await server.close();
  console.log('Redesign Visual QA capture complete!');
}

capture().catch(err => {
  console.error('Redesign Visual QA capture failed:', err);
  process.exit(1);
});

