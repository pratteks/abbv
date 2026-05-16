/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroParser from './parsers/hero.js';
import columnsParser from './parsers/columns.js';

// TRANSFORMER IMPORTS
import abbvieCleanupTransformer from './transformers/abbvie-cleanup.js';

// PARSER REGISTRY
const parsers = {
  'hero': heroParser,
  'columns': columnsParser,
};

// PAGE TEMPLATE CONFIGURATION
const PAGE_TEMPLATE = {
  name: 'community-of-science',
  description: 'Community of Science page with hero, stats highlights, alternating program columns, teaser, programs grid, and CTA',
  urls: [
    'https://www.abbvie.com/science/our-people/community-of-science.html',
  ],
  blocks: [
    {
      name: 'hero',
      instances: ['.container.overlap-predecessor'],
    },
    {
      name: 'columns',
      instances: [
        // Stats highlights (4 dashboard cards in a 5-column grid)
        '.grid.cmp-grid-full-page-5-v1',
        // 5 alternating program rows (image + text, 5:1:5 grid pattern)
        '.container.cmp-container-full-width.height-default:not(.no-bottom-margin):not(.large-radius) > .cmp-container > .grid',
        // Programs grid (image + 4 program descriptions)
        '.grid.aem-GridColumn.aem-GridColumn--default--12',
        // CTA section (image + heading + text + link)
        '.container.cmp-container-full-width.height-default.no-bottom-margin:not(.large-radius):not(.footer-overlap) > .cmp-container > .grid',
      ],
    },
  ],
};

