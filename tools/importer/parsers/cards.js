/* eslint-disable */
/* global WebImporter */

/**
 * Parser: cards
 * Base block: cards
 * Source: https://www.abbvie.com/science.html
 * Generated: 2026-03-22
 *
 * Handles two source DOM structures:
 *
 * 1) Story cards (Section 7 - Stories Behind Our Science):
 *    .grid.cmp-grid-custom > .grid-container > .grid-row > .grid-cell
 *      - .cmp-image img, .cmp-header, .cmp-text, .cmp-button
 *
 * 2) Dashboard stat cards (Section 2 - At a Glance):
 *    .grid.cmp-grid-full-page-5-v1 > .grid-container > .grid-row > .grid-cell
 *      - .dashboardcards > .cmp-dashboardcard > .dashboard-card-facts
 *        - img.facts-image (optional), .eyebrow, .data-point, .data-point-suffix, .description
 *
 * Block library: Cards = 2 columns per row. Col 1 = image, Col 2 = text
 * UE Model (card item): image (reference), text (richtext)
 *
 * Lazy-load handling: AbbVie Scene7 images use data-cmp-src on both img elements
 * and .cmp-image container divs. The cleanup transformer resolves most of these,
 * but the parser also includes fallback resolution as a safety net.
 */

/**
 * Resolve lazy-loaded images: copy data-cmp-src → src when src is missing/placeholder.
 * Also handles .cmp-image[data-cmp-src] containers where Scene7 URL is on the wrapper.
 */
function resolveLazyImages(container, document) {
  container.querySelectorAll('img[data-cmp-src]').forEach((img) => {
    const src = img.getAttribute('src') || '';
    const lazySrc = img.getAttribute('data-cmp-src') || '';
    if (lazySrc && (!src || src.startsWith('data:'))) {
      img.setAttribute('src', lazySrc);
    }
  });
  container.querySelectorAll('.cmp-image[data-cmp-src]').forEach((cmpImage) => {
    const lazySrc = cmpImage.getAttribute('data-cmp-src') || '';
    if (!lazySrc) return;
    let img = cmpImage.querySelector('img');
    if (img) {
      const src = img.getAttribute('src') || '';
      if (!src || src.startsWith('data:')) {
        img.setAttribute('src', lazySrc);
      }
    } else {
      img = document.createElement('img');
      img.setAttribute('src', lazySrc);
      img.setAttribute('alt', cmpImage.getAttribute('data-asset-name') || '');
      cmpImage.appendChild(img);
    }
  });
}

export default function parse(element, { document }) {
  // Detect dashboard stats grid by presence of .dashboardcards elements
  const dashboardCards = element.querySelectorAll('.dashboardcards');
  if (dashboardCards.length > 0) {
    parseDashboardCards(dashboardCards, element, document);
    return;
  }

  // Story cards: grid cells with cmp-image/cmp-header/cmp-text/cmp-button
  parseStoryCards(element, document);
}

