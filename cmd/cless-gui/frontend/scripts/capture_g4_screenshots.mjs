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
  const outDir = path.resolve(rootDir, '../../../docs/screenshots/g4');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log('Starting Vite preview server on port 4175...');
  const server = await preview({
    root: rootDir,
    preview: { port: 4175 },
  });

  const url = 'http://localhost:4175';
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

      // Helper to initialize page with theme
      const setupPage = async () => {
        await page.goto(`${url}/`);
        await page.waitForLoadState('networkidle');
        await page.evaluate(t => {
          window.localStorage.setItem('cless-theme', t);
          if (t === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
          } else {
            document.documentElement.removeAttribute('data-theme');
          }
        }, theme);
        await page.waitForTimeout(200);
      };

      // 1. Activity Screen (Normal State)
      await setupPage();
      await page.click('button:has-text("Activity")');
      await page.waitForTimeout(300);

      const expandBtn = await page.$('button[aria-label="Expand batch"]');
      if (expandBtn) {
        await expandBtn.click();
        await page.waitForTimeout(200);
      }

      const actNormalPath = path.join(outDir, `activity_normal_${vp.label}_${theme}.png`);
      await page.screenshot({ path: actNormalPath });
      console.log(`Saved: ${actNormalPath}`);

      // 2. Preview Sheet
      await setupPage();
      await page.evaluate(() => {
        if (typeof window.__openPreview === 'function') {
          window.__openPreview();
        }
      });
      await page.waitForTimeout(400);

      const previewPath = path.join(outDir, `preview_sheet_${vp.label}_${theme}.png`);
      await page.screenshot({ path: previewPath });
      console.log(`Saved: ${previewPath}`);

      // 3. Undo Dialog
      await setupPage();
      await page.evaluate(() => {
        if (typeof window.__openUndo === 'function') {
          window.__openUndo('batch-20260418-142200');
        }
      });
      await page.waitForTimeout(400);

      const undoPath = path.join(outDir, `undo_dialog_${vp.label}_${theme}.png`);
      await page.screenshot({ path: undoPath });
      console.log(`Saved: ${undoPath}`);

      // 4. Empty Activity State (1080x700 only)
      if (vp.label === '1080x700') {
        await setupPage();
        await page.click('button:has-text("Activity")');
        await page.waitForTimeout(200);
        await page.evaluate(() => {
          if (typeof window.__setEmptyActivity === 'function') {
            window.__setEmptyActivity();
          }
        });
        await page.waitForTimeout(200);
        const actEmptyPath = path.join(outDir, `activity_empty_${vp.label}_${theme}.png`);
        await page.screenshot({ path: actEmptyPath });
        console.log(`Saved: ${actEmptyPath}`);

        // 5. Many Batches State (100 batches, dark only)
        if (theme === 'dark') {
          await setupPage();
          await page.click('button:has-text("Activity")');
          await page.waitForTimeout(200);
          await page.evaluate(() => {
            if (typeof window.__setManyBatches === 'function') {
              window.__setManyBatches(100);
            }
          });
          await page.waitForTimeout(300);
          const actManyPath = path.join(outDir, `activity_many_${vp.label}_${theme}.png`);
          await page.screenshot({ path: actManyPath });
          console.log(`Saved: ${actManyPath}`);
        }
      }
    }
  }

  await browser.close();
  await new Promise(resolve => server.httpServer.close(resolve));
  console.log('Phase G4 Visual QA capture complete!');
}

capture().catch(err => {
  console.error(err);
  process.exit(1);
});
