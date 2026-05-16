import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { join } from 'path';

const VALIDATOR_DIR = '/home/node/.claude/plugins/cache/excat-marketplace/excat/2.1.1/hooks/import-validator';

async function test() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.text().startsWith('[Import]') || msg.text().startsWith('[Parser')) {
      console.log('PAGE:', msg.text());
    }
  });
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message.substring(0, 200)));

  console.log('Loading page...');
  await page.goto('https://www.abbvie.com/science/our-people.html', { waitUntil: 'networkidle', timeout: 30000 });
  console.log('Page loaded');

  // Inject helix-importer
  const helixScript = readFileSync(join(VALIDATOR_DIR, 'static/inject/helix-importer.js'), 'utf-8');
  await page.evaluate((s) => {
    const origDefine = window.define;
    if (typeof window.define !== 'undefined') delete window.define;
    const el = document.createElement('script');
    el.textContent = s;
    document.head.appendChild(el);
    if (origDefine) window.define = origDefine;
  }, helixScript);
  console.log('Helix importer injected');

  // Inject import.js
  const importScript = readFileSync(join(VALIDATOR_DIR, 'tmp/import-generated.js'), 'utf-8');
  await page.evaluate(importScript);
  console.log('Import script injected');

  // Inject parser
  const parserScript = readFileSync('/workspace/tools/importer/parsers/hero.js', 'utf-8');
  await page.evaluate(({ script, name }) => {
    const scriptContent = script.replace(
      /export\s+default\s+(function\s*\w*)/g,
      'window.__PARSER_PARSE__ = $1'
    ).replace(
      /export\s+default\s+/g,
      'window.__PARSER_PARSE__ = '
    );
    const scriptEl = document.createElement('script');
    scriptEl.textContent = scriptContent;
    document.head.appendChild(scriptEl);
    window.BLOCK_PARSER = { name, parse: window.__PARSER_PARSE__ };
  }, { script: parserScript, name: 'hero' });
  console.log('Parser injected');

  // Check state
  const state = await page.evaluate(() => ({
    hasWebImporter: typeof window.WebImporter !== 'undefined',
    hasCreateBlock: typeof window.WebImporter?.Blocks?.createBlock === 'function',
    hasBlockParser: typeof window.BLOCK_PARSER !== 'undefined',
    parserType: typeof window.__PARSER_PARSE__,
    parserName: window.BLOCK_PARSER?.name,
    hasValidatorExec: typeof window.PARSER_VALIDATOR?.executeTransformation === 'function',
  }));
  console.log('State:', JSON.stringify(state, null, 2));

  // Execute transformation
  const result = await page.evaluate(async (url) => {
    try {
      const r = window.PARSER_VALIDATOR.executeTransformation(url);
      return {
        resultsCount: r.results.length,
        results: r.results.map(res => ({
          instance: res.instance,
          selector: res.selector,
          blockType: res.blockType,
          hasBlockCreated: !!res.blockCreated,
          blockPreview: res.blockCreated ? res.blockCreated.substring(0, 200) : null,
          error: res.error || null,
        })),
      };
    } catch (e) {
      return { error: e.message, stack: e.stack?.substring(0, 500) };
    }
  }, 'https://www.abbvie.com/science/our-people.html');
  console.log('Result:', JSON.stringify(result, null, 2));

  await browser.close();
}

test().catch(e => console.error('FATAL:', e.message));
