/* eslint-disable */
/* global WebImporter */

/**
 * Parser: hero
 * Base block: hero
 * Source: https://www.abbvie.com/science.html
 * Generated: 2026-03-22
 *
 * Source DOM structure (two sibling containers forming one hero):
 * - .container.cmp-container-full-width.height-tall > .cmp-container > img.cmp-container__bg-image
 * - .container.overlap-predecessor (next sibling) > ... > .cmp-title h1 + .cmp-text p
 *
 * The parser is called on the .height-tall container (single instance).
 * It finds the adjacent .overlap-predecessor sibling for heading/text,
 * combines both into one hero block, and removes the sibling.
 *
 * Block library: Hero = 1 column, 2 rows (background image, text content)
 * UE Model fields: image (reference), imageAlt (collapsed), text (richtext)
 * Collapsed fields (skip hints): imageAlt
 *
 * Lazy-load handling: AbbVie Scene7 images use data-cmp-src for deferred loading.
 * The cleanup transformer resolves these to src before parsers run, but as a
 * safety net the parser also resolves any remaining data-cmp-src attributes.
 */
export default function parse(element, { document }) {
  // Extract background image from this container (.height-tall)
  const bgImage = element.querySelector('img.cmp-container__bg-image, img[class*="bg-image"]');

  // Safety net: resolve lazy-loaded src if needed
  if (bgImage) {
    const src = bgImage.getAttribute('src') || '';
    const lazySrc = bgImage.getAttribute('data-cmp-src') || '';
    if (lazySrc && (!src || src.startsWith('data:'))) {
      bgImage.setAttribute('src', lazySrc);
    }
  }

  // Find the adjacent overlap-predecessor sibling for heading/text
  const overlapSibling = element.nextElementSibling
    && element.nextElementSibling.classList.contains('overlap-predecessor')
    ? element.nextElementSibling
    : null;

  const textSource = overlapSibling || element;
  const heading = textSource.querySelector('h1, h2, .cmp-title__text');
  const textEl = textSource.querySelector('.cmp-text p, .cmp-text');

  const cells = [];

  // Row 1: Background image
  if (bgImage) {
    const imgFrag = document.createDocumentFragment();
    imgFrag.appendChild(document.createComment(' field:image '));
    const p = document.createElement('p');
    p.appendChild(bgImage);
    imgFrag.appendChild(p);
    cells.push([imgFrag]);
  } else {
    cells.push(['']);
  }

  // Row 2: Text content (heading + paragraph)
  const contentFrag = document.createDocumentFragment();
  contentFrag.appendChild(document.createComment(' field:text '));
  if (heading) contentFrag.appendChild(heading);
  if (textEl) contentFrag.appendChild(textEl);
  cells.push([contentFrag]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero', cells });
  element.replaceWith(block);

  // Remove the sibling container since its content is now in the block
  if (overlapSibling) {
    overlapSibling.remove();
  }
}
