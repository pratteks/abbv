#!/usr/bin/env node

/**
 * Pre-import validation: checks fix-registry.json for pending fixes.
 * If any pending fixes exist, import MUST NOT proceed until they
 * are incorporated into the relevant parsers/transformers.
 *
 * Usage: node tools/importer/check-fix-registry.js
 * Exit 0 = safe to reimport
 * Exit 1 = pending fixes must be incorporated first
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const registryPath = resolve(process.cwd(), 'tools/importer/fix-registry.json');

try {
  const registry = JSON.parse(readFileSync(registryPath, 'utf-8'));
  const pendingFixes = registry.fixes.filter((f) => f.status === 'pending');

  if (pendingFixes.length === 0) {
    console.log('[Fix Registry] All fixes incorporated. Safe to reimport.');
    process.exit(0);
  }

  console.error(`[Fix Registry] BLOCKED: ${pendingFixes.length} pending fix(es) must be incorporated before reimport.\n`);
  pendingFixes.forEach((fix) => {
    console.error(`  #${fix.id} [${fix.template}] ${fix.description}`);
    console.error(`     File to update: ${fix.parser || fix.transformer}`);
    console.error(`     Selector: ${fix.selector || 'N/A'}`);
    console.error('');
  });
  console.error('Incorporate these fixes into the parsers/transformers, then update status to "incorporated".');
  process.exit(1);
} catch (err) {
  if (err.code === 'ENOENT') {
    console.log('[Fix Registry] No fix-registry.json found. Creating empty registry...');
    process.exit(0);
  }
  console.error('[Fix Registry] Error reading fix-registry.json:', err.message);
  process.exit(1);
}
