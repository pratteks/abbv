/* eslint-disable */
/* global WebImporter */


import { applyAnalytics } from './utils/analytics.js';
/**
 * Parser: quote
 * Base block: quote
 * Source: https://www.abbvie.com/science/our-people.html
 * Generated: 2026-02-27
 * Updated: 2026-03-13 — Align with component model: 8 rows × 1 column, each field as own row
 *
 * Quote section with background image, pull quote, and attribution.
 *
 * Library structure: 8 rows, 1 column per row (no common prefix = each field is a separate row):
 *   Row 0: quoteType (select) — "basic" or "content-fragment"
 *   Row 1: quotation (richtext) — the quote text
 *   Row 2: attributionName (text) — author name
 *   Row 3: attributionTitle (text) — author title/role
 *   Row 4: attributionImage (reference) — author headshot
 *   Row 5: quoteFragment (aem-content) — content fragment ref
 *   Row 6: backgroundImage (reference) — section background image
 *   Row 7: backgroundImageAlt (text) — background image alt text
 *
 * UE Model fields: quoteType (select), quotation (richtext), attributionName (text),
 *   attributionTitle (text), attributionImage (reference), quoteFragment (aem-content),
 *   backgroundImage (reference), backgroundImageAlt (text)
 *
 * Source DOM: .cmp-quote with .cmp-quote__text and .cmp-quote__author-block
 * Author block has span.author-name and span.author-title
 * Background image from parent .container via .cmp-container__bg-image
 * Analytics: data-cmp-data-layer, data-track, data-analytics preserved
 * Accessibility: alt text on background image preserved in backgroundImageAlt
 */
export default function parse(element, { document }) {
  // Extract quotation text
  const quoteEl = element.querySelector('.cmp-quote__text')
    || element.querySelector('blockquote')
    || element.querySelector('p');

  // Extract author name and title from AbbVie DOM structure
  // Uses span.author-name and span.author-title inside .cmp-quote__author-block
  const authorName = element.querySelector('.author-name, .cmp-quote__author-name');
  const authorTitle = element.querySelector('.author-title, .cmp-quote__author-title');

  // Find background image in parent container (outside .cmp-quote)
  const container = element.closest('.container') || element.parentElement;
  let bgPicture = null;
  let bgAlt = '';

  if (container) {
    // AEM background image patterns
    const bgImg = container.querySelector('img.cmp-container__bg-image')
      || container.querySelector('img[data-cmp-src]');

    // Fallback: any picture/img in the container that is NOT inside .cmp-quote
    const fallbackImg = !bgImg
      ? [...container.querySelectorAll('picture, img')].find(
          (el) => !el.closest('.cmp-quote') && el !== element && !element.contains(el),
        )
      : null;

    const foundImg = bgImg || fallbackImg;
    if (foundImg) {
      const actualImg = foundImg.tagName === 'IMG' ? foundImg : foundImg.querySelector('img');
      bgAlt = actualImg?.getAttribute('alt') || '';
      bgPicture = foundImg.tagName === 'PICTURE' ? foundImg : (foundImg.closest('picture') || foundImg);

      // Remove from DOM to prevent duplication as section default content
      const bgParent = bgPicture.parentElement;
      if (bgParent) {
        bgParent.removeChild(bgPicture);
        // Clean up empty wrapper <p>
        if (bgParent.tagName === 'P' && !bgParent.childNodes.length) {
          bgParent.parentElement?.removeChild(bgParent);
        }
      }
    }
  }

  // Build 8 rows — model fields have no common prefix, each needs its own row
  // Must match ROW indices in blocks/quote/quote.js

  // Row 0: quoteType (select, default "basic")
  const row0 = document.createDocumentFragment();
  row0.appendChild(document.createComment(' field:quoteType '));
  const typeP = document.createElement('p');
  typeP.textContent = 'basic';
  row0.appendChild(typeP);

  // Row 1: quotation (richtext)
  const row1 = document.createDocumentFragment();
  row1.appendChild(document.createComment(' field:quotation '));
  if (quoteEl) {
    const p = document.createElement('p');
    p.textContent = quoteEl.textContent.trim();
    row1.appendChild(p);
  }

  // Row 2: attributionName (text)
  const row2 = document.createDocumentFragment();
  row2.appendChild(document.createComment(' field:attributionName '));
  const nameText = authorName?.textContent?.trim();
  if (nameText) {
    const p = document.createElement('p');
    p.textContent = nameText;
    row2.appendChild(p);
  }

  // Row 3: attributionTitle (text)
  const row3 = document.createDocumentFragment();
  row3.appendChild(document.createComment(' field:attributionTitle '));
  const titleText = authorTitle?.textContent?.trim();
  if (titleText) {
    const p = document.createElement('p');
    p.textContent = titleText;
    row3.appendChild(p);
  }

  // Row 4: attributionImage (reference) — empty for this source
  const row4 = document.createDocumentFragment();
  row4.appendChild(document.createComment(' field:attributionImage '));

  // Row 5: quoteFragment (aem-content) — empty for basic quote type
  const row5 = document.createDocumentFragment();
  row5.appendChild(document.createComment(' field:quoteFragment '));

  // Row 6: backgroundImage (reference)
  const row6 = document.createDocumentFragment();
  row6.appendChild(document.createComment(' field:backgroundImage '));
  if (bgPicture) {
    const p = document.createElement('p');
    p.appendChild(bgPicture);
    row6.appendChild(p);
  }

  // Row 7: backgroundImageAlt (text)
  const row7 = document.createDocumentFragment();
  row7.appendChild(document.createComment(' field:backgroundImageAlt '));
  if (bgAlt) {
    const p = document.createElement('p');
    p.textContent = bgAlt;
    row7.appendChild(p);
  }

  // Each field is its own row (1 cell per row) — matches block.children[ROW.*] indexing
  const cells = [
    [row0], // Row 0: quoteType
    [row1], // Row 1: quotation
    [row2], // Row 2: attributionName
    [row3], // Row 3: attributionTitle
    [row4], // Row 4: attributionImage
    [row5], // Row 5: quoteFragment
    [row6], // Row 6: backgroundImage
    [row7], // Row 7: backgroundImageAlt
  ];
  const block = WebImporter.Blocks.createBlock(document, { name: 'quote', cells });

  // Rule 4: Carry analytics from source to block
  applyAnalytics(element, block, document);
  element.replaceWith(block);
}
