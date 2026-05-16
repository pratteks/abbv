/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroParser from './parsers/hero.js';
import accordionParser from './parsers/accordion.js';

// TRANSFORMER IMPORTS
import abbvieCleanupTransformer from './transformers/abbvie-cleanup.js';
import sectionsTransformer from './transformers/sections.js';

// PARSER REGISTRY
const parsers = {
  'hero': heroParser,
  'accordion': accordionParser,
};

// PAGE TEMPLATE CONFIGURATION - Independent Educational Grants template
const PAGE_TEMPLATE = {
  name: 'educational-grants',
  description: 'Independent Educational Grants page with hero, sidebar with topics, main content with CTA, image+goals section, grants list, accordion for therapeutic areas, and full-width apply CTA at bottom',
  urls: [
    'https://www.abbvie.com/science/independent-educational-grants.html',
  ],
  blocks: [
    {
      name: 'hero',
      instances: [
        '.container.large-radius.cmp-container-full-width.height-default.no-bottom-margin',
      ]
    },
    {
      name: 'accordion',
      instances: [
        '.cmp-accordion',
      ]
    },
  ],
  sections: [
    {
      id: 'section-1-hero',
      name: 'Hero Section',
      selector: [
        '.container.large-radius.cmp-container-full-width.height-default.no-bottom-margin',
        '.container.overlap-predecessor.medium-radius.cmp-container-xx-large'
      ],
      style: 'navy-overlap',
      blocks: ['hero'],
      defaultContent: []
    },
    {
      id: 'section-2-main',
      name: 'Main Content with Sidebar',
      selector: '.grid.cmp-grid-custom',
      style: null,
      blocks: ['accordion'],
      defaultContent: []
    }
  ]
};

// TRANSFORMER REGISTRY
const transformers = [
  abbvieCleanupTransformer,
  sectionsTransformer,
];

/**
 * Execute all page transformers for a specific hook
 */
function executeTransformers(hookName, element, payload) {
  const enhancedPayload = {
    ...payload,
    template: PAGE_TEMPLATE,
  };

  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

/**
 * Find all blocks on the page based on the embedded template configuration
 */
function findBlocksOnPage(document, template) {
  const pageBlocks = [];

  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
      }
      elements.forEach((element) => {
        pageBlocks.push({
          name: blockDef.name,
          selector,
          element,
          section: blockDef.section || null,
        });
      });
    });
  });

  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

/**
 * Convert the AEM grid layout to a Columns (cols-2-8-2) block.
 * Educational Grants grid: sidebar(2) | spacer(1) | main(7)
 * After filtering: sidebar | main | empty → cols-2-8-2
 */
function convertGridToColumns(document) {
  const grid = document.querySelector('.grid.cmp-grid-custom');
  if (!grid) return;

  const gridRow = grid.querySelector('.grid-row');
  if (!gridRow) return;

  const cols = Array.from(gridRow.children).filter(c =>
    c.className && c.className.match(/grid-row__col/)
  );

  // Filter out spacer columns (width 1, no content)
  const contentCols = cols.filter(c => {
    const w = c.className.match(/grid-row__col-with-(\d+)/);
    const width = w ? parseInt(w[1], 10) : 0;
    const hasContent = c.textContent.trim().length > 0 || c.querySelector('img, picture, video');
    return width > 1 || hasContent;
  });

  if (contentCols.length < 2) return;

  // Build cell fragments from each content column
  // Order: sidebar(2) first, main(7) second — matching cols-2-8-2
  const rowCells = contentCols.map(col => {
    const frag = document.createDocumentFragment();
    while (col.firstChild) frag.appendChild(col.firstChild);
    return frag;
  });

  // Add empty third column for cols-2-8-2 layout
  rowCells.push(document.createDocumentFragment());

  const block = WebImporter.Blocks.createBlock(document, {
    name: 'Columns (cols-2-8-2)',
    cells: [rowCells],
  });

  grid.replaceWith(block);
}

// EXPORT DEFAULT CONFIGURATION
export default {
  transform: (payload) => {
    const { document, url, html, params } = payload;

    const main = document.body;

    // 1. Execute beforeTransform transformers (initial cleanup)
    executeTransformers('beforeTransform', main, payload);

    // 2. Find blocks on page using embedded template
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 3. Parse each block using registered parsers
    pageBlocks.forEach((block) => {
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    // 4. Execute afterTransform transformers (section breaks + metadata)
    // Must run BEFORE grid-to-columns since sections transformer needs .grid.cmp-grid-custom
    executeTransformers('afterTransform', main, payload);

    // 4.5 Convert grid layout to Columns block (after section breaks inserted)
    convertGridToColumns(document);

    // 5. Apply WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 6. Generate sanitized path
    const path = WebImporter.FileUtils.sanitizePath(
      new URL(params.originalURL).pathname.replace(/\/$/, '').replace(/\.html$/, '')
    );

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};
