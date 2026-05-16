/* eslint-disable */
/* global WebImporter */


import { applyAnalytics } from './utils/analytics.js';
/**
 * Parser: cards
 * Base block: cards
 * Source: https://www.abbvie.com/science/our-people.html
 * Generated: 2026-02-27
 *
 * Handles video card pairs (sections 3 and 4):
 *   - Two side-by-side video cards in a 5:5 grid
 *   - Each card: thumbnail image + title + description
 *
 * Library structure: Each row = 1 card, 2 cells:
 *   Cell 1: picture (card image) — field:image
 *   Cell 2: richtext body (title + description + optional video link) — field:text
 *
 * UE Model (card item): image (reference), text (richtext)
 *
 * Source DOM: .grid > .grid-row > .grid-row__col-with-5
 * Each column contains a .video component with thumbnail, title span, description span.
 */
export default function parse(element, { document }) {
  // Find card containers (grid columns with content)
  const gridCols = element.querySelectorAll(
    '[class*="grid-row__col-with-5"], [class*="grid-row__col-with-6"], [class*="grid-row__col-with-4"]',
  );

  const columns = gridCols.length > 0
    ? Array.from(gridCols)
    : Array.from(element.querySelectorAll('[class*="grid-row__col-with-"]')).filter(
      (col) => col.textContent.trim().length > 0,
    );

  const cells = [];

  columns.forEach((col) => {
    if (col.textContent.trim().length === 0) return;

    // Extract thumbnail image (first img, which is the video poster/thumbnail)
    const thumbnail = col.querySelector('img[class*="thumbnail"]')
      || col.querySelector('.cmp-image img')
      || col.querySelector('img');

    // Extract title — AbbVie uses span.body-unica-20-reg for card titles
    // Also check standard CMP title elements
    const titleEl = col.querySelector('.body-unica-20-reg')
      || col.querySelector('.cmp-title h3, .cmp-title h2, h3, h2');
    const titleText = titleEl?.textContent?.trim();

    // Extract description — AbbVie uses span.body-unica-18-reg for card descriptions
    const descEl = col.querySelector('.body-unica-18-reg')
      || col.querySelector('.cmp-text p, .cmp-text');
    const descText = descEl?.textContent?.trim();

    // Skip cards with no meaningful content
    if (!titleText && !descText) return;

    // Cell 1: Image with field hint
    const imgFrag = document.createDocumentFragment();
    imgFrag.appendChild(document.createComment(' field:image '));
    if (thumbnail) {
      const p = document.createElement('p');
      const img = document.createElement('img');
      img.src = thumbnail.src;
      img.alt = thumbnail.alt || '';
      p.appendChild(img);
      imgFrag.appendChild(p);
    }

    // Extract video URL stashed by cleanup transformer on .cmp-video container
    const cmpVideo = col.querySelector('[data-video-url]');
    let videoUrl = cmpVideo?.getAttribute('data-video-url') || null;
    let watchText = null;
    if (videoUrl) {
      // Extract watch button text (e.g. "Watch 1:15")
      const watchBtn = col.querySelector('.cmp-video__text-content button')
        || Array.from(col.querySelectorAll('button')).find((b) => b.textContent.includes('Watch'));
      watchText = watchBtn?.textContent?.trim();
    }

    // Cell 2: Text body with field hint
    const textFrag = document.createDocumentFragment();
    textFrag.appendChild(document.createComment(' field:text '));
    if (titleText) {
      const p = document.createElement('p');
      const strong = document.createElement('strong');
      strong.textContent = titleText;
      p.appendChild(strong);
      textFrag.appendChild(p);
    }
    if (descText) {
      const p = document.createElement('p');
      p.textContent = descText;
      textFrag.appendChild(p);
    }
    // Append video link to text cell (richtext field supports links)
    if (videoUrl) {
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.href = videoUrl;
      a.textContent = watchText || 'Watch';
      p.appendChild(a);
      textFrag.appendChild(p);
    }

    cells.push([imgFrag, textFrag]);
  });

  if (cells.length === 0) {
    element.replaceWith(document.createTextNode(''));
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards', cells });

  // Rule 4: Carry analytics from source to block
  applyAnalytics(element, block, document);
  element.replaceWith(block);
}
