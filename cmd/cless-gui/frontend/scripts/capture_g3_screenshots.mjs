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
  const outDir = path.resolve(rootDir, '../../../docs/screenshots/g3');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log('Starting Vite preview server on port 4174...');
  const server = await preview({
    root: rootDir,
    preview: { port: 4174 },
  });

  const url = 'http://localhost:4174';
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
      // 1. Normal State (Activity with 70-char filename, 120+ char path, needs attention)
      await page.goto(`${url}/`);
      await page.waitForLoadState('networkidle');

      await page.evaluate(t => {
        if (t === 'light') {
          document.documentElement.setAttribute('data-theme', 'light');
        } else {
          document.documentElement.removeAttribute('data-theme');
        }
        if (typeof window.__setNormalOverview === 'function') {
          window.__setNormalOverview();
        }
      }, theme);

      await page.waitForTimeout(300);
      const normalPath = path.join(outDir, `overview_normal_${vp.label}_${theme}.png`);
      await page.screenshot({ path: normalPath });
      console.log(`Saved: ${normalPath}`);

      // 2. Empty State (no activity yet)
      await page.evaluate(() => {
        if (typeof window.__setEmptyOverview === 'function') {
          window.__setEmptyOverview();
        }
      });
      await page.waitForTimeout(200);
      const emptyPath = path.join(outDir, `overview_empty_${vp.label}_${theme}.png`);
      await page.screenshot({ path: emptyPath });
      console.log(`Saved: ${emptyPath}`);

      // 3. Error Banner State (config invalid + watcher already running)
      await page.evaluate(() => {
        if (typeof window.__setErrorOverview === 'function') {
          window.__setErrorOverview();
        }
      });
      await page.waitForTimeout(200);
      const errorPath = path.join(outDir, `overview_error_banner_${vp.label}_${theme}.png`);
      await page.screenshot({ path: errorPath });
      console.log(`Saved: ${errorPath}`);
    }
  }

  await browser.close();
  await new Promise(resolve => server.httpServer.close(resolve));
  console.log('Phase G3 Visual QA capture complete!');
}

capture().catch(err => {
  console.error(err);
  process.exit(1);
});

