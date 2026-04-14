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

function applyAnalytics(source, target, document) {
  // carry over any data-analytics attributes
  Array.from(source.attributes || [])
    .filter((a) => a.name.startsWith('data-analytics'))
    .forEach((a) => target.setAttribute(a.name, a.value));
}

export default function parse(element, { document }) {
  const gridRows = element.querySelectorAll('.grid-row');
  const cells = [];

  if (gridRows.length > 0) {
    gridRows.forEach((row) => {
      const gridCells = row.querySelectorAll(
        ':scope > .grid-cell, :scope > .grid-row__col-with-1, :scope > .grid-row__col-with-2, :scope > .grid-row__col-with-3, :scope > .grid-row__col-with-4, :scope > .grid-row__col-with-5, :scope > [class*="grid-row__col"]'
      );
      if (gridCells.length === 0) return;

      // FIX 1: allCols properly assigned from gridCells
      const allCols = Array.from(gridCells);

      // Filter out spacer columns
      const contentCols = allCols.filter((col) => {
        const widthMatch = col.className.match(/grid-row__col-with-(\d+)/);
        const colWidth = widthMatch ? parseInt(widthMatch[1], 10) : 0;
        const hasContent = col.textContent.trim().length > 0 || col.querySelector('img, picture, video');
        return hasContent && (colWidth > 1 || col.textContent.trim().length > 0);
      });

      if (contentCols.length === 0) {
        const fallbackCols = Array.from(element.children).filter(
          (c) => c.textContent.trim().length > 0,
        );
        if (fallbackCols.length === 0) {
          element.replaceWith(document.createTextNode(''));
          return;
        }
        const fallbackRow = fallbackCols.map((col) => {
          const frag = document.createDocumentFragment();
          while (col.firstChild) frag.appendChild(col.firstChild);
          return frag;
        });
        const block = WebImporter.Blocks.createBlock(document, { name: 'columns', cells: [fallbackRow] });
        applyAnalytics(element, block, document);
        element.replaceWith(block);
        return;
      }

      // Convert video data into links
      contentCols.forEach((col) => {
        const cmpVideo = col.querySelector('[data-video-url]');
        if (!cmpVideo) return;
        const videoUrl = cmpVideo.getAttribute('data-video-url');
        const watchBtn = cmpVideo.querySelector('button[aria-label*="Watch"]')
          || Array.from(cmpVideo.querySelectorAll('button')).find((b) => b.textContent.includes('Watch'));
        if (watchBtn && videoUrl) {
          const a = document.createElement('a');
          a.href = videoUrl;
          a.textContent = watchBtn.textContent.trim();
          const p = document.createElement('p');
          p.appendChild(a);
          watchBtn.replaceWith(p);
        }
      });

      // Fix image alt text
      contentCols.forEach((col) => {
        col.querySelectorAll('img').forEach((img) => {
          if (!img.alt || img.alt === '') {
            const cmpImage = img.closest('.cmp-image');
            const altFromTitle = cmpImage?.getAttribute('title') || cmpImage?.getAttribute('data-title');
            if (altFromTitle) {
              img.alt = altFromTitle;
              return;
            }
            const ariaLabel = img.getAttribute('aria-label')
              || img.closest('[aria-label]')?.getAttribute('aria-label');
            if (ariaLabel) {
              img.alt = ariaLabel;
            }
          }
        });
      });

      // FIX 2: fragment building is now correctly in its own loop
      const rowCells = [];
      contentCols.forEach((col) => {
        resolveLazyImages(col);
        const frag = document.createDocumentFragment();
        while (col.firstChild) frag.appendChild(col.firstChild);
        rowCells.push(frag);
      });

      if (rowCells.length > 0) {
        cells.push(rowCells);
      }
    });
  } else {
    // Fallback
    const containers = element.querySelectorAll(
      ':scope > .cmp-container > div, :scope > div > .cmp-container > div'
    );
    if (containers.length >= 2) {
      const rowCells = [];
      containers.forEach((container) => {
        const frag = document.createDocumentFragment();
        while (container.firstChild) frag.appendChild(container.firstChild);
        rowCells.push(frag);
      });
      cells.push(rowCells);
    }
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns', cells });
  element.replaceWith(block);
}
