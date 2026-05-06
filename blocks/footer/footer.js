import { getMetadata } from '../../scripts/aem.js';
import decorateExternalLinksUtility, {
  registerFooterSameTabNavigationMark,
} from '../../scripts/utils.js';
import { loadFragment } from '../fragment/fragment.js';

function createColumn(className, children) {
  const column = document.createElement('div');
  column.className = className;
  children.forEach((child) => column.appendChild(child));
  return column;
}

function isLinkList(el) {
  return el && el.nodeType === 1 && el.classList.contains('linklist');
}

function isParagraph(el) {
  return el && el.nodeType === 1 && el.tagName === 'P';
}

function hasPicture(el) {
  return el && el.nodeType === 1 && el.querySelector('picture');
}

/**
 * Re-binds OneTrust cookie consent click handlers to anchors inside `root`.
 * linklist.js sets data-cookie-consent="true" during decoration; that attribute
 * survives cloneNode but its click listener does not, so we re-attach here.
 */
function bindCookieConsentLinks(root) {
  root.querySelectorAll('a[data-cookie-consent="true"]').forEach((a) => {
    a.removeAttribute('href');
    a.setAttribute('role', 'button');
    a.tabIndex = 0;
    a.classList.add('ot-sdk-show-settings');

    const open = (e) => {
      e.preventDefault();
      if (window.OneTrust?.ToggleInfoDisplay) {
        window.OneTrust.ToggleInfoDisplay();
      } else if (window.Optanon?.ToggleInfoDisplay) {
        window.Optanon.ToggleInfoDisplay();
      }
    };

    a.addEventListener('click', open);
    a.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') open(e);
    });
  });
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta
    ? new URL(footerMeta, window.location).pathname
    : '/footer';
  const fragment = await loadFragment(footerPath);

  block.textContent = '';

  const sections = fragment.querySelectorAll('.section');

  if (sections.length > 0) {
    const firstSection = sections[0];

    // Collect children from default-content-wrapper and any linklist wrappers.
    // After loadFragment runs decorateBlocks/loadBlocks, linklist blocks live
    // inside their own .linklist-wrapper rather than .default-content-wrapper.
    const allChildren = [];
    const wrappers = firstSection.querySelectorAll(
      '.default-content-wrapper, .linklist-wrapper',
    );
    wrappers.forEach((wrapper) => {
      allChildren.push(...Array.from(wrapper.children));
    });

    // Re-sort children to match the original document order, since wrappers
    // may have rearranged them.
    allChildren.sort((a, b) => {
      const pos = a.compareDocumentPosition(b);
      // eslint-disable-next-line no-bitwise
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      // eslint-disable-next-line no-bitwise
      if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });

    const columnsContainer = document.createElement('div');
    columnsContainer.className = 'footer-columns';

    let index = 0;

    // Column 1: First picture (logo)
    const col1Children = [];
    if (allChildren[index] && hasPicture(allChildren[index])) {
      col1Children.push(allChildren[index].cloneNode(true));
      index += 1;
    }
    const col1 = createColumn('footer-column footer-logo', col1Children);

    // Column 2: First linklist + social/icons linklist
    const col2Children = [];
    while (index < allChildren.length && isLinkList(allChildren[index])) {
      col2Children.push(allChildren[index].cloneNode(true));
      index += 1;
    }
    const col2 = createColumn(
      'footer-column footer-links-primary',
      col2Children,
    );

    // Column 3: Heading paragraph + following linklist
    const col3Children = [];
    if (index < allChildren.length && isParagraph(allChildren[index])) {
      col3Children.push(allChildren[index].cloneNode(true));
      index += 1;
    }
    if (index < allChildren.length && isLinkList(allChildren[index])) {
      col3Children.push(allChildren[index].cloneNode(true));
      index += 1;
    }
    const col3 = createColumn(
      'footer-column footer-links-secondary',
      col3Children,
    );

    // Column 4: All remaining content (heading + linklist + trademark/copyright)
    const col4Children = [];
    while (index < allChildren.length) {
      col4Children.push(allChildren[index].cloneNode(true));
      index += 1;
    }
    const col4 = createColumn(
      'footer-column footer-links-tertiary',
      col4Children,
    );

    columnsContainer.appendChild(col1);
    columnsContainer.appendChild(col2);
    columnsContainer.appendChild(col3);
    columnsContainer.appendChild(col4);

    block.appendChild(columnsContainer);

    decorateExternalLinksUtility(columnsContainer);
    columnsContainer
      .querySelectorAll('a[title]')
      .forEach((a) => a.removeAttribute('title'));
    bindCookieConsentLinks(columnsContainer);
  }

  // Back to top button
  const backToTop = document.createElement('button');
  backToTop.className = 'back-to-top';
  backToTop.setAttribute('aria-label', 'Back to top');
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  block.prepend(backToTop);

  // Second section (bottom links) — now a linklist instead of a UL
  if (sections.length > 1) {
    const secondSection = sections[1];

    const bottomChildren = [];
    secondSection
      .querySelectorAll('.default-content-wrapper, .linklist-wrapper')
      .forEach((wrapper) => {
        bottomChildren.push(...Array.from(wrapper.children));
      });

    if (bottomChildren.length) {
      const bottomLinks = document.createElement('div');
      bottomLinks.className = 'footer-bottom';

      bottomChildren.forEach((child) => {
        bottomLinks.appendChild(child.cloneNode(true));
      });

      decorateExternalLinksUtility(bottomLinks);
      bottomLinks
        .querySelectorAll('a[title]')
        .forEach((a) => a.removeAttribute('title'));
      bindCookieConsentLinks(bottomLinks);

      block.appendChild(bottomLinks);
    }
  }

  registerFooterSameTabNavigationMark(block);
}
