/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroParser from './parsers/hero.js';
import columnsParser from './parsers/columns.js';
import cardsParser from './parsers/cards.js';

// TRANSFORMER IMPORTS
import abbvieCleanupTransformer from './transformers/abbvie-cleanup.js';
import sectionsTransformer from './transformers/sections.js';

// PARSER REGISTRY
const parsers = {
  'hero': heroParser,
  'columns': columnsParser,
  'cards': cardsParser,
};

// PAGE TEMPLATE CONFIGURATION - Content Series template
const PAGE_TEMPLATE = {
  name: 'content-series',
  description: 'Content series page showcasing video and article collections for science topics',
  urls: [
    'https://www.abbvie.com/science/our-people/behind-the-science.html',
    'https://www.abbvie.com/science/our-people/community-of-science.html',
    'https://www.abbvie.com/science/our-people/discovery-files.html',
    'https://www.abbvie.com/science/our-people/lab-of-the-future.html',
    'https://www.abbvie.com/science/our-people/science-in-60-seconds.html',
  ],
  blocks: [
    {
      name: 'hero',
      instances: ['.container.overlap-predecessor']
    },
    {
      name: 'columns',
      instances: [
        '.container.cmp-container-full-width.height-short:not(.medium-radius) > .cmp-container > .grid:first-child',
        '.container.no-bottom-margin:not(.cmp-container-full-width):not(.height-short):not(.overlap-predecessor) > .cmp-container > .grid',
        '.container.medium-radius.cmp-container-full-width.height-short.no-bottom-margin:last-of-type > .cmp-container > .grid'
      ]
    },
    {
      name: 'cards',
      instances: [
        '.container.cmp-container-full-width.height-short:not(.medium-radius) > .cmp-container > .grid:not(:first-child)'
      ]
    }
  ],
  sections: [
    {
      id: 'section-1-hero',
      name: 'Hero Section',
      selector: ['.container.large-radius.cmp-container-full-width.height-default', '.container.overlap-predecessor.medium-radius'],
      style: null,
      blocks: ['hero'],
      defaultContent: []
    },
    {
      id: 'section-2-featured-video',
      name: 'Featured Video with Description',
      selector: '.container.cmp-container-full-width.height-short:not(.medium-radius)',
      style: 'dark',
      blocks: ['columns', 'cards'],
      defaultContent: []
    },
    {
      id: 'section-4-dive-deeper',
      name: 'Dive Deeper Navigation',
      selector: '.container.no-bottom-margin:not(.cmp-container-full-width):not(.height-short):not(.overlap-predecessor)',
      style: null,
      blocks: ['columns'],
      defaultContent: []
    },
    {
      id: 'section-5-cta',
      name: 'CTA Banner',
      selector: '.container.medium-radius.cmp-container-full-width.height-short.no-bottom-margin:last-of-type',
      style: 'navy',
      blocks: ['columns'],
      defaultContent: []
    }
  ]
};

// TRANSFORMER REGISTRY
const transformers = [
  abbvieCleanupTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [sectionsTransformer] : []),
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
    executeTransformers('afterTransform', main, payload);

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
