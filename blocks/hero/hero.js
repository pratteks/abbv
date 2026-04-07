/*
 * Hero Block — Base decorator (shared across all brands)
 *
 * Brand-specific JS: placed in brands/{brand}/blocks/hero/hero.js
 * The multi-theme.js loader automatically loads brand JS/CSS when
 * brands/{brand}/blocks/hero/hero.js exists — no routing code needed here.
 *
 * Brand-specific CSS: tokens in brands/{brand}/tokens.css handle most styling.
 * Block overrides in brands/{brand}/blocks/hero/hero.css for unique features.
 */

export default async function decorate(block) {
  const section = block.closest('.section');

  // Absorb a breadcrumb block into the hero text panel.
  // The breadcrumb may be in the same section or in the immediately
  // preceding sibling section (separate section break in authoring).
  const textPanel = block.querySelector(':scope > div:nth-child(2) > div');
  textPanel.parentElement.classList.add('hero-text-container');
  textPanel.classList.add('cmp-container-x-large');
  if (section && textPanel) {
    let breadcrumbWrapper = section.querySelector('.breadcrumb-wrapper');
    // Also check the previous sibling section
    if (!breadcrumbWrapper) {
      const prevSection = section.previousElementSibling;
      if (prevSection?.classList.contains('section')) {
        breadcrumbWrapper = prevSection.querySelector('.breadcrumb-wrapper');
      }
    }
    if (breadcrumbWrapper) {
      const breadcrumbBlock = breadcrumbWrapper.querySelector('.breadcrumb');
      if (breadcrumbBlock) {
        textPanel.prepend(breadcrumbBlock);
        breadcrumbWrapper.remove();
        // Remove the previous section if it's now empty
        const prevSection = section.previousElementSibling;
        if (prevSection?.classList.contains('section') && !prevSection.children.length) {
          prevSection.remove();
        }
      }
    }
  }

  // Promote hero image to section background.
  // Local/import: first cell has an <img> tag.
  // AEM Author: first cell has a reference <a> link (no <img>).
  // In both cases, set section background-image and create an invisible
  // spacer so the CSS aspect-ratio rules preserve the proper height.
  if (section) {
    const imgCell = block.querySelector(':scope > div:first-child');
    let imgSrc = null;
    let imgAlt = '';

    // Local case: image is an <img> tag
    const img = imgCell?.querySelector('img');
    if (img?.src) {
      imgSrc = img.src;
      imgAlt = img.alt || '';
    }

    // AEM Author case: image field renders as a reference link
    if (!imgSrc) {
      const link = imgCell?.querySelector('a');
      if (link?.href) {
        imgSrc = link.href;
        imgAlt = link.title || link.textContent || '';
        // Replace the button/link with an invisible spacer <img>
        // so the CSS aspect-ratio rules create proper height
        const spacer = document.createElement('img');
        spacer.src = imgSrc;
        spacer.alt = imgAlt;
        const container = link.closest('.button-container') || link.closest('p') || link;
        container.replaceWith(spacer);
      }
    }
  }

  // Landing hero: absorb press-releases block from the same section.
  if (block.closest('.section') && textPanel && block.classList.contains('landing')) {
    const pressReleasesWrapper = block.closest('.section').querySelector('.press-releases-wrapper');
    if (pressReleasesWrapper) {
      const pressReleasesBlock = pressReleasesWrapper.querySelector('.press-releases');
      if (pressReleasesBlock) {
        const pressReleasesContainer = document.createElement('div');
        pressReleasesContainer.classList.add('hero-press-releases-container');
        pressReleasesContainer.appendChild(pressReleasesBlock);
        textPanel.appendChild(pressReleasesContainer);
        pressReleasesWrapper.remove();
      }
    }
  }
}
