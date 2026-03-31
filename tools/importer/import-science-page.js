/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroParser from './parsers/hero.js';
import columnsParser from './parsers/columns.js';
import embedParser from './parsers/embed.js';
import cardsParser from './parsers/cards.js';
import accordionParser from './parsers/accordion.js';

// TRANSFORMER IMPORTS
import abbvieCleanupTransformer from './transformers/abbvie-cleanup.js';
import abbvieSectionsTransformer from './transformers/abbvie-sections.js';

// PARSER REGISTRY
const parsers = {
  'hero': heroParser,
  'columns': columnsParser,
  'embed': embedParser,
  'cards': cardsParser,
  'accordion': accordionParser,
};

// PAGE TEMPLATE CONFIGURATION
const PAGE_TEMPLATE = {
  name: 'science-page',
  urls: [
    'https://www.abbvie.com/science.html'
  ],
  description: 'AbbVie Science landing page with hero, dashboard stats, video embed, content columns, cards, accordion, FAQ CTA band, and footer CTA sections. Note: AbbVie uses Scene7 lazy-loaded images (data-cmp-src) that require resolution during import.',
  blocks: [
    {
      name: 'hero',
      instances: ['.container.cmp-container-full-width.height-tall']
    },
    {
      name: 'columns',
      instances: [
        '.container.cmp-container-full-width:has(#container-7369813af9)',
        '.container.cmp-container-full-width:has(#container-5ab796dabb)',
        '.container.cmp-container-xxx-large:has(#title-b50438c68d)',
        '.container.cmp-container-full-width.footer-overlap'
      ]
    },
    {
      name: 'embed',
      instances: ['.container.cmp-container-full-width:has(.brightcove-video)']
    },
    {
      name: 'cards',
      instances: ['.grid.cmp-grid-custom .grid-row', '.grid.cmp-grid-full-page-5-v1']
    },
    {
      name: 'accordion',
      instances: ['#accordion-c31e57db88']
    }
  ],
  sections: [
    {
      id: 'section-1',
      name: 'Hero',
      selector: ['.container.cmp-container-full-width.height-tall', '.container.overlap-predecessor.cmp-container-xx-large'],
      style: 'navy-overlap, height-tall',
      blocks: ['hero'],
      defaultContent: []
    },
    {
      id: 'section-2',
      name: 'At a Glance Text',
      selector: '.teaser.light-theme',
      style: null,
      blocks: [],
      defaultContent: ['.teaser.light-theme .cmp-teaser__pretitle', '.teaser.light-theme .cmp-teaser__title', '.teaser.light-theme .cmp-teaser__description']
    },
    {
      id: 'section-3',
      name: 'Dashboard Stats',
      selector: '.container.cmp-container-full-width .cmp-grid-full-page-5-v1',
      style: 'navy',
      blocks: ['cards'],
      defaultContent: []
    },
    {
      id: 'section-4',
      name: 'Core Focus Areas',
      selector: '.container.cmp-container-full-width:has(#container-7369813af9)',
      style: 'dark',
      blocks: ['columns'],
      defaultContent: []
    },
    {
      id: 'section-5',
      name: 'R&D Video',
      selector: '.container.cmp-container-full-width:has(.brightcove-video)',
      style: null,
      blocks: ['embed'],
      defaultContent: []
    },
    {
      id: 'section-6',
      name: 'Explore Our Science',
      selector: '.container.cmp-container-full-width:has(#container-5ab796dabb)',
      style: null,
      blocks: ['columns'],
      defaultContent: []
    },
    {
      id: 'section-7',
      name: 'Tenacity / Behind the Science',
      selector: '.container.cmp-container-xxx-large:has(#title-b50438c68d)',
      style: null,
      blocks: ['columns'],
      defaultContent: []
    },
    {
      id: 'section-8',
      name: 'Stories Behind Our Science',
      selector: '.container:has(#container-b38daf1189)',
      style: null,
      blocks: ['cards'],
      defaultContent: ['#title-3311f030ae', '#text-78ba5a63d0']
    },
    {
      id: 'section-9',
      name: 'FAQ + CTA Band',
      selector: '.container.cmp-container-full-width:has(#accordion-c31e57db88)',
      style: null,
      blocks: ['accordion'],
      defaultContent: [
        '#title-d188a77aca',
        ".cmp-image:has([data-cmp-src*='Cambridge'])",
        '#title-cta-bold-science',
        ".cmp-text:has(a[href*='research-and-development'])"
      ]
    },
    {
      id: 'section-10',
      name: 'CTA / Careers',
      selector: '.container.cmp-container-full-width.footer-overlap',
      style: 'highlight',
      blocks: ['columns'],
      defaultContent: []
    }
  ]
};

// TRANSFORMER REGISTRY
const transformers = [
  abbvieCleanupTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [abbvieSectionsTransformer] : []),
];

/**
 * Execute all page transformers for a specific hook
 * @param {string} hookName - 'beforeTransform' or 'afterTransform'
 * @param {Element} element - The DOM element to transform
 * @param {Object} payload - { document, url, html, params }
 */
function executeTransformers(hookName, element, payload) {
  const enhancedPayload = {
    ...payload,
    template: PAGE_TEMPLATE
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
 * @param {Document} document - The DOM document
 * @param {Object} template - The embedded PAGE_TEMPLATE object
 * @returns {Array} Array of block instances found on the page
 */
function findBlocksOnPage(document, template) {
  const pageBlocks = [];

  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      try {
        const elements = document.querySelectorAll(selector);
        if (elements.length === 0) {
          console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
        }
        elements.forEach((element) => {
          pageBlocks.push({
            name: blockDef.name,
            selector,
            element,
            section: blockDef.section || null
          });
        });
      } catch (e) {
        console.warn(`Invalid selector for block "${blockDef.name}": ${selector}`, e.message);
      }
    });
  });

  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

// EXPORT DEFAULT CONFIGURATION
export default {
  /**
   * Main transformation function using the 'one input / multiple outputs' pattern.
   */
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

    // 4. Execute afterTransform transformers (final cleanup + section breaks/metadata)
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
      }
    }];
  }
};
