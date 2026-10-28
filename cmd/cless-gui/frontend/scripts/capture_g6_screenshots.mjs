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
  const outDir = path.resolve(rootDir, '../../../docs/screenshots/g6');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log('Starting Vite preview server on port 4177...');
  const server = await preview({
    root: rootDir,
    preview: { port: 4177 },
  });

  const url = 'http://localhost:4177';
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
        await page.evaluate(t => {
          window.localStorage.setItem('cless-theme', t);
          if (t === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
          } else {
            document.documentElement.removeAttribute('data-theme');
          }
        }, theme);
        await page.waitForTimeout(150);
      };

      // 1. Onboarding Step 1 (Folders)
      await setupPage();
      await page.evaluate(() => {
        if (typeof window.__showOnboardingStep === 'function') {
          window.__showOnboardingStep(1);
        }
      });
      await page.waitForSelector('[data-testid="onboarding-step-1"]');
      await page.screenshot({ path: path.join(outDir, `onboarding_step1_${vp.label}_${theme}.png`) });
      console.log(`Saved: onboarding_step1_${vp.label}_${theme}.png`);

      // 2. Onboarding Step 2 (Rules)
      await setupPage();
      await page.evaluate(() => {
        if (typeof window.__showOnboardingStep === 'function') {
          window.__showOnboardingStep(2);
        }
      });
      await page.waitForSelector('[data-testid="onboarding-step-2"]');
      await page.screenshot({ path: path.join(outDir, `onboarding_step2_${vp.label}_${theme}.png`) });
      console.log(`Saved: onboarding_step2_${vp.label}_${theme}.png`);

      // 3. Onboarding Step 3 (Preview)
      await setupPage();
      await page.evaluate(() => {
        if (typeof window.__showOnboardingStep === 'function') {
          window.__showOnboardingStep(3);
        }
      });
      await page.waitForSelector('[data-testid="onboarding-step-3"]');
      await page.screenshot({ path: path.join(outDir, `onboarding_step3_${vp.label}_${theme}.png`) });
      console.log(`Saved: onboarding_step3_${vp.label}_${theme}.png`);

      // 4. Toast: Still running in the tray
      await setupPage();
      await page.evaluate(() => {
        if (typeof window.__hideOnboarding === 'function') {
          window.__hideOnboarding();
        }
        if (typeof window.__showCloseToTrayToast === 'function') {
          window.__showCloseToTrayToast();
        }
      });
      await page.waitForSelector('[data-testid="close-to-tray-toast"]');
      await page.screenshot({ path: path.join(outDir, `toast_close_to_tray_${vp.label}_${theme}.png`) });
      console.log(`Saved: toast_close_to_tray_${vp.label}_${theme}.png`);

      // 5. Settings Screen (System Section)
      await setupPage();
      await page.evaluate(() => {
        if (typeof window.__hideOnboarding === 'function') {
          window.__hideOnboarding();
        }
      });
      await page.click('button:has-text("Settings")');
      await page.waitForSelector('[data-testid="settings-system-section"]');
      await page.screenshot({ path: path.join(outDir, `settings_system_${vp.label}_${theme}.png`) });
      console.log(`Saved: settings_system_${vp.label}_${theme}.png`);
    }
  }

  await browser.close();
  await server.close();
  console.log('Phase G6 Visual QA capture complete!');
}

capture().catch(err => {
  console.error('Visual QA capture failed:', err);
  process.exit(1);
});

