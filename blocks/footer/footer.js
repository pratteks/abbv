import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';
import decorateExternalLinksUtility from '../../scripts/utils.js';

function createColumn(className, children) {
  const column = document.createElement('div');
  column.className = className;
  children.forEach((child) => column.appendChild(child));
  return column;
}
/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);

  block.textContent = '';

  const sections = fragment.querySelectorAll('.section');

  if (sections.length > 0) {
    const firstSection = sections[0];

    // Get all children from both default-content-wrapper and other wrappers
    const allChildren = [];
    const wrappers = firstSection.querySelectorAll('.default-content-wrapper, .social-media-wrapper');
    wrappers.forEach((wrapper) => {
      allChildren.push(...Array.from(wrapper.children));
    });

    const columnsContainer = document.createElement('div');
    columnsContainer.className = 'footer-columns';

    // Column 1: First picture
    const col1Children = [];
    let index = 0;
    if (allChildren[index] && allChildren[index].querySelector('picture')) {
      col1Children.push(allChildren[index].cloneNode(true));
      index += 1;
    }
    const col1 = createColumn('footer-column footer-logo', col1Children);

    // Column 2: First ul and social-media block
    const col2Children = [];
    while (index < allChildren.length && (allChildren[index].tagName === 'UL' || allChildren[index].classList.contains('social-media'))) {
      col2Children.push(allChildren[index].cloneNode(true));
      index += 1;
    }
    const col2 = createColumn('footer-column footer-links-primary', col2Children);

    // Column 3: Next p and following ul
    const col3Children = [];
    if (index < allChildren.length && allChildren[index].tagName === 'P') {
      col3Children.push(allChildren[index].cloneNode(true));
      index += 1;
    }
    if (index < allChildren.length && allChildren[index].tagName === 'UL') {
      col3Children.push(allChildren[index].cloneNode(true));
      index += 1;
    }
    const col3 = createColumn('footer-column footer-links-secondary', col3Children);

    // Column 4: All remaining content from first section
    const col4Children = [];
    while (index < allChildren.length) {
      col4Children.push(allChildren[index].cloneNode(true));
      index += 1;
    }
    const col4 = createColumn('footer-column footer-links-tertiary', col4Children);

    // Append all columns
    columnsContainer.appendChild(col1);
    columnsContainer.appendChild(col2);
    columnsContainer.appendChild(col3);
    columnsContainer.appendChild(col4);

    block.appendChild(columnsContainer);

    // Decorate external links in the first section
    decorateExternalLinksUtility(columnsContainer);
  }

  // Back to top button — placed on the footer-wrapper so it sits half above / half inside
  const backToTop = document.createElement('button');
  backToTop.className = 'back-to-top';
  backToTop.setAttribute('aria-label', 'Back to top');
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  block.prepend(backToTop);

  // Handle second section (bottom links)
  if (sections.length > 1) {
    const secondSection = sections[1];
    const secondSectionWrapper = secondSection.querySelector('.default-content-wrapper');

    if (secondSectionWrapper) {
      const bottomLinks = document.createElement('div');
      bottomLinks.className = 'footer-bottom';

      // Clone all content from second section
      Array.from(secondSectionWrapper.children).forEach((child) => {
        bottomLinks.appendChild(child.cloneNode(true));
      });

      // Add external link class to bottom links
      decorateExternalLinksUtility(bottomLinks);

      block.appendChild(bottomLinks);
    }
  }
}
