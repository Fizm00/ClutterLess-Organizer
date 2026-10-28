// SPDX-License-Identifier: AGPL-3.0-only
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

const targetDirs = [
  path.join(srcDir, 'screens'),
  path.join(srcDir, 'components'),
];

const rules = [
  {
    name: 'Tailwind arbitrary value',
    regex: /\b(?:bg|text|border|ring|shadow|rounded|p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|w|h|min-w|max-w|min-h|max-h|gap|top|right|bottom|left|inset|z|font|leading|tracking|grid-cols|grid-rows|translate-x|translate-y|size)-\[[^\]]+\]/g,
  },
  {
    name: 'Direct Tailwind palette color (use semantic tokens)',
    regex: /\b(?:bg|text|border|ring|fill|stroke|from|via|to)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|[1-9]00|950)(?:\/[0-9]+)?\b/g,
  },
  {
    name: 'Banned uppercase or wide tracking',
    regex: /\b(?:uppercase|tracking-wide|tracking-wider|tracking-widest)\b/g,
  },
  {
    name: 'Banned heavy shadow (shadow-lg/xl/2xl)',
    regex: /\bshadow-(?:lg|xl|2xl)\b/g,
  },
  {
    name: 'Banned large radius (rounded-2xl/3xl)',
    regex: /\brounded-(?:2xl|3xl)\b/g,
  },
  {
    name: 'Banned backdrop-blur',
    regex: /\bbackdrop-blur(?:-[a-z0-9]+)?\b/g,
  },
  {
    name: 'Banned bg-gradient',
    regex: /\bbg-(?:gradient|linear)-to-[a-z]+\b/g,
  },
];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip src/components/ui (official shadcn primitives)
      if (path.normalize(fullPath) === path.normalize(path.join(srcDir, 'components', 'ui'))) {
        continue;
      }
      walk(fullPath, files);
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

const allFiles = [];
for (const d of targetDirs) {
  walk(d, allFiles);
}
// Also check src/App.tsx
const appTsx = path.join(srcDir, 'App.tsx');
if (fs.existsSync(appTsx)) {
  allFiles.push(appTsx);
}

let violations = 0;

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  const relPath = path.relative(path.resolve(__dirname, '..'), file).replace(/\\/g, '/');

  lines.forEach((line, idx) => {
    for (const rule of rules) {
      rule.regex.lastIndex = 0;
      let match;
      while ((match = rule.regex.exec(line)) !== null) {
        console.error(`${relPath}:${idx + 1}: [${rule.name}] "${match[0]}"`);
        violations++;
      }
    }
  });
}

if (violations > 0) {
  console.error(`\nStyle lint failed with ${violations} violation(s).`);
  process.exit(1);
} else {
  console.log(`Style lint passed (checked ${allFiles.length} files, 0 violations).`);
}

