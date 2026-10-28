import { chromium } from 'playwright';
import { preview } from 'vite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function capture() {
  const rootDir = path.resolve(__dirname, '..');
  const outDir = path.resolve(rootDir, '../../../docs/screenshots/g2');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log('Starting Vite preview server...');
  const server = await preview({
    root: rootDir,
    preview: { port: 4173 },
  });

  const url = 'http://localhost:4173';
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
      // 1. Capture Shell (Overview)
      await page.goto(`${url}/`);
      await page.waitForLoadState('networkidle');

      // Click Overview
      await page.click('button:has-text("Overview")');
      await page.waitForTimeout(200);

      // Set theme
      await page.evaluate(t => {
        if (t === 'light') {
          document.documentElement.setAttribute('data-theme', 'light');
        } else {
          document.documentElement.removeAttribute('data-theme');
        }
      }, theme);

      await page.waitForTimeout(300);
      const shellPath = path.join(outDir, `shell_${vp.label}_${theme}.png`);
      await page.screenshot({ path: shellPath });
      console.log(`Saved: ${shellPath}`);

      // 2. Navigate to Styleguide
      await page.click('button:has-text("Styleguide")');
      await page.waitForTimeout(300);

      const sgPath = path.join(outDir, `styleguide_${vp.label}_${theme}.png`);
      await page.screenshot({ path: sgPath, fullPage: true });
      console.log(`Saved: ${sgPath}`);
    }
  }

  await browser.close();
  await new Promise(resolve => server.httpServer.close(resolve));
  console.log('Screenshots capture complete!');
}

capture().catch(err => {
  console.error(err);
  process.exit(1);
});