function parseDashboardCards(cards, element, document) {
  const cells = [];

  cards.forEach((card) => {
    const facts = card.querySelector('.dashboard-card-facts');
    if (!facts) return;

    // Col 0: Image (optional .facts-image)
    const imageEl = facts.querySelector('img.facts-image');
    const imgFrag = document.createDocumentFragment();
    imgFrag.appendChild(document.createComment(' field:image '));
    if (imageEl) {
      const p = document.createElement('p');
      const img = document.createElement('img');
      img.src = imageEl.getAttribute('src') || imageEl.getAttribute('data-cmp-src') || '';
      img.alt = imageEl.getAttribute('alt') || '';
      p.appendChild(img);
      imgFrag.appendChild(p);
    }

    // Col 1: Text (eyebrow + number+suffix + description combined as richtext)
    const eyebrow = facts.querySelector('.eyebrow');
    const number = facts.querySelector('.data-point');
    const suffix = facts.querySelector('.data-point-suffix');
    const desc = facts.querySelector('.description');

    const textFrag = document.createDocumentFragment();
    textFrag.appendChild(document.createComment(' field:text '));

    if (eyebrow && eyebrow.textContent.trim()) {
      const p = document.createElement('p');
      const strong = document.createElement('strong');
      strong.textContent = eyebrow.textContent.trim();
      p.appendChild(strong);
      textFrag.appendChild(p);
    }

    const numText = (number ? number.textContent.trim() : '') + (suffix ? suffix.textContent.trim() : '');
    if (numText) {
      const p = document.createElement('p');
      p.textContent = numText;
      textFrag.appendChild(p);
    }

    if (desc && desc.textContent.trim()) {
      const p = document.createElement('p');
      p.textContent = desc.textContent.trim();
      textFrag.appendChild(p);
    }

    cells.push([imgFrag, textFrag]);
  });

  if (cells.length === 0) return;

  // Check parent container for background image (AEM cmp-container__bg-image pattern)
  // This image should become a Section Metadata background, not inline content
  let bgImgSrc = null;
  let bgImgEl = null;
  let ancestor = element.parentElement;
  while (ancestor) {
    bgImgEl = ancestor.querySelector(':scope > img.cmp-container__bg-image');
    if (!bgImgEl) {
      // Also check direct children manually for environments that don't support :scope
      for (const child of ancestor.children) {
        if (child.tagName === 'IMG' && child.classList.contains('cmp-container__bg-image')) {
          bgImgEl = child;
          break;
        }
      }
    }
    if (bgImgEl) {
      bgImgSrc = bgImgEl.getAttribute('src') || bgImgEl.getAttribute('data-cmp-src') || '';
      bgImgEl.remove();
      break;
    }
    ancestor = ancestor.parentElement;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'Cards', cells });
  element.innerHTML = '';
  element.appendChild(block);

  // Add Section Metadata with background image if found
  if (bgImgSrc) {
    const img = document.createElement('img');
    img.src = bgImgSrc;
    const sectionMeta = WebImporter.Blocks.createBlock(document, {
      name: 'Section Metadata',
      cells: { background: img },
    });
    element.appendChild(sectionMeta);
  }
}

function parseStoryCards(element, document) {
  // Resolve lazy-loaded images before extracting
  resolveLazyImages(element, document);

  const gridCells = element.querySelectorAll('.grid-row > .grid-cell, .grid-row > [class*="grid-row__col"]');
  const cells = [];

  gridCells.forEach((cell) => {
    // Col 0: Image — check both .cmp-image img and direct img with data-cmp-src
    const img = cell.querySelector('.cmp-image img, img.cmp-image__image');
    const imgFrag = document.createDocumentFragment();
    imgFrag.appendChild(document.createComment(' field:image '));
    if (img) {
      imgFrag.appendChild(img);
    }

    // Col 1: Text content (title + description + CTA)
    const title = cell.querySelector('.cmp-header__text, .cmp-header');
    const desc = cell.querySelector('.cmp-text p, .cmp-text');
    const ctaLink = cell.querySelector('.cmp-button, a.cmp-button');

    const textFrag = document.createDocumentFragment();
    textFrag.appendChild(document.createComment(' field:text '));

    if (title) {
      const strong = document.createElement('strong');
      strong.textContent = title.textContent.trim();
      const p = document.createElement('p');
      p.appendChild(strong);
      textFrag.appendChild(p);
    }

    if (desc) {
      textFrag.appendChild(desc);
    }

    if (ctaLink) {
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.href = ctaLink.getAttribute('href') || ctaLink.href || '';
      const btnText = ctaLink.querySelector('.cmp-button__text');
      a.textContent = btnText ? btnText.textContent.trim() : ctaLink.textContent.trim();
      p.appendChild(a);
      textFrag.appendChild(p);
    }

    cells.push([imgFrag, textFrag]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards', cells });
  element.replaceWith(block);
}
