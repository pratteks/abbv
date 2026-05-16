#!/usr/bin/env node

/**
 * fix-image-paths.js
 *
 * Converts external Scene7 image URLs in .plain.html content files
 * to /content/dam/ paths for the AEM EDS delivery pipeline.
 *
 * Mapping:
 *   https://abbvie.scene7.com/is/image/abbviecorp/{name}?...
 *   https://s7d9.scene7.com/is/image/abbviecorp/{name}?...
 *   → /content/dam/abbvie-nextgen-eds/is/image/abbviecorp/{name}
 *
 * Usage:
 *   node tools/importer/fix-image-paths.js [--dry-run]
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const CONTENT_DIR = join(process.cwd(), 'content');
const DAM_PREFIX = '/content/dam/abbvie-nextgen-eds';
const DRY_RUN = process.argv.includes('--dry-run');

// Match Scene7 URLs in src="..." or href="..." attributes
// Covers: abbvie.scene7.com, s7d9.scene7.com, and any subdomain of scene7.com
const SCENE7_REGEX = /https?:\/\/[a-z0-9.-]*scene7\.com(\/is\/image\/abbviecorp\/[^"&?]+)[^"]*/g;

async function findHtmlFiles(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findHtmlFiles(fullPath));
    } else if (entry.name.endsWith('.plain.html')) {
      files.push(fullPath);
    }
  }
  return files;
}

function convertScene7ToDam(html) {
  let count = 0;
  const updated = html.replace(SCENE7_REGEX, (match, pathPart) => {
    count += 1;
    return `${DAM_PREFIX}${pathPart}`;
  });
  return { updated, count };
}

async function main() {
  console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Scanning content files for Scene7 URLs...\n`);

  const files = await findHtmlFiles(CONTENT_DIR);
  let totalFixed = 0;
  let filesChanged = 0;

  for (const filePath of files) {
    const html = await readFile(filePath, 'utf-8');
    const { updated, count } = convertScene7ToDam(html);

    if (count > 0) {
      const rel = relative(process.cwd(), filePath);
      console.log(`  ${rel}: ${count} image path(s) converted`);

      // Show before/after for each match
      const matches = html.matchAll(SCENE7_REGEX);
      for (const m of matches) {
        const damPath = `${DAM_PREFIX}${m[1]}`;
        console.log(`    - ${m[0].substring(0, 80)}...`);
        console.log(`    + ${damPath}`);
      }

      if (!DRY_RUN) {
        await writeFile(filePath, updated, 'utf-8');
      }

      totalFixed += count;
      filesChanged += 1;
    }
  }

  console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Done. ${totalFixed} image path(s) converted in ${filesChanged} file(s).`);
  if (DRY_RUN) {
    console.log('Run without --dry-run to apply changes.');
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
