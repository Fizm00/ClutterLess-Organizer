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
  const outDir = path.resolve(rootDir, '../../../docs/screenshots/g5');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log('Starting Vite preview server on port 4176...');
  const server = await preview({
    root: rootDir,
    preview: { port: 4176 },
  });

  const url = 'http://localhost:4176';
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
        await page.waitForTimeout(200);
      };

      // 1. Rules Screen (Normal State)
      await setupPage();
      await page.click('button:has-text("Rules")');
      await page.waitForTimeout(300);
      const rulesNormalPath = path.join(outDir, `rules_normal_${vp.label}_${theme}.png`);
      await page.screenshot({ path: rulesNormalPath });
      console.log(`Saved: ${rulesNormalPath}`);

      // 2. Folders Screen (Normal State)
      await setupPage();
      await page.click('button:has-text("Folders")');
      await page.waitForTimeout(400);
      const foldersNormalPath = path.join(outDir, `folders_normal_${vp.label}_${theme}.png`);
      await page.screenshot({ path: foldersNormalPath });
      console.log(`Saved: ${foldersNormalPath}`);

      // 3. Rule Editor Dialog (Valid Draft)
      await setupPage();
      await page.click('button:has-text("Rules")');
      await page.waitForTimeout(200);
      await page.evaluate(() => {
        if (typeof window.__openEditRuleEditor === 'function') {
          window.__openEditRuleEditor();
        }
      });
      await page.waitForTimeout(400);
      const editorValidPath = path.join(outDir, `editor_valid_${vp.label}_${theme}.png`);
      await page.screenshot({ path: editorValidPath });
      console.log(`Saved: ${editorValidPath}`);

      // Detailed 1080x700 States
      if (vp.label === '1080x700') {
        // Empty Rules
        await setupPage();
        await page.click('button:has-text("Rules")');
        await page.evaluate(() => {
          if (typeof window.__setEmptyRules === 'function') {
            window.__setEmptyRules();
          }
        });
        await page.waitForTimeout(200);
        const rulesEmptyPath = path.join(outDir, `rules_empty_${vp.label}_${theme}.png`);
        await page.screenshot({ path: rulesEmptyPath });
        console.log(`Saved: ${rulesEmptyPath}`);

        // Folders with Recursive Destination Warning
        await setupPage();
        await page.click('button:has-text("Folders")');
        await page.evaluate(() => {
          if (typeof window.__setRecursiveWarningFolders === 'function') {
            window.__setRecursiveWarningFolders();
          }
        });
        await page.waitForTimeout(300);
        const foldersWarningPath = path.join(outDir, `folders_warning_${vp.label}_${theme}.png`);
        await page.screenshot({ path: foldersWarningPath });
        console.log(`Saved: ${foldersWarningPath}`);

        // Dark-only detailed variants
        if (theme === 'dark') {
          // Many rules (long list scrolling)
          await setupPage();
          await page.click('button:has-text("Rules")');
          await page.evaluate(() => {
            if (typeof window.__setManyRules === 'function') {
              window.__setManyRules();
            }
          });
          await page.waitForTimeout(300);
          const rulesManyPath = path.join(outDir, `rules_many_${vp.label}_${theme}.png`);
          await page.screenshot({ path: rulesManyPath });
          console.log(`Saved: ${rulesManyPath}`);

          // Long rule name
          await setupPage();
          await page.click('button:has-text("Rules")');
          await page.evaluate(() => {
            if (typeof window.__setLongNameRule === 'function') {
              window.__setLongNameRule();
            }
          });
          await page.waitForTimeout(300);
          const rulesLongPath = path.join(outDir, `rules_longname_${vp.label}_${theme}.png`);
          await page.screenshot({ path: rulesLongPath });
          console.log(`Saved: ${rulesLongPath}`);

          // Rule Tester evaluated state
          await setupPage();
          await page.click('button:has-text("Rules")');
          await page.waitForTimeout(200);
          const testBtn = await page.$('button:has-text("Test file")');
          if (testBtn) {
            await testBtn.click();
            await page.waitForTimeout(300);
          }
          const testerPath = path.join(outDir, `rule_tester_${vp.label}_${theme}.png`);
          await page.screenshot({ path: testerPath });
          console.log(`Saved: ${testerPath}`);

          // Rule Editor with broken regex validation error
          await setupPage();
          await page.click('button:has-text("Rules")');
          await page.waitForTimeout(200);
          await page.evaluate(() => {
            if (typeof window.__openEditRuleEditor === 'function') {
              window.__openEditRuleEditor();
            }
          });
          await page.waitForTimeout(300);
          const regexInput = await page.$('input[placeholder*="invoice"]');
          if (regexInput) {
            await regexInput.fill('(?i)[unclosed_regex');
            await page.waitForTimeout(400);
          }
          const editorRegexPath = path.join(outDir, `editor_regex_error_${vp.label}_${theme}.png`);
          await page.screenshot({ path: editorRegexPath });
          console.log(`Saved: ${editorRegexPath}`);
        }
      }
    }
  }

  await browser.close();
  await server.close();
  console.log('Phase G5 Visual QA capture complete!');
}

capture().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});
