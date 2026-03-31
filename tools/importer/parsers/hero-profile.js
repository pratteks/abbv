/* eslint-disable */
/* global WebImporter */


import { applyAnalytics } from './utils/analytics.js';
/**
 * Parser: hero (profile)
 * Base block: hero
 * Variant: profile
 * Source: https://www.abbvie.com/science/our-people/our-rd-leaders/andrew-campbell.html
 * Generated: 2026-03-03
 *
 * Profile hero has no background image — just a navy band (#071D49)
 * followed by a white overlap card with person name and role/title.
 *
 * Library structure: 1 column, 2 rows
 *   Row 1: Empty (CSS provides navy background via .hero.profile)
 *   Row 2: Richtext — H1 person name + P subtitle (field:text)
 *
 * Breadcrumb block is emitted before the hero so hero.js can absorb it.
 * The cleanup transformer stashes breadcrumb config as data attributes
 * before removing the breadcrumb DOM.
 *
 * UE Model fields: image (reference, left empty), imageAlt (collapsed), text (richtext)
 */

/**
 * Build a breadcrumb block from config stashed by the cleanup transformer.
 * Breadcrumb model fields (8 rows): id, customClass, homePagePath,
 * homeTitle, enableBreadcrumb, enableHiddenItems, enableCurrentPage,
 * enableRedirectTitle.
 */
function buildBreadcrumbBlock(element, document) {
  const homePath = element.getAttribute('data-breadcrumb-home');
  if (!homePath) return null;
  const homeTitle = element.getAttribute('data-breadcrumb-home-title') || '';

  const makeRow = (fieldName, value) => {
    const frag = document.createDocumentFragment();
    frag.appendChild(document.createComment(` field:${fieldName} `));
    if (value) frag.appendChild(document.createTextNode(value));
    return [frag];
  };
  const makeLinkRow = (fieldName, href, text) => {
    const frag = document.createDocumentFragment();
    frag.appendChild(document.createComment(` field:${fieldName} `));
    const a = document.createElement('a');
    a.href = href;
    a.textContent = text || href;
    frag.appendChild(a);
    return [frag];
  };

  return WebImporter.Blocks.createBlock(document, {
    name: 'Breadcrumb',
    cells: [
      makeRow('id', ''),
      makeRow('customClass', ''),
      makeLinkRow('homePagePath', homePath, homeTitle),
      makeRow('homeTitle', homeTitle),
      makeRow('enableBreadcrumb', 'true'),
      makeRow('enableHiddenItems', 'false'),
      makeRow('enableCurrentPage', 'true'),
      makeRow('enableRedirectTitle', 'true'),
    ],
  });
}

export default function parse(element, { document }) {
  // Extract text content from the overlap-predecessor container
  const heading = element.querySelector('.cmp-title h1, h1, .cmp-title h2, h2');
  const subtitle = element.querySelector('.cmp-text p, .cmp-text');

  // Build cells: Row 1 = empty (no image), Row 2 = text
  const cells = [];

  // Row 1: Empty image placeholder (CSS provides navy background)
  const imgFrag = document.createDocumentFragment();
  imgFrag.appendChild(document.createComment(' field:image '));
  cells.push([imgFrag]);

  // Row 2: Text content — person name and role
  const textFrag = document.createDocumentFragment();
  textFrag.appendChild(document.createComment(' field:text '));
  if (heading) textFrag.appendChild(heading);
  if (subtitle) textFrag.appendChild(subtitle);
  cells.push([textFrag]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'Hero (profile)', cells });

  // Rule 4: Carry analytics from source to block
  applyAnalytics(element, block, document);

  // Remove the previous sibling (navy background container) since CSS handles it
  const prevSibling = element.previousElementSibling;
  if (prevSibling && prevSibling.querySelector('[style*="background-color"]')) {
    prevSibling.remove();
  }

  // Check if bio content (image + text) is embedded inside this hero container
  // Some profile pages nest .grid-row > .grid-row__col-with-* inside the
  // overlap-predecessor instead of a separate .grid.aem-GridColumn element.
  const gridRow = element.querySelector('.grid-row');
  if (gridRow) {
    const allCols = Array.from(
      gridRow.querySelectorAll('[class*="grid-row__col-with-"]'),
    );
    const contentCols = allCols.filter((col) => {
      const widthMatch = col.className.match(/grid-row__col-with-(\d+)/);
      const colWidth = widthMatch ? parseInt(widthMatch[1], 10) : 0;
      return colWidth > 1 || col.textContent.trim().length > 0;
    });

    if (contentCols.length > 0) {
      // Fix image alt text (Rule 5)
      contentCols.forEach((col) => {
        col.querySelectorAll('img').forEach((img) => {
          if (!img.alt || img.alt === '') {
            const cmpImage = img.closest('.cmp-image');
            const altFromTitle = cmpImage?.getAttribute('title')
              || cmpImage?.getAttribute('data-title');
            if (altFromTitle) img.alt = altFromTitle;
          }
        });
      });

      const columnsRow = contentCols.map((col) => {
        const frag = document.createDocumentFragment();
        while (col.firstChild) frag.appendChild(col.firstChild);
        return frag;
      });
      const columnsBlock = WebImporter.Blocks.createBlock(document, {
        name: 'columns',
        cells: [columnsRow],
      });
      applyAnalytics(element, columnsBlock, document);

      // Insert breadcrumb + hero + embedded columns
      const wrapper = document.createDocumentFragment();
      const breadcrumbBlock = buildBreadcrumbBlock(element, document);
      if (breadcrumbBlock) wrapper.appendChild(breadcrumbBlock);
      wrapper.appendChild(block);
      wrapper.appendChild(columnsBlock);
      element.replaceWith(wrapper);
      return;
    }
  }

  // Standard case: breadcrumb + hero (no embedded bio columns)
  const breadcrumbBlock = buildBreadcrumbBlock(element, document);
  if (breadcrumbBlock) {
    const wrapper = document.createDocumentFragment();
    wrapper.appendChild(breadcrumbBlock);
    wrapper.appendChild(block);
    element.replaceWith(wrapper);
  } else {
    element.replaceWith(block);
  }
}
