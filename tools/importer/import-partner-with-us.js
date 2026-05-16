/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroParser from './parsers/hero.js';
import accordionParser from './parsers/accordion.js';
import ctaParser from './parsers/cta.js';

// TRANSFORMER IMPORTS
import abbvieCleanupTransformer from './transformers/abbvie-cleanup.js';
import sectionsTransformer from './transformers/sections.js';

// PARSER REGISTRY
const parsers = {
  'hero': heroParser,
  'accordion': accordionParser,
  'cta': ctaParser,
};

// PAGE TEMPLATE CONFIGURATION - Partner With Us template
const PAGE_TEMPLATE = {
  name: 'partner-with-us',
  description: 'Science sub-page for partnership information, similar layout to clinical-trials with hero, content sections, and informational blocks',
  urls: [
    'https://www.abbvie.com/science/partner-with-us.html',
  ],
  blocks: [
    {
      name: 'hero',
      instances: [
        '.container.large-radius.cmp-container-full-width.height-default.no-bottom-margin',
      ]
    },
    {
      name: 'cta',
      instances: [
        '.grid.cmp-grid-custom .grid-row__col-with-2',
      ]
    },
    {
      name: 'accordion',
      instances: [
        '.cmp-accordion',
      ]
    }
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
      id: 'section-2-about',
      name: 'Main Content with Sidebar',
      selector: '.grid.cmp-grid-custom',
      style: null,
      blocks: ['cta', 'accordion'],
      defaultContent: [
        '.grid-row__col-with-7 .cmp-title h2',
        '.grid-row__col-with-7 .cmp-text'
      ]
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
