/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroParser from './parsers/hero.js';
import columnsParser from './parsers/columns.js';
import accordionParser from './parsers/accordion.js';
import ctaParser from './parsers/cta.js';

// TRANSFORMER IMPORTS
import abbvieCleanupTransformer from './transformers/abbvie-cleanup.js';
import sectionsTransformer from './transformers/sections.js';

// PARSER REGISTRY
const parsers = {
  'hero': heroParser,
  'columns': columnsParser,
  'accordion': accordionParser,
  'cta': ctaParser,
};

// PAGE TEMPLATE CONFIGURATION - Clinical Trials template
const PAGE_TEMPLATE = {
  name: 'clinical-trials',
  description: 'Clinical trials informational page with hero, two-column content grid, full-width image-text section, accordion for additional info, and multi-column bottom sections',
  urls: [
    'https://www.abbvie.com/science/clinical-trials.html',
  ],
  blocks: [
    {
      name: 'hero',
      instances: [
        '.container.overlap-predecessor.medium-radius.cmp-container-xx-large',
      ]
    },
    {
      name: 'cta',
      instances: [
        '.grid.cmp-grid-custom:not(.no-bottom-margin) .grid-row__col-with-2:last-child',
      ]
    },
    {
      name: 'columns',
      instances: [
        '.container.cmp-container-full-width.height-default:not(.large-radius):not(.no-bottom-margin) .grid',
        '.grid.cmp-grid-custom:not(.no-bottom-margin):last-of-type',
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
      name: 'About Clinical Trials',
      selector: '.grid.cmp-grid-custom:not(.no-bottom-margin)',
      style: null,
      blocks: ['cta'],
      defaultContent: [
        '.grid.cmp-grid-custom:not(.no-bottom-margin) .grid-row__col-with-8 .cmp-title h2',
        '.grid.cmp-grid-custom:not(.no-bottom-margin) .grid-row__col-with-8 .cmp-text'
      ]
    },
    {
      id: 'section-3-code-of-conduct',
      name: 'Code of Business Conduct',
      selector: '.container.cmp-container-full-width.height-default:not(.large-radius):not(.no-bottom-margin)',
      style: 'light-blue',
      blocks: ['columns'],
      defaultContent: []
    },
    {
      id: 'section-4-good-clinical-practice',
      name: 'Good Clinical Practice + Accordion',
      selector: '.grid.cmp-grid-custom.no-bottom-margin',
      style: null,
      blocks: ['accordion'],
      defaultContent: [
        '.grid.cmp-grid-custom.no-bottom-margin .cmp-title h2',
        '.grid.cmp-grid-custom.no-bottom-margin .cmp-text',
        '.grid.cmp-grid-custom.no-bottom-margin .button a'
      ]
    },
    {
      id: 'section-5-network-and-iis',
      name: 'Clinical Trial Network + IIS Program',
      selector: '.grid.cmp-grid-custom:not(.no-bottom-margin):last-of-type',
      style: null,
      blocks: ['columns'],
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
