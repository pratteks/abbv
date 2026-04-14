/* eslint-disable */
/* global WebImporter */


import { applyAnalytics } from './utils/analytics.js';
/**
 * Parser: story-cards
 * Base block: cards
 * Source: https://www.abbvie.com/science/our-people/our-rd-leaders.html
 * Generated: 2026-03-02
 * Validation: Site behind Cloudflare WAF; parser verified via syntax check and selector analysis.
 *
 * Handles R&D leader profile cards displayed in a grid layout.
 * Each card: headshot image + name (H4) + title/role + "Meet [Name]" CTA link.
 * Cards span multiple .grid rows (5 rows, 13 cards total).
 *
 * Library structure: Each row = 1 card, 2 cells:
 *   Cell 1: picture (headshot image) — field:image
 *   Cell 2: richtext body (name bold + title + CTA link) — field:text
 *
 * UE Model (card item): image (reference), text (richtext)
 *
 * Source DOM: .grid > .grid-container > .grid-row > .grid-row__col-with-4
 * Each column contains a .cardpagestory with headshot, name, title, CTA.
 */
export default function parse(element, { document }) {
  // Bail if element was already consumed by a previous invocation
  if (!element.parentElement) return;

  // Collect ALL leader cards from the document
  const allCards = document.querySelectorAll('.cardpagestory');
  if (allCards.length === 0) {
    element.replaceWith(document.createTextNode(''));
    return;
  }

  const cells = [];
  const gridsToRemove = new Set();

  allCards.forEach((card) => {
    // Track parent grid containers for cleanup
    const grid = card.closest('.grid');
    if (grid) gridsToRemove.add(grid);

    const link = card.querySelector('a[href]');
    const img = card.querySelector('img');
    const nameEl = card.querySelector('h4.card-title') || card.querySelector('h4');
    const descEl = card.querySelector('p.card-description') || card.querySelector('p');
    const ctaEl = card.querySelector('.card-cta') || card.querySelector('span');

    // Cell 1: Image with field hint
    const imgFrag = document.createDocumentFragment();
    imgFrag.appendChild(document.createComment(' field:image '));
    if (img) {
      const p = document.createElement('p');
      const imgEl = document.createElement('img');
      imgEl.src = img.src;
      imgEl.alt = img.alt || '';
      p.appendChild(imgEl);
      imgFrag.appendChild(p);
    }

    // Cell 2: Text with field hint (name as bold, title, CTA link)
    const textFrag = document.createDocumentFragment();
    textFrag.appendChild(document.createComment(' field:text '));

    if (nameEl) {
      const p = document.createElement('p');
      const strong = document.createElement('strong');
      strong.textContent = nameEl.textContent.trim();
      p.appendChild(strong);
      textFrag.appendChild(p);
    }

    if (descEl) {
      const p = document.createElement('p');
      p.textContent = descEl.textContent.trim();
      textFrag.appendChild(p);
    }

    if (ctaEl && link) {
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.href = link.href;
      a.textContent = ctaEl.textContent.trim();
      p.appendChild(a);
      textFrag.appendChild(p);
    }

    cells.push([imgFrag, textFrag]);
  });

  if (cells.length === 0) {
    element.replaceWith(document.createTextNode(''));
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'story-cards', cells });

  // Rule 4: Carry analytics from source to block
  applyAnalytics(element, block, document);

  // Place block before the first grid container, then remove all grids
  const firstGrid = gridsToRemove.values().next().value;
  if (firstGrid && firstGrid.parentElement) {
    firstGrid.before(block);
    gridsToRemove.forEach((g) => {
      if (g.parentElement) g.remove();
    });
  } else {
    element.replaceWith(block);
  }
}