// TRANSFORMER REGISTRY (only cleanup — section breaks handled inline)
const transformers = [
  abbvieCleanupTransformer,
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
 * Helper: insert a section break (hr + optional section-metadata)
 */
function insertSectionBreak(document, el, position, style) {
  if (!el) return;

  if (position === 'before') {
    if (style) {
      const metaBlock = WebImporter.Blocks.createBlock(document, {
        name: 'Section Metadata',
        cells: [['style', style]],
      });
      el.before(metaBlock);
    }
    el.before(document.createElement('hr'));
  } else {
    let ref = el;
    if (style) {
      const metaBlock = WebImporter.Blocks.createBlock(document, {
        name: 'Section Metadata',
        cells: [['style', style]],
      });
      ref.after(metaBlock);
      ref = metaBlock;
    }
    ref.after(document.createElement('hr'));
  }
}

export default {
  transform: (payload) => {
    const { document, url, html, params } = payload;

    const main = document.body;

    // 1. Execute beforeTransform cleanup (remove header, footer, nav, tracking, etc.)
    executeTransformers('beforeTransform', main, payload);

    // 2. Fix lazy-loaded images: copy data-cmp-src to img.src
    main.querySelectorAll('.cmp-image[data-cmp-src]').forEach((wrapper) => {
      const src = wrapper.getAttribute('data-cmp-src');
      const img = wrapper.querySelector('img');
      if (img && src) {
        img.src = src;
      } else if (!img && src) {
        const newImg = document.createElement('img');
        newImg.src = src;
        newImg.alt = '';
        wrapper.appendChild(newImg);
      }
    });

    // Also fix container background images that may have data-cmp-src
    main.querySelectorAll('img.cmp-container__bg-image[data-cmp-src]').forEach((img) => {
      const src = img.getAttribute('data-cmp-src');
      if (src) img.src = src;
    });

    // 3. Mark section landmark containers with data attributes (before block parsing changes DOM)
    const statsContainer = main.querySelector('.grid.cmp-grid-full-page-5-v1')
      ?.closest('.container');
    const altContainer = main.querySelector(
      '.container.cmp-container-full-width.height-default:not(.no-bottom-margin):not(.large-radius)',
    );
    const teaserEl = main.querySelector('.teaser.aem-GridColumn');
    const ctaContainer = main.querySelector(
      '.container.cmp-container-full-width.height-default.no-bottom-margin:not(.large-radius):not(.footer-overlap)',
    );

    if (statsContainer) statsContainer.setAttribute('data-section', 'stats');
    if (altContainer) altContainer.setAttribute('data-section', 'alternating');
    if (ctaContainer) ctaContainer.setAttribute('data-section', 'cta');

    // 4. Clean dashboard cards to simple HTML (stats section)
    //    Each card has: .eyebrow (heading), .data-point (number),
    //    .data-point-suffix (+), and .description (text)
    main.querySelectorAll('[data-section="stats"] .dashboardcards').forEach((card) => {
      const eyebrow = card.querySelector('.eyebrow')?.textContent?.trim();
      const dataEl = card.querySelector('.data-point')?.textContent?.trim();
      const suffix = card.querySelector('.data-point-suffix')?.textContent?.trim() || '';
      const descEl = card.querySelector('.description');

      const frag = document.createDocumentFragment();
      if (eyebrow) {
        const h = document.createElement('h2');
        h.textContent = eyebrow;
        frag.appendChild(h);
      }
      if (dataEl) {
        const p = document.createElement('p');
        const strong = document.createElement('strong');
        strong.textContent = dataEl + suffix;
        p.appendChild(strong);
        frag.appendChild(p);
      }
      if (descEl) {
        frag.appendChild(descEl.cloneNode(true));
      }
      card.replaceWith(frag);
    });

    // 5. Clean teaser component to default content (heading + paragraph)
    if (teaserEl) {
      const pretitle = teaserEl.querySelector('.cmp-teaser__pretitle')?.textContent?.trim();
      const title = teaserEl.querySelector('.cmp-teaser__title')?.textContent?.trim();
      const desc = teaserEl.querySelector('.cmp-teaser__description')?.textContent?.trim();

      const frag = document.createDocumentFragment();
      if (pretitle) {
        const h = document.createElement('h2');
        h.textContent = pretitle;
        frag.appendChild(h);
      }
      if (title) {
        const h = document.createElement('h3');
        h.textContent = title;
        frag.appendChild(h);
      }
      if (desc) {
        const p = document.createElement('p');
        p.textContent = desc;
        frag.appendChild(p);
      }
      teaserEl.replaceWith(frag);
    }

    // 6. Find blocks on page using embedded template
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 7. Parse each block using registered parsers
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

    // 8. Remove the empty hero background container (its bg image was moved by hero parser)
    const heroBgContainer = main.querySelector(
      '.container.large-radius.cmp-container-full-width.height-default.no-bottom-margin:not([data-section])',
    );
    if (heroBgContainer && heroBgContainer.textContent.trim().length === 0) {
      heroBgContainer.remove();
    }

    // 9. Move stats container bg image from inline content to section-metadata background
    const statsEl = main.querySelector('[data-section="stats"]');
    let statsBgImgSrc = null;
    let statsBgImgAlt = '';
    if (statsEl) {
      const statsBgImg = statsEl.querySelector('img.cmp-container__bg-image');
      if (statsBgImg) {
        statsBgImgSrc = statsBgImg.src;
        statsBgImgAlt = statsBgImg.alt || '';
        // Remove the inline bg image (it will go into section-metadata as background)
        const imgWrapper = statsBgImg.closest('p') || statsBgImg;
        imgWrapper.remove();
      }
    }

    // 10. Insert section breaks at landmark boundaries
    const altEl = main.querySelector('[data-section="alternating"]');
    const ctaEl = main.querySelector('[data-section="cta"]');

    // End hero section → before stats
    if (statsEl) {
      const heroMetaBlock = WebImporter.Blocks.createBlock(document, {
        name: 'Section Metadata',
        cells: [['style', 'navy-overlap']],
      });
      statsEl.before(heroMetaBlock);
      statsEl.before(document.createElement('hr'));
    }
    // End stats section → after stats container (with background image in section-metadata)
    if (statsEl) {
      const cells = [['style', 'highlight']];
      if (statsBgImgSrc) {
        cells.push(['background', statsBgImgSrc]);
        if (statsBgImgAlt) cells.push(['backgroundAlt', statsBgImgAlt]);
      }
      const metaBlock = WebImporter.Blocks.createBlock(document, {
        name: 'Section Metadata',
        cells,
      });
      statsEl.after(metaBlock);
      const hr = document.createElement('hr');
      metaBlock.after(hr);
    }
    // End alternating columns section → after alternating container
    insertSectionBreak(document, altEl, 'after', null);
    // End teaser+programs section → before CTA
    insertSectionBreak(document, ctaEl, 'before', null);
    // End CTA section → after CTA
    insertSectionBreak(document, ctaEl, 'after', 'highlight');

    // 10. Clean up data-section markers
    main.querySelectorAll('[data-section]').forEach((el) => {
      el.removeAttribute('data-section');
    });

    // 11. Execute afterTransform cleanup
    executeTransformers('afterTransform', main, payload);

    // 12. Apply WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 13. Generate sanitized path
    const path = WebImporter.FileUtils.sanitizePath(
      new URL(params.originalURL).pathname.replace(/\/$/, '').replace(/\.html$/, ''),
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
