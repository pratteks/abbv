/* eslint-disable */
/* global WebImporter */

/**
 * Parser: columns
 * Base block: columns
 * Source: https://www.abbvie.com/science.html
 * Generated: 2026-03-22
 *
 * Source DOM patterns (multiple instances):
 * - Section 3 (Core Focus): .grid-row with 3 cols (eyebrow+heading+text | link list | link list)
 * - Section 5 (Explore): .grid-row with 2 cols (image | text+links)
 * - Section 6 seq1 (Tenacity): .grid-row with 2 cols (heading | paragraph)
 * - Section 6 seq2 (Quote): .grid-row with 2 cols (video thumbnail | quote)
 * - Section 9 (CTA): .grid-row with 2 cols (image | heading+text+CTA)
 *
 * Block library: Columns = multiple columns per row, default content in cells
 * UE Model: columns (number), rows (number), classes_marginBottom (select)
 * Note: Columns blocks do NOT require field hint comments (per hinting.md Rule 4)
 *
 * Lazy-load handling: AbbVie Scene7 images use data-cmp-src for deferred loading.
 * The cleanup transformer resolves these to src before parsers run, but as a
 * safety net the parser also checks for remaining data-cmp-src attributes.
 */
/**
 * Resolve any remaining lazy-loaded images within a container.
 * Copies data-cmp-src to src if src is missing or a data: placeholder.
 */
function resolveLazyImages(container) {
  container.querySelectorAll('img[data-cmp-src]').forEach((img) => {
    const src = img.getAttribute('src') || '';
    const lazySrc = img.getAttribute('data-cmp-src') || '';
    if (lazySrc && (!src || src.startsWith('data:'))) {
      img.setAttribute('src', lazySrc);
    }
  });
}

export default function parse(element, { document }) {
  // Find grid rows with columns
  const gridRows = element.querySelectorAll('.grid-row');
  const cells = [];

  if (gridRows.length > 0) {
    gridRows.forEach((row) => {
      const gridCells = row.querySelectorAll(':scope > .grid-cell, :scope > .grid-row__col-with-1, :scope > .grid-row__col-with-2, :scope > .grid-row__col-with-3, :scope > .grid-row__col-with-4, :scope > .grid-row__col-with-5, :scope > [class*="grid-row__col"]');
      if (gridCells.length === 0) return;

      const rowCells = [];
      gridCells.forEach((cell) => {
        // Safety net: resolve any remaining lazy-loaded images within this cell
        resolveLazyImages(cell);
        const frag = document.createDocumentFragment();
        // Move all child content into fragment
        while (cell.firstChild) {
          frag.appendChild(cell.firstChild);
        }
        rowCells.push(frag);
      });

      if (rowCells.length > 0) {
        cells.push(rowCells);
      }
    });
  } else {
    // Fallback: look for direct child containers that represent columns
    const containers = element.querySelectorAll(':scope > .cmp-container > div, :scope > div > .cmp-container > div');
    if (containers.length >= 2) {
      const rowCells = [];
      containers.forEach((container) => {
        const frag = document.createDocumentFragment();
        while (container.firstChild) {
          frag.appendChild(container.firstChild);
        }
        rowCells.push(frag);
      });
      cells.push(rowCells);
    }
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns', cells });
  element.replaceWith(block);
}
