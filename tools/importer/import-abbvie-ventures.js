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

// PAGE TEMPLATE CONFIGURATION - AbbVie Ventures template
const PAGE_TEMPLATE = {
  name: 'abbvie-ventures',
  description: 'AbbVie Ventures page with hero, sidebar with related content/topics, main content with 2 accordion blocks, and related content cards at bottom',
  urls: [
    'https://www.abbvie.com/science/partner-with-us/abbvie-ventures.html',
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
      selector: '.grid.cmp-grid-custom:first-of-type',
      style: null,
      blocks: ['accordion'],
      defaultContent: []
    },
    {
      id: 'section-3-cards',
      name: 'Related Content Cards',
      selector: '.container.cmp-container-full-width.no-bottom-margin:has(.cardpagestory)',
      style: null,
      blocks: ['cards'],
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
 * Convert the AEM grid layout to a Columns (cols-8-2-2) block.
 * AbbVie Ventures grid: spacer(1) | main(9) | sidebar(2)
 * After filtering: main | sidebar | empty → cols-8-2-2
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
  const rowCells = contentCols.map(col => {
    const frag = document.createDocumentFragment();
    while (col.firstChild) frag.appendChild(col.firstChild);
    return frag;
  });

  // Add empty third column for cols-8-2-2 layout
  rowCells.push(document.createDocumentFragment());

  const block = WebImporter.Blocks.createBlock(document, {
    name: 'Columns (cols-8-2-2)',
    cells: [rowCells],
  });

  grid.replaceWith(block);
}

/**
 * Parse .cardpagestory elements in the Related Content section into a Cards block.
 * Card structure: <a href="..."><div class="card-image-container"><picture><img></picture></div>
 *   <div><h2>eyebrow</h2><h4>title</h4></div><div>Learn More</div></a>
 */
function parseRelatedContentCards(document) {
  // Find the bottom container with related content cards (.card-standard, not .card-dashboard)
  const containers = document.querySelectorAll('.container.cmp-container-full-width.no-bottom-margin');
  let cardsContainer = null;
  containers.forEach(c => {
    if (c.querySelector('.cardpagestory.card-standard')) {
      cardsContainer = c;
    }
  });
  if (!cardsContainer) return;

  const cards = cardsContainer.querySelectorAll('.cardpagestory.card-standard');
  if (cards.length === 0) return;

  const cells = [];
  cards.forEach(card => {
    const link = card.querySelector('a[href]');
    const img = card.querySelector('img');
    const h4 = card.querySelector('h4.card-title') || card.querySelector('h4');

    // Cell 1: Image
    const imgFrag = document.createDocumentFragment();
    imgFrag.appendChild(document.createComment(' field:image '));
    if (img) {
      const p = document.createElement('p');
      const imgEl = document.createElement('img');
      imgEl.src = img.src || img.getAttribute('data-cmp-src') || '';
      imgEl.alt = img.alt || '';
      p.appendChild(imgEl);
      imgFrag.appendChild(p);
    }

    // Cell 2: Text (title + link)
    const textFrag = document.createDocumentFragment();
    textFrag.appendChild(document.createComment(' field:text '));
    if (h4) {
      const p = document.createElement('p');
      const strong = document.createElement('strong');
      strong.textContent = h4.textContent.trim();
      p.appendChild(strong);
      textFrag.appendChild(p);
    }
    if (link) {
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.href = link.href;
      a.textContent = 'Learn More';
      p.appendChild(a);
      textFrag.appendChild(p);
    }

    cells.push([imgFrag, textFrag]);
  });

  if (cells.length > 0) {
    // Get the h3 "Related Content" heading
    const h3 = cardsContainer.querySelector('h3') || cardsContainer.querySelector('h2');
    const headingText = h3 ? h3.textContent.trim() : 'Related Content';

    const block = WebImporter.Blocks.createBlock(document, { name: 'Cards', cells });

    // Replace container content with heading + cards block
    cardsContainer.innerHTML = '';
    const headingEl = document.createElement('h3');
    headingEl.id = 'related-content';
    headingEl.textContent = headingText;
    cardsContainer.appendChild(headingEl);
    cardsContainer.appendChild(block);
  }
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

    // 4.6 Parse related content cards
    parseRelatedContentCards(document);

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
