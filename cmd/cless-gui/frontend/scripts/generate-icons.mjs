import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ClutterLess Custom Brand Logo SVG
// Concept: A geometric folder silhouette forming a bold "C" with three neatly sorted file layers
// slotting into order (top active file layer in signature cyan #22d3ee).
const createAppIconSvg = (size = 1024) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 256 256" fill="none">
  <!-- Squircle Container -->
  <rect x="12" y="12" width="232" height="232" rx="54" fill="#09090B" />
  <rect x="14" y="14" width="228" height="228" rx="52" stroke="#27272A" stroke-width="4" />

  <!-- Subtle inner surface glow -->
  <rect x="16" y="16" width="224" height="224" rx="50" fill="url(#bgGrad)" />

  <!-- Outer Folder "C" Spine (represents the target organized folder & the letter C) -->
  <path
    d="M154 64H118L102 48H74C59.6406 48 48 59.6406 48 74V182C48 196.359 59.6406 208 74 208H154"
    stroke="#FAFAFA"
    stroke-width="22"
    stroke-linecap="round"
    stroke-linejoin="round"
  />

  <!-- Sorted File Bars centered vertically inside the Folder-C opening (y=64..208, center=136) -->
  <!-- Top active file bar: Cyan accent, sliding into alignment -->
  <rect x="108" y="94" width="98" height="20" rx="10" fill="#22D3EE" />
  <!-- Middle sorted file bar -->
  <rect x="94" y="126" width="94" height="20" rx="10" fill="#E4E4E7" />
  <!-- Bottom sorted file bar -->
  <rect x="94" y="158" width="72" height="20" rx="10" fill="#71717A" />

  <defs>
    <linearGradient id="bgGrad" x1="128" y1="16" x2="128" y2="240" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#18181B" stop-opacity="0.7" />
      <stop offset="100%" stop-color="#09090B" stop-opacity="0" />
    </linearGradient>
  </defs>
</svg>
`.trim();

// Tray icon variant with status badge (64x64)
const createTrayIconSvg = (badgeColor) => `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 256 256" fill="none">
  <rect x="8" y="8" width="240" height="240" rx="56" fill="#09090B" stroke="#3F3F46" stroke-width="8" />
  <path
    d="M150 64H116L100 48H72C57.6406 48 46 59.6406 46 74V182C46 196.359 57.6406 208 72 208H150"
    stroke="#FAFAFA"
    stroke-width="24"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
  <rect x="104" y="94" width="98" height="22" rx="11" fill="#22D3EE" />
  <rect x="90" y="126" width="92" height="22" rx="11" fill="#E4E4E7" />
  <rect x="90" y="158" width="68" height="22" rx="11" fill="#A1A1AA" />
  <!-- Status dot in bottom-right -->
  <circle cx="204" cy="204" r="40" fill="#09090B" />
  <circle cx="204" cy="204" r="28" fill="${badgeColor}" />
</svg>
`.trim();

async function run() {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage();

  const buildDir = path.resolve(__dirname, '../../build');
  const publicDir = path.resolve(__dirname, '../public');

  // 1. Write public/logo.svg
  const logoSvg = createAppIconSvg(512);
  fs.writeFileSync(path.join(publicDir, 'logo.svg'), logoSvg, 'utf8');

  // 2. Render 1024x1024 appicon.png
  await page.setViewportSize({ width: 1024, height: 1024 });
  await page.setContent(`<body style="margin:0;padding:0;background:transparent;">${createAppIconSvg(1024)}</body>`);
  await page.screenshot({
    path: path.join(buildDir, 'appicon.png'),
    omitBackground: true,
  });

  // 3. Render 256x256 public/wails.png (fallback favicon)
  await page.setViewportSize({ width: 256, height: 256 });
  await page.setContent(`<body style="margin:0;padding:0;background:transparent;">${createAppIconSvg(256)}</body>`);
  await page.screenshot({
    path: path.join(publicDir, 'wails.png'),
    omitBackground: true,
  });

  // 4. Render 64x64 tray icons
  const trayConfigs = [
    { file: 'tray_active.png', color: '#22C55E' },
    { file: 'tray_paused.png', color: '#A1A1AA' },
    { file: 'tray_error.png', color: '#EF4444' },
  ];

  await page.setViewportSize({ width: 64, height: 64 });
  for (const cfg of trayConfigs) {
    await page.setContent(`<body style="margin:0;padding:0;background:transparent;">${createTrayIconSvg(cfg.color)}</body>`);
    await page.screenshot({
      path: path.join(buildDir, cfg.file),
      omitBackground: true,
    });
  }

  await browser.close();
  console.log('Generated all ClutterLess GUI icons successfully.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
