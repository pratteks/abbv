/* eslint-disable */
/* global WebImporter */


import { applyAnalytics } from './utils/analytics.js';
/**
 * Parser: accordion
 * Base block: accordion
 * Source: https://www.abbvie.com/science/our-people.html
 * Generated: 2026-02-27
 *
 * FAQ accordion with collapsible items.
 *
 * Library structure: Each row = 1 accordion item, 2 cells:
 *   Cell 1: summary/label text (plain text, no <p> wrapper)
 *   Cell 2: body richtext content
 *
 * UE Model (accordion-item): summary (text), text (richtext)
 * Note: summaryType select field was removed from the model as it lacked
 * valueType and content_ prefix required for md2jcr content column mapping.
 *
 * Source DOM: .cmp-accordion > .cmp-accordion__item
 *   Each item has .cmp-accordion__title (question) and .cmp-accordion__panel (answer)
 */
export default function parse(element, { document }) {
  // Find accordion items
  const items = element.querySelectorAll(
    '.cmp-accordion__item, [class*="accordion__item"]',
  );

  const cells = [];

  items.forEach((item) => {
    // Extract summary/title text
    const titleEl = item.querySelector(
      '.cmp-accordion__title, .cmp-accordion__button span, .cmp-accordion__header button',
    );

    // Extract body/panel content
    const panelEl = item.querySelector(
      '.cmp-accordion__panel, [class*="accordion__panel"], [class*="accordion__content"]',
    );

    // Cell 1: Summary as plain text (no <p> wrapper, no field hints)
    const summaryText = titleEl ? titleEl.textContent.trim() : '';

    // Cell 2: Body richtext content
    const bodyFrag = document.createDocumentFragment();
    if (panelEl) {
      // Clone panel content to preserve structure
      while (panelEl.firstChild) {
        bodyFrag.appendChild(panelEl.firstChild);
      }
    }

    cells.push([summaryText, bodyFrag]);
  });

  if (cells.length === 0) {
    element.replaceWith(document.createTextNode(''));
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'accordion', cells });

  // Rule 4: Carry analytics from source to block
  applyAnalytics(element, block, document);
  element.replaceWith(block);
}
